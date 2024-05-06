"use strict";
import mongoose, { mongo } from "mongoose";

// models
import medicineClaimCommonInfo from "../models/medicineClaim/commonInfo";
import MedicineDetailsOnClaim from "../models/medicineClaim/medicineDetailsOnClaim";
import insurancesubscribers from "../models/insurance/subscriber/subscriber"
import MedicineClaimDocument from "../models/medicineClaim/medicineClaimDocument";
import ClaimProcessRole from "../../insurance/models/claim_process_role/claimProcessRole";
import StaffInfo from "../../insurance/models/insurance/user/staff_info";
import claimStaffDetails from "../models/medicineClaim/claimStaffDetails"
import claimMedicineApprovebyStaff from "../models/medicineClaim/claimMedicineApprovebyStaff.js";
import AdminInfo from "../models/insurance/user/admin_info";
import { htmlEmailApproval } from "../config/constants";
import HospitalService from "../../insurance/models/medicineClaim/hospitalServiceData";
import subscriberUseLimit from "../../insurance/models/medicineClaim/subscriberUseLimit"
import PortalUser from "../models/insurance/user/portal_user";
import { notification } from "../helpers/emailTemplate";
import moment from "moment";
import MediClaimCommonInfo from '../models/medicineClaim/commonInfo.js';
import path from 'path';
let ejs = require("ejs");
// import PDFDocument from 'pdfkit';

// const handlebars = require('handlebars');
const puppeteer = require('puppeteer')
const fs = require('fs');
// import fs from 'fs'
// import moment from "moment"
import { sendResponse } from "../helpers/transmission";
import { getDocument, getDocuments, uploadFile } from "../helpers/s3";
import { getNextSequenceValue } from "../middleware/utils";
import Http from "../helpers/httpservice"
import subscriber from "../models/insurance/subscriber/subscriber";
import Plan from "../models/insurance/plan";
import PlanServiceNew from "../models/insurance/plan/service2";
import PlanExclusionNew from "../models/insurance/plan/exclusion2";
import claimProcessRole from "../../insurance/models/claim_process_role/claimProcessRole";
import medicineDetailsOnClaim from "../models/medicineClaim/medicineDetailsOnClaim";
import AssignClaimField from "../models/assignClaimField";
import template from "../models/insurance/template";
const user = require("../controllers/insurance/user")

const httpService = new Http()
class MedicineClaimController {

