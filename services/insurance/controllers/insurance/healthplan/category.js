"use strict";

// models
import Category from "../../../models/insurance/category";
import CategoryService from "../../../models/insurance/category/service";
import PlanService from "../../../models/insurance/plan/service";

// utils
import { sendResponse } from "../../../helpers/transmission";

export class InsuranceCategory {
    async addCategory(req, res) {
        try {
            const { categories, userId } = req.body;
            const allData = await Category.find({});
            const inputArray = categories
            var existData = []
            for (let oneData of allData) {
                inputArray.map((singleData) => {
                    if (oneData.name == singleData.name) {
                        existData.push(singleData.name)
                    }
                })
            }
            var uniqueData = inputArray
            for (let input of existData) {
                uniqueData = uniqueData.filter(function (singleData) {
                    return singleData.name != input;
                });
            }
            const uniqueList = uniqueData.map((singleData) => ({
                ...singleData,
                for_user: userId,
            }));
            if (uniqueList.length == 0) {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Category name should be unique",
                    errorCode: null,
                });
            } else {
                const result = await Category.insertMany(uniqueList);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "successfully added category",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to add category",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addService(req, res) {
        try {
            const { services, for_user } = req.body;
            const allData = await CategoryService.find({});
            const inputArray = services
            var existData = []
            for (let oneData of allData) {
                inputArray.map((singleData) => {
                    if (oneData.name == singleData.name) {
                        existData.push(singleData.name)
                    }
                })
            }
            var uniqueData = inputArray
            for (let input of existData) {
                uniqueData = uniqueData.filter(function (singleData) {
                    return singleData.name != input;
                });
            }
            const uniqueList = uniqueData.map((singleData) => ({
                ...singleData,
                for_user: for_user,
            }));
            if (uniqueList.length == 0) {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Category service name should be unique",
                    errorCode: null,
                });
            } else {
                // const result = await CategoryService.insertMany(uniqueList);
                sendResponse(req, res, 200, {
                    status: true,
                    body: uniqueList,
                    message: "successfully added category service",
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add category service",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteCategory(req, res) {
        try {
            const { categoryId } = req.body;
            const categoryResult = await Category.deleteOne(
                {
                    _id: categoryId,
                },
                { new: true }
            ).exec();
            const existCategoryServiceResult = await CategoryService.find({
                in_category: categoryId,
            }).select({ _id: 1 });
            let categoryServiceIds = [];
            let categorySeriveResult = null;
            let planServiceResult = null;
            if (existCategoryServiceResult.length > 0) {
                categorySeriveResult = await CategoryService.deleteMany(
                    {
                        in_category: categoryId,
                    },
                    { new: true }
                ).exec();
                categoryServiceIds = existCategoryServiceResult.map(function (item) {
                    return item["_id"];
                });
                planServiceResult = await PlanService.deleteMany(
                    {
                        has_category: { $in: categoryServiceIds },
                    },
                    { new: true }
                ).exec();
            }
            const result = await Promise.all([
                categoryResult,
                categorySeriveResult,
                planServiceResult,
            ]);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully deleted category",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete category",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteCategoryService(req, res) {
        try {
            const { serviceId } = req.body;
            const categoryServiceResult = await CategoryService.deleteOne(
                {
                    _id: serviceId,
                },
                { new: true }
            ).exec();
            const planServiceResult = await PlanService.deleteMany(
                {
                    has_category: { $in: serviceId },
                },
                { new: true }
            ).exec();
            const result = await Promise.all([
                categoryServiceResult,
                planServiceResult,
            ]);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully deleted category service",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to delete category service",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateCategory(req, res) {
        try {
            const { categoryId, name, status } = req.body;
            const result = await Category.findOneAndUpdate(
                { _id: categoryId },
                { $set: { name, status } },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated category",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update category",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateCategoryService(req, res) {
        try {
            const { categoryId, name, status, categoryServiceId } = req.body;
            const result = await CategoryService.findOneAndUpdate(
                { _id: categoryServiceId },
                { $set: { name, status, in_category: categoryId } },
                { upsert: false, new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully updated category service",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update category service",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listCategory(req, res) {
        try {
            const { userId, limit, page, searchText, status } = req.body;
            const searchQuery = {
                // for_user: { $eq: userId },
                name: { $regex: searchText, $options: "i" },
            }
            if (status !== null) {
                searchQuery.status = status;
            }
            const result = await Category.find(searchQuery)
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Category.countDocuments(searchQuery);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched category list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch category list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listCategoryService(req, res) {
        try {
            const { userId, limit, page, searchText, in_category, status } = req.body;
            const searchQuery = {
                // for_user: { $eq: userId },
                name: { $regex: searchText, $options: "i" },
            }
            if (in_category !== "") {
                searchQuery.in_category = in_category;
            }
            if (status !== null) {
                searchQuery.status = status;
            }
            const result = await CategoryService.find(searchQuery)
                .populate({
                    path: "in_category",
                    select: ["name"],
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            console.log(result, "result check");
            const count = await CategoryService.countDocuments(searchQuery);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched category service list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch category service list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async listCategoryAndCategoryServices(req, res) {
        try {
            const result = await Category.aggregate([
                {
                    $lookup: {
                        from: "categoryservices",
                        localField: "_id",
                        foreignField: "in_category",
                        as: "categoryservices",
                    }
                },
            ])
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully get category and category service list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get category and category service list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
}
