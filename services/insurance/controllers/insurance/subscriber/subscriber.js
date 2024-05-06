const fs = require('fs');
const reader = require('xlsx')
const stream = require('stream');
const csv = require('fast-csv');
const PushToDB = require('./pushToDB');
import { sendResponse } from "../../../helpers/transmission";
import Subscriber from "../../../models/insurance/subscriber/subscriber"
import SubscriberPlanHistory from "../../../models/insurance/subscriber/subscriberPlanHistory"
import PlanService from '../../../models/insurance/plan/service'
import PlanServiceNew from '../../../models/insurance/plan/service2'
import PlanExclusion from '../../../models/insurance/plan/exclusion'
import PlanExclusionNew from '../../../models/insurance/plan/exclusion2'
import Plan from "../../../models/insurance/plan"
import subscribertype from "../../../models/insurance/subscriber/subscribertype"
import { CompanySubscriberColumn, PrimarySubscriberColumn } from "../../../config/constants";
const Http = require("../../../helpers/httpservice")
import { uploadFile, getFile, getDocument1 } from "../../../helpers/s3";
import { formatString } from "../../../helpers/string";
import mongoose, { Mongoose, mongo } from "mongoose";
import admininfos from "../../../models/insurance/user/admin_info";
import { processExcel, processExcelsubscriber } from "../../../middleware/utils";
import moment from "moment";
import subscriber from "../../../models/insurance/subscriber/subscriber";
import PlansDetailOfSubscriber from "../../../models/insurance/subscriber/healthPlanDetails";
import SubscriptionPurchaseStatus from "../../../models/subscription/purchasestatus";
import PortalUser from "../../../models/insurance/user/portal_user";
import Staffinfos from "../../../models/insurance/user/staff_info";
import { getData } from "../user/user";
const { ObjectId } = require('mongodb');
const express = require('express');
const path = require('path');
const app = express();
const NodeCache = require("node-cache");
const myCache = new NodeCache();


const httpService = new Http();
const validateColumnWithExcel = (toValidate, excelColumn) => {
    // console.log(toValidate,"----check------",excelColumn);
    for (const key in excelColumn) {
        const element = excelColumn[key];
        if (element.trim() == "" && key.includes("__EMPTY")) {
            delete excelColumn[key]
        }
    }
    const requestBodyCount = Object.keys(toValidate).length
    const fileColumnCount = Object.keys(excelColumn).length
    console.log(requestBodyCount, "------Check____________", fileColumnCount);
    if (requestBodyCount !== fileColumnCount) {
        return false
    }
    let index = 1
    for (const iterator of Object.keys(excelColumn)) {
        if (iterator !== toValidate[`col${index}`]) {
            return false
        }
        index++
    }
    return true
}
const getIDs = async (data) => {
    return {
        subscriber_type: data.subscriber_type,
        health_plan_id: data.health_plan_id,
        insurance_type: data.subscriber_type === 'Individual' ? 'Individual' : 'Group',
        reimbersement_rate: ''
    }
}
const getHealthID = async (for_user) => {
    return new Promise(async (resolve, reject) => {
        try {
            const getAllHealthPlanRecords = await Plan.find({ for_user: { $eq: for_user } }).select('name')
            // console.log(getAllHealthPlanRecords, "getAllHealthPlanRecords");
            let allHealthPlanRecordsObject = {}
            for (const value of getAllHealthPlanRecords) {

                allHealthPlanRecordsObject[value.name] = value._id
            }
            resolve(allHealthPlanRecordsObject)
        } catch (error) {
            resolve('')
        }
    })
}
const csvExtraction = (filePath) => {
    let fileRows = []
    return new Promise(function (resolve, reject) {
        fs.createReadStream(filePath)
            .pipe(csv.parse({ headers: true }))
            .on("error", (error) => {
                reject(error.message)
            })
            .on("data", (row) => {
                fileRows.push(row);
            }).on("end", function () {
                resolve(fileRows)
            })
    })
}

const calculateAge = (dob, cdate = new Date()) => {
    let months;
    months = (cdate.getFullYear() - dob.getFullYear()) * 12;
    months -= dob.getMonth();
    months += cdate.getMonth();
    return (months / 12).toFixed(1);
}

const insertPrimaryRecords = (records, object, for_user, addedBy) => {

    return new Promise(async (resolve, reject) => {

        try {

            let recordArray = []

            let skiprecord = [];

            const getHealthPlanObject = await getHealthID(for_user)

            // console.log(getHealthPlanObject, 'getHealthPlanObject');

            for (let index = 0; index < records.length; index++) {

                let currentRecord = records[index]

                // console.log(currentRecord, "currentRecord");

                let currentRecordHealthPlan = currentRecord.HealthPlan.trim();

                let get_health_plan_id = getHealthPlanObject[currentRecordHealthPlan]

                console.log(get_health_plan_id, 'get_health_plan_id');

                // get_health_plan_id &&

                if (currentRecord.SubscriberUniqueID && get_health_plan_id != undefined) {

                    // console.log("DDDObbb", currentRecord.DOB);



                    // console.log("Iffffffff=======", moment(currentRecord.DOB.trim(), 'DD-MM-YYYY').format('YYYY-MM-DD'));

                    recordArray.push({

                        subscriber_type: currentRecord.SubscriberType.trim(),

                        subscription_for: currentRecord.SubscriptionFor.trim(),

                        company_name: currentRecord.GroupName.trim(),

                        unique: parseInt(currentRecord.SubscriberUniqueID),

                        health_plan_for: get_health_plan_id,

                        subscriber_full_name: formatString(`${currentRecord.SubscriberFirstName} ${currentRecord.SubscriberMiddleName} ${currentRecord.SubscriberLastName}`).trim(),

                        subscriber_first_name: currentRecord.SubscriberFirstName.trim(),

                        subscriber_middle_name: currentRecord.SubscriberMiddleName.trim(),

                        subscriber_last_name: currentRecord.SubscriberLastName.trim(),

                        age: calculateAge(new Date(currentRecord.DOB.trim())),

                        mobile: currentRecord.SubscriberMobile.trim(),

                        country_code: currentRecord.SubscriberCountryCode.trim(),

                        date_of_birth: currentRecord.DOB.trim(),

                        gender: currentRecord.Gender.trim(),

                        insurance_id: currentRecord.InsuranceID.trim(),

                        policy_id: currentRecord.PolicyID.trim(),

                        card_id: currentRecord.CardID.trim(),

                        employee_id: currentRecord.EmployeeID.trim(),

                        insurance_holder_name: currentRecord.InsuranceHolderName.trim(),

                        insurance_validity_from: currentRecord.InsuranceValidityFromDate.trim(),

                        insurance_validity_to: currentRecord.InsuranceValidityToDate.trim(),

                        reimbersement_rate: currentRecord.SubscriberReimbersementRate.trim(),

                        relationship_with_insure: currentRecord.Relationship.trim(),

                        dateofcreation: currentRecord.DateofCreation.trim(),

                        dateofjoining: currentRecord.DateofJoining.trim(),

                        insurance_card_id_proof: currentRecord.SubscriberProfile,

                        for_user,

                        addedBy


                    })

                    console.log("pusssh");



                }

                else {

                    skiprecord.push(formatString(`${currentRecord.SubscriberFirstName} ${currentRecord.SubscriberMiddleName} ${currentRecord.SubscriberLastName}`).trim())

                }

            }

            if (recordArray.length > 0) {

                for (let index = 0; index < recordArray.length; index++) {

                    object[recordArray[index].unique] = recordArray[index].unique

                }

                console.log("CHEk_object________________", { object: object, skiprecord: skiprecord, recordArray: recordArray });
                resolve({ object: object, skiprecord: skiprecord, recordArray: recordArray })

            } else {
                console.log("else_CHEk_object________________", { object: object, skiprecord: skiprecord, recordArray: recordArray });

                resolve({ object: object, skiprecord: skiprecord, recordArray: recordArray })

            }

        } catch (error) {

            console.log(error, "check error insert");

            reject()

        }

    })

}

