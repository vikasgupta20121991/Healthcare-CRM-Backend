"use strict";
import mongoose from "mongoose";

// models
import medicineClaimCommonInfo from "../models/medicineClaim/commonInfo";
import MedicineDetailsOnClaim from "../models/medicineClaim/medicineDetailsOnClaim";
import MedicineClaimDocument from "../models/medicineClaim/medicineClaimDocument";
// import Pharmacy from "../models/admin_info"
import AdminInfo from "../models/admin_info";


// utils
import { sendResponse } from "../helpers/transmission";
import { getDocument, getDocuments } from "../helpers/s3";
import { getNextSequenceValue } from "../middleware/utils";
import Http from "../helpers/httpservice"
const httpService = new Http()

class MedicineClaimController {
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
            preAuthReclaimId
        } = req.body
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
            var claimData
            if (claimId == "") {
                const claim_id = await getNextSequenceValue("claim_Id");

                const claimDetails = new medicineClaimCommonInfo({
                    service,
                    patientId,
                    ePrescriptionNumber,
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
            } else {
                claimData = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId, for_portal_user: pharmacyId },
                    {
                        $set: {
                            service,
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
            claimObjectId
        } = req.body
        try {
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
            claimObjectId
        } = req.body
        try {
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
        } catch (error) {
            // console.log(error);
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
            prescriberCenterInfo
        } = req.body
        try {
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
            accidentRelatedField
        } = req.body
        try {
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

    async serviceType(req, res) {
        const {

            pharmacyId,
            claimObjectId,
            medicineDetails,
            totalCoPayment,
            totalRequestedAmount,
            totalCostOfAllMedicine,
            reimbursmentRate
        } = req.body
        try {
            const allData = await MedicineDetailsOnClaim.find({ for_medicine_claim: claimObjectId, for_portal_user: pharmacyId });
            const inputArray = medicineDetails
            var existData = []
            let addNewData = []
            var removeID = []
            if (allData.length > 0) {
                for (let oneData of allData) {
                    inputArray.map(async (singleData) => {
                        if (oneData.medicineId == singleData.medicineId) {
                            await MedicineDetailsOnClaim.findOneAndUpdate(
                                { _id: oneData._id },
                                {
                                    $set: {
                                        quantityPrescribed: singleData.quantityPrescribed,
                                        quantityDelivered: singleData.quantityDelivered,
                                        frequency: singleData.frequency,
                                        duration: singleData.duration,
                                        pricePerUnit: singleData.pricePerUnit,
                                        coPayment: singleData.coPayment,
                                        requestAmount: singleData.requestAmount,
                                        totalCost: singleData.totalCost,
                                        comment: singleData.comment,
                                    }
                                },
                                { new: true }
                            ).exec();
                            addNewData.push({ id: oneData.medicineId })
                            removeID.push({ id: oneData._id })
                        }
                    })
                }
            } else {
                inputArray.map((singleData) => {
                    existData.push(singleData)
                })
            }
            const array3 = allData.filter(entry1 => !removeID.some(entry2 => entry1._id === entry2.id));
            const array4 = inputArray.filter(entry1 => !addNewData.some(entry2 => entry1.medicineId === entry2.id));
            if (array4.length > 0) {
                existData = array4
            }
            if (array3.length > 0) {
                let ids = array3.map(value => value._id)
                await MedicineDetailsOnClaim.deleteMany({ _id: { $in: ids } })
            }
            var uniqueData
            if (existData.length > 0) {
                uniqueData = existData
            } else {
                // return sendResponse(req, res, 200, {
                //     status: false,
                //     data: null,
                //     message: "Already added medicine details",
                //     errorCode: null,
                // });
            }
            const uniqueList = uniqueData.map((singleData) => ({
                ...singleData,
                for_medicine_claim: claimObjectId,
                for_portal_user: pharmacyId
            }));

            const result = await MedicineDetailsOnClaim.insertMany(uniqueList)
            await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: pharmacyId, _id: claimObjectId },
                {
                    $set: {
                        totalCoPayment,
                        totalRequestedAmount,
                        totalCostOfAllMedicine,
                        reimbursmentRate
                    }
                },
                { new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added medicine details on claim details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
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
            documentData
        } = req.body
        try {
            var result
            const list = documentData.map((singleData) => ({
                ...singleData,
                for_medicine_claim: claimObjectId,
                for_portal_user: pharmacyId
            }));
            result = await MedicineClaimDocument.insertMany(list)

            // var data =  documentData.map((singleData) => {
            //     ...singleData,
            //     for_medicine_claim: claimObjectId,
            //     for_portal_user: pharmacyId
            // })
            // const medicineClaimDocument = new MedicineClaimDocument({
            //     documentData,
            // })
            // result = await medicineClaimDocument.save();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added claim document",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
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
            console.log(documentId, "check id");
            var result = await MedicineClaimDocument.findOneAndDelete({ _id: documentId })

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added claim document",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add claim document",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async eSignature(req, res) {
        const {
            pharmacyId,
            claimObjectId,
            eSignature
        } = req.body
        try {
            const result = await medicineClaimCommonInfo.findOneAndUpdate(
                { for_portal_user: pharmacyId, _id: claimObjectId },
                {
                    $set: {
                        eSignature
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully added e-signature",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
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
            previewtemplate
        } = req.body
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const medicineResult = await medicineClaimCommonInfo.findOne({ _id: claimObjectId })
            const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: medicineResult.patientId }, headers, 'insuranceServiceUrl');
            var status = medicineResult.status
            var result
            if (status == "pending") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            claimComplete: true,
                            healthPlanId: subscriberDetails.body.plan,
                            previewtemplate
                        }
                    },
                    { upsert: true, new: true }
                ).exec();
            } else {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId, _id: claimObjectId },
                    {
                        $set: {
                            claimComplete: true,
                            healthPlanId: subscriberDetails.body.plan,
                            status: "pending",
                            previewtemplate
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
        } catch (error) {
            console.log(error);
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
        try {

            var pharmacyId = pharmacyIds.split(',')
            let filter
            pharmacyId.map(id => mongoose.Types.ObjectId(id))
            if (status == "") {
                filter = {
                    for_portal_user: { $in: pharmacyId },
                    claimType: "medicine",
                    requestType: "pre-auth"
                }
            } else {
                filter = {
                    status,
                    for_portal_user: { $in: pharmacyId },
                    claimType: "medicine",
                    requestType: "medical-products"
                }
            }

            if (insuranceIds != "" && insuranceIds != undefined) {
                var allInsId = insuranceIds.split(',')
                // idsArrayisuranceid = isuranceid.map(id => mongoose.Types.ObjectId(id))
                filter['insuranceId'] = { $in: allInsId }
            }

            if (fromdate != undefined && todate != undefined) {
                filter["claimComplete"] = true
                if (fromdate != "" && todate != '' && fromdate != todate) {
                    filter['createdAt'] = { $gte: fromdate, $lte: todate }
                } else if (fromdate == todate) {
                    filter['createdAt'] = { $gte: `${fromdate}T00:00:00.115Z`, $lte: `${todate}T23:59:59.115Z` }
                }

                if (fromdate != "" && todate == '') {
                    filter['createdAt'] = { $gte: fromdate }
                }

                if (fromdate == "" && todate != '') {
                    filter['createdAt'] = { $lte: todate }
                }
            }

            const result = await medicineClaimCommonInfo.find(filter)
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            for (let index = 0; index < result.length; index++) {
                const insuranceId = result[index].insuranceId;
                const insuranceDetails = await httpService.getStaging('insurance/get-insurance-details-by-portal-id', { portal_id: insuranceId }, {}, 'insuranceServiceUrl');
                result[index].insurance_company_name = insuranceDetails.body.adminData.company_name

                const subscriberId = result[index].patientId;
                const subscriberDetails = await httpService.getStaging('insurance-subscriber/get-subscriber-details-for-claim', { subscriber_id: subscriberId }, {}, 'insuranceServiceUrl');
                result[index].subscriber_name = subscriberDetails.body.subscriber_details.subscriber_full_name
                result[index].subscriber_insurance_id = subscriberDetails.body.subscriber_details.insurance_id

                const pharmacyName = await AdminInfo.findOne({ for_portal_user: result[index].pharmacy_id }, { pharmacy_name: 1 })
                result[index].pharmacy_name = pharmacyName.pharmacy_name


                // const profilePicKey = result[index].profile_picture;
                // if (profilePicKey != "") {
                //     const profilePictureArray = [profilePicKey]
                //     const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, {}, 'pharmacyServiceUrl');
                //     result[index].profile_picture = pharmacyLogo.data[0]
                // }
            }


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
            console.log(error);
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
            console.log(error);
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
            var result
            var count
            if (status == "") {
                if (insuranceStaffRole == "INSURANCE_ADMIN") {
                    result = await medicineClaimCommonInfo.find({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth" })
                        .sort([["createdAt", -1]])
                        .limit(limit * 1)
                        .skip((page - 1) * limit)
                        .exec();
                    count = await medicineClaimCommonInfo.countDocuments({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth" });
                } else {
                    if (insuranceStaffRole == "Receptionist") {
                        result = await medicineClaimCommonInfo.find({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth", $or: [{ for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } }, { is_approved_by_receptionist: null }], })
                            .sort([["createdAt", -1]])
                            .limit(limit * 1)
                            .skip((page - 1) * limit)
                            .exec();
                        count = await medicineClaimCommonInfo.countDocuments({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth", $or: [{ for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } }, { is_approved_by_receptionist: null }], });
                    } else {
                        result = await medicineClaimCommonInfo.find({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth", for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } })
                            .sort([["createdAt", -1]])
                            .limit(limit * 1)
                            .skip((page - 1) * limit)
                            .exec();
                        count = await medicineClaimCommonInfo.countDocuments({ insuranceId, claimComplete: true, claimType: "medicine", requestType: "pre-auth", for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } });
                    }
                }
            } else {
                if (status == "pending") {
                    if (insuranceStaffRole == "INSURANCE_ADMIN") {
                        result = await medicineClaimCommonInfo.find({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products" })
                            .sort([["createdAt", -1]])
                            .limit(limit * 1)
                            .skip((page - 1) * limit)
                            .exec();
                        count = await medicineClaimCommonInfo.countDocuments({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products" });
                    } else {
                        if (insuranceStaffRole == "Receptionist") {
                            result = await medicineClaimCommonInfo.find({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products", $or: [{ for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } }, { is_approved_by_receptionist: null }], })
                                .sort([["createdAt", -1]])
                                .limit(limit * 1)
                                .skip((page - 1) * limit)
                                .exec();
                            count = await medicineClaimCommonInfo.countDocuments({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products", $or: [{ for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } }, { is_approved_by_receptionist: null }], });
                        } else {
                            result = await medicineClaimCommonInfo.find({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products", for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } })
                                .sort([["createdAt", -1]])
                                .limit(limit * 1)
                                .skip((page - 1) * limit)
                                .exec();
                            count = await medicineClaimCommonInfo.countDocuments({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products", for_added_insurance_staff: { $elemMatch: { insurance_staff_id: insuranceStaffId } } });
                        }
                    }
                } else {
                    result = await medicineClaimCommonInfo.find({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products" })
                        .sort([["createdAt", -1]])
                        .limit(limit * 1)
                        .skip((page - 1) * limit)
                        .exec();
                    count = await medicineClaimCommonInfo.countDocuments({ status, insuranceId, claimComplete: true, claimType: "medicine", requestType: "medical-products" });
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
                message: "successfully get medicine claim list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
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
            claimId
        } = req.query
        const headers = {
            'Authorization': req.headers['authorization']
        }
        const claimDetail = await medicineClaimCommonInfo.findOne({ claimId })
        var pipeline
        if (claimDetail.deliverCenterInfo.deliverCenter != null) {
            pipeline = [
                {
                    $match: {
                        claimId: claimId
                    }
                },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "deliverCenterInfo.deliverCenter",
                        foreignField: "for_portal_user",
                        as: "deliverCenterName",
                    }
                },
                { $unwind: "$deliverCenterName" },
                {
                    $set: {
                        "deliverCenterName": "$deliverCenterName.pharmacy_name",
                    }
                },
                {
                    $lookup: {
                        from: "medicinedetailsonclaims",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicinedetailsonclaims",
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
            ]
        } else {
            pipeline = [
                {
                    $match: {
                        claimId: claimId
                    }
                },
                {
                    $lookup: {
                        from: "medicinedetailsonclaims",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicinedetailsonclaims",
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
            ]
        }

        try {
            var result = await medicineClaimCommonInfo.aggregate(pipeline)
            if (claimDetail.deliverCenterInfo.deliverCenter != null) {
                var subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: result[0].patientId }, headers, 'insuranceServiceUrl');
            }


            if (result[0]?.eSignature?.signature != undefined) {
                console.log("check inner part");
                // result[0].eSignature.signature_signed_url = await getDocument(result[0].eSignature.signature)
            }

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

            if (subscriberDetails) {
                result[0].subscriberDetails = {
                    subscriber_id: subscriberDetails.body._id,
                    subscriber_type: subscriberDetails.body.subscriber_type,
                    subscription_for: subscriberDetails.body.subscription_for,
                    health_plan: subscriberDetails.body.health_plan_for
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get medicine claim details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 200, {
                status: false,
                data: error,
                message: error.message ? error.message : "failed to get medicine claim details",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimDetailsInsurance(req, res) {
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
                        from: "admininfos",
                        localField: "deliverCenterInfo.deliverCenter",
                        foreignField: "for_portal_user",
                        as: "deliverCenterInfo.deliverCenter",
                    }
                },
                { $unwind: "$deliverCenterInfo.deliverCenter" },
                {
                    $set: {
                        deliverCenterInfo: { deliverCenter: "$deliverCenterInfo.deliverCenter.pharmacy_name" }
                    }
                },
                {
                    $lookup: {
                        from: "medicinedetailsonclaims",
                        localField: "_id",
                        foreignField: "for_medicine_claim",
                        as: "medicinedetailsonclaims",
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
            ])
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
            const subscriberDetails = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: result[0].patientId }, headers, 'insuranceServiceUrl');
            // const patientMedicalDetails = await httpService.getStaging('patient/patient-medical-details-by-subscriberId-for-claim-details', { subscriber_id: result[0].patientId }, headers, 'patientServiceUrl');
            // console.log(patientMedicalDetails,"patientMedicalDetails");
            const previousClaim = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        patientId: { $eq: result[0].patientId },
                        $nor: [{ is_approved_by_cfo: null }]
                    }
                },
                // {
                //     $lookup: {
                //         from: "admininfos",
                //         localField: "deliverCenterInfo.deliverCenter",
                //         foreignField: "for_portal_user",
                //         as: "deliverCenterInfo.deliverCenter",
                //     }
                // },
                // { $unwind: "$deliverCenterInfo.deliverCenter" },
                // {
                //     $set: {
                //         deliverCenterInfo: { deliverCenter: "$deliverCenterInfo.deliverCenter.pharmacy_name" }
                //     }
                // },
                // {
                //     $lookup: {
                //         from: "medicinedetailsonclaims",
                //         localField: "_id",
                //         foreignField: "for_medicine_claim",
                //         as: "medicinedetailsonclaims",
                //     }
                // },
                // {
                //     $lookup: {
                //         from: "medicineclaimdocs",
                //         localField: "_id",
                //         foreignField: "for_medicine_claim",
                //         as: "medicineclaimdocs",
                //     }
                // },
            ])
            // console.log(previousClaim);
            for (let index = 0; index < previousClaim.length; index++) {
                const element = previousClaim[index];
                const subscriberData = await httpService.getStaging('insurance/get-subscriber-details-for-claim', { subscriberId: element.patientId }, headers, 'insuranceServiceUrl');
                element.plan_name = subscriberData.body.plan.name
            }
            var nextRoleArray = []
            var updatedClaim
            if (insuranceStaffRole != "INSURANCE_ADMIN") {
                if (result[0].for_current_insurance_staff == null) {
                    const claimData = await medicineClaimCommonInfo.findOne({ claimId })
                    if (claimData.is_approved_by_receptionist == null && insuranceStaffRole == "Receptionist") {
                        updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                            { claimId },
                            {
                                $set: {
                                    for_added_insurance_staff: insuranceStaffList,
                                    for_current_insurance_staff: insuranceStaffId,
                                    for_current_insurance_staff_role: insuranceStaffRole,
                                }
                            },
                            { new: true }
                        )
                    }
                    if (claimData.is_approved_by_medical_advisor == null && insuranceStaffRole == "Medical Advisor") {
                        updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                            { claimId },
                            {
                                $set: {
                                    for_current_insurance_staff: insuranceStaffId,
                                    for_current_insurance_staff_role: insuranceStaffRole,
                                }
                            },
                            { new: true }
                        )
                    }
                    if (claimData.is_approved_by_contract_advisor == null && insuranceStaffRole == "Contract Advisor") {
                        updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                            { claimId },
                            {
                                $set: {
                                    for_current_insurance_staff: insuranceStaffId,
                                    for_current_insurance_staff_role: insuranceStaffRole,
                                }
                            },
                            { new: true }
                        )
                    }
                    if (claimData.is_approved_by_cfo == null && insuranceStaffRole == "CFO") {
                        updatedClaim = await medicineClaimCommonInfo.findOneAndUpdate(
                            { claimId },
                            {
                                $set: {
                                    for_current_insurance_staff: insuranceStaffId,
                                    for_current_insurance_staff_role: insuranceStaffRole,
                                }
                            },
                            { new: true }
                        )
                    }
                    result = await medicineClaimCommonInfo.aggregate([
                        {
                            $match: {
                                claimId
                            }
                        },
                        {
                            $lookup: {
                                from: "admininfos",
                                localField: "deliverCenterInfo.deliverCenter",
                                foreignField: "for_portal_user",
                                as: "deliverCenterInfo.deliverCenter",
                            }
                        },
                        { $unwind: "$deliverCenterInfo.deliverCenter" },
                        {
                            $set: {
                                deliverCenterInfo: { deliverCenter: "$deliverCenterInfo.deliverCenter.pharmacy_name" }
                            }
                        },
                        {
                            $lookup: {
                                from: "medicinedetailsonclaims",
                                localField: "_id",
                                foreignField: "for_medicine_claim",
                                as: "medicinedetailsonclaims",
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
                    ])
                    if (result[0].is_approved_by_medical_advisor == null && insuranceStaffRole != "Medical Advisor") {
                        nextRoleArray.push("Medical Advisor")
                    }
                    if (result[0].is_approved_by_contract_advisor == null && insuranceStaffRole != "Contract Advisor") {
                        nextRoleArray.push("Contract Advisor")
                    }
                    if (result[0].is_approved_by_cfo == null && insuranceStaffRole != "CFO") {
                        nextRoleArray.push("CFO")
                    }

                    return sendResponse(req, res, 200, {
                        status: true,
                        data: {
                            result: result[0],
                            subscriberDetails: {
                                subscriber_type: subscriberDetails.body.subscriberData.subscriber_type,
                                subscription_for: subscriberDetails.body.subscriberData.subscription_for,
                                health_plan: subscriberDetails.body.plan,
                                plan_service: subscriberDetails.body.planService,
                                plan_exclusion: subscriberDetails.body.planExclusion,
                            },
                            previousClaim,
                            nextRoleArray
                        },
                        message: "Get medicine claim details",
                        errorCode: null,
                    });
                } else {
                    if (result[0].is_approved_by_medical_advisor == null && insuranceStaffRole != "Medical Advisor") {
                        nextRoleArray.push("Medical Advisor")
                    }
                    if (result[0].is_approved_by_contract_advisor == null && insuranceStaffRole != "Contract Advisor") {
                        nextRoleArray.push("Contract Advisor")
                    }
                    if (result[0].is_approved_by_cfo == null && insuranceStaffRole != "CFO") {
                        nextRoleArray.push("CFO")
                    }
                    if (result[0].for_current_insurance_staff == insuranceStaffId) {
                        return sendResponse(req, res, 200, {
                            status: true,
                            data: {
                                result: result[0],
                                subscriberDetails: {
                                    subscriber_type: subscriberDetails.body.subscriberData.subscriber_type,
                                    subscription_for: subscriberDetails.body.subscriberData.subscription_for,
                                    health_plan: subscriberDetails.body.plan,
                                    plan_service: subscriberDetails.body.planService,
                                    plan_exclusion: subscriberDetails.body.planExclusion,
                                },
                                previousClaim,
                                nextRoleArray
                            },
                            message: `Get medicine claim details`,
                            errorCode: null,
                        });
                    }
                    const insuranceStaffDetails = await httpService.getStaging('insurance/get-staff-details', { staff_id: result[0].for_current_insurance_staff }, headers, 'insuranceServiceUrl');
                    var assignedStaffName = insuranceStaffDetails.body.staffData.staff_name
                    var assignedStaffRole = insuranceStaffDetails.body.staffData.role.name
                    // console.log(insuranceStaffDetails);
                    return sendResponse(req, res, 200, {
                        status: true,
                        data: {
                            result: result[0],
                            subscriberDetails: {
                                subscriber_type: subscriberDetails.body.subscriberData.subscriber_type,
                                subscription_for: subscriberDetails.body.subscriberData.subscription_for,
                                health_plan: subscriberDetails.body.plan,
                                plan_service: subscriberDetails.body.planService,
                                plan_exclusion: subscriberDetails.body.planExclusion,
                            },
                            previousClaim
                        },
                        message: `${assignedStaffName},${assignedStaffRole} is working on this Claim, Please choose another claim`,
                        errorCode: `ASSIGNED_STAFF`,
                    });
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result: result[0],
                    subscriberDetails: {
                        subscriber_type: subscriberDetails.body.subscriberData.subscriber_type,
                        subscription_for: subscriberDetails.body.subscriberData.subscription_for,
                        health_plan: subscriberDetails.body.plan,
                        plan_service: subscriberDetails.body.planService,
                        plan_exclusion: subscriberDetails.body.planExclusion,
                    },
                    previousClaim
                },
                message: "Get medicine claim details",
                errorCode: null,
            });
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
            action
        } = req.body

        try {
            var status = "rejected"
            if (action == true) {
                status = "approved"
            }
            const claimData = await medicineClaimCommonInfo.findOne({ claimId })
            if (!claimData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: error,
                    message: "No record found",
                    errorCode: null,
                });
            }

            const insuranceStaffDetails = await httpService.getStaging('insurance/get-staff-details', { staff_id: insuranceStaffId }, {}, 'insuranceServiceUrl');
            const StaffRole = insuranceStaffDetails.body.staffData.role.name
            var updatedClaim
            if (StaffRole == "Receptionist") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "receptionist.id": insuranceStaffId,
                            "receptionist.isApproved": action
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "Medical Advisor") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            'medicalAdvisor.id': insuranceStaffId,
                            'medicalAdvisor.isApproved': action,
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "Contract Advisor") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "contractAdvisor.id": insuranceStaffId,
                            "contractAdvisor.isApproved": action,
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "CFO") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "cfo.id": insuranceStaffId,
                            "cfo.isApproved": action,
                        }
                    },
                    { new: true }
                )
            }

            sendResponse(req, res, 200, {
                status: true,
                data: updatedClaim,
                message: `medicine ${status} by ${StaffRole}`,
                errorCode: null,
            });

        } catch (error) {
            console.log(error,"check error12345");
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
            medicineId,
            insuranceStaffId,
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

            const insuranceStaffDetails = await httpService.getStaging('insurance/get-staff-details', { staff_id: insuranceStaffId }, {}, 'insuranceServiceUrl');
            var StaffRole = insuranceStaffDetails.body.staffData.role.name
            var updatedClaim
            if (StaffRole == "Receptionist") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "receptionist.id": insuranceStaffId,
                            "receptionist.comment": comment
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "Medical Advisor") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "medicalAdvisor.id": insuranceStaffId,
                            "medicalAdvisor.comment": comment
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "Contract Advisor") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "contractAdvisor.id": insuranceStaffId,
                            "contractAdvisor.comment": comment,
                            "contractAdvisor.approvedAmount": approvedAmount,
                        }
                    },
                    { new: true }
                )
            }
            if (StaffRole == "CFO") {
                updatedClaim = await MedicineDetailsOnClaim.findOneAndUpdate(
                    { for_medicine_claim: claimData._id, _id: medicineId },
                    {
                        $set: {
                            "cfo.id": insuranceStaffId,
                            "cfo.comment": comment,
                            "cfo.approvedAmount": approvedAmount
                        }
                    },
                    { new: true }
                )
            }

            sendResponse(req, res, 200, {
                status: true,
                data: updatedClaim,
                message: `Comment added for medicine by ${StaffRole}`,
                errorCode: null,
            });

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to add comment by ${StaffRole}`,
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
        } = req.body
        const claimData = await medicineClaimCommonInfo.findOne({ claimId }, { for_added_insurance_staff: 1 })
        const existingInsuranceStaff = claimData.for_added_insurance_staff
        Array.prototype.push.apply(insuranceStaffList, existingInsuranceStaff);
        try {
            var result
            if (insuranceStaffRole == "Receptionist") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    // {
                    //     $push: {
                    //         "for_added_insurance_staff": {
                    //             $each: insuranceStaffList
                    //         }
                    //     }
                    // },
                    {
                        $set: {
                            for_added_insurance_staff: insuranceStaffList,
                            // for_current_insurance_staff_role: "Medical Advisor",
                            for_current_insurance_staff: null,
                            is_approved_by_receptionist: true
                        }
                    },
                    { new: true }
                ).exec();
            }
            if (insuranceStaffRole == "Medical Advisor") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    {
                        $set: {
                            for_added_insurance_staff: insuranceStaffList,
                            // for_current_insurance_staff_role: "Contract Advisor",
                            for_current_insurance_staff: null,
                            is_approved_by_medical_advisor: true
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
                            for_added_insurance_staff: insuranceStaffList,
                            // for_current_insurance_staff_role: "CFO",
                            for_current_insurance_staff: null,
                            is_approved_by_contract_advisor: true,
                            totalApprovedAmountByContractAdvisor: approvedAmount
                        }
                    },
                    { new: true }
                ).exec();
            }
            if (insuranceStaffRole == "CFO") {
                result = await medicineClaimCommonInfo.findOneAndUpdate(
                    { claimId },
                    {
                        $set: {
                            for_added_insurance_staff: insuranceStaffList,
                            for_current_insurance_staff: null,
                            is_approved_by_cfo: true
                        }
                    },
                    { new: true }
                ).exec();
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
        if (insuranceStaffRole == "INSURANCE_ADMIN") {
            matchFilter = [
                {
                    insuranceId: mongoose.Types.ObjectId(insuranceId)
                },
                {
                    claimComplete: true
                }
            ]
        } else {
            matchFilter = [
                {
                    insuranceId: mongoose.Types.ObjectId(insuranceId)
                },
                {
                    claimComplete: true
                },
                {
                    for_added_insurance_staff: {
                        $elemMatch: {
                            insurance_staff_id: {
                                $eq: mongoose.Types.ObjectId(insuranceStaffId)
                            }
                        }
                    }
                }
            ]
        }
        try {
            const result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        $and: matchFilter
                    }
                },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { _id: 1, count: 1 } }
            ]).exec();
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
        const { pharmacyId } = req.query
        try {
            const result = await medicineClaimCommonInfo.aggregate([
                {
                    $match: {
                        for_portal_user: mongoose.Types.ObjectId(pharmacyId)
                    }
                },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { _id: 1, count: 1 } }
            ]).exec();
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

    async claimResubmitByInsuranceStaff(req, res) {
        const {
            insuranceStaffId,
            resubmitReason,
            claimId
        } = req.body
        try {
            var result = await medicineClaimCommonInfo.findOneAndUpdate(
                { claimId },
                {
                    $set: {
                        "resubmit.resubmittedBy": insuranceStaffId,
                        "resubmit.resubmitReason": resubmitReason,
                        "resubmit.isClaimResubmitted": true,
                        status: "resubmit"
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully resubmit medicine claim",
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


    async getInsuranceAcceptedList(req, res) {
        try {
            const { pharmacyId } = req.query
            console.log(pharmacyId, "pharmacyId___________");
            let insuranceAccepted = await AdminInfo.findOne(
                { for_portal_user: pharmacyId },
                { insurance_accepted: 1 }
            );
            if (insuranceAccepted) {
                const insuranceAcceptedIds = insuranceAccepted.insurance_accepted;
                const insuranceDetailsArray = [];

                for (const id of insuranceAcceptedIds) {

                    const insuranceStaffDetails = await httpService.getStaging('insurance/get-Insurance-By-Id', { for_portal_user: id }, {}, 'insuranceServiceUrl');
                    if (insuranceStaffDetails.body) {
                        insuranceDetailsArray.push({
                            _id: id,
                            company_name: insuranceStaffDetails.body.company_name,
                            for_portal_user: insuranceStaffDetails.body.for_portal_user
                        });
                    }
                    console.log(insuranceStaffDetails, "abc abc");

                }
                // res.status(200).json({
                //     status: true,
                //     body: insuranceDetailsArray,
                //     errorCode: null,
                // });

                sendResponse(req, res, 200, {
                    status: true,
                    body: insuranceDetailsArray,
                    message: "successfully get insurance list",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: [],
                    message: "No Insurance Found",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "eorrorororororor123");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get insurance accepted list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getPharamacyAcceptedListPatient(req, res) {
        try {
            const { insuranceId } = req.query
            console.log(insuranceId, "id check");
            let insuranceAccepted = await AdminInfo.find(
                { insurance_accepted: { $in: insuranceId } }
            );
            // console.log(insuranceAccepted, "check log");
            const insuranceDetailsArray = [];
            insuranceAccepted.forEach(insurance => {
                insuranceDetailsArray.push({
                    for_portal_user: insurance.for_portal_user,
                    pharmacy_name: insurance.pharmacy_name,
                });
            });
            // res.status(200).json({
            //     status: true,
            //     body: insuranceDetailsArray,
            //     errorCode: null,
            // });
            sendResponse(req, res, 200, {
                status: true,
                body: insuranceDetailsArray,
                message: "successfully get pharmacy list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get pharmacy list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



   

}


module.exports = new MedicineClaimController();
