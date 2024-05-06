"use strict";

import mongoose from "mongoose";
// models
import LabTest from "../models/lab_test";
import ImagingTest from "../models/imaging_test";
import Vaccination from "../models/vaccination";
import OthersTest from "../models/others_test";
import Eyeglass from "../models/eyeglass"
const Http = require('../helpers/httpservice');
import { EyeglassColumns, ImagingTestColumns, LabTestColumns, OthersTestColumns, VaccinationColumns } from "../config/constants"


// utils
import { sendResponse } from "../helpers/transmission";
import { processExcel } from "../middleware/utils";
const csv = require('fast-csv');
const fs = require('fs');


const httpService = new Http()
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
const validateColumnWithExcel = (toValidate, excelColumn) => {
    const requestBodyCount = Object.keys(toValidate).length
    const fileColumnCount = Object.keys(excelColumn).length
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

class MasterController {
    //Lab Test
    async addLabTest(req, res) {
        const {
            labTestArray,
            added_by,
            is_new
        } = req.body;
        console.log(req.body,"check body ------9");
        const new_key = is_new ? true : false;
        const list = labTestArray.map((singleData) => ({
            ...singleData,
            added_by,
            is_new: new_key
        }));

        const namesToFind = list.map((item) => item.lab_test);
        const foundItems = await LabTest.find({
            lab_test: { $in: namesToFind },
            is_deleted: false
        });
        const CheckData = foundItems.map((item) => item.lab_test);




        try {
            if (foundItems.length == 0) {
                const result = await LabTest.insertMany(list)
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `Lab test added successfully`,
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,

                    message: `${CheckData} is already exist`,
                    errorCode: null,
                });
            }
        }
        catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add lab test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async labTestMasterList(req, res) {
        const { searchText, limit, page } = req.query
        // if (limit != 0) {
        //     aggregate.push(
        //         { $skip: (page - 1) * limit },
        //         { $limit: limit * 1 })
        // }
        var sort = req.query.sort
        var sortingarray = { "createdAt": -1 };
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        }
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            const result = await LabTest.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await LabTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Lab test added successfully`,
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


    async labTestMasterListforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await LabTest.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await LabTest.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        category: "$category",
                        lab_test: "$lab_test",
                        description: "$description",
                        contributing_factors_to_abnormal_values: "$contributing_factors_to_abnormal_values",
                        normal_value_blood: "$normal_value.blood",
                        normal_value_urine: "$normal_value.urine",
                        possible_interpretation_of_abnormal_blood_value_high_levels: "$possible_interpretation_of_abnormal_blood_value.high_levels",
                        possible_interpretation_of_abnormal_blood_value_low_levels: "$possible_interpretation_of_abnormal_blood_value.low_levels",
                        possible_interpretation_of_abnormal_urine_value_high_levels: "$possible_interpretation_of_abnormal_urine_value.high_levels",
                        possible_interpretation_of_abnormal_urine_value_low_levels: "$possible_interpretation_of_abnormal_urine_value.low_levels",
                        blood_procedure_before: "$blood_procedure.before",
                        blood_procedure_during: "$blood_procedure.during",
                        blood_procedure_after: "$blood_procedure.after",
                        urine_procedure_before: "$urine_procedure.before",
                        urine_procedure_during: "$urine_procedure.during",
                        urine_procedure_after: "$urine_procedure.after",
                        clinical_warning: "$clinical_warning",
                        other: "$other",
                        link: "$link",
                    }
                }
                ])
            }

            let array = result.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `Lab test added successfully`,
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

    async labTestMasterListForDoctor(req, res) {
        const { searchText, limit, page, doctorId } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false,
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        }
        try {
            const result = await LabTest.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await LabTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Lab test added successfully`,
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

    async labTestMasterDetails(req, res) {
        const { labTestId } = req.query
        try {
            const result = await LabTest.findOne({ is_deleted: false, _id: labTestId })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get lab test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get lab test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async labTestMasterEdit(req, res) {
        const {
            labTestId,
            labTestData,
        } = req.body
        try {
            const result = await LabTest.findOneAndUpdate(
                { _id: labTestId },
                {
                    $set: {
                        ...labTestData
                    }
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update lab test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update lab test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async labTestMasterAction(req, res) {
        try {
            const { labTestId, action_name, action_value } = req.body;
            var result;
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                result = await LabTest.findOneAndUpdate(
                    { _id: labTestId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Lab' : 'Successfully In-active Lab'
            }

            if (action_name == "delete") {
                if (labTestId == '') {
                    result = await LabTest.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    result = await LabTest.updateMany(
                        { _id: { $in: labTestId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Labs'
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

    async uploadCSVForLabTest(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);
            let isValidFile = '';
            if (data.length > 0) {
                isValidFile = validateColumnWithExcel(LabTestColumns, data[0])

            }

            fs.unlinkSync(filePath)
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return
            }
            const existingLabTests = await LabTest.find({ is_deleted: false }, 'lab_test');
            const existingLabtestNames = existingLabTests.map(lab_test => lab_test.lab_test);
            const labTestData = []
            const duplicateLabtests = [];

            for (const labTest of data) {
                const trimmedLabtest = labTest.lab_test.trim();
                if (existingLabtestNames.includes(trimmedLabtest)) {
                    duplicateLabtests.push(trimmedLabtest);
                } else {
                    labTestData.push({
                        category: labTest.category,
                        lab_test: labTest.lab_test,
                        description: labTest.description,
                        contributing_factors_to_abnormal_values: labTest.contributing_factors_to_abnormal_values,
                        normal_value: {
                            blood: labTest.normal_value_blood,
                            urine: labTest.normal_value_urine
                        },
                        possible_interpretation_of_abnormal_blood_value: {
                            high_levels: labTest.possible_interpretation_of_abnormal_blood_value_high_levels,
                            low_levels: labTest.possible_interpretation_of_abnormal_blood_value_low_levels
                        },
                        possible_interpretation_of_abnormal_urine_value: {
                            high_levels: labTest.possible_interpretation_of_abnormal_urine_value_high_levels,
                            low_levels: labTest.possible_interpretation_of_abnormal_urine_value_low_levels
                        },
                        blood_procedure: {
                            before: labTest.blood_procedure_before,
                            during: labTest.blood_procedure_during,
                            after: labTest.blood_procedure_after
                        },
                        urine_procedure: {
                            before: labTest.urine_procedure_before,
                            during: labTest.urine_procedure_during,
                            after: labTest.urine_procedure_after
                        },
                        clinical_warning: labTest.clinical_warning,
                        other: labTest.other,
                        link: labTest.link,
                        added_by: {
                            user_id: req.body.user_id,
                            user_type: req.body.user_type
                        },
                    })
                }
            }

            if (duplicateLabtests.length > 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: `Designations already exist: ${duplicateLabtests.join(', ')}`,
                    errorCode: null,
                });
            }
            if (labTestData.length > 0) {
                const result = await LabTest.insertMany(labTestData);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All lab test records added successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "No Record in Excel Sheet",
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

    async exportLabTestMaster(req, res) {
        try {
            var csv
            const result = await LabTest.find({});
            const newPath = `./downloadCSV/labTestMasterExport.csv`
            csv = result.map((row) => {
                return `"${row.category}","${row.lab_test}","${row.description}","${row.contributing_factors_to_abnormal_values}","${row.normal_value.blood}","${row.normal_value.urine}","${row.possible_interpretation_of_abnormal_blood_value.high_levels}","${row.possible_interpretation_of_abnormal_blood_value.low_levels}","${row.possible_interpretation_of_abnormal_urine_value.high_levels}","${row.possible_interpretation_of_abnormal_urine_value.low_levels}","${row.blood_procedure.before}","${row.blood_procedure.during}","${row.blood_procedure.after}","${row.urine_procedure.before}","${row.urine_procedure.during}","${row.urine_procedure.after}","${row.clinical_warning}","${row.other}","${row.link}","${row.active === true ? 1 : 0}"`
            })
            const columns = Object.values(LabTestColumns).join(",")
            csv.unshift(columns);
            let csvData = csv.join('\n')
            fs.writeFile(newPath, csvData, (err, data) => {
                if (err) {
                    console.log(err);
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: err,
                        message: "Something went wrong while uploading file",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                }
                res.download(newPath)
            })

            // sendResponse(req, res, 200, {
            //     status: true,
            //     body: result,
            //     message: "All eyeglass records added successfully",
            //     errorCode: null,
            // });
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

    //Imaging Test
    async addImagingTest(req, res) {
        const {
            ImagingTestArray,
            added_by,
        } = req.body;
        console.log("ImagingTestArray_______",ImagingTestArray)
        let is_new = req.body.is_new
        let active = req.body.active
        console.log("active_______",active)
        if (is_new == undefined) {
            is_new = false
        }
        if (active == undefined) {
            active = true
        }

        const list = ImagingTestArray.map((singleData) => ({
            ...singleData,
            added_by,
            is_new,
            active
        }));


        try {
            const result = await ImagingTest.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Imaging test added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add imaging test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async imagingTestMasterList(req, res) {
        const { searchText, limit, page } = req.query
        console.log("req.query-----", req.query);
        var sort = req.query.sort
        var sortingarray = { "createdAt": -1 };
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        }
        // if (limit != 0) {
        //     aggregate.push(
        //         { $skip: (page - 1) * limit },
        //         { $limit: limit * 1 })
        // }
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                imaging: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            console.log("filter---", sortingarray);
            const result = await ImagingTest.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await ImagingTest.countDocuments(filter)
            console.log("result------", result);
            // console.log("count------", count);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Imaging test list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get imaging test list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async imagingTestMasterListforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await ImagingTest.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await ImagingTest.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        category: "$category",
                        imaging: "$imaging",
                        description: "$description",
                        clinical_consideration: "$clinical_consideration",
                        normal_values: "$normal_values",
                        abnormal_values: "$abnormal_values",
                        contributing_factors_to_abnormal: "$contributing_factors_to_abnormal",
                        procedure_before: "$procedure.before",
                        procedure_during: "$procedure.during",
                        procedure_after: "$procedure.after",
                        clinical_warning: "$clinical_warning",
                        contraindications: "$contraindications",
                        other: "$other",
                        link: "$link",
                    }
                }
                ])
            }
            console.log(result, "result check")
            let array = result.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `Imaging added successfully`,
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

    async imagingTestMasterListForDoctor(req, res) {
        const { searchText, limit, page, doctorId } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false,
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        } else {
            filter = {
                is_deleted: false,
                imaging: { $regex: searchText || '', $options: "i" },
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        }
        try {
            const result = await ImagingTest.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await ImagingTest.countDocuments(filter)
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Imaging test list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get imaging test list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async imagingTestMasterDetails(req, res) {
        const { imagingTestId } = req.query
        try {
            const result = await ImagingTest.findOne({ is_deleted: false, _id: imagingTestId })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get imaging test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get imaging test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async imagingTestMasterEdit(req, res) {
        const {
            imagingTestId,
            ImagingTestData,
        } = req.body
        console.log("re.body--->", req.body);
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            
            const result = await ImagingTest.findOneAndUpdate(
                { _id: imagingTestId },
                {
                    $set: {
                        ...ImagingTestData
                    }
                },
                { new: true }
            )
            
            const fourportalChange = await httpService.postStaging('labimagingdentaloptical/edit-new-lab-name-superadmin', {imagingTestId,ImagingTestData }, headers, 'labimagingdentalopticalServiceUrl');

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update imaging test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update imaging test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async imagingTestMasterAction(req, res) {
        try {
            const { imagingTestId, action_name, action_value } = req.body
            var message = '';

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                var result = await ImagingTest.findOneAndUpdate(
                    { _id: imagingTestId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Imaging' : 'Successfully In-active Imaging'
            }

            if (action_name == "delete") {
                if (imagingTestId == '') {
                    await ImagingTest.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    await ImagingTest.updateMany(
                        { _id: { $in: imagingTestId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Imagings'
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

    async uploadCSVForImagingTest(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);
            let isValidFile = '';
            if (data.length > 0) {
                isValidFile = validateColumnWithExcel(ImagingTestColumns, data[0])

            }
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return
            }
            const imagingTestData = []
            console.log(data, "data");
            for (const imagingTest of data) {
                imagingTestData.push({
                    category: imagingTest.category,
                    imaging: imagingTest.imaging,
                    description: imagingTest.description,
                    clinical_consideration: imagingTest.clinical_consideration,
                    normal_values: imagingTest.normal_values,
                    abnormal_values: imagingTest.abnormal_values,
                    contributing_factors_to_abnormal: imagingTest.contributing_factors_to_abnormal,
                    procedure: {
                        before: imagingTest.procedure_before,
                        during: imagingTest.procedure_during,
                        after: imagingTest.procedure_after
                    },
                    clinical_warning: imagingTest.clinical_warning,
                    contraindications: imagingTest.contraindications,
                    other: imagingTest.other,
                    link: imagingTest.link,
                    added_by: {
                        user_id: req.body.user_id,
                        user_type: req.body.user_type
                    },
                })
            }
            if (imagingTestData.length > 0) {
                const result = await ImagingTest.insertMany(imagingTestData);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All imaging test records added successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "No record available in excel sheet",
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
    async exportImagingTestMaster(req, res) {
        try {
            var csv
            const result = await ImagingTest.find({});
            const newPath = `./downloadCSV/ImagingTestMasterExport.csv`
            csv = result.map((row) => {
                return `"${row.category}","${row.imaging}","${row.description}","${row.clinical_consideration}","${row.normal_values}","${row.abnormal_values}","${row.contributing_factors_to_abnormal}","${row.procedure.before}","${row.procedure.during}","${row.procedure.after}","${row.clinical_warning}","${row.contraindications}","${row.other}","${row.link}","${row.active === true ? 1 : 0}"`
            })
            const columns = Object.values(ImagingTestColumns).join(",")
            csv.unshift(columns);
            let csvData = csv.join('\n')
            fs.writeFile(newPath, csvData, (err, data) => {
                if (err) {
                    console.log(err);
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: err,
                        message: "Something went wrong while uploading file",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                }
                res.download(newPath)
            })

            // sendResponse(req, res, 200, {
            //     status: true,
            //     body: result,
            //     message: "All eyeglass records added successfully",
            //     errorCode: null,
            // });
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

    //Vaccination Test
    async addVaccinationTest(req, res) {
        const {
            VaccinationArray,
            added_by,
            is_new
        } = req.body;

        const new_key = is_new ? true : false;

        console.log("VACCc-->", VaccinationArray)
        const list = VaccinationArray.map((singleData) => ({
            ...singleData,
            added_by,
            is_new: new_key

        }));
        const namesToFind = list.map((item) => item.name);
        const foundItems = await Vaccination.find({
            name: { $in: namesToFind },
            is_deleted: false
        });
        console.log("foundItems..........", foundItems);
        const CheckData = foundItems.map((item) => item.name);
        try {
            if (foundItems.length == 0) {
                const result = await Vaccination.insertMany(list)
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `Vaccination added successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,

                    message: `${CheckData} is already exist`,
                    errorCode: null,
                });
            }
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add vaccination test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async vaccinationTestMasterList(req, res) {
        const { searchText, limit, page } = req.query
        var sort = req.query.sort
        var sortingarray = { "createdAt": -1 };
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        }
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                name: { $regex: searchText || '', $options: "i" },
            }
        }
        console.log(sortingarray);
        try {
            let result = '';
            if (limit == 0) {
                result = await Vaccination.find(filter)
                    .sort(sortingarray)
                    .exec();
            }
            else {
                result = await Vaccination.find(filter)
                    .sort(sortingarray)
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            const count = await Vaccination.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Vaccination list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get vaccination list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async vaccinationTestMasterListforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await Vaccination.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await Vaccination.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        name: "$name",
                        // imaging: "$imaging",
                        // description: "$description",
                        // clinical_consideration: "$clinical_consideration",
                        // normal_values: "$normal_values",
                        // abnormal_values: "$abnormal_values",
                        // contributing_factors_to_abnormal: "$contributing_factors_to_abnormal",
                        // clinical_warning: "$clinical_warning",
                        // contraindications: "$contraindications",
                        // other: "$other",
                        // link: "$link",
                    }
                }
                ])
            }
            console.log(result, "result check")
            let array = result.map(obj => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `Imaging added successfully`,
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


    async vaccinationTestMasterListForDoctor(req, res) {
        const { searchText, limit, page, doctorId } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false,
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        } else {
            filter = {
                is_deleted: false,
                name: { $regex: searchText || '', $options: "i" },
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        }
        try {
            const result = await Vaccination.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await Vaccination.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Vaccination list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get vaccination list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async vaccinationTestMasterDetails(req, res) {
        const { vaccinationId } = req.query
        try {
            const result = await Vaccination.findOne({ is_deleted: false, _id: vaccinationId })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get vaccination details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get vaccination details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async vaccinationTestMasterEdit(req, res) {
        const {
            vaccinationId,
            VaccinationData,
        } = req.body
        try {
            const result = await Vaccination.findOneAndUpdate(
                { _id: vaccinationId },
                {
                    $set: {
                        ...VaccinationData
                    }
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update vaccination details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update vaccination details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async vaccinationTestMasterAction(req, res) {
        try {
            const { vaccinationId, action_name, action_value } = req.body
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                var result = await Vaccination.findOneAndUpdate(
                    { _id: vaccinationId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
            }

            if (action_name == "delete") {
                if (vaccinationId == '') {
                    var result = await Vaccination.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    var result = await Vaccination.updateMany(
                        { _id: { $in: vaccinationId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                message = 'Successfully Deleted Vaccinations'
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

    async uploadCSVForVaccinationTest(req, res) {
        try {
            console.log("check console.");
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);
            let isValidFile = ''
            if (data.length > 0) {
                isValidFile = validateColumnWithExcel(VaccinationColumns, data[0])

            }
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return
            }

            const existingVaccinations = await Vaccination.find({ is_deleted: false }, 'name');
            const existingVaccinationNames = existingVaccinations.map(lang => lang.name);
            const vaccinationData = []
            const duplicateVaccinations = [];

            for (const vaccination of data) {
                const trimmedVaccination = vaccination.name.trim();
                if (existingVaccinationNames.includes(trimmedVaccination)) {
                    duplicateVaccinations.push(trimmedVaccination);
                } else {
                    vaccinationData.push({
                        name: vaccination.name,
                        added_by: {
                            user_id: req.body.user_id,
                            user_type: req.body.user_type
                        },
                    })
                }

            }
            if (duplicateVaccinations.length > 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: `Vaccinations already exist: ${duplicateVaccinations.join(', ')}`,
                    errorCode: null,
                });
            }
            if (vaccinationData.length > 0) {
                const result = await Vaccination.insertMany(vaccinationData);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All vaccination records added successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "No record found in excel sheet",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error, 'error check');
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error 1",
                errorCode: null,
            });
        }
    }
    async exportVaccinationTestMaster(req, res) {
        try {
            var csv
            const result = await Vaccination.find({});
            const newPath = `./downloadCSV/vaccinationTestMasterExport.csv`
            csv = result.map((row) => {
                return `"${row.name}","${row.active === true ? 1 : 0}"`
            })
            const columns = Object.values(VaccinationColumns).join(",")
            csv.unshift(columns);
            let csvData = csv.join('\n')
            fs.writeFile(newPath, csvData, (err, data) => {
                if (err) {
                    console.log(err);
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: err,
                        message: "Something went wrong while uploading file",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                }
                res.download(newPath)
            })

            // sendResponse(req, res, 200, {
            //     status: true,
            //     body: result,
            //     message: "All eyeglass records added successfully",
            //     errorCode: null,
            // });
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

    //Others Test
    async addOthersTest(req, res) {
        const {
            OthersTestArray,
            added_by,
            is_new
        } = req.body;

        const new_key = is_new ? true : false;

        const list = OthersTestArray.map((singleData) => ({
            ...singleData,
            added_by,
            is_new: new_key
        }));
        try {
            const result = await OthersTest.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Others test added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add others test`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async othersTestTestMasterList(req, res) {
        const { searchText, limit, page } = req.query
        console.log(req.query.sort, "req.query");
        // if (limit != 0) {
        //     aggregate.push(
        //         { $skip: (page - 1) * limit },
        //         { $limit: limit * 1 })
        // }
        var sort = req.query.sort
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        }
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                others: { $regex: searchText || '', $options: "i" },
            }
        }
        console.log(sortingarray, "sortingarray");

        try {
            const result = await OthersTest.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await OthersTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Others test list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get others test  list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async othersTestTestMasterListforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await OthersTest.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await OthersTest.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        category: "$category",
                        others: "$others",
                        description: "$description",
                        clinical_consideration: "$clinical_consideration",
                        normal_values: "$normal_values",
                        abnormal_values: "$abnormal_values",
                        contributing_factors_to_abnormal: "$contributing_factors_to_abnormal",
                        procedure_before: "$procedure.before",
                        procedure_during: "$procedure.during",
                        procedure_after: "$procedure.after",
                        clinical_warning: "$clinical_warning",
                        contraindications: "$contraindications",
                        other: "$other",
                        link: "$link"
                    }
                }
                ])
            }
            //    console.log(result);
            let array = result.map(obj => Object.values(obj));
            console.log(">>>>>>>", array);
            //    console.log(array);
            // const count = await LabTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `EyeGlasses added successfully`,
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

    async othersTestTestMasterListForDoctor(req, res) {
        const { searchText, limit, page, doctorId } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false,
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        } else {
            filter = {
                is_deleted: false,
                others: { $regex: searchText || '', $options: "i" },
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        }
        try {
            const result = await OthersTest.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await OthersTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    count,
                    result
                },
                message: `Others test list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get others test  list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async othersTestTestMasterDetails(req, res) {
        const { otherTestId } = req.query
        try {
            const result = await OthersTest.findOne({ is_deleted: false, _id: otherTestId })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get others test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get others test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async othersTestTestMasterEdit(req, res) {
        const {
            otherTestId,
            OthersTestData,
        } = req.body
        try {
            const result = await OthersTest.findOneAndUpdate(
                { _id: otherTestId },
                {
                    $set: {
                        ...OthersTestData
                    }
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update others test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update others test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async othersTestTestMasterAction(req, res) {
        try {
            const { otherTestId, action_name, action_value } = req.body
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                var result = await OthersTest.findOneAndUpdate(
                    { _id: otherTestId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Other Test' : 'Successfully In-active Other Test'
            }

            if (action_name == "delete") {
                if (otherTestId == '') {
                    await OthersTest.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    await OthersTest.updateMany(
                        { _id: { $in: otherTestId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Other Tests'
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

    async uploadCSVForOthersTest(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);

            const isValidFile = validateColumnWithExcel(OthersTestColumns, data[0])
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return
            }
            const othersTestData = []
            for (const othersTest of data) {
                othersTestData.push({
                    category: othersTest.category,
                    others: othersTest.others,
                    description: othersTest.description,
                    clinical_consideration: othersTest.clinical_consideration,
                    normal_values: othersTest.normal_values,
                    abnormal_values: othersTest.abnormal_values,
                    contributing_factors_to_abnormal: othersTest.contributing_factors_to_abnormal,
                    procedure: {
                        before: othersTest.procedure_before,
                        during: othersTest.procedure_during,
                        after: othersTest.procedure_after
                    },
                    clinical_warning: othersTest.clinical_warning,
                    contraindications: othersTest.contraindications,
                    other: othersTest.other,
                    link: othersTest.link,
                    added_by: {
                        user_id: req.body.user_id,
                        user_type: req.body.user_type
                    },
                })
            }
            const result = await OthersTest.insertMany(othersTestData);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "All others test records added successfully",
                errorCode: null,
            });
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
    async exportOthersTestMaster(req, res) {
        try {
            var csv
            const result = await OthersTest.find({});
            const newPath = `./downloadCSV/othersTestMasterExport.csv`
            csv = result.map((row) => {
                return `"${row.category}","${row.others}","${row.description}","${row.clinical_consideration}","${row.normal_values}","${row.abnormal_values}","${row.contributing_factors_to_abnormal}","${row.procedure.before}","${row.procedure.during}","${row.procedure.after}","${row.clinical_warning}","${row.contraindications}","${row.other}","${row.link}","${row.active === true ? 1 : 0}"`
            })
            const columns = Object.values(OthersTestColumns).join(",")
            csv.unshift(columns);
            let csvData = csv.join('\n')
            fs.writeFile(newPath, csvData, (err, data) => {
                if (err) {
                    console.log(err);
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: err,
                        message: "Something went wrong while uploading file",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                }
                res.download(newPath)
            })

            // sendResponse(req, res, 200, {
            //     status: true,
            //     body: result,
            //     message: "All eyeglass records added successfully",
            //     errorCode: null,
            // });
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

    //Eye Glass
    async addEyeglassMaster(req, res) {
        const {
            eyeglassData,
            added_by,
            is_new
        } = req.body;

        const new_key = is_new ? true : false;
        const list = eyeglassData.map((singleData) => ({
            ...singleData,
            added_by,
            is_new: new_key
        }));
        try {
            const result = await Eyeglass.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                data: null,
                message: `Eyeglass added successfully`,
                errorCode: null,
            });
        } catch (err) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: err.message,
                errorCode: err.code,
            });
        }
    }
    async listEyeglassMaster(req, res) {
        const { searchText, limit, page } = req.query
        var sort = req.query.sort
        var sortingarray = {};
        // if (limit != 0) {
        //     aggregate.push(
        //         { $skip: (page - 1) * limit },
        //         { $limit: limit * 1 })
        // }
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        }
        let filter = {
            is_deleted: false
        }
        if (searchText) {
            filter.eyeglass_name = { $regex: searchText || '', $options: "i" }
        }
        console.log(sortingarray, "sortingarray");
        try {
            const result = await Eyeglass.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await Eyeglass.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: `Eyeglass list get successfully1`,
                errorCode: null,
            });
        } catch (err) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: err.message,
                errorCode: err.code,
            });
        }
    }

    async listEyeglassMasterforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                is_deleted: false
            }
        } else {
            filter = {
                is_deleted: false,
                lab_test: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await Eyeglass.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await Eyeglass.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        eyeglass_name: "$eyeglass_name"
                    }
                }
                ])
            }
            //    console.log(result);
            let array = result.map(obj => Object.values(obj));
            //    console.log(array);
            // const count = await LabTest.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array
                },
                message: `EyeGlasses added successfully`,
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

    async listEyeglassMasterForDoctor(req, res) {
        const { searchText, limit, page, doctorId } = req.query

        var filter;

        if (searchText == "") {
            filter = {
                is_deleted: false,
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        } else {
            filter = {
                is_deleted: false,
                eyeglass_name: { $regex: searchText || '', $options: "i" },
                'added_by.user_id': { $in: ['63763d9eda5f0a2708aff9fe', doctorId] },
            }
        }


        try {
            const result = await Eyeglass.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await Eyeglass.countDocuments(filter)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: `Eyeglass list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: err.message,
                errorCode: err.code,
            });
        }
    }



    async activeDeleteEyeglassMaster(req, res) {
        try {
            const { action_name, action_value, id } = req.body
            let key;
            var message = ''
            key = action_name === "delete" ? 'is_deleted' : action_name === "active" ? "status" : ''
            if (key) {
                if (action_name === "active") {
                    await Eyeglass.findOneAndUpdate(
                        { _id: { $eq: id } },
                        {
                            $set: {
                                [key]: action_value
                            }
                        },
                        { new: true },
                    )

                    message = action_value == true ? 'Successfully Active Eyeglass' : 'Successfully In-active Eyeglass'
                }

                if (action_name === "delete") {
                    if (id == '') {
                        await Eyeglass.updateMany(
                            { is_deleted: { $eq: false } },
                            {
                                $set: { is_deleted: true }
                            },
                            { new: true }
                        )
                    }
                    else {
                        await Eyeglass.updateMany(
                            { _id: { $in: id } },
                            {
                                $set: { is_deleted: true }
                            },
                            { new: true }
                        )
                    }

                    message = 'Successfully Deleted EyeGlasses'
                }

                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: message,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 500, {
                    status: false,
                    data: null,
                    message: `Action key not specified`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "failed to performed action",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async viewEyeglassMaster(req, res) {
        try {
            const result = await Eyeglass.find({ _id: { $eq: req.query.id }, is_deleted: false })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully fetched eyeglass details`,
                errorCode: null,
            });
        } catch (err) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: err.message ? err.message : `failed to fetched eyeglass details`,
                errorCode: err.code ? err.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateEyeglassMaster(req, res) {
        const {
            id,
            eyeglass_name,
            status
        } = req.body
        try {
            const result = await Eyeglass.findOneAndUpdate(
                { _id: { $eq: id } },
                {
                    $set: {
                        eyeglass_name,
                        status
                    }
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully update eyeglass details`,
                errorCode: null,
            });
        } catch (err) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: err.message ? err.message : `failed to update eyeglass details`,
                errorCode: err.code ? err.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async uploadCSVForEyeglassMaster(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);

            const isValidFile = validateColumnWithExcel(EyeglassColumns, data[0])
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return
            }
            const existingEyeglass = await Eyeglass.find({}, 'eyeglass_name');
            const existingEyeglassNames = existingEyeglass.map(lang => lang.eyeglass_name);
            const inputArray = []
            const duplicateInputArray = [];

            for (const singleData of data) {
                const trimmedEyeglass = singleData.eyeglass_name.trim();
                if (existingEyeglassNames.includes(trimmedEyeglass)) {
                    duplicateInputArray.push(trimmedEyeglass);
                }
                inputArray.push({
                    eyeglass_name: singleData.eyeglass_name,
                    added_by: {
                        user_id: req.body.user_id,
                        user_type: req.body.user_type
                    },
                })
            }
            if (duplicateInputArray.length > 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: `Eyeglass already exist: ${duplicateInputArray.join(', ')}`,
                    errorCode: null,
                });
            }
            if (inputArray.length > 0) {
                const result = await Eyeglass.insertMany(inputArray);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All eyeglass records added successfully",
                    errorCode: null,
                });
            }
            else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "No record found in excel sheet",
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
    async exportEyeglassMaster(req, res) {
        try {
            var csv
            const result = await Eyeglass.find({});
            const newPath = `./downloadCSV/eyeGlassMasterExport.csv`
            csv = result.map((row) => {
                return `"${row.eyeglass_name}","${row.status === true ? 1 : 0}"`
            })
            const columns = Object.values(EyeglassColumns).join(",")
            csv.unshift(columns);
            let csvData = csv.join('\n')
            fs.writeFile(newPath, csvData, (err, data) => {
                if (err) {
                    console.log(err);
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: err,
                        message: "Something went wrong while uploading file",
                        errorCode: "INTERNAL_SERVER_ERROR",
                    })
                }
                res.download(newPath)
            })

            // sendResponse(req, res, 200, {
            //     status: true,
            //     body: result,
            //     message: "All eyeglass records added successfully",
            //     errorCode: null,
            // });
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



    async labTestListWithoutPagination(req, res) {
        try {
            let labtestDetails = await LabTest.find({
                is_deleted: false,
                is_new: false,
                active: true,
                $or: [
                    {
                        'lab_test': { $regex: req.query.query || '', $options: "i" },
                    }
                ]
            }).select('lab_test')
                .sort([["createdAt", -1]])
                .limit(20)
                .exec();

            const labtestArray = []
            for (const labtest of labtestDetails) {
                labtestArray.push({
                    _id: labtest._id,
                    lab_test: labtest.lab_test,
                })
            }

            sendResponse(req, res, 200, {
                status: true,
                body: { labtestArray },
                message: `Lab test fetch successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched records`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async labTestbyId(req, res) {
        const { labTestId } = req.query
        try {
            const result = await LabTest.find({ _id: { $in: labTestId } })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get lab test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get lab test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async imagingListWithoutPagination(req, res) {
        try {
            let imagingDetails = await ImagingTest.find({
                is_deleted: false,
                is_new: false,
                active: true,
                $or: [
                    {
                        'imaging': { $regex: req.query.query || '', $options: "i" },
                    }
                ]
            }).select('imaging')
                .sort([["createdAt", -1]])
                .limit(20)
                .exec();

            const imagingArray = []
            for (const img of imagingDetails) {
                imagingArray.push({
                    _id: img._id,
                    imaging: img.imaging,
                })
            }

            sendResponse(req, res, 200, {
                status: true,
                body: { imagingArray },
                message: `Imaging test fetch successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched records`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async imagingTestbyId(req, res) {
        const { imagingId } = req.query
        try {
            const result = await ImagingTest.find({ _id: { $in: imagingId } })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get imaging test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get imaging test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }




    async OthersListWithoutPagination(req, res) {
        try {
            let otherTestDetails = await OthersTest.find({
                is_deleted: false,
                is_new: false,
                active: true,
                $or: [
                    {
                        'others': { $regex: req.query.query || '', $options: "i" },
                    }
                ]
            }).select('others')
                .sort([["createdAt", -1]])
                .limit(20)
                .exec();
            const othersTestArray = []
            for (const other of otherTestDetails) {
                othersTestArray.push({
                    _id: other._id,
                    others: other.others,
                })
            }
            console.log("othersTestArray====", othersTestArray);
            sendResponse(req, res, 200, {
                status: true,
                body: { othersTestArray },
                message: `Others test fetch successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched records`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async OthersTestbyId(req, res) {
        const { othersId } = req.query
        try {
            const result = await OthersTest.find({ _id: { $in: othersId } })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get others test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get others test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async eyeglassesListWithoutPagination(req, res) {
        try {
            let eyeTestDetails = await Eyeglass.find({
                is_deleted: false,
                is_new: false,
                active: true,
                $or: [
                    {
                        'eyeglass_name': { $regex: req.query.query || '', $options: "i" },
                    }
                ]
            }).select('eyeglass_name')
                .sort([["createdAt", -1]])
                .limit(20)
                .exec();

            const eyeTestArray = []
            for (const eye of eyeTestDetails) {
                eyeTestArray.push({
                    _id: eye._id,
                    eyeglass_name: eye.eyeglass_name,
                })
            }

            sendResponse(req, res, 200, {
                status: true,
                body: { eyeTestArray },
                message: `Eyeglasses test fetch successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched records`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async eyeglassesTestbyId(req, res) {
        const { eyeglasesId } = req.query
        try {
            const result = await Eyeglass.find({ _id: { $in: eyeglasesId } })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Successfully get Eyeglass test details`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get Eyeglass test details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


}
module.exports = new MasterController();
