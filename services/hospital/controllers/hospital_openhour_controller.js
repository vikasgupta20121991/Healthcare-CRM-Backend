import Counter from "../models/counter";
import PortalUser from "../models/portal_user";
import HospitalAdminInfo from "../models/hospital_admin_info";
import LocationDetails from "../models/location_info";
import { handleResponse, sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import OpeningHours from "../models/hospital_opening_hours";
import { AddHospitalsColumns } from "../config/constants";
import Http from "../helpers/httpservice"
import hospitalType from "../models/hospitalType";
import mongoose from "mongoose";
import { processExcel } from "../middleware/utils";
const fs = require('fs');
const stream = require('stream');
const csv = require('fast-csv');
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

class HospitalOpenHourController {

    async getHealthCenterTypes(req, res) {
        try {

            var result;

            result = await hospitalType.find({ active_status: true, delete_status: false }, { name: 1, _id: 1 });
            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    result,
                    message: "successfully fetched health center types",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    result: null,
                    message: "No Records Found!!",
                    errorCode: null,
                });
            }


        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getHealthCenterDetailsByName(req, res) {

        try {
            const { name, department_id } = req.query;
            var type_data = null;

            if (name != '') {
                type_data = await hospitalType.findOne({ name: { $regex: name, $options: "i" } })
            }

            if (type_data != null) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: type_data,
                    message: `Health Center Type Fetched successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `No Health Center Type Found!!`,
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get health center type by its name",
                errorCode: error.message,
            });
        }
    }

    async addHospital(req, res) {
        try {
            const {
                healthCenter,
                email,
                hospital_name,
                mobile,
                country_code,
                openingHour,
                addressInfo } = req.body;
            console.log(req.body, "00000333");
            let password = 'Admin@123';
            const passwordHash = await hashPassword(password);
            var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
            const userExist = await PortalUser.findOne({ email })

            if (userExist) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User already exist",
                    errorCode: "USER_EXIST",
                });
            }

            const userDetails = new PortalUser({
                email,
                country_code,
                mobile,
                user_id: sequenceDocument.sequence_value,
                password: passwordHash,
                verified: false,
                role: "HOSPITAL_ADMIN",
                createdBy: "super-admin"
            });
            const userData = await userDetails.save();
          


            const locationInfo = new LocationDetails({
                loc: addressInfo.loc, // Keep loc as it is

                // Set other fields to null if they are blank or missing
                address: addressInfo.address || null,
                neighborhood: addressInfo.neighborhood || null,
                country: addressInfo.country || null,
                region: addressInfo.region || null,
                province: addressInfo.province || null,
                department: addressInfo.department || null,
                city: addressInfo.city || null,
                village: addressInfo.village || null,
                pincode: addressInfo.pincode || null,

                for_portal_user: userData._id
            });
            const locationData = await locationInfo.save();
            const hospitalAdmin = new HospitalAdminInfo({
                hospital_name: hospital_name,
                verify_status: "APPROVED",
                for_portal_user: userData._id,
                type_of_health_center: healthCenter,
                in_location: locationData._id,

            });
            const adminData = await hospitalAdmin.save();

            var newObject
            var newArray2 = [
                {
                    "start_time_with_date": new Date(),
                    "end_time_with_date": new Date()
                }
            ]
            const openingHoursInfo = new OpeningHours({
                week_days: openingHour,
                close_date_and_time: newArray2,
                for_portal_user: userData._id
            });
            const openingHoursData = await openingHoursInfo.save();



            sendResponse(req, res, 200, {
                status: true,
                body: {
                    userData,

                },
                message: "successfully Added hospital",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check eror 666");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addHospitalBulkCsv(req, res) {
        const { for_user } = req.body;
        const headers = {
            'Authorization': req.headers['authorization']
        }
        const filePath = './uploads/' + req.filename
        try {
            let extractData = await processExcel(filePath);
            let filteredData = [];
            let finalData = [];

            const isValidFile = await validateColumnWithExcel(AddHospitalsColumns, extractData[0]);

            fs.unlinkSync(filePath)
            if (!isValidFile) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
            }
console.log("extractData___________",extractData);
            if (extractData.length != 0) {
                await Promise.all(extractData.map(async (element) => {
                    const createdBySuperAdmin = await PortalUser.findOne({ email: element?.email }).lean();

                    if (createdBySuperAdmin) {
                        console.log("FOUND Existing")
                    } else {
                        filteredData.push(element)
                    }
                }))
            }
            if (filteredData.length != 0) {
                await Promise.all(filteredData.map(async (element) => {
                console.log("check If");

                    var health_center_type_data
                    let healthCenterTypeId;
                    let city_id;
                    let country_id;
                    let region_id;
                    let province_id;
                    let department_id;
                    let village_id;

                    if (element.healthCenter) {
                        health_center_type_data = await hospitalType.findOne({ name: element.healthCenter })
                      console.log("health_center_type_data__________",health_center_type_data);
                        if (health_center_type_data !== null) {
                            healthCenterTypeId = health_center_type_data?._id
                            console.log("H1__________");
                        }else{
                            return sendResponse(req, res, 200, {
                                status: false,
                                body: null,
                                message: "HealthCenter not found.",
                                errorCode: null,
                            });
                        }

                    }

                    if (health_center_type_data) {  //if health center found then add
                        if (element.country) {

                            let country_details = await httpService.getStaging('common-api/get-country-by-name', { name: element.country }, headers, 'superadminServiceUrl');
                            
                            if (country_details.status) {
                                country_id = await country_details.body._id
                                console.log("H2__________");
                            } else {
                                country_id = ''
                            }
                        }

                        if (element.region && country_id) {
                            let region_details = await httpService.getStaging('common-api/get-region-by-name', { name: element.region, country_id }, headers, 'superadminServiceUrl');
                            
                            if (region_details.status) {
                                region_id = await region_details.body._id
                                console.log("H3__________");
                            } else {
                                region_id = ''
                            }
                        }

                        if (element.province && region_id) {
                            let province_details = await httpService.getStaging('common-api/get-province-by-name', { name: element.province, region_id }, headers, 'superadminServiceUrl');
                            
                            if (province_details.status) {
                                province_id = await province_details.body._id
                                console.log("H4__________");
                            } else {
                                province_id = ''
                            }
                        }

                        if (element.department && province_id) {
                            
                            let department_details = await httpService.getStaging('common-api/get-department-by-name', { name: element.department, province_id }, headers, 'superadminServiceUrl');
                            if (department_details.status) {
                                console.log("H5__________");
                                department_id = await department_details.body._id
                            } else {
                                department_id = ''
                            }
                        }

                        if (element.city && department_id) {
                            
                            let city_details = await httpService.getStaging('common-api/get-city-by-name', { name: element.city, department_id }, headers, 'superadminServiceUrl');
                            if (city_details.status) {
                                console.log("H6__________");
                                city_id = await city_details.body._id
                            } else {
                                city_id = ''
                            }
                        }

                        if (element.village && department_id) {
                            console.log("H7__________");

                            let village_details = await httpService.getStaging('common-api/get-village-by-name', { name: element.village, department_id }, headers, 'superadminServiceUrl');
                            if (village_details.status) {
                                village_id = await village_details.body._id
                            } else {
                                village_id = ''
                            }
                        }

                        let obj = {
                            "healthCenter": healthCenterTypeId ? healthCenterTypeId : null,
                            "hopitalId": "",
                            "hospital_name": element.hospital_name,
                            "mobile_phone_number": element.mobile_phone_number,
                            "email": element.email,
                            "addressInfo": {
                                "loc": {
                                    "type": "Point",
                                    "coordinates": [
                                        Number(element.lat),
                                        Number(element.long)
                                    ]
                                },
                                "address": element?.address,
                                "neighborhood": element?.neighborhood,
                                "country": country_id ? country_id : null,
                                "region": region_id ? region_id : null,
                                "province": province_id ? province_id : null,
                                "department": department_id ? department_id : null,
                                "city": city_id ? city_id : null,
                                "village": village_id ? village_id : null,
                                "pincode": element?.pincode,


                            },
                            "countryCode": element?.countryCode,
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
                                        "start_time": element?.thu_start_time,
                                        "end_time": element?.thu_end_time,
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
                        }
                        console.log("runnn345");
                        finalData.push(obj);
                    }

                }));
            }

            var userData
            var adminData
            var locationData
            var openingHoursData
            let portalId ;
            if (finalData.length != 0) {
                await Promise.all(finalData.map(async (element) => {
                    let password = 'Admin@123';
                    const passwordHash = await hashPassword(password);
                    var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })

                    const userDetails = new PortalUser({
                        email: element?.email,
                        country_code: element?.countryCode,
                        mobile: element?.mobile_phone_number,
                        user_id: sequenceDocument.sequence_value,
                        password: passwordHash,
                        verified: false,
                        role: "HOSPITAL_ADMIN",
                        createdBy: "super-admin"
                    });
                    userData = await userDetails.save();
                    console.log("userData-->", userData)
                    portalId = userData?._id

                   



                    const locationInfo = new LocationDetails({
                        ...element?.addressInfo,
                        for_portal_user: portalId
                    });
                    locationData = await locationInfo.save();
                    console.log("locationData-->", locationData)
                    const hospitalAdmin = new HospitalAdminInfo({
                        hospital_name: element?.hospital_name,
                        verify_status: "APPROVED",
                        for_portal_user: portalId,
                        type_of_health_center: element.healthCenter,
                        in_location: locationData._id
                    });
                    adminData = await hospitalAdmin.save();
                    console.log("ADMIN-->", adminData)

                    const openingHoursInfo = new OpeningHours({
                        week_days: element?.openingHour,
                        close_date_and_time: [],
                        for_portal_user: portalId
                    });
                    openingHoursData = await openingHoursInfo.save();
                    console.log("openingHoursData-->", openingHoursData)

                }))


            } else {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: "Uploaded csv is blank or Hospital with email already exist!!",
                    errorCode: null,
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                data: null,
                message: `Hospitals added successfully`,
                errorCode: null,
            });


        } catch (error) {
            console.log("error______",error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "INTERNAL_ERROR",
            });
        }
    }

    async editHospital(req, res) {
        try {
            const {
                hospitalId,
                healthCenter,
                email,
                hospital_name,
                mobile,
                country_code,
                openingHour,
                addressInfo } = req.body;
            const userExist = await PortalUser.findOne({ _id: hospitalId, createdBy: "super-admin" });
            if (userExist) {

                const userData = await PortalUser.findOneAndUpdate(
                    { _id: hospitalId },
                    {
                        $set: {
                            mobile: mobile,
                            country_code: country_code,
                        }
                    },
                    { new: true }
                )

                const adminData = await HospitalAdminInfo.findOneAndUpdate(
                    { for_portal_user: hospitalId },
                    {
                        $set: {
                            hospital_name: hospital_name,
                            type_of_health_center: healthCenter
                        }
                    },
                    { new: true }
                )
                const locationData = await LocationDetails.findOneAndUpdate(
                    { for_portal_user: hospitalId },
                    {
                        $set: {
                            ...addressInfo,
                        }
                    },
                    { new: true }
                )

                const openingHoursData = await OpeningHours.findOneAndUpdate(
                    { for_portal_user: hospitalId },
                    {
                        $set: {
                            week_days: openingHour
                        }
                    },
                    { new: true }
                )

                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `Hospital updated successfully`,
                    errorCode: null,
                });

            } else {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: `Not Authorize to Update`,
                    errorCode: "EDITED_BY_HOSPITAL",
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllOpenHourHospital() {

        try {
            const result = await PortalUser.aggregate([
                {
                    $match: {
                        in_on_duty_group: mongoose.Types.ObjectId(onDutyGroupId),
                    }
                },
                {
                    $lookup: {
                        from: "HospitalAdminInfo",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "AdminInfo",
                    }
                },
                {
                    $unwind: "$portalusers"
                },

            ])


            // const result = await AdminInfo.find({ in_on_duty_group: onDutyGroupId })
            //     .populate({
            //         path:"for_portal_user"
            //     })
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result
                },
                message: `Hospital list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get hospital list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getHospitalAddedBySuperadmin(req, res) {
        const { searchText, page, limit } = req.query;
        try {
            var matchFilter = {};
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            if (searchText != "") {
                matchFilter = {
                    $match: {
                        'hospitalInfo.hospital_name': { $regex: searchText || '', $options: "i" }
                    }
                }
            } else {
                matchFilter = {
                    $match: {
                        'hospitalInfo.hospital_name': { $regex: '', $options: "i" }
                    }
                }
            }

            let aggregate = [
                {
                    $match: {
                        createdBy: "super-admin",
                        isDeleted: false,
                        role: 'HOSPITAL_ADMIN'

                    }
                },

                {
                    $lookup: {
                        from: "hospitaladmininfos",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "hospitalInfo",
                    }
                },
                { $unwind: "$hospitalInfo" },
                matchFilter,
                {
                    $lookup: {
                        from: "hospitaltypes",
                        localField: "hospitalInfo.type_of_health_center",
                        foreignField: "_id",
                        as: "hospitalType",
                    }
                },
                {
                    $lookup: {
                        from: "hospitaltypes",
                        let: { type_of_health_center: "$hospitalInfo.type_of_health_center" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$type_of_health_center"] }
                                }
                            }
                        ],
                        as: "hospitalType"
                    }
                },
                { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "locationInfo",
                    }
                },
                { $unwind: "$locationInfo" },
                {
                    $project: {
                        mobile: 1,
                        hospital_name: '$hospitalInfo.hospital_name',
                        type: '$hospitalType.name',
                        address: '$locationInfo.address',
                        createdAt: 1
                    }
                },
                {
                    $sort: sortingarray
                }
            ]

            const count = await PortalUser.aggregate(aggregate); //get counts first

            aggregate.push(
                { $skip: (page - 1) * limit },
                { $limit: limit * 1 }
            )

            const result = await PortalUser.aggregate(aggregate);
            console.log(result, "9494949",aggregate);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count.length / limit),
                    currentPage: page,
                    totalRecords: count.length,
                    result,
                },
                message: `Hospital list get successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get hospital list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getHospitalDetails(req, res) {
        const { hospitalId } = req.query;
        try {
            var result;

            let aggregate = [
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(hospitalId),
                    }
                },
                {
                    $lookup: {
                        from: "hospitaladmininfos",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "hospitalInfo",
                    }
                },
                { $unwind: "$hospitalInfo" },
                {
                    $lookup: {
                        from: "hospitaltypes",
                        let: { type_of_health_center: "$hospitalInfo.type_of_health_center" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$type_of_health_center"] }
                                }
                            }
                        ],
                        as: "hospitalType"
                    }
                },
                { $unwind: { path: "$hospitalType", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "locationInfo",
                    }
                },
                { $unwind: "$locationInfo" },
                {
                    $lookup: {
                        from: "hospitalopeninghours",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "hospitalopeninghours",
                    }
                },
                { $unwind: "$hospitalopeninghours" },
                {
                    $project: {
                        mobile: 1,
                        email: 1,
                        country_code: 1,
                        hospital_name: '$hospitalInfo.hospital_name',
                        type: { _id: '$hospitalType._id', name: '$hospitalType.name' },
                        addressInfo: '$locationInfo',
                        openingHour: '$hospitalopeninghours'
                    }
                }
            ];

            result = await PortalUser.aggregate(aggregate);
            console.log("RESULT---->", result)
            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `Hospital fetched successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    data: result,
                    message: `Hospital Not Found!!!`,
                    errorCode: null,
                });
            }



        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteHospital(req, res) {
        try {
            const {
                hospitalId,
            } = req.body;

            var result = await PortalUser.findOneAndUpdate({ _id: hospitalId, createdBy: "super-admin" }, { $set: { isDeleted: true } });

            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "Hospital Deleted Successfully",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Hospital Not Found!!!",
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async deleteHospitalMasterAction(req, res) {
        try {
            const { ondutytId, action_name, action_value } = req.body;
            var result;
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            if (action_name == "active") {
                result = await PortalUser.findOneAndUpdate(
                    { _id: ondutytId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active Hospital' : 'Successfully In-active Hospital'
            }

            if (action_name == "delete") {
                if (ondutytId == '') {
                    result = await PortalUser.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { isDeleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    result = await PortalUser.updateMany(
                        { _id: { $in: ondutytId } },
                        {
                            $set: { isDeleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Hospital'
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

module.exports = new HospitalOpenHourController();