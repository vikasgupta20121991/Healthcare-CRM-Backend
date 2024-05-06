"use strict";

const fs = require('fs');
const stream = require('stream');
const csv = require('fast-csv');
import mongoose from "mongoose";
// models
import PortalUser from "../models/portal_user";
import AdminInfo from "../models/admin_info";
import LocationDetails from "../models/location_info";
import OpeningHours from "../models/opening_hours_info";
import OnDutyGroup from "../models/onDutyGroup";
import DocumentInfo from "../models/document_info";
import OnDuty from "../models/on_duty_info";
import { processExcel } from "../../pharmacy/middleware/utils";
// const moment = require('moment');
// import moment from 'moment'
import moment from "moment-timezone";
// utils
import { sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { uploadFile, getFile } from "../helpers/s3";
import { sendEmail } from "../helpers/ses";
import { sendStaffDetails } from "../helpers/emailTemplate";
import Http from "../helpers/httpservice"
import { OnDutyGroupColumns, OnDutyPharmacyGroupColumns } from "../config/constants";
// import city from "../../superadmin/models/common_data/city";
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
    // console.log(requestBodyCount, "requestBodyCount", fileColumnCount, "fileColumnCount");
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

const getDocumentObject = async (req, userId) => {
    let staff_profile_object = {}
    if (req.files) {
        if ('staff_profile' in req.files) {
            const s3result = await uploadFile(req.files.staff_profile.data, {
                Bucket: 'healthcare-crm-stage-docs',
                Key: `pharmacy/${userId}/staff-profile/${req.files.staff_profile.name}`,
            })
            staff_profile_object['name'] = req.files.staff_profile.name
            staff_profile_object['code'] = 'staff-profile'
            staff_profile_object['e_tag'] = s3result.ETag
            staff_profile_object['url'] = s3result.Key
        } else {
            staff_profile_object = {}
        }
    }
    return {
        staff_profile_object,
    }
}
class OnDutyGroupController {
    async addOnDutyGroup(req, res) {
        const {
            onDutyGroupId,
            onDutyGroupNumber,
            city,
            datetimeArray,
            // startDate,
            // startTime,
            // endDate,
            // endTime,
            date_of_creation,
            createdBy
        } = req.body
        try {
            // console.log(req.body, "check request");
            if (onDutyGroupId == "") {
                const existData = await OnDutyGroup.findOne({ onDutyGroupNumber, city, is_deleted: false });
                if (existData) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        data: null,
                        message: `On duty group already exist`,
                        errorCode: "EXIST",
                    });
                }
                var newObject
                var newArray = []
                if (datetimeArray.length > 0) {
                    datetimeArray.map((singleData) => {
                        console.log(singleData, "check dates");
                        const fromDateTimeString = `${singleData.startDate}T${singleData.startTime}:00`;
                        const toDateTimeString = `${singleData.endDate}T${singleData.endTime}:00`;

                        const dateTime = moment(fromDateTimeString);
                        const endTime = moment(toDateTimeString);

                        // Convert to UTC format
                        const utcDateTime = dateTime.utc();


                        const from_date_timestamp = dateTime.utc();
                        const to_date_timestamp = endTime.utc();

                        console.log(from_date_timestamp.format(), "from_date_timestamp");
                        console.log(to_date_timestamp.format(), "to_date_timestamp");

                        // Create a new object with the UTC date and time
                        const newObject = {
                            from_date_timestamp: fromDateTimeString,
                            to_date_timestamp: toDateTimeString
                        };

                        console.log(newObject, "newObject");

                        // Push the newObject into the newArray
                        newArray.push(newObject);
                    });
                    // datetimeArray.map((singleData) => {
                    //     console.log(singleData, "check dates");
                    //     newObject = {
                    //         from_date_timestamp: new Date(singleData.startDate + "T" + singleData.startTime + ":15.215Z"),
                    //         to_date_timestamp: new Date(singleData.endDate + "T" + singleData.endTime + ":15.215Z")
                    //     }
                    //     console.log(newObject, "newObject");
                    //     newArray.push(newObject)
                    // })
                } else {
                    newArray = [
                        {
                            "from_date_timestamp": new Date(),
                            "to_date_timestamp": new Date()
                        }
                    ]
                }
                console.log();
                const data = new OnDutyGroup({
                    onDutyGroupNumber,
                    city,
                    datetimeArray: newArray,

                    // startDate,
                    // startTime,
                    // endDate,
                    // endTime,
                    date_of_creation,
                    createdBy
                });
                const result = await data.save();
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `On duty group has been successfully added`,
                    errorCode: null,
                });

            } else {
                console.log("cehccc222");
                const existData = await OnDutyGroup.findOne({ onDutyGroupNumber, city, _id: { $ne: onDutyGroupId }, is_deleted: false })
                if (existData) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        data: null,
                        message: `On duty group already exist`,
                        errorCode: "EXIST",
                    });
                }


                var newArray = []
                if (datetimeArray.length > 0) {
                    datetimeArray.map((singleData) => {
                        console.log(singleData, "check dates");
                        newObject = {
                            from_date_timestamp: new Date(singleData.startDate + "T" + singleData.startTime + ":15.215Z"),
                            to_date_timestamp: new Date(singleData.endDate + "T" + singleData.endTime + ":15.215Z")
                        }
                        console.log(newObject, "newObject");
                        newArray.push(newObject)
                    })
                } else {
                    newArray = [
                        {
                            "from_date_timestamp": new Date(),
                            "to_date_timestamp": new Date()
                        }
                    ]
                }

                console.log(newArray, "check array ");
                // return;

                const updated = await OnDutyGroup.findOneAndUpdate(
                    { _id: onDutyGroupId },
                    {
                        $set: {
                            onDutyGroupNumber,
                            city,
                            datetimeArray: newArray,
                            // startDate,
                            // startTime,
                            // endDate,
                            // endTime,
                            date_of_creation
                        }
                    },
                    { new: true }).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: updated,
                    message: `On duty group has been successfully updated`,
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error, "check addOnDutyGroup error");
            sendResponse(req, res, 500, {
                status: false,
                data: null,
                message: `Failed to add on duty group`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async uploadOnDutyGroupFromCSV(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        const filePath = './uploads/' + req.filename
        console.log(filePath, "filePath");
        try {
            let extractData = await processExcel(filePath);
            var filteredData = [];
            var finalData = [];
            var result;
            console.log("1234444");
            const isValidFile = await validateColumnWithExcel(OnDutyGroupColumns, extractData[0]);
            console.log(isValidFile, "check vlid");

            fs.unlinkSync(filePath)
            if (!isValidFile) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
            }
            // "onDutyGroupNumber" : "999999",
            // "city" : ObjectId("65140a805855e53b2f482090"),
            // "datetimeArray" : [ 
            //     {
            //         "from_date_timestamp" : ISODate("2023-10-05T17:19:15.215Z"),
            //         "to_date_timestamp" : ISODate("2023-10-20T17:20:15.215Z"),
            //         "_id" : ObjectId("651eb10443c0a0adf57b3640")
            //     }
            // ],
            var checkDates = false;
            var newArray = []
            if (extractData.length > 0) {
                extractData.map((singleData) => {
                    console.log(singleData, "check dates");

                    const startDate = new Date(singleData.startDate + "T" + singleData.startTime);
                    const endDate = new Date(singleData.endDate + "T" + singleData.endTime);

                    if (startDate > endDate) {
                        checkDates = true;
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Invalid excel sheet. please check and try again.",
                            errorCode: null,
                        });
                    } else {




                        const filteredData = newArray.filter(item => item.onDutyGroupNumber === singleData.onDutyGroupNumber && item.city === singleData.city);
                        console.log(filteredData);
                        if (filteredData.length > 0) {
                            let index = newArray.indexOf(filteredData[0])
                            newArray[index].datetimeArray.push({
                                from_date_timestamp: new Date(singleData.startDate + "T" + singleData.startTime + ":15.215Z"),
                                to_date_timestamp: new Date(singleData.endDate + "T" + singleData.endTime + ":15.215Z")
                            })
                        }
                        else {
                            var newObject = {
                                "onDutyGroupNumber": singleData.onDutyGroupNumber,
                                "city": singleData.city,
                                datetimeArray: [{
                                    from_date_timestamp: new Date(singleData.startDate + "T" + singleData.startTime + ":15.215Z"),
                                    to_date_timestamp: new Date(singleData.endDate + "T" + singleData.endTime + ":15.215Z")
                                }],
                                date_of_creation: singleData.date_of_creation
                            }
                            console.log(newObject, "newObject");
                            newArray.push(newObject)
                        }
                    }

                })
            } else {
                // newArray = [
                //     {
                //         "from_date_timestamp": new Date(),
                //         "to_date_timestamp": new Date()
                //     }
                // ]
            }

            console.log(newArray, "dddddddddd");
            // return;
            var checkcity = false;
            if (newArray.length != 0) {
                await Promise.all(newArray.map(async (element) => {
                    if (element.city) {
                        let city_details = await httpService.getStaging('common-api/get-city-by-name', { name: element.city }, headers, 'superadminServiceUrl');
                        console.log(city_details, "check city");
                        if (city_details.status) {
                            element.city = await city_details.body._id
                            filteredData.push(element)
                        }
                        else {
                            checkcity = true;
                        }
                    }
                }));
            }
            if (checkcity) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Invalid cityname in your excel sheet. please check and try again.",
                    errorCode: null,
                });
            }

            if (filteredData.length != 0) {
                await Promise.all(filteredData.map(async (element) => {
                    if (element.onDutyGroupNumber != "") {
                        let existData = await OnDutyGroup.findOne({ onDutyGroupNumber: Number(element.onDutyGroupNumber), city: element.city, is_deleted: false });
                        if (existData == null) {
                            finalData.push(element);
                        } else {
                            console.log(existData, "existData", element);
                            await OnDutyGroup.findOneAndUpdate({ _id: existData?._id }, {
                                $set: {
                                    onDutyGroupNumber: element.onDutyGroupNumber,
                                    city: mongoose.Types.ObjectId(element.city),
                                    datetimeArray: element.datetimeArray,
                                    date_of_creation: element.date_of_creation
                                }
                            });
                        }

                    }
                }));
            }

            console.log("FINAL DATA==>", finalData);

            if (finalData.length != 0) {
                result = await OnDutyGroup.insertMany(finalData, { ordered: false });
                if (result) {
                    sendResponse(req, res, 200, {
                        status: true,
                        body: null,
                        message: "successfully uploaded excel of on duty group",
                        errorCode: null,
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "successfully uploaded excel of on duty group",
                    errorCode: null,
                });
            }


        } catch (error) {
            console.log(error, "check rrorororo");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "INTERNAL_ERROR",
            });
        }
    }

    async listOnDutyGroup(req, res) {
        const { page, limit, searchKey } = req.query;
        var sort = req.query.sort
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = Number(value);
        } else {
            sortingarray['onDutyGroupNumber'] = -1;
        }
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            var filter = {
                is_deleted: false,
            };

            if (searchKey != '' && searchKey) {
                // filter['onDutyGroupNumber'] = { $eq: Number(searchKey) }
                filter['onDutyGroupNumber'] = {  $regex: searchKey || '', $options: "i" }
            }

            console.log("Filter==>", filter)
            let aggregate = [
                { $match: filter },
                {
                    $sort: sortingarray
                },

            ]

            if (limit != 0) {
                aggregate.push(
                    {
                        $skip: (page - 1) * limit

                    }, {
                    $limit: limit * 1
                }
                )
            }

            const existData = await OnDutyGroup.aggregate(aggregate);

            const newcount = await OnDutyGroup.aggregate([
                { $match: filter },
            ]);

            for (let index = 0; index < existData.length; index++) {
                const city_id = existData[index]?.city
                const city_details = await httpService.getStaging('common-api/get-Cityname-ById', { city_id }, headers, 'superadminServiceUrl');
                existData[index].city = city_details?.body?.list?.name
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: existData,
                    totalCount: newcount.length
                },

                message: `On duty group has been fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            console.log("error--->", error);
            sendResponse(req, res, 500, {
                status: false,
                data: null,
                message: `Failed to fetch on duty group`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getOnDutyGroup(req, res) {
        const {
            onDutyGroupId

        } = req.query;
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {

            const existData = await OnDutyGroup.findOne(
                {
                    _id: onDutyGroupId,
                    is_deleted: false
                }
            );

            const cityName = await httpService.getStaging('common-api/get-Cityname-ById',
                {
                    city_id: existData?.city
                },
                headers,
                'superadminServiceUrl'
            );

            existData.city_name = await cityName?.body?.list?.name


            let obj = await { ...existData?._doc, city_name: cityName?.body?.list?.name }

            sendResponse(req, res, 200, {
                status: true,
                data: obj,
                message: `On duty group has been fetched successfully`,
                errorCode: null,
            });

        } catch (error) {
            sendResponse(req, res, 200, {
                status: false,
                data: null,
                message: `Failed to get on duty group`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteOnDutyGroup(req, res) {
        const {
            onDutyGroupId

        } = req.body
        try {

            const existData = await OnDutyGroup.findOneAndUpdate({ _id: onDutyGroupId, is_deleted: false }, { $set: { is_deleted: true } }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                data: existData,
                message: `On duty group has been deleted successfully`,
                errorCode: null,
            });

        } catch (error) {
            sendResponse(req, res, 200, {
                status: false,
                data: null,
                message: `Failed to delete on duty group`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async deleteOnDutyGroupMasterAction(req, res) {
        try {
            const { ondutytId, action_name, action_value } = req.body;
            var result;
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                result = await OnDutyGroup.findOneAndUpdate(
                    { _id: ondutytId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active On Duty Group' : 'Successfully In-active On Duty Group'
            }

            if (action_name == "delete") {
                if (ondutytId == '') {
                    result = await OnDutyGroup.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    result = await OnDutyGroup.updateMany(
                        { _id: { $in: ondutytId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted OnDutyGroup'
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

    async addPharmacyOnDutyGroup(req, res) {
        const {
            pharmacyName,
            countryCode,
            phoneNumber,
            email,
            addressInfo,
            openingHour,
            nonOpeningDateAndTime,
            ondutyGroupId,
            date_of_creation
        } = req.body;
        const password = "Admin@123"
        const passwordHash = await hashPassword(password);

        const userDetails = new PortalUser({
            email,
            password: passwordHash,
            phone_number: phoneNumber,
            country_code: countryCode,
            role: "PHARMACY_ADMIN",
            createdBy: "super-admin",
            date_of_creation

        });

        const createdBySuperAdmin = await PortalUser.findOne({ email }).lean();

        if (createdBySuperAdmin) {

            sendResponse(req, res, 200, {
                status: false,
                data: null,
                message: `this email is already added please check in onDuty Group or in individual pharmacy list`,
                errorCode: null,
            });
            return;
        }


        const userData = await userDetails.save();

        const adminDetails = new AdminInfo({
            pharmacy_name: pharmacyName,
            slogan: "",
            about_pharmacy: "",
            verify_status: "APPROVED",
            in_on_duty_group: ondutyGroupId,
            for_portal_user: userData._id,
            about_pharmacy: '',
            slogan: '',
            medicine_request: { medicine_price_request: false, prescription_order: false, request_medicine_available: false }
        });
        const adminData = await adminDetails.save();
        const locationInfo = new LocationDetails({
            ...addressInfo,
            for_portal_user: userData._id
        });
        const locationData = locationInfo.save();

        var newObject
        var newObjectOne
        var newArray2 = []
        var newArray3 = []
        if (nonOpeningDateAndTime.length > 0) {
            nonOpeningDateAndTime.map((singleData) => {
                newObject = {
                    start_time_with_date: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                    end_time_with_date: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                }
                newObjectOne = {
                    from_date_timestamp: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                    to_date_timestamp: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                }
                newArray3.push(newObjectOne)
                newArray2.push(newObject)
            })
        } else {
            newArray2 = [
                {
                    "start_time_with_date": new Date(),
                    "end_time_with_date": new Date()
                }
            ]
            newArray3 = [
                {
                    "from_date_timestamp": new Date(),
                    "to_date_timestamp": new Date()
                }
            ]
        }


        var newArray1 = [
            {
                "start_time_with_date": new Date(),
                "end_time_with_date": new Date()
            }
        ]
        const openingHoursInfo = new OpeningHours({
            week_days: openingHour,
            close_date_and_time: newArray2,
            for_portal_user: userData._id,
            open_date_and_time: newArray1
        });


        var onDutyData
        const onDutyInfo = new OnDuty({
            on_duty: newArray3,
            for_portal_user: userData._id,
        });
        onDutyData = await onDutyInfo.save();



        const openingHoursData = await openingHoursInfo.save();
        try {
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    user_details: {
                        portalUserData: userData,
                        adminData
                    }
                },
                message: `pharmacy added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add pharmacy`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addPharmacyOnDutyGroupBulkCsv(req, res) {
        const { for_user } = req.body;
        const headers = {
            'Authorization': req.headers['authorization']
        }
        const filePath = './uploads/' + req.filename
        try {

            let extractData = await processExcel(filePath);
            let filteredData = [];
            let secondFilteredData = [];
            let finalData = [];
            console.log("CHECK INSIDE 123");
            const isValidFile = await validateColumnWithExcel(OnDutyPharmacyGroupColumns, extractData[0]);
            console.log("CHECK INSIDE");
            fs.unlinkSync(filePath)
            if (!isValidFile) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
            }

            if (extractData.length != 0) {
                await Promise.all(extractData.map(async (element) => {
                    console.log("element____________",element);
                    const createdBySuperAdmin = await PortalUser.findOne({ email: element?.email }).lean();

                    if (createdBySuperAdmin) {
                        console.log("FOUND Existing")
                    } else {
                        console.log("Not FOUND===>")
                        filteredData.push(element)
                    }
                }))
            }

            if (filteredData.length != 0) {
                await Promise.all(filteredData.map(async (element) => {
                    let city_id;
                    let country_id;
                    let region_id;
                    let province_id;
                    let department_id;
                    let village_id;
                    let groupCity;

                    if (element?.country) {
                        let country_details = await httpService.getStaging('common-api/get-country-by-name', { name: element.country }, headers, 'superadminServiceUrl');
                        if (country_details?.status) {
                            country_id = await country_details?.body?._id
                        } else {
                            country_id = ''
                        }
                    }

                    if (element?.region && country_id) {
                        let region_details = await httpService.getStaging('common-api/get-region-by-name', { name: element.region, country_id }, headers, 'superadminServiceUrl');
                        if (region_details.status) {
                            region_id = await region_details.body._id
                        } else {
                            region_id = ''
                        }
                    }

                    if (element?.province && region_id) {
                        let province_details = await httpService.getStaging('common-api/get-province-by-name', { name: element.province, region_id }, headers, 'superadminServiceUrl');
                        if (province_details.status) {
                            province_id = await province_details.body._id
                        } else {
                            province_id = ''
                        }
                    }

                    if (element?.department && province_id) {
                        let department_details = await httpService.getStaging('common-api/get-department-by-name', { name: element.department, province_id }, headers, 'superadminServiceUrl');
                        if (department_details.status) {
                            department_id = await department_details.body._id
                        } else {
                            department_id = ''
                        }
                    }

                    if (element?.city && department_id) {
                        let city_details = await httpService.getStaging('common-api/get-city-by-name', { name: element.city, department_id }, headers, 'superadminServiceUrl');
                        if (city_details.status) {
                            city_id = await city_details.body._id
                        } else {
                            city_id = ''
                        }
                    }

                    if (element?.groupCity) {
                        let city_details = await httpService.getStaging('common-api/get-city-by-name', { name: element.groupCity }, headers, 'superadminServiceUrl');
                        if (city_details.status) {
                            groupCity = await city_details.body._id
                        } else {
                            groupCity = ''
                        }
                    }


                    if (element?.village && department_id) {
                        let village_details = await httpService.getStaging('common-api/get-village-by-name', { name: element.village, department_id }, headers, 'superadminServiceUrl');
                        if (village_details?.status) {
                            village_id = await village_details?.body?._id
                        } else {
                            village_id = ''
                        }
                    }


                    let obj = {
                        "groupNumber": Number(element?.groupNumber),
                        "groupCity": groupCity ? groupCity : null,
                        "addressInfo": {
                            "loc": {
                                "type": "Point",
                                "coordinates": [
                                    Number(element?.lat),
                                    Number(element?.long)
                                ]
                            },
                            "address": element?.address,
                            "neighborhood": element?.neighborhood,
                            "nationality": country_id ? country_id : null,
                            "region": region_id ? region_id : null,
                            "province": province_id ? province_id : null,
                            "department": department_id ? department_id : null,
                            "city": city_id ? city_id : null,

                            "village": village_id ? village_id : null,
                            "pincode": element?.pincode,

                        },
                        "pharmacyName": element?.pharmacyName,
                        "countryCode": "+" + element?.countryCode,
                        "phoneNumber": element?.phoneNumber,
                        "email": element?.email,
                        "openingHour": [
                            {
                                "sun": {
                                    "start_time": element?.sun_start_time,
                                    "end_time": element?.sun_end_time,
                                },
                                "mon": {
                                    "start_time": element?.mon_start_time,
                                    "end_time": element?.mon_end_time,
                                },
                                "tue": {
                                    "start_time": element?.tue_start_time,
                                    "end_time": element?.tue_end_time,
                                },
                                "wed": {
                                    "start_time": element?.wed_start_time,
                                    "end_time": element?.wed_end_time,
                                },
                                "thu": {
                                    "start_time": element?.thus_start_time,
                                    "end_time": element?.thus_end_time,
                                },
                                "fri": {
                                    "start_time": element?.fri_start_time,
                                    "end_time": element?.fri_end_time,
                                },
                                "sat": {
                                    "start_time": element?.sat_start_time,
                                    "end_time": element?.sat_end_time,
                                }
                            }
                        ],
                        "nonOpeningDateAndTime": [
                            {
                                "date": element?.non_opening_date,
                                "start_time": element?.non_opening_start_time,
                                "end_time": element?.non_opening_end_time,
                            }
                        ],
                        "date_of_creation": element?.date_of_creation
                    }

                    secondFilteredData.push(obj);

                }));
            }

            var userData
            var adminData
            var locationData
            var openingHoursData

            console.log("SECOND FILTER==>", secondFilteredData)
            console.log(secondFilteredData.length, "check lendth");
            if (secondFilteredData.length != 0) {
                console.log("inside");
                await Promise.all(secondFilteredData.map(async (element) => {
                    console.log(element, "check element");
                    var isGroupExist = await OnDutyGroup.findOne({ onDutyGroupNumber: element?.groupNumber, city: element?.groupCity, is_deleted: false });
                    console.log(isGroupExist, "isGroupExist");
                    if (isGroupExist) {
                        let obj = { ...element, in_on_duty_group: isGroupExist?._id }
                        finalData.push(obj)
                    }
                }))
            }
            console.log(finalData, "finaldata check");
            // return;
            if (finalData.length != 0) {
                await Promise.all(finalData.map(async (element) => {
                    const password = "Admin@123"
                    const passwordHash = await hashPassword(password);

                    const userDetails = new PortalUser({
                        email: element?.email,
                        password: passwordHash,
                        phone_number: element?.phoneNumber,
                        country_code: element?.countryCode,
                        role: "PHARMACY_ADMIN",
                        createdBy: "super-admin",
                        date_of_creation: element?.date_of_creation
                    });
                    userData = await userDetails.save();
                    let forPortalUserId = userData?._id
                    const adminDetails = new AdminInfo({
                        pharmacy_name: element?.pharmacyName,
                        slogan: "",
                        about_pharmacy: "",
                        verify_status: "APPROVED",
                        in_on_duty_group: element?.in_on_duty_group,
                        for_portal_user: forPortalUserId,
                        about_pharmacy: '',
                        slogan: ''
                    });
                    adminData = await adminDetails.save();
                    console.log(userData, "check userdata");
                    const locationInfo = new LocationDetails({
                        ...element?.addressInfo,
                        for_portal_user: forPortalUserId
                    });
                    locationData = await locationInfo.save();

                    var newObject
                    var newObjectOne
                    var newArray2 = []
                    var newArray3 = []
                    var newArray1 = [
                        {
                            "start_time_with_date": new Date(),
                            "end_time_with_date": new Date()
                        }
                    ]
                    if (element?.nonOpeningDateAndTime.length > 0) {
                        element?.nonOpeningDateAndTime.map((singleData) => {
                            newObject = {
                                start_time_with_date: new Date(singleData?.date + "T" + singleData?.start_time + ":15.215Z"),
                                end_time_with_date: new Date(singleData?.date + "T" + singleData?.end_time + ":15.215Z")
                            }
                            newObjectOne = {
                                from_date_timestamp: new Date(singleData?.date + "T" + singleData?.start_time + ":15.215Z"),
                                to_date_timestamp: new Date(singleData?.date + "T" + singleData?.end_time + ":15.215Z")
                            }
                            newArray3.push(newObjectOne)
                            newArray2.push(newObject)
                        })
                    } else {
                        newArray2 = [
                            {
                                "start_time_with_date": new Date(),
                                "end_time_with_date": new Date()
                            }
                        ]
                        newArray3 = [
                            {
                                "from_date_timestamp": new Date(),
                                "to_date_timestamp": new Date()
                            }
                        ]
                    }
                    var onDutyData
                    const onDutyInfo = new OnDuty({
                        on_duty: newArray3,
                        for_portal_user: forPortalUserId,
                    });
                    onDutyData = await onDutyInfo.save();


                    const openingHoursInfo = new OpeningHours({
                        week_days: element?.openingHour,
                        close_date_and_time: newArray2,
                        open_date_and_time:newArray1,
                        for_portal_user: forPortalUserId
                    });
                    openingHoursData = await openingHoursInfo.save();
                }))


            } else {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: "Uploaded excel is blank or pharmacy with email already exist or groupNumber and city not created in superAdmin !!",
                    errorCode: null,
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    user_details: {
                        portalUserData: userData,
                        adminData
                    }
                },
                message: `pharmacy added successfully`,
                errorCode: null,
            });


        } catch (error) {
            console.log(error, "check error");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "INTERNAL_ERROR",
            });
        }
    }

    async editPharmacyOnDutyGroup(req, res) {
        try {
            const {
                pharmacyId,
                pharmacyName,
                countryCode,
                phoneNumber,
                email,
                addressInfo,
                openingHour,
                nonOpeningDateAndTime,
                date_of_creation,
            } = req.body;
            console.log(req.body, "check log for edit");
            const userExist = await PortalUser.findOne({ _id: pharmacyId, createdBy: "super-admin" })

            if (userExist) {

                const createdBySuperAdmin = await PortalUser.findOne({ email, _id: { $ne: pharmacyId } }).lean();

                if (createdBySuperAdmin) {

                    sendResponse(req, res, 200, {
                        status: false,
                        data: null,
                        message: `this email is already added please check in onDuty Group or in individual pharmacy list`,
                        errorCode: null,
                    });
                    return;
                }

                const userData = await PortalUser.findOneAndUpdate(
                    { _id: pharmacyId },
                    {
                        $set: {
                            phone_number: phoneNumber,
                            country_code: countryCode,
                            date_of_creation,
                            email: email
                        }
                    },
                    { new: true }
                )

                const adminData = await AdminInfo.findOneAndUpdate(
                    { for_portal_user: pharmacyId },
                    {
                        $set: {
                            pharmacy_name: pharmacyName
                        }
                    },
                    { new: true }
                )
                const locationData = await LocationDetails.findOneAndUpdate(
                    { for_portal_user: pharmacyId },
                    {
                        $set: {
                            ...addressInfo,
                        }
                    },
                    { new: true }
                )

                var newObject
                var newObjectOne
                var newArray2 = []
                var newArray3 = []
                if (nonOpeningDateAndTime.length > 0) {
                    nonOpeningDateAndTime.map((singleData) => {
                        newObject = {
                            start_time_with_date: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                            end_time_with_date: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                        }
                        newObjectOne = {
                            from_date_timestamp: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                            to_date_timestamp: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                        }
                        newArray3.push(newObjectOne)
                        newArray2.push(newObject)
                    })
                } else {
                    newArray2 = [
                        {
                            "start_time_with_date": new Date(),
                            "end_time_with_date": new Date()
                        }
                    ]
                    newArray3 = [
                        {
                            "from_date_timestamp": new Date(),
                            "to_date_timestamp": new Date()
                        }
                    ]
                }

                const openingHoursData = await OpeningHours.findOneAndUpdate(
                    { for_portal_user: pharmacyId },
                    {
                        $set: {
                            week_days: openingHour,
                            close_date_and_time: newArray2,
                        }
                    },
                    { new: true }
                )

                const onDutyDetails = await OnDuty.findOne({ for_portal_user: pharmacyId })
                var onDutyData
                if (onDutyDetails) {
                    onDutyData = await OnDuty.findOneAndUpdate(
                        { for_portal_user: pharmacyId },
                        {
                            $set: {
                                on_duty: newArray3
                            },
                        },
                        { new: true }
                    ).exec();
                } else {
                    const onDutyInfo = new OnDuty({
                        on_duty: newArray3,
                        for_portal_user: pharmacyId
                    });
                    onDutyData = await onDutyInfo.save();
                }




                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `pharmacy updated successfully`,
                    errorCode: null,
                });


            } else {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: `Not Authorize to Update`,
                    errorCode: "EDITED_BY_PHARMACY",
                });
            }



        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update pharmacy`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listPharmacyOnDutyGroup(req, res) {
        const {
            onDutyGroupId,
        } = req.query;
        try {
            const result = await AdminInfo.aggregate([
                {
                    $match: {
                        in_on_duty_group: mongoose.Types.ObjectId(onDutyGroupId),
                    }
                },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalusers",
                    }
                },
                {
                    $unwind: "$portalusers"
                },
                {
                    $match: {
                        "portalusers.createdBy": "super-admin",
                    }
                },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "locationinfos",
                    }
                },
                {
                    $unwind: "$locationinfos"
                },
            ])


            // const result = await AdminInfo.find({ in_on_duty_group: onDutyGroupId })
            //     .populate({
            //         path:"for_portal_user"
            //     })
            console.log(result, "result gropu ka");
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result
                },
                message: `pharmacy list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get pharmacy list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async detailsPharmacyOnDutyGroup(req, res) {
        const {
            onDutyGroupId,
            pharmacyId
        } = req.query;
        try {
            const result = await AdminInfo.aggregate([
                {

                    $match: {
                        $and: [{
                            in_on_duty_group: mongoose.Types.ObjectId(onDutyGroupId)
                        }, {
                            for_portal_user: mongoose.Types.ObjectId(pharmacyId)
                        }]
                    }
                },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalusers",
                    }
                },
                {
                    $unwind: "$portalusers"
                },
                {
                    $match: {
                        "portalusers._id": mongoose.Types.ObjectId(pharmacyId),
                    }
                },
                {
                    $lookup: {
                        from: "openinghoursinfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "openinghoursinfos",
                    }
                },
                {
                    $unwind: "$openinghoursinfos"
                },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "locationinfos",
                    }
                },
                {
                    $unwind: "$locationinfos"
                },
                {
                    $lookup: {
                        from: "ondutygroups",
                        localField: "in_on_duty_group",
                        foreignField: "_id",
                        as: "ondutygroups",
                    }
                },
                {
                    $unwind: "$ondutygroups"
                },
            ])

            // const result = await AdminInfo.findOne({ in_on_duty_group: onDutyGroupId, for_portal_user: pharmacyId })
            //     .populate({
            //         path: "for_portal_user"
            //     })
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result
                },
                message: `pharmacy details get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get pharmacy details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }




}
module.exports = new OnDutyGroupController();
