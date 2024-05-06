"use strict";

// models
import Exclusion from "../../../models/insurance/exclusion";
import ExclusionData from "../../../models/insurance/exclusion/detail";
import PlanExclusion from "../../../models/insurance/plan/exclusion";

// utils
import { sendResponse } from "../../../helpers/transmission";

export class InsuranceExclusion {
    async addExclusion(req, res) {
        try {
            const { exclusions, userId } = req.body;
            const exclusionList = exclusions.map((exclusion) => ({
                ...exclusion,
                for_user: userId,
            }));
            const result = await Exclusion.insertMany(exclusionList);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully added exclusion",
                errorCode: null,
            });
        } catch (error) {
            console.log(error,"errorrrrr______");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addDetails(req, res) {
        try {
            const { details, userId } = req.body;
            const exclusionDataList = details.map((exclusion) => ({
                brand_name: exclusion.brand_name,
                exclusion_inn: exclusion.exclusion_inn,
                comment: exclusion.comment,
                status: exclusion.status,
                in_exclusion: exclusion.exclusionId,
                for_user: userId,
            }));
            const result = await ExclusionData.insertMany(exclusionDataList);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully added exclusion details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add exclusion details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteExclusion(req, res) {
        try {
            const { exclusionId } = req.body;
            const exclusionResult = await Exclusion.deleteOne(
                {
                    _id: exclusionId,
                },
                { new: true }
            ).exec();
            const existExclusionDataResult = await ExclusionData.find({
                in_exclusion: exclusionId,
            }).select({ _id: 1 });
            let exclusionDataIds = [];
            let exclusionDataResult = null;
            let planExclusionResult = null;
            if (existExclusionDataResult.length > 0) {
                exclusionDataResult = await ExclusionData.deleteMany(
                    {
                        in_exclusion: exclusionId,
                    },
                    { new: true }
                ).exec();
                exclusionDataIds = existExclusionDataResult.map(function (item) {
                    return item["_id"];
                });
                planExclusionResult = await PlanExclusion.deleteMany(
                    {
                        in_exclusion: { $in: exclusionDataIds },
                    },
                    { new: true }
                ).exec();
            }
            const result = await Promise.all([
                exclusionResult,
                exclusionDataResult,
                planExclusionResult,
            ]);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully deleted exclusion",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteExclusionData(req, res) {
        try {
            const { exclusionDataId } = req.body;
            const exclusionDataResult = await ExclusionData.deleteOne(
                {
                    _id: exclusionDataId,
                },
                { new: true }
            ).exec();
            const planExclusionResult = await PlanExclusion.deleteMany(
                {
                    in_exclusion: { $in: exclusionDataId },
                },
                { new: true }
            ).exec();
            const result = await Promise.all([
                exclusionDataResult,
                planExclusionResult,
            ]);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully deleted exclusion data",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete exclusion data",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateExclusion(req, res) {
        try {
            const { exclusionId, name, status } = req.body;
            const result = await Exclusion.findOneAndUpdate(
                { _id: exclusionId },
                { $set: { name, status } },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated exclusion",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update exclusion",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateExclusionDetails(req, res) {
        try {
            const {
                brand_name,
                exclusion_inn,
                comment,
                exclusionId,
                status,
                exclusionDataId,
            } = req.body;
            const result = await ExclusionData.findOneAndUpdate(
                { _id: exclusionDataId },
                {
                    $set: {
                        brand_name,
                        exclusion_inn,
                        comment,
                        in_exclusion: exclusionId,
                        status,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated exclusion details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update exclusion details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listExclusion(req, res) {
        try {
            const { userId, limit, page, searchText, status } = req.body;
            const searchQuery = {
                // for_user: { $eq: userId },
                name: { $regex: searchText, $options: "i" },
            }
            if (status !== null) {
                searchQuery.status = status;
            }
            const result = await Exclusion.find(searchQuery)
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Exclusion.countDocuments(searchQuery);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched exclusion list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch exclusion list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listExclusionDetails(req, res) {
        try {
            const { userId, limit, page, searchText, in_exclusion, status } = req.body;
            const searchQuery = {
                // for_user: { $eq: userId },
                $or: [
                    {
                        brand_name: { $regex: searchText, $options: "i" },
                    },
                    {
                        exclusion_inn: { $regex: searchText, $options: "i" },
                    },
                    {
                        comment: { $regex: searchText, $options: "i" },
                    },
                ],
            }
            if (in_exclusion !== "") {
                searchQuery.in_exclusion = in_exclusion;
            }
            if (status !== null) {
                searchQuery.status = status;
            }
            const result = await ExclusionData.find(searchQuery)
                .populate({
                    path: "in_exclusion",
                    select: ["name"],
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await ExclusionData.countDocuments(searchQuery);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched exclusion details list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch exclusion details list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listExclusionAndCategoryExclusion(req, res) {
        try {
            const result = await Exclusion.aggregate([
                {
                    $lookup: {
                        from: "exclusiondatas",
                        localField: "_id",
                        foreignField: "in_exclusion",
                        as: "exclusiondatas",
                    }
                },
            ])
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully get exclusion and exclusion service list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get exclusion and exclusion service list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
}