const insertSecondaryRecords = (records, object, for_user, secondaryIDObject, insertprimaryrecord, addedBy) => {

    return new Promise(async (resolve, reject) => {

        try {

            let recordObject = {}

            var skiprecord = [];

            var skipsecondaryrecord = [];

            const getHealthPlanObject = await getHealthID(for_user)

            for (let index = 0; index < records.length; index++) {

                let currentRecord = records[index]

                let currentRecordHealthPlan = currentRecord.HealthPlan.trim();

                let get_health_plan_id = getHealthPlanObject[currentRecordHealthPlan]

                // console.log(get_health_plan_id, "get_health_plan_id111111");

                if (currentRecord.SubscriberUniqueID && get_health_plan_id != undefined) {
                    // console.log("object------------",object);
                    if ((parseInt(currentRecord.SubscriberUniqueID) in object)) {
                        // console.log(get_health_plan_id, "get_health_plan_id11111122222");
                        let secondaryData = {

                            subscriber_type: currentRecord.SubscriberType.trim(),

                            subscription_for: currentRecord.SubscriptionFor.trim(),

                            company_name: currentRecord.GroupName.trim(),

                            unique: parseInt(currentRecord.SubscriberUniqueID),

                            health_plan_for: get_health_plan_id,

                            subscriber_full_name: formatString(`${currentRecord.SubscriberFirstName} ${currentRecord.SubscriberMiddleName} ${currentRecord.SubscriberLastName}`).trim(),

                            subscriber_first_name: currentRecord.SubscriberFirstName.trim(),

                            subscriber_middle_name: currentRecord.SubscriberMiddleName.trim(),

                            subscriber_last_name: currentRecord.SubscriberLastName.trim(),

                            age: calculateAge(new Date(currentRecord.DOB.trim())),

                            mobile: currentRecord.SubscriberMobile.trim(),

                            country_code: currentRecord.SubscriberCountryCode.trim(),

                            date_of_birth: currentRecord.DOB.trim(),

                            gender: currentRecord.Gender.trim(),

                            insurance_id: currentRecord.InsuranceID.trim(),

                            policy_id: currentRecord.PolicyID.trim(),

                            card_id: currentRecord.CardID.trim(),

                            employee_id: currentRecord.EmployeeID.trim(),

                            insurance_holder_name: currentRecord.InsuranceHolderName.trim(),

                            insurance_validity_from: currentRecord.InsuranceValidityFromDate.trim(),

                            insurance_validity_to: currentRecord.InsuranceValidityToDate.trim(),

                            reimbersement_rate: currentRecord.SubscriberReimbersementRate.trim(),

                            relationship_with_insure: currentRecord.Relationship.trim(),

                            dateofcreation: currentRecord.DateofCreation.trim(),

                            dateofjoining: currentRecord.DateofJoining.trim(),

                            insurance_card_id_proof: currentRecord.SubscriberProfile,

                            for_user,

                            addedBy



                        }

                        if (currentRecord.SubscriberUniqueID in recordObject) {

                            recordObject[currentRecord.SubscriberUniqueID].push(secondaryData)

                        } else {

                            recordObject[currentRecord.SubscriberUniqueID] = [secondaryData]

                        }

                    }

                    else {
                        // console.log(currentRecord.SubscriberUniqueID,"INDEX___________", index);
                        skipsecondaryrecord.push("");

                    }

                }
                else {

                    skiprecord.push(formatString(`${currentRecord.SubscriberFirstName} ${currentRecord.SubscriberMiddleName} ${currentRecord.SubscriberLastName}`).trim())

                }

            }

            // console.log(recordObject, 'recordObject');

            if (skiprecord.length > 0) {

            }
            else if (skipsecondaryrecord.length > 0) {

            }

            else {

                const insertedRecords = await Subscriber.insertMany(insertprimaryrecord)
                for (let index = 0; index < insertedRecords.length; index++) {
                    object[insertedRecords[index].unique] = insertedRecords[index]._id
                }

                // console.log(object, "object");
                for (const key in recordObject) {

                    let insertSecondaryRecord = await Subscriber.insertMany(recordObject[key])

                    let IDArray = insertSecondaryRecord.map(record => record._id)

                    let newIDArray

                    if (key in secondaryIDObject) {

                        newIDArray = secondaryIDObject[key].concat(IDArray)

                    } else {

                        newIDArray = IDArray

                    }

                    await Subscriber.findOneAndUpdate(

                        { _id: { $eq: object[key] } },

                        {

                            $set: {

                                secondary_subscriber: newIDArray,

                            },

                        },

                        { upsert: false, new: true }

                    ).exec();

                }

            }

            // console.log("sdfsdfsdfsd1111111111f");


            resolve({ object: object, skiprecord: skiprecord, skipsecondaryrecord: skipsecondaryrecord })

        } catch (error) {
            // console.log("sdfsdfsdfsdf");
            reject()

        }

    })

}
const addSubscribersPlansInfo = async (planInfo) => {
    try {
        console.log("planInfooooo_______", planInfo);

        const PlanService = await PlanServiceNew.find({ for_plan: mongoose.Types.ObjectId(planInfo.health_plan_for) })

        const PlanExclusion = await PlanExclusionNew.find({ for_plan: mongoose.Types.ObjectId(planInfo.health_plan_for) })

        console.log(PlanService, "PlanServiceeeeee_____");

        let PlanServiceNewData = [];

        for (let i = 0; i < PlanService.length; i++) {
            const planServiceItem = {
                reimbursment_rate: PlanService[i].reimbursment_rate,
                in_limit: {
                    service_limit: PlanService[i].in_limit.service_limit ? PlanService[i].in_limit.service_limit : '',
                    category_limit: PlanService[i].in_limit.category_limit,
                },
                has_conditions: {
                    repayment_condition: {
                        max_no: PlanService[i].has_conditions.repayment_condition.max_no,
                        unit_no: PlanService[i].has_conditions.repayment_condition.unit_no,
                        unit: PlanService[i].has_conditions.repayment_condition.unit,
                    },
                    category_condition: PlanService[i].has_conditions.category_condition,
                },
                pre_authorization: PlanService[i].pre_authorization,
                waiting_period: {
                    duration: {
                        min_no: PlanService[i].waiting_period.duration.min_no,
                        unit: PlanService[i].waiting_period.duration.unit
                    },
                    redeemed: PlanService[i].waiting_period.redeemed,
                },
                has_category: PlanService[i].has_category,
                primary_and_secondary_category_limit: PlanService[i].primary_and_secondary_category_limit,
                primary_and_secondary_service_limit: PlanService[i].primary_and_secondary_service_limit,
                service: PlanService[i].service,
                service_code: PlanService[i].service_code,
                total_max_duration_in_days: PlanService[i].total_max_duration_in_days,
                max_extend_duration_in_days: PlanService[i].max_extend_duration_in_days,
                comment: PlanService[i].comment
            }
            PlanServiceNewData.push(planServiceItem);
        }

        let palnExclusionArray = [];

        for (let i = 0; i < PlanExclusion.length; i++) {
            const palnExclusionItem = {
                in_exclusion: {
                    category: PlanExclusion[i].in_exclusion.category,
                    name: PlanExclusion[i].in_exclusion.name,
                    brand: PlanExclusion[i].in_exclusion.brand,
                    comment: PlanExclusion[i].in_exclusion.comment
                }
            };
            palnExclusionArray.push(palnExclusionItem);
        }

        console.log(PlanServiceNewData, "PlanServiceNewDataaaa______");

        const subscriberPlansDetail = new PlansDetailOfSubscriber({
            for_plan: planInfo.health_plan_for,
            planService: PlanServiceNewData,
            palnExclusion: palnExclusionArray,
            planHistoryId: planInfo._id
        });

        const result = await subscriberPlansDetail.save();

        //console.log(result,"added_successfully______");


        /*  sendResponse(req, res, 200, {
             status: true,
             body: {
                 subscriberHistory: result,
             },
             message: "Successfully Added  subscriber plan history",
             errorCode: null,
         }); */
    } catch (error) {
        console.log(error, "errorrrrrrrrrr_______");
        /*  sendResponse(req, res, 500, {
             status: false,
             body: null,
             message: "Failed to add subscriber plans history",
             errorCode: "INTERNAL_SERVER_ERROR",
         }) */
    }
}


const uploadImage = async (file, fileName, folder) => {
    if (!fs.existsSync(path.join(__dirname, `../../../uploads/${folder}/`))) {
        // creating directory if not exists in uploads directory
        fs.mkdirSync(path.join(__dirname, `../../../uploads/${folder}/`));
    }
    let filePath = path.join(__dirname, `../../../uploads/${folder}/${fileName}`);
    await file.mv(filePath);
};
class InsuranceSubscriber {