    async checkInsuranceStaff(req, res) {
        const { insurnaceId } = req.body;
        console.log(req.body, "body check ");
        try {
            let sequenceRole = await claimProcessRole.find({ insurance_id: mongoose.Types.ObjectId(insurnaceId), isDeleted: false }).sort({ sequence: 1 })
            if (sequenceRole.length == 0){
                return sendResponse(req, res, 200, {
                    status: true,
                    data: false,
                    message: "Insurance company has not Claim Process Role.",
                    errorCode: null,
                });
            }          
            const insuranceData = await AssignClaimField.findOne({ for_user: insurnaceId });
            if (insuranceData == null){
                return sendResponse(req, res, 200, {
                    status: true,
                    data: false,
                    message: "Manage Claim Content has not created for this insurance company",
                    errorCode: null,
                });
            }  
            if (sequenceRole.length > 0 && insuranceData.primaryClaimField.length > 0 && insuranceData.secondaryClaimField.length > 0 && insuranceData.accidentRelatedField.length > 0) {

                let staffData = await StaffInfo.find({ for_user: sequenceRole[0].insurance_id, is_deleted: false });
                if (staffData.length > 0) {
                    sendResponse(req, res, 200, {
                        status: true,
                        data: true,
                        message: "Staffs list fetched",
                        errorCode: null,
                    });
                }
                else {
                    return sendResponse(req, res, 200, {
                        status: true,
                        data: false,
                        message: "Insurance Company has not created staff.",
                        errorCode: null,
                    });
                }
            } else {
                return sendResponse(req, res, 200, {
                    status: true,
                    data: false,
                    message: "Insurance company has not created staff and Manage Claim Content from superadmin.",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: true,
                data: false,
                message: "Internal Server Error",
                errorCode: null,
            });
        }
    }



    async commonInformationStep1(req, res) {
        const {
            service,
            pharmacyId,
            patientId,
            ePrescriptionNumber,
            insuranceId,
            claimNumber,
            requestType,
            claimId,
            created_by,
            preAuthReclaimId,
            loggedInPatientId,
            loggedInInsuranceId,
        } = req.body
        console.log(req.body, "check body123");
        try {
            var serviceVar = "";
            if (preAuthReclaimId != "") {
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId: preAuthReclaimId },
                    {
                        $set: {
                            pre_auth_reclaim: true
                        }
                    },
                    { new: true }
                ).exec();
            }
            var claimData
            if (claimId == "") {
                const claim_id = await getNextSequenceValue("claim_Id");
                if (pharmacyId == '' && loggedInPatientId != '') {
                    console.log("check log else")
                    const claimDetails = new medicineClaimCommonInfo({
                        service: serviceVar,
                        patientId,
                        preAuthReclaimId,
                        ePrescriptionNumber,
                        insuranceId,
                        claimType: "medicine",
                        claimNumber,
                        claimId: "CLAIM-" + claim_id,
                        requestType,
                        for_portal_user: loggedInPatientId,
                        pharmacy_id: null,
                        loggedInPatientId,
                        created_by
                    })
                    claimData = await claimDetails.save();
                } else if (pharmacyId == '' && loggedInPatientId == '') {
                    console.log("check log else if")
                    const claimDetails = new medicineClaimCommonInfo({
                        service: serviceVar,
                        patientId,
                        preAuthReclaimId,
                        ePrescriptionNumber,
                        insuranceId,
                        claimType: "medicine",
                        claimNumber,
                        claimId: "CLAIM-" + claim_id,
                        requestType,
                        for_portal_user: loggedInInsuranceId,
                        pharmacy_id: null,
                        loggedInPatientId: null,
                        loggedInInsuranceId,
                        created_by
                    })
                    claimData = await claimDetails.save();
                }
                else {
                    const claimDetails = new medicineClaimCommonInfo({
                        service: serviceVar,
                        patientId,
                        ePrescriptionNumber,
                        preAuthReclaimId,
                        insuranceId,
                        claimType: "medicine",
                        claimNumber,
                        claimId: "CLAIM-" + claim_id,
                        requestType,
                        for_portal_user: pharmacyId,
                        pharmacy_id: pharmacyId,
                        created_by
                    })
                    claimData = await claimDetails.save();
                }

            } else {

                if (pharmacyId == '' && loggedInPatientId == "") {
                    console.log("check 4444");
                    claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId, for_portal_user: loggedInInsuranceId },
                        {
                            $set: {
                                service: serviceVar,
                                patientId,
                                ePrescriptionNumber,
                                claimType: "medicine",
                                insuranceId,
                                claimNumber,
                                requestType,
                            }
                        },
                        { new: true }
                    ).exec();
                }
                else if (pharmacyId == "" && loggedInPatientId != "") {
                    console.log("check 555");
                    claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId, for_portal_user: loggedInPatientId },
                        {
                            $set: {
                                service: serviceVar,
                                patientId,
                                ePrescriptionNumber,
                                claimType: "medicine",
                                insuranceId,
                                claimNumber,
                                requestType,
                            }
                        },
                        { new: true }
                    ).exec();
                }
                else {
                    claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId, for_portal_user: pharmacyId },
                        {
                            $set: {
                                service: serviceVar,
                                patientId,
                                ePrescriptionNumber,
                                claimType: "medicine",
                                insuranceId,
                                claimNumber,
                                requestType,
                            }
                        },
                        { new: true }
                    ).exec();
                }

            }
            sendResponse(req, res, 200, {
                status: true,
                data: claimData,
                message: "successfully saved medicine claim",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep2(req, res) {
        const {
            insurerType,
            primaryInsuredIdentity,
            pharmacyId,
            loggedInPatientId,
            loggedInInsuranceId,
            claimObjectId
        } = req.body
        try {
            if (pharmacyId == "" && loggedInPatientId != "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInPatientId, _id: claimObjectId },
                    {
                        $set: {
                            insurerType,
                            primaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added primary insurer details",
                    errorCode: null,
                });
            }
            else if (pharmacyId == "" && loggedInPatientId == "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                    {
                        $set: {
                            insurerType,
                            primaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added primary insurer details",
                    errorCode: null,
                });
            }
            else {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            insurerType,
                            primaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added primary insurer details",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add primary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep3(req, res) {
        const {
            secondaryInsuredIdentity,
            pharmacyId,
            loggedInPatientId,
            claimObjectId,
            loggedInInsuranceId
        } = req.body
        try {

            if (pharmacyId == "" && loggedInPatientId != "") {

                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInPatientId, _id: claimObjectId },
                    {
                        $set: {
                            secondaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added secondary insurer details",
                    errorCode: null,
                });
            }
            else if (pharmacyId == "" && loggedInPatientId == "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                    {
                        $set: {
                            secondaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added secondary insurer details",
                    errorCode: null,
                });
            }
            else {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            secondaryInsuredIdentity,
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added secondary insurer details",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add secondary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep4(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            deliverCenterInfo,
            prescriberCenterInfo,
            loggedInPatientId,
            loggedInInsuranceId
        } = req.body
        try {
            if (pharmacyId == "" && loggedInPatientId != "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInPatientId, _id: claimObjectId },
                    {
                        $set: {
                            deliverCenterInfo,
                            prescriberCenterInfo
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added deliver and prescriber center details",
                    errorCode: null,
                });
            }
            else if (pharmacyId == "" && loggedInPatientId == "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                    {
                        $set: {
                            deliverCenterInfo,
                            prescriberCenterInfo
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added deliver and prescriber center details",
                    errorCode: null,
                });
            }
            else {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            deliverCenterInfo,
                            prescriberCenterInfo
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added deliver and prescriber center details",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add deliver and prescriber center details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep5(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            accidentRelatedField,
            loggedInPatientId,
            loggedInInsuranceId,
        } = req.body
        try {
            if (pharmacyId == "" && loggedInPatientId != "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInPatientId, _id: claimObjectId },
                    {
                        $set: {
                            accidentRelatedField
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added accident related field details",
                    errorCode: null,
                });
            }

            else if (pharmacyId == "" && loggedInPatientId == "") {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                    {
                        $set: {
                            accidentRelatedField
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added accident related field details",
                    errorCode: null,
                });
            }
            else {
                const result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            accidentRelatedField
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added accident related field details",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add accident related field details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getAllDetailsPlanCalculate(req, res) {
        try {
            const { patientId, serviceName, healthplan_id, serviceCount, family_count } = req.query;
            let patientIds = mongoose.Types.ObjectId(patientId);
            console.log(req.query, "check query777");
            const details = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        patientId: patientId,
                    },
                },
                {
                    $lookup: {
                        from: 'medicinedetailsonclaims',
                        localField: '_id',
                        foreignField: 'for_medicine_claim',
                        as: 'medicineDetailsData',
                    },
                },
                {
                    $unwind: {
                        path: '$medicineDetailsData',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'medicineDetailsData': { $exists: true, $ne: [] },
                    },
                },
                {
                    $project: {
                        'copayment': '$medicineDetailsData.coPayment',
                        'serviceName': "$medicineDetailsData.serviceName",
                        'patientId': "$patientId",
                        'requestAmount': "$medicineDetailsData.requestAmount",
                        'categoryService': "$medicineDetailsData.categoryService"
                    },
                },


            ]);
            var primaryid = '';
            var findsubscriber = await insurancesubscribers.aggregate([
                {
                    $match: {
                        _id: patientIds,
                        is_deleted: false,
                    },
                },

            ]);
            if (findsubscriber[0].subscription_for == 'Primary') {
                primaryid = patientIds
            }
            else {
                var detailsInsurance = await insurancesubscribers.aggregate([
                    {
                        $match: {
                            secondary_subscriber: patientIds,
                            is_deleted: false,
                        },
                    },
                ]);
                if (detailsInsurance.length > 0) {
                    primaryid = detailsInsurance[0]._id
                }
            }
            let detailsInsurance1 = await insurancesubscribers.aggregate([
                {
                    $match: {
                        _id: primaryid,
                        is_deleted: false,
                    },
                },

            ]);


            const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
            secondarySubscriberIds.push(primaryid.toString());
            console.log(secondarySubscriberIds, "098ioko", detailsInsurance);
            let start_date = detailsInsurance[0].insurance_validity_from;
            let end_date = detailsInsurance[0].insurance_validity_to;

            let service_count1 = JSON.parse(serviceCount);
            let max_no = service_count1.max_no;
            let unit_no = service_count1.unit_no;
            let unit = service_count1.unit;
            const currentDate = moment();
            const oneMonthLater = currentDate.subtract(unit_no, unit);

            const detailsPlan = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        patientId: { $in: secondarySubscriberIds },
                    },
                },
                {
                    $lookup: {
                        from: 'medicinedetailsonclaims',
                        localField: '_id',
                        foreignField: 'for_medicine_claim',
                        as: 'medicineDetailsData',
                    },
                },
                {
                    $unwind: {
                        path: '$medicineDetailsData',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'medicineDetailsData': { $exists: true, $ne: [] },
                        'medicineDetailsData.serviceName': serviceName,
                        'medicineDetailsData.healthplan_id': mongoose.Types.ObjectId(healthplan_id),
                        'medicineDetailsData.createdAt': {
                            $gte: new Date(start_date),
                            $lte: new Date(end_date)
                        }
                    },
                },
                {
                    $match: {
                        "medicineDetailsData.createdAt": {
                            $gte: new Date(oneMonthLater),
                        }
                    }
                },
                {
                    $group: {
                        _id: "$medicineDetailsData",
                        count: { $sum: 1 },
                        patientId: { $first: "$patientId" }
                    }
                },
                {
                    $match: {
                        count: { $gte: max_no }
                    }
                },
                {
                    $project: {
                        'copayment': '$_id.coPayment',
                        'serviceName': "$_id.serviceName",
                        'patientId': "$patientId",
                        'requestAmount': "$_id.requestAmount",
                        'categoryService': "$_id.categoryService",
                        '_id': 0
                    },
                },
            ]);

            // console.log(details, "details000");
            sendResponse(req, res, 200, {
                status: true,
                data: { individualsubscriber: details, familysubscriber: detailsPlan },
                message: "successfully fetch data",
                errorCode: null,
            });
        } catch (error) {
            console.error(error, "eororo90989");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getServiceClaimCount(req, res) {
        try {
            const { subscriber_id, health_plan_id, category_name, service_name, plan_validity } = req.query;

            var primaryid = '';
            var findsubscriber = await insurancesubscribers.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(subscriber_id),
                        is_deleted: false,
                    },
                },

            ]);
            console.log(findsubscriber, "findsubscriber", subscriber_id);
            if (findsubscriber[0].subscription_for == 'Primary') {
                primaryid = subscriber_id
            }
            else {
                var detailsInsurance = await insurancesubscribers.aggregate([
                    {
                        $match: {
                            secondary_subscriber: mongoose.Types.ObjectId(subscriber_id),
                            is_deleted: false,
                        },
                    },
                ]);
                if (detailsInsurance.length > 0) {
                    primaryid = detailsInsurance[0]._id
                }
            }
            let detailsInsurance1 = await insurancesubscribers.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(primaryid),
                        is_deleted: false,
                    },
                },

            ]);


            const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
            secondarySubscriberIds.push(primaryid.toString());
            var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id, service_name, plan_validity });
            var fetchRecordNumberOfCategoryCount = await subscriberUseLimit.findOne({ subscriber_id, category_name, plan_validity });
            var fetchRecordNumberOfServiceCountFamily = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, service_name, plan_validity });
            var fetchRecordNumberOfCategoryCountFamily = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name, plan_validity });

            var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity });
            var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id, plan_validity });
            var result = {
                service_count: 0,
                category_limit: 0,
                family_service_limit: 0,
                family_category_limit: 0,
                own_limit: 0,
                family_total_limit: 0

            }

            if (fetchRecordForFamilyTotalLimit) {
                result.family_total_limit = fetchRecordForFamilyTotalLimit.family_total_limit;
            }

            if (fetchRecordForOwnLimit) {
                result.own_limit = fetchRecordForOwnLimit.own_limit;
            }


            if (fetchRecordNumberOfServiceCount) {
                result.service_count = fetchRecordNumberOfServiceCount.number_of_service_count;
            }


            if (fetchRecordNumberOfCategoryCount) {
                result.category_limit = fetchRecordNumberOfCategoryCount.category_limit;
            }

            if (fetchRecordNumberOfServiceCountFamily) {
                result.family_service_limit = fetchRecordNumberOfServiceCountFamily.family_service_limit;
            }


            if (fetchRecordNumberOfCategoryCountFamily) {
                result.family_category_limit = fetchRecordNumberOfCategoryCountFamily.family_category_limit;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully fetch data",
                errorCode: null,
            });
            // }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getWaitingTime(req, res) {
        try {
            const { patientId, healthplan_id, serviceName, waitingCount } = req.query;
            let insurancesubscriber = await insurancesubscribers.findOne({ _id: mongoose.Types.ObjectId(patientId), health_plan_for: healthplan_id }).select("insurance_validity_from insurance_validity_to");

            if (insurancesubscriber) {
                let start_date = insurancesubscriber.insurance_validity_from;
                let end_date = insurancesubscriber.insurance_validity_to;
                let waitingCount1 = JSON.parse(waitingCount);
                let unit_no = waitingCount1.duration.min_no;
                let unit = waitingCount1.duration.unit;

                const currentDate = moment();
                const oneMonthLater = currentDate.subtract(unit_no, unit);

                let medicinedetails = await medicineDetailsOnClaim.aggregate([
                    {
                        $match: {
                            healthplan_id: mongoose.Types.ObjectId(healthplan_id),
                            serviceName: serviceName,
                            createdAt: {
                                $gte: new Date(start_date),
                                $lte: new Date(end_date)
                            }
                        }
                    },
                    {
                        $match: {
                            createdAt: {
                                $gte: new Date(oneMonthLater),
                            }
                        }
                    }
                ]).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: medicinedetails,
                    message: "successfully fetch data",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }

    }

    async commonInformationStep1Doctor(req, res) {
        const {
            service,
            pharmacyId,
            patientId,
            ePrescriptionNumber,
            insuranceId,
            claimNumber,
            requestType,
            claimId,
            created_by,
            preAuthReclaimId,
            loggedInPatientId,
            createdById,
            claimType
        } = req.body
        try {
            var serviceVar = "";
            if (preAuthReclaimId != "") {
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId: preAuthReclaimId },
                    {
                        $set: {
                            pre_auth_reclaim: true
                        }
                    },
                    { new: true }
                ).exec();
            }
            var claimData
            if (claimId == "") {
                const claim_id = await getNextSequenceValue("claim_Id");

                const claimDetails = new medicineClaimCommonInfo({
                    service: serviceVar,
                    patientId,
                    preAuthReclaimId,
                    ePrescriptionNumber,
                    insuranceId,
                    claimType: claimType,
                    claimNumber,
                    claimId: "CLAIM-" + claim_id,
                    requestType,
                    for_portal_user: createdById,
                    pharmacy_id: null,
                    loggedInPatientId,
                    created_by,
                })
                claimData = await claimDetails.save();


            } else {
                claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId, for_portal_user: createdById },
                    {
                        $set: {
                            service: serviceVar,
                            patientId,
                            ePrescriptionNumber,
                            insuranceId,
                            claimNumber,
                        }
                    },
                    { new: true }
                ).exec();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: claimData,
                message: "successfully saved medicine claim",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep2Doctor(req, res) {
        const {
            insurerType,
            primaryInsuredIdentity,
            createdById,
            claimObjectId
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        insurerType,
                        primaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added primary insurer details",
                errorCode: null,
            });


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add primary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async commonInformationStep3Doctor(req, res) {
        const {
            secondaryInsuredIdentity,
            loggedInPatientId,
            claimObjectId,
            createdById
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        secondaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added secondary insurer details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add secondary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep4Doctor(req, res) {
        const {
            createdById,
            claimObjectId,
            deliverCenterInfo,
            prescriberCenterInfo,
            loggedInPatientId,
            locationFor
        } = req.body
        console.log(req.body, "check log req");
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        deliverCenterInfo,
                        prescriberCenterInfo,
                        locationFor
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added deliver and prescriber center details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add deliver and prescriber center details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async commonInformationStep5Doctor(req, res) {
        const {
            createdById,
            claimObjectId,
            accidentRelatedField,
            loggedInPatientId
        } = req.body
        try {

            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        accidentRelatedField
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added accident related field details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add accident related field details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async commoninformationStep1HospitalClaim(req, res) {
        const {
            service,
            pharmacyId,
            patientId,
            ePrescriptionNumber,
            insuranceId,
            claimNumber,
            requestType,
            claimId,
            created_by,
            preAuthReclaimId,
            loggedInPatientId,
            createdById,
            claimType,
            hospitalizationCategory
        } = req.body
        try {
            var serviceVar = "";
            // if (preAuthReclaimId != "") {
            //     await medicineClaimCommonInfo.findOneAndUpdate(
            //         { claimId: preAuthReclaimId },
            //         {
            //             $set: {
            //                 pre_auth_reclaim: true
            //             }
            //         },
            //         { new: true }
            //     ).exec();
            // }
            var claimData
            if (claimId == "") {
                const claim_id = await getNextSequenceValue("claim_Id");

                const claimDetails = new medicineClaimCommonInfo({
                    service: serviceVar,
                    patientId,
                    preAuthReclaimId,
                    ePrescriptionNumber,
                    insuranceId,
                    claimType: claimType,
                    hospitalizationCategory,
                    claimNumber,
                    claimId: "CLAIM-" + claim_id,
                    requestType,
                    for_portal_user: createdById,
                    pharmacy_id: null,
                    loggedInPatientId,
                    created_by,
                })
                claimData = await claimDetails.save();


            } else {
                claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId, for_portal_user: createdById },
                    {
                        $set: {
                            service: serviceVar,
                            patientId,
                            ePrescriptionNumber,
                            insuranceId,
                            claimNumber,
                        }
                    },
                    { new: true }
                ).exec();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: claimData,
                message: "successfully saved medicine claim",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commoninformationStep2HospitalClaim(req, res) {
        const {
            insurerType,
            primaryInsuredIdentity,
            createdById,
            claimObjectId
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        insurerType,
                        primaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added primary insurer details",
                errorCode: null,
            });


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add primary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commoninformationStep3HospitalClaim(req, res) {
        const {
            secondaryInsuredIdentity,
            loggedInPatientId,
            claimObjectId,
            createdById
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        secondaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added secondary insurer details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add secondary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commoninformationStep4HospitalClaim(req, res) {
        const {
            createdById,
            claimObjectId,
            deliverCenterInfo,
            prescriberCenterInfo,
            loggedInPatientId,
            locationFor
        } = req.body
        console.log(req.body, "check log req");
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        deliverCenterInfo,
                        prescriberCenterInfo,
                        locationFor
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added deliver and prescriber center details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add deliver and prescriber center details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commoninformationStep5HospitalClaim(req, res) {
        const {
            createdById,
            claimObjectId,
            accidentRelatedField,
            loggedInPatientId
        } = req.body
        try {

            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        accidentRelatedField
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added accident related field details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add accident related field details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async hospitalServiceData(req, res) {
        const {
            pregnancyRelated,
            reasonOfHopitalization,
            reasonOfHopitalizationExtension,
            reasonOfFinalHopitalization,
            provisionalDiagnosis,
            updateDiagnosis,
            finalDiagnosis,
            fromHospitalizationDate,
            fromHospitalizationExtensionDate,
            fromHospitalizationExtensionTime,
            fromFinalHospitalizationDate,
            fromFinalHospitalizationTime,
            fromHospitalizationTime,
            toHospitaldate,
            toHospitaltime,
            toHospitalExtensiondate,
            toHospitalExtensiontime,
            toFinalHospitaldate,
            toFinalHospitaltime,
            numberOfNights,
            hospitalizatinDetails,
            hospitalizatinExtensionDetails,
            hospitalizationFinalDetails,
            claimObjectId,
            requestType,
            hospitalizationCategory,
            comment,
            FinalComment,
            extensionComment,
            fromPreauthDate,
            fromPreauthTime,
            toPreauthdate,
            toPreauthtime,
            PreauthDetails,
            provisionalDiagnosisPreauth,
            reasonOfPreauth
        } = req.body;

        try {
            // Check if a record with the claimObjectId already exists
            let existingRecord = await HospitalService.findOne({ claimObjectId });

            if (existingRecord) {
                // If a record exists, update it
                existingRecord.set({
                    pregnancyRelated,
                    reasonOfHopitalization,
                    reasonOfHopitalizationExtension,
                    reasonOfFinalHopitalization,
                    provisionalDiagnosis,
                    updateDiagnosis,
                    finalDiagnosis,
                    fromHospitalizationDate,
                    fromHospitalizationExtensionDate,
                    fromHospitalizationExtensionTime,
                    fromFinalHospitalizationDate,
                    fromFinalHospitalizationTime,
                    fromHospitalizationTime,
                    toHospitaldate,
                    toHospitaltime,
                    toHospitalExtensiondate,
                    toHospitalExtensiontime,
                    toFinalHospitaldate,
                    toFinalHospitaltime,
                    numberOfNights,
                    hospitalizatinDetails,
                    hospitalizatinExtensionDetails,
                    hospitalizationFinalDetails,
                    requestType,
                    hospitalizationCategory,
                    comment,
                    extensionComment,
                    FinalComment,
                    hospitalizationCategory,
                    fromPreauthDate,
                    fromPreauthTime,
                    toPreauthdate,
                    toPreauthtime,
                    PreauthDetails,
                    provisionalDiagnosisPreauth,
                    reasonOfPreauth
                });

                const result = await existingRecord.save();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "Successfully updated service related field details",
                    errorCode: null,
                });
            } else {
                // If no record exists, create a new one
                const hospitalService = new HospitalService({
                    pregnancyRelated,
                    reasonOfHopitalization,
                    reasonOfHopitalizationExtension,
                    reasonOfFinalHopitalization,
                    provisionalDiagnosis,
                    updateDiagnosis,
                    finalDiagnosis,
                    fromHospitalizationDate,
                    fromHospitalizationExtensionDate,
                    fromHospitalizationExtensionTime,
                    fromFinalHospitalizationDate,
                    fromFinalHospitalizationTime,
                    fromHospitalizationTime,
                    toHospitaldate,
                    toHospitaltime,
                    toHospitalExtensiondate,
                    toHospitalExtensiontime,
                    toFinalHospitaldate,
                    toFinalHospitaltime,
                    numberOfNights,
                    hospitalizatinDetails,
                    hospitalizatinExtensionDetails,
                    hospitalizationFinalDetails,
                    claimObjectId,
                    requestType,
                    hospitalizationCategory,
                    comment,
                    extensionComment,
                    FinalComment,
                    hospitalizationCategory,
                    fromPreauthDate,
                    fromPreauthTime,
                    toPreauthdate,
                    toPreauthtime,
                    PreauthDetails,
                    provisionalDiagnosisPreauth,
                    reasonOfPreauth
                });

                const result = await hospitalService.save();

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "Successfully added service related field details",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error, "123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed to add/update service related field details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async serviceType(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            medicineDetails,
            totalCoPayment,
            totalRequestedAmount,
            totalCostOfAllMedicine,
            reimbursmentRate,
            requestType,
            loggedInPatientId,
            loggedInInsuranceId
        } = req.body
        try {
            console.log(req.body, "check req.body");
            console.log(req.body.medicineDetails, "req.body.medicineDetails");
            // return;
            if (pharmacyId == "" && (loggedInInsuranceId != "" && loggedInInsuranceId != undefined)) {
                console.log("inside if");
                const allData = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: loggedInInsuranceId });

                const inputArray = medicineDetails

                var existingArray = [];
                const existingIds = req.body.medicineDetails.map(async (item) => {
                    if (item.existingId != "") {
                        await MedicineDetailsOnClaim.findOneAndUpdate(
                            { _id: item.existingId },
                            {
                                $set: {
                                    quantityPrescribed: item.quantityPrescribed,
                                    quantityDelivered: item.quantityDelivered,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    pricePerUnit: item.pricePerUnit,
                                    coPayment: item.coPayment,
                                    requestAmount: item.requestAmount,
                                    totalCost: item.totalCost,
                                    comment: item.comment,
                                    medicineId: item.medicineId,
                                    date_of_service: item.date_of_service,
                                    categoryService: item.categoryService,
                                    serviceName: item.serviceName,
                                    serviceCode: item.serivceCode,
                                    medicineName: item.medicineName,
                                    usedAmount: item.requestAmount,
                                    reimbursmentRate: item.reimbursmentRate,
                                    indexNumber: item.indexNumber
                                }
                            },
                            { new: true },

                        ).exec();
                    }
                    else {
                        item.usedAmount = item.requestAmount
                        existingArray.push(item);
                    }
                })
                var existData = []
                let addNewData = []
                var removeID = []

                if (existingArray.length > 0) {
                    const uniqueList = existingArray.map((singleData) => ({
                        ...singleData,
                        for_medicine_claim: claimObjectId,
                        for_portal_user: loggedInInsuranceId,
                    }));
                    const result = await MedicineDetailsOnClaim.insertMany(uniqueList)

                } else {
                }

                const alldataResult = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: loggedInInsuranceId }).sort({ indexNumber: 1 });
                // loggedInPatientId
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                    {
                        $set: {
                            totalCoPayment,
                            totalRequestedAmount,
                            totalCostOfAllMedicine,
                            reimbursmentRate,
                            requestType
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: alldataResult,
                    message: "successfully added medicine details on claim details",
                    errorCode: null,
                });

            }

            else if (pharmacyId == "" && loggedInInsuranceId == "") {
                console.log("inside else if");
                const allData = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: loggedInPatientId });

                const inputArray = medicineDetails

                var existingArray = [];
                const existingIds = req.body.medicineDetails.map(async (item) => {
                    if (item.existingId != "") {
                        await MedicineDetailsOnClaim.findOneAndUpdate(
                            { _id: item.existingId },
                            {
                                $set: {
                                    quantityPrescribed: item.quantityPrescribed,
                                    quantityDelivered: item.quantityDelivered,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    pricePerUnit: item.pricePerUnit,
                                    coPayment: item.coPayment,
                                    requestAmount: item.requestAmount,
                                    totalCost: item.totalCost,
                                    comment: item.comment,
                                    medicineId: item.medicineId,
                                    date_of_service: item.date_of_service,
                                    categoryService: item.categoryService,
                                    serviceName: item.serviceName,
                                    serviceCode: item.serivceCode,
                                    medicineName: item.medicineName,
                                    reimbursmentRate: item.reimbursmentRate,
                                    indexNumber: item.indexNumber
                                }
                            },
                            { new: true },

                        ).exec();
                    }
                    else {
                        item.usedAmount = item.requestAmount
                        existingArray.push(item);
                    }
                })
                var existData = []
                let addNewData = []
                var removeID = []

                if (existingArray.length > 0) {
                    const uniqueList = existingArray.map((singleData) => ({
                        ...singleData,
                        for_medicine_claim: claimObjectId,
                        for_portal_user: loggedInPatientId,
                    }));
                    const result = await MedicineDetailsOnClaim.insertMany(uniqueList)

                } else {
                }

                const alldataResult = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: loggedInPatientId }).sort({ indexNumber: 1 });

                await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: loggedInPatientId, _id: claimObjectId },
                    {
                        $set: {
                            totalCoPayment,
                            totalRequestedAmount,
                            totalCostOfAllMedicine,
                            reimbursmentRate,
                            requestType
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: alldataResult,
                    message: "successfully added medicine details on claim details",
                    errorCode: null,
                });

            }
            else {
                const allData = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: pharmacyId });
                console.log(allData, "check all data", { for_medicine_claim: claimObjectId, for_portal_user: pharmacyId });
                const inputArray = medicineDetails
                var existingArray = [];
                const existingIds = req.body.medicineDetails.map(async (item) => {
                    if (item.existingId != "") {
                        await MedicineDetailsOnClaim.findOneAndUpdate(
                            { _id: item.existingId },
                            {
                                $set: {
                                    quantityPrescribed: item.quantityPrescribed,
                                    quantityDelivered: item.quantityDelivered,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    pricePerUnit: item.pricePerUnit,
                                    coPayment: item.coPayment,
                                    requestAmount: item.requestAmount,
                                    totalCost: item.totalCost,
                                    comment: item.comment,
                                    medicineId: item.medicineId,
                                    date_of_service: item.date_of_service,
                                    categoryService: item.categoryService,
                                    serviceName: item.serviceName,
                                    serviceCode: item.serivceCode,
                                    medicineName: item.medicineName,
                                    reimbursmentRate: item.reimbursmentRate,
                                    indexNumber: item.indexNumber,
                                    usedAmount: item.requestAmount
                                }
                            },
                            { new: true },

                        ).exec();
                    }

                    else {
                        item.usedAmount = item.requestAmount
                        existingArray.push(item);
                    }
                })

                if (existingArray.length > 0) {
                    const uniqueList = existingArray.map((singleData) => ({
                        ...singleData,
                        for_medicine_claim: claimObjectId,
                        for_portal_user: pharmacyId,
                    }));
                    const result = await MedicineDetailsOnClaim.insertMany(uniqueList)

                } else {
                }
                const alldataResult = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: pharmacyId }).sort({ indexNumber: 1 });
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            totalCoPayment,
                            totalRequestedAmount,
                            totalCostOfAllMedicine,
                            reimbursmentRate,
                            requestType
                        }
                    },
                    { new: true }
                ).exec();

                sendResponse(req, res, 200, {
                    status: true,
                    data: alldataResult,
                    message: "successfully added medicine details on claim details",
                    errorCode: null,
                });

            }
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add medicine details on claim details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async serviceTypeDoctor(req, res) {
        const {
            createdById,
            claimObjectId,
            medicineDetails,
            totalCoPayment,
            totalRequestedAmount,
            totalCostOfAllMedicine,
            reimbursmentRate,
            requestType,
            loggedInPatientId
        } = req.body
        try {
            var existingArray = [];
            console.log(req.body.medicineDetails, "req.body.medicineDetails");
            const existingIds = req.body.medicineDetails.map(async (item) => {
                if (item.existingId != "") {
                    console.log(item, "check itme list");
                    await MedicineDetailsOnClaim.findOneAndUpdate(
                        { _id: item.existingId },
                        {
                            $set: {
                                quantityPrescribed: item.quantityPrescribed,
                                quantityDelivered: item.quantityDelivered,
                                date_of_Pregnancy: item.date_of_Pregnancy,
                                frequency: item.frequency,
                                duration: item.duration,
                                pricePerUnit: item.pricePerUnit,
                                reasonOfConsultation: item.reasonOfConsultation,
                                coPayment: item.coPayment,
                                requestAmount: item.requestAmount,
                                totalCost: item.totalCost,
                                comment: item.comment,
                                medicineId: item.medicineId,
                                date_of_service: item.date_of_service,
                                categoryService: item.categoryService,
                                serviceName: item.serviceName,
                                other_service_name: item.other_service_name,
                                serviceCode: item.serivceCode,
                                medicineName: item.medicineName,
                                usedAmount: item.requestAmount,
                                reimbursmentRate: item.reimbursmentRate,
                                indexNumber: item.indexNumber,
                                otherReason:item.otherReason
                            }
                        },
                        { new: true },

                    ).exec();
                }
                else {
                    item.usedAmount = item.requestAmount
                    existingArray.push(item);
                }
            })

            if (existingArray.length > 0) {
                const uniqueList = existingArray.map((singleData) => ({
                    ...singleData,
                    for_medicine_claim: claimObjectId,
                    for_portal_user: createdById,
                }));
                const result = await MedicineDetailsOnClaim.insertMany(uniqueList)

            } else {
            }
            const alldataResult = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: createdById }).sort({ indexNumber: 1 });
            await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        totalCoPayment,
                        totalRequestedAmount,
                        totalCostOfAllMedicine,
                        reimbursmentRate,
                        requestType
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: alldataResult,
                message: "successfully added medicine details on claim details",
                errorCode: null,
            });


        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add medicine details on claim details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async documentUpload(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            documentData,
            loggedInPatientId,
            loggedInInsuranceId
        } = req.body
        try {
            if (pharmacyId == "" && loggedInPatientId != "") {
                var result
                const list = documentData.map((singleData) => ({
                    ...singleData,
                    for_medicine_claim: claimObjectId,
                    for_portal_user: loggedInPatientId
                }));
                result = await MedicineClaimDocument.insertMany(list)

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added claim document",
                    errorCode: null,
                });
            }
            if (pharmacyId == "" && loggedInPatientId == "") {
                var result
                const list = documentData.map((singleData) => ({
                    ...singleData,
                    for_medicine_claim: claimObjectId,
                    for_portal_user: loggedInInsuranceId
                }));
                result = await MedicineClaimDocument.insertMany(list)

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added claim document",
                    errorCode: null,
                });
            }

            else {
                var result
                const list = documentData.map((singleData) => ({
                    ...singleData,
                    for_medicine_claim: claimObjectId,
                    for_portal_user: pharmacyId
                }));
                result = await MedicineClaimDocument.insertMany(list)

                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added claim document",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error), "error";
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add claim document",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async documentUploadDoctor(req, res) {
        const {
            createdById,
            claimObjectId,
            documentData,
            loggedInPatientId
        } = req.body
        try {
            var result
            const list = documentData.map((singleData) => ({
                ...singleData,
                for_medicine_claim: claimObjectId,
                for_portal_user: createdById
            }));
            result = await MedicineClaimDocument.insertMany(list)

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added claim document",
                errorCode: null,
            });


        } catch (error) {
            console.log(error), "error";
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add claim document",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteDocument(req, res) {
        const {
            documentId
        } = req.body
        try {

            var result = await MedicineClaimDocument.findOneAndDelete({ _id: documentId })

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added claim document",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add claim document",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async eSignature(req, res) {
        var {
            pharmacyId,
            claimObjectId,
            eSignature,
            loggedInPatientId,
            userId,
            maadoVariables,
            templateId,
            loggedInInsuranceId
        } = req.body

        try {
            // console.log(req.body, "req.body esignature");

            if (pharmacyId == "" && loggedInPatientId != "") {
                pharmacyId = loggedInPatientId
            }
            else if (pharmacyId == "" && loggedInInsuranceId != "") {
                pharmacyId = loggedInInsuranceId
            }
            (async () => {
                try {
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    });
                    const page = await browser.newPage();
                    let approvalText = "s1212s"
                    let claimPdfValue = req.body.maadoVariables
                    console.log(claimPdfValue, "claimPdfValueclaimPdfValue");
                    let htmlTemplate;
                    if (req.body.templateId == "637f4d652af514775e3e1703") {
                        htmlTemplate = './uploads/mado.html';
                    } else if (req.body.templateId == "637f4d802af514775e3e1704") {
                        htmlTemplate = './uploads/health_coversure.html';
                    } else if (req.body.templateId == "637f4d912af514775e3e1705") {
                        htmlTemplate = './uploads/uab.html';
                    }

                    fs.readFile(htmlTemplate, 'utf8', async (err, html) => {
                        if (err) {
                            console.error('Error reading HTML file:', err);
                            return;
                        }
                        html = html.replace(/{claim_number}/g, claimPdfValue.claim_number);
                        html = html.replace(/{pri_firstName}/g, claimPdfValue.pri_firstName);
                        html = html.replace(/{pri_middleName}/g, claimPdfValue.pri_middleName);
                        html = html.replace(/{pri_lastName}/g, claimPdfValue.pri_lastName);
                        html = html.replace(/{pri_age}/g, claimPdfValue.pri_age);
                        html = html.replace(/{priscriberFullName}/g, claimPdfValue.priscriberFullName);
                        html = html.replace(/{marital_status}/g, claimPdfValue.marital_status);
                        html = html.replace(/{pri_gender}/g, claimPdfValue.pri_gender);
                        html = html.replace(/{totalCostOfAllMedicine}/g, claimPdfValue.totalCostOfAllMedicine);
                        html = html.replace(/{totalCoPayment}/g, claimPdfValue.totalCoPayment);
                        html = html.replace(/{totalRequestedAmount}/g, claimPdfValue.totalRequestedAmount);
                        html = html.replace(/{pharm_signature}/g, claimPdfValue.pharm_signature);
                        html = html.replace(/{pri_cardId}/g, claimPdfValue.pri_cardId);
                        html = html.replace(/{pri_ﬁrstName}/g, claimPdfValue.pri_ﬁrstName);
                        html = html.replace(/{pri_policyId}/g, claimPdfValue.pri_policyId);
                        html = html.replace(/{pri_insuranceId}/g, claimPdfValue.pri_insuranceId);
                        html = html.replace(/{code_assignment}/g, claimPdfValue.code_assignment);
                        html = html.replace(/{sec_pri_firstName}/g, claimPdfValue.sec_pri_firstName);
                        html = html.replace(/{sec_pri_middleName}/g, claimPdfValue.sec_pri_middleName);
                        html = html.replace(/{sec_pri_lastName}/g, claimPdfValue.sec_pri_lastName);
                        html = html.replace(/{claimDeclartion}/g, claimPdfValue.claimDeclartion);


                        // html = html.replace(/{ClaimDataeSignaturedate}/g, claimPdfValue.ClaimData.eSignature.date);
                        var templatePdf;
                        let medicineArray = []
                        // console.log(claimPdfValue?.claimMedicine?.length, "check log ");
                        for (let index = 0; index < claimPdfValue?.claimMedicine?.length; index++) {
                            const element = claimPdfValue.claimMedicine[index];
                            medicineArray.push(`<tr>
                                    <td> ${index + 1}</td>
                                    <td> ${element.medicineName} </td>
                                    <td> ${element.frequency} </td>
                                    <td> ${element.quantityDelivered} </td>
                                    <td> ${element.totalCost} </td>
                                </tr>`);
                        }
                        html = html.replace(/{medicinelist}/g, medicineArray);
                        // console.log(html, "html content");
                        await page.setContent(html, { waitUntil: 'domcontentloaded' });
                        let pdfname = "Claim-" + req.body.claimObjectId + ".pdf"
                        const pdfPath = '../insurance/uploads/' + pdfname;
                        await page.setViewport({
                            width: 640,
                            height: 480,
                            deviceScaleFactor: 1,
                        });
                        templatePdf = await page.pdf({
                            path: pdfPath,
                            printBackground: true,
                            format: 'A4',
                            // scale: 1,
                        });
                        // var file = new File([data],pdfPath);
                        // console.log(file,"file");

                        await browser.close();
                        // console.log('PDF saved to:', pdfPath);


                        var result = await uploadFile(templatePdf, {
                            Bucket: "healthcare-crm-stage-docs",
                            Key: `pharmacy/${userId}/image/${pdfname}`,
                        });
                        // console.log(result, "check result");
                        let previewtemplate = result.Key

                        result = await medicineClaimCommonInfo.findOneAndUpdate(
                            { for_portal_user: pharmacyId, _id: claimObjectId },
                            {
                                $set: {
                                    eSignature,
                                    previewtemplate
                                }
                            },
                            { new: true }
                        ).exec();
                        let previewsignedURL = await getDocument(previewtemplate);
                        // console.log(previewsignedURL, "previewsignedURL");
                        sendResponse(req, res, 200, {
                            status: true,
                            data: previewsignedURL,
                            message: "successfully added e-signature",
                            errorCode: null,
                        });
                    });


                } catch (error) {
                    console.error('An error occurred:', error);
                    sendResponse(req, res, 500, {
                        status: false,
                        data: null,
                        message: error,
                        errorCode: null,
                    });
                }


            })
                ();



            // }

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add e-signature",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async finalSubmitClaim(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            loggedInPatientId,
            orderId,
            loggedInInsuranceId
        } = req.body
        console.log(req.body, "orderIdcheck");
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {

            if (pharmacyId == "" && loggedInPatientId != "") {
                console.log("inside if");
                const patientDetails = await httpService.getStaging('patient/get-profile-info-data', { data: loggedInPatientId }, headers, 'patientServiceUrl');
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult, "medicineResult12");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });

                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit, "check subscriberinfoforlimit");

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId

                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    // console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();

                            // For notification
                            const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                            var insurancesubscriberFullName;
                            if (insuranceSubscriberInfo) {
                                insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name;
                            } else {
                                insurancesubscriberFullName = "";
                            }

                            var message = `${patientDetails?.data?.full_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult?.claimId}`
                            var param = {
                                created_by_type: "patient",
                                created_by: loggedInPatientId,
                                content: message,
                                url: '',
                                for_portal_user: staffSave?.staff_id,
                                notitype: 'New Claim',
                                claimObjectId: claimObjectId,
                                claimId: medicineResult?.claimId
                            }
                            await notification(param)
                        }

                    }
                    /* code start calculation */


                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());

                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(requestAmount)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });
                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }


                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);
                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }

                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }
                    /* code end calculation */

                    try {
                        console.log(" order check");
                        const subscriberDetails = await httpService.postStaging('order/updateOrderComplete', { orderId: orderId }, headers, 'pharmacyServiceUrl');

                    } catch (error) {

                        console.log(error, "error order");
                    }

                    const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                    var insurancesubscriberFullName;
                    if (insuranceSubscriberInfo) {
                        insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                    } else {
                        insurancesubscriberFullName = "";
                    }
                    console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                    var message = `${patientDetails?.data?.full_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                    var param = {
                        created_by_type: "patient",
                        created_by: loggedInPatientId,
                        content: message,
                        url: '',
                        for_portal_user: medicineResult?.insuranceId,
                        notitype: 'New Claim',
                        // appointmentId: null,
                        claimObjectId: claimObjectId,
                        claimId: medicineResult.claimId
                    }
                    console.log(param, "check all params");
                    await notification(param)

                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();


                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }

            else if (pharmacyId == "" && loggedInInsuranceId != "") {
                console.log("inside else if");
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: loggedInInsuranceId });
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult.patientId, "medicineResult12");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });
                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit, "check subscriberinfoforlimit");

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }

                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    // console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();
                            console.log(staffSave, "staffSave");

                            // For notification
                            const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                            console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                            var insurancesubscriberFullName;
                            if (insuranceSubscriberInfo) {
                                insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                            } else {
                                insurancesubscriberFullName = "";
                            }
                            console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                            var message = `${insuranceDetails?.company_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult?.claimId}`
                            var param = {
                                created_by_type: "insurance",
                                created_by: loggedInInsuranceId,
                                content: message,
                                url: '',
                                for_portal_user: staffSave?.staff_id,
                                notitype: 'New Claim',
                                // appointmentId: null,
                                claimObjectId: claimObjectId,
                                claimId: medicineResult?.claimId
                            }
                            console.log(param, "check all params");
                            await notification(param)
                        }

                    }
                    /* code start calculation */


                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());


                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(requestAmount)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });

                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }

                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);
                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }

                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }
                    /* code end calculation */
                    try {
                        console.log(" order check");
                        const subscriberDetails = await httpService.postStaging('order/updateOrderComplete', { orderId: orderId }, headers, 'pharmacyServiceUrl');

                    } catch (error) {

                        console.log(error, "error order");
                    }

                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();


                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }
            else {
                console.log("inside else");
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult, "medicineResult");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                const pharmacyDetails = await httpService.getStaging('pharmacy/get-PharmacyBy-Id', { for_portal_user: pharmacyId }, headers, 'pharmacyServiceUrl');
                var pharmacyFirstName;
                if (pharmacyDetails) {
                    pharmacyFirstName = pharmacyDetails.first_name + pharmacyDetails.middle_name + pharmacyDetails.last_name
                } else {
                    pharmacyFirstName = "";
                }

                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });

                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit);

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }

                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: pharmacyId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId,
                                plan_validity: insuranceDateValidity
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    // console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();
                            console.log(staffSave, "staffSave");

                            // For notification
                            const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                            console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");


                            var insurancesubscriberFullName;
                            if (insuranceSubscriberInfo) {
                                insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                            } else {
                                insurancesubscriberFullName = "";
                            }
                            console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                            var message = `${pharmacyDetails?.body?.pharmacy_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                            var param = {
                                created_by_type: "pharmacy",
                                created_by: pharmacyId,
                                content: message,
                                url: '',
                                for_portal_user: staffSave?.staff_id,
                                notitype: 'New Claim',
                                // appointmentId: null,
                                claimObjectId: claimObjectId,
                                claimId: medicineResult.claimId
                            }
                            console.log(param, "check all params");
                            await notification(param)
                        }

                    }


                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;

                        // console.log(subscriberUser, "subscriberUser");
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());

                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(requestAmount)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });
                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }


                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);
                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }

                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }

                    try {
                        console.log(" order check");
                        const subscriberDetails = await httpService.postStaging('order/updateOrderComplete', { orderId: orderId }, headers, 'pharmacyServiceUrl');

                    } catch (error) {

                        console.log(error, "error order");
                    }
                    const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                    var insurancesubscriberFullName;
                    if (insuranceSubscriberInfo) {
                        insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                    } else {
                        insurancesubscriberFullName = "";
                    }
                    console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                    var message = `${pharmacyDetails?.body?.pharmacy_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                    var param = {
                        created_by_type: "pharmacy",
                        created_by: pharmacyId,
                        content: message,
                        url: '',
                        for_portal_user: medicineResult.insuranceId,
                        notitype: 'New Claim',
                        // appointmentId: null,
                        claimObjectId: claimObjectId,
                        claimId: medicineResult.claimId
                    }
                    console.log(param, "check all params");
                    await notification(param)
                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: pharmacyId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",

                            }
                        },
                        { upsert: true, new: true }
                    ).exec();
                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add e-signature",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async finalSubmitClaimDoctor(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            preAuthReclaimId,
            loggedInPatientId,
            orderId,
            appointmentId
        } = req.body
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            if (preAuthReclaimId != "") {
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId: preAuthReclaimId },
                    {
                        $set: {
                            pre_auth_reclaim: true
                        }
                    },
                    { new: true }
                ).exec();
            }
            const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
            console.log(medicineResult, "medicineResult");
            const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
            const pharmacyDetails = await httpService.getStaging('pharmacy/get-PharmacyBy-Id', { for_portal_user: pharmacyId }, headers, 'pharmacyServiceUrl');
            var pharmacyFirstName;
            if (pharmacyDetails) {
                pharmacyFirstName = pharmacyDetails.first_name + pharmacyDetails.middle_name + pharmacyDetails.last_name
            } else {
                pharmacyFirstName = "";
            }

            var status = medicineResult.status
            var result
            if (status == "pending") {
                const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });

                const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                console.log(subscriberInfoForLimit);

                let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                    console.log("detailsInsurance123");
                    var detailsInsurance = await insurancesubscribers.aggregate([
                        {
                            $match: {
                                secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                is_deleted: false,
                            },
                        },
                    ]);
                    console.log("detailsInsurance", detailsInsurance);
                    if (detailsInsurance.length > 0) {
                        console.log("inside details");
                        let primaryidDetail = detailsInsurance[0]._id
                        console.log("inside details", primaryidDetail);
                        const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                        let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                        let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                        insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                    }

                }
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            claimComplete: true,
                            healthPlanId: subscriberDetails.body.plan,
                            for_current_insurance_staff_role: isFirstData[0].roleId,
                            plan_validity: insuranceDateValidity
                        }
                    },
                    { upsert: true, new: true }
                ).exec();


                console.log(isFirstData, "log isFirst");
                const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                console.log(StaffDetails, "StaffDetails");


                if (StaffDetails) {
                    for (const item of StaffDetails) {
                        let data = new claimStaffDetails({
                            claim_object_id: claimObjectId,
                            staff_id: item.for_portal_user,
                            staff_role_id: isFirstData[0].roleId,
                        })
                        let staffSave = await data.save();
                        console.log(staffSave, "staffSave");
                    }

                }
                const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                var insurancesubscriberFullName;
                if (insuranceSubscriberInfo) {
                    insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                } else {
                    insurancesubscriberFullName = "";
                }
                console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                var message = `${pharmacyFirstName} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                var param = {
                    created_by_type: "pharmacy",
                    created_by: pharmacyId,
                    content: message,
                    url: '',
                    for_portal_user: medicineResult.insuranceId,
                    notitype: 'New Claim',
                    // appointmentId: null,
                    claimObjectId: claimObjectId,
                    claimId: medicineResult.claimId
                }
                console.log(param, "check all params");
                await notification(param)


                /* code calculation start */

                try {
                    console.log(" order check");
                    const subscriberDetails = await httpService.postStaging('patient/updateAppointmentComplete', { appointmentId: mongoose.Types.ObjectId(appointmentId) }, headers, 'hospitalServiceUrl');

                } catch (error) {

                    console.log(error, "error order");
                }



                try {
                    console.log(" order check");
                    const subscriberDetails = await httpService.postStaging('labimagingdentaloptical/updateAppointmentComplete', { appointmentId: mongoose.Types.ObjectId(appointmentId) }, headers, 'labimagingdentalopticalServiceUrl');

                } catch (error) {

                    console.log(error, "error order");
                }

                const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                var healthPlanIdCommon = claimDetails.healthPlanId;
                var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                for (let index = 0; index < medicineDataDetails.length; index++) {
                    const element = medicineDataDetails[index];
                    let categoryService = element.categoryService;
                    let serviceName = element.serviceName;
                    let totalCost = element.totalCost;
                    let medicineName = element.medicineName;
                    let requestAmount = element.requestAmount;

                    // console.log(subscriberUser, "subscriberUser");
                    var primaryid = '';
                    var findsubscriber = await insurancesubscribers.aggregate([
                        {
                            $match: {
                                _id: patientIdCommon,
                                is_deleted: false,
                            },
                        },

                    ]);
                    console.log(findsubscriber, "findsubscriber", patientIdCommon);
                    if (findsubscriber[0].subscription_for == 'Primary') {
                        primaryid = patientIdCommon
                    }
                    else {
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: patientIdCommon,
                                    is_deleted: false,
                                },
                            },
                        ]);
                        if (detailsInsurance.length > 0) {
                            primaryid = detailsInsurance[0]._id
                        }
                    }
                    let detailsInsurance1 = await insurancesubscribers.aggregate([
                        {
                            $match: {
                                _id: primaryid,
                                is_deleted: false,
                            },
                        },

                    ]);


                    const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                    secondarySubscriberIds.push(primaryid.toString());

                    var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                    var previousFamilyTotalLimit = parseFloat(requestAmount)
                    if (fetchRecordForFamilyTotalLimit) {
                        previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                    }


                    var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                    var previousOwnLimit = parseFloat(requestAmount)
                    if (fetchRecordForOwnLimit) {
                        previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                    }


                    var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                    var previousCategoryLimit = parseFloat(requestAmount)
                    if (fetchRecordForCategoryLimit) {
                        previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                    }

                    var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                    var previousFamilyServiceLimit = parseFloat(requestAmount)
                    if (fetchRecordForFamilyServiceLimit) {
                        previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                    }

                    var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                    var previousFamilyCategoryLimit = parseFloat(requestAmount)
                    if (fetchRecordForFamilyCategoryLimit) {
                        previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                    }


                    var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                    var previousNumberOfServiceCount = 1
                    if (fetchRecordNumberOfServiceCount) {
                        previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                    }

                    let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                    if (subscriberUser) {
                        // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });

                        if (fetchRecordForFamilyTotalLimit) {
                            await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                        }

                        if (fetchRecordForOwnLimit) {
                            await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                        }


                        if (fetchRecordForCategoryLimit) {
                            await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                        }

                        if (fetchRecordForFamilyServiceLimit) {
                            await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                        }


                        if (fetchRecordForFamilyCategoryLimit) {
                            await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                        }

                        if (fetchRecordNumberOfServiceCount) {
                            await subscriberUseLimit.updateMany({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName, plan_validity: insuranceDateValidity
                            }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                        }


                    } else {

                        const data = new subscriberUseLimit({
                            subscriber_id: patientIdCommon,
                            service_name: serviceName,
                            category_name: categoryService,
                            category_limit: previousCategoryLimit,
                            family_service_limit: previousFamilyServiceLimit,
                            family_category_limit: previousFamilyCategoryLimit,
                            number_of_service_count: previousNumberOfServiceCount,
                            plan_validity: insuranceDateValidity,
                            service_limit: requestAmount,
                            own_limit: previousOwnLimit,
                            family_total_limit: previousFamilyTotalLimit
                        });
                        data.save()
                            .then(async (doc) => {
                                console.log(doc);

                                if (fetchRecordForFamilyTotalLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                }

                                if (fetchRecordForOwnLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                }

                                if (fetchRecordForCategoryLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                }

                                if (fetchRecordForFamilyServiceLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                }


                                if (fetchRecordForFamilyCategoryLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                }

                                if (fetchRecordNumberOfServiceCount) {
                                    await subscriberUseLimit.updateMany({
                                        subscriber_id: patientIdCommon,
                                        service_name: serviceName, plan_validity: insuranceDateValidity
                                    }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                }
                            })
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }


                /* code calculation end */
            } else {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            claimComplete: true,
                            healthPlanId: subscriberDetails.body.plan,
                            status: "pending",

                        }
                    },
                    { upsert: true, new: true }
                ).exec();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added e-signature",
                errorCode: null,
            });
            // }

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add e-signature",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // convertToObjectIdArray = (stringIds) => {
    //     const ObjectId = mongoose.Types.ObjectId;
    //     const objectIdArray = stringIds.map(id => ObjectId(id));
    //     return objectIdArray;
    // };



    async commonInformationStep1FourPortal(req, res) {
        const {
            service,
            pharmacyId,
            patientId,
            ePrescriptionNumber,
            insuranceId,
            claimNumber,
            requestType,
            claimId,
            created_by,
            preAuthReclaimId,
            loggedInPatientId,
            createdById,
            claimType
        } = req.body
        try {
            var serviceVar = "";
            if (preAuthReclaimId != "") {
                await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId: preAuthReclaimId },
                    {
                        $set: {
                            pre_auth_reclaim: true
                        }
                    },
                    { new: true }
                ).exec();
            }
            var claimData
            if (claimId == "") {
                const claim_id = await getNextSequenceValue("claim_Id");

                const claimDetails = new medicineClaimCommonInfo({
                    service: serviceVar,
                    patientId,
                    preAuthReclaimId,
                    ePrescriptionNumber,
                    insuranceId,
                    claimType: claimType,
                    claimNumber,
                    claimId: "CLAIM-" + claim_id,
                    requestType,
                    for_portal_user: createdById,
                    pharmacy_id: null,
                    loggedInPatientId,
                    created_by,
                })
                claimData = await claimDetails.save();


            } else {
                claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId, for_portal_user: createdById },
                    {
                        $set: {
                            service: serviceVar,
                            patientId,
                            ePrescriptionNumber,
                            insuranceId,
                            claimNumber,
                        }
                    },
                    { new: true }
                ).exec();
                console.log(claimData, "check claimdata");
            }
            sendResponse(req, res, 200, {
                status: true,
                data: claimData,
                message: "successfully saved medicine claim",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to save medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep2FourPortal(req, res) {
        const {
            insurerType,
            primaryInsuredIdentity,
            createdById,
            claimObjectId
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        insurerType,
                        primaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added primary insurer details",
                errorCode: null,
            });


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add primary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async commonInformationStep3FourPortal(req, res) {
        const {
            secondaryInsuredIdentity,
            loggedInPatientId,
            claimObjectId,
            createdById
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        secondaryInsuredIdentity,
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added secondary insurer details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add secondary insurer details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async commonInformationStep4FourPortal(req, res) {
        const {
            createdById,
            claimObjectId,
            deliverCenterInfo,
            prescriberCenterInfo,
            loggedInPatientId,
            locationFor
        } = req.body
        console.log(req.body, "check log req");
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        deliverCenterInfo,
                        prescriberCenterInfo,
                        locationFor
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added deliver and prescriber center details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add deliver and prescriber center details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async commonInformationStep5FourPortal(req, res) {
        const {
            createdById,
            claimObjectId,
            accidentRelatedField,
            loggedInPatientId
        } = req.body
        try {

            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        accidentRelatedField
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added accident related field details",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add accident related field details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async serviceTypeFourPortal(req, res) {
        const {
            createdById,
            claimObjectId,
            medicineDetails,
            totalCoPayment,
            totalRequestedAmount,
            totalCostOfAllMedicine,
            reimbursmentRate,
            requestType,
            loggedInPatientId
        } = req.body
        try {
            var existingArray = [];
            const existingIds = req.body.medicineDetails.map(async (item) => {
                if (item.existingId != "") {
                    await MedicineDetailsOnClaim.findOneAndUpdate(
                        { _id: item.existingId },
                        {
                            $set: {
                                quantityPrescribed: item.quantityPrescribed,
                                quantityDelivered: item.quantityDelivered,
                                frequency: item.frequency,
                                duration: item.duration,
                                pricePerUnit: item.pricePerUnit,
                                reasonOfConsultation: item.reasonOfConsultation,
                                coPayment: item.coPayment,
                                requestAmount: item.requestAmount,
                                totalCost: item.totalCost,
                                comment: item.comment,
                                medicineId: item.medicineId,
                                date_of_service: item.date_of_service,
                                categoryService: item.categoryService,
                                serviceName: item.serviceName,
                                serviceCode: item.serivceCode,
                                medicineName: item.medicineName,
                                usedAmount: item.requestAmount,
                                reimbursmentRate: item.reimbursmentRate,
                                indexNumber: item.indexNumber
                            }
                        },
                        { new: true },

                    ).exec();
                }
                else {
                    item.usedAmount = item.requestAmount
                    existingArray.push(item);
                }
            })

            if (existingArray.length > 0) {
                const uniqueList = existingArray.map((singleData) => ({
                    ...singleData,
                    for_medicine_claim: claimObjectId,
                    for_portal_user: createdById,
                }));
                const result = await MedicineDetailsOnClaim.insertMany(uniqueList)

            } else {
            }
            const alldataResult = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: createdById }).sort({ indexNumber: 1 });
            await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: createdById, _id: claimObjectId },
                {
                    $set: {
                        totalCoPayment,
                        totalRequestedAmount,
                        totalCostOfAllMedicine,
                        reimbursmentRate,
                        requestType
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: alldataResult,
                message: "successfully added medicine details on claim details",
                errorCode: null,
            });


        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add medicine details on claim details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async finalSubmitClaimFourPortal(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            loggedInPatientId,
            orderId,
            loggedInInsuranceId,
            portal_type,
        } = req.body
        console.log(req.body, "orderIdcheck");
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            if (pharmacyId == "" && loggedInPatientId != "") {
                console.log("inside if");
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult, "medicineResult12");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });

                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit, "check subscriberinfoforlimit");

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId,
                                plan_validity: insuranceDateValidity

                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();
                            console.log(staffSave, "staffSave");
                        }

                    }


                    /* code start calculation */


                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());

                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        console.log(fetchRecordForOwnLimit, "fetchRecordForOwnLimit");
                        var previousOwnLimit = parseFloat(requestAmount)
                        console.log(previousOwnLimit, "previousOwnLimit");
                        if (fetchRecordForOwnLimit) {
                            console.log(fetchRecordForOwnLimit, "fetchRecordForOwnLimit");
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                            console.log(previousOwnLimit, "previousOwnLimit");
                        }

                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });

                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }


                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);

                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }


                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }
                    /* code end calculation */


                    try {
                        console.log(" order check");
                        const subscriberDetails = await httpService.postStaging('labimagingdentaloptical/four-portal-updateOrderComplete', { orderId: orderId, portal_type: portal_type }, headers, 'labimagingdentalopticalServiceUrl');
                        console.log(subscriberDetails, "subscriberDetails12");
                    } catch (error) {

                        console.log(error, "error order");
                    }

                    const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                    var insurancesubscriberFullName;
                    if (insuranceSubscriberInfo) {
                        insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                    } else {
                        insurancesubscriberFullName = "";
                    }
                    console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                    var message = `${patientDetails?.data?.full_name} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                    var param = {
                        created_by_type: "patient",
                        created_by: loggedInPatientId,
                        content: message,
                        url: '',
                        for_portal_user: medicineResult?.insuranceId,
                        notitype: 'New Claim',
                        // appointmentId: null,
                        claimObjectId: claimObjectId,
                        claimId: medicineResult.claimId
                    }
                    console.log(param, "check all params");
                    await notification(param)

                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();


                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }

            else if (pharmacyId == "" && loggedInInsuranceId != "") {
                console.log("inside else if");
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult.patientId, "medicineResult12");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });


                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInInsuranceId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId,
                                plan_validity: insuranceDateValidity
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();
                            console.log(staffSave, "staffSave");
                        }

                    }


                    /* code start calculation */
                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit, "check subscriberinfoforlimit");

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }

                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());

                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(requestAmount)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });
                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }

                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);

                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }

                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }
                    /* code end calculation */
                    try {
                        console.log(" order check");
                        const subscriberDetails = await httpService.postStaging('labimagingdentaloptical/four-portal-updateOrderComplete', { orderId: orderId, portal_type: portal_type }, headers, 'labimagingdentalopticalServiceUrl');
                        console.log(subscriberDetails, "subscriberDetails123");
                    } catch (error) {

                        console.log(error, "error order");
                    }

                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: loggedInPatientId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",
                                // previewtemplate
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();


                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }
            else {
                console.log("inside else");
                const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                console.log(medicineResult, "medicineResult");
                const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
                const pharmacyDetails = await httpService.getStaging('pharmacy/get-PharmacyBy-Id', { for_portal_user: pharmacyId }, headers, 'pharmacyServiceUrl');
                var pharmacyFirstName;
                if (pharmacyDetails) {
                    pharmacyFirstName = pharmacyDetails.first_name + pharmacyDetails.middle_name + pharmacyDetails.last_name
                } else {
                    pharmacyFirstName = "";
                }

                var status = medicineResult.status
                var result
                if (status == "pending") {
                    const isFirstData = await ClaimProcessRole.find({ insurance_id: medicineResult.insuranceId, isDeleted: false }).sort({ sequence: 1 });

                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(subscriberInfoForLimit);

                    let insurance_validity_from = subscriberInfoForLimit.insurance_validity_from;
                    let insurance_validity_to = subscriberInfoForLimit.insurance_validity_to;
                    var insuranceDateValidity = `${insurance_validity_from} - ${insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        console.log("detailsInsurance123");
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(medicineResult.patientId),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        console.log("detailsInsurance", detailsInsurance);
                        if (detailsInsurance.length > 0) {
                            console.log("inside details");
                            let primaryidDetail = detailsInsurance[0]._id
                            console.log("inside details", primaryidDetail);
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            let insurance_validity_from1 = subscriberInfoForDetails.insurance_validity_from;
                            let insurance_validity_to1 = subscriberInfoForDetails.insurance_validity_to;
                            insuranceDateValidity = `${insurance_validity_from1} - ${insurance_validity_to1}`;
                        }

                    }
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: pharmacyId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                for_current_insurance_staff_role: isFirstData[0].roleId,
                                plan_validity: insuranceDateValidity
                            }
                        },
                        { upsert: true, new: true }
                    ).exec();

                    console.log(isFirstData, "log isFirst");
                    const StaffDetails = await StaffInfo.find({ role: isFirstData[0].roleId, for_user: isFirstData[0].insurance_id, is_deleted: false });
                    console.log(StaffDetails, "StaffDetails");


                    if (StaffDetails) {
                        for (const item of StaffDetails) {
                            let data = new claimStaffDetails({
                                claim_object_id: claimObjectId,
                                staff_id: item.for_portal_user,
                                staff_role_id: isFirstData[0].roleId,
                            })
                            let staffSave = await data.save();
                            console.log(staffSave, "staffSave");
                        }

                    }

                    /* code calculation start */


                    const claimDetails = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
                    var patientIdCommon = mongoose.Types.ObjectId(claimDetails.patientId);

                    var healthPlanIdCommon = claimDetails.healthPlanId;
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId });
                    console.log(medicineDataDetails, "medicineDataDetails", patientIdCommon, "medicineResult", claimDetails);
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let totalCost = element.totalCost;
                        let medicineName = element.medicineName;
                        let requestAmount = element.requestAmount;

                        // console.log(subscriberUser, "subscriberUser");
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: patientIdCommon,
                                    is_deleted: false,
                                },
                            },

                        ]);
                        console.log(findsubscriber, "findsubscriber", patientIdCommon);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: patientIdCommon,
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: primaryid,
                                    is_deleted: false,
                                },
                            },

                        ]);

                        console.log(detailsInsurance1, "detailsInsurance1");

                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        console.log(secondarySubscriberIds, "secondarySubscriberIds before");
                        secondarySubscriberIds.push(primaryid.toString());
                        console.log(secondarySubscriberIds, "secondarySubscriberIds");

                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        console.log(fetchRecordForFamilyTotalLimit, "fetchRecordForFamilyTotalLimit");
                        var previousFamilyTotalLimit = parseFloat(requestAmount)
                        console.log(previousFamilyTotalLimit, "previousFamilyTotalLimit");

                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(requestAmount)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) + parseFloat(requestAmount);
                        }


                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) + parseFloat(requestAmount);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) + parseFloat(requestAmount)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(requestAmount)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) + parseFloat(requestAmount)
                        }


                        var fetchRecordNumberOfServiceCount = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, plan_validity: insuranceDateValidity });

                        var previousNumberOfServiceCount = 1
                        if (fetchRecordNumberOfServiceCount) {
                            previousNumberOfServiceCount = fetchRecordNumberOfServiceCount.number_of_service_count + 1
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            // await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit, family_service_limit: previousFamilyServiceLimit, family_category_limit: previousFamilyCategoryLimit, number_of_service_count: previousNumberOfServiceCount } });
                            console.log(fetchRecordForFamilyTotalLimit, "fetchRecordForFamilyTotalLimit");

                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }

                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                            if (fetchRecordNumberOfServiceCount) {
                                await subscriberUseLimit.updateMany({
                                    subscriber_id: patientIdCommon,
                                    service_name: serviceName, plan_validity: insuranceDateValidity
                                }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                            }


                        } else {

                            const data = new subscriberUseLimit({
                                subscriber_id: patientIdCommon,
                                service_name: serviceName,
                                category_name: categoryService,
                                category_limit: previousCategoryLimit,
                                family_service_limit: previousFamilyServiceLimit,
                                family_category_limit: previousFamilyCategoryLimit,
                                number_of_service_count: previousNumberOfServiceCount,
                                plan_validity: insuranceDateValidity,
                                service_limit: requestAmount,
                                own_limit: previousOwnLimit,
                                family_total_limit: previousFamilyTotalLimit
                            });
                            data.save()
                                .then(async (doc) => {
                                    console.log(doc);

                                    if (fetchRecordForFamilyTotalLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                    }

                                    if (fetchRecordForOwnLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                    }

                                    if (fetchRecordForCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                    }

                                    if (fetchRecordForFamilyServiceLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                    }


                                    if (fetchRecordForFamilyCategoryLimit) {
                                        await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                    }

                                    if (fetchRecordNumberOfServiceCount) {
                                        await subscriberUseLimit.updateMany({
                                            subscriber_id: patientIdCommon,
                                            service_name: serviceName, plan_validity: insuranceDateValidity
                                        }, { $set: { number_of_service_count: previousNumberOfServiceCount } });
                                    }
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                        }
                    }


                    /* code calculation end */

                    try {
                        console.log(" order check");
                        const subscriberDetails11 = await httpService.postStaging('labimagingdentaloptical/four-portal-updateOrderComplete', { orderId: orderId, portal_type: portal_type }, headers, 'labimagingdentalopticalServiceUrl');
                        console.log(subscriberDetails11, "subscriberDetails1234tyyyyyyyyyyy");
                    } catch (error) {

                        console.log(error, "error order");
                    }
                    const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: medicineResult.patientId });
                    console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
                    var insurancesubscriberFullName;
                    if (insuranceSubscriberInfo) {
                        insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name

                    } else {
                        insurancesubscriberFullName = "";
                    }
                    console.log(insurancesubscriberFullName, "insurancesubscriberFullName");

                    var message = `${pharmacyFirstName} has created new claim against ${insurancesubscriberFullName}. Claim number:${medicineResult.claimId}`
                    var param = {
                        created_by_type: "pharmacy",
                        created_by: pharmacyId,
                        content: message,
                        url: '',
                        for_portal_user: medicineResult.insuranceId,
                        notitype: 'New Claim',
                        // appointmentId: null,
                        claimObjectId: claimObjectId,
                        claimId: medicineResult.claimId
                    }
                    console.log(param, "check all params");
                    await notification(param)
                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { for_portal_user: pharmacyId, _id: claimObjectId },
                        {
                            $set: {
                                claimComplete: true,
                                healthPlanId: subscriberDetails.body.plan,
                                status: "pending",

                            }
                        },
                        { upsert: true, new: true }
                    ).exec();
                }
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: "successfully added e-signature",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add e-signature",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimList(req, res) {
        const {
            status,
            pharmacyIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        console.log(req.query, "req.query123");
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }



            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicine",
                    requestType: "pre-auth"
                }
            } else {
                if (status == "AssociationGroup") {
                    console.log("check inside cosole");
                    filter = {
                        for_portal_user: { $in: objectIdArray },
                        claimType: "medicine",
                    }
                }
                else {
                    filter = {
                        status,
                        for_portal_user: { $in: objectIdArray },
                        claimType: "medicine",
                        requestType: "medical-products"
                    }
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            console.log(filter, "data filter");

            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = [];
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                console.log(subscriberId, "log id");
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }
                console.log(result[index], "result[index]");
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
  if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }
                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async medicineClaimListDoctor(req, res) {
        const {
            status,
            createdByIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        console.log(req.query, "900000000000000000");
        try {
            var sort = req.query.sort
            var pharmacyId = createdByIds.split(',')
            let filter

            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicalConsultation",
                    requestType: "pre-auth",
                    // claimComplete: true,
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicalConsultation",
                    // requestType: "medical-consultation",
                    requestType: "medical-consultation",
                    // claimComplete: true,
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails?.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                 if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));
            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimListDoctorHospitalization(req, res) {
        const {
            status,
            createdByIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        console.log(req.query, "900000000000000000");
        try {
            var sort = req.query.sort
            var pharmacyId = createdByIds.split(',')
            let filter

            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    claimComplete: true,
                    // hospitalName: prescriberCenterInfo.hospitalCenter,
                    requestType: {
                        $in: ["Hospitalization Statement", "pre-auth", "Hospitalization Extention"]
                    }
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    requestType: "Hospitalization Final Claim",
                    // hospitalName: prescriberCenterInfo.hospitalCenter,
                    claimComplete: true
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            filter["prescriberCenterInfo.hospitalCenter"] = req.query.hospitalName;
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);
            const headers = {
                'Authorization': req.headers['authorization']
            }

            console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                const deliverId = result[index].deliverCenterInfo.deliverCenter;
                console.log(deliverId, "check deliverId");
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails?.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                let doctorDetails;
                try {
                    doctorDetails = await httpService.getStaging('hospital-doctor/getAllDoctorData', { for_portal_user: deliverId }, headers, 'hospitalServiceUrl');
                    console.log(doctorDetails, "doctorDetails123");
                } catch (err) {
                    console.log(err, "878erri")
                    doctorDetails = ""
                    // sendResponse(req, res, 500, {
                    //     status: false,
                    //     data: err,
                    //     message: "failed to get medicine claim list",
                    //     errorCode: "INTERNAL_SERVER_ERROR",
                    // });
                }

                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                result[index].doctorDetails = doctorDetails?.data[0]?.full_name
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, claim_type: result[index].requestType, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter, doctor_name: result[index].doctorDetails,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name:patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })

            }
            console.log(result, "resultresult");
            let exportdata = array.map(obj => Object.values(obj));


            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimListHospitalclaim(req, res) {
        const {
            status,
            createdByIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        console.log(req.query, "900000000000000000");
        try {
            var sort = req.query.sort
            var pharmacyId = createdByIds.split(',')
            let filter

            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    requestType: "hospital-claim"
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");

            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails?.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

            }
            console.log(result, "resultresult");


            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimListHospitalclaimExtensionFinal(req, res) {
        const {
            status,
            createdByIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        console.log(req.query, "900000000000000000");
        try {
            var sort = req.query.sort
            var pharmacyId = createdByIds.split(',')
            let filter

            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    requestType: {
                        $in: ["Hospitalization Statement", "pre-auth", "Hospitalization Extention"]
                    }
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "hospitalization",
                    requestType: "Hospitalization Final Claim"
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails?.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })

            }
            console.log(result, "resultresult");

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async hospitalizationClaimListHospitalclaimAllList(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            status,
            limit,
            page,
            claimType,
            requestType
        } = req.query
        console.log(req.query, "99999999999999");

        try {
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("33333333333333333");
                    // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    let filterData = {
                        "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                        "mediclaimcommoninfosData.claimComplete": true,
                        "mediclaimcommoninfosData.claimType": claimType,
                        "mediclaimcommoninfosData.requestType": {
                            $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                        }
                    };
                    console.log(filterData, "filterdata");
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        }
                        ,
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }


                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claim Staff data check555");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)


                } else {
                    console.log("88888888888888");
                    // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    let filterData = {
                        "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                        "mediclaimcommoninfosData.claimComplete": true,
                        "mediclaimcommoninfosData.claimType": claimType,
                        "mediclaimcommoninfosData.requestType": {
                            $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                        }
                    };
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }

                    ]

                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                }
            } else {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("66666666666");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": status };
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        }
                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                } else {

                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": status };
                    // console.log(filterData, "filterDatafilterData");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },

                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },



                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    // console.log(claimStaffData, "claimStaffData data");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                    console.log(result, "check rrrrr");
                }

            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result
                },
                message: "successfully get medicine claim list 5555",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async hospitalizationClaimListHospitalclaimAllListFinalExtension(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            status,
            limit,
            page,
            claimType,
            requestType
        } = req.query
        console.log(req.query, "99999999999999");

        try {
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("33333333333333333");
                    // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    let filterData = {
                        "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                        "mediclaimcommoninfosData.claimComplete": true,
                        "mediclaimcommoninfosData.claimType": claimType,
                        "mediclaimcommoninfosData.requestType": {
                            $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                        }
                    };
                    console.log(filterData, "filterdata");
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        }
                        ,
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }


                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claim Staff data check555");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)


                } else {
                    console.log("88888888888888");
                    // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    let filterData = {
                        "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                        "mediclaimcommoninfosData.claimComplete": true,
                        "mediclaimcommoninfosData.claimType": claimType,
                        "mediclaimcommoninfosData.requestType": {
                            $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                        }
                    };
                    console.log(filterData, "filterDatafilterData123");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }

                    ]
                    console.log(arrayData, "arrayData123");
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                }
            } else {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("66666666666");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": status };
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        }
                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                } else {

                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": status };
                    console.log(filterData, "filterDatafilterData");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },

                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },



                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claimStaffData data");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                    console.log(result, "check rrrrr");
                }

            }
            var array = [];

            for (let index = 0; index < result.length; index++) {
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''


                if (result[index].mediclaimcommoninfosData.resubmit && result[index].mediclaimcommoninfosData.resubmit.length > 0) {
                    result[index].mediclaimcommoninfosData.resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
                
                if (result[index].mediclaimcommoninfosData.insurerType == "secondaryInsure") {
                    result[index].mediclaimcommoninfosData?.secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].mediclaimcommoninfosData?.primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }


                array.push({
                    status: result[index].mediclaimcommoninfosData?.status,
                    date: result[index].createdAt,
                    claim_type: result[index].mediclaimcommoninfosData?.created_by,
                    claim_id: result[index].mediclaimcommoninfosData?.claimId,
                    prescriber_center: result[index].mediclaimcommoninfosData?.prescriberCenterInfo
                        ?.prescriberCenter,
                    providing_centre: result[index].mediclaimcommoninfosData.deliverCenterInfo
                        ?.deliverFirstName,
                    insurance_holder: insurance_holder
                    ,
                    insurance_id: insurance_id,
                    patient_name: patient,
                    reimbursment_rate: result[index].mediclaimcommoninfosData?.reimbursmentRate,
                    paid_by_patient: result[index].mediclaimcommoninfosData?.totalCoPayment,
                    request_amount: result[index].mediclaimcommoninfosData?.totalRequestedAmount,
                    total_amount: result[index].mediclaimcommoninfosData?.totalCostOfAllMedicine,
                    approved_amount: result[index].mediclaimcommoninfosData?.totalApprovedAmount,
                    resubmitReason: result[index].mediclaimcommoninfosData.resubmitReason
                })
            }
            let exportdata = array.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list 5555",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async medicineClaimListpatient(req, res) {
        const {
            status,
            patientId,
            limit,
            page
        } = req.query
        try {


            let filter

            if (status == "") {
                filter = {
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: "medicine",
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: "medicine",
                    requestType: "medical-products"
                }
            }
            console.log(filter, "check filter");

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();

            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = [];
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details.insurance_id
                if (result[index]?.deliverCenterInfo?.deliverCenter) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details',
                        { pharmacyIDs: result[index]?.deliverCenterInfo?.deliverCenter }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0]?.name
                } else {
                    result[index].pharmacy_name = "";

                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }


            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "eoror check");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimListForAssociationGroup(req, res) {
        const {
            pharmacyIds,
            limit,
            page,
            monthly,
            from,
            to
        } = req.body
        try {
            var idsArray = '';
            if (pharmacyIds.length > 0) {
                idsArray = pharmacyIds.map(id => mongoose.Types.ObjectId(id))
            }
            var filter = {};
            if (idsArray != '') {
                filter[for_portal_user]
            }
            const result = await medicineClaimCommonInfo.find(
                {
                    for_portal_user: { $in: idsArray }
                })
                .populate({
                    path: "for_portal_user",
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await medicineClaimCommonInfo.countDocuments({ for_portal_user: { $in: pharmacyIds } })
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimListInsurance(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            status,
            limit,
            page
        } = req.query

        try {
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);

            } else {
                sortingarray['createdAt'] = 1
            }
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("inside888");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" };
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        }
                        ,
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }


                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claim Staff data check");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)


                } else {
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" };
                    // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }

                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                }
            } else {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("inside88811");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": status };
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        }
                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                } else {

                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": status };
                    console.log(filterData, "filterDatafilterData");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },

                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },



                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claimStaffData data");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                    console.log(result, "check rrrrr");
                }

            }
            var array = [];

            for (let index = 0; index < result.length; index++) {
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''


                if (result[index].mediclaimcommoninfosData.resubmit && result[index].mediclaimcommoninfosData.resubmit.length > 0) {
                    result[index].mediclaimcommoninfosData.resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
                
                if (result[index].mediclaimcommoninfosData.insurerType == "secondaryInsure") {
                    result[index].mediclaimcommoninfosData?.secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].mediclaimcommoninfosData?.primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }


                array.push({
                    status: result[index].mediclaimcommoninfosData?.status,
                    date: result[index].createdAt,
                    make_claim: result[index].mediclaimcommoninfosData?.created_by,
                    claim_id: result[index].mediclaimcommoninfosData?.claimId,
                    prescriber_center: result[index].mediclaimcommoninfosData.prescriberCenterInfo.prescriberCenter,
                    providing_centre: result[index].mediclaimcommoninfosData.deliverCenterInfo
                        ?.deliverFirstName,
                    insurance_holder:insurance_holder
                    ,
                    insurance_id:insurance_id,
                    patient_name:patient,
                    reimbursment_rate: result[index].mediclaimcommoninfosData?.reimbursmentRate,
                    paid_by_patient: result[index].mediclaimcommoninfosData?.totalCoPayment,
                    request_amount: result[index].mediclaimcommoninfosData?.totalRequestedAmount,
                    total_amount: result[index].mediclaimcommoninfosData?.totalCostOfAllMedicine,
                    approved_amount: result[index].mediclaimcommoninfosData?.totalApprovedAmount,
                    resubmitReason: output
                })
            }
            let exportdata = array.map(obj => Object.values(obj));

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }




    async medicineConsultationListInsurance(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            status,
            limit,
            page,
            claimType,
            requestType
        } = req.query
        console.log(req.query, "99999999999999");

        try {
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("33333333333333333");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    console.log(filterData, "filterdata");
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        }
                        ,
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }


                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claim Staff data check555");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)


                } else {
                    console.log("88888888888888");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }

                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                }
            } else {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("66666666666");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": status };
                    console.log("66666666666", filterData);

                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        }
                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)

                    count = claimStaffData.length
                    console.log("66666666666", claimStaffData.length);

                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                } else {

                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": status };
                    console.log(filterData, "filterDatafilterData");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },

                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },



                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claimStaffData data");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                    console.log(result, "check rrrrr");
                }

            }

            var array = [];

            for (let index = 0; index < result.length; index++) {
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''


                if (result[index].mediclaimcommoninfosData.resubmit && result[index].mediclaimcommoninfosData.resubmit.length > 0) {
                    result[index].mediclaimcommoninfosData.resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
                
                if (result[index].mediclaimcommoninfosData.insurerType == "secondaryInsure") {
                    result[index].mediclaimcommoninfosData?.secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].mediclaimcommoninfosData?.primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }


                console.log("result[index].mediclaimcommoninfosData.resubmitReason ", output)

                array.push({
                    status: result[index].mediclaimcommoninfosData?.status,
                    date: result[index].createdAt,
                    make_claim: result[index].mediclaimcommoninfosData?.created_by,
                    claim_id: result[index].mediclaimcommoninfosData?.claimId,
                    prescriber_center: result[index].mediclaimcommoninfosData.prescriberCenterInfo.prescriberCenter,
                    providing_centre: result[index].mediclaimcommoninfosData.deliverCenterInfo
                        ?.deliverFirstName,
                    insurance_holder: insurance_holder
                    ,
                    insurance_id: insurance_id,
                    patient_name: patient,
                    reimbursment_rate: result[index].mediclaimcommoninfosData?.reimbursmentRate,
                    paid_by_patient: result[index].mediclaimcommoninfosData?.totalCoPayment,
                    request_amount: result[index].mediclaimcommoninfosData?.totalRequestedAmount,
                    total_amount: result[index].mediclaimcommoninfosData?.totalCostOfAllMedicine,
                    approved_amount: result[index].mediclaimcommoninfosData?.totalApprovedAmount,
                    resubmitReason: output
                })
            }
            let exportdata = array.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list 5555",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async appointmentClaimListInsuranceAdminAll(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            status,
            limit,
            page,
            claimType,
            requestType
        } = req.query
        console.log(req.query, "99999999999999");

        try {
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("33333333333333333");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    console.log(filterData, "filterdata");
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        }
                        ,
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }


                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claim Staff data check555");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)


                } else {
                    console.log("88888888888888");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                    // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },
                        {
                            $lookup: {
                                from: "staffinfos",
                                localField: "mediclaimcommoninfosData.resubmit.resubmittedBy",
                                foreignField: "for_portal_user",
                                as: "resubmitUsers"
                            }
                        },
                        {
                            $addFields: {
                                "mediclaimcommoninfosData.resubmit.resubmitUsers": "$resubmitUsers"
                            }
                        },
                        {
                            $project: {
                                "resubmitUsers": 0
                            }
                        }

                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                }
            } else {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    console.log("66666666666");
                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": status };
                    var arrayData = [
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },
                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        }
                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                } else {

                    let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": status };
                    console.log(filterData, "filterDatafilterData");
                    let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    var arrayData = [

                        {
                            $match: filter
                        },
                        {
                            $lookup: {
                                from: "mediclaimcommoninfos",
                                localField: "claim_object_id",
                                foreignField: "_id",
                                as: "mediclaimcommoninfosData",
                            }
                        },
                        {
                            $unwind: "$mediclaimcommoninfosData"
                        },

                        {
                            $match: filterData
                        },
                        {
                            $group: {
                                _id: "$claim_object_id",
                                claim_object_id: { $first: '$claim_object_id' },
                                staff_id: { $first: '$staff_id' },
                                staff_role_id: { $first: '$staff_role_id' },
                                isApproved: { $first: '$isApproved' },
                                isView: { $first: '$isView' },
                                createdAt: { $first: '$createdAt' },
                                updatedAt: { $first: '$updatedAt' },
                                mediclaimcommoninfosData: { $first: '$mediclaimcommoninfosData' },

                            }
                        },



                    ]
                    let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                    console.log(claimStaffData, "claimStaffData data");
                    count = claimStaffData.length
                    if (limit != 0) {
                        arrayData.push(
                            {
                                $sort: sortingarray
                            },
                            { $skip: (page - 1) * limit },
                            { $limit: limit * 1 },

                        )


                    }
                    result = await claimStaffDetails.aggregate(arrayData)
                    console.log(result, "check rrrrr");
                }

            }
            var array = [];

            for (let index = 0; index < result.length; index++) {
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''


                if (result[index].mediclaimcommoninfosData.resubmit && result[index].mediclaimcommoninfosData.resubmit.length > 0) {
                    result[index].mediclaimcommoninfosData.resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }
                
                if (result[index].mediclaimcommoninfosData.insurerType == "secondaryInsure") {
                    result[index].mediclaimcommoninfosData?.secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].mediclaimcommoninfosData?.primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }
                array.push({
                    status: result[index].mediclaimcommoninfosData?.status,
                    date: result[index].createdAt,
                    make_claim: result[index].mediclaimcommoninfosData?.created_by,
                    claim_id: result[index].mediclaimcommoninfosData?.claimId,
                    prescriber_center: result[index].mediclaimcommoninfosData.prescriberCenterInfo.prescriberCenter,
                    providing_centre: result[index].mediclaimcommoninfosData.deliverCenterInfo
                        ?.deliverFirstName,
                    insurance_holder: insurance_holder
                    ,
                    insurance_id: insurance_id,
                    patient_name: patient,
                    reimbursment_rate: result[index].mediclaimcommoninfosData?.reimbursmentRate,
                    paid_by_patient: result[index].mediclaimcommoninfosData?.totalCoPayment,
                    request_amount: result[index].mediclaimcommoninfosData?.totalRequestedAmount,
                    total_amount: result[index].mediclaimcommoninfosData?.totalCostOfAllMedicine,
                    approved_amount: result[index].mediclaimcommoninfosData?.totalApprovedAmount,
                    resubmitReason: output
                })
            }
            let exportdata = array.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list 5555",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimListLabImaging(req, res) {
        const {
            status,
            patientId,
            limit,
            page,
            claimType
        } = req.query
        console.log(req.query, "check query");
        try {


            let filter

            if (status == "") {
                filter = {
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: claimType,
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: claimType,
                    requestType: "medical-products"
                }
            }
            console.log(filter, "check filter");

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();

            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body?.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails?.body.subscriber_details?.insurance_id
                if (result[index]?.deliverCenterInfo?.deliverCenter) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details',
                        { pharmacyIDs: result[index]?.deliverCenterInfo?.deliverCenter }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0]?.name
                } else {
                    result[index].pharmacy_name = "";

                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })

            }

            let exportdata = array.map(obj => Object.values(obj));
            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "eoror check");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimListLabImagingAppointment(req, res) {
        const {
            status,
            patientId,
            limit,
            page,
            claimType
        } = req.query
        console.log(req.query, "check query");
        try {


            let filter

            if (status == "") {
                filter = {
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: claimType,
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: mongoose.Types.ObjectId(patientId),
                    claimType: claimType,
                    requestType: "appointment-claim"
                }
            }
            console.log(filter, "check filter");

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();

            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.deliverCenterInfo?.deliverCenter) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details',
                        { pharmacyIDs: result[index]?.deliverCenterInfo?.deliverCenter }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0]?.name
                } else {
                    result[index].pharmacy_name = "";

                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }
            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "eoror check");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineConsultationListInsuranceAdmin(req, res) {
        const {
            status,
            pharmacyIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }



            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicalConsultation",
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicalConsultation",
                    requestType: "medical-consultation"
                }
            }
            console.log(filter, "check filter");

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            // console.log(result, "check result lookup");
            var array = [];
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                console.log(subscriberId, "log id");
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }
                
                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async appointmentClaimListInsuranceAdmin(req, res) {
        const {
            status,
            pharmacyIds,
            insuranceIds,
            claimType,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }



            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: claimType,
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: claimType,
                    requestType: "appointment-claim"
                }
            }
            console.log(filter, "check filter");

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            // console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                console.log(subscriberId, "log id");
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }


                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
               
                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }
               
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineListInsuranceAdmin(req, res) {
        const {
            status,
            pharmacyIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page
        } = req.query
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }



            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicine",
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: "medicine",
                    requestType: "medical-products"
                }
            }
            console.log(filter, "check filter");

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            // console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                console.log(subscriberId, "log id");
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
               
                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }
               
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder:insurance_holder, insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async MakeInsuranceAdminFourPortalList(req, res) {
        const {
            status,
            pharmacyIds,
            insuranceIds,
            fromdate,
            todate,
            limit,
            page,
            claimType
        } = req.query
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }



            // pharmacyId.map(id => mongoose.Types.ObjectId(id))
            /*  const objectIdArray = convertToObjectIdArray(pharmacyId); */
            const ObjectId = mongoose.Types.ObjectId;
            const objectIdArray = pharmacyId.map(id => ObjectId(id));
            console.log(objectIdArray, "log pharmacyId");
            if (status == "") {
                filter = {
                    for_portal_user: { $in: objectIdArray },
                    claimType: claimType,
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: objectIdArray },
                    claimType: claimType,
                    requestType: "medical-products"
                }
            }
            console.log(filter, "check filter");

            if (insuranceIds != "" && insuranceIds != undefined) {

                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                const ObjectId = mongoose.Types.ObjectId;
                const objectIdArray = allInsId.map(id => ObjectId(id));
                console.log(objectIdArray, "log pharmacyId");
                filter['insuranceId'] = { $in: objectIdArray }
            }
            console.log(fromdate, "fromdate,");
            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    console.log("fiest", typeof (fromdate));
                    filter['createdAt'] = { $gte: new Date(fromdate), $lte: new Date(todate) }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: new Date(fromdate) }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: new Date(todate) }
                }
            }

            // const result = await medicineClaimCommonInfo.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            console.log(filter, "data filter");
            const limit1 = parseInt(limit, 10);
            let result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * limit1
                },
                {
                    $limit: limit1
                },
                {
                    $lookup: {
                        from: "staffinfos",
                        localField: "resubmit.resubmittedBy",
                        foreignField: "for_portal_user",
                        as: "resubmitUsers"
                    }
                },
                {
                    $addFields: {
                        "resubmit.resubmitUsers": "$resubmitUsers"
                    }
                },
                {
                    $project: {
                        "resubmitUsers": 0
                    }
                }

            ]);


            // console.log(result, "check result lookup");
            var array = []
            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                // const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                const insuranceDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { company_name: 1 })
                result[index].insurance_company_name = insuranceDetails.company_name

                const subscriberId = result[index].patientId;
                console.log(subscriberId, "log id");
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details?.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details?.insurance_id
                if (result[index]?.pharmacy_id) {
                    const pharmacyName = await httpService.getStaging('pharmacy/get-pharmacy-details', { pharmacyIDs: result[index]?.pharmacy_id }, {}, 'pharmacyServiceUrl');
                    // result[index].pharmacy_name = pharmacyName.pharmacy_name
                    // console.log(pharmacyName, "pharmacyName");
                    // const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name :1})
                    result[index].pharmacy_name = pharmacyName?.body[0].name
                }
                else {
                    result[index].pharmacy_name = ""
                }

                let output = ''
                let patient = ''
                let insurance_holder = ''
                let insurance_id = ''

                if (result[index].resubmit && result[index].resubmit && result[index].resubmit.length > 0) {
                    result[index].resubmit.forEach(data => {
                        if (!data.resubmitReason) {
                            output += '-\n';
                        } else {
                            output += `${data.resubmitReason} (${data.resubmitUsers[0].staff_name})\n`;
                        }
                    });
                }

                let rejectamount = result[index].totalRequestedAmount - result[index].totalApprovedAmount
               
                if (result[index].insurerType == "secondaryInsure") {
                    result[index].secondaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })

                } else {
                    result[index].primaryInsuredIdentity.forEach((ele) => {
                        if (ele.fieldName == 'First Name') {
                            patient += ele?.fieldValue
                        } else {
                            patient += ""
                        }

                        if (ele.fieldName == 'Insurance ID') {
                            insurance_id += ele?.fieldValue
                        } else {
                            insurance_id += ""
                        }

                        if (ele.fieldName == 'Insurance Holder Name') {
                            insurance_holder += ele?.fieldValue
                        } else {
                            insurance_holder += ""
                        }
                    })
                }
               
                array.push({
                    status: result[index].status, date: result[index].createdAt, claim_id: result[index].claimId, prescriber_center: result[index].prescriberCenterInfo?.prescriberCenter,
                    insurance_provider: result[index].insurance_company_name, insurance_holder: insurance_holder
                    , insurance_id: insurance_id, patient_name: patient, reimbursment_rate: result[index].reimbursmentRate, total_amount: result[index].totalCostOfAllMedicine, paid_by_patient: result[index].totalCoPayment,
                    approved_amount: result[index].totalApprovedAmount, request_amount: result[index].totalRequestedAmount, reject_amount: rejectamount, resubmit_reason: output
                })
            }

            let exportdata = array.map(obj => Object.values(obj));

            const count = await medicineClaimCommonInfo.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                    exportdata
                },
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimDetailsPharmacy(req, res) {

        const {
            claimId,
        } = req.query
        console.log("SDFJKGJFJJFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        claimId
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },
                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },


                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },

                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },
                {
                    $unwind: {
                        path: "$medicinedetailsonclaims",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "medicinedetailsonclaims.indexNumber": 1
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        patientId: { $first: "$patientId" },
                        ePrescriptionNumber: { $first: "$ePrescriptionNumber" },
                        insuranceId: { $first: "$insuranceId" },
                        pharmacy_id: { $first: "$pharmacy_id" },
                        loggedInPatientId: { $first: "$loggedInPatientId" },
                        pharmacy_name: { $first: "$pharmacy_name" },
                        pre_auth_reclaim: { $first: "$pre_auth_reclaim" },
                        preAuthReclaimId: { $first: "$preAuthReclaimId" },
                        created_by: { $first: "$created_by" },
                        healthPlanId: { $first: "$healthPlanId" },
                        claimType: { $first: "$claimType" },
                        claimNumber: { $first: "$claimNumber" },
                        requestType: { $first: "$requestType" },
                        claimId: { $first: "$claimId" },
                        service: { $first: "$service" },
                        status: { $first: "$status" },
                        deliverCenterInfo: { $first: "$deliverCenterInfo" },
                        totalCoPayment: { $first: "$totalCoPayment" },
                        totalApprovedAmount: { $first: "$totalApprovedAmount" },
                        totalRequestedAmount: { $first: "$totalRequestedAmount" },
                        claimComplete: { $first: "$claimComplete" },
                        totalCostOfAllMedicine: { $first: "$totalCostOfAllMedicine" },
                        is_approved_by_receptionist: { $first: "$is_approved_by_receptionist" },
                        is_approved_by_medical_advisor: { $first: "$is_approved_by_medical_advisor" },
                        is_approved_by_contract_advisor: { $first: "$is_approved_by_contract_advisor" },
                        is_approved_by_cfo: { $first: "$is_approved_by_cfo" },
                        insurance_company_name: { $first: "$insurance_company_name" },
                        subscriber_insurance_id: { $first: "$subscriber_insurance_id" },
                        subscriber_name: { $first: "$subscriber_name" },
                        for_current_insurance_staff: { $first: "$for_current_insurance_staff" },
                        eSignature: { $first: "$eSignature" },
                        primaryInsuredIdentity: { $first: "$primaryInsuredIdentity" },
                        secondaryInsuredIdentity: { $first: "$secondaryInsuredIdentity" },
                        accidentRelatedField: { $first: "$accidentRelatedField" },
                        resubmit: { $first: "$resubmit" },
                        for_added_insurance_staff: { $first: "$for_added_insurance_staff" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                        insurerType: { $first: "$insurerType" },
                        prescriberCenterInfo: { $first: "$prescriberCenterInfo" },
                        reimbursmentRate: { $first: "$reimbursmentRate" },
                        medicineclaimdocs: { $first: "$medicineclaimdocs" },
                        previewtemplate: { $first: "$previewtemplate" },
                        claimStaffData: { $first: "$claimStaffData" },
                        medicinedetailsonclaims: { $push: "$medicinedetailsonclaims" } // Push the sorted array back
                    }
                },
                {
                    $addFields: {
                        medicinedetailsonclaims: "$medicinedetailsonclaims"
                    }
                }

            ])
            console.log("check api ", result[0]);
            if (result[0]?.medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }

            if (result[0]?.previewtemplate != null) {
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            if (result[0]?.eSignature?.signature != "") {
                var signatureurl = result[0]?.eSignature?.signature;
                console.log(signatureurl, "error check");
                if (signatureurl != undefined) {
                    result[0].eSignature.signature_signed_url = await getDocument(signatureurl);

                }

            }
            console.log("result[0]?.deliverCenterInfo?.deliverCenter", result[0]?.deliverCenterInfo?.deliverCenter);
            if (result[0]?.deliverCenterInfo?.deliverCenter) {
                const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Get medicine claim details",
                errorCode: null,
            });
            // }


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimDetailswithHospitalData(req, res) {

        const {
            claimId,
        } = req.query
        console.log("SDFJKGJFJJFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        claimId
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },

                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },


                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },

                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },



                {
                    $unwind: {
                        path: "$medicinedetailsonclaims",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "hospitalservicedatas",
                        localField: "_id",
                        foreignField: "claimObjectId",
                        as: "hospitalservicedatas",
                    }
                },
                {
                    $sort: {
                        "medicinedetailsonclaims.indexNumber": 1
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        patientId: { $first: "$patientId" },
                        ePrescriptionNumber: { $first: "$ePrescriptionNumber" },
                        insuranceId: { $first: "$insuranceId" },
                        pharmacy_id: { $first: "$pharmacy_id" },
                        loggedInPatientId: { $first: "$loggedInPatientId" },
                        pharmacy_name: { $first: "$pharmacy_name" },
                        pre_auth_reclaim: { $first: "$pre_auth_reclaim" },
                        preAuthReclaimId: { $first: "$preAuthReclaimId" },
                        created_by: { $first: "$created_by" },
                        healthPlanId: { $first: "$healthPlanId" },
                        claimType: { $first: "$claimType" },
                        claimNumber: { $first: "$claimNumber" },
                        requestType: { $first: "$requestType" },
                        claimId: { $first: "$claimId" },
                        service: { $first: "$service" },
                        status: { $first: "$status" },
                        deliverCenterInfo: { $first: "$deliverCenterInfo" },
                        totalCoPayment: { $first: "$totalCoPayment" },
                        totalApprovedAmount: { $first: "$totalApprovedAmount" },
                        totalRequestedAmount: { $first: "$totalRequestedAmount" },
                        claimComplete: { $first: "$claimComplete" },
                        totalCostOfAllMedicine: { $first: "$totalCostOfAllMedicine" },
                        is_approved_by_receptionist: { $first: "$is_approved_by_receptionist" },
                        is_approved_by_medical_advisor: { $first: "$is_approved_by_medical_advisor" },
                        is_approved_by_contract_advisor: { $first: "$is_approved_by_contract_advisor" },
                        is_approved_by_cfo: { $first: "$is_approved_by_cfo" },
                        insurance_company_name: { $first: "$insurance_company_name" },
                        subscriber_insurance_id: { $first: "$subscriber_insurance_id" },
                        subscriber_name: { $first: "$subscriber_name" },
                        for_current_insurance_staff: { $first: "$for_current_insurance_staff" },
                        eSignature: { $first: "$eSignature" },
                        primaryInsuredIdentity: { $first: "$primaryInsuredIdentity" },
                        secondaryInsuredIdentity: { $first: "$secondaryInsuredIdentity" },
                        accidentRelatedField: { $first: "$accidentRelatedField" },
                        resubmit: { $first: "$resubmit" },
                        for_added_insurance_staff: { $first: "$for_added_insurance_staff" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                        insurerType: { $first: "$insurerType" },
                        prescriberCenterInfo: { $first: "$prescriberCenterInfo" },
                        reimbursmentRate: { $first: "$reimbursmentRate" },
                        medicineclaimdocs: { $first: "$medicineclaimdocs" },
                        hospitalservicedatas: { $first: "$hospitalservicedatas" },
                        previewtemplate: { $first: "$previewtemplate" },
                        claimStaffData: { $first: "$claimStaffData" },
                        medicinedetailsonclaims: { $push: "$medicinedetailsonclaims" } // Push the sorted array back
                    }
                },
                {
                    $addFields: {
                        medicinedetailsonclaims: "$medicinedetailsonclaims"
                    }
                }

            ])
            console.log("check api ", result[0]);
            if (result[0]?.medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }

            if (result[0]?.previewtemplate != null) {
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            if (result[0]?.eSignature?.signature != "") {
                var signatureurl = result[0]?.eSignature?.signature;
                console.log(signatureurl, "error check");
                if (signatureurl != undefined) {
                    result[0].eSignature.signature_signed_url = await getDocument(signatureurl);

                }

            }
            console.log("result[0]?.deliverCenterInfo?.deliverCenter", result[0]?.deliverCenterInfo?.deliverCenter);
            if (result[0]?.deliverCenterInfo?.deliverCenter) {
                const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Get medicine claim details",
                errorCode: null,
            });
            // }


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimDetailsPharmacyByClaimObjectId(req, res) {

        const {
            claimObjectId,
        } = req.query
        console.log(req.query, "data query");
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(claimObjectId)
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },

                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },


                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },
                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },



            ])
            // console.log(result, "check result object");
            if (result[0].medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }

            if (result[0]?.previewtemplate != null) {
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            if (result[0]?.eSignature?.signature != "") {
                var signatureurl = result[0]?.eSignature?.signature;
                console.log(signatureurl, "error check");
                if (signatureurl != undefined) {
                    result[0].eSignature.signature_signed_url = await getDocument(signatureurl);

                }

            }
            console.log("result[0]?.deliverCenterInfo?.deliverCenter", result[0]?.deliverCenterInfo?.deliverCenter);
            if (result[0]?.deliverCenterInfo?.deliverCenter) {
                const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Get medicine claim details",
                errorCode: null,
            });
            // }


        } catch (error) {
            console.log(error, "log error123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimDetailsPharmacyClaimObjectIdHopitalization(req, res) {

        const {
            claimId,
        } = req.query

        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        claimId
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },
                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },

                            // {
                            //     $lookup: {
                            //         from: "hospitalservicedatas",
                            //         localField: "_id",
                            //         foreignField: "claimObjectId",
                            //         as: "hospitalservicedatas",
                            //     }
                            // },

                            {

                                $addFields: {

                                    staffData: '$hospitalservicedatas'

                                }

                            },

                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },

                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },
                {
                    $unwind: {
                        path: "$medicinedetailsonclaims",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "medicinedetailsonclaims.indexNumber": 1
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        patientId: { $first: "$patientId" },
                        ePrescriptionNumber: { $first: "$ePrescriptionNumber" },
                        insuranceId: { $first: "$insuranceId" },
                        pharmacy_id: { $first: "$pharmacy_id" },
                        loggedInPatientId: { $first: "$loggedInPatientId" },
                        pharmacy_name: { $first: "$pharmacy_name" },
                        pre_auth_reclaim: { $first: "$pre_auth_reclaim" },
                        preAuthReclaimId: { $first: "$preAuthReclaimId" },
                        created_by: { $first: "$created_by" },
                        healthPlanId: { $first: "$healthPlanId" },
                        claimType: { $first: "$claimType" },
                        claimNumber: { $first: "$claimNumber" },
                        requestType: { $first: "$requestType" },
                        claimId: { $first: "$claimId" },
                        service: { $first: "$service" },
                        status: { $first: "$status" },
                        deliverCenterInfo: { $first: "$deliverCenterInfo" },
                        totalCoPayment: { $first: "$totalCoPayment" },
                        totalApprovedAmount: { $first: "$totalApprovedAmount" },
                        totalRequestedAmount: { $first: "$totalRequestedAmount" },
                        claimComplete: { $first: "$claimComplete" },
                        totalCostOfAllMedicine: { $first: "$totalCostOfAllMedicine" },
                        is_approved_by_receptionist: { $first: "$is_approved_by_receptionist" },
                        is_approved_by_medical_advisor: { $first: "$is_approved_by_medical_advisor" },
                        is_approved_by_contract_advisor: { $first: "$is_approved_by_contract_advisor" },
                        is_approved_by_cfo: { $first: "$is_approved_by_cfo" },
                        insurance_company_name: { $first: "$insurance_company_name" },
                        subscriber_insurance_id: { $first: "$subscriber_insurance_id" },
                        subscriber_name: { $first: "$subscriber_name" },
                        for_current_insurance_staff: { $first: "$for_current_insurance_staff" },
                        eSignature: { $first: "$eSignature" },
                        primaryInsuredIdentity: { $first: "$primaryInsuredIdentity" },
                        secondaryInsuredIdentity: { $first: "$secondaryInsuredIdentity" },
                        accidentRelatedField: { $first: "$accidentRelatedField" },
                        resubmit: { $first: "$resubmit" },
                        for_added_insurance_staff: { $first: "$for_added_insurance_staff" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                        insurerType: { $first: "$insurerType" },
                        prescriberCenterInfo: { $first: "$prescriberCenterInfo" },
                        reimbursmentRate: { $first: "$reimbursmentRate" },
                        medicineclaimdocs: { $first: "$medicineclaimdocs" },
                        previewtemplate: { $first: "$previewtemplate" },
                        claimStaffData: { $first: "$claimStaffData" },
                        // hospitalservicedatas: { $first: "$hospitalservicedatas" },
                        medicinedetailsonclaims: { $push: "$medicinedetailsonclaims" } // Push the sorted array back
                    }
                },
                {
                    $addFields: {
                        medicinedetailsonclaims: "$medicinedetailsonclaims"
                    }
                }

            ])
            console.log("check api ", result[0]);
            if (result[0]?.medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }

            if (result[0]?.previewtemplate != null) {
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            if (result[0]?.eSignature?.signature != "") {
                var signatureurl = result[0]?.eSignature?.signature;
                console.log(signatureurl, "error check");
                if (signatureurl != undefined) {
                    result[0].eSignature.signature_signed_url = await getDocument(signatureurl);

                }

            }
            console.log("result[0]?.deliverCenterInfo?.deliverCenter", result[0]?.deliverCenterInfo?.deliverCenter);
            if (result[0]?.deliverCenterInfo?.deliverCenter) {
                const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Get medicine claim details",
                errorCode: null,
            });
            // }


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimDetailsPharmacyByClaimObjectIdHopitalization(req, res) {

        const {
            claimObjectId,
        } = req.query
        console.log(req.query, "data query");
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(claimObjectId)
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },
                // {
                //     $lookup: {
                //         from: "hospitalservicedatas",
                //         localField: "_id",
                //         foreignField: "claimObjectId",
                //         as: "hospitalservicedatas",
                //     }
                // },

                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },


                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },
                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },


                {
                    $lookup: {
                        from: "hospitalservicedatas",
                        localField: "_id",
                        foreignField: "claimObjectId",
                        as: "hospitalservicedatas",
                    }
                },



            ])
            // console.log(result, "check result object");
            if (result[0].medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }
            console.log(result, "check log reulst 000");

            if (result[0]?.previewtemplate != null) {
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            if (result[0]?.eSignature?.signature != "") {
                var signatureurl = result[0]?.eSignature?.signature;
                console.log(signatureurl, "error check");
                if (signatureurl != undefined) {
                    result[0].eSignature.signature_signed_url = await getDocument(signatureurl);

                }

            }
            console.log("result[0]?.deliverCenterInfo?.deliverCenter", result[0]?.deliverCenterInfo?.deliverCenter);
            if (result[0]?.deliverCenterInfo?.deliverCenter) {
                const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyIDs: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Get medicine claim details",
                errorCode: null,
            });
            // }


        } catch (error) {
            console.log(error, "log error123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimDetailsInsurance(req, res) {
        // console.log("check log phayrmacy")
        const {
            claimId,
            insuranceStaffId,
            insuranceStaffRole
        } = req.query
        var insuranceStaffList = [
            {
                "insurance_staff_id": insuranceStaffId
            }
        ]
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        claimId
                    }
                },
                {
                    $lookup: {
                        from: "medicineclaimdocs",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicineclaimdocs",
                    }
                },
                {
                    $lookup: {
                        from: "hospitalservicedatas",
                        localField: "_id",
                        foreignField: "claimObjectId",
                        as: "hospitalservicedatas",
                    }
                },
                {
                    $lookup: {
                        from: "claimstaffdetails",
                        let: { claimObjectId: '$_id' },//
                        // localField: "_id",
                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$claim_object_id', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "roles",
                                    localField: "staff_role_id",
                                    foreignField: "_id",
                                    as: "roleInfo",
                                }
                            },
                            {
                                $unwind: "$roleInfo"
                            },

                            {
                                $addFields: {
                                    "roleInfoData": '$roleInfo.name'

                                }
                            },
                            {
                                $project: {
                                    roleInfo: 0
                                }
                            },
                        ],

                        // foreignField: "claim_object_id",
                        as: "claimStaffData",
                    }
                },

                {

                    $lookup: {

                        from: 'medicinedetailsonclaims',

                        let: { claimObjectId: '$_id' },//claimObject id aggreate document key

                        pipeline: [

                            {

                                $match: {

                                    $expr: { $eq: ['$for_medicine_claim', '$$claimObjectId'] }

                                }

                            },

                            {
                                $lookup: {
                                    from: "claimmedicineapprovebystaffs",
                                    localField: "_id",
                                    foreignField: "medicine_id",
                                    as: "claimmedicineapprovebystaffsData",
                                }
                            },



                            {

                                $addFields: {

                                    staffData: '$claimmedicineapprovebystaffsData'

                                }

                            },


                            {
                                $lookup: {
                                    from: "staffinfos",
                                    localField: "staffData.staff_id",
                                    foreignField: "for_portal_user",
                                    as: "staffinfo",
                                }
                            },
                            // {
                            //     $unwind: "$staffinfo"
                            // },

                            {

                                $addFields: {
                                    'staffData': {
                                        $map: {
                                            input: '$staffData',
                                            as: 'staffDataItem',
                                            in: {
                                                $mergeObjects: [
                                                    '$$staffDataItem',
                                                    {
                                                        staffadmininfo: {
                                                            $filter: {
                                                                input: '$staffinfo',
                                                                as: 'staffinfoItem',
                                                                cond: {
                                                                    $eq: ['$$staffinfoItem.for_portal_user', '$$staffDataItem.staff_id']
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            },

                            {
                                $project: {
                                    claimmedicineapprovebystaffsData: 0,
                                    staffinfo: 0,
                                    //roleInfodata: 0
                                }
                            },
                        ],

                        as: 'medicinedetailsonclaims'

                    }

                },
                {
                    $unwind: {
                        path: "$medicinedetailsonclaims",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "medicinedetailsonclaims.indexNumber": 1
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        patientId: { $first: "$patientId" },
                        ePrescriptionNumber: { $first: "$ePrescriptionNumber" },
                        insuranceId: { $first: "$insuranceId" },
                        pharmacy_id: { $first: "$pharmacy_id" },
                        loggedInPatientId: { $first: "$loggedInPatientId" },
                        pharmacy_name: { $first: "$pharmacy_name" },
                        pre_auth_reclaim: { $first: "$pre_auth_reclaim" },
                        preAuthReclaimId: { $first: "$preAuthReclaimId" },
                        created_by: { $first: "$created_by" },
                        healthPlanId: { $first: "$healthPlanId" },
                        claimType: { $first: "$claimType" },
                        claimNumber: { $first: "$claimNumber" },
                        requestType: { $first: "$requestType" },
                        claimId: { $first: "$claimId" },
                        service: { $first: "$service" },
                        status: { $first: "$status" },
                        deliverCenterInfo: { $first: "$deliverCenterInfo" },
                        totalCoPayment: { $first: "$totalCoPayment" },
                        totalApprovedAmount: { $first: "$totalApprovedAmount" },
                        totalRequestedAmount: { $first: "$totalRequestedAmount" },
                        claimComplete: { $first: "$claimComplete" },
                        totalCostOfAllMedicine: { $first: "$totalCostOfAllMedicine" },
                        is_approved_by_receptionist: { $first: "$is_approved_by_receptionist" },
                        is_approved_by_medical_advisor: { $first: "$is_approved_by_medical_advisor" },
                        is_approved_by_contract_advisor: { $first: "$is_approved_by_contract_advisor" },
                        is_approved_by_cfo: { $first: "$is_approved_by_cfo" },
                        insurance_company_name: { $first: "$insurance_company_name" },
                        subscriber_insurance_id: { $first: "$subscriber_insurance_id" },
                        subscriber_name: { $first: "$subscriber_name" },
                        for_current_insurance_staff: { $first: "$for_current_insurance_staff" },
                        eSignature: { $first: "$eSignature" },
                        primaryInsuredIdentity: { $first: "$primaryInsuredIdentity" },
                        secondaryInsuredIdentity: { $first: "$secondaryInsuredIdentity" },
                        accidentRelatedField: { $first: "$accidentRelatedField" },
                        resubmit: { $first: "$resubmit" },
                        for_added_insurance_staff: { $first: "$for_added_insurance_staff" },
                        for_current_insurance_staff_role: { $first: "$for_current_insurance_staff_role" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                        insurerType: { $first: "$insurerType" },
                        prescriberCenterInfo: { $first: "$prescriberCenterInfo" },
                        reimbursmentRate: { $first: "$reimbursmentRate" },
                        medicineclaimdocs: { $first: "$medicineclaimdocs" },
                        hospitalservicedatas: { $first: "$hospitalservicedatas" },
                        claimStaffData: { $first: "$claimStaffData" },
                        medicinedetailsonclaims: { $push: "$medicinedetailsonclaims" }, // Push the sorted array back
                        plan_validity: { $first: "$plan_validity" },
                        previewtemplate: { $first: "$previewtemplate" }
                    }
                },
                {
                    $addFields: {
                        medicinedetailsonclaims: "$medicinedetailsonclaims"
                    }
                }


            ])
            if (result[0].medicineclaimdocs.length > 0) {
                var claimDocs = result[0].medicineclaimdocs
                for (let index = 0; index < claimDocs.length; index++) {
                    claimDocs[index].document_signed_url = await getDocument(claimDocs[index].document_url)
                }
            }

            if (result[0]?.previewtemplate != null) {
                console.log();
                var claimDocs = result[0].previewtemplate;

                result[0].previewtemplateUrl = await getDocument(claimDocs);

            }
            console.log(result[0], "result[0] check");
            const deliverCenterInfo = await httpService.getStaging('pharmacy/pharmacy-details', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'pharmacyServiceUrl');
            if (deliverCenterInfo.data.backGround.pharmacy_name != undefined) {
                result[0].deliverCenterName = deliverCenterInfo.data.backGround.pharmacy_name;
            }

            const deliverCenterInfofourportal = await httpService.getStaging('labimagingdentaloptical/fourtportalDetails', { pharmacyId: result[0].deliverCenterInfo.deliverCenter }, headers, 'labimagingdentalopticalServiceUrl');
            console.log(deliverCenterInfofourportal, "deliverCenterInfofourportal");
            console.log(deliverCenterInfofourportal?.data?.full_name, "deliverCenterInfofourportal.full_name");
            if (deliverCenterInfofourportal?.data?.full_name != undefined) {
                result[0].deliverCenterName = deliverCenterInfofourportal?.data?.full_name
                console.log(result[0].deliverCenterName, " result[0].deliverCenterName");
            }
            console.log(deliverCenterInfofourportal, "deliveryDetailsdeliveryDetailsdeliveryDetails123");
            const subscriberDetails = await subscriber.findOne({ _id: result[0]?.patientId })
            var primarysubscriberDetails = {}
            var primaryplan = {}
            var primaryplanService = {}
            var primaryplanExclusion = {}
            if (subscriberDetails?.subscription_for == "Secondary") {
                console.log(subscriberDetails?._id, "subscriberDetails?._id");
                let id = String(subscriberDetails?._id);
                console.log(id, "subscriberDetails?._id");

                primarysubscriberDetails = await subscriber.findOne({ secondary_subscriber: mongoose.Types.ObjectId(id) })
                console.log("primarysubscriberDetails-----", primarysubscriberDetails)
                let primaryhealthId = primarysubscriberDetails?.health_plan_for;

                primaryplan = await Plan.findOne({ _id: primaryhealthId/* subscriberDetails?.health_plan_for */ })
                primaryplanService = await PlanServiceNew.find({ for_plan: primaryhealthId/* subscriberDetails?.health_plan_for */ })
                primaryplanExclusion = await PlanExclusionNew.find({ for_plan: primaryhealthId/* subscriberDetails?.health_plan_for */ })
            } else {
                primaryplan = await Plan.findOne({ _id: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })
                primaryplanService = await PlanServiceNew.find({ for_plan: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })
                primaryplanExclusion = await PlanExclusionNew.find({ for_plan: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })
            }

            const plan = await Plan.findOne({ _id: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })
            const planService = await PlanServiceNew.find({ for_plan: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })
            const planExclusion = await PlanExclusionNew.find({ for_plan: result[0].healthPlanId/* subscriberDetails?.health_plan_for */ })

            // const plan = await Plan.findOne({ _id: subscriberDetails?.health_plan_for })
            // const planService = await PlanServiceNew.find({ for_plan: subscriberDetails?.health_plan_for })
            // const planExclusion = await PlanExclusionNew.find({ for_plan: subscriberDetails?.health_plan_for })


            const previousClaim = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        patientId: { $eq: result[0].patientId },
                        status: "approved"
                        // $nor: [{ is_approved_by_cfo: null }]
                    }
                },

            ])

            for (let index = 0; index < previousClaim.length; index++) {
                const element = previousClaim[index];
                // const subscriberData = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: element.patientId }, headers, 'insuranceServiceUrl');
                const subscriberData = await subscriber.findOne({ _id: element?.patientId })
                element.plan_name = subscriberData?.body?.plan?.name
            }


            var nextRoleArray = []
            var updatedClaim

            const checkViewTrue = await claimStaffDetails.find({ claim_object_id: result[0]._id, isView: true, staff_id: insuranceStaffId, staff_role_id: result[0].for_current_insurance_staff_role }).count();
            console.log(checkViewTrue, "checkViewTruecheckViewTrue");
            console.log(insuranceStaffRole, "lkjlkj");
            if (insuranceStaffRole != "INSURANCE_ADMIN") {
                if (result[0].for_current_insurance_staff == null) {
                    let isuranceIds = insuranceStaffRole.split(",");
                    let matchedValue = isuranceIds.filter(e => e == result[0].for_current_insurance_staff_role);
                    console.log(matchedValue, "matchedValue")
                    if (matchedValue.length > 0) {
                        if (checkViewTrue == 0) {
                            console.log("chekcViewTrue", { staff_id: insuranceStaffId, claim_object_id: result[0]._id });

                            updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                                { claimId },
                                {
                                    $set: {
                                        for_current_insurance_staff: insuranceStaffId,
                                        // for_current_insurance_staff_role: insuranceStaffRole,
                                    }
                                },
                                { new: true }
                            )
                        }
                    }
                    sendResponse(req, res, 200, {
                        status: true,
                        data: {
                            result: result[0],
                            subscriberDetails: {
                                subscriber_type: subscriberDetails?.subscriber_type,
                                subscription_for: subscriberDetails?.subscription_for,
                                health_plan: plan,
                                plan_service: planService,
                                plan_exclusion: planExclusion,
                                primary_health_plan: primaryplan,
                                primary_plan_service: primaryplanService,
                                primary_plan_exclusion: primaryplanExclusion,
                                subscriberDetails: subscriberDetails,
                                primarysubscriberDetails: primarysubscriberDetails

                            },
                            previousClaim
                        },
                        message: "Get medicine claim details",
                        errorCode: null,
                    });
                } else {
                    if (result[0].for_current_insurance_staff == insuranceStaffId) {
                        sendResponse(req, res, 200, {
                            status: true,
                            data: {
                                result: result[0],
                                subscriberDetails: {
                                    subscriber_type: subscriberDetails?.subscriber_type,
                                    subscription_for: subscriberDetails?.subscription_for,
                                    health_plan: plan,
                                    plan_service: planService,
                                    plan_exclusion: planExclusion,
                                    primary_health_plan: primaryplan,
                                    primary_plan_service: primaryplanService,
                                    primary_plan_exclusion: primaryplanExclusion,
                                    subscriberDetails: subscriberDetails,
                                    primarysubscriberDetails: primarysubscriberDetails


                                },
                                previousClaim
                            },
                            message: "Get medicine claim details",
                            errorCode: null,
                        });
                    }
                    const insuranceStaffDetails = await httpService.getStaging('insurance/get-staff-details', { staff_id: result[0].for_current_insurance_staff }, headers, 'insuranceServiceUrl');
                    console.log(insuranceStaffDetails.body?.staffData, "insuranceStaffDetails");
                    let InsurnaceDetailsRole = insuranceStaffDetails.body?.staffData.role;
                    var assignedStaffName = insuranceStaffDetails.body?.staffData?.staff_name

                    console.log(assignedStaffName, assignedStaffRole, "name role")
                    console.log(result[0], "result[0].for_current_insurance_staff_role");
                    const filteredObjects = InsurnaceDetailsRole.filter(obj => obj._id == result[0].for_current_insurance_staff_role);
                    var assignedStaffRole = filteredObjects[0]?.name;
                    // console.log(filteredObjects, "filterObject");
                    sendResponse(req, res, 200, {
                        status: true,
                        data: {
                            result: result[0],
                            subscriberDetails: {
                                subscriber_type: subscriberDetails?.subscriber_type,
                                subscription_for: subscriberDetails?.subscription_for,
                                health_plan: plan,
                                plan_service: planService,
                                plan_exclusion: planExclusion,
                                primary_health_plan: primaryplan,
                                primary_plan_service: primaryplanService,
                                primary_plan_exclusion: primaryplanExclusion,
                                subscriberDetails: subscriberDetails,
                                primarysubscriberDetails: primarysubscriberDetails


                            },
                            previousClaim
                        },
                        message: `${assignedStaffName},${assignedStaffRole} is working on this Claim, Please choose another claim`,
                        errorCode: `ASSIGNED_STAFF`,
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    data: {
                        result: result[0],
                        subscriberDetails: {
                            subscriber_type: subscriberDetails?.subscriber_type,
                            subscription_for: subscriberDetails?.subscription_for,
                            health_plan: plan,
                            plan_service: planService,
                            plan_exclusion: planExclusion,
                            primary_health_plan: primaryplan,
                            primary_plan_service: primaryplanService,
                            primary_plan_exclusion: primaryplanExclusion,
                            subscriberDetails: subscriberDetails,
                            primarysubscriberDetails: primarysubscriberDetails

                        },
                        previousClaim
                    },
                    message: "Get medicine claim details",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async leaveMedicineClaimByInsuranceStaff(req, res) {
        const {
            claimId,
            insuranceStaffId,
            insuranceStaffRole
        } = req.body
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        claimId
                    }
                },
            ])
            if (insuranceStaffRole != "INSURANCE_ADMIN") {
                if (result[0].for_current_insurance_staff != null && result[0].for_current_insurance_staff == insuranceStaffId) {
                    const updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                for_current_insurance_staff: null
                            }
                        },
                        { new: true }
                    )
                    sendResponse(req, res, 200, {
                        status: true,
                        data: updatedClaim,
                        message: "Successfully leave this claim",
                        errorCode: null,
                    });
                }
                else {
                    sendResponse(req, res, 200, {
                        status: false,
                        data: null,
                        message: "No Staff Assign on this claim",
                        errorCode: null,
                    });
                }
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get current insurance staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineApproveOrRejectByInsuranceStaff(req, res) {
        const {
            claimId,
            medicineId,
            insuranceStaffId,
            action,
            approvedAmount,
            roleId
        } = req.body
        try {
            var status = "rejected"
            if (action == true) {
                status = "approved"
            }
            const claimData = await medicineClaimCommonInfo.findOne({ claimId })
            console.log(claimData, "claimDataclaimData");
            if (!claimData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: "No record found",
                    errorCode: null,
                });
            }

            const dataApproved = await claimMedicineApprovebyStaff.findOne({
                medicine_id: medicineId,
                claim_object_id: claimData._id,
                staff_id: req.body.insuranceStaffId,
                roleId: req.body.roleId
            })
            console.log(dataApproved, "dataApproved");

            const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: claimData.patientId });
            console.log(insuranceSubscriberInfo, "insuranceSubscriberInfo");
            var insurancesubscriberFullName;
            if (insuranceSubscriberInfo) {
                insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name
            } else {
                insurancesubscriberFullName = "";
            }

            if (claimData?.loggedInPatientId != '' && claimData?.loggedInPatientId != null) {
                console.log("run11111")
                var message = ` has approved new claim against ${insurancesubscriberFullName}. Claim number:${claimId}`
                var param = {
                    created_by_type: "staff",
                    created_by: insuranceStaffId,
                    content: message,
                    url: '',
                    for_portal_user: claimData?.loggedInPatientId,
                    notitype: 'Accept Claim',
                    claimObjectId: claimData?._id,
                    claimId: claimId
                }
                await notification(param)
            }

            if (claimData?.loggedInInsuranceId != '' && claimData?.loggedInInsuranceId != null) {
                console.log("run2222")
                var message = ` has approved new claim against ${insurancesubscriberFullName}. Claim number:${claimId}`
                var param = {
                    created_by_type: "staff",
                    created_by: insuranceStaffId,
                    content: message,
                    url: '',
                    for_portal_user: claimData?.loggedInInsuranceId,
                    notitype: 'Accept Claim',
                    claimObjectId: claimData?._id,
                    claimId: claimId
                }
                await notification(param)
            }

            if (dataApproved != '' && dataApproved != null) {
                console.log("if log");
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: "You have already approved this medicine",
                    errorCode: null,
                });
            } else {
                console.log("else log");
                const data = new claimMedicineApprovebyStaff({
                    medicine_id: medicineId,
                    claim_object_id: claimData._id,
                    staff_id: req.body.insuranceStaffId,
                    type: status,
                    amount: approvedAmount,
                    roleId: roleId
                })

                console.log(data, "dta check");
                let approveStaff = await data.save();
                var updatedClaim = await medicineClaimCommonInfo.findOne({ claimId })
                var MedicineData = await medicineDetailsOnClaim.findOne({ _id: medicineId })


                sendResponse(req, res, 200, {
                    status: true,
                    data: { approveStaff, updatedClaim, MedicineData },
                    message: `medicine ${status} `,
                    errorCode: null,

                });
            }


        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to medicine ${status}`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineCommentByInsuranceStaff(req, res) {
        const {
            claimId,
            claimMedicineApprovebyStaffId,
            comment,
            approvedAmount
        } = req.body

        try {
            const claimData = await medicineClaimCommonInfo.findOne({ claimId })
            if (!claimData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: error,
                    message: "No record found",
                    errorCode: null,
                });
            }

            const updatedClaim = await claimMedicineApprovebyStaff.findOneAndUpdate(
                { _id: claimMedicineApprovebyStaffId },
                {
                    $set: {
                        comment: comment,
                        amount: approvedAmount
                    }
                },
                { new: true }
            )


            // const insuranceStaffDetails = await httpService.getStaging('insurance/get-staff-details', { staff_id: insuranceStaffId }, {}, 'insuranceServiceUrl');
            // var StaffRole = insuranceStaffDetails.body.staffData.role.name
            // var updatedClaim


            sendResponse(req, res, 200, {
                status: true,
                data: updatedClaim,
                message: `Comment added for medicine`,
                errorCode: null,
            });

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to add comment`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addInsuranceStaff(req, res) {
        const {
            claimId,
            insuranceStaffRole,
            insuranceStaffList,
            approvedAmount,
            claim_object_id,
            loginStaffid
        } = req.body
        const claimData = await medicineClaimCommonInfo.findOne({ claimId }, { for_current_insurance_staff_role: 1, patientId: 1 })
        try {
            var result
            var currentStaffRole;
            const staffDetails = await AdminInfo.findOne({ for_portal_user: loginStaffid });

            if (insuranceStaffList.length > 0) {
                currentStaffRole = insuranceStaffList[0].staffRoleId
            } else {
                currentStaffRole = claimData.for_current_insurance_staff_role;
            }
            // console.log(req.body, "insuranceStaffList");
            result = await medicineClaimCommonInfo.findOneAndUpdate(
                { claimId },

                {
                    $set: {
                        for_current_insurance_staff: null,
                        for_current_insurance_staff_role: currentStaffRole
                    }
                },
                { new: true }
            ).exec();



            const updateIsView = await claimStaffDetails.updateMany(
                { claim_object_id: claim_object_id },
                {
                    $set: {
                        isView: true,
                    }
                },
                { new: true }
            )

            const updatedClaim = await claimStaffDetails.findOneAndUpdate(
                { claim_object_id: claim_object_id, staff_id: loginStaffid, staff_role_id: claimData.for_current_insurance_staff_role },
                {
                    $set: {
                        isApproved: true,
                        amount: approvedAmount
                    }
                },
                { new: true }
            )
            if (insuranceStaffList.length > 0) {
                for (var i = 0; i < insuranceStaffList.length; i++) {
                    let data = new claimStaffDetails({
                        claim_object_id: claim_object_id,
                        staff_id: insuranceStaffList[i].insurance_staff_id,
                        staff_role_id: insuranceStaffList[i].staffRoleId,
                    })
                    let staffSave = await data.save();
                    // console.log(staffSave, "staffSave");


                    // For notification
                    const insuranceSubscriberInfo = await insurancesubscribers.findOne({ _id: claimData.patientId });
                    var insurancesubscriberFullName;
                    if (insuranceSubscriberInfo) {
                        insurancesubscriberFullName = insuranceSubscriberInfo.subscriber_first_name + insuranceSubscriberInfo.subscriber_middle_name + insuranceSubscriberInfo.subscriber_last_name;
                    } else {
                        insurancesubscriberFullName = "";
                    }

                    var message = `${staffDetails?.company_name} has accepted new claim against ${insurancesubscriberFullName}. Claim number:${claimData?.claimId}`
                    var param = {
                        created_by_type: "staff",
                        created_by: loginStaffid,
                        content: message,
                        url: '',
                        for_portal_user: staffSave?.staff_id,
                        notitype: 'Accept Claim',
                        claimObjectId: claimData?._id,
                        claimId: claimData?.claimId
                    }
                    await notification(param)
                }
            } else {
                if (req.body.approvalStatus == true) {
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claim_object_id });
                    var patientIdCommon = claimData?.patientId;
                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: patientIdCommon });
                    var insuranceDateValidity = `${subscriberInfoForLimit.insurance_validity_from} - ${subscriberInfoForLimit.insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(patientIdCommon),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        if (detailsInsurance.length > 0) {
                            let primaryidDetail = detailsInsurance[0]._id;
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            insuranceDateValidity = `${subscriberInfoForDetails.insurance_validity_from} - ${subscriberInfoForDetails.insurance_validity_to}`;
                        }

                    }
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        var claimMedicineApprovebyStaffDetails = await claimMedicineApprovebyStaff.findOne({ claim_object_id: claim_object_id, staff_id: loginStaffid, roleId: claimData.for_current_insurance_staff_role, medicine_id: element._id })
                        var approvedAmount1 = 0;
                        if (claimMedicineApprovebyStaffDetails) {
                            approvedAmount1 = claimMedicineApprovebyStaffDetails.amount;
                        }
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: mongoose.Types.ObjectId(patientIdCommon),
                                    is_deleted: false,
                                },
                            },

                        ]);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: mongoose.Types.ObjectId(patientIdCommon),
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: mongoose.Types.ObjectId(primaryid),
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());
                        // if (approvedAmount1 < requestAmount) {
                        let remainingDiff = requestAmount - approvedAmount1;

                        console.log(remainingDiff, "remainingDiff");
                        var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                        console.log(fetchRecordForFamilyTotalLimit, "fetchRecordForFamilyTotalLimit");
                        var previousFamilyTotalLimit = parseFloat(remainingDiff)
                        console.log(previousFamilyTotalLimit, "previousFamilyTotalLimit");
                        if (fetchRecordForFamilyTotalLimit) {
                            previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) - parseFloat(remainingDiff);
                            console.log(previousFamilyTotalLimit, "previousFamilyTotalLimit");
                        }


                        var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                        var previousOwnLimit = parseFloat(remainingDiff)
                        if (fetchRecordForOwnLimit) {
                            previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) - parseFloat(remainingDiff);
                        }


                        var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                        var previousCategoryLimit = parseFloat(remainingDiff)
                        if (fetchRecordForCategoryLimit) {
                            previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) - parseFloat(remainingDiff);
                        }

                        var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                        var previousFamilyServiceLimit = parseFloat(remainingDiff)
                        if (fetchRecordForFamilyServiceLimit) {
                            previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) - parseFloat(remainingDiff)
                        }

                        var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                        var previousFamilyCategoryLimit = parseFloat(remainingDiff)
                        if (fetchRecordForFamilyCategoryLimit) {
                            previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) - parseFloat(remainingDiff)
                        }

                        let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                        if (subscriberUser) {
                            if (fetchRecordForFamilyTotalLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                            }

                            if (fetchRecordForOwnLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                            }


                            if (fetchRecordForCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                            }

                            if (fetchRecordForFamilyServiceLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                            }


                            if (fetchRecordForFamilyCategoryLimit) {
                                await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                            }

                        }

                        // }
                        let medicine_id = element._id
                        console.log(medicine_id, "element log");
                        result = await medicineDetailsOnClaim.findOneAndUpdate(
                            { _id: medicine_id },
                            {
                                $set: {
                                    usedAmount: approvedAmount1,

                                }
                            },
                            { new: true }
                        ).exec();
                    }

                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                status: "approved",
                                totalApprovedAmount: approvedAmount
                            }
                        },
                        { new: true }
                    ).exec();
                } else {
                    var approvedMedicineToReject = await claimMedicineApprovebyStaff.updateMany({ claim_object_id: claim_object_id, type: "approved" }, { $set: { type: "rejected", amount: 0 } });
                    var medicineDataDetails = await medicineDetailsOnClaim.find({ for_medicine_claim: claim_object_id });
                    var patientIdCommon = claimData?.patientId;
                    const subscriberInfoForLimit = await insurancesubscribers.findOne({ _id: patientIdCommon });
                    var insuranceDateValidity = `${subscriberInfoForLimit.insurance_validity_from} - ${subscriberInfoForLimit.insurance_validity_to}`;
                    if (subscriberInfoForLimit.subscription_for == 'Secondary') {
                        var detailsInsurance = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    secondary_subscriber: mongoose.Types.ObjectId(patientIdCommon),
                                    is_deleted: false,
                                },
                            },
                        ]);
                        if (detailsInsurance.length > 0) {
                            let primaryidDetail = detailsInsurance[0]._id;
                            const subscriberInfoForDetails = await insurancesubscribers.findOne({ _id: primaryidDetail });
                            insuranceDateValidity = `${subscriberInfoForDetails.insurance_validity_from} - ${subscriberInfoForDetails.insurance_validity_to}`;
                        }

                    }
                    for (let index = 0; index < medicineDataDetails.length; index++) {
                        const element = medicineDataDetails[index];
                        console.log(element, "elementlog");
                        var claimMedicineApprovebyStaffDetails = await claimMedicineApprovebyStaff.findOne({ claim_object_id: claim_object_id, staff_id: loginStaffid, roleId: claimData.for_current_insurance_staff_role, medicine_id: element._id })
                        var approvedAmount1 = 0;
                        if (claimMedicineApprovebyStaffDetails) {
                            approvedAmount1 = claimMedicineApprovebyStaffDetails.amount;
                        }
                        let categoryService = element.categoryService;
                        let serviceName = element.serviceName;
                        let requestAmount = element.requestAmount;
                        var primaryid = '';
                        var findsubscriber = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: mongoose.Types.ObjectId(patientIdCommon),
                                    is_deleted: false,
                                },
                            },

                        ]);
                        if (findsubscriber[0].subscription_for == 'Primary') {
                            primaryid = patientIdCommon
                        }
                        else {
                            var detailsInsurance = await insurancesubscribers.aggregate([
                                {
                                    $match: {
                                        secondary_subscriber: mongoose.Types.ObjectId(patientIdCommon),
                                        is_deleted: false,
                                    },
                                },
                            ]);
                            if (detailsInsurance.length > 0) {
                                primaryid = detailsInsurance[0]._id
                            }
                        }
                        let detailsInsurance1 = await insurancesubscribers.aggregate([
                            {
                                $match: {
                                    _id: mongoose.Types.ObjectId(primaryid),
                                    is_deleted: false,
                                },
                            },

                        ]);


                        const secondarySubscriberIds = detailsInsurance1[0].secondary_subscriber.map(id => id.toString());
                        secondarySubscriberIds.push(primaryid.toString());
                        if (approvedAmount1 < requestAmount) {
                            let remainingDiff = requestAmount - approvedAmount1;

                            var fetchRecordForFamilyTotalLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity });
                            var previousFamilyTotalLimit = parseFloat(remainingDiff)
                            if (fetchRecordForFamilyTotalLimit) {
                                previousFamilyTotalLimit = parseFloat(fetchRecordForFamilyTotalLimit.family_total_limit) - parseFloat(remainingDiff);
                            }


                            var fetchRecordForOwnLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity });
                            var previousOwnLimit = parseFloat(remainingDiff)
                            if (fetchRecordForOwnLimit) {
                                previousOwnLimit = parseFloat(fetchRecordForOwnLimit.own_limit) - parseFloat(remainingDiff);
                            }

                            var fetchRecordForCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity });
                            var previousCategoryLimit = parseFloat(remainingDiff)
                            if (fetchRecordForCategoryLimit) {
                                previousCategoryLimit = parseFloat(fetchRecordForCategoryLimit.category_limit) - parseFloat(remainingDiff);
                            }

                            var fetchRecordForFamilyServiceLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity });
                            var previousFamilyServiceLimit = parseFloat(remainingDiff)
                            if (fetchRecordForFamilyServiceLimit) {
                                previousFamilyServiceLimit = parseFloat(fetchRecordForFamilyServiceLimit.family_service_limit) - parseFloat(remainingDiff)
                            }

                            var fetchRecordForFamilyCategoryLimit = await subscriberUseLimit.findOne({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity });

                            var previousFamilyCategoryLimit = parseFloat(remainingDiff)
                            if (fetchRecordForFamilyCategoryLimit) {
                                previousFamilyCategoryLimit = parseFloat(fetchRecordForFamilyCategoryLimit.family_category_limit) - parseFloat(remainingDiff)
                            }

                            let subscriberUser = await subscriberUseLimit.findOne({ subscriber_id: patientIdCommon, service_name: serviceName, category_name: categoryService, plan_validity: insuranceDateValidity });

                            if (subscriberUser) {

                                if (fetchRecordForFamilyTotalLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, plan_validity: insuranceDateValidity }, { $set: { family_total_limit: previousFamilyTotalLimit } });
                                }

                                if (fetchRecordForOwnLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, plan_validity: insuranceDateValidity }, { $set: { own_limit: previousOwnLimit } });
                                }

                                if (fetchRecordForCategoryLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: patientIdCommon, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { category_limit: previousCategoryLimit } });
                                }

                                if (fetchRecordForFamilyServiceLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, service_name: serviceName, plan_validity: insuranceDateValidity }, { $set: { family_service_limit: previousFamilyServiceLimit } });
                                }


                                if (fetchRecordForFamilyCategoryLimit) {
                                    await subscriberUseLimit.updateMany({ subscriber_id: { $in: secondarySubscriberIds }, category_name: categoryService, plan_validity: insuranceDateValidity }, { $set: { family_category_limit: previousFamilyCategoryLimit } });
                                }

                            }

                        }
                        let medicine_id = element._id
                        console.log(medicine_id, "elementlog");
                        result = await medicineDetailsOnClaim.findOneAndUpdate(
                            { _id: medicine_id },
                            {
                                $set: {
                                    usedAmount: approvedAmount1,

                                }
                            },
                            { new: true }
                        ).exec();
                    }
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                totalApprovedAmount: approvedAmount,
                                status: "rejected",
                            }
                        },
                        { new: true }
                    ).exec();
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added insurance staff for this claim",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add insurance staff for this claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async approvalByInsuranceStaff(req, res) {
        const {
            claimId,
            insuranceStaffRole,
            approvalStatus,
            reSubmit,
            approvedAmount
        } = req.body
        try {
            var result
            if (insuranceStaffRole == "Receptionist") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    {
                        $set: {
                            is_approved_by_receptionist: approvalStatus,
                        }
                    },
                    { new: true }
                ).exec();
            }
            if (insuranceStaffRole == "Medical Advisor") {
                if (reSubmit == true) {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                is_approved_by_medical_advisor: approvalStatus,
                                status: "resubmit"
                            }
                        },
                        { new: true }
                    ).exec();
                }

                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    {
                        $set: {
                            is_approved_by_medical_advisor: approvalStatus,
                            status: "pending"
                        }
                    },
                    { new: true }
                ).exec();
            }
            if (insuranceStaffRole == "Contract Advisor") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    {
                        $set: {
                            is_approved_by_contract_advisor: approvalStatus,
                        }
                    },
                    { new: true }
                ).exec();
            }
            if (insuranceStaffRole == "CFO") {
                if (approvalStatus == true) {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                is_approved_by_cfo: approvalStatus,
                                status: "approved",
                                totalApprovedAmountByCFO: approvedAmount,
                                for_current_insurance_staff: null
                            }
                        },
                        { new: true }
                    ).exec();
                } else {
                    result = await medicineClaimCommonInfo.findOneAndUpdate(
                        { claimId },
                        {
                            $set: {
                                is_approved_by_cfo: approvalStatus,
                                status: "rejected",
                                for_current_insurance_staff: null
                            }
                        },
                        { new: true }
                    ).exec();
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully approved",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to approve",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCountByStatusInsurance(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId
        } = req.query
        var matchFilter = []

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length

            } else {
                console.log("Else");

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "pending" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "pending" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "pending" };
                // let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filterData
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },

                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "approved" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "medical-products", "mediclaimcommoninfosData.status": "approved" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }

            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCountByStatusPharmacy(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;
            var filter = {
                for_portal_user: mongoose.Types.ObjectId(pharmacyId),
                claimType: "medicine",
                requestType: "pre-auth"
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusInsuranceDoctor(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            claimType,
            requestType
        } = req.query

        console.log(req.query, "5888");
        var matchFilter = []

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length

            } else {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "pending" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "pending" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };

                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                console.log(filterData, "filterData");

                console.log(filter, "filter");
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                console.log(claimStaffData, "check staff list");
                claimStaffDataresubmit = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "approved" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "approved" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }

            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }

            console.log(result, "result check insurance");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async appointmentClaimStatusInsuranceAllView(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            claimType,
            requestType
        } = req.query

        console.log(req.query, "5888");
        var matchFilter = []

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length

            } else {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": "medicine", "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "pending" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "pending" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "approved" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": requestType, "mediclaimcommoninfosData.status": "approved" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }

            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }

            console.log(result, "result check insurance");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async hospitalizationCountByStatusInsuranceAdmin(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            claimType,
            requestType
        } = req.query

        console.log(req.query, "5888");
        var matchFilter = []

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                let filterData = {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": claimType,
                    "mediclaimcommoninfosData.requestType": {
                        $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                    }
                };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length

            } else {
                // let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "pre-auth" };
                let filterData = {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": claimType,
                    "mediclaimcommoninfosData.requestType": {
                        $in: ["Hospitalization Statement", "Hospitalization Extention", "pre-auth"]
                    }
                };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "pending" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "pending" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "pending" };
                // let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filterData
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },

                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatareject = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "approved" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType, "mediclaimcommoninfosData.requestType": "Hospitalization Final Claim", "mediclaimcommoninfosData.status": "approved" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }

            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }

            console.log(result, "result check insurance");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusInsuranceAdmin(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;
            var filter = {
                for_portal_user: mongoose.Types.ObjectId(pharmacyId),
                claimType: "medicalConsultation",
                requestType: "pre-auth"
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: pharmacyId,
                claimType: "medicalConsultation",
                requestType: "medical-consultation"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: pharmacyId,
                claimType: "medicalConsultation",
                requestType: "medical-consultation"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: pharmacyId,
                claimType: "medicalConsultation",
                requestType: "medical-consultation"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: pharmacyId,
                claimType: "medicalConsultation",
                requestType: "medical-consultation"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async appointmentclaimInsuranceAdmin(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate, claimType } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;
            var filter = {
                for_portal_user: mongoose.Types.ObjectId(pharmacyId),
                claimType: claimType,
                requestType: "pre-auth"
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: pharmacyId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: pharmacyId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: pharmacyId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: pharmacyId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check error count");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async medicineClaimCountByStatusInsuranceAdminMedicine(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;
            var filter = {
                for_portal_user: mongoose.Types.ObjectId(pharmacyId),
                claimType: "medicine",
                requestType: "pre-auth"
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: pharmacyId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // const doctorIdArray = pharmacyId.split(",");
    // pharmacyId = doctorIdArray.map(id => mongoose.Types.ObjectId(id));


    async medicineClaimCountByStatusPharmacyDoctor(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;


            const doctorIdArray = pharmacyId.split(',');
            const pharmacyIdArray = doctorIdArray.map(id => mongoose.Types.ObjectId(id));
            console.log(pharmacyIdArray, "idsssssssssssss");

            var filter = {
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "medicalConsultation",
                requestType: "pre-auth",
                // claimComplete: true
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "medicalConsultation",
                requestType: "medical-consultation",
                // claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;
            console.log(claimStaffDatapending, "check fcoount");

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "medicalConsultation",
                requestType: "medical-consultation",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "medicalConsultation",
                requestType: "medical-consultation",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "medicalConsultation",
                requestType: "medical-consultation",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error counting");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusPharmacyDoctorHospital(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;


            const doctorIdArray = pharmacyId.split(',');
            const pharmacyIdArray = doctorIdArray.map(id => mongoose.Types.ObjectId(id));
            console.log(pharmacyIdArray, "idsssssssssssss");

            var filter = {
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                claimComplete: true,
                requestType: {
                    $in: ["Hospitalization Statement", "pre-auth", "Hospitalization Extention"]
                }
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;
            console.log(claimStaffDatapending, "check fcoount");

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim",
                claimComplete: true
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error counting");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCountByStatusHospitalClaim(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;


            const doctorIdArray = pharmacyId.split(',');
            const pharmacyIdArray = doctorIdArray.map(id => mongoose.Types.ObjectId(id));
            console.log(pharmacyIdArray, "idsssssssssssss");

            var filter = {
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "pre-auth"
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "hospital-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;
            console.log(claimStaffDatapending, "check fcoount");

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "hospital-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "hospital-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "hospital-claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy", filter);
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error counting");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCountByStatusHospitalClaimExtensionFinal(req, res) {
        const { pharmacyId, insuranceIds, fromDate, Todate } = req.query

        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;
            let totalamount = 0;


            const doctorIdArray = pharmacyId.split(',');
            const pharmacyIdArray = doctorIdArray.map(id => mongoose.Types.ObjectId(id));
            console.log(pharmacyIdArray, "idsssssssssssss");

            var filter = {
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: {
                    $in: ["Hospitalization Statement", "pre-auth", "Hospitalization Extention"]
                }
            }
            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                filter['insuranceId'] = { $in: allInsId }
            }
            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();
            console.log(filter, "filter");

            claimStaffDatapreauth = resultPreauth.length;

            // pending

            var filter = {
                status: 'pending',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;
            console.log(claimStaffDatapending, "check fcoount");

            // reject

            var filter = {
                status: 'rejected',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatareject = resultreject.length;



            // resubmit

            var filter = {
                status: 'resubmit',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataresubmit = resultresubmit.length;

            // approved

            var filter = {
                status: 'approved',
                for_portal_user: { $in: pharmacyIdArray },
                claimType: "hospitalization",
                requestType: "Hospitalization Final Claim"
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromDate != "" && Todate != "") {
                filter.createdAt = { $gte: fromDate, $lte: Todate };
            }
            if (fromDate != "") {
                filter.createdAt = { $gte: fromDate };
            }
            if (Todate != "") {
                filter.createdAt = { $lte: Todate };
            }
            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDataapproved = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error counting");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCountByStatusPatient(req, res) {
        const { patientId } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            var filter = {
                for_portal_user: patientId,
                claimType: "medicine",
                requestType: "pre-auth"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapreauth = resultPreauth.length;
            // pending

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultreject.length;



            // resubmit

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultresubmit.length;

            // approved

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: "medicine",
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check count");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusLabImagin(req, res) {
        const { patientId, claimType } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            var filter = {
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "pre-auth"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapreauth = resultPreauth.length;
            // pending

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultreject.length;



            // resubmit

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultresubmit.length;

            // approved

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "medical-products"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check count");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusLabImaginAppointment(req, res) {
        const { patientId, claimType } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            var filter = {
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "pre-auth"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapreauth = resultPreauth.length;
            // pending

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultreject.length;



            // resubmit

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultresubmit.length;

            // approved

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check count");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async medicineClaimCountByStatusLabImaginAppointmentPatient(req, res) {
        const { patientId, claimType } = req.query
        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;

            var filter = {
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "pre-auth"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultPreauth = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapreauth = resultPreauth.length;
            // pending

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultpending = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultpending.length;

            // reject

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultreject = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultreject.length;



            // resubmit

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultresubmit = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultresubmit.length;

            // approved

            var filter = {
                status: 'pending',
                for_portal_user: patientId,
                claimType: claimType,
                requestType: "appointment-claim"
            }

            // if (insuranceIds != "" && insuranceIds != undefined) {
            //     var allInsId = insuranceIds.split(',')
            //     // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
            //     filter['insuranceId'] = { $in: allInsId }
            // }

            const resultapproved = await medicineClaimCommonInfo.find(filter)
                .exec();

            claimStaffDatapending = resultapproved.length;



            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }
            console.log(result, "result check pharmacy");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check count");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async claimHistory(req, res) {
        const { patientId, insuranceId } = req.query
        try {
            // const result = await medicineClaimCommonInfo.aggregate([
            //     {
            //         $match: {
            //             patientId: patientId,
            //             insuranceId: mongoose.Types.ObjectId(InsuranceId)
            //         }
            //     },
            // { $group: { _id: "$status", count: { $sum: 1 } } },
            // { $project: { _id: 1, count: 1 } }
            // ]).exec();
            const result = await medicineClaimCommonInfo.find({ patientId, insuranceId, status: "approved" })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async claimResubmitByInsuranceStaff(req, res) {
    //     const {
    //         insuranceStaffId,
    //         resubmitReason,
    //         claimId
    //     } = req.body
    //     try {

    // var result = await medicineClaimCommonInfo.findOneAndUpdate(
    //     { claimId },
    //     {
    //         $set: {
    //             "resubmit.resubmittedBy": insuranceStaffId,
    //             "resubmit.resubmitReason": resubmitReason,
    //             "resubmit.isClaimResubmitted": true,
    //             status: "resubmit"
    //         }
    //     },
    //     { new: true }
    // ).exec();
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             data: result,
    //             message: "successfully resubmit medicine claim",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 200, {
    //             status: false,
    //             data: error,
    //             message: "failed to resubmit medicine claim",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }


    async claimResubmitByInsuranceStaff(req, res) {
        const {
            insuranceStaffId,
            resubmitReason,
            claimId
        } = req.body;

        try {
            const newArrayValue = {
                resubmittedBy: insuranceStaffId,
                resubmitReason: resubmitReason,
                isClaimResubmitted: true,
            };
            const claimInfo = await medicineClaimCommonInfo.findOne({ claimId }).exec();
            claimInfo.resubmit.push(newArrayValue);
            const result = await claimInfo.save();

            var resultStatus = await medicineClaimCommonInfo.findOneAndUpdate(
                { claimId },
                {
                    $set: {
                        status: "resubmit"
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully resubmit medicine claim with new object added to the resubmit array",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "failed to resubmit medicine claim",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    /* claim process code */
    async claimprocessRole(req, res) {
        try {
            const { roleArray, added_by, for_portal_user, createdBy } = req.body;
            console.log(req.body, "<---req.body");
            const list = [];
            // var isFirstCheck = 0;
            // var isLastCheck = 0;
            for (const roleObj of roleArray) {
                let insuranceidExist = await ClaimProcessRole.find({ "insurance_id": roleObj.insurance_id, "roleId": roleObj.roleId, isDeleted: false });
                if (insuranceidExist.length == 0) {
                    console.log("insurance exist", insuranceidExist);


                    // if (isFirstExist.length == 0) {
                    list.push({
                        ...roleObj,
                        added_by,
                        createdBy,
                        for_portal_user
                    })
                    // } 
                    // else {
                    //     isFirstCheck = 1;
                    // }

                }
            }
            if (list.length > 0) {
                console.log(list, "list log");
                const savedClaimRole = await ClaimProcessRole.insertMany(list);
                if (savedClaimRole) {
                    sendResponse(req, res, 200, {
                        status: true,
                        body: savedClaimRole,
                        message: "Successfully add claim role",
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Not add claim role",
                        errorCode: null,
                    });
                }
            } else {
                console.log("check log else");
                // if (isLastCheck) {
                //     sendResponse(req, res, 200, {
                //         status: false,
                //         body: null,
                //         message: "Your Last Role has been Already added",
                //         errorCode: null,
                //     });
                //     return;
                // }

                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Role has been already added",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add claim role",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    // get list by Insurance Id
    async fetchClaimProcessBy_insuranceId(req, res) {
        try {
            const { limit, page, searchText, insurance_id } = req.query;
            console.log("req.query-----", req.query);
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];

                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            var searchClaim = {};
            if (searchText != "") {
                searchClaim['$or'] = [

                    {
                        "roleData.name": { $regex: searchText, $options: "i" },
                    },
                    {
                        "InsuranceData.company_name": { $regex: searchText, $options: "i" },
                    }

                ]

            }


            let filter = { isDeleted: false };
            if (insurance_id != '') {

                let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(insurance_id))

                if (checkUser.role == 'INSURANCE_STAFF') {
                    let staffData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(insurance_id) })

                    filter.insurance_id = mongoose.Types.ObjectId(staffData?.for_user)

                } else {

                    filter.insurance_id = mongoose.Types.ObjectId(insurance_id)

                }

            }


            var claimCount;

            var aggregate = [
                {
                    $match: filter,
                },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleId",
                        foreignField: "_id",
                        as: "roleData",
                    }
                },
                { $unwind: "$roleData" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "insurance_id",
                        foreignField: "_id",
                        as: "portalUserData",
                    }
                },
                { $unwind: "$portalUserData" },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "insurance_id",
                        foreignField: "for_portal_user",
                        as: "InsuranceData",
                    }
                },
                { $unwind: "$InsuranceData" },

                {
                    $match: searchClaim,
                }
            ]
            claimCount = await ClaimProcessRole.aggregate(aggregate)
            aggregate.push(
                {
                    $sort: sortingarray
                }
            )
            if (limit != 0) {
                aggregate.push(
                    {
                        $skip: (page - 1) * limit

                    }, {
                    $limit: limit * 1
                }
                )
            }
            let result = await ClaimProcessRole.aggregate(aggregate)



            if (result.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        data: result,
                        totalPages: Math.ceil(claimCount.length / limit),
                        currentPage: page,
                        totalRecords: claimCount.length,
                    },
                    message: "Claim Process Role list Fetched successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Data not found",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    // get list by Insurance Id
    async getClaimProcessById(req, res) {
        try {
            const { _id } = req.query;
            console.log(_id, "insurance_idinsurance_i1212d");
            let filter = { isDeleted: false };
            if (_id != '') {
                filter._id = mongoose.Types.ObjectId(_id)
            }
            const result = await ClaimProcessRole.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleId",
                        foreignField: "_id",
                        as: "roleData",
                    }
                },
                { $unwind: "$roleData" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "insurance_id",
                        foreignField: "_id",
                        as: "portalUserData",
                    }
                },
                { $unwind: "$portalUserData" },


            ]).exec();
            if (result.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "Claim Process Role Record Fetched successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Record not found",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    // get list by Insurance Id
    async getLastClaimProcessRole(req, res) {
        try {
            const { insurance_id } = req.query;
            let filter = { isDeleted: false };
            if (insurance_id != '') {
                filter.insurance_id = mongoose.Types.ObjectId(insurance_id)

            }
            const result = await ClaimProcessRole.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleId",
                        foreignField: "_id",
                        as: "roleData",
                    }
                },
                { $unwind: "$roleData" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "insurance_id",
                        foreignField: "_id",
                        as: "portalUserData",
                    }
                },
                { $unwind: "$portalUserData" },
                {
                    $sort: { sequence: -1 }
                }

            ]).exec();
            if (result.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "Claim Process Role Record Fetched successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Record not found",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    // Delete data
    async deleteClaimprocessRole(req, res) {
        try {
            const { _id } = req.body;

            ClaimProcessRole.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(_id) },
                { $set: { isDeleted: true, isFirst: false, isLast: false } },

                (err, result) => {
                    if (err) {
                        sendResponse(req, res, 200, {
                            status: false,
                            message: "Internal server error",
                            errorCode: null,
                        });
                    } else {
                        sendResponse(req, res, 200, {
                            status: true,
                            body: null,
                            message: "Claim process role deleted successfully",
                            errorCode: null,
                        });
                    }

                }
            )

        } catch (error) {
            console.log(error, 'error');
            res.status(500).json({
                status: false,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    // Edit data
    async editclaimprocessRole(req, res) {


        const {
            _id,
            ClaimProcessData,
            insurance_id
        } = req.body
        console.log(req.body, "body log");
        var isFirstCheck = 0;
        try {
            let insuranceidExist = await ClaimProcessRole.find({
                "insurance_id": insurance_id, "roleId": ClaimProcessData.roleId,
                _id: { $ne: _id },
                isDeleted: false
            });
            if (insuranceidExist.length > 0) {
                sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: `This role is already exist`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
                return;
            }
            const result = await ClaimProcessRole.findOneAndUpdate(
                { _id: _id },
                {
                    $set: {
                        ...ClaimProcessData
                    }
                },
                { new: true }
            )
            console.log(result, "result log");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Claim process role updated successfully",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update Claim Process details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }

    }

    async deleteMedicineExisting(req, res) {
        try {
            const { medicineId } = req.body
            const pharmacyIdIsExist = await MedicineDetailsOnClaim.findOne({ _id: mongoose.Types.ObjectId(medicineId) });

            if (pharmacyIdIsExist) {
                const result = await MedicineDetailsOnClaim.deleteOne({ _id: mongoose.Types.ObjectId(medicineId) });

                if (result.deletedCount > 0) {
                    console.log("abc");
                    sendResponse(req, res, 200, {
                        status: true,
                        message: "Medicine successfully deleted",
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 404, {
                        status: false,
                        message: "Medicine not found for deletion",
                        errorCode: "NOT_FOUND",
                    });
                }
            } else {

                sendResponse(req, res, 404, {
                    status: false,
                    message: "Medicine not exist, Medicine not found for deletion",
                    errorCode: "NOT_FOUND",
                });
            }

        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to delete Medicine",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getClaimsReportedForLabImgOtpDntl(req, res) {
        const {
            claimType,
            for_portal_user
        } = req.query;

        //console.log(claimType, "querytttfts____",for_portal_user);

        try {
            const claimInfo = await medicineClaimCommonInfo.find(
                {
                    claimType: claimType,
                    for_portal_user: for_portal_user
                }).exec();

            //console.log(claimInfo, "claimInfooo__");


            sendResponse(req, res, 200, {
                status: true,
                data: claimInfo,
                message: "successfully fetch claims list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "failed to fetch claims list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getClaimsReportedForDoctor(req, res) {
        const {
            for_portal_user
        } = req.query;

        //console.log(claimType, "querytttfts____",for_portal_user);

        try {
            const claimInfo = await medicineClaimCommonInfo.find(
                {
                    claimType: { $in: ['hospitalization', 'medicalConsultation'] },
                    for_portal_user: for_portal_user
                }).exec();

            //console.log(claimInfo, "claimInfooo__");


            sendResponse(req, res, 200, {
                status: true,
                data: claimInfo,
                message: "successfully fetch claims list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "failed to fetch claims list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // dashboard

    async policyDashboardCountInsurance(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            year,
            claimType
        } = req.query


        try {
            let claimStaffDatapreauth = 0;
            let claimStaffDatapending = 0;
            let claimStaffDatareject = 0;
            let claimStaffDataresubmit = 0;
            let claimStaffDataapproved = 0;


            var dateFilter = {}

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }


            var claim_Type = {}

            if (claimType && claimType != '') {
                claim_Type = { "mediclaimcommoninfosData.claimType": claimType };
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "pre-auth" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length

            } else {
                console.log("else");
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "pre-auth" };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                claimStaffDatapreauth = (await claimStaffDetails.aggregate(arrayData)).length
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "pending" };


                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "pending" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDatapending = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "rejected" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "rejected" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataresubmit = claimStaffData.length
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "approved" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: filterData,

                    },
                    {
                        $match: {

                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})

                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }
            else {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.status": "approved" };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})


                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }

                ]
                let claimStaffData = await claimStaffDetails.aggregate(arrayData)
                claimStaffDataapproved = claimStaffData.length
            }

            let result = {
                "preauth": claimStaffDatapreauth,
                "pending": claimStaffDatapending,
                "reject": claimStaffDatareject,
                "resubmit": claimStaffDataresubmit,
                "approved": claimStaffDataapproved,

            }

            console.log(result, "result check insurance");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim count by status",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get medicine claim count by status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async geteClaimCount(req, res) {
        const { insuranceId,
            insuranceStaffRole,
            insuranceStaffId, year, claimType } = req.query;

        try {

            let patient_eclaim = 0;
            let provider_eclaim = 0;

            var dateFilter = {}

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }


            var claim_Type = {}

            if (claimType != '') {
                claim_Type = { "mediclaimcommoninfosData.claimType": claimType };
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.created_by": "patient" };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})
                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                patient_eclaim = (await claimStaffDetails.aggregate(arrayData))


            }
            else {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.created_by": "patient" };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})
                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                patient_eclaim = (await claimStaffDetails.aggregate(arrayData))
            }


            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.created_by": { $ne: "patient" } };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    }
                    ,
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})
                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                        }
                    }
                ]
                provider_eclaim = (await claimStaffDetails.aggregate(arrayData))


            }
            else {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.created_by": { $ne: "patient" } };
                // { "mediclaimcommoninfosData.insuranceId": insuranceId, "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.requestType": "pre-auth" }
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                var arrayData = [

                    {
                        $match: filter
                    },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})
                        }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",

                        }
                    }

                ]
                provider_eclaim = (await claimStaffDetails.aggregate(arrayData))
            }


            let result = {
                "total_patient_eclaim": patient_eclaim.length,
                "total_provider_eclaim": provider_eclaim.length
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully fetch claims list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "failed to fetch claims list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async geteClaimCountByMonth(req, res) {
        const { insuranceId, insuranceStaffRole, insuranceStaffId, claimType, year } = req.query;


        var dateFilter = {}

        if (year != '') {
            const startOfYear = new Date(`${year}-01-01`);
            const endOfYear = new Date(`${year}-12-31`);

            dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
        }

        var claim_Type = {}

        if (claimType != '') {
            claim_Type = { "mediclaimcommoninfosData.claimType": claimType };
        }


        try {
            let currentMonth_eclaim = 0;
            let previousMonth_eclaim = 0;

            var currentDate = moment();
            var today = moment().startOf('day');

            var firstDayOfCurrentMonth = currentDate.startOf('month');
            var firstDayOfPreviousMonth = firstDayOfCurrentMonth.clone().subtract(1, 'months');

            let filterDataCurrentMonth = {
                "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                "mediclaimcommoninfosData.claimComplete": true,
                "mediclaimcommoninfosData.createdAt": {
                    $gte: firstDayOfCurrentMonth.toDate(),
                    $lte: today.toDate(),
                }
            };

            let filterDataPreviousMonth = {
                "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                "mediclaimcommoninfosData.claimComplete": true,
                "mediclaimcommoninfosData.createdAt": {
                    $gte: firstDayOfPreviousMonth.toDate(),
                    $lt: firstDayOfCurrentMonth.toDate()
                }
            };
            let filter2 = {
                ...(Object.keys(claim_Type).length > 0 ? claim_Type : ''),
                ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),

            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                var arrayData = [
                    { $lookup: { from: "mediclaimcommoninfos", localField: "claim_object_id", foreignField: "_id", as: "mediclaimcommoninfosData" } },
                    { $unwind: "$mediclaimcommoninfosData" },
                    // { $match: filterDataCurrentMonth },
                    {
                        $match: {
                            ...filterDataCurrentMonth,
                            ...filter2

                        }
                    },
                    { $group: { _id: "$claim_object_id" } }
                ];

                currentMonth_eclaim = (await claimStaffDetails.aggregate(arrayData)).length;

                arrayData[2].$match = { ...filterDataPreviousMonth, ...filter2 }



                previousMonth_eclaim = (await claimStaffDetails.aggregate(arrayData)).length;
            }
            else {
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };

                var arrayData = [
                    { $match: filter },
                    { $lookup: { from: "mediclaimcommoninfos", localField: "claim_object_id", foreignField: "_id", as: "mediclaimcommoninfosData" } },
                    { $unwind: "$mediclaimcommoninfosData" },
                    // { $match: filterDataCurrentMonth },
                    {
                        $match: {
                            ...filterDataCurrentMonth,
                            ...filter2
                        }
                    },
                    { $group: { _id: "$claim_object_id" } }
                ];

                currentMonth_eclaim = (await claimStaffDetails.aggregate(arrayData)).length;

                arrayData[2].$match = { ...filterDataPreviousMonth, ...filter2 }


                previousMonth_eclaim = (await claimStaffDetails.aggregate(arrayData)).length;
            }

            let result = {
                "total_currentMonth_eclaim": currentMonth_eclaim,
                "total_previousMonth_eclaim": previousMonth_eclaim
            };

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Successfully fetch claims list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "Failed to fetch claims list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getdataForBarchart(req, res) {
        const { insuranceId, insuranceStaffRole, insuranceStaffId, year } = req.query;

        try {
            let medicine = 0;
            let medicalConsultation = 0;
            let hospitalization = 0;
            let laboratory_imaging = 0;
            let optical = 0;
            let dental = 0;
            let paramedical_professions = 0;

            let filters = {
                filter_medicine: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "medicine"
                },
                filter_hospitalization: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "hospitalization"
                },
                filter_medicalConsultation: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "medicalConsultation"
                },
                filter_laboratory_imaging: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "Laboratory-Imaging"
                },
                filter_dental: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "Dental"
                },
                filter_optical: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "Optical"
                },
                filter_paramedical_professions: {
                    "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId),
                    "mediclaimcommoninfosData.claimComplete": true,
                    "mediclaimcommoninfosData.claimType": "Paramedical-Professions"
                },
            };


            var dateFilter = {}

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }

            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                for (let filter in filters) {
                    var arrayData = [
                        { $lookup: { from: "mediclaimcommoninfos", localField: "claim_object_id", foreignField: "_id", as: "mediclaimcommoninfosData" } },
                        { $unwind: "$mediclaimcommoninfosData" },
                        { $match: filters[filter] },
                        { $match: Object.keys(dateFilter).length > 0 ? dateFilter : {} },
                        { $group: { _id: "$claim_object_id" } }
                    ];

                    switch (filter) {
                        case 'filter_medicine':
                            medicine = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_hospitalization':
                            hospitalization = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_medicalConsultation':
                            medicalConsultation = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_laboratory_imaging':
                            laboratory_imaging = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_dental':
                            dental = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_optical':
                            optical = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_paramedical_professions':
                            paramedical_professions = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                    }
                }
            } else {
                let filterId = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };


                for (let filter in filters) {
                    var arrayData = [
                        { $match: filterId },
                        { $lookup: { from: "mediclaimcommoninfos", localField: "claim_object_id", foreignField: "_id", as: "mediclaimcommoninfosData" } },
                        { $unwind: "$mediclaimcommoninfosData" },
                        { $match: filters[filter] },
                        { $match: Object.keys(dateFilter).length > 0 ? dateFilter : {} },
                        { $group: { _id: "$claim_object_id" } }
                    ];

                    switch (filter) {
                        case 'filter_medicine':
                            medicine = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_hospitalization':
                            hospitalization = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_medicalConsultation':
                            medicalConsultation = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_laboratory_imaging':
                            laboratory_imaging = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_dental':
                            dental = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_optical':
                            optical = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                        case 'filter_paramedical_professions':
                            paramedical_professions = (await claimStaffDetails.aggregate(arrayData)).length;
                            break;
                    }
                }
            }

            let result = {
                medicine: medicine,
                medicalConsultation: medicalConsultation,
                hospitalization: hospitalization,
                laboratory_imaging: laboratory_imaging,
                optical: optical,
                dental: dental,
                paramedical_professions: paramedical_professions
            };

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "Successfully fetch claims barchart",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: "Failed to fetch claims list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getlistbyclaimType(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            insuranceStaffId,
            limit,
            year,
            claimType

        } = req.query

        try {
            let claimData;
            var dateFilter = {}

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                dateFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }


            var claim_Type = {}

            if (claimType != '') {
                claim_Type = { "mediclaimcommoninfosData.claimType": claimType };
            }




            if (insuranceStaffRole == "INSURANCE_ADMIN") {

                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true };
                var arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        },
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData",
                    },
                    {
                        $match: {
                            ...filterData,
                            ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
                            ...(Object.keys(claim_Type).length > 0 ? claim_Type : {})
                        }
                    },


                    {
                        $lookup: {
                            from: "medicinedetailsonclaims",
                            localField: "mediclaimcommoninfosData._id",
                            foreignField: "for_medicine_claim",
                            as: "claimtypeData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$claimtypeData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $group: {
                            _id: "$claim_object_id",
                            claimType: { $first: '$mediclaimcommoninfosData.claimType' },
                            claimCost: { $first: '$claimtypeData.requestAmount' },
                            claimdate: { $first: '$claimtypeData.createdAt' }


                        }
                    },

                    {
                        $limit: parseInt(limit, 10),
                    },
                ];


                claimData = await claimStaffDetails.aggregate(arrayData)


            } else {
                let filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true };
                let filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };

                var arrayData = [
                    { $match: filter },
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        },
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData",
                    },
                    {
                        $lookup: {
                            from: "medicinedetailsonclaims",
                            localField: "mediclaimcommoninfosData._id",
                            foreignField: "for_medicine_claim",
                            as: "claimtypeData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$claimtypeData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $match: filterData,
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                            claimType: { $first: '$mediclaimcommoninfosData.claimType' },
                            claimCost: { $first: '$claimtypeData.requestAmount' },
                            claimdate: { $first: '$claimtypeData.createdAt' }


                        }
                    },
                    {
                        $limit: parseInt(limit, 10),
                    },
                ];


                claimData = await claimStaffDetails.aggregate(arrayData)
            }


            let result = claimData;



            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully fetch claimlist",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get claimlist",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async gettotalMonthWiseforClaim(req, res) {
        try {

            const { createdDate, updatedDate, insuranceId, insuranceStaffRole, insuranceStaffId, year } = req.query;

            const claimTypes = [
                "medicine",
                "medicalConsultation",
                "hospitalization",
                "Laboratory-Imaging",
                "Optical",
                "Dental",
                "Paramedical-Professions"
            ];

            const monthlyCounts = {};

            var dateFilter = {}
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);

                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj };
            }
            else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }
            var yearFilter = {}

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                yearFilter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }

            console.log(Object.keys(yearFilter).length > 0 ? yearFilter : {}, "yearFilter-------------", yearFilter);
            for (const claimType of claimTypes) {
                let filterData;

                if (insuranceStaffRole === "INSURANCE_ADMIN") {
                    filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType };
                } else {
                    filterData = { "mediclaimcommoninfosData.insuranceId": mongoose.Types.ObjectId(insuranceId), "mediclaimcommoninfosData.claimComplete": true, "mediclaimcommoninfosData.claimType": claimType };
                    const filter = { staff_id: mongoose.Types.ObjectId(insuranceStaffId) };
                    filterData = { ...filterData, ...filter };
                }

                const arrayData = [
                    {
                        $lookup: {
                            from: "mediclaimcommoninfos",
                            localField: "claim_object_id",
                            foreignField: "_id",
                            as: "mediclaimcommoninfosData",
                        }
                    },
                    {
                        $unwind: "$mediclaimcommoninfosData"
                    },
                    {
                        $match: { ...filterData, ...dateFilter }
                    },
                    {
                        $group: {
                            _id: "$claim_object_id",
                            createdAt: { $first: '$mediclaimcommoninfosData.createdAt' }
                        }
                    }
                ];

                const claimData = await claimStaffDetails.aggregate(arrayData);

                const monthlyCount = {};
                moment.months().forEach((month) => {
                    monthlyCount[month] = 0;
                });

                claimData.forEach((item) => {
                    if (item) {
                        const createDate = moment(item.createdAt);
                        const month = createDate.format("MMMM");
                        if (!monthlyCount[month]) {
                            monthlyCount[month] = 1;
                        } else {
                            monthlyCount[month]++;
                        }
                    }
                });

                const formattedClaimType = claimType.replace('-', '_');
                monthlyCounts[formattedClaimType] = monthlyCount;
            }

            sendResponse(req, res, 200, {
                status: true,
                body: monthlyCounts,
                message: `All graph data fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }

    async getMedicineclaimCategoryGraph(req, res) {
        try {
            let { subscriber_id, plan_validity, category_name, service_name } = req.query;
            let check_name = {};
            if (service_name) {
                check_name = { category_name: { $in: JSON.parse(service_name) } }
            } else if (category_name) {
                check_name = { category_name: { $in: JSON.parse(category_name) } }
            } else {
                check_name = {}
            }
            let result = await subscriberUseLimit.find({
                subscriber_id: mongoose.Types.ObjectId(subscriber_id),
                plan_validity: JSON.parse(plan_validity),
                check_name
            });
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `All graph data fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }

    async getAllClaimsForGraph(req, res) {
        try {
            let { portal_id, dateFilter, yearFilter } = req.query;
            console.log("dateFilter_________", dateFilter)
            let portalIds;
            if (portal_id != undefined) {
                portalIds = portal_id.map(id => mongoose.Types.ObjectId(id));
            }
            let filter1 = { for_portal_user: { $in: portalIds }, claimType: { $in: ['medicalConsultation', 'Dental-appointment', 'Optical-appointment', 'Paramedical-Professions-appointment', 'Laboratory-Imaging-appointment'] } };
            let filter2 = { for_portal_user: { $in: portalIds }, claimType: 'hospitalization', requestType: 'pre-auth' };
            // let filter3 = {  for_portal_user: { $in: portalIds },requestType:'pre-auth'};

            if (dateFilter) {
                filter1.createdAt = { $gte: new Date(dateFilter).toISOString() };
                filter2.createdAt = { $gte: new Date(dateFilter).toISOString() };
            }

            if (yearFilter) {
                let yearStart = new Date(`${yearFilter}-01-01T00:00:00.000Z`);
                let yearEnd = new Date(`${yearFilter}-12-31T23:59:59.999Z`);

                filter1.createdAt = { ...filter1.createdAt, $gte: yearStart, $lte: yearEnd };
                filter2.createdAt = { ...filter2.createdAt, $gte: yearStart, $lte: yearEnd };
            }

            const result1 = await MediClaimCommonInfo.find(filter1);
            const result2 = await MediClaimCommonInfo.find(filter2);
            // const result3 = await MediClaimCommonInfo.find(filter3);

            console.log("rrrrrrrrrrrrrrrrrrrr", result1?.length, result2?.length)



            let monthlyCount1 = {};
            let currentYear1 = moment().year();
            moment.months().forEach((month) => {
                monthlyCount1[month] = 0;
            });

            result1.forEach((item) => {
                if (item) {
                    let createDate = moment(item.createdAt);
                    let year = createDate.year();
                    if (year === currentYear1) {
                        let month = createDate.format("MMMM");
                        if (!monthlyCount1[month]) {
                            monthlyCount1[month] = 1;
                        } else {
                            monthlyCount1[month]++;
                        }
                    }
                }
            });
            // console.log("monthlyCount1________",monthlyCount1)

            let monthlyCount2 = {};
            let currentYear2 = moment().year();
            moment.months().forEach((month) => {
                monthlyCount2[month] = 0;
            });

            result2.forEach((item) => {
                if (item) {
                    let createDate = moment(item.createdAt);
                    let year = createDate.year();
                    if (year === currentYear2) {
                        let month = createDate.format("MMMM");
                        if (!monthlyCount2[month]) {
                            monthlyCount2[month] = 1;
                        } else {
                            monthlyCount2[month]++;
                        }
                    }
                }
            });

            let filter4 = { for_portal_user: { $in: portalIds }, claimComplete: true };
            if (dateFilter) {
                filter4.createdAt = { $lte: new Date(dateFilter).toISOString() };
            }

            if (yearFilter) {
                let yearStart = new Date(`${yearFilter}-01-01T00:00:00.000Z`);
                let yearEnd = new Date(`${yearFilter}-12-31T23:59:59.999Z`);

                filter4.createdAt = { ...filter4.createdAt, $gte: yearStart, $lte: yearEnd };
            }

            const submittedClaim = await MediClaimCommonInfo.countDocuments(filter4);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data1: monthlyCount1,
                    data2: monthlyCount2,
                    submittedClaimCount: submittedClaim
                },
                message: `All data fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }

    async getAmountForPharmacy(req, res) {
        try {
            let { pharmacyId, createdDate, updatedDate } = req.query;

            const dateFilter = {};

            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);

                dateFilter.$and = [
                    { createdAt: { $gte: createdDateObj } },
                    { createdAt: { $lte: updatedDateObj } },
                ];
            } else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                dateFilter.createdAt = { $gte: createdDateObj };
            } else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }

            let amountDetails = await MediClaimCommonInfo.find({ for_portal_user: pharmacyId, ...dateFilter, });

            let alltotalApprovedAmount = 0;
            let alltotalRequestedAmount = 0;
            let alltotalCoPayment = 0;
            amountDetails.forEach((item) => {
                if (item.totalApprovedAmount != null && !isNaN(item.totalApprovedAmount)) {
                    alltotalApprovedAmount += parseFloat(item.totalApprovedAmount);
                }
            });
            amountDetails.forEach((item) => {
                if (item.totalRequestedAmount != null && !isNaN(item.totalRequestedAmount)) {
                    alltotalRequestedAmount += parseFloat(item.totalRequestedAmount);
                }
            });
            amountDetails.forEach((item) => {
                if (item.totalCoPayment != null && !isNaN(item.totalCoPayment)) {
                    alltotalCoPayment += parseFloat(item.totalCoPayment);
                }
            });

            let monthlyCoPayment = {};
            let currentYear = moment().year();

            moment.months().forEach((month) => {
                monthlyCoPayment[month] = 0;
            });

            amountDetails.forEach((item) => {
                if (item) {
                    let createDate = moment(item.createdAt);
                    let year = createDate.year();
                    let month = createDate.format("MMMM");
                    if (item.totalCoPayment != null && !isNaN(item.totalCoPayment)) {
                        if (year === currentYear) {
                            monthlyCoPayment[month] += parseFloat(item.totalCoPayment);
                        }
                    }
                }
            });

            let monthlyInsuredPayment = {};
            moment.months().forEach((month) => {
                monthlyInsuredPayment[month] = 0;
            });

            amountDetails.forEach((item) => {
                if (item) {
                    let createDate = moment(item.createdAt);
                    let year = createDate.year();
                    let month = createDate.format("MMMM");
                    if (item.totalApprovedAmount != null && !isNaN(item.totalApprovedAmount)) {
                        if (year === currentYear) {
                            monthlyInsuredPayment[month] += parseFloat(item.totalApprovedAmount);
                        }
                    }
                }
            });

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    alltotalApprovedAmount: alltotalApprovedAmount.toFixed(2),
                    alltotalRequestedAmount: alltotalRequestedAmount.toFixed(2),
                    alltotalCoPayment: alltotalCoPayment.toFixed(2),
                    monthlyInsuredPayment: monthlyInsuredPayment,
                    monthlyCoPayment: monthlyCoPayment
                },
                message: `All data fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error, "error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }

    async getClaimAmountForPharmacyHistory(req, res) {
        try {
            let { pharmacyId, createdDate, updatedDate, searchKey } = req.query;

            const dateFilter = {};
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);

                dateFilter.$and = [
                    { createdAt: { $gte: createdDateObj } },
                    { createdAt: { $lte: updatedDateObj } },
                ];
            } else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                dateFilter.createdAt = { $gte: createdDateObj };
            } else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }

            // let claimamountDetails = await MediClaimCommonInfo.find({for_portal_user: pharmacyId , ...dateFilter}).select('totalApprovedAmount insuranceId');

            let searchFilter;
            if (searchKey !== "") {
                searchFilter = { 'subscriberssdetails.subscriber_full_name': { $regex: searchKey || "", $options: "i" } }
            }

            let claimamountDetails = await MediClaimCommonInfo.aggregate([
                {
                    $match: {
                        for_portal_user: mongoose.Types.ObjectId(pharmacyId),
                        ...dateFilter
                    }
                },
                {
                    $addFields: {
                        patientObjectId: { $toObjectId: "$patientId" }
                    }
                },
                {
                    $lookup: {
                        from: "insurancesubscribers",
                        localField: "patientObjectId",
                        foreignField: "_id",
                        as: "subscriberssdetails"
                    }
                },
                {
                    $match: searchFilter || {}
                },
                {
                    $addFields: {
                        patientName: { $arrayElemAt: ["$subscriberssdetails.subscriber_full_name", 0] }
                    }
                },
                {
                    $project: {
                        totalApprovedAmount: 1,
                        insuranceId: 1,
                        createdAt: 1,
                        transaction_id: "NA",
                        payment_mode: "OFFLINE",
                        patientName: 1,
                        _id: 0
                    }
                }
            ]);

            sendResponse(req, res, 200, {
                status: true,
                data: claimamountDetails,
                message: `All data fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error, "_______error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }
}



module.exports = new MedicineClaimController();