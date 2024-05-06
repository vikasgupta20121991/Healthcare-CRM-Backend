"use strict";

// models
import PlanServiceNew from "../../../models/insurance/plan/service2";
import PlanExclusionNew from "../../../models/insurance/plan/exclusion2";
import PlanService from "../../../models/insurance/plan/service";
import PlanExclusion from "../../../models/insurance/plan/exclusion";
import Plan from "../../../models/insurance/plan";
import PortalUser from "../../../models/insurance/user/portal_user";
import Staffinfos from "../../../models/insurance/user/staff_info";
// utils
import { sendResponse } from "../../../helpers/transmission";
import mongoose from "mongoose";
import subscriber from "../../../models/insurance/subscriber/subscriber";

export class InsurancePlan {
    async addService(req, res) {
        try {
            var { services, for_plan, for_user, addedBy } = req.body;

            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(for_user))

           
            if(checkUser.role == 'INSURANCE_STAFF'){  

              let staffData = await Staffinfos.findOne({for_portal_user : mongoose.Types.ObjectId(for_user)})          

              for_user = staffData?.for_user
            
            }


            const key = 'service';
            var uniqueInput = [...new Map(services.map(item => [item[key], item])).values()]
            const allDelete = await PlanServiceNew.deleteMany({ for_plan });

            const inputArray = uniqueInput
            const allData = await PlanServiceNew.find({ for_plan });
            var existData = []
            for (let oneData of allData) {
                inputArray.map((singleData) => {
                    if (oneData.service == singleData.service) {
                        existData.push(singleData.service)
                    }
                })
            }

            var uniqueData = inputArray
            for (let input of existData) {
                uniqueData = uniqueData.filter(function (singleData) {
                    return singleData.service != input;
                });
            }

            const serviceList = uniqueData.map((service) => ({
                ...service,
                for_user: for_user,
                for_plan,
                addedBy
            }));
            const result = await PlanServiceNew.insertMany(serviceList);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully added plan service",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrr_____");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add plan service",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deletePlanService(req, res) {
        try {
            const { planServiceId } = req.body;
            const result = await PlanServiceNew.deleteOne({ _id: planServiceId })
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "successfully deleted plan service",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete plan service",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addExclusion(req, res) {
        try {
            const { exclusions, for_user, for_plan } = req.body;
            const allDelete = await PlanExclusionNew.deleteMany({ for_plan });
            const allData = await PlanExclusionNew.find({ for_plan });

            const key = 'in_exclusion';
            var uniqueInput = [...new Map(exclusions.map(item => [item[key].name, item])).values()]
            const inputArray = uniqueInput
            var existData = []
            for (let oneData of allData) {
                inputArray.map((singleData) => {
                    if (oneData.in_exclusion.name == singleData.in_exclusion.name) {
                        existData.push(singleData.in_exclusion.name)
                    }
                })
            }
            var uniqueData = inputArray
            for (let input of existData) {
                uniqueData = uniqueData.filter(function (singleData) {
                    return singleData.in_exclusion.name != input;
                });
            }
            const exclusionList = uniqueData.map((exclusion) => ({
                ...exclusion,
                for_user,
                for_plan,
            }));
            const result = await PlanExclusionNew.insertMany(exclusionList);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully added plan exclusion",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrr_____");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add plan exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deletePlanExclusion(req, res) {
        try {
            const { planExclusionId } = req.body;
            const result = await PlanExclusionNew.deleteOne({ _id: planExclusionId })
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "successfully deleted plan exclusion",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete plan exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addPlan(req, res) {
        try {
            console.log("insideeeee_____");
            const {
                name,
                description,
                plan_type,
                total_care_limit: {
                    primary_care_limit,
                    secondary_care_limit,
                    grand_total,
                },
                reimbursment_rate,
                contract_exclusion,
                added_by,
                for_user,
            } = req.body;

            console.log(req.body, "bodyyyy_______");

            const checkExists = await Plan.find({ name, for_user: { $eq: for_user }, is_deleted: false })
            if (checkExists.length > 0) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Plan already exists",
                    errorCode: null,
                });
            }
            const plan = new Plan({
                name,
                description,
                default: plan_type === "default",
                total_care_limit: {
                    primary_care_limit,
                    secondary_care_limit,
                    grand_total,
                },
                reimbursment_rate,
                contract_exclusion,
                added_by,
                for_user,
            });
            const result = await plan.save();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully added plan",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "erorrr_______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add plan",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateService(req, res) {
        try {
            const {
                planServiceId,
                reimbursment_rate,
                in_limit: { service_limit, category_limit },
                has_conditions: { repayment_condition, category_condition },
                pre_authorization,
                waiting_period: { duration, redeemed },
                has_category,
                service,
                comment,
                for_plan,
                for_user
            } = req.body;
            const checkExists = await PlanServiceNew.find({ service, for_user: { $eq: for_user }, _id: { $ne: planServiceId }, for_plan: { $eq: for_plan } })
            if (checkExists.length > 0) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Plan Service already exists",
                    errorCode: null,
                });
            }
            const result = await PlanServiceNew.findOneAndUpdate(
                { _id: planServiceId },
                {
                    $set: {
                        reimbursment_rate,
                        in_limit: { service_limit, category_limit },
                        has_conditions: { repayment_condition, category_condition },
                        pre_authorization,
                        waiting_period: { duration, redeemed },
                        has_category,
                        for_plan,
                        service,
                        comment,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated plan service",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to update plan service",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateExclusion(req, res) {
        try {
            const { planExclusionId, in_exclusion, for_plan, for_user } = req.body;
            const checkExists = await PlanExclusionNew.find({ ['in_exclusion.name']: in_exclusion.name, for_user: { $eq: for_user }, _id: { $ne: planExclusionId }, for_plan: { $eq: for_plan } })
            if (checkExists.length > 0) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Plan Exclusion already exists",
                    errorCode: null,
                });
            }
            const result = await PlanExclusionNew.findOneAndUpdate(
                { _id: planExclusionId },
                {
                    $set: {
                        in_exclusion,
                        for_plan,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated plan exclusion",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update plan exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updatePlan(req, res) {
        try {
            const {
                name,
                description,
                plan_type,
                total_care_limit: {
                    primary_care_limit,
                    secondary_care_limit,
                    grand_total,
                },
                reimbursment_rate,
                contract_exclusion,
                planId,
                for_user
            } = req.body;
            const checkExists = await Plan.find({ name, for_user: { $eq: for_user }, _id: { $ne: planId } })
            if (checkExists.length > 0) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Plan already exists",
                    errorCode: null,
                });
            }
            const result = await Plan.findOneAndUpdate(
                { _id: planId },
                {
                    $set: {
                        name,
                        description,
                        default: plan_type === "default",
                        total_care_limit: {
                            primary_care_limit,
                            secondary_care_limit,
                            grand_total,
                        },
                        reimbursment_rate,
                        contract_exclusion,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated plan",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listPlanService(req, res) {
        try {
            const { userId, limit, page, searchText, plan_type } = req.body;
            console.log("req.query.sort==>", req.body.sort);
            var sort = req.body.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);

            } else {
                sortingarray['createdAt'] = -1;

            }
            console.log("sortingarray--->", sortingarray);
            var filter = { is_deleted: false }

            let objectIds = []

            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(userId))

           

            if (userId !== "") {
                let ids = userId.split(',')              
                
                if(checkUser.role == 'INSURANCE_STAFF'){   
                    let staffData = await Staffinfos.findOne({for_portal_user : mongoose.Types.ObjectId(userId)})

                    objectIds.push(staffData?.for_user)
                    filter.for_user = { $in: objectIds }

                }else{

                    objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
                    console.log(objectIds);
                    filter.for_user = { $in: objectIds }
                }                  

            }
            else {
                filter.for_user = { $in: [] }

            }


            if (plan_type !== "") {
                filter.default = plan_type
            }

            if (searchText) {
                filter['$or'] = [
                    { name: { $regex: searchText || "", $options: "i" } },
                    // {category: { $regex: searchText || "", $options: "i" } },
                    // {service: { $regex: searchText || "", $options: "i" } },
                ]
            }
console.log("filters-----",filter);
            const aggregate = [
                {
                    $lookup: {
                        from: "planservicenews",
                        localField: "_id",
                        foreignField: "for_plan",
                        as: "planservicenews"
                    }
                },
                { $unwind: "$planservicenews" },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "for_user",
                        foreignField: "for_portal_user",
                        as: "insuranceData"
                    }
                },
                { $unwind: "$insuranceData" },
                {
                    $addFields: {
                        category: "$planservicenews.has_category",
                        service: "$planservicenews.service",
                    }
                },
                {
                    $match: filter
                },

                {
                    $group: {
                        _id: "$planservicenews.for_plan",
                        plan_name: { $addToSet: "$name" },
                        default: { $addToSet: "$default" },
                        planService: { $addToSet: "$planservicenews" },
                        createdAt: { $addToSet: "$createdAt" },
                        reimbursment_rate: { $addToSet: "$reimbursment_rate" },
                        isuranceName: { $addToSet: "$insuranceData.company_name" },
                    }
                },
                // { $unwind: "$isuranceName" },
                { $unwind: "$plan_name" },
                { $unwind: "$default" },
                { $unwind: "$createdAt" },
                { $unwind: "$reimbursment_rate" },
                { $sort: sortingarray },
            ]
            if (limit) {
                aggregate.push({
                    $facet: {
                        totalCount: [
                            {
                                $count: 'count'
                            }
                        ],
                        paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }],
                    }
                })
            } else {
                aggregate.push({
                    $facet: {
                        totalCount: [
                            {
                                $count: 'count'
                            }
                        ],
                        paginatedResults: [{ $skip: 0 }],
                    }
                })
            }
            const result = await Plan.aggregate(aggregate);
            console.log("result-----------",result[0].totalCount);

            const count = result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            console.log("result-----------",result[0].paginatedResults.length);

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result: result[0].paginatedResults,
                },
                message: "successfully fetched plan list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to fetch plan list",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getAllHealthPlan(req, res) {
        try {
            const { userId } = req.query;
            let id = {}
            /* if (userId !== "") {
                id = { for_user: { $eq: userId }, is_deleted:false }

            } */

            var filter = { is_deleted: false }
            let objectIds = []

            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(userId))

           

            if (userId !== "") {
                let ids = userId.split(',')              
                
                if(checkUser.role == 'INSURANCE_STAFF'){   
                    console.log("IFFFFF",userId);                 
                    let staffData = await Staffinfos.findOne({for_portal_user : mongoose.Types.ObjectId(userId)})
                    console.log("IFFFFF",staffData?.for_user);                 

                    objectIds.push(staffData?.for_user)
                    filter.for_user = { $in: objectIds }

                }else{
                    console.log("ELSE");                 

                    objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
                    console.log(objectIds);
                    filter.for_user = { $in: objectIds }
                }                  

            }
            else {
                filter.for_user = { $in: [] }

            }

            const aggregate = [
                {
                    $lookup: {
                        from: "planservicenews",
                        localField: "_id",
                        foreignField: "for_plan",
                        as: "planservicenews"
                    }
                },
                { $unwind: "$planservicenews" },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "for_user",
                        foreignField: "for_portal_user",
                        as: "insuranceData"
                    }
                },
                { $unwind: "$insuranceData" },
                {
                    $addFields: {
                        category: "$planservicenews.has_category",
                        service: "$planservicenews.service",
                    }
                },
                {
                    $match: filter
                },

                {
                    $group: {
                        _id: "$planservicenews.for_plan",
                        name: { $addToSet: "$name" },
                    }
                },
                // { $unwind: "$isuranceName" },
                { $unwind: "$name" },

            ]
            const result = await Plan.aggregate(aggregate);

            console.log(userId, "userIdddd______");
            /*  const result = await Plan.find(id)
                 .select("name")
                 .exec(); */

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    result,
                },
                message: "successfully fetched plan list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getPlan(req, res) {
        try {
            const { planId } = req.params;
            const result = await Plan.findOne({ _id: planId }).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched plan",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listService(req, res) {
        try {
            const { planId, limit, page } = req.body;
            const result = await PlanServiceNew.find({ for_plan: planId })
                // .populate({
                //     path: "has_category",
                //     select: { _id: 1, name: 1, status: 1 },
                //     populate: {
                //         path: "in_category",
                //         model: "Category",
                //         select: { _id: 1, name: 1, status: 1 },
                //     },
                // })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await PlanServiceNew.countDocuments({
                for_plan: { $eq: planId },
            });
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched plan services",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan services",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listExclusion(req, res) {
        try {
            const { planId, limit, page } = req.body;
            const result = await PlanExclusionNew.find({ for_plan: planId })
                .populate({
                    path: "in_exclusion",
                    select: {
                        _id: 1,
                        brand_name: 1,
                        exclusion_inn: 1,
                        comment: 1,
                        status: 1,
                    },
                    populate: {
                        path: "in_exclusion",
                        model: "Exclusion",
                        select: { _id: 1, name: 1, status: 1 },
                    },
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await PlanExclusionNew.countDocuments({
                for_plan: { $eq: planId },
            });
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched plan exclusion",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // Made by Tanay to fetch data from planservicenews behalf of for_user with unique has_category values
    async getplanserviceneByForUser(req, res) {
        try {
            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(req.query.for_user))
            let insuranceID = {}
            if(checkUser.role == 'INSURANCE_STAFF'){  

              let staffData = await Staffinfos.findOne({for_portal_user : mongoose.Types.ObjectId(req.query.for_user)})          

                insuranceID = staffData?.for_user
            
            }else{
              insuranceID = req.query.for_user              
            }

            let condition = {};
            condition = {
                for_user: mongoose.Types.ObjectId(insuranceID),

            };
console.log("condition----------",condition);
            let planServiceData = await PlanServiceNew.aggregate([
                {
                    $match: condition,
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: "for_plan",
                        foreignField: "_id",
                        as: "plansData"
                    }
                },
                {
                    $unwind: "$plansData",
                },
                {
                    $match: { "plansData.is_deleted": false }
                },
                {
                    $group: {
                        _id: "$has_category",
                        data: { $first: "$$ROOT" },
                    },
                },
                {
                    $replaceRoot: {
                        newRoot: "$data",
                    },
                },

                //    {
                //   $project: {
                //     for_user: 1,
                //     has_category:1,

                //   },
                // },


            ])

            // console.log(planServiceData, "planServiceData");

            if (planServiceData.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: planServiceData,
                    message: "successfully fetched plan service data",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 400, {
                    status: true,
                    body: planServiceData,
                    message: "Data not found",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log("error=============",error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };




    async healthplanDelete(req, res) {
        try {
            const { planId, action_name, action_value, insuranceCompanyId } = req.body;
            var result;
            var message = ''
            console.log(req.body, "req.body123");
            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                result = await Plan.findOneAndUpdate(
                    { _id: planId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Lab' : 'Successfully In-active Lab'
            }

            if (action_name == "delete") {

                if (planId == '') {

                    let checkisDeleted = await Plan.find({ is_deleted: false, for_user: insuranceCompanyId }, { _id: 1 });
                    const _idValues = checkisDeleted.map(item => item._id);

                    let subsciberDetails = await subscriber.find({ health_plan_for: { $in: _idValues }, is_deleted: false })
                    if (subsciberDetails.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "This health plan is assigned to subscribers. If you want to delete, please assign another health plan to subscribers or delete subscribers and try",
                            errorCode: null,
                        });
                    }

                    // const result = await Plan.aggregate(aggregate);

                    result = await Plan.updateMany(
                        { is_deleted: { $eq: false }, for_user: mongoose.Types.ObjectId(insuranceCompanyId) },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    // let checkisDeleted = await Plan.find({ is_deleted: false }, { _id: 1 });
                    // const _idValues = checkisDeleted.map(item => item._id);
                    let subsciberDetails = await subscriber.find({ health_plan_for: { $in: planId }, is_deleted: false })
                    if (subsciberDetails.length > 0) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "This health plan is assigned to subscribers. If you want to delete, please assign another health plan to subscribers or delete subscribers and try",
                            errorCode: null,
                        });
                    }
                    result = await Plan.updateMany(
                        { _id: { $in: planId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Plan'
            }


            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: message,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to performed action",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
}