    async getSubscribersPlanDetail(req, res) {
        try {

            console.log(req.body.planHistoryId, "planHistoryIddddd_______");

            const subscriberPlanHistoryDetails = await PlansDetailOfSubscriber.findOne({ planHistoryId: mongoose.Types.ObjectId(req.body.planHistoryId) })

            console.log(subscriberPlanHistoryDetails, "subscriberHistoryDetailss_s___");

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriberHistoryDetails: subscriberPlanHistoryDetails
                },
                message: "Successfully fetch  subscriber plan history detail",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrr_______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch subscriber plans history",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async updateSubscriberPlanValidity(req, res) {
        try {
            console.log("bodyyyyy_____", req.body);
            const {
                subscriberId,
                plan_validity_from,
                plan_validity_to,
                health_plan_for
            } = req.body;

            const result = await subscriber.findOneAndUpdate(
                { _id: subscriberId }, // Search by _id
                {
                    insurance_validity_from: plan_validity_from,
                    insurance_validity_to: plan_validity_to,
                    health_plan_for: health_plan_for
                },
                { new: true } // Get the updated document
            );

            //console.log(result, "resultrr_____");

            sendResponse(req, res, 200, {
                status: true,
                data: { result },
                message: "Successfully Added  subscriber plan history",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrrrr_______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to add subscriber plans history",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async addSubscribersHealthPlanHistory(req, res) {
        try {
            //console.log("insideeee_______",req.body);
            const {
                health_plan_for,
                plan_validity_from,
                plan_validity_to,
                subscriberId
            } = req.body;

            const subscriberHistoryFields = new SubscriberPlanHistory({
                health_plan_for: health_plan_for,
                plan_validity_from: plan_validity_from,
                plan_validity_to: plan_validity_to,
                subscriberId: subscriberId
            });

            const result = await subscriberHistoryFields.save();

            await addSubscribersPlansInfo(result)

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriberHistory: result,
                },
                message: "Successfully Added  subscriber plan history",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrrrr_______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to add subscriber plans history",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async getSubscribersHealthPlanHistory(req, res) {
        try {

            console.log(req.body.subscriberId, "subscriberIddddd_______");

            const subscriberHistoryDetails = await SubscriberPlanHistory.find({ subscriberId: mongoose.Types.ObjectId(req.body.subscriberId) }).populate({
                path: "health_plan_for",
                select: { name: 1 },
            })

            //console.log(subscriberHistoryDetails,"subscriberHistoryDetailss_s___");

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriberHistoryDetails: subscriberHistoryDetails
                },
                message: "Successfully Added  subscriber plan history",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrr_______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch subscriber plans history",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async addPrimarySubscriber(req, res) {
        try {
            const {
                subscriber_type,
                subscription_for,
                unique,
                health_plan_for,
                subscriber_first_name,
                subscriber_middle_name,
                subscriber_last_name,
                age,
                mobile,
                date_of_birth,
                gender,
                insurance_id,
                policy_id,
                card_id,
                employee_id,
                insurance_holder_name,
                insurance_validity_from,
                insurance_validity_to,
                reimbersement_rate,
                for_user,
                dateofcreation,
                dateofjoining,
                insurance_card_id_proof,
                addedBy
            } = req.body;
            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(for_user))
            let subscriberCount = {}
            let checkPlan = {}
            let insuranceID = []

            if (checkUser.role == 'INSURANCE_STAFF') {
                let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(for_user) })
                subscriberCount = await Subscriber.countDocuments({ for_user: staffData?.for_user, is_deleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: staffData?.for_user });
                insuranceID.push(staffData?.for_user)

            } else {
                subscriberCount = await Subscriber.countDocuments({ for_user: for_user, is_deleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: for_user });
                insuranceID.push(for_user)

            }



            let checkCondition;
            checkCondition = await getData(checkPlan);
            // console.log(subscriberCount,
            //     "check__________", checkCondition?.data1?.services);
            if (checkCondition?.statusData === "active") {
                // for (const data of checkPlan) {
                let shouldAddSubscriber = false;
                for (const data12 of checkCondition?.data1?.services) {
                    if (data12?.name === 'subscriber' && data12?.is_unlimited === false) {
                        if (subscriberCount < data12?.max_number) {
                            shouldAddSubscriber = true;
                            break; // Exit the inner loop if conditions are satisfied
                        } else {
                            return sendResponse(req, res, 200, {
                                status: false,
                                body: null,
                                message: "Unable to add Subscriber. As Primary and Secondary Subscribers Maximum limit has exceeded as per your purchased plan.",
                                errorCode: null,
                            });
                        }
                    }
                }

                if (shouldAddSubscriber) {
                    const checkUniqueSubscriber = await Subscriber.find({ unique, for_user: { $eq: for_user }, is_deleted: false });
                    if (checkUniqueSubscriber.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Unique key is already in used",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const checkPol = await Subscriber.find({ unique, policy_id, card_id, insurance_id, employee_id, for_user, subscriber_first_name, subscriber_last_name, date_of_birth, mobile }).select('secondary_subscriber, policy_id').exec();
                    if (checkPol.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Those field (unique, policy id, card id, insurance id, employee id, subscriber name, subscriber last name, date of birth, mobile) are matched with another subscriber, please change and try again",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const subscriber = new Subscriber({
                        subscriber_type,
                        subscription_for,
                        unique,
                        health_plan_for,
                        subscriber_full_name: formatString(`${subscriber_first_name} ${subscriber_middle_name} ${subscriber_last_name}`),
                        subscriber_first_name,
                        subscriber_middle_name,
                        subscriber_last_name,
                        age,
                        mobile,
                        date_of_birth,
                        gender,
                        insurance_id,
                        policy_id,
                        card_id,
                        employee_id,
                        insurance_holder_name,
                        insurance_validity_from,
                        insurance_validity_to,
                        reimbersement_rate,
                        insurance_card_id_proof,
                        for_user: insuranceID,
                        dateofcreation,
                        dateofjoining,
                        addedBy


                    });
                    const result = await subscriber.save();

                    if (!result) return sendResponse(req, res, 500, {
                        status: false,
                        body: null,
                        message: "failed to add subscriber",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                    sendResponse(req, res, 200, {
                        status: true,
                        body: result,
                        message: "successfully added  subscriber",
                        errorCode: null,
                    });

                } else {
                    const checkUniqueSubscriber = await Subscriber.find({ unique, for_user: { $eq: for_user }, is_deleted: false });
                    if (checkUniqueSubscriber.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Unique key is already in used",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const checkPol = await Subscriber.find({ unique, policy_id, card_id, insurance_id, employee_id, for_user, subscriber_first_name, subscriber_last_name, date_of_birth, mobile }).select('secondary_subscriber, policy_id').exec();
                    if (checkPol.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Those field (unique, policy id, card id, insurance id, employee id, subscriber name, subscriber last name, date of birth, mobile) are matched with another subscriber, please change and try again",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const subscriber = new Subscriber({
                        subscriber_type,
                        subscription_for,
                        unique,
                        health_plan_for,
                        subscriber_full_name: formatString(`${subscriber_first_name} ${subscriber_middle_name} ${subscriber_last_name}`),
                        subscriber_first_name,
                        subscriber_middle_name,
                        subscriber_last_name,
                        age,
                        mobile,
                        date_of_birth,
                        gender,
                        insurance_id,
                        policy_id,
                        card_id,
                        employee_id,
                        insurance_holder_name,
                        insurance_validity_from,
                        insurance_validity_to,
                        reimbersement_rate,
                        insurance_card_id_proof,
                        for_user: insuranceID,
                        dateofcreation,
                        dateofjoining,
                        addedBy


                    });
                    const result = await subscriber.save();

                    if (!result) return sendResponse(req, res, 500, {
                        status: false,
                        body: null,
                        message: "failed to add subscriber",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                    sendResponse(req, res, 200, {
                        status: true,
                        body: result,
                        message: "successfully added  subscriber",
                        errorCode: null,
                    });
                }
                // }
            }

        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            });

        }

    }
    async addSecondarySubscriber(req, res) {
        try {
            const {
                subscriber_type,
                subscription_for,
                health_plan_for,
                subscriber_first_name,
                subscriber_middle_name,
                subscriber_last_name,
                age,
                unique,
                mobile,
                date_of_birth,
                gender,
                insurance_id,
                policy_id,
                card_id,
                employee_id,
                insurance_holder_name,
                insurance_validity_from,
                insurance_validity_to,
                reimbersement_rate,
                relationship_with_insure,
                primary_id,
                for_user,
                dateofcreation,
                dateofjoining,
                insurance_card_id_proof,
                addedBy


            } = req.body;

            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(for_user))
            let subscriberCount = {}
            let checkPlan = {}
            let insuranceID = []

            if (checkUser.role == 'INSURANCE_STAFF') {
                let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(for_user) })
                subscriberCount = await Subscriber.countDocuments({ for_user: staffData?.for_user, is_deleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: staffData?.for_user });
                insuranceID.push(staffData?.for_user)

            } else {

                subscriberCount = await Subscriber.countDocuments({ for_user: for_user, is_deleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: for_user });
                insuranceID.push(for_user)

            }


            let checkCondition;
            checkCondition = await getData(checkPlan);


            if (checkCondition?.statusData === "active") {
                // for (const data of checkPlan) {
                let shouldAddSubscriber = false;
                for (const data12 of checkCondition?.data1?.services) {
                    if (data12?.name === 'subscriber' && data12?.is_unlimited === false) {
                        if (subscriberCount < data12?.max_number) {
                            shouldAddSubscriber = true;
                            break; // Exit the inner loop if conditions are satisfied
                        } else {
                            return sendResponse(req, res, 200, {
                                status: false,
                                body: null,
                                message: "Unable to add Subscriber. As Subscriber Maximum limit has exceeded as per your purchased plan.",
                                errorCode: null,
                            });
                        }
                    }
                }

                if (shouldAddSubscriber) {
                    const getSecondarySubscriber = await Subscriber.findById(primary_id).select({ secondary_subscriber: 1, policy_id: 1 }).exec();

                    const checkPol = await Subscriber.find({ policy_id, card_id, insurance_id, employee_id, for_user, subscriber_first_name, subscriber_last_name, date_of_birth, mobile }).select('secondary_subscriber, policy_id').exec();
                    if (checkPol.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Those field (policy id, card id, insurance id, employee id, subscriber name, subscriber last name, date of birth, mobile) are matched with another subscriber, please change and try again",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const subscriber = new Subscriber({
                        subscriber_type,
                        subscription_for,
                        health_plan_for,
                        subscriber_full_name: formatString(`${subscriber_first_name} ${subscriber_middle_name} ${subscriber_last_name}`),
                        subscriber_first_name,
                        subscriber_middle_name,
                        subscriber_last_name,
                        age,
                        mobile,
                        date_of_birth,
                        gender,
                        insurance_id,
                        policy_id,
                        card_id,
                        employee_id,
                        insurance_holder_name,
                        insurance_validity_from,
                        insurance_validity_to,
                        reimbersement_rate,
                        relationship_with_insure,
                        insurance_card_id_proof,
                        for_user: insuranceID,
                        unique,
                        dateofcreation,
                        dateofjoining,
                        addedBy

                    });
                    const result = await subscriber.save();
                    const secondaryIDArray = []
                    for (const secondaryID of getSecondarySubscriber.secondary_subscriber) {
                        const objectId = new ObjectId(secondaryID);
                        secondaryIDArray.push(objectId);
                    }

                    const objectId2 = new ObjectId(result._id);

                    secondaryIDArray.push(objectId2)
                    await Subscriber.findOneAndUpdate(
                        { _id: primary_id },
                        {
                            $set: {
                                secondary_subscriber: secondaryIDArray,
                            },
                        },
                        { upsert: false, new: true }
                    ).exec();
                    if (!result) return sendResponse(req, res, 500, {
                        status: false,
                        body: null,
                        message: "failed to add subscriber",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                    sendResponse(req, res, 200, {
                        status: true,
                        body: result,
                        message: "successfully added  subscriber",
                        errorCode: null,
                    });

                } else {
                    const getSecondarySubscriber = await Subscriber.findById(primary_id).select({ secondary_subscriber: 1, policy_id: 1 }).exec();

                    const checkPol = await Subscriber.find({ policy_id, card_id, insurance_id, employee_id, for_user, subscriber_first_name, subscriber_last_name, date_of_birth, mobile }).select('secondary_subscriber, policy_id').exec();
                    if (checkPol.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Those field (policy id, card id, insurance id, employee id, subscriber name, subscriber last name, date of birth, mobile) are matched with another subscriber, please change and try again",
                            errorCode: "FIELD_ALREADY_EXIST",
                        });
                    }

                    const subscriber = new Subscriber({
                        subscriber_type,
                        subscription_for,
                        health_plan_for,
                        subscriber_full_name: formatString(`${subscriber_first_name} ${subscriber_middle_name} ${subscriber_last_name}`),
                        subscriber_first_name,
                        subscriber_middle_name,
                        subscriber_last_name,
                        age,
                        mobile,
                        date_of_birth,
                        gender,
                        insurance_id,
                        policy_id,
                        card_id,
                        employee_id,
                        insurance_holder_name,
                        insurance_validity_from,
                        insurance_validity_to,
                        reimbersement_rate,
                        relationship_with_insure,
                        insurance_card_id_proof,
                        for_user: insuranceID,
                        unique,
                        dateofcreation,
                        dateofjoining,
                        addedBy

                    });
                    const result = await subscriber.save();
                    const secondaryIDArray = []
                    for (const secondaryID of getSecondarySubscriber.secondary_subscriber) {
                        const objectId = new ObjectId(secondaryID);
                        secondaryIDArray.push(objectId);
                    }

                    const objectId2 = new ObjectId(result._id);

                    secondaryIDArray.push(objectId2)
                    await Subscriber.findOneAndUpdate(
                        { _id: primary_id },
                        {
                            $set: {
                                secondary_subscriber: secondaryIDArray,
                            },
                        },
                        { upsert: false, new: true }
                    ).exec();
                    if (!result) return sendResponse(req, res, 500, {
                        status: false,
                        body: null,
                        message: "failed to add subscriber",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                    sendResponse(req, res, 200, {
                        status: true,
                        body: result,
                        message: "successfully added  subscriber",
                        errorCode: null,
                    });
                }
                // }
            }

        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add plan service",
                errorCode: "INTERNAL_SERVER_ERROR",
            });

        }

    }
    async deleteSubscriber(req, res) {
        const { subscriber_id, user_id } = req.body
        try {
            var result;
            console.log(subscriber_id, req.body, "fgfjhhhhhhhhhhhhh");

            if (subscriber_id == '') {

                result = await Subscriber.updateMany(
                    { is_deleted: { $eq: false }, for_user: mongoose.Types.ObjectId(user_id) },
                    {
                        $set: { is_deleted: true }
                    },
                    { new: true }
                )
            }
            else {
                // let checkisDeleted = await Plan.find({ is_deleted: false }, { _id: 1 });
                // const _idValues = checkisDeleted.map(item => item._id);
                const findData = await Subscriber.find({ _id: { $in: subscriber_id } })

                console.log("findData.length________", findData.length);

                if (findData.length > 0) {
                    for (let i = 0; i < findData.length; i++) {
                        const element = findData[i].secondary_subscriber;

                        const subscriberFor = findData[i].subscription_for;

                        let data_id = findData[i]._id

                        if (subscriberFor == 'Primary') {
                            if (element.length > 0) {
                                result = await Subscriber.updateMany(
                                    { _id: { $in: element } },
                                    {
                                        $set: { is_deleted: true }
                                    },
                                    { new: true }
                                )
                            }
                        } else {
                            const findSecondary = await Subscriber.findOne({ secondary_subscriber: data_id })
                            console.log("findSecondary=====", findSecondary);

                            if (findSecondary) {
                                console.log("IFFFFFFFFFFF", data_id);
                                await Subscriber.updateOne({ _id: findSecondary._id }, { $pull: { secondary_subscriber: mongoose.Types.ObjectId(data_id) } })
                            }

                        }

                    }
                }

                result = await Subscriber.updateMany(
                    { _id: { $in: subscriber_id } },
                    {
                        $set: { is_deleted: true }
                    },
                    { new: true }
                )
            }

            if (!result) return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "successfully deleted  subscriber",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check log error");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async updateSubscriber(req, res) {
        const {

            subscriber_type,
            subscription_for,
            unique,
            health_plan_for,
            subscriber_first_name,
            subscriber_middle_name,
            subscriber_last_name,
            age,
            mobile,
            date_of_birth,
            gender,
            insurance_id,
            policy_id,
            card_id,
            employee_id,
            insurance_holder_name,
            insurance_validity_from,
            insurance_validity_to,
            reimbersement_rate,
            old_insurance_card_id_proof,
            relationship_with_insure,
            subscriber_id,
            for_user,
            dateofcreation, dateofjoining,
            insurance_card_id_proof
        } = req.body;
        try {
            console.log("checkQuery-------", { unique, for_user: { $eq: mongoose.Types.ObjectId(for_user) }, _id: { $ne: mongoose.Types.ObjectId(subscriber_id) }, subscription_for: { $ne: "Secondary" } });
            if (subscription_for != 'Secondary') {

                const checkUniqueSubscriber = await Subscriber.find({ unique, for_user: { $eq: mongoose.Types.ObjectId(for_user) }, _id: { $ne: mongoose.Types.ObjectId(subscriber_id) }, subscription_for: { $ne: "Secondary" }, is_deleted: false });
                console.log("checkUniqueSubscriber=======", checkUniqueSubscriber);
                if (checkUniqueSubscriber.length > 0) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Unique key is already in used",
                        errorCode: "FIELD_ALREADY_EXIST",
                    });
                }
            }


            const checkPol = await Subscriber.find({ unique, policy_id, card_id, insurance_id, employee_id, for_user, subscriber_first_name, subscriber_last_name, date_of_birth, mobile, _id: { $ne: subscriber_id }, is_deleted: false }).select('secondary_subscriber, policy_id').exec();
            console.log("checkPol=====", checkPol);
            if (checkPol.length > 0) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Those field (unique, policy id, card id, insurance id, employee id, subscriber name, subscriber last name, date of birth, mobile) are matched with another subscriber, please change and try again",
                    errorCode: "FIELD_ALREADY_EXIST",
                });
            }

            let imageFolder = "subscriberProfile";
            let new_insurance_card_id_proof = "";


            /* if (req.files && req.files.insurance_card_id_proof) {
               
                let todayDate = new Date();

                let newFileName = todayDate.getTime();

                new_insurance_card_id_proof = newFileName + "." + req.files.insurance_card_id_proof.name.split(".").pop();

                console.log(new_insurance_card_id_proof, "insurance_card_id_proofff1111_____");

                await uploadImage(req.files.insurance_card_id_proof, new_insurance_card_id_proof, imageFolder);

                new_insurance_card_id_proof = imageFolder + "/" + new_insurance_card_id_proof;

                console.log(new_insurance_card_id_proof, "insurance_card_id_proofff_____");
            } else {
                new_insurance_card_id_proof = old_insurance_card_id_proof
            } */


            /*  let new_insurance_card_id_proof;
             if (req.files) {
                 const filename = req.files.insurance_card_id_proof.name.split('.')[0] + '-' + Date.now() + '.png';
                 if ('insurance_card_id_proof' in req.files) {
                     const s3result = await uploadFile(req.files.insurance_card_id_proof.data, {
                         Bucket: 'healthcare-crm-stage-docs',
                         Key: `insurance/${for_user}/idproof/${filename}`,
                     })
                     new_insurance_card_id_proof = s3result.key
                 } else {
                     new_insurance_card_id_proof = ''
                 }
             } else {
                 new_insurance_card_id_proof = old_insurance_card_id_proof
             } */
            console.log(insurance_card_id_proof, "new_insurance_card_id_proofff_____");

            //  let newaa=await getDocument1(insurance_card_id_proof);
            //  const base64Data = newaa.toString('base64');
            //  const base64Image = `data:image/jpeg;base64,${base64Data}`;

            if (insurance_card_id_proof !== '') {
                new_insurance_card_id_proof = insurance_card_id_proof
            } else {
                new_insurance_card_id_proof = old_insurance_card_id_proof
            }


            const result = await Subscriber.findOneAndUpdate(
                { _id: subscriber_id },
                {
                    $set: {
                        subscriber_type,
                        subscription_for,
                        unique,
                        health_plan_for,
                        subscriber_full_name: formatString(`${subscriber_first_name} ${subscriber_middle_name} ${subscriber_last_name}`),
                        subscriber_first_name,
                        subscriber_middle_name,
                        subscriber_last_name,
                        age,
                        mobile,
                        date_of_birth,
                        gender,
                        insurance_id,
                        policy_id,
                        card_id,
                        employee_id,
                        insurance_holder_name,
                        insurance_validity_from,
                        insurance_validity_to,
                        reimbersement_rate,
                        insurance_card_id_proof: new_insurance_card_id_proof,
                        relationship_with_insure,
                        for_user,
                        dateofcreation,
                        dateofjoining,

                    },
                },

                { upsert: false, new: true }
            ).exec();

            if (result.secondary_subscriber.length > 0) {
                const updatedSecondarySubscribers = result.secondary_subscriber.map(async (subId) => {
                    await Subscriber.updateOne(
                        { _id: subId },
                        { $set: { 'unique': unique } }
                    ).exec();
                });
                await Promise.all(updatedSecondarySubscribers);
            }

            if (!result) return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to updated subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated  subscriber",
                errorCode: null,
            });
        } catch (error) {
            console.log("error======", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to update subscriber",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async listSubscriber(req, res) {
        try {
            const { page, limit, subscriber_name, user_id, subscriberTypeFilter, subsciberIdsForCard } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);

            } else {
                sortingarray['unique'] = 1
            }
            var searchText = Number(subscriber_name)
            if (searchText.toString() == "NaN") {
                searchFilter = [
                    { subscriber_full_name: { $regex: subscriber_name || '', $options: "i" } }
                ]
            } else {
                searchFilter = [
                    { unique: { $eq: Number(subscriber_name) } }
                ]
            }
            if (subscriber_name == "") {
                var searchFilter = [
                    { subscriber_full_name: { $regex: subscriber_name || '', $options: "i" } }
                ]
            }
            let id = {}
            if (user_id == "") {

                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        data: [],
                        totalCount: 0
                    },
                    message: "successfully fetched  subscriber",
                    errorCode: null,
                });
            }
            else {
                let ids = user_id.split(',');
                let objectIds = []

                if (ids.length === 1) {
                    let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(user_id))
                    if (checkUser.role == 'INSURANCE_STAFF') {
                        let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(user_id) })

                        objectIds.push(staffData?.for_user)
                    } else {
                        objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
                    }
                } else {
                    objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
                }

                let data = [
                    {
                        $match: {
                            for_user: { $in: objectIds },
                            subscription_for: 'Primary',
                            is_deleted: false,
                            $or: searchFilter,
                            subscriber_type: {
                                $regex: subscriberTypeFilter === 'all' ? '' : subscriberTypeFilter,
                                $options: "i"
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "plans", // Replace with the actual collection name for health plans
                            localField: "health_plan_for",
                            foreignField: "_id",
                            as: "health_plan_for"
                        }
                    },
                    {
                        $unwind: "$health_plan_for"
                    },
                    {
                        $lookup: {
                            from: "planservicenews", // Replace with the actual collection name for planservicenews
                            localField: "health_plan_for._id", // Assuming health_plan_for has an _id field
                            foreignField: "for_plan",
                            as: "plan_service_news"
                        }
                    },

                    {
                        $lookup: {
                            from: "admininfos", // Replace with the actual collection name for planservicenews
                            localField: "for_user", // Assuming health_plan_for has an _id field
                            foreignField: "for_portal_user",
                            as: "admininfos"
                        }
                    },
                    {
                        $unwind: "$admininfos"
                    },
                    {
                        $sort: sortingarray
                    },

                    {
                        $skip: (page - 1) * Number(limit)
                    }
                ];


                if (Number(limit) > 0) {
                    data.push({
                        $limit: Number(limit) // Make sure `limit` is a numeric value
                    })
                }

                console.log(data, "data4444");
                let result = await Subscriber.aggregate(data, { allowDiskUse: true });

                // let myarray = [];

                // console.log(result, "result444");

                // for (let i = 0; i < result.length; i++) {
                //     var insurance_card_id_proof = ''
                //     if (result[i].insurance_card_id_proof) {
                //         let newaa = await getDocument1(result[i].insurance_card_id_proof);
                //         const base64Data = newaa.toString('base64');
                //         insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
                //     }

                //     let myobj = {
                //         _id: result[i]._id,
                //         insuranceName: admininfos.company_name,
                //         secondary_subscriber: result[i].secondary_subscriber,
                //         subscriber_type: result[i].subscriber_type, subscription_for: result[i].subscription_for, unique: result[i].unique,
                //         health_plan_for: result[i].health_plan_for,
                //         company_name: result[i].company_name, subscriber_full_name: result[i].subscriber_full_name, subscriber_first_name: result[i].subscriber_first_name, subscriber_middle_name: result[i].subscriber_middle_name, subscriber_last_name: result[i].subscriber_last_name,
                //         date_of_birth: result[i].date_of_birth,
                //         mobile: result[i].mobile,
                //         country_code: result[i].country_code,
                //         age: result[i].age,
                //         gender: result[i].gender,
                //         insurance_id: result[i].insurance_id,
                //         policy_id: result[i].policy_id,
                //         plan_services: result[i].plan_service_news,
                //         card_id: result[i].card_id,
                //         employee_id: result[i].employee_id,
                //         insurance_holder_name: result[i].insurance_holder_name,
                //         insurance_validity_from: result[i].insurance_validity_from,
                //         insurance_validity_to: result[i].insurance_validity_to,
                //         reimbersement_rate: result[i].reimbersement_rate,
                //         insurance_card_id_proof: insurance_card_id_proof,
                //         is_deleted: result[i].is_deleted,
                //         for_user: result[i].for_user,
                //         createdAt: result[i].createdAt,
                //         updatedAt: result[i].updatedAt,
                //         dateofcreation: result[i].dateofcreation,
                //         is_active: result[i].is_active

                //     }
                //     myarray.push(myobj)
                // }

                const s3Promises = result.map(async (record) => {
                    var insurance_card_id_proof = ''
                    if (record.insurance_card_id_proof) {
                        let newaa = await getDocument1(record.insurance_card_id_proof);
                        const base64Data = newaa.toString('base64');
                        insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
                    }

                    let myobj = {
                        _id: record._id,
                        insuranceName: record.admininfos.company_name,
                        secondary_subscriber: record.secondary_subscriber,
                        subscriber_type: record.subscriber_type, subscription_for: record.subscription_for, unique: record.unique,
                        health_plan_for: record.health_plan_for,
                        company_name: record.company_name, subscriber_full_name: record.subscriber_full_name, subscriber_first_name: record.subscriber_first_name, subscriber_middle_name: record.subscriber_middle_name, subscriber_last_name: record.subscriber_last_name,
                        date_of_birth: record.date_of_birth,
                        mobile: record.mobile,
                        country_code: record.country_code,
                        age: record.age,
                        gender: record.gender,
                        insurance_id: record.insurance_id,
                        policy_id: record.policy_id,
                        plan_services: record.plan_service_news,
                        card_id: record.card_id,
                        employee_id: record.employee_id,
                        insurance_holder_name: record.insurance_holder_name,
                        insurance_validity_from: record.insurance_validity_from,
                        insurance_validity_to: record.insurance_validity_to,
                        reimbersement_rate: record.reimbersement_rate,
                        insurance_card_id_proof: insurance_card_id_proof,
                        is_deleted: record.is_deleted,
                        for_user: record.for_user,
                        createdAt: record.createdAt,
                        updatedAt: record.updatedAt,
                        dateofcreation: record.dateofcreation,
                        is_active: record.is_active

                    }
                    // Add the S3 data to the current record
                    return myobj;
                });

                const myarray = await Promise.all(s3Promises);

                result = myarray

                let count = await Subscriber.countDocuments({
                    for_user: { $in: objectIds },
                    subscription_for: 'Primary',
                    is_deleted: false,
                    $or: searchFilter,
                    subscriber_type: { $regex: subscriberTypeFilter === 'all' ? '' : subscriberTypeFilter || '', $options: "i" },
                });
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        data: result,
                        totalCount: count
                    },
                    message: "successfully fetched  subscriber",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error);
            console.log(error, "errorrrrrrr_____");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async allSubscriber(req, res) {
        try {
            // const { page, limit, subscriber_name, user_id, subscriberTypeFilter } = req.query
            const result = await Subscriber.find({}, { subscriber_full_name: 1 })
            // const result = await Subscriber.find({})
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    result,
                },
                message: "successfully fetched all subscribers",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched all subscribers",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async listAllTypeOFSubscriber(req, res) {
        try {
            const { for_portal_user } = req.query
            const result = await Subscriber.find({
                for_user: { $eq: for_portal_user },
                is_deleted: false,
            })
                .populate({
                    path: "health_plan_for",
                    select: { name: 1 },
                })
                .sort([["createdAt", -1]])
                .exec();

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched  subscriber",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async listSubscriberType(req, res) {
        try {
            var value = myCache.get("listSubscriberType");
            console.log(value, "value123");
            var result = '';
            if (value == undefined) {
                result = await subscribertype.find({ type_name: "Individual" }).exec();
                var success = myCache.set("listSubscriberType", result, 10000);
            }
            else {
                result = value
            }
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                },
                message: "successfully fetched  subscriber type",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber type",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async viewSubscriber(req, res) {
        try {
            const result = await Subscriber.find({ _id: { $eq: req.query.subscriber_id } })
                .populate({
                    path: 'health_plan_for'
                })
                .exec();
            const planID = result[0].health_plan_for._id;
            const planService = await PlanServiceNew.find({ for_plan: mongoose.Types.ObjectId(planID) })
            const planExclusion = await PlanExclusionNew.find({ for_plan: mongoose.Types.ObjectId(planID) })
            const resultData = result[0]
            const secondaryValue = resultData.secondary_subscriber
            var secondaryDetails = []
            // for (const id of secondaryValue) {
            //     const data = await Subscriber.findOne({ _id: id, is_deleted: false }).populate({
            //         path: 'health_plan_for'
            //     })
            //         .exec();
            //     if (data != null) {
            //         if (data.insurance_card_id_proof !== '') {
            //             let newaa = await getDocument1(data.insurance_card_id_proof);
            //             const base64Data = newaa.toString('base64');
            //             const insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
            //             data["insurance_card_id_proof"] = insurance_card_id_proof;
            //         }
            //         secondaryDetails.push(data)

            //     }
            // }

            secondaryDetails = await Promise.all(secondaryValue.map(async id => {
                const data = await Subscriber.findOne({ _id: id, is_deleted: false }).populate({
                    path: 'health_plan_for'
                }).exec();

                if (data != null) {
                    if (data.insurance_card_id_proof !== '') {
                        let newaa = await getDocument1(data.insurance_card_id_proof);
                        const base64Data = newaa.toString('base64');
                        data["insurance_card_id_proof"] = `data:image/jpeg;base64,${base64Data}`;
                    }
                    return data;
                }
            }));
            resultData['secondary_subscriber'] = secondaryDetails
            let subscriberProfile = '';
            if (resultData.insurance_card_id_proof != '') {
                subscriberProfile = await getFile({
                    Bucket: 'healthcare-crm-stage-docs',
                    Key: resultData.insurance_card_id_proof,
                    Expires: 60 * 5
                })
            }
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriber_details: resultData,
                    plan_services: planService,
                    plan_exclusion: planExclusion,
                    subscriberProfile: subscriberProfile
                },
                message: "successfully fetched  subscriber",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async viewPrimarySubscriberWithItsSecondary(req, res) {
        try {
            const { userId, limit, page, selectedsubscriber } = req.query;

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);

            } else {
                sortingarray['unique'] = 1
            }

            var selectedsubscriberarray = [];
            var objectIds = []
            if (selectedsubscriber != '') {
                selectedsubscriberarray = selectedsubscriber.split(",");
                objectIds = selectedsubscriberarray.map(selectedsubscriberarray1 => new ObjectId(selectedsubscriberarray1));
                console.log(objectIds, "selectedsubscriberarray");
            }

            var matchcondition = {
                $match: {
                    is_deleted: false, is_active: true
                }
            }
            console.log(selectedsubscriberarray, "selectedsubscriberarray");

            if (selectedsubscriberarray.length > 0) {
                matchcondition = {
                    $match: {
                        _id: { $in: objectIds },
                    }
                }
            }
            console.log(matchcondition, "selectedsubscriberarray");

            let data = [
                {
                    $match: {
                        for_user: { $in: [mongoose.Types.ObjectId(userId)] },
                        subscription_for: { $in: ['Primary', 'Secondary'] },


                    }
                },
                matchcondition,
                {
                    $lookup: {
                        from: "plans", // Replace with the actual collection name for health plans
                        localField: "health_plan_for",
                        foreignField: "_id",
                        as: "health_plan_for"
                    }
                },
                {
                    $unwind: "$health_plan_for"
                },
                {
                    $lookup: {
                        from: "planservicenews", // Replace with the actual collection name for planservicenews
                        localField: "health_plan_for._id", // Assuming health_plan_for has an _id field
                        foreignField: "for_plan",
                        as: "plan_service_news"
                    }
                },
                {
                    $sort: sortingarray
                },
                {
                    $skip: (page - 1) * Number(limit)
                }
            ];

            if (limit != 0) {
                data.push({
                    $limit: Number(limit) // Make sure `limit` is a numeric value
                })
            }

            let result = await Subscriber.aggregate(data);

            console.log(result, "resulttt____");

            let myarray = [];

            for (let i = 0; i < result.length; i++) {

                let primaryInsuredId = await subscriber.findOne({ secondary_subscriber: result[i]._id });
                //console.log(result[i].insurance_card_id_proof);

                let insurance_card_id_proof = '';
                if (result[i].insurance_card_id_proof !== '') {
                    let newaa = await getDocument1(result[i].insurance_card_id_proof);
                    const base64Data = newaa.toString('base64');
                    insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
                }
                let myobj = {
                    _id: result[i]._id,
                    insuranceName: "",
                    secondary_subscriber: result[i].secondary_subscriber,
                    subscriber_type: result[i].subscriber_type, subscription_for: result[i].subscription_for, unique: result[i].unique,
                    health_plan_for: result[i].health_plan_for,
                    company_name: result[i].company_name, subscriber_full_name: result[i].subscriber_full_name, subscriber_first_name: result[i].subscriber_first_name, subscriber_middle_name: result[i].subscriber_middle_name, subscriber_last_name: result[i].subscriber_last_name,
                    date_of_birth: result[i].date_of_birth,
                    mobile: result[i].mobile,
                    country_code: result[i].country_code,
                    age: result[i].age,
                    gender: result[i].gender,
                    insurance_id: result[i].insurance_id,
                    policy_id: result[i].policy_id,
                    plan_services: result[i].plan_service_news,
                    card_id: result[i].card_id,
                    employee_id: result[i].employee_id,
                    insurance_holder_name: result[i].insurance_holder_name,
                    insurance_validity_from: result[i].insurance_validity_from,
                    insurance_validity_to: result[i].insurance_validity_to,
                    reimbersement_rate: result[i].reimbersement_rate,
                    insurance_card_id_proof: insurance_card_id_proof,
                    is_deleted: result[i].is_deleted,
                    for_user: result[i].for_user,
                    createdAt: result[i].createdAt,
                    updatedAt: result[i].updatedAt,
                    dateofcreation: result[i].dateofcreation,
                    is_active: result[i].is_active,
                    primaryInsuredId: primaryInsuredId,
                    relationship_with_insure: result[i].relationship_with_insure

                }

                myarray.push(myobj)
                console.log(i, "tttt");
            }
            result = myarray

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                },
                message: "successfully fetched  subscriber",
                errorCode: null,
            });


        } catch (error) {
            console.log(error);
            console.log(error, "errorrrrrrr_____");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async viewSubscriberDetailsWithItsSecondary(req, res) {
        try {
            var subscriberIds = req.body.subscriberIds;

            var resultData = [];

            for (let i = 0; i < subscriberIds.length; i++) {
                console.log(subscriberIds[i], "idddddd______");

                const result = await Subscriber.findOne({ _id: { $eq: mongoose.Types.ObjectId(subscriberIds[i]) } })
                    .populate({
                        path: 'health_plan_for'
                    })
                    .exec();

                console.log(result, "resultd______");

                const planID = result.health_plan_for._id;
                console.log(planID, "planIDddd_______");
                const planService = await PlanServiceNew.find({ for_plan: planID })

                console.log(planService, "planService____");
                // const planExclusion = await PlanExclusionNew.find({ for_plan: planID })

                if (result.insurance_card_id_proof !== '') {
                    //console.log(result.insurance_card_id_proof, "insurance_card_id_proofff11_____");

                    let newaa = await getDocument1(result.insurance_card_id_proof);
                    const base64Data = newaa.toString('base64');
                    const insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
                    result.insurance_card_id_proof = insurance_card_id_proof;
                }

                const secondaryValue = result.secondary_subscriber
                const secondaryDetails = [];
                for (const id of secondaryValue) {
                    const data = await Subscriber.findById(id).populate({
                        path: 'health_plan_for'
                    })
                        .exec();

                    if (data != null) {
                        if (data.insurance_card_id_proof !== '') {
                            console.log(data.insurance_card_id_proof, "insurance_card_id_proofff_____");

                            let newaa = await getDocument1(data.insurance_card_id_proof);
                            const base64Data = newaa.toString('base64');
                            const insurance_card_id_proof = `data:image/jpeg;base64,${base64Data}`;
                            data["insurance_card_id_proof"] = insurance_card_id_proof;
                        }

                        //secondaryDetails.push(data);
                    }

                    const planService2 = await PlanServiceNew.find({ for_plan: data.health_plan_for._id });
                    console.log(planService2, "planServicee_sec____", data);

                    const secondarySubscriberObject = {
                        subscriber: data,
                        planService: planService2,
                        // Additional fields as needed
                    };

                    secondaryDetails.push(secondarySubscriberObject);
                }

                const primarySubscriberObject = {
                    subscriber: result,
                    planService: planService,
                    // Additional fields as needed
                };

                const subscriberObject = {
                    primary_subscriber: primarySubscriberObject,
                    secondary_subscriber: secondaryDetails,
                    //planExclusion: planExclusion
                };

                // Add the subscriber object to the resultData array
                resultData.push(subscriberObject);

                console.log(resultData, "resultDataaaa_______");
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriber_details: resultData
                },
                message: "successfully fetched  subscriber",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }



    async getSubscriberDetailsForClaim(req, res) {
        try {
            const result = await Subscriber.findOne({ _id: { $eq: req.query.subscriber_id } })
                .populate({
                    path: 'health_plan_for'
                })
                .exec();
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriber_details: result,
                },
                message: "successfully fetched  subscriber",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async uploadSubscriberFromCSV(req, res) {

        console.log("jhjhkk");

        var { for_user, addedBy } = req.body

        const filePath = './uploads/' + req.filename

        console.log("jhjhkk", filePath);

        let checkRecord = 0;


        try {
            let extractData = await processExcelsubscriber(filePath);
            if (!extractData) {
                // console.log("errorrrrrrrrrrrrrrrrrrr");
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Date Format should like this 'DD MMMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD. please check Date format in DOB, InsuranceValidityFromDate, InsuranceValidityToDate column",
                    errorCode: null,
                });
            }

            const isValidFile = validateColumnWithExcel(PrimarySubscriberColumn, extractData[0])
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
            }
            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(for_user))

            if (checkUser.role == 'INSURANCE_STAFF') {
                let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(for_user) })
                for_user = staffData?.for_user
            }

            const getAllPrimarySubscribers = await Subscriber.find({ for_user: { $eq: for_user }, subscription_for: "Primary", is_deleted: false }).select({ unique: 1, secondary_subscriber: 1 }).exec()


            let uniqueIDObject = {}
            let secondaryIDObject = {} //Create object of all primary subscribers which having secondary records
            for (let index = 0; index < getAllPrimarySubscribers.length; index++) {
                if (getAllPrimarySubscribers[index].unique) {
                    uniqueIDObject[getAllPrimarySubscribers[index].unique] = getAllPrimarySubscribers[index]._id
                    secondaryIDObject[getAllPrimarySubscribers[index].unique] = getAllPrimarySubscribers[index].secondary_subscriber

                }
            }
            const result = [].concat(...Object.values(secondaryIDObject));

            const getAllSubscribersrecords = await Subscriber.find({ _id: { $in: result }, subscription_for: "Secondary", is_deleted: false }).select({ subscriber_first_name: 1, date_of_birth: 1 }).exec()



            const filterPrimarySubscribersFromCSVFile = extractData.filter((val) => { return val.SubscriptionFor == 'Primary' && !(val.SubscriberUniqueID in uniqueIDObject) })
            const filterSecondarySubscribersFromCSVFilenew = extractData.filter((val) => { return val.SubscriptionFor == 'Secondary' })



            const filterSecondarySubscribersFromCSVFile = filterSecondarySubscribersFromCSVFilenew.filter(item2 => {


                return !getAllSubscribersrecords.some(item1 => {
                    return (
                        item1.subscriber_first_name === item2.SubscriberFirstName &&
                        item1.date_of_birth === item2.DOB
                    );
                });
            });

            // console.log(filterPrimarySubscribersFromCSVFile, "filterPrimarySubscribersFromCSVFile");
            // console.log(extractData, "extractData");
            var insertprimaryrecord = [];
            try {
                const insertAllPrimaryRecords = await insertPrimaryRecords(filterPrimarySubscribersFromCSVFile, uniqueIDObject, for_user, addedBy)
                if (insertAllPrimaryRecords.skiprecord.length > 0) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Invalid Health plan name or subscriber Unique id in primary subscriber record. please check and try again",
                        errorCode: null,
                    });
                }
                else {
                    insertprimaryrecord = insertAllPrimaryRecords.recordArray;
                }
                uniqueIDObject = insertAllPrimaryRecords.object;
            } catch (error) {
                console.log("Errrorr--->", error);
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: error.message ? error.message : "Something went wrong",
                    errorCode: null,
                });
            }
            try {
                let insertAllSecondaryRecords = await insertSecondaryRecords(filterSecondarySubscribersFromCSVFile, uniqueIDObject, for_user, secondaryIDObject, insertprimaryrecord, addedBy)
                // console.log("insertAllSecondaryRecords------------",insertAllSecondaryRecords);
                const insertAllSecondaryRecordsLength = Object.keys(insertAllSecondaryRecords.object).length
                if (insertAllSecondaryRecords.skiprecord.length > 0) {

                    return sendResponse(req, res, 200, {

                        status: false,

                        body: null,

                        message: "Invalid Health plan name or subscriber Unique id in Secondary subscriber record. please check and try again",

                        errorCode: null,

                    });

                }

                if (insertAllSecondaryRecords.skipsecondaryrecord.length > 0) {

                    return sendResponse(req, res, 200, {

                        status: false,

                        body: null,

                        message: "Some Secondary record not having primary record. so please check your excel file and try again",

                        errorCode: null,

                    });

                }

            } catch (error) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: error.message ? error.message : "Something went wrong",
                    errorCode: null,
                });
            }
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "successfully uploaded excel of subscriber",
                errorCode: null,
            });
        } catch (error) {
            console.log("sghghsghsj");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "INTERNAL_ERROR",

            });

        }

    }
    async readAndUploadFile(req, res) {
        // console.log(req.body, 'body');
        console.log(req.files, 'files');
        sendResponse(req, res, 200, {
            status: true,
            body: null,
            message: "successfully uploaded file",
            errorCode: null,
        });
    }
    async getSubscriberInsurance(req, res) {
        try {
            const result = await Subscriber.findOne({ insurance_id: { $eq: req.body.id } }).lean();
            if (!result) {
                return sendResponse(req, res, 422, {
                    status: false,
                    body: null,
                    message: "failed to fetch subscriber details",
                    errorCode: "SUBSCRIBER_NOT_FOUND",
                })
            }
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched subscriber details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber details",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async checkSubscriptionExpiry(req, res) {
        try {
            const {
                insurance_id,
                policy_id,
                card_id,
                employee_id,
                subscriber_id
            } = req.body
            const currentTimestamp = new Date()
            let currentTime = currentTimestamp.getTime();
            const findSubscriber = await Subscriber.findOne({
                _id: subscriber_id
            })
                .populate({
                    path: "health_plan_for",
                })
            if (!findSubscriber) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Subscriber not found",
                    errorCode: "SUBSCRIBER_NOT_FOUND",
                })
            }
            const insurance_validity_from_string = findSubscriber.insurance_validity_from
            const insurance_validity_from = new Date(insurance_validity_from_string).getTime()

            const insurance_validity_to_string = findSubscriber.insurance_validity_to
            const insurance_validity_to = new Date(insurance_validity_to_string).getTime()

            if (insurance_validity_from < currentTime && currentTime < insurance_validity_to) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        subscription_valid: true,
                        findSubscriber
                    },
                    message: "Subscription is valid",
                    errorCode: null,
                })
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: {
                        subscription_valid: false,
                        findSubscriber
                    },
                    message: "Subscription expired",
                    errorCode: "SUBSCRIPTION_EXPIRED",
                })
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch insurance staff list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async verifyInsuranceDetails(req, res) {
        try {
            const { insurance_id } = req.query
            const result = await Subscriber.find({
                insurance_id
            })
                .populate({
                    path: "health_plan_for",
                })
            if (!result.length) return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "",
                errorCode: "SUBSCRIBER_NOT_FOUND",
            });
            const getHealthPlanID = result[0].health_plan_for._id
            const planService = await PlanServiceNew.find({ for_plan: { $eq: getHealthPlanID } })
                .populate({
                    path: 'has_category',
                    populate: {
                        path: 'in_category'
                    }
                })
            const planExclusion = await PlanExclusionNew.find({ for_plan: { $eq: getHealthPlanID } })
                .populate({
                    path: 'in_exclusion',
                    populate: {
                        path: 'in_exclusion'
                    }
                })
            const resultData = result[0]

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    resultData,
                    planService,
                    planExclusion
                },
                message: "Subscriber details",
                errorCode: "SUBSCRIBER_DETAILS",
            })
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to verify insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getPlanServiceBySubscriber(req, res) {
        try {
            const { subscriber_id } = req.query
            // const result = await Subscriber.find({
            //     _id: subscriber_id
            // })
            //     .populate({
            //         path: "health_plan_for",
            //     })
            const result = await Subscriber.aggregate([
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(subscriber_id)
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: "health_plan_for",
                        foreignField: "_id",
                        as: "health_plan_for",
                    }
                },
                { $unwind: "$health_plan_for" },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "for_user",
                        foreignField: "for_portal_user",
                        as: "for_user",
                    }
                },
                { $unwind: "$for_user" },
            ])
            // console.log(result, "check result 777");

            if (!result.length) return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "",
                errorCode: "SUBSCRIBER_NOT_FOUND",
            });
            let subscriptionFor = result[0]?.subscription_for;
            console.log(subscriptionFor, "subscriptionFor");
            var primaryHealthPlanId = '';
            var primaryValidityTo = "";
            var primaryValidityFrom = "";
            if (subscriptionFor == "Secondary") {
                var detailsInsurance = await Subscriber.aggregate([
                    {
                        $match: {
                            secondary_subscriber: mongoose.Types.ObjectId(subscriber_id),
                            is_deleted: false,
                        },
                    },
                ]);
                if (detailsInsurance.length > 0) {

                    primaryHealthPlanId = detailsInsurance[0].health_plan_for
                    primaryValidityTo = detailsInsurance[0].insurance_validity_to
                    primaryValidityFrom = detailsInsurance[0].insurance_validity_from
                }
            } else {
                primaryHealthPlanId = result[0].health_plan_for._id;
                primaryValidityTo = result[0].insurance_validity_to
                primaryValidityFrom = result[0].insurance_validity_from

            }
            const getHealthPlanID = result[0].health_plan_for._id;

            const insurance_card_id_proofimage = result[0].insurance_card_id_proof;
            if (insurance_card_id_proofimage != '' && insurance_card_id_proofimage != undefined) {
                const headers = {
                    'Authorization': req.headers['authorization']
                }
                const insurance_card_id_proofimagearray = [insurance_card_id_proofimage]
                const insurance_card_id_proof = await httpService.postStaging('pharmacy/get-signed-url', { url: insurance_card_id_proofimagearray }, headers, 'pharmacyServiceUrl');
                result[0].insurance_card_id_proof = insurance_card_id_proof.data[0]
            }
            const planServicePrimary = await PlanServiceNew.find({ for_plan: { $eq: primaryHealthPlanId } })
            const planService = await PlanServiceNew.find({ for_plan: { $eq: getHealthPlanID } })
            const planExclusion = await PlanExclusionNew.find({ for_plan: { $eq: getHealthPlanID } })
            const resultData = result[0]

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    /*  health_plan_for, */
                    planServicePrimary,
                    primaryValidityTo,
                    primaryValidityFrom,
                    resultData,
                    planService,
                    planExclusion
                },
                message: "Subscriber details",
                errorCode: "SUBSCRIBER_DETAILS",
            })
        } catch (error) {
            console.log(error, "123333");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to verify insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async subscriberDetails(req, res) {
        try {
            const result = await Subscriber.find({ _id: { $eq: req.query.subscriber_id } })

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched  subscriber details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber details",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async listAllTypeOFSubscriberbyid(req, res) {
        try {
            const result = await Subscriber.find({
                _id: { $in: req.body.allsubscriber_id },
                is_deleted: false,
                is_active: true
            })
                .populate({
                    path: "health_plan_for",
                    select: { name: 1 },
                })
                .sort([["createdAt", -1]])
                .exec();

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched  subscriber",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async insuranceSubscriberListforexport(req, res) {
        const { user_id } = req.query
        var filter
        filter = {
            is_deleted: false,
            for_user: { $eq: mongoose.Types.ObjectId(user_id) }
        }


        try {
            var result = '';
            // if (limit > 0) {
            //     result = await Subscriber.find(filter)
            //         .sort([["createdAt", -1]])
            //         .skip((page - 1) * limit)
            //         .limit(limit * 1)
            //         .exec();
            // }
            // else {
            // if(user){
            result = await Subscriber.aggregate([{
                $match: filter
            },
            {
                $lookup: {
                    from: "plans", // Replace with the actual collection name for in_location
                    localField: "health_plan_for",
                    foreignField: "_id",
                    as: "health_plan_for"
                }
            },
            { $unwind: { path: "$health_plan_for", preserveNullAndEmptyArrays: true } },
            { $sort: { "createdAt": -1 } },
            {
                $project: {
                    _id: 0,
                    SubscriberUniqueID: "$unique",
                    SubscriberType: "$subscriber_type",
                    GroupName: "$company_name",
                    SubscriptionFor: "$subscription_for",
                    SubscriberFirstName: "$subscriber_first_name",
                    SubscriberMiddleName: "$subscriber_middle_name",
                    SubscriberLastName: "$subscriber_last_name",
                    SubscriberMobile: "$mobile",
                    SubscriberCountryCode: "$country_code",
                    SubscriberReimbersementRate: "$reimbersement_rate",
                    HealthPlan: "$health_plan_for.name",
                    DOB: "$date_of_birth",
                    Gender: "$gender",
                    InsuranceID: "$insurance_id",
                    PolicyID: "$policy_id",
                    CardID: "$card_id",
                    EmployeeID: "$employee_id",
                    InsuranceHolderName: "$insurance_holder_name",
                    InsuranceValidityFromDate: "$insurance_validity_from",
                    InsuranceValidityToDate: "$insurance_validity_to",
                    Relationship: "$relationship_with_insure",
                    DateofCreation: "$dateofcreation",
                    DateofJoining: "$dateofjoining"
                }
            }
            ])
            // }

            // }

            let array = result.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `Subscriber added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add lab test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceSubscriberListforexportSuperadmin(req, res) {
        const { user_id } = req.query
        var filter
        filter = {
            is_deleted: false,
            for_user: { $eq: mongoose.Types.ObjectId(user_id) }
        }


        try {
            var result = '';
            // if (limit > 0) {
            //     result = await Subscriber.find(filter)
            //         .sort([["createdAt", -1]])
            //         .skip((page - 1) * limit)
            //         .limit(limit * 1)
            //         .exec();
            // }
            // else {
            result = await Subscriber.aggregate([{
                $match: filter
            },
            {
                $lookup: {
                    from: "plans", // Replace with the actual collection name for in_location
                    localField: "health_plan_for",
                    foreignField: "_id",
                    as: "health_plan_for"
                }
            },
            { $unwind: { path: "$health_plan_for", preserveNullAndEmptyArrays: true } },
            { $sort: { "createdAt": -1 } },
            {
                $project: {
                    _id: 0,
                    SubscriberUniqueID: "$unique",
                    SubscriberType: "$subscriber_type",
                    GroupName: "$company_name",
                    SubscriptionFor: "$subscription_for",
                    SubscriberFirstName: "$subscriber_first_name",
                    SubscriberMiddleName: "$subscriber_middle_name",
                    SubscriberLastName: "$subscriber_last_name",
                    SubscriberMobile: "$mobile",
                    SubscriberCountryCode: "$country_code",
                    SubscriberReimbersementRate: "$reimbersement_rate",
                    HealthPlan: "$health_plan_for.name",
                    DOB: "$date_of_birth",
                    Gender: "$gender",
                    InsuranceID: "$insurance_id",
                    PolicyID: "$policy_id",
                    CardID: "$card_id",
                    EmployeeID: "$employee_id",
                    InsuranceHolderName: "$insurance_holder_name",
                    InsuranceValidityFromDate: "$insurance_validity_from",
                    InsuranceValidityToDate: "$insurance_validity_to",
                    Relationship: "$relationship_with_insure",
                    DateofCreation: "$dateofcreation",
                    DateofJoining: "$dateofjoining"
                }
            }
            ])

            // }

            let array = result.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `Subscriber added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add lab test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async activeORdeactivte_Subscriber(req, res) {

        const { subscriber_id } = req.body
        try {
            var result;
            console.log(subscriber_id, req.body, "fgfjhhhhhhhhhhhhh");

            // if (subscriber_id == '') {

            //     result = await Subscriber.updateMany(
            //         { for_user: mongoose.Types.ObjectId(user_id) },
            //         {
            //             $set: { is_active: is_active }
            //         },
            //         { new: true }
            //     )    
            // }
            // else {

            const findData = await Subscriber.findOne({ _id: mongoose.Types.ObjectId(subscriber_id) })
            //  var document = db.documents.findOne({ "_id": documentIdToUpdate });

            if (findData) {
                // Toggle the value (True to False and vice versa)
                console.log(findData.is_active, "updatedValue");

                var updatedValue = !findData.is_active;
                console.log(updatedValue, "updatedValue");
                // Update the document with the new value
                await Subscriber.updateOne(
                    { "_id": subscriber_id },
                    { $set: { "is_active": updatedValue } }
                );

                sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "Subscriber update successfully.",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Subscriber Not Found",
                    errorCode: null,
                });
            }
            console.log("findData.length________", findData.length);

            // if(findData.length > 0){
            //     for (let i = 0; i < findData.length; i++) {
            //         const element = findData[i].secondary_subscriber;

            //         const subscriberFor = findData[i].subscription_for;

            //         let data_id = findData[i]._id

            //         if(subscriberFor == 'Primary'){
            //             if(element.length > 0){
            //                 result = await Subscriber.updateMany(
            //                     { _id: { $in: element } },
            //                     {
            //                         $set: { is_active: is_active }
            //                     },
            //                     { new: true }
            //                 )
            //             }
            //         }else{
            //             const findSecondary = await Subscriber.findOne({ secondary_subscriber: data_id }) 
            //             console.log("findSecondary=====",findSecondary);

            //             if(findSecondary){
            //                 console.log("IFFFFFFFFFFF",data_id);
            //                 await Subscriber.updateOne({ _id: findSecondary._id },{ $pull: { secondary_subscriber: mongoose.Types.ObjectId(data_id) } })
            //             }

            //         }

            //     }
            // }

            // result = await Subscriber.updateMany(
            //     { _id: { $in: subscriber_id } },
            //     {
            //         $set: { is_active: is_active }
            //     },
            //     { new: true }
            // )
            // }

            // if (!result) return sendResponse(req, res, 500, {
            //     status: false,
            //     body: null,
            //     message: "failed to update subscriber",
            //     errorCode: "INTERNAL_SERVER_ERROR",
            // })

        } catch (error) {
            console.log(error, "check log error");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update subscriber",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async allSubscriberCountByinsuranceId(req, res) {
        var { for_user, subscription_for, year } = req.query;

        try {
            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(for_user));

            if (checkUser.role == 'INSURANCE_STAFF') {
                let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(for_user) });
                for_user = staffData?.for_user;
            }

            let query = {
                for_user: mongoose.Types.ObjectId(for_user),
                is_deleted: false,
                is_active: true
            };

            if (subscription_for != '') {
                query.subscription_for = subscription_for;
            }

            if (year != '') {
                const startOfYear = new Date(`${year}-01-01`);
                const endOfYear = new Date(`${year}-12-31`);

                query.createdAt = {
                    $gte: startOfYear,
                    $lte: endOfYear
                };
            }

            const findSubscriber = await Subscriber.find(query);


            let result = findSubscriber.length;

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Subscriber Count.`,
                errorCode: null,
            });

        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add lab test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



}

module.exports = new InsuranceSubscriber()