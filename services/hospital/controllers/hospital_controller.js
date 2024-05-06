"use strict";

// models
import Counter from "../models/counter";
import PortalUser from "../models/portal_user";
import HospitalAdminInfo from "../models/hospital_admin_info";
import LocationInfo from "../models/location_info";
import PathologyTestInfo from "../models/pathology_test_info";
import PathologyTestInfoNew from "../models/pathologyTestInfoNew";
import BankDetailInfo from "../models/bank_detail";
import MobilePayInfo from "../models/mobile_pay";
import StaffInfo from "../models/staff_info";
import EducationalDetail from "../models/educational_details";
import DoctorAvailability from "../models/doctor_availability";
import DocumentInfo from "../models/document_info";
import Otp2fa from "../models/otp2fa";
import ForgotPasswordToken from "../models/forgot_password_token";
import Specialty from "../models/specialty_info"
import Department from "../models/department_info"
import Service from "../models/service_info"
import Unit from "../models/unit_info"
import Expertise from "../models/expertise_info"
import BasicInfo from "../models/basic_info"
import Appointment from "../models/appointment"
import ReasonForAppointment from "../models/reason_for_appointment"
import HospitalOpeningHours from "../models/hospital_opening_hours";
import FeeManagement from "../models/fee_management"
import Notification from "../models/notification"
import HospitalType from "../models/hospitalType"
import Questionnaire from "../models/questionnaire";
import Assessment from "../models/assessment";
import SubscriptionPurchaseStatus from '../models/subscription/purchasestatus'
import Team from "../models/team";
import ProfileInfo from "../models/profile_info"
// utils
import { sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { generate6DigitOTP, smsTemplateOTP } from "../constant";
import { sendSms } from "../middleware/sendSms";
import { checkPassword, formatDateAndTime, bcryptCompare, generateRefreshToken, generateTenSaltHash, generateToken, getNextSequenceValue, processExcel } from "../middleware/utils";
import { verifyEmail2fa, forgotPasswordEmail, resetPasswordEmail } from "../helpers/emailTemplate";
import { sendEmail } from "../helpers/ses";
import { getFile, uploadFile, getDocument } from "../helpers/s3";
import crypto from "crypto"
import mongoose from "mongoose";
import Http from "../helpers/httpservice"
const httpService = new Http()
import moment from "moment"
import { notification } from "../helpers/notification";
import { SpecialtyColumns, TimeZone, AppointmentReasonColumns, departmentHospital, expertiseHospital, serviceHospital, RegionColumns, unitHospital, TeamColumns } from "../config/constants";
import hospital_location from "../models/hospital_location";
import profile_info from "../models/profile_info";
const csv = require('fast-csv');
const fs = require('fs');
import { config } from "../config/constants";
import HospitalLocation from '../models/hospital_location';
import Logs from "../models/logs";
import HospitalAdmininfo from "../models/hospital_admin_info";
import { AppointmentInvitation } from "../helpers/emailTemplate";
import ProviderDoc from "../models/provider_documnet";


export const formatDateToYYYYMMDD = async (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 to month because it's zero-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function uniqueArray(array1, array2) {
    var a = array1
    var b = array2
    // console.log(a, "allSlot");
    // console.log(b, "appoint");
    const isSameUser = (a, b) => a.slot === b.slot && a.status === b.status;

    // Get items that only occur in the left array,
    // using the compareFunction to determine equality.
    const onlyInLeft = (left, right, compareFunction) =>
        left.filter(leftValue =>
            !right.some(rightValue =>
                compareFunction(leftValue, rightValue)));

    const onlyInA = onlyInLeft(a, b, isSameUser);
    const onlyInB = onlyInLeft(b, a, isSameUser);

    const result = [...onlyInA, ...onlyInB];
    return result
}
function filterUnavailableSlotFunction(array1, value, lastValue) {
    var startTime = value.split("-")[0]
    var endTime = lastValue.split("-")[0]
    console.log(startTime, "startTime");
    var arr = []
    array1.forEach((element, index) => {
        var start = element.slot.split("-")[0]
        // console.log(start, "start");
        // console.log(start.split(":")[0] + start.split(":")[1], "new Date(start).getTime()");
        // console.log(startTime.split(":")[0] + startTime.split(":")[1], "new Date(StartTime).getTime()");
        // (start.split(":")[0] + start.split(":")[1]) > (endTime.split(":")[0] + endTime.split(":")[1])
        // startTime > start && endTime < start
        if ((start.split(":")[0] + start.split(":")[1]) < (startTime.split(":")[0] + startTime.split(":")[1])) {
            // array1.splice(index, 1)
            console.log(index, "index");
        } else {
            // endTime < start 
            if ((endTime.split(":")[0] + endTime.split(":")[1]) < (start.split(":")[0] + start.split(":")[1])) {

            } else {
                arr.push(array1[index])
            }
        }
    })
    return arr
}
function filterBookedSlots(array1, array2) {
    array1.forEach((element, index) => {
        var xyz = array2.indexOf(element.slot)
        if (xyz != -1) {
            array1[index].status = 1
        }
    });
    return array1
}
function filterBookedSlotsToday(array1) {

    array1.forEach((element, index) => {
        var xyz = element.slot.split("-")[0].split(":")[0] + element.slot.split("-")[0].split(":")[1]

        const date = new Date();
        date.setHours(date.getHours() + TimeZone.hours, date.getMinutes() + TimeZone.minute);
        if (date.getMinutes().length == 1) {
            date.setMinutes("0" + date.getMinutes());
        }
        // console.log(date.getMinutes(),'TimeZone.hours',date.getMinutes().length);

        var hm = date.getHours().toString() + String(date.getMinutes()).padStart(2, '0')
        // console.log(TimeZone.hours,'TimeZone.hours');
        // console.log(hm,"dshfjghsdgfk",xyz,new Date().getHours().toString(),new Date().getMinutes().toString());
        if (parseInt(hm) > parseInt(xyz)) {
            array1[index].status = 1
        }
    });

    return array1
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
const getUnavailabilityDay = async (week_days) => {
    let dayArray = []
    for (const week_day of week_days) {
        for (const value of week_day) {
            let sunIndex = dayArray.indexOf('sun')
            let monIndex = dayArray.indexOf('mon')
            let tueIndex = dayArray.indexOf('tue')
            let wedIndex = dayArray.indexOf('wed')
            let thuIndex = dayArray.indexOf('thu')
            let friIndex = dayArray.indexOf('fri')
            let satIndex = dayArray.indexOf('sat')
            if (value.sun_start_time === "0000" && value.sun_end_time === "0000") {
                if (sunIndex === -1) {
                    dayArray.push('sun')
                }
            } else {
                if (sunIndex >= -1) {
                    dayArray.splice(sunIndex, 1)
                }
            }
            if (value.mon_start_time === "0000" && value.mon_end_time === "0000") {
                if (monIndex === -1) {
                    dayArray.push('mon')
                }
            } else {
                if (monIndex >= -1) {
                    dayArray.splice(monIndex, 1)
                }
            }
            if (value.tue_start_time === "0000" && value.tue_end_time === "0000") {
                if (tueIndex === -1) {
                    dayArray.push('tue')
                }
            } else {
                if (tueIndex >= -1) {
                    dayArray.splice(tueIndex, 1)
                }
            }
            if (value.wed_start_time === "0000" && value.wed_end_time === "0000") {
                if (wedIndex === -1) {
                    dayArray.push('wed')
                }
            } else {
                if (wedIndex >= -1) {
                    dayArray.splice(wedIndex, 1)
                }
            }
            if (value.thu_start_time === "0000" && value.thu_end_time === "0000") {
                if (thuIndex === -1) {
                    dayArray.push('thu')
                }
            } else {
                if (thuIndex >= -1) {
                    dayArray.splice(thuIndex, 1)
                }
            }
            if (value.fri_start_time === "0000" && value.fri_end_time === "0000") {
                if (friIndex === -1) {
                    dayArray.push('fri')
                }
            } else {
                if (friIndex >= -1) {
                    dayArray.splice(friIndex, 1)
                }
            }
            if (value.sat_start_time === "0000" && value.sat_end_time === "0000") {
                if (satIndex === -1) {
                    dayArray.push('sat')
                }
            } else {
                if (satIndex >= -1) {
                    dayArray.splice(satIndex, 1)
                }
            }
        }
    }
    return dayArray
}
const getUnavailabilityDate = async (unavailability_dates) => {
    let dateArray = []
    if (unavailability_dates.length > 0) {
        for (const unavailability_date of unavailability_dates) {
            // console.log("unavailability_dates----", unavailability_date);
            if (unavailability_date.length > 0) {
                for (const value of unavailability_date) {
                    if (value.date != '') {
                        let date = formatDateAndTime(value.date).split(' ')[0]

                        if (dateArray.indexOf(date) === -1) {
                            dateArray.push(date)
                        }
                    }

                }
            }

        }
    }

    return dateArray
}
const getDoctorCount = async (hospital_portal_id) => {
    var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
        'for_portal_user.isDeleted': false,
        'for_portal_user.isActive': true,
        'for_portal_user.lock_user': false,
        for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
    };

    let aggregate = [
        {
            $lookup: {
                from: "portalusers",
                localField: "for_portal_user",
                foreignField: "_id",
                as: "for_portal_user",
            }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
            $project: {
                _id: 1,
            }
        },
    ];
    const totalData = await BasicInfo.aggregate(aggregate);
    return totalData.length
}

export const updateSlotAvailability = async (hospitalId, notificationReceiver, timeStamp) => {
    console.log(hospitalId, "====", notificationReceiver, "====", timeStamp);
    for (let index = 0; index < 3; index++) {
        const resData = await httpService.postStaging('hospital/doctor-available-slot',
            {
                locationId: hospitalId,
                doctorId: notificationReceiver,
                appointmentType: 'ONLINE',
                timeStamp: timeStamp
            }, headers, 'hospitalServiceUrl');

        // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
        // timeStamp = new Date(timeStampString)
        const slots = resData?.body?.allGeneralSlot

        console.log("SLOTSssssssss_______", slots)
        let isBreak = false
        if (slots) {
            for (let index = 0; index < slots.length; index++) {
                const element = slots[index];
                if (element.status == 0) {
                    slot = element
                    isBreak = true
                    break
                }
            }
        }

        if (slot != null) {
            isBreak = true
            break
        }

        if (!isBreak) {
            console.log("isBreakkk_______");
            timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
            timeStamp = new Date(timeStampString)
        }
    }

    if (slot != null) {

        console.log(slot, 'slot available');
        console.log(timeStamp, 'timeStamp')


        const basicInfo = await BasicInfo.findOneAndUpdate(
            { for_portal_user: { $eq: notificationReceiver } },
            {
                $set: {
                    nextAvailableSlot: slot.slot,
                    nextAvailableDate: timeStamp
                },
            },

            { upsert: false, new: true }
        ).exec();
        // update data in basic info
    }
}


export const updatePaymentStatusAndSlot = async (appointmentId, req) => {

    console.log(appointmentId, "appointmentIddddd_______");


    //const appointmentDetails = Appointment.findById(appointmentId);
    const appointmentDetails = await Appointment.findById(mongoose.Types.ObjectId(appointmentId));

    var notificationCreator = null
    var notificationReceiver = null
    if (appointmentDetails.madeBy == "doctor") {
        notificationCreator = appointmentDetails.doctorId
        notificationReceiver = appointmentDetails.patientId
    } else {
        notificationCreator = appointmentDetails.patientId
        notificationReceiver = appointmentDetails.doctorId
    }

    // return;
    var appointType = appointmentDetails.appointmentType.replace("_", " ");

    var message = `You have recevied one new appoitment for ${appointType} consulation at ${appointmentDetails.hospital_details.hospital_name} on ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} from ${appointmentDetails.patientDetails.patientFullName}`
    var requestData = {
        created_by_type: appointmentDetails.madeBy,
        created_by: notificationCreator,
        content: message,
        url: '',
        for_portal_user: notificationReceiver,
        notitype: 'New Appointment',
        appointmentId: appointmentId
    }
    var result = await notification(appointmentDetails.madeBy, notificationCreator, "hospitalServiceUrl", req.body.doctorId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
    console.log("result>>>>>>>>>>>>>>>", result)

    /*  
    to insert next available appointment date of doctor
    */


    var timeStamp = new Date()
    var timeStampString
    var slot = null

    const locationResult = await hospital_location.find(
        {
            for_portal_user: notificationReceiver,
            "hospital_or_clinic_location.status": "APPROVED"
        }).exec();

    const hospitalObject = (locationResult[0].hospital_or_clinic_location);
    //console.log(hospitalObject[hospitalObject.length - 1], 'hospitalObject');

    const hospitalId = hospitalObject[hospitalObject.length - 1].hospital_id;
    //console.log(hospitalId,'hospitalId');
    //return;
    const headers = {
        'Authorization': req.headers['authorization']
    }

    for (let index = 0; index < 3; index++) {
        const resData = await httpService.postStaging('hospital/doctor-available-slot',
            {
                locationId: hospitalId,
                doctorId: notificationReceiver,
                appointmentType: 'ONLINE',
                timeStamp: timeStamp
            }, headers, 'hospitalServiceUrl');

        // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
        // timeStamp = new Date(timeStampString)
        const slots = resData?.body?.allGeneralSlot

        console.log("SLOTSssssssss_______", slots)
        let isBreak = false
        if (slots) {
            for (let index = 0; index < slots.length; index++) {
                const element = slots[index];
                if (element.status == 0) {
                    slot = element
                    isBreak = true
                    break
                }
            }
        }

        if (slot != null) {
            isBreak = true
            break
        }

        if (!isBreak) {
            console.log("isBreakkk_______");
            timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
            timeStamp = new Date(timeStampString)
        }
    }

    if (slot != null) {

        console.log(slot, 'slot available');
        console.log(timeStamp, 'timeStamp')


        const basicInfo = await BasicInfo.findOneAndUpdate(
            { for_portal_user: { $eq: notificationReceiver } },
            {
                $set: {
                    nextAvailableSlot: slot.slot,
                    nextAvailableDate: timeStamp
                },
            },

            { upsert: false, new: true }
        ).exec();
        // update data in basic info
    }

}
class HospitalController {
    async signup(req, res) {
        try {
            const { email, password, full_name, first_name, middle_name, last_name, hospital_name, mobile, country_code } = req.body;
            const passwordHash = await hashPassword(password);
            var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
            console.log(sequenceDocument, "sequenceDocument");
            const userExist = await PortalUser.findOne({ email, isDeleted: false })
            if (userExist) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User already exist",
                    errorCode: "USER_EXIST",
                });
            }
            const userDetails = new PortalUser({
                full_name: first_name + " " + middle_name + " " + last_name,
                email,
                country_code,
                mobile,
                user_id: sequenceDocument.sequence_value,
                password: passwordHash,
                verified: false,
                role: "HOSPITAL_ADMIN",
                isFirstTime: 0
            });
            const userData = await userDetails.save();
            const hospitalAdmin = new HospitalAdminInfo({
                full_name: first_name + " " + middle_name + " " + last_name,
                first_name,
                middle_name,
                last_name,
                hospital_name,
                verify_status: "PENDING",
                for_portal_user: userData._id,
            });
            const adminData = await hospitalAdmin.save();

            let superadminData = await httpService.getStaging(
                "superadmin/get-super-admin-data",
                {},
                {},
                "superadminServiceUrl"
            );

            var requestData = {
                created_by_type: "hospital",
                created_by: userData?._id,
                content: `New Registration From ${userData?.full_name}`,
                url: '',
                for_portal_user: superadminData?.body?._id,
                notitype: "New Registration",
                appointmentId: adminData?._id,
            }

            var result = await notification('', '', "superadminServiceUrl", '', '', '', '', requestData);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    userData,
                    adminData
                },
                message: "successfully created hospital admin",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create hospital admin",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const { uuid } = req.headers;
            // const headers = {
            //     Authorization: req.headers["authorization"],
            // };
            const portalUserData = await PortalUser.findOne({ email: email.toLowerCase(), isDeleted: false }).lean();
            // console.log(portalUserData,'portalUserData');


            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }

            var restrictUser = ['INDIVIDUAL_DOCTOR', 'INDIVIDUAL_DOCTOR_STAFF', 'HOSPITAL_DOCTOR']
            if (restrictUser.includes(portalUserData.role)) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Please Login via Individual Doctor Portal",
                    errorCode: "USER_NOT_FOUND",
                });
            }



            const isPasswordMatch = await checkPassword(password, portalUserData);
            portalUserData.password = undefined
            if (!isPasswordMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Credential not matched",
                    errorCode: "INCORRECT_PASSWORD",
                });
            }

            if (portalUserData.isDeleted === true) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User deleted",
                    errorCode: "USER_DELETED",
                });
            }
            if (portalUserData.lock_user === true) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User temporarily locked",
                    errorCode: "USER_LOCKED",
                });
            }
            if (portalUserData.isActive === false) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User temporarily not active",
                    errorCode: "USER_NOT_ACTIVE",
                });
            }


            var userDetails
            const deviceExist = await Otp2fa.findOne({ uuid, for_portal_user: portalUserData._id, verified: true }).lean();
            if (!deviceExist || portalUserData.verified !== true) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        otp_verified: false,
                        token: null,
                        refreshToken: null,
                        user_details: {
                            portalUserData,
                            userDetails
                        }
                    },
                    message: "OTP verification pending 2fa",
                    errorCode: "VERIFICATION_PENDING",
                });
            }

            if (portalUserData.role == "HOSPITAL_ADMIN") {
                // userDetails = await HospitalAdminInfo.findOne({
                //     for_portal_user: portalUserData._id,
                // }).lean();

                var adminData1 = await HospitalAdminInfo.aggregate([
                    {
                        $match: { for_portal_user: portalUserData._id },
                    },
                    {
                        $lookup: {
                            from: "locationinfos",
                            localField: "in_location",
                            foreignField: "_id",
                            as: "locationinfos",
                        },
                    }
                ]);

                if (adminData1.length > 0) {
                    userDetails = adminData1[0]
                }

                if (userDetails?.locationinfos.length > 0) {
                    try {
                        var locationids = {
                            country_id: userDetails?.locationinfos[0]?.country,
                            region_id: userDetails?.locationinfos[0]?.region,
                            province_id: userDetails?.locationinfos[0]?.province,
                            village_id: userDetails?.locationinfos[0]?.village,
                            city_id: userDetails?.locationinfos[0]?.city,
                            department_id: userDetails?.locationinfos[0]?.department,
                        };

                        const locationdata = await httpService.postStaging(
                            "common-api/get-location-name",
                            { locationids: locationids },
                            {},
                            "superadminServiceUrl"
                        );

                        if (locationdata.status) {
                            userDetails.locationinfos[0].country = {
                                countryname: locationdata.body.country_name,
                                country_iso_code: locationdata.body.country_iso_code,
                            };
                            userDetails.locationinfos[0].region = locationdata.body.region_name;
                            userDetails.locationinfos[0].province = locationdata.body.province_name;
                            userDetails.locationinfos[0].village = locationdata.body.village_name;
                            userDetails.locationinfos[0].city = locationdata.body.city_name;
                            userDetails.locationinfos[0].department = locationdata.body.department_name;
                        }
                    } catch (err) {
                        console.log(err, "erraaaa");
                    }
                }

                if (userDetails?.profile_picture != null) {
                    let signedUrl = await getDocument(userDetails?.profile_picture);
                    userDetails.profile_picture = signedUrl;
                } else {
                    userDetails.profile_picture = "";
                }
            }


            const forUserData = await StaffInfo.find({ for_portal_user: mongoose.Types.ObjectId(portalUserData._id) })
            console.log("portalUserData.role", forUserData);
            let staffData = {}
            if (portalUserData.role == "HOSPITAL_STAFF") {
                console.log("inside hospital staff");

                console.log("forUserData.length->>", forUserData[0].department.length);
                if (forUserData[0].department?.length || forUserData[0].unit?.length || forUserData[0].service?.length) {
                    // console.log("hospital staff login");
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Please Login via Individual Doctor Portal",
                        errorCode: "USER_NOT_FOUND"
                    });
                } else {
                    userDetails = await StaffInfo.findOne({
                        for_portal_user: portalUserData._id,
                    }).lean();

                }

                staffData = await profile_info.findOne({ for_portal_user: portalUserData._id }).lean();
            }
            console.log("staffData", staffData);


            if (userDetails.verify_status !== "APPROVED") {
                const currentDate = new Date();
                const formattedDate = currentDate.toISOString();
                let addLogs = {};
                let saveLogs = {};

                addLogs = new Logs({
                    userName: portalUserData?.full_name,
                    userId: portalUserData?._id,
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

                });
                saveLogs = await addLogs.save();
                const savedLogId = saveLogs ? saveLogs._id : null;

                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        otp_verified: portalUserData.verified,
                        token: null,
                        refreshToken: null,
                        user_details: {
                            portalUserData,
                            userDetails,
                            staffData,
                            savedLogId
                        }
                    },
                    message: "Superadmin not approved yet",
                    errorCode: "PROFILE_NOT_APPROVED",
                });
            }

            const tokenClaims = {
                portalUserId: portalUserData._id,
                uuid
            }
            // createSession(req, portalUserData);
            const findFirstLogin = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portalUserData._id) });
            if (findFirstLogin && findFirstLogin.isFirstTime == 0) {
                findFirstLogin.isFirstTime = 1;
                await findFirstLogin.save();

            }

            // logs
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            let addLogs = {};
            let saveLogs = {};
            if (portalUserData.role == "HOSPITAL_ADMIN") {
                addLogs = new Logs({
                    userName: portalUserData?.full_name,
                    userId: portalUserData?._id,
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

                });
                saveLogs = await addLogs.save();
            } else {
                let checkAdmin = await HospitalAdmininfo.findOne({ for_portal_user: mongoose.Types.ObjectId(portalUserData?.created_by_user) })
                addLogs = new Logs({
                    userName: portalUserData?.full_name,
                    userId: portalUserData?._id,
                    adminData: {
                        adminId: portalUserData?.created_by_user,
                        adminName: checkAdmin?.full_name,
                        hospitalName: checkAdmin?.hospital_name
                    },
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,
                });
                saveLogs = await addLogs.save();
            }



            const savedLogId = saveLogs ? saveLogs._id : null;
            // console.log("savedLogId________", savedLogId);

            return sendResponse(req, res, 200, {
                status: true,
                body: {
                    otp_verified: portalUserData.verified,
                    token: generateToken(tokenClaims),
                    refreshToken: generateRefreshToken(tokenClaims),
                    user_details: {
                        portalUserData,
                        userDetails,
                        staffData
                    },
                    savedLogId
                },
                message: "User logged in successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async sendSmsOtpFor2fa(req, res) {
        try {
            const { email } = req.body;
            const { uuid } = req.headers;
            const portalUserData = await PortalUser.findOne({ email, isDeleted: false }).lean();
            if (!portalUserData) {
                return sendResponse(req, res, 422, {
                    status: false,
                    body: null,
                    message: "user not exist",
                    errorCode: "USER_NOT_EXIST",
                });
            }
            const mobile = portalUserData.mobile
            const country_code = portalUserData.country_code
            const deviceExist = await Otp2fa.findOne({ mobile, country_code, uuid, for_portal_user: portalUserData._id }).lean();
            if (deviceExist && deviceExist.send_attempts >= 500000) {
                return sendResponse(req, res, 422, {
                    status: false,
                    body: null,
                    message: "Maximum attempt exceeded",
                    errorCode: "MAX ATTEMPT_EXCEEDED",
                });
            }
            const otp = generate6DigitOTP();
            const otpText = smsTemplateOTP(otp);
            const smsRes = await sendSms(country_code + mobile, otpText);
            let result = null;
            if (smsRes == 200) {
                if (deviceExist) {
                    result = await Otp2fa.findOneAndUpdate({ mobile, country_code, uuid, for_portal_user: portalUserData._id }, {
                        $set: {
                            otp,
                            send_attempts: deviceExist.send_attempts + 1
                        }
                    }).exec();
                } else {
                    const otpData = new Otp2fa({
                        mobile,
                        otp,
                        country_code,
                        uuid,
                        for_portal_user: portalUserData._id,
                        send_attempts: 1
                    });
                    try {
                        result = await otpData.save();
                    } catch (error) {
                        sendResponse(req, res, 500, {
                            status: false,
                            body: null,
                            message: "something went wrong",
                            errorCode: null,
                        });
                    }
                }
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        id: result._id
                    },
                    message: "otp send successfully",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 500, {
                    status: false,
                    body: null,
                    message: "can't sent sms",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async sendEmailOtpFor2fa(req, res) {
        try {
            const { email } = req.body;
            const { uuid } = req.headers;
            const portalUserData = await PortalUser.findOne({ email, isDeleted: false }).lean();

            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }
            const deviceExist = await Otp2fa.findOne({ email, uuid, for_portal_user: portalUserData._id }).lean();
            if (deviceExist && deviceExist.send_attempts >= 500000) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Maximum attempt exceeded",
                    errorCode: "MAX ATTEMPT_EXCEEDED",
                });
            }
            const otp = generate6DigitOTP();
            const content = verifyEmail2fa(email, otp);
            await sendEmail(content);
            let result = null;
            if (deviceExist) {
                result = await Otp2fa.findOneAndUpdate({ email, uuid, for_portal_user: portalUserData._id }, {
                    $set: {
                        otp,
                        send_attempts: deviceExist.send_attempts + 1
                    }
                }).exec();
            } else {
                const otpData = new Otp2fa({
                    email,
                    otp,
                    uuid,
                    for_portal_user: portalUserData._id,
                    send_attempts: 1
                });
                result = await otpData.save();
            }
            return sendResponse(req, res, 200, {
                status: true,
                body: {
                    id: result._id
                },
                message: "Email Sent successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async matchOtpFor2fa(req, res) {
        try {
            const { mobile, otp, for_portal_user } = req.body;
            console.log("req.body", req.body);
            const { uuid } = req.headers;
            const otpResult = await Otp2fa.findOne({ uuid, for_portal_user, verified: false, mobile });
            console.log("otpResult", otpResult);
            if (otpResult) {
                const portalUserData = await PortalUser.findOne({ _id: for_portal_user }).lean();
                if (!portalUserData) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "user not exist",
                        errorCode: null,
                    });
                }
                if (otpResult.otp == otp) {
                    // req.session.ph_verified = true;
                    const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, for_portal_user, verified: false, mobile }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            id: updateVerified._id,
                            uuid: updateVerifiedUUID._id
                        },
                        message: "OTP matched",
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Incorrect OTP",
                        errorCode: "INCORRECT_OTP",
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async matchEmailOtpFor2fa(req, res) {
        try {
            const { email, otp, for_portal_user } = req.body;
            console.log("req.body", req.body);
            const { uuid } = req.headers;
            const otpResult = await Otp2fa.findOne({ uuid, email, for_portal_user, verified: false });
            console.log("otpResult", otpResult);
            if (otpResult) {
                const portalUserData = await PortalUser.findOne({ _id: for_portal_user }).lean();
                if (!portalUserData) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "user not exist",
                        errorCode: null,
                    });
                }
                if (otpResult.otp == otp) {
                    // req.session.ph_verified = true;
                    const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, email, for_portal_user, verified: false }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            id: updateVerified._id,
                            uuid: updateVerifiedUUID._id
                        },
                        message: "OTP matched",
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Incorrect OTP",
                        errorCode: "INCORRECT_OTP",
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }
    async createHospitalProfile(req, res) {
        try {
            const {
                hospitalAdminId,
                profile_picture,
                email,
                first_name,
                middle_name,
                last_name,
                hospital_name,
                type_of_health_center,
                category_of_health_center,
                main_phone_number,
                mobile_phone_number,
                category_phone_number,
                fax_number,
                about_hospital,
                association,
                patient_portal,
                hospitalPictures,
                ifu_number,
                rccm_number,
                licence,
                addressInfo,
                pathologyInfo,
                pathologyInfo1,
                bankInfo,
                mobilePay,
                country_code
            } = req.body;
            console.log("req.body;", req.body);
            const isExist = await PortalUser.findOne({ email: email, _id: { $ne: hospitalAdminId }, isDeleted: false });
            if (isExist) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Email Already Exist",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
            let portal_user_id = ''
            if (hospitalAdminId) {

                // console.log("hospitalAdminId",hospitalAdminId);
                portal_user_id = hospitalAdminId
                var PortalUserDetails = await PortalUser.findOneAndUpdate({ _id: { $eq: hospitalAdminId } }, {
                    $set: { email, country_code, main_phone_number, profile_picture, full_name: `${first_name} ${middle_name} ${last_name}` }
                }).exec();

                // Update profile_picture and full_name in PortalUser collection
                // await PortalUser.findOneAndUpdate({ _id: { $eq: hospitalAdminId } }, {
                //     $set: { profile_picture, full_name: `${first_name} ${middle_name} ${last_name}` }
                // }).exec();

            }

            var locationData
            const findLocation = await LocationInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospitalAdminId) });

            if (findLocation) {
                locationData = await LocationInfo.findOneAndUpdate(
                    { for_portal_user: mongoose.Types.ObjectId(hospitalAdminId) },
                    {
                        $set: {
                            loc: addressInfo.loc == '' ? null : addressInfo.loc,
                            address: addressInfo.address == '' ? null : addressInfo.address,
                            neighborhood: addressInfo.neighborhood == '' ? null : addressInfo.neighborhood,
                            country: addressInfo.country == '' ? null : addressInfo.country,
                            region: addressInfo.region == '' ? null : addressInfo.region,
                            province: addressInfo.province == '' ? null : addressInfo.province,
                            department: addressInfo.department == '' ? null : addressInfo.department,
                            city: addressInfo.city == '' ? null : addressInfo.city,
                            village: addressInfo.village == '' ? null : addressInfo.village,
                            pincode: addressInfo.pincode == '' ? null : addressInfo.pincode
                        }
                    },
                    { new: true }
                );
            } else {
                const locationInfo = new LocationInfo({

                    loc: addressInfo.loc == '' ? null : addressInfo.loc,
                    address: addressInfo.address == '' ? null : addressInfo.address,
                    neighborhood: addressInfo.neighborhood == '' ? null : addressInfo.neighborhood,
                    country: addressInfo.country == '' ? null : addressInfo.country,
                    region: addressInfo.region == '' ? null : addressInfo.region,
                    province: addressInfo.province == '' ? null : addressInfo.province,
                    department: addressInfo.department == '' ? null : addressInfo.department,
                    city: addressInfo.city == '' ? null : addressInfo.city,
                    village: addressInfo.village == '' ? null : addressInfo.village,
                    pincode: addressInfo.pincode == '' ? null : addressInfo.pincode,

                    for_portal_user: hospitalAdminId
                });
                locationData = await locationInfo.save();
            }

            //  const findPathology = await PathologyTestInfo.findOne({ for_portal_user: hospitalAdminId });
            // var pathologyTestData
            // if (findPathology) {
            //     pathologyTestData = await PathologyTestInfo.findOneAndUpdate(
            //         { for_portal_user: hospitalAdminId },
            //         {
            //             $set: {
            //                 ...pathologyInfo1
            //             }
            //         },
            //         { new: true }
            //     );
            //     console.log("pathologyTestData",pathologyTestData)
            // } else {
            //     const pathologyTestInfo = new PathologyTestInfo({
            //         ...pathologyInfo1,
            //         for_portal_user: hospitalAdminId
            //     });
            //     pathologyTestData = await pathologyTestInfo.save();

            // } 

            var pathologyTestData
            for (const test of pathologyInfo) {
                try {
                    const existingTest = await PathologyTestInfoNew.findOne({
                        for_portal_user: hospitalAdminId,
                        typeOfTest: test.typeOfTest,
                        nameOfTest: test.nameOfTest
                    });

                    if (existingTest) {
                        console.log("alreadyExisttt_______");
                        //throw new Error(`Test ${test.nameOfTest} already_exists_for ${hospitalAdminId}`);
                    } else {
                        console.log("inside_elsee_____");
                        if (test.isExist === false) {
                            pathologyTestData = await PathologyTestInfoNew.create({
                                for_portal_user: hospitalAdminId,
                                typeOfTest: test.typeOfTest,
                                nameOfTest: test.nameOfTest,
                                isExist: true
                            });
                        }

                    }
                } catch (error) {
                    console.error('Erroroccurreddddd:', error);
                    // Handle the error as needed
                }
            }

            const findBankInfo = await BankDetailInfo.findOne({ for_portal_user: hospitalAdminId });
            var bankData
            if (findBankInfo) {
                bankData = await BankDetailInfo.findOneAndUpdate(
                    { for_portal_user: hospitalAdminId },
                    {
                        $set: {
                            ...bankInfo
                        }
                    },
                    { new: true }
                );
            } else {
                const bankDetailInfo = new BankDetailInfo({
                    ...bankInfo,
                    for_portal_user: hospitalAdminId
                });
                bankData = await bankDetailInfo.save();
            }

            const findMobilePay = await MobilePayInfo.findOne({ for_portal_user: hospitalAdminId });
            var mobilePayData = {
                _id: null
            }
            if (req.body.mobilePay.length > 0) {
                if (findMobilePay) {
                    mobilePayData = await MobilePayInfo.findOneAndUpdate(
                        { for_portal_user: hospitalAdminId },
                        {
                            $set: {
                                mobilePay
                            }
                        },
                        { new: true }
                    );
                } else {
                    const mobilePayInfoInfo = new MobilePayInfo({
                        mobilePay,
                        for_portal_user: hospitalAdminId
                    });
                    mobilePayData = await mobilePayInfoInfo.save();
                }
            }

            const hospitalAdminData = await HospitalAdminInfo.findOneAndUpdate(
                { for_portal_user: hospitalAdminId },
                {
                    $set: {
                        profile_picture,
                        full_name: first_name + ' ' + middle_name + ' ' + last_name,
                        first_name,
                        middle_name,
                        last_name,
                        hospital_name,
                        type_of_health_center,
                        category_of_health_center,
                        main_phone_number,
                        mobile_phone_number,
                        category_phone_number,
                        fax_number,
                        about_hospital,
                        association,
                        patient_portal,
                        hospitalPictures,
                        ifu_number,
                        rccm_number,
                        license: licence,
                        in_location: locationData._id,
                        //in_pathology_test: pathologyTestData._id,
                        in_bank: bankData._id,
                        in_mobile_pay: mobilePayData._id,
                        for_portal_user: hospitalAdminId
                    }
                },
                { new: true }
            );

            const locationinfos = await LocationInfo.find({ for_portal_user: mongoose.Types.ObjectId(hospitalAdminId) });

            const hospitalAdminInfo = {
                ...hospitalAdminData.toObject(), // Convert to plain JavaScript object
                locationinfos: locationinfos.map(location => location.toObject()),
            };

            if (hospitalAdminInfo?.locationinfos.length > 0) {
                try {
                    var locationids = {
                        country_id: locationinfos[0]?.country,
                        region_id: locationinfos[0]?.region,
                        province_id: locationinfos[0]?.province,
                        village_id: locationinfos[0]?.village,
                        city_id: locationinfos[0]?.city,
                        department_id: locationinfos[0]?.department,
                    };

                    const locationdata = await httpService.postStaging(
                        "common-api/get-location-name",
                        { locationids: locationids },
                        {},
                        "superadminServiceUrl"
                    );
                    if (locationdata.status) {
                        hospitalAdminInfo.locationinfos[0].country = {
                            countryname: locationdata?.body?.country_name,
                            country_iso_code: locationdata?.body?.country_iso_code,
                        };
                        hospitalAdminInfo.locationinfos[0].region = locationdata?.body?.region_name;
                        hospitalAdminInfo.locationinfos[0].province = locationdata?.body?.province_name;
                        hospitalAdminInfo.locationinfos[0].village = locationdata?.body?.village_name;
                        hospitalAdminInfo.locationinfos[0].city = locationdata?.body?.city_name;
                        hospitalAdminInfo.locationinfos[0].department = locationdata?.body?.department_name;
                    }
                } catch (err) {
                    console.log(err, "erraaaa");
                }
            }

            if (hospitalAdminInfo?.profile_picture != null) {
                let signedUrl = await getDocument(hospitalAdminInfo?.profile_picture);
                hospitalAdminInfo.profile_picture = signedUrl;
            } else {
                hospitalAdminInfo.profile_picture = "";
            }

            sendResponse(req, res, 200, {
                status: true,
                body: { hospitalAdminInfo, PortalUserDetails },
                message: "successfully created hospital profile",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to create hospital admin",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getHospitalDetails(req, res) {
        try {
            const { hospital_portal_id } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const portalDetails = await PortalUser.findOne({ _id: hospital_portal_id })
            // console.log(portalDetails, "portalDetailsss_____");
            const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: hospital_portal_id })
            const lab_tests = await PathologyTestInfo.find({ for_portal_user: hospital_portal_id })
            const userDetails = await HospitalAdminInfo.findOne({ for_portal_user: portalDetails._id })
                .populate({
                    path: "in_bank"
                })
                .populate({
                    path: "in_mobile_pay"
                })
                .populate({
                    path: "in_pathology_test"
                })
                .populate({
                    path: "in_location"
                })
                .populate({
                    path: "type_of_health_center"
                })


            const licensePicKey = userDetails.license.image;
            const licensePictureArray = [licensePicKey]
            if (licensePicKey != null) {
                const resData = await httpService.postStaging('hospital/get-signed-url', { url: licensePictureArray }, headers, 'hospitalServiceUrl');
                userDetails.license.image = resData.data[0]
            } else {
                userDetails.license.image = ""
            }

            const profilePicKey = userDetails.profile_picture;
            // console.log("profilePicKey", profilePicKey);
            const profilePictureArray = [profilePicKey]
            if (profilePicKey != null) {
                const resData = await httpService.postStaging('hospital/get-signed-url', { url: profilePictureArray }, headers, 'hospitalServiceUrl');
                userDetails.profile_picture = resData.data[0]
            } else {
                userDetails.profile_picture = ""
            }

            const hospitalPictures = userDetails.hospitalPictures;
            if (hospitalPictures.length > 0) {
                // console.log(hospitalPictures, "hospitalPictures");
                const resData = await httpService.postStaging('hospital/get-signed-url', { url: hospitalPictures }, headers, 'hospitalServiceUrl');

                userDetails.hospitalPictures = resData.data
            } else {
                userDetails.hospitalPictures = []
            }



            sendResponse(req, res, 200, {
                status: true,
                body: {
                    portalDetails,
                    userDetails,
                    pathology_tests,
                    lab_tests
                },
                message: "successfully fetched hospital details",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get hospital details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deletePathologyTest(req, res) {
        try {
            const { for_portal_user, typeOfTest, nameOfTest } = req.body;
            // console.log(req.body, "bodyyyy_______");
            const result = await PathologyTestInfoNew.findOneAndDelete({ for_portal_user, typeOfTest, nameOfTest });

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    data: result
                },
                message: "Test Deleted successfully",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to Delete test",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async listHospitalAdminUser(req, res) {
        try {
            const { page, limit, name, email } = req.query
            const result = await HospitalAdminInfo.find({
                $or: [
                    {
                        name: { $regex: name || '', $options: "i" },
                    }
                ]
            })
                .populate({
                    path: "for_portal_user",
                    // match: { email: { $regex: email || '', $options: "i" } },
                    select: { email: 1 }
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await HospitalAdminInfo.countDocuments({
                $or: [
                    {
                        name: { $regex: name || '', $options: "i" },
                    }
                ]
            });
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                    totalCount: result.length
                },
                message: "successfully fetched hospital admin user",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to list hospital admin user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async approveOrRejectHospital(req, res) {
        const { action, id, approved_or_rejected_by } = req.body
        let status;
        let statusAction;
        let date = null
        if (action === "APPROVED") {
            status = 'Approved'
            statusAction = "APPROVED"
            const cdate = new Date();
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1}-${cdate.getDate()}`
        } else {
            status = 'Rejected'
            statusAction = "DECLINED"
            const cdate = new Date();
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1}-${cdate.getDate()}`
        }

        try {
            const updatedAdminData = await HospitalAdminInfo.findOneAndUpdate(
                { for_portal_user: id },
                {
                    $set: {
                        verify_status: statusAction,
                        approved_at: date,
                        approved_or_rejected_by
                    },
                },
                { upsert: false, new: true }
            ).exec();

            sendResponse(req, res, 200, {
                status: true,
                body: updatedAdminData,
                message: `${status} hospital`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: `failed to ${status} hospital request`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async viewHospitalAdminDetails(req, res) {
        try {
            const { hospital_admin_id } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const result = await HospitalAdminInfo.find({ _id: hospital_admin_id })
                .populate({
                    path: "for_portal_user",
                    select: { email: 1, country_code: 1, mobile: 1 },
                })
                .populate({
                    path: 'in_bank'
                })
                .populate({
                    path: 'in_mobile_pay'
                })
                .populate({
                    path: 'in_location'
                })
                .populate({
                    path: 'type_of_health_center'
                })

            // let data = result[0];
            let data = { ...result[0]?._doc, subscriptionPlans: [] };

            // console.log(data, 'data');

            let hospitalPicture = []
            for (const picture of data.hospitalPictures) {
                let image = await getDocument(picture)
                hospitalPicture.push(image)
            }

            if (data?.profile_picture != null) {
                const profile = await getDocument(data.profile_picture)
                data.profile_picture = profile
            } else {
                data.profile_picture = ""
            }

            if (result[0]?.license.image != null) {
                const licence_profile = await getDocument(result[0].license.image)
                data.license.image = licence_profile

            } else {

            }

            delete data.hospitalPictures
            data.hospitalPictures = hospitalPicture


            const subscriptionPlans = await SubscriptionPurchaseStatus.find({
                for_user: data?.for_portal_user
                    ?._id
            });

            if (subscriptionPlans) {
                data.subscriptionPlans = subscriptionPlans
            } else {
                data.subscriptionPlans = []
            }


            sendResponse(req, res, 200, {
                status: true,
                body: data,
                message: `Hospital admin details`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, 'error');
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to fetched hospital admin details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body
            let userData = await PortalUser.findOne({ email });
            if (!userData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "user not found",
                    errorCode: null,
                });
            }
            let resetToken = crypto.randomBytes(32).toString("hex");
            const hashResetToken = await generateTenSaltHash(resetToken);

            let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({ user_id: userData._id });
            if (ForgotPasswordTokenData) {
                await ForgotPasswordTokenData.deleteOne()
            }

            let ForgotPasswordData = new ForgotPasswordToken({
                user_id: userData._id,
                token: hashResetToken,
            });
            let savedForgotPasswordData = await ForgotPasswordData.save();

            // let html = htmlForgetPassword(resetToken, userData._id)
            const content = forgotPasswordEmail(email.toLowerCase(), resetToken, userData._id)
            let sendEmailStatus = sendEmail(content);
            if (sendEmailStatus) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        user_id: userData._id,
                        resetToken
                    },
                    message: "Forgot password reset link sent to your email",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 500, {
                    status: false,
                    message: "Internal server error, can't sent email",
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async changePassword(req, res) {
        const { id, old_password, new_password } = req.body;
        if (old_password === new_password) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "new password shouldn't be same as old password",
                errorCode: "PASSWORD_MATCHED",
            });
        }
        try {
            const portalUserData = await PortalUser.findOne({ _id: id, }).lean();
            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }
            const isPasswordOldMatch = await checkPassword(old_password, portalUserData);
            if (!isPasswordOldMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Incorrect Old Password.",
                    errorCode: null,
                });
            }
            const passwordHash = await hashPassword(new_password);
            const isPasswordMatch = await checkPassword(old_password, portalUserData);
            if (!isPasswordMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "This is Previous password. Enter New Password.",
                    errorCode: "INCORRECT_PASSWORD",
                });
            }
            const result = await PortalUser.findOneAndUpdate({ _id: id }, {
                $set: {
                    password: passwordHash
                }
            }, { new: true }).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: { id: result._id },
                message: "Successfully changed password.",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async uploadDocument(req, res) {
        try {
            const { userId, docType, multiple } = req.body;
            let result = null;
            if (multiple == "true") {
                let tempResult = [];
                req.files.docName.forEach(doc => {
                    let s3result = uploadFile(doc.data, {
                        Bucket: "healthcare-crm-stage-docs",
                        Key: `hospital/${userId}/${docType}/${doc.name}`,
                    });
                    tempResult.push(s3result);
                });
                result = await Promise.all(tempResult);
            } else {
                result = await uploadFile(req.files.docName.data, {
                    Bucket: "healthcare-crm-stage-docs",
                    Key: `hospital/${userId}/${docType}/${req.files.docName.name}`,
                });
            }
            sendResponse(req, res, 200, {
                status: true,
                data: multiple == "true" ? result : [result],
                message: `file uploaded successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to upload file`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getDocument(req, res) {
        try {
            const { url } = req.body;
            const result = []
            for (const s_url of url) {
                const resultData = await getFile({
                    Bucket: "healthcare-crm-stage-docs",
                    Key: s_url,
                    Expires: 60 * 5,
                });
                result.push(resultData)
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `file fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get file url`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllHospitalListForSuperAdmin(req, res) {
        try {
            const { page, limit, status, searchKey } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                // console.log("IFFFFFF");
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            var filter = {
                'for_portal_user.role': 'HOSPITAL_ADMIN',
                verify_status: status,
                'for_portal_user.isDeleted': false
            };
            // if(searchKey) {
            //     filter['staff_name'] = { $regex: searchKey || "", $options: "i" }
            // }
            if (searchKey != '') {
                filter.hospital_name = { $regex: searchKey || "", $options: "i" }
            }
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "in_location",
                        foreignField: "_id",
                        as: "in_location",
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $project: {
                        hospital_name: 1,
                        ifu_number: 1,
                        license: 1,
                        rccm_number: 1,
                        fax_number: 1,
                        main_phone_number: 1,
                        location: '$in_location.address',
                        for_portal_user: {
                            _id: "$for_portal_user._id",
                            email: "$for_portal_user.email",
                            country_code: "$for_portal_user.country_code",
                            phone_number: "$for_portal_user.mobile",
                            lock_user: "$for_portal_user.lock_user",
                            createdAt: "$for_portal_user.createdAt",
                            isActive: "$for_portal_user.isActive",
                            fcmToken: "$for_portal_user.fcmToken",
                            notification: "$for_portal_user.notification"
                        },
                        updatedAt: 1
                    }
                },
            ];
            // console.log("sortingarray----", sortingarray);
            const totalCount = await HospitalAdminInfo.aggregate(aggregate);
            aggregate.push({
                $sort: sortingarray
            })

            if (limit != 0) {
                aggregate.push(
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await HospitalAdminInfo.aggregate(aggregate);
            // const result = await HospitalAdminInfo.find({verify_status: "PENDING"});

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: totalCount.length
                },
                message: `hospital fetched successfully`,
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

    async getAllHospitalListUnderDoctor(req, res) {
        try {
            const { for_hospitalIds } = req.query
            const result = await HospitalAdminInfo.find({ for_portal_user: { $in: for_hospitalIds } }, { for_portal_user: 1, hospital_name: 1 });

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital list fetched successfully`,
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


    //Specialty By Super-admin
    async addSpecialty(req, res) {
        try {
            const { specialityArray, added_by } = req.body
            const list = specialityArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const namesToFind = list.map((item) => item.specilization);
            const foundItems = await Specialty.find({
                specilization: { $in: namesToFind },
                delete_status: false
            });
            const CheckData = foundItems.map((item) => item.specilization);
            if (foundItems.length == 0) {
                const savedSpecialty = await Specialty.insertMany(list)
                sendResponse(req, res, 200, {
                    status: true,
                    body: savedSpecialty,
                    message: "Successfully add specialty",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,

                    message: `${CheckData} is already exist`,
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log("eeee", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add specialty",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allSpecialty(req, res) {
        try {
            const { limit, page, searchText } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { delete_status: false }
            if (searchText != "") {
                filter = {
                    delete_status: false,
                    specilization: { $regex: searchText || '', $options: "i" }
                }
            }
            const specialityList = await Specialty.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await Specialty.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: specialityList,
                },
                message: "Successfully get specialty list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get specialty list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async allSpecialtyListforexport(req, res) {
        const { searchText, limit, page } = req.query
        var filter
        if (searchText == "") {
            filter = {
                delete_status: false
            }
        } else {
            filter = {
                delete_status: false,
                specialization: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await Specialty.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await Specialty.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        specilization: "$specilization"
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
                message: `Speciality added successfully`,
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

    // async specialtyDetails(req, res) {
    //     try {
    //         const { specialtyId } = req.query
    //         const specialtyDetails = await Specialty.findOne({ _id: specialtyId })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: specialtyDetails,
    //             message: "Successfully get specialty details",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "failed to get specialty details",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async updateSpecialty(req, res) {
        try {
            const {
                specialityId,
                specilization,
                active_status,
                delete_status
            } = req.body
            const updateSpeciality = await Specialty.updateOne(
                { _id: specialityId },
                {
                    $set: {
                        specilization,
                        active_status,
                        delete_status
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updateSpeciality,
                message: "Successfully updated specialty",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update specialty`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnSpecialty(req, res) {
        try {
            const { specialityId, action_name, action_value } = req.body
            var message = ''

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            if (action_name == "active") {
                var result = await Specialty.updateOne(
                    { _id: specialityId },
                    filter,
                    { new: true }
                ).exec();

                message = action_value == true ? 'Successfully Active Speciality' : 'Successfully In-active Speciality'
            }

            if (action_name == "delete") {
                if (specialityId == '') {
                    await Specialty.updateMany(
                        { delete_status: { $eq: false } },
                        {
                            $set: { delete_status: true }
                        },
                        { new: true }
                    )
                }
                else {
                    await Specialty.updateMany(
                        { _id: { $in: specialityId } },
                        {
                            $set: { delete_status: true }
                        },
                        { new: true }
                    )
                }
                message = 'Successfully Deleted Speciality'
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: message,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async uploadCSVForSpecialty(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);

            const isValidFile = validateColumnWithExcel(SpecialtyColumns, data[0])
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
            const existingSpeciality = await Specialty.find({ delete_status: false }, 'specilization');
            const existingSpecialityNames = existingSpeciality.map(specilization => specilization.specilization);
            const inputArray = []
            const duplicateSpeciality = [];

            for (const singleData of data) {
                const trimmedSpeciality = singleData.specialization.trim();
                if (existingSpecialityNames.includes(trimmedSpeciality)) {
                    duplicateSpeciality.push(trimmedSpeciality);
                } else {
                    inputArray.push({
                        specilization: singleData.specialization,
                        added_by: req.body.added_by
                    })
                }

            }
            if (duplicateSpeciality.length > 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: `Speciality already exist: ${duplicateSpeciality.join(', ')}`,
                    errorCode: null,
                });
            }
            if (inputArray.length > 0) {
                const result = await Specialty.insertMany(inputArray);
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All specialty records added successfully",
                    errorCode: null,
                });
            } else {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "No new specialty added",
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
    async exportSpecialty(req, res) {
        try {
            var csv
            const result = await Specialty.find({});
            const newPath = `./downloadCSV/specialtyExport.csv`
            csv = result.map((row) => {
                return `"${row.specilization}","${row.active_status === true ? 1 : 0}"`
            })
            const columns = Object.values(SpecialtyColumns).join(",")
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

    //Hospital Department
    async addDepartment(req, res) {
        try {
            var { departmentArray, added_by } = req.body;

            const duplicateDepartments = await Department.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { department: { $in: departmentArray.map(data => data.department) } }
                ]
            });
            if (duplicateDepartments.length > 0) {
                departmentArray = departmentArray.filter(department => {
                    return !duplicateDepartments.some(d =>
                        d.department === department.department &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }
            const list = departmentArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const savedDepartment = await Department.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: savedDepartment,
                message: "Successfully add department",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add department",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allDepartment(req, res) {
        try {
            const { limit, page, added_by, searchText } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { delete_status: false, added_by }
            if (searchText != "") {
                filter = {
                    delete_status: false,
                    added_by,
                    department: { $regex: searchText || '', $options: "i" }
                }
            }
            const departmentList = await Department.find(filter)
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Department.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: departmentList,
                },
                message: "Successfully get department list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get department list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async departmentDetails(req, res) {
        try {
            const { departmentId } = req.query
            const departmentDetails = await Department.findOne({ _id: departmentId })
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
            sendResponse(req, res, 200, {
                status: true,
                body: departmentDetails,
                message: "Successfully get department details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get department details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateDepartment(req, res) {
        try {
            const {
                departmentId,
                department,
                active_status,
                delete_status,
                addedBy
            } = req.body

            const checkData = await Department.find({
                $and: [                    
                    { delete_status: false },
                    { department : department },{_id:{$ne : departmentId}},
                    { added_by : mongoose.Types.ObjectId(addedBy)} 
                ]
            });

            if(checkData.length > 0){
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Department already exits.",
                    errorCode: null,
                });
            }

            const updateDepartment = await Department.updateOne(
                { _id: departmentId },
                {
                    $set: {
                        department,
                        active_status,
                        delete_status
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updateDepartment,
                message: "Successfully updated department",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update department`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnDepartment(req, res) {
        try {
            const { departmentId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            const updatedDepartment = await Department.updateOne(
                { _id: departmentId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updatedDepartment,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Hospital Service
    async addService(req, res) {
        try {
            var { serviceArray, added_by } = req.body

            const duplicateService = await Service.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { service: { $in: serviceArray.map(data => data.service) } }
                ]
            });
           
            if (duplicateService.length > 0) {
                serviceArray = serviceArray.filter(service => {
                    return !duplicateService.some(d =>
                        d.for_department.toString() === service.for_department &&
                        d.service === service.service &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }

            const list = serviceArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const savedService = await Service.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: savedService,
                message: "Successfully add service",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add service",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allService(req, res) {
        try {
            const { limit, page, searchText, added_by, for_department } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { delete_status: false, added_by, for_department }
            if (searchText != "") {
                filter = {
                    delete_status: false,
                    added_by,
                    for_department,
                    service: { $regex: searchText || '', $options: "i" }
                }
            }
            if (for_department == "") {
                filter = {
                    delete_status: false,
                    added_by,
                    service: { $regex: searchText || '', $options: "i" }
                }
            }
            const serviceList = await Service.find(filter)
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .populate({
                    path: "for_department",
                    select: {
                        department: 1
                    }
                })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Service.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: serviceList,
                },
                message: "Successfully get service list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get service list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async serviceDetails(req, res) {
        try {
            const { serviceId } = req.query
            const serviceDetails = await Service.findOne({ _id: serviceId })
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .populate({
                    path: "for_department",
                    select: {
                        department: 1
                    }
                })
            sendResponse(req, res, 200, {
                status: true,
                body: serviceDetails,
                message: "Successfully get service details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get service details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateService(req, res) {
        try {
            const {
                serviceId,
                service,
                for_department,
                active_status,
                delete_status,
                added_by
            } = req.body
            const checkData = await Service.find({
                $and: [                    
                    { delete_status: false },
                    { service : service },{_id:{$ne : serviceId}},
                    { added_by : mongoose.Types.ObjectId(added_by)},
                    {for_department: mongoose.Types.ObjectId(for_department)},

                ]
            });
            if(checkData.length > 0){
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Service already exits.",
                    errorCode: null,
                });
            }

            const updateService = await Service.updateOne(
                { _id: serviceId },
                {
                    $set: {
                        service,
                        for_department,
                        active_status,
                        delete_status
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updateService,
                message: "Successfully updated service",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update service`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnService(req, res) {
        try {
            const { serviceId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            const updatedService = await Service.updateOne(
                { _id: serviceId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updatedService,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Hospital Unit
    async addUnit(req, res) {
        try {
            var { unitArray, added_by } = req.body


            const duplicateUnits = await Unit.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { unit: { $in: unitArray.map(data => data.unit) } }
                ]
            });
            if (duplicateUnits.length > 0) {
                unitArray = unitArray.filter(unit => {
                    return !duplicateUnits.some(d =>
                        d.for_department.toString() === unit.for_department &&
                        d.for_service.toString() === unit.for_service &&
                        d.unit === unit.unit &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }
            const list = unitArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const savedUnit = await Unit.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: savedUnit,
                message: "Successfully add unit",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add unit",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allUnit(req, res) {
        try {
            const { limit, page, searchText, added_by, for_service } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { delete_status: false, added_by, for_service }
            if (searchText != "") {
                filter = {
                    delete_status: false,
                    added_by,
                    for_service,
                    unit: { $regex: searchText || '', $options: "i" }
                }
            }
            if (for_service == "") {
                filter = {
                    delete_status: false,
                    added_by,
                    unit: { $regex: searchText || '', $options: "i" }
                }
            }
            const unitList = await Unit.find(filter)
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .populate({
                    path: "for_service",
                    select: {
                        service: 1,
                        for_department: 1
                    },
                    populate: {
                        path: "for_department",
                        select: {
                            department: 1
                        },
                    }
                })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Unit.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: unitList,
                },
                message: "Successfully get unit list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get unit list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async unitDetails(req, res) {
        try {
            const { unitId } = req.query
            const unitDetails = await Unit.findOne({ _id: unitId })
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .populate({
                    path: "for_service",
                    select: {
                        service: 1,
                        for_department: 1
                    },
                    populate: {
                        path: "for_department",
                        select: {
                            department: 1
                        },
                    }
                })
                .populate({
                    path: "for_department",
                })
            sendResponse(req, res, 200, {
                status: true,
                body: unitDetails,
                message: "Successfully get unit details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get unit details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateUnit(req, res) {
        try {
            const {
                unitId,
                unit,
                for_service,
                for_department,
                active_status,
                delete_status,
                added_by
            } = req.body
            console.log("checkData________",req.body);

            const checkData = await Service.find({
                $and: [                    
                    { delete_status: false },
                    { unit : unit },{_id:{$ne : unitId}},
                    { added_by : mongoose.Types.ObjectId(added_by)},
                    {for_department: mongoose.Types.ObjectId(for_department)},
                    {for_service: mongoose.Types.ObjectId(for_service)},

                ]
            });
            console.log("checkData________",checkData);
            if(checkData.length > 0){
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Unit already exits.",
                    errorCode: null,
                });
            }

            const updateUnit = await Unit.updateOne(
                { _id: unitId },
                {
                    $set: {
                        unit,
                        for_service,
                        for_department,
                        active_status,
                        delete_status
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updateUnit,
                message: "Successfully updated unit",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update unit`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnUnit(req, res) {
        try {
            const { unitId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            const updatedUnit = await Unit.updateOne(
                { _id: unitId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updatedUnit,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Get Department, Service, Unit
    async listOfDepartmentServiceUnit(req, res) {
        try {
            const { inputType, inputValue, added_by } = req.body

            var departmentDetails
            var serviceDetails
            var unitDetails
            var serviceIdArray = []
            var departmentIdArray = []

            if (inputType == "department") {
                departmentDetails = await Department.find({ _id: { $in: inputValue }, added_by }, { _id: 1, department: 1 })
                serviceDetails = await Service.find({ for_department: { $in: inputValue }, added_by }, { _id: 1, service: 1, for_department: 1 })
                for (let index = 0; index < serviceDetails.length; index++) {
                    serviceIdArray.push(serviceDetails[index]._id)
                }
                unitDetails = await Unit.find({ for_service: { $in: serviceIdArray }, added_by }, { _id: 1, unit: 1, for_service: 1 })
            }

            if (inputType == "service") {
                serviceDetails = await Service.find({ _id: { $in: inputValue }, added_by }, { _id: 1, service: 1, for_department: 1 })
                for (let index = 0; index < serviceDetails.length; index++) {
                    serviceIdArray.push(serviceDetails[index]._id)
                    departmentIdArray.push(serviceDetails[index].for_department)
                }
                departmentDetails = await Department.find({ _id: { $in: departmentIdArray }, added_by }, { _id: 1, department: 1 })
                unitDetails = await Unit.find({ for_service: { $in: serviceIdArray }, added_by }, { _id: 1, unit: 1, for_service: 1 })
            }

            if (inputType == "unit") {
                unitDetails = await Unit.find({ _id: { $in: inputValue }, added_by }, { _id: 1, unit: 1, for_service: 1 })
                for (let index = 0; index < unitDetails.length; index++) {
                    serviceIdArray.push(unitDetails[index].for_service)
                }
                serviceDetails = await Service.find({ _id: { $in: serviceIdArray }, added_by }, { _id: 1, service: 1, for_department: 1 })
                for (let index = 0; index < serviceDetails.length; index++) {
                    departmentIdArray.push(serviceDetails[index].for_department)
                }
                departmentDetails = await Department.find({ _id: { $in: departmentIdArray }, added_by }, { _id: 1, department: 1 })
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    departmentDetails,
                    serviceDetails,
                    unitDetails
                },
                message: "Successfully get list",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Hospital Expertise
    async addExpertise(req, res) {
        try {
            var { expertiseArray, added_by } = req.body

            const duplicateExpertise = await Expertise.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { expertise: { $in: expertiseArray.map(data => data.expertise) } }
                ]
            });
            if (duplicateExpertise.length > 0) {
                expertiseArray = expertiseArray.filter(expertise => {
                    return !duplicateExpertise.some(d =>
                        d.expertise === expertise.expertise &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }

            const list = expertiseArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const savedExpertise = await Expertise.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: savedExpertise,
                message: "Successfully add expertise",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add expertise",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allExpertise(req, res) {
        try {
            const { limit, page, added_by, searchText } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { delete_status: false, added_by }
            if (searchText != "") {
                filter = {
                    delete_status: false,
                    added_by,
                    expertise: { $regex: searchText || '', $options: "i" }
                }
            }
            const expertiseList = await Expertise.find(filter)
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await Expertise.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: expertiseList,
                },
                message: "Successfully get expertise list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get expertise list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async expertiseDetails(req, res) {
        try {
            const { expertiseId } = req.query
            const expertiseDetails = await Expertise.findOne({ _id: expertiseId })
                .populate({
                    path: "added_by",
                    select: {
                        role: 1
                    }
                })
            sendResponse(req, res, 200, {
                status: true,
                body: expertiseDetails,
                message: "Successfully get expertise details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get expertise details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateExpertise(req, res) {
        try {
            const {
                expertiseId,
                expertise,
                active_status,
                delete_status,
                added_by
            } = req.body

            const checkData = await Expertise.find({
                $and: [                    
                    { delete_status: false },
                    { expertise : expertise },{_id:{$ne : expertiseId}},
                    { added_by : mongoose.Types.ObjectId(added_by)} 
                ]
            });

            if(checkData.length > 0){
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Expertise already exits.",
                    errorCode: null,
                });
            }

            const updateExpertise = await Expertise.updateOne(
                { _id: expertiseId },
                {
                    $set: {
                        expertise,
                        active_status,
                        delete_status
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updateExpertise,
                message: "Successfully updated expertise",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update expertise`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnExpertise(req, res) {
        try {
            const { expertiseId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            const updatedExpertise = await Expertise.updateOne(
                { _id: expertiseId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: updatedExpertise,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Reason For Appointment
    // async addAppointmentReason(req, res) {
    //     try {
    //         const { appointmentReasonArray, doctorId } = req.body
    //         const list = appointmentReasonArray.map((singleData) => ({
    //             ...singleData,
    //             added_by: doctorId
    //         }));
    //         const result = await ReasonForAppointment.insertMany(list)
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: "Successfully add appointment reason",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "failed to add appointment reason",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async addAppointmentReason(req, res) {
        try {
            const { appointmentReasonArray, doctorId, selectedlocation } = req.body;
            console.log(req.body, "SSbodyyyyyyy____yyyyyyy");

            const list = appointmentReasonArray.map((singleData) => ({
                ...singleData,
                added_by: doctorId,
                selectedlocation: selectedlocation
            }));

            for (let data of list) {
                const checkname = data.name;
                console.log(selectedlocation, "list_____________", checkname);

                let CheckData = await ReasonForAppointment.find({ selectedlocation: mongoose.Types.ObjectId(selectedlocation), is_deleted: false });
                console.log(checkname, "CheckData>>>>>>>>")

                for (let ele of CheckData) {
                    if (ele.name === checkname) {
                        console.log("ele.name>>>>>>>>>", ele.name)
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: `Appointment Reason ${checkname} already exists for the same location.`,
                            errorCode: null,
                        });
                    }
                }
            }

            const result = await ReasonForAppointment.insertMany(list)

            return sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully added appointment reason",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add appointment reason",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async bulkUploadAppointmentReason(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            const data = await processExcel(filePath);

            const isValidFile = validateColumnWithExcel(AppointmentReasonColumns, data[0])
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
            const inputArray = []
            for (const singleData of data) {
                inputArray.push({
                    name: singleData.ReasonName,
                    added_by: req.body.user_id,
                    selectedlocation: req.body.selectedlocation,
                })
            }

            for (let data of inputArray) {
                const checkname = data.name;
                // console.log( "list_____________", checkname);

                let CheckData = await ReasonForAppointment.find({ selectedlocation: mongoose.Types.ObjectId(req.body.selectedlocation), is_deleted: false });
                // console.log(checkname, "CheckData>>>>>>>>")

                for (let ele of CheckData) {
                    if (ele.name === checkname) {
                        // console.log("ele.name>>>>>>>>>",ele.name)
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: `Appointment Reason ${checkname} already exists for the same location in sheet.`,
                            errorCode: null,
                        });
                    }
                }
            }

            const result = await ReasonForAppointment.insertMany(inputArray);
            // const result = await ReasonForAppointment.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully add appointment reasons",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add appointment reasons",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async reasonForAppointmentList(req, res) {
        try {
            const { limit, page, searchText, doctorId, listFor, selectedlocation } = req.query;
            console.log(":__34546412req.query", req.query)
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            var filter = { added_by: mongoose.Types.ObjectId(doctorId), is_deleted: false };

            if (listFor === undefined) {
                filter = { ...filter, active: true };
            }

            if (searchText !== "") {
                filter.name = { $regex: searchText || '', $options: "i" };
            }
            // var filter1 = {};

            if (selectedlocation !== 'undefined' && selectedlocation !== '') {
                filter = {
                    ...filter,
                    selectedlocation: mongoose.Types.ObjectId(selectedlocation)
                }
            }
            let aggregate = [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "hospitallocations",
                        let: { selectedlocation: "$selectedlocation" },
                        pipeline: [
                            {
                                $unwind: "$hospital_or_clinic_location"
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            {
                                                $toObjectId: "$hospital_or_clinic_location.hospital_id"
                                            },
                                            "$$selectedlocation"
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "locationDetails"
                    }
                },
                {
                    $unwind: "$locationDetails"
                },
                {
                    $group: {
                        _id: "$_id", // Use the field that uniquely identifies each record
                        name: { $first: "$name" },
                        active: { $first: "$active" },
                        added_by: { $first: "$added_by" },
                        locationDetails: { $first: "$locationDetails" } // Choose the document you want to keep
                    }
                }

            ]

            const count = await ReasonForAppointment.aggregate(aggregate);
            aggregate.push({
                $sort: sortingarray
            })

            if (limit != '0') {
                aggregate.push(
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await ReasonForAppointment.aggregate(aggregate);

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count.length,
                    data: result,
                },
                message: "Successfully get reason for appointment list",
                errorCode: null,
            });

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get reason for appointment list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async reasonForAppointmentList(req, res) {
    //     try {
    //         const { limit, page, searchText, doctorId, listFor } = req.query;
    //         console.log(req.query, "check data of req");
    //         var sort = req.query.sort
    //         var sortingarray = {};
    //         if (sort != 'undefined' && sort != '' && sort != undefined) {
    //             var keynew = sort.split(":")[0];
    //             var value = sort.split(":")[1];
    //             sortingarray[keynew] = value;
    //         } else {
    //             sortingarray['createdAt'] = -1;
    //         }
    //         var filter = { added_by: mongoose.Types.ObjectId(doctorId), is_deleted: false }
    //         if (listFor === undefined) {
    //             filter = { ...filter, active: true }
    //         }

    //         if (searchText != "") {
    //             filter = {
    //                 is_deleted: false,
    //                 active: true,
    //                 name: { $regex: searchText || '', $options: "i" }
    //             }
    //         }
    //         const result = await ReasonForAppointment.find(filter)
    //             .sort(sortingarray)
    //             .skip((page - 1) * limit)
    //             .limit(limit * 1)
    //             .exec();

    //         const count = await ReasonForAppointment.countDocuments(filter);

    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: {
    //                 totalCount: count,
    //                 data: result,
    //             },
    //             message: "Successfully get reason for appointment list",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "failed to get reason for appointment list",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }



    async reasonForAppointmentDetails(req, res) {
        try {
            const { appointmentReasonId } = req.query
            console.log(req.query, "check query data");
            const result = await ReasonForAppointment.findOne({ _id: mongoose.Types.ObjectId(appointmentReasonId) })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully get reason for appointment details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get reason for appointment details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateReasonForAppointment(req, res) {
        try {
            const {
                appointmentReasonId,
                name,
                active,
                doctorId,
                selectedlocation
            } = req.body
            const result = await ReasonForAppointment.findOneAndUpdate(
                { _id: appointmentReasonId },
                {
                    $set: {
                        name,
                        active,
                        added_by: doctorId,
                        selectedlocation
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully updated reason for appointment",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update reason for appointment`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async actionOnReasonForAppointment(req, res) {
        try {
            const { appointmentReasonId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            const result = await ReasonForAppointment.findOneAndUpdate(
                { _id: appointmentReasonId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Questionnairee
    async addQuestionnaire(req, res) {
        try {
            const {
                controller,
                question,
                type,
                options,
                active,
                required,
                doctorId
            } = req.body
            const questionnaire = new Questionnaire({
                controller,
                question,
                type,
                options,
                active,
                required,
                added_by: doctorId
            })
            const result = await questionnaire.save()
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully add questionnaire",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add questionnaire",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async QuestionnaireList(req, res) {
        try {
            const { limit, page, searchText, doctorId } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = {
                is_deleted: false,
                added_by: { $eq: doctorId }
            }
            // if (searchText != "") {
            //     filter = {
            //         is_deleted: false,
            //         name: { $regex: searchText || '', $options: "i" }
            //     }
            // }
            const result = await Questionnaire.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
            const count = await Questionnaire.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: result,
                },
                message: "Successfully get questionnaire list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get questionnaire list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async QuestionnaireDetails(req, res) {
        try {
            const { questionnaireId } = req.query
            const result = await Questionnaire.findOne({ _id: questionnaireId })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully get questionnaire details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get questionnaire details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updateQuestionnaire(req, res) {
        try {
            const {
                questionnaireId,
                controller,
                question,
                type,
                options,
                active,
                required,
            } = req.body
            const result = await Questionnaire.findOneAndUpdate(
                { _id: questionnaireId },
                {
                    $set: {
                        controller,
                        question,
                        type,
                        options,
                        active,
                        required
                    }
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully updated questionnaire",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update questionnaire`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async actionOnQuestionnaire(req, res) {
        try {
            const { questionnaireId, action_name, action_value } = req.body

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value
            if (action_name == "required") filter['required'] = action_value

            const result = await Questionnaire.findOneAndUpdate(
                { _id: questionnaireId },
                filter,
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully action done",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Assessment
    async addAssessment(req, res) {
        try {
            const {
                assessments,
                appointmentId
            } = req.body
            var result
            const assessmentDetails = await Assessment.findOne({ appointmentId })
            if (assessmentDetails) {
                result = await Assessment.findOneAndUpdate(
                    { _id: assessmentDetails._id },
                    {
                        $set: {
                            assessments
                        }
                    },
                    { new: true }
                )
            } else {
                const assessment = new Assessment({
                    assessments,
                    appointmentId
                })
                result = await assessment.save()
            }
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully add assessment",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add assessment",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async assessmentList(req, res) {
        try {
            const {
                appointmentId
            } = req.query
            const result = await Assessment.findOne({ appointmentId })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "Successfully get assessment",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get assessment",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getAllHospital(req, res) {
        try {
            const { searchKey } = req.query;
            const filter = {
                'for_portal_user.isDeleted': false,
                'for_portal_user.lock_user': false,
                'for_portal_user.isActive': true,
            }
            if (searchKey) {
                filter['hospital_name'] = { $regex: searchKey || '', $options: "i" }
            }
            // const hospitalData = await HospitalAdminInfo.find(filter).select('name').populate({path:'for_portal_user'}).exec();
            const hospitalData = await HospitalAdminInfo.aggregate([
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $project: {
                        _id: 0,
                        portal_user_id: '$for_portal_user._id',
                        hospital_name: 1
                    }
                }
            ]);
            sendResponse(req, res, 200, {
                status: true,
                body: hospitalData,
                message: "Successfully fetched all hospital",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched all hospital`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getAllHospitalDetailsByID(req, res) {
        try {
            const allIds = req.query.hospitalIDs
            let ObjectIdArray = [];
            for (const id of allIds.split(",")) {
                ObjectIdArray.push(mongoose.Types.ObjectId(id))
            }
            const filter = {
                verify_status: "APPROVED",
                'for_portal_user_d.isDeleted': false,
                'for_portal_user_d.isActive': true,
                'for_portal_user_d.lock_user': false,
                for_portal_user: { $in: ObjectIdArray }
            }

            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user_d",
                    }
                },
                { $unwind: "$for_portal_user_d" },
                { $match: filter },
                {
                    $project: {
                        hospital_name: 1,
                        profile_picture: 1,
                    }
                },
            ];
            const result = await HospitalAdminInfo.aggregate(aggregate);
            const dataArray = []
            for (let data of result) {
                data['name'] = data.hospital_name
                if ('profile_picture' in data && data.profile_picture) {
                    data['profile_picture'] = await getDocument(data.profile_picture)
                }
                dataArray.push(data);
            }
            sendResponse(req, res, 200, {
                status: true,
                body: dataArray,
                message: "Successfully fetched all hospital",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to fetched all hospital`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async activeLockDeleteHospital(req, res) {
        try {
            const { action_name, action_value, hospital_portal_id } = req.body
            let key;
            key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
            if (key) {
                const portalData = await PortalUser.findOneAndUpdate(
                    { _id: { $eq: hospital_portal_id } },
                    {
                        $set: {
                            [key]: action_value
                        }
                    },
                    { new: true },
                )
                let actionMessage;
                if (action_name === "active" && action_value) {
                    actionMessage = "activated"
                } else if (action_name === "active" && !action_value) {
                    actionMessage = "deactivated"
                }
                if (action_name === "delete" && action_value) {
                    actionMessage = "deleted"
                }
                if (action_name === "lock" && action_value) {
                    actionMessage = "locked"
                } else if (action_name === "lock" && !action_value) {
                    actionMessage = "unlocked"
                }

                console.log("portalData-->>>", portalData)
                sendResponse(req, res, 200, {
                    status: true,
                    data: portalData,
                    message: `Hospital ${actionMessage} Successfully.`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 500, {
                    status: false,
                    data: null,
                    message: `Something went wrong`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `Something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async uploadDocumentForPortal(req, res) {
        try {
            const { portal_user_id, docType } = req.body;
            let result = null;
            if (Array.isArray(req.files.documents)) {
                let tempResult = [];
                req.files.documents.forEach(doc => {
                    let s3result = uploadFile(doc.data, {
                        Bucket: "healthcare-crm-stage-docs",
                        Key: `hospital/${portal_user_id}/${docType}/${doc.name}`,
                    });
                    tempResult.push(s3result);
                });
                result = await Promise.all(tempResult);
            } else {
                console.log("req.files.documents.data=====", req.files.documents.data);
                result = await uploadFile(req.files.documents.data, {
                    Bucket: "healthcare-crm-stage-docs",
                    Key: `hospital/${portal_user_id}/${docType}/${req.files.documents.name}`,
                    ACL: 'public-read'
                });
            }
            const uploadResult = Array.isArray(req.files.documents) ? result : [result]
            let dataArray = []
            for (const data of uploadResult) {
                dataArray.push({
                    name: data.Key.split('/')[data.Key.split('/').length - 1],
                    e_tag: data.ETag,
                    code: docType,
                    url: data.Key,
                    is_deleted: false,
                    for_portal_user: portal_user_id,
                });
            }
            const uploadDocResult = await DocumentInfo.insertMany(dataArray)
            const objectIDArray = []
            for (const doc of uploadDocResult) {
                objectIDArray.push(doc._id)
            }
            sendResponse(req, res, 200, {
                status: true,
                data: objectIDArray,
                message: `file uploaded successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to upload file`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async readHospitalLocations(req, res) {
        try {
            const { hospital_id } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }

            const location = await LocationInfo.findOne({ for_portal_user: { $eq: hospital_id } }).exec();
            const hospitalData = await HospitalAdminInfo.findOne({ for_portal_user: hospital_id })
            // console.log("hospitalData>>>>", hospitalData)
            // console.log("locationssssss_", location);
            let resData = {};
            let resLocationData = '';
            if (location !== null) {
                resData = await httpService.postStaging('superadmin/get-locations-name', { location }, headers, 'superadminServiceUrl');
                resLocationData = { ...resData, loc: location?.loc }
            }
            //get Name from superadmin for country, region, province, department, city

            sendResponse(req, res, 200, {
                status: true,
                data: { resLocationData, hospitalData },
                message: `hospital location fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, 'error1');
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `Something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async advanceHospitalFilter(req, res) {
        try {
            const {
                searchText,
                city,
                neighborhood,
                long,
                lat,
                province,
                department,
                currentTimeStamp,
                consultationFeeStart,
                consultationFeeEnd,
                consultationFee,
                appointmentType,
                rating,
                experience,
                Opne24Hour,
                hospitalType,
                doctorGender,
                spokenLanguage,
                healthcare-crmPartner,
                insuranceAccpted,
                openNow,
                onDutyHospital,
                isAvailableDate,
                page,
                limit
            } = req.body
            const headers = {
                'Authorization': req.headers['authorization']
            }

            var maxDistance = req.body.maxDistance
            // console.log(maxDistance, "maxDistance")
            if (maxDistance == undefined || maxDistance == 0) {
                maxDistance = 5
            }

            let formattedTimestamp = new Date();


            let timeZone = config.TIMEZONE; // Change this to the appropriate time zone
            //console.log(timeZone, "timeZoneeeeeee____");
            let current_timestamp1 = formattedTimestamp.toLocaleString('en-US', { timeZone: timeZone });
            let current_timestamp = new Date(current_timestamp1);
            //console.log(current_timestamp, "current_timestamppp_________");

            var day = current_timestamp.getDay()
            var hour = current_timestamp.getHours().toString()
            var minute = current_timestamp.getMinutes().toString()
            if (hour.toString().length == 1) {
                hour = "0" + hour;
            }
            if (minute.toString().length == 1) {
                minute = "0" + minute;
            }
            const hourAndMin = hour + minute

            if (day == 0) {

                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.sun.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.sun.start_time", hourAndMin] },
                                { $gt: ["$week_days.sun.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
            }
            if (day == 1) {

                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.mon.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.mon.start_time", hourAndMin] },
                                { $gt: ["$week_days.mon.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
            }
            if (day == 2) {
                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.tue.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.tue.start_time", hourAndMin] },
                                { $gt: ["$week_days.tue.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
            }
            if (day == 3) {
                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.wed.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.wed.start_time", hourAndMin] },
                                { $gt: ["$week_days.wed.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }


            }
            if (day == 4) {
                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.thu.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.thu.start_time", hourAndMin] },
                                { $gt: ["$week_days.thu.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
            }
            if (day == 5) {

                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.fri.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.fri.start_time", hourAndMin] },
                                { $gt: ["$week_days.fri.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
                //console.log(day,"day_________",day_filter);
            }
            if (day == 6) {
                var day_filter =
                {
                    $cond: {
                        if: { $ne: ["$week_days.sat.start_time", "0000"] }, // Check if date is not empty
                        then: {
                            $and: [
                                { $lte: ["$week_days.sat.start_time", hourAndMin] },
                                { $gt: ["$week_days.sat.end_time", hourAndMin] }
                            ]
                        },
                        else: false // Set isSlotWithinTimestamp to false for empty dates
                    }
                }
            }

            /*  if (day == 0) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.sun.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.sun.end_time", hourAndMin] }
                 ]
             }
             if (day == 1) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.mon.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.mon.end_time", hourAndMin] }
                 ]
             }
             if (day == 2) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.tue.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.tue.end_time", hourAndMin] }
                 ]
             }
             if (day == 3) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.wed.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.wed.end_time", hourAndMin] }
                 ]
             }
             if (day == 4) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.thu.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.thu.end_time", hourAndMin] }
                 ]
             }
             if (day == 5) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.fri.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.fri.end_time", hourAndMin] }
                 ]
             }
             if (day == 6) {
                 var day_filter = [
                     { $lte: ["$hospitalopeninghours.week_days.sat.start_time", hourAndMin] },
                     { $gt: ["$hospitalopeninghours.week_days.sat.end_time", hourAndMin] }
                 ]
             } */
            var searchText_filter = [{}]
            var city_filter = {}
            var neighborhood_filter = {}
            var province_filter = {}
            var department_filter = {}
            var geoNear_filter = {}
            var open24Hour_filter = {}
            var hospitalType_filter = {}
            var consultationFeeFilter_filter = {}
            var appointmentType_filter = {}
            var isAvailableDate_filter = {}
            var spokenLanguage_filter = {}
            var doctorGender_filter = {}
            var healthcare-crmPartner_filter = {}
            var insuranceAccpted_filter = {}
            var openNow_filter = {}
            var onDutyHospital_filter = {}

            if (long != "" && lat != "") {
                geoNear_filter = {
                    $geoNear:
                    {
                        near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
                        distanceField: "distance",
                        minDistance: 0, //0 KM
                        maxDistance: maxDistance * 1000,
                        includeLocs: "loc",
                        spherical: true,
                        distanceMultiplier: 0.001
                    }
                }
            } else {
                geoNear_filter = {
                    $geoNear:
                    {
                        near: { type: "Point", coordinates: [0, 0] },
                        distanceField: "distance",
                        // minDistance: 0, //0 KM
                        // maxDistance: 500, //5 KM         
                        includeLocs: "loc",
                        spherical: true,
                        distanceMultiplier: 0.001
                    }
                }
            }

            // if (long != "" && lat != "") {
            //     geoNear_filter = {
            //         $geoNear:
            //         {
            //             near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
            //             distanceField: "distance",
            //             // minDistance: 0, //0 KM
            //             // maxDistance: 500, //5 KM         
            //             includeLocs: "loc",
            //             spherical: true,
            //             distanceMultiplier: 0.001
            //         }
            //     }
            // } else {
            //     geoNear_filter = {
            //         $geoNear:
            //         {
            //             near: { type: "Point", coordinates: [0, 0] },
            //             distanceField: "distance",
            //             // minDistance: 0, //0 KM
            //             // maxDistance: 500, //5 KM         
            //             includeLocs: "loc",
            //             spherical: true,
            //             distanceMultiplier: 0.001
            //         }
            //     }
            // }

            if (searchText != "") {
                searchText_filter = [
                    { hospital_name: { $regex: searchText || '', $options: "i" } },
                    { pathologyTestsName: { $regex: searchText || '', $options: "i" } },
                    /* { hosptialMedicalActPerformed: { $regex: searchText || '', $options: "i" } },
                    { hospitalLabTestPerformed: { $regex: searchText || '', $options: "i" } },
                    { hospitalImagingPerformed: { $regex: searchText || '', $options: "i" } },
                    { hospitalVaccinationPerformed: { $regex: searchText || '', $options: "i" } },
                    { hospitalOtherTest: { $regex: searchText || '', $options: "i" } }, */
                ]
            }
            if (city != "") {
                city_filter = {
                    city: mongoose.Types.ObjectId(city)
                }
            }
            if (neighborhood != "") {
                neighborhood_filter = {
                    neighborhood: { $regex: neighborhood || '', $options: "i" }
                }
            }
            if (province != "") {
                province_filter = {
                    province: mongoose.Types.ObjectId(province)
                }
            }
            if (department != "") {
                department_filter = {
                    department: mongoose.Types.ObjectId(department),
                }
            }

            if (Opne24Hour) {
                open24Hour_filter = {
                    ['hospitaladmininfos.opening_hours_status']: Opne24Hour
                }
            }
            //console.log(hospitalType,"hospitalTypeeee___________");
            if (hospitalType.length > 0) {
                //console.log(hospitalType, "hospitalType___________");
                const hospitalTypeObjectID = hospitalType.map((val) => mongoose.Types.ObjectId(val))
                console.log(hospitalTypeObjectID, "hospitalTypeObjectIDDDD__");
                hospitalType_filter = {
                    ['hospitaladmininfos.type_of_health_center']: { $in: hospitalTypeObjectID }
                }
            }

            if (healthcare-crmPartner === "Yes") {
                healthcare-crmPartner_filter = {
                    ["hospital_portal_user.createdBy"]: { $regex: 'self' || '', $options: "i" }
                }
            }
            if (spokenLanguage) {
                //console.log(spokenLanguage,"spokenLanguageee____");
                spokenLanguage_filter = {
                    'doctors.spoken_language': {
                        $elemMatch: {
                            $in: [spokenLanguage]
                        }
                    }
                    // ['doctors.spoken_language']: spokenLanguage
                }
            }
            //console.log(spokenLanguage_filter,"spokenLanguage_filterrr_____)");
            if (consultationFeeStart >= 0 && consultationFeeEnd) {
                console.log(consultationFeeStart, "consultationFeeStarttt___", consultationFeeEnd);
                consultationFeeFilter_filter = {
                    ['feemanagements.online.basic_fee']: {
                        $gte: consultationFeeStart == 0 ? 1 : parseFloat(consultationFeeStart),
                        $lte: parseFloat(consultationFeeEnd)
                    }
                }
            }

            if (appointmentType.length > 0) {
                 appointmentType_filter ={}
                  appointmentType.forEach(field => {
                  
                    appointmentType_filter['doctors.appointment_accepted.'+field]=true;
                  });
            }
            if (doctorGender.length > 0) {
                if (doctorGender.length === 1) {
                    doctorGender_filter = {
                        'doctors.gender': doctorGender[0]
                    };
                } else {
                    doctorGender_filter = {};
                }
            }
            //console.log(doctorGender_filter,"doctorGender_filter____");
            let insuranceAccpted1 = [];
            insuranceAccpted1.push(insuranceAccpted);

            if (insuranceAccpted != "") {
                insuranceAccpted_filter = {
                    ['hospitaladmininfos.insurance_accepted']: { $in: insuranceAccpted1 }
                }
            }
            //console.log(openNow,"openNow_________");

            if (openNow.toString() != "") {
                if (openNow.toString() == "true") {
                    openNow_filter = {
                        $or: [
                            { week_days_status1: true }
                        ]
                    }
                } else {
                    openNow_filter = {
                        week_days_status1: { $size: 0 },
                    }
                }
            }
            //console.log(current_timestamp,"currenttimetsm_________");
            //console.log(onDutyHospital,"onDutyHospital________");
            if (onDutyHospital.toString() != "") {
                if (onDutyHospital.toString() == "true") {
                    onDutyHospital_filter = {
                        $or: [
                            //{ close_date_and_time_Status1: true },
                            { open_date_and_time_Status1: true },
                            //{ week_days_status1: true }
                        ]
                    }
                } else {
                    onDutyHospital_filter = {
                        //close_date_and_time_Status1: { $size: 0 },
                        open_date_and_time_Status1: { $size: 0 },
                        //week_days_status1: { $size: 0 },
                    }
                }
            }
            //console.log(isAvailableDate, "isAvailableDate_______");

            if (isAvailableDate) {
                let dateArray = []
                let unavailability_day_array = []
                const cdate = new Date()
                if (isAvailableDate == 'TODAY') {
                    const tdate = formatDateAndTime(cdate)
                    dateArray.push(tdate.split(' ')[0])
                }
                if (isAvailableDate == 'TOMORROW') {
                    cdate.setDate(cdate.getDate() + 1)
                    const tomorrowDate = formatDateAndTime(cdate)
                    dateArray.push(tomorrowDate.split(' ')[0])
                }
                if (isAvailableDate == 'NEXT7DAYS') {
                    for (let index = 1; index <= 7; index++) {
                        const cudate = new Date()
                        cudate.setDate(cudate.getDate() + index)
                        const nextDate = formatDateAndTime(cudate)
                        dateArray.push(nextDate.split(' ')[0])
                    }
                } else {
                    const anyDate = formatDateAndTime(new Date(isAvailableDate))
                    dateArray.push(anyDate.split(' ')[0])
                }
                const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

                for (const sdate of dateArray) {
                    const gdate = new Date(sdate)
                    unavailability_day_array.push(day[gdate.getDay()])
                }
                isAvailableDate_filter = {
                    ['doctors.unavailability_date_array']: { $nin: dateArray },
                    ['doctors.unavailability_day_array']: { $nin: unavailability_day_array }
                }
            }

            // Sorting Filter
            let allSort
            if (!consultationFee && !rating && !experience) {
                allSort = { distance: 1 }
            } else {
                allSort = {}
            }

            // if (rating) {
            //     console.log(rating, "rating__________");
            //     allSort['hospital_portal_user.average_rating'] = rating == "LOW_TO_HIGH" ? 1 : -1
            // }
            if (rating) {
                console.log(rating, "rating__________");
                allSort.rating = rating == "LOW_TO_HIGH" ? 1 : -1
            }

            /* if (consultationFee) {
                allSort['feemanagements.online.basic_fee'] = consultationFee == "LOW_TO_HIGH" ? 1 : -1
            } */
            if (consultationFee) {
                console.log(consultationFee, "consultationFee__________");
                allSort.doctorOnlineBasicFee = consultationFee == "LOW_TO_HIGH" ? 1 : -1
            }

            if (experience) {
                console.log(experience, "experienceeeeeeee____");

                allSort[['doctors.years_of_experience']] = experience == "LOW_TO_HIGH" ? 1 : -1
            }

            const result = await LocationInfo.aggregate([
                geoNear_filter,
                {
                    $lookup: {
                        from: "hospitaladmininfos",
                        localField: "_id",
                        foreignField: "in_location",
                        as: "hospitaladmininfos",
                    }
                },
                { $unwind: { path: "$hospitaladmininfos"} },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "hospitaladmininfos.for_portal_user",
                        foreignField: "_id",
                        as: "hospital_portal_user",
                    }
                },
                { $unwind: { path: "$hospital_portal_user"} },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "hospitaladmininfos.in_location",
                        foreignField: "_id",
                        as: "hospital_location",
                    }
                },
                { $unwind: { path: "$hospital_location", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "hospitalopeninghours",
                        localField: "hospitaladmininfos.for_portal_user",
                        foreignField: "for_portal_user",
                        as: "hospitalopeninghours",
                    }
                },
                { $unwind: "$hospitalopeninghours" },
                {
                    $addFields: {
                        open_date_and_time: "$hospitalopeninghours.open_date_and_time",
                        close_date_and_time: "$hospitalopeninghours.close_date_and_time",
                        week_days: "$hospitalopeninghours.week_days"
                    }
                },
                { $unwind: "$open_date_and_time" },
                { $unwind: "$close_date_and_time" },
                { $unwind: "$week_days" },

                {
                    $addFields: {
                        open_date_and_time_Status: {
                            $cond: {
                                if: {
                                    $and: [
                                        {
                                            $gte: [ // Check if current date is greater than or equal to start_time_with_date
                                                current_timestamp,
                                                "$open_date_and_time.start_time_with_date"
                                            ]
                                        },
                                        {
                                            $lte: [ // Check if current date is less than or equal to end_time_with_date
                                                current_timestamp,
                                                "$open_date_and_time.end_time_with_date"
                                            ]
                                        }
                                    ]
                                },
                                then: true, // The current date and time are within the specified range
                                else: false // The current date and time are not within the specified range
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        close_date_and_time_Status: {
                            $cond: {
                                if: {
                                    $and: [
                                        {
                                            $gte: [ // Check if current date is greater than or equal to start_time_with_date
                                                current_timestamp,
                                                "$close_date_and_time.start_time_with_date"
                                            ]
                                        },
                                        {
                                            $lte: [ // Check if current date is less than or equal to end_time_with_date
                                                current_timestamp,
                                                "$close_date_and_time.end_time_with_date"
                                            ]
                                        }
                                    ]
                                },
                                then: true, // The current date and time are within the specified range
                                else: false // The current date and time are not within the specified range
                            }
                        }
                    }
                },


                {
                    $addFields: {
                        week_days_status: day_filter
                    }
                },
                {
                    $lookup: {
                        from: "pathologytestinfonews",
                        let: { userId: "$hospitaladmininfos.for_portal_user" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$for_portal_user", "$$userId"]
                                    }
                                }
                            }
                        ],
                        as: "pathologyTests"
                    }
                },

                {
                    $lookup: {
                        from: "basicinfos",
                        localField: "hospitaladmininfos.for_portal_user",
                        foreignField: "for_hospital",
                        as: "doctors",
                    }
                },
                { $unwind: { path: "$doctors", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "doctors.for_portal_user",
                        foreignField: "_id",
                        as: "portal_user",
                    }
                },
                { $unwind: { path: "$portal_user", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "feemanagements",
                        localField: "doctors.in_fee_management",
                        foreignField: "_id",
                        as: "feemanagements",
                    }
                },
                { $unwind: { path: "$feemanagements", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {

                        pathologyTestsName: { $ifNull: ["$pathologyTests.nameOfTest", ""] },
                        neighborhood: "$hospital_location.neighborhood",
                        province: "$hospital_location.province",
                        department: "$hospital_location.department",
                        city: "$hospital_location.city",

                        hospital_name: "$hospitaladmininfos.hospital_name",
                        doctor_verify_status: { $ifNull: ["$doctors.verify_status", ""]  },
                        role: { $ifNull: ["$portal_user.role", ""] },
                        is_deleted: { $ifNull: ["$portal_user.isDeleted", false] },
                        is_active: { $ifNull: ["$portal_user.isActive", false] },
                        is_lock: { $ifNull: ["$portal_user.lock_user", false] },
                        createdBy: "$hospital_portal_user.createdBy",

                        average_rating: "$hospital_portal_user.average_rating",

                        hospital_verify_status: "$hospitaladmininfos.verify_status",
                        hospital_is_deleted: "$hospital_portal_user.isDeleted",
                        hospital_is_active: "$hospital_portal_user.isActive",
                        hospital_is_lock: "$hospital_portal_user.lock_user",
                        hospital_profile_picture: "$hospitaladmininfos.profile_picture",
                        closingHoursStartTimestamp: "$hospitalopeninghours.close_date_and_time.start_time_with_date",
                        closingHoursEndTimestamp: "$hospitalopeninghours.close_date_and_time.end_time_with_date",
                        doctorOnlineBasicFee: "$feemanagements.online.basic_fee",
                        openingHoursStatus: {
                            $or: [
                                { //if currentTimeStamp in between openingHours open and close
                                    $and: [
                                        { $lte: ["$hospitalopeninghours.open_date_and_time.start_time_with_date", current_timestamp] },
                                        { $gt: ["$hospitalopeninghours.open_date_and_time.end_time_with_date", current_timestamp] },
                                    ]
                                },
                                { //if currentTimeStamp in between day limit
                                    $and: day_filter
                                },
                            ]
                        }
                    }
                },
                {
                    $match: {
                        // doctor_verify_status: "APPROVED",
                        // is_deleted: false,
                        // is_active: true,
                        // is_lock: false,
                        hospital_verify_status: "APPROVED",
                        hospital_is_deleted: false,
                        hospital_is_active: true,
                        hospital_is_lock: false,
                        $and: [
                            city_filter,
                            neighborhood_filter,
                            province_filter,
                            department_filter,
                            open24Hour_filter,
                            hospitalType_filter,
                            consultationFeeFilter_filter,
                            appointmentType_filter,
                            isAvailableDate_filter,
                            doctorGender_filter,
                            spokenLanguage_filter,
                            healthcare-crmPartner_filter,
                            insuranceAccpted_filter
                        ],
                        $or: searchText_filter
                    }
                },
                {
                    $group: {
                        _id: "$hospitaladmininfos.for_portal_user",
                        hospitalName: { $addToSet: "$hospital_name" },
                        pathologyTestsName: { $addToSet: "$pathologyTestsName" },
                        hospitalProfilePic: { $addToSet: "$hospital_profile_picture" },
                        address: { $addToSet: "$hospital_location.address" },
                        distance: { $addToSet: "$distance" },
                        openingHours: { $addToSet: "$hospitaladmininfos.opening_hours_status" },
                        openingHoursStatus: { $addToSet: "$openingHoursStatus" },
                        doctor: { $addToSet: "$doctors" },
                        feemanagements: { $addToSet: "$feemanagements" },
                        createdBy:{ $addToSet: "$createdBy" },
                        email:{$first:"$hospital_portal_user.email"},
                        phone_number:{$first:"$hospital_portal_user.mobile"},
                        open_date_and_time_Status: { $addToSet: "$open_date_and_time_Status" },
                        close_date_and_time_Status: { $addToSet: "$close_date_and_time_Status" },
                        week_days_status: { $addToSet: "$week_days_status" },
                        rating: { $addToSet: "$average_rating" },
                        doctorOnlineBasicFee: { $addToSet: "$doctorOnlineBasicFee" },
                        coordinates: { $addToSet: "$hospital_location.loc.coordinates" },
                    }
                },
                { $addFields: { open_date_and_time_Status1: { $filter: { input: "$open_date_and_time_Status", as: "item", cond: { $eq: ["$$item", true] } } } } },
                { $addFields: { close_date_and_time_Status1: { $filter: { input: "$close_date_and_time_Status", as: "item", cond: { $eq: ["$$item", true] } } } } },
                { $addFields: { week_days_status1: { $filter: { input: "$week_days_status", as: "item", cond: { $eq: ["$$item", true] } } } } },

                { $unwind: "$hospitalName" },
                { $unwind: "$pathologyTestsName" },
                { $unwind: "$hospitalProfilePic" },
                { $unwind: "$address" },
                { $unwind: "$openingHours" },
                { $unwind: "$openingHoursStatus" },
                { $unwind: "$rating" },
                {
                    $match: {
                        $and: [onDutyHospital_filter, openNow_filter]
                    }
                },
                //  {$match: openNow_filter},
                //   {$match:onDutyHospital_filter},

                { $sort: allSort },
                {
                    $facet: {
                        totalCount: [
                            {
                                $count: 'count'
                            }
                        ],
                        paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }],
                    }
                },
            ]);
            //console.log("result--->", result[0].paginatedResults);
            for (let index = 0; index < result[0].paginatedResults.length; index++) {
                const profilePicKey = result[0].paginatedResults[index].hospitalProfilePic;
                if (profilePicKey) {
                    const signedUrl = await getDocument(profilePicKey)
                    result[0].paginatedResults[index].hospitalProfilePic = signedUrl
                }
                // result[0].paginatedResults[index].numberOfDoctors = await BasicInfo.find({ for_hospital: { $eq: result[0].paginatedResults[index]._id } }).countDocuments()
                result[0].paginatedResults[index].numberOfDoctors = await getDoctorCount(result[0].paginatedResults[index]._id)
            }
            let totalCount = 0
            if (result[0].totalCount.length > 0) {
                totalCount = result[0].totalCount[0].count
            }

            // sendResponse(req, res, 200, {
            //     status: true,
            //     data: result,
            //     message: `Successfully get hospital list`,
            //     errorCode: null,
            // });

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(totalCount / limit),
                    currentPage: page,
                    totalRecords: totalCount,
                    result: result[0].paginatedResults,
                },
                message: `Successfully get hospital list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, 'error1');
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: error.message ? error.message : `Filed to get hospital list`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async openingHours(req, res) {
        try {
            const { hospital_id, week_days, open_date_and_time, close_date_and_time, getDetails } = req.body;
            const openingHoursDetails = await HospitalOpeningHours.findOne({ for_portal_user: hospital_id })
            if (getDetails != "") {
                return sendResponse(req, res, 200, {
                    status: true,
                    data: { openingHoursDetails },
                    message: "successfully get details hospital opening hours",
                    errorCode: null,
                });
            }

            var newObject
            var newArray = []
            var newArray2 = []
            if (open_date_and_time.length > 0) {
                open_date_and_time.map((singleData) => {
                    newObject = {
                        start_time_with_date: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                        end_time_with_date: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                    }
                    newArray.push(newObject)
                })
            } else {
                newArray = [
                    {
                        "start_time_with_date": new Date(),
                        "end_time_with_date": new Date()
                    }
                ]
            }

            if (close_date_and_time.length > 0) {
                close_date_and_time.map((singleData) => {
                    newObject = {
                        start_time_with_date: new Date(singleData.date + "T" + singleData.start_time + ":15.215Z"),
                        end_time_with_date: new Date(singleData.date + "T" + singleData.end_time + ":15.215Z")
                    }
                    newArray2.push(newObject)
                })
            } else {
                newArray2 = [
                    {
                        "start_time_with_date": new Date(),
                        "end_time_with_date": new Date()
                    }
                ]
            }

            var openingHoursData
            if (openingHoursDetails) {
                openingHoursData = await HospitalOpeningHours.findOneAndUpdate(
                    { for_portal_user: hospital_id },
                    {
                        $set: {
                            week_days,
                            open_date_and_time: newArray,
                            close_date_and_time: newArray2
                        },
                    },
                    { new: true }
                ).exec();
            } else {
                const openingHoursInfo = new HospitalOpeningHours({
                    week_days,
                    open_date_and_time: newArray,
                    close_date_and_time: newArray2,
                    for_portal_user: hospital_id
                });
                openingHoursData = await openingHoursInfo.save();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: { openingHoursData },
                message: "successfully added hospital opening hours",
                errorCode: null,
            });
        } catch (error) {
            console.log(error)
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add hospital opening hours",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async viewHospitalAdminDetailsForPatient(req, res) {
        try {
            const { hospital_portal_id } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const result = await HospitalAdminInfo.find({ for_portal_user: hospital_portal_id })
                .select({
                    association: 1,
                    hospitalPictures: 1,
                    about_hospital: 1,
                    hospital_name: 1
                })
                .populate({
                    path: "for_portal_user",
                    select: { email: 1, country_code: 1, mobile: 1 },
                    match: { 'for_portal_user.isDeleted': false },
                })
                .populate({
                    path: 'in_location'
                })

            let data = result[0];
            if (data.association.is_true) {
                const resData = await httpService.getStaging('superadmin/get-all-association-group-by-id', { associationIds: data.association.name }, headers, 'superadminServiceUrl');
                let name = []
                for (const gname of resData.data) {
                    name.push(gname.group_name);
                }
                data.association.name = name
            }
            //Get Doctors count
            const filter = {
                for_hospital: { $eq: data.for_portal_user._id },
                'for_portal_user.isDeleted': false
            }
            const aggregate = [
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'for_portal_user',
                        foreignField: '_id',
                        as: 'for_portal_user'
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $project: {
                        email: "$for_portal_user.email"
                    }
                }
            ]
            const countData = await BasicInfo.aggregate(aggregate)
            let hospitalPicture = []
            for (const picture of data.hospitalPictures) {
                let image = await getDocument(picture)
                hospitalPicture.push(image)
            }
            const profile = await getDocument(data.profile_picture)
            data.profile_picture = profile
            delete data.hospitalPictures
            data.hospitalPictures = hospitalPicture
            sendResponse(req, res, 200, {
                status: true,
                body: { data, doctorCount: countData.length },
                message: `Hospital admin details`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to fetched hospital admin details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async viewHospitalDoctorsForPatient(req, res) {
        try {
            const { hospital_portal_id, doctor_name, speciality } = req.query
            const filter = {
                for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
                'for_portal_user.isDeleted': false
            }
            if (doctor_name) {
                filter['full_name'] = { $regex: doctor_name || '', $options: "i" }
            }
            if (speciality) {
                filter['speciality'] = mongoose.Types.ObjectId(speciality)
            }
            const aggregate = [
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'for_portal_user',
                        foreignField: '_id',
                        as: 'for_portal_user'
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $project: {
                        full_name: 1,
                        years_of_experience: 1,
                        profile_picture: 1
                    }
                }
            ]
            const resultData = await BasicInfo.aggregate(aggregate)
            let result = []
            for (const data of resultData) {
                if (data.profile_picture) {
                    let doc = await DocumentInfo.findById(data.profile_picture);
                    data.profile_picture = await getDocument(doc.url)
                } else {
                    data.profile_picture = ''
                }
                result.push(data)
            }
            sendResponse(req, res, 200, {
                status: true,
                body: { result },
                message: `Hospital doctor list`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to fetched hospital doctor`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async doctorAppointment(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const {
                appointmentId,
                loginId,
                doctorId,
                hospital_details,
                madeBy,
                consultationFee,
                appointmentType,
                reasonForAppointment,
                consultationDate,
                consultationTime,
                consultationUserType,
                consultationFor,
                patientId,
                patientDetails,
                docDetails,
                paymentType,
                paymentMode,
                status
            } = req.body
            //var consultation_date = formatDateAndTime(consultationDate).split(' ')[0]
            const consultationDate1 = new Date(consultationDate); // Your date object
            const consultation_date = await formatDateToYYYYMMDD(consultationDate1);


            var appointmentDetails
            if (appointmentId != "") {
                if (paymentType != "" && paymentType != undefined && paymentMode != "") {
                    console.log('in if');
                    // return;

                    appointmentDetails = await Appointment.findOneAndUpdate(
                        { _id: appointmentId },
                        {
                            $set: {
                                paymentType,
                                paymentMode,
                                status: "NEW"
                            },
                        },

                        { upsert: false, new: true }
                    ).exec();
                    //console.log(appointmentDetails, 'appointmentDetailsss___________', appointmentId);

                    if (paymentType == 'post-payment') {
                        updatePaymentStatusAndSlot(appointmentId, req)
                    }


                } else {
                    // console.log('in else');
                    // return;
                    appointmentDetails = await Appointment.findOneAndUpdate(
                        { _id: appointmentId },
                        {
                            $set: {

                                doctorId,
                                hospital_details,
                                consultationFee,
                                appointmentType,
                                reasonForAppointment,
                                consultationDate: consultation_date,
                                consultationTime,
                                consultationUserType,
                                patientDetails,
                                docDetails,
                                consultationFor
                            },
                        },
                        { upsert: false, new: true }
                    ).exec();

                }

                let doctorName = await PortalUser.findOne({ _id: doctorId })

                let receiverId;
                let serviceurl;
                let message;
                if (madeBy === 'patient') {
                    receiverId = doctorId
                    serviceurl = "hospitalServiceUrl"
                    message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
                } else {
                    receiverId = patientId
                    serviceurl = "patientServiceUrl"
                    message = `New Appointement from ${doctorName?.full_name}`
                }

                // var message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
                var requestData = {
                    created_by_type: madeBy,
                    created_by: loginId,
                    content: message,
                    url: '',
                    for_portal_user: receiverId,
                    notitype: "Booked Appointment",
                    appointmentId: appointmentDetails?._id,
                    title: "New Appointment"
                }
                var result = await notification('', '', serviceurl, '', '', '', headers, requestData)
                sendResponse(req, res, 200, {
                    status: true,
                    body: appointmentDetails,
                    message: `Appointment updated successfully`,
                    errorCode: null,
                });
            } else {

                var doctordetails = await BasicInfo.findOne({ for_portal_user: doctorId });
                // Check if there is already an appointment for the same doctor, appointment type, date, and time
                const existingAppointment = await Appointment.findOne({
                    doctorId, appointmentType, consultationDate: consultation_date, consultationTime
                });
                if (existingAppointment) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: `Appointment already booked for this doctor at same date and time.`,
                        errorCode: null,
                    });
                }
                var userarray = [
                    {
                        "user_id": patientId,
                        "name": patientDetails.patientFullName,
                        "image": ""
                    },
                    {
                        "user_id": doctorId,
                        "name": doctordetails?.full_name,
                        "image": ""
                    }
                ]
                var appointment_id = await getNextSequenceValue("appointment");
                const appointmentData = new Appointment({
                    loginId,
                    doctorId,
                    hospital_details,
                    madeBy,
                    consultationFee,
                    appointmentType,
                    reasonForAppointment,
                    consultationDate: consultation_date,
                    consultationTime,
                    consultationUserType,
                    paymentType,
                    paymentMode,
                    patientId,
                    patientDetails,
                    docDetails,
                    order_id: "APPOINTMENT-" + appointment_id,
                    users: userarray,
                    consultationFor,
                    status

                });
                appointmentDetails = await appointmentData.save();

                let doctorName = await PortalUser.findOne({ _id: doctorId })

                let receiverId;
                let serviceurl;
                let message;
                if (madeBy === 'patient') {
                    receiverId = doctorId
                    serviceurl = "hospitalServiceUrl"
                    message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
                } else {
                    receiverId = patientId
                    serviceurl = "patientServiceUrl"
                    message = `New Appointement from ${doctorName?.full_name}`
                }

                // var message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
                var requestData = {
                    created_by_type: madeBy,
                    created_by: loginId,
                    content: message,
                    url: '',
                    for_portal_user: receiverId,
                    notitype: "Booked Appointment",
                    appointmentId: appointmentDetails?._id,
                    title: "New Appointment"
                }

                var result = await notification('', '', serviceurl, '', '', '', headers, requestData)

                // var result = await notification(madeBy, notificationCreator, "hospitalServiceUrl", req.body.doctorId, "one new appointment", "https://mean.stagingsdei.com:451", headers)
                sendResponse(req, res, 200, {
                    status: true,
                    body: appointmentDetails,
                    message: `Appointment added successfully`,
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error, "errorrrr______");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to add appointment`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async bookedAppointmentsList(req, res) {
        try {
            const {
                doctorId,
                hospitalId
            } = req.body
            const result = await Appointment.find({ doctorId, hospitalId }, { consultationDate: 1, consultationTime: 1 })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully get booked appointment list`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get booked appointment list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async doctorAvailableSlot(req, res) {
        try {
            const {
                locationId,
                appointmentType,
                timeStamp,
                doctorId,
            } = req.body
            const current_timestamp = new Date(timeStamp)
            const onlyDate = timeStamp.split("T")[0]
            var day = current_timestamp.getDay()
            var hour = current_timestamp.getHours().toString()
            var minute = current_timestamp.getMinutes().toString()
            if (hour.toString().length == 1) {
                hour = "0" + hour;
            }
            if (minute.toString().length == 1) {
                minute = "0" + minute;
            }
            const hourAndMin = hour + minute
            var startTime
            var startTimeH
            var startTimeM
            var startTimeHM
            var endTime
            var endTimeH
            var endTimeM
            var endTimeHM
            var currentTimeH
            var currentTimeM
            var currentTimeHM

            var allGeneralSlot = []
            var allGeneralSlot2 = []
            var afterUnavailable = []
            var x = ""
            const result = await DoctorAvailability.findOne({ for_portal_user: doctorId, location_id: locationId, appointment_type: appointmentType })
            const allFee = await FeeManagement.findOne({ for_portal_user: doctorId, location_id: locationId, })
            var fee
            if (appointmentType == "ONLINE") {
                fee = allFee?.online.basic_fee
            }
            if (appointmentType == "FACE_TO_FACE") {
                fee = allFee?.f2f.basic_fee
            }
            if (appointmentType == "HOME_VISIT") {
                fee = allFee?.home_visit.basic_fee + allFee?.home_visit.travel_fee
            }
            if (!result) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        allGeneralSlot,
                        fee
                    },
                    message: `No Slots Available For This Location`,
                    errorCode: null,
                });
            }
            const doctorAvailability = result.availability_slot
            var availabilityArray = []
            var availabilitySlot = []
            for (let index = 0; index < doctorAvailability.length; index++) {
                const element = doctorAvailability[index];
                const availabilityDate = element.date.split("T")[0]
                const d1 = new Date(onlyDate)
                const d2 = new Date(availabilityDate)
                if (d1.getTime() === d2.getTime()) {
                    if (element.start_time != '0000' && element.end_time != '0000') {
                        availabilityArray.push({
                            startTime: element.start_time,
                            endTime: element.end_time
                        })
                    }

                }
            }


            if (availabilityArray.length > 0) {
                availabilityArray.forEach((element, index) => {
                    var totalH = 0
                    var totalM = 0
                    startTimeH = element.startTime.slice(0, 2)
                    startTimeM = element.startTime.slice(2)
                    startTimeHM = startTimeH + ":" + startTimeM
                    endTimeH = element.endTime.slice(0, 2)
                    endTimeM = element.endTime.slice(2)
                    endTimeHM = endTimeH + ":" + endTimeM
                    let valueStart = moment.duration(startTimeHM, "HH:mm");
                    let valueStop = moment.duration(endTimeHM, "HH:mm");
                    let difference = valueStop.subtract(valueStart);
                    totalH = totalH + difference.hours()
                    totalM = totalM + difference.minutes()
                    totalH = totalH + totalM / 60
                    var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
                    startTime = element.startTime
                    startTimeH = startTime.slice(0, 2)
                    startTimeM = startTime.slice(2)
                    startTimeHM = startTimeH + ":" + startTimeM
                    var piece = startTimeHM
                    var piece = startTimeHM.split(':')
                    var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                    var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                    if (nextStartTimeH.toString().length == 1) {
                        nextStartTimeH = "0" + startTimeH;
                    }
                    var nextStartTimeM = (mins % 60)
                    if (nextStartTimeM.toString().length == 1) {
                        nextStartTimeM = nextStartTimeM + "0";
                    }
                    var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                    availabilitySlot.push({
                        slot: startTimeHM + "-" + nextStartTimeHM,
                        status: 0
                    })
                    // allGeneralSlot2.push(startTimeH + startTimeM)
                    for (let index = 0; index < totalNumbersSlots - 1; index++) {
                        var piece = startTimeHM
                        var piece = startTimeHM.split(':')
                        var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                        startTimeH = (mins % (24 * 60) / 60 | 0)
                        if (startTimeH.toString().length == 1) {
                            startTimeH = "0" + startTimeH;
                        }
                        startTimeM = (mins % 60)
                        if (startTimeM.toString().length == 1) {
                            startTimeM = startTimeM + "0";
                        }
                        startTimeHM = startTimeH + ":" + startTimeM

                        var piece = startTimeHM
                        var piece = startTimeHM.split(':')
                        var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                        var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                        if (nextStartTimeH.toString().length == 1) {
                            nextStartTimeH = "0" + startTimeH;
                        }
                        var nextStartTimeM = (mins % 60)
                        if (nextStartTimeM.toString().length == 1) {
                            nextStartTimeM = nextStartTimeM + "0";
                        }
                        var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                        availabilitySlot.push({
                            slot: startTimeHM + "-" + nextStartTimeHM,
                            status: 0
                        })

                        // const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
                        // allGeneralSlot2.push(startTimeHM2)
                    }

                });
            }

            if (availabilitySlot.length > 0) {
                allGeneralSlot = availabilitySlot
            } else {
                var daysArray = []
                for (let index = 0; index < result.week_days.length; index++) {
                    if (day == 0) {
                        startTime = result.week_days[index].sun_start_time
                        endTime = result.week_days[index].sun_end_time
                    }
                    if (day == 1) {
                        startTime = result.week_days[index].mon_start_time
                        endTime = result.week_days[index].mon_end_time
                    }
                    if (day == 2) {
                        startTime = result.week_days[index].tue_start_time
                        endTime = result.week_days[index].tue_end_time
                    }
                    if (day == 3) {
                        startTime = result.week_days[index].wed_start_time
                        endTime = result.week_days[index].wed_end_time
                    }
                    if (day == 4) {
                        startTime = result.week_days[index].thu_start_time
                        endTime = result.week_days[index].thu_end_time
                    }
                    if (day == 5) {
                        startTime = result.week_days[index].fri_start_time
                        endTime = result.week_days[index].fri_end_time
                    }
                    if (day == 6) {
                        startTime = result.week_days[index].sat_start_time
                        endTime = result.week_days[index].sat_end_time
                    }
                    if (startTime != "0000" && endTime != "0000") {
                        daysArray.push({
                            startTime: startTime,
                            endTime: endTime
                        })
                    }
                }
                // console.log(daysArray,"daysArray");

                if (daysArray.length > 0) {
                    daysArray.forEach((element, index) => {
                        var totalH = 0
                        var totalM = 0
                        startTimeH = element.startTime.slice(0, 2)
                        startTimeM = element.startTime.slice(2)
                        startTimeHM = startTimeH + ":" + startTimeM
                        // console.log(startTimeHM,"totalNumbersSlots1");

                        endTimeH = element.endTime.slice(0, 2)
                        endTimeM = element.endTime.slice(2)
                        endTimeHM = endTimeH + ":" + endTimeM
                        // console.log(endTimeHM,"totalNumbersSlots2");

                        let valueStart = moment.duration(startTimeHM, "HH:mm");
                        let valueStop = moment.duration(endTimeHM, "HH:mm");

                        let difference = valueStop.subtract(valueStart);

                        totalH = totalH + difference.hours()
                        totalM = totalM + difference.minutes()
                        totalH = totalH + totalM / 60
                        // console.log(totalH,"totalNumbersSlots3",totalM);

                        var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
                        // console.log(totalNumbersSlots,"totalNumbersSlots4",totalM);

                        startTime = element.startTime
                        startTimeH = startTime.slice(0, 2)
                        startTimeM = startTime.slice(2)
                        startTimeHM = startTimeH + ":" + startTimeM
                        var piece = startTimeHM
                        piece = startTimeHM.split(':')
                        console.log(piece, "nextStartTimeHM");

                        var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)
                        console.log(mins, "nextStartTimeHM1");

                        var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                        console.log(nextStartTimeH, "nextStartTimeHM");

                        if (nextStartTimeH.toString().length == 1) {

                            nextStartTimeH = "0" + startTimeH;
                        }
                        var nextStartTimeM = (mins % 60)
                        if (nextStartTimeM.toString().length == 1) {
                            nextStartTimeM = nextStartTimeM + "0";
                        }
                        var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                        allGeneralSlot.push({
                            slot: startTimeHM + "-" + nextStartTimeHM,
                            status: 0
                        })
                        allGeneralSlot2.push(startTimeH + startTimeM)
                        // console.log(totalNumbersSlots,"totalNumbersSlots");

                        for (let index = 0; index < parseInt(totalNumbersSlots) - 1; index++) {
                            // console.log(startTimeHM,"totalNumbersSlots1111111111111");

                            var piece = startTimeHM
                            var piece = startTimeHM.split(':')

                            var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)

                            startTimeH = (mins % (24 * 60) / 60 | 0)
                            if (startTimeH.toString().length == 1) {
                                startTimeH = "0" + startTimeH;
                            }
                            startTimeM = (mins % 60)
                            if (startTimeM.toString().length == 1) {
                                startTimeM = startTimeM + "0";
                            }
                            startTimeHM = startTimeH + ":" + startTimeM

                            var piece = startTimeHM
                            var piece = startTimeHM.split(':')
                            var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)
                            var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                            if (nextStartTimeH.toString().length == 1) {
                                nextStartTimeH = "0" + startTimeH;
                            }
                            var nextStartTimeM = (mins % 60)
                            if (nextStartTimeM.toString().length == 1) {
                                nextStartTimeM = nextStartTimeM + "0";
                            }
                            var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM


                            if (startTimeHM <= endTimeHM && nextStartTimeHM <= endTimeHM) {
                                allGeneralSlot.push({
                                    slot: startTimeHM + "-" + nextStartTimeHM,
                                    status: 0
                                })
                                const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
                                allGeneralSlot2.push(startTimeHM2)

                            }
                            // console.log(allGeneralSlot,"daysArray",allGeneralSlot2);


                        }

                    });
                } else {
                    allGeneralSlot = []
                    allGeneralSlot2 = []
                }
                const doctorUnavailability = result.unavailability_slot
                var unavailabilityArray = []
                var unavailabilitySlot = []

                if (allGeneralSlot.length > 0) {
                    for (let index = 0; index < doctorUnavailability.length; index++) {
                        const element = doctorUnavailability[index];
                        const unavailabilityDate = element.date.split("T")[0]
                        const d1 = new Date(onlyDate)
                        const d2 = new Date(unavailabilityDate)
                        if (d1.getTime() === d2.getTime()) {
                            if (element.start_time != '0000' && element.end_time != '0000') {
                                unavailabilityArray.push({
                                    startTime: element.start_time,
                                    endTime: element.end_time
                                })

                            }


                            // const unAvailableStartTime = element.start_time
                            // const unAvailableEndTime = element.end_time
                            // console.log(allGeneralSlot2);
                            // for (let index = 0; index < allGeneralSlot2.length; index++) {
                            //     const element = allGeneralSlot2[index];
                            //     if (unAvailableStartTime <= element && element < unAvailableEndTime) {
                            //         var indexId = allGeneralSlot2.indexOf(element);
                            //         if (indexId !== -1) {
                            //             allGeneralSlot2.splice(indexId, 1);
                            //         }
                            //     }
                            // }
                            // console.log(allGeneralSlot2);
                        }
                    }
                    if (unavailabilityArray.length > 0) {
                        unavailabilityArray.forEach((element, index) => {
                            var totalH = 0
                            var totalM = 0
                            startTimeH = element.startTime.slice(0, 2)
                            startTimeM = element.startTime.slice(2)
                            startTimeHM = startTimeH + ":" + startTimeM
                            endTimeH = element.endTime.slice(0, 2)
                            endTimeM = element.endTime.slice(2)
                            endTimeHM = endTimeH + ":" + endTimeM
                            let valueStart = moment.duration(startTimeHM, "HH:mm");
                            let valueStop = moment.duration(endTimeHM, "HH:mm");
                            let difference = valueStop.subtract(valueStart);
                            totalH = totalH + difference.hours()
                            totalM = totalM + difference.minutes()
                            totalH = totalH + totalM / 60
                            var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
                            startTime = element.startTime
                            startTimeH = startTime.slice(0, 2)
                            startTimeM = startTime.slice(2)
                            startTimeHM = startTimeH + ":" + startTimeM
                            var piece = startTimeHM
                            var piece = startTimeHM.split(':')
                            var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                            var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                            if (nextStartTimeH.toString().length == 1) {
                                nextStartTimeH = "0" + startTimeH;
                            }
                            var nextStartTimeM = (mins % 60)
                            if (nextStartTimeM.toString().length == 1) {
                                nextStartTimeM = nextStartTimeM + "0";
                            }
                            var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                            unavailabilitySlot.push({
                                slot: startTimeHM + "-" + nextStartTimeHM,
                                status: 0
                            })
                            // allGeneralSlot2.push(startTimeH + startTimeM)
                            for (let index = 0; index < totalNumbersSlots - 1; index++) {
                                var piece = startTimeHM
                                var piece = startTimeHM.split(':')
                                var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                                startTimeH = (mins % (24 * 60) / 60 | 0)
                                if (startTimeH.toString().length == 1) {
                                    startTimeH = "0" + startTimeH;
                                }
                                startTimeM = (mins % 60)
                                if (startTimeM.toString().length == 1) {
                                    startTimeM = startTimeM + "0";
                                }
                                startTimeHM = startTimeH + ":" + startTimeM

                                var piece = startTimeHM
                                var piece = startTimeHM.split(':')
                                var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                                var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                                if (nextStartTimeH.toString().length == 1) {
                                    nextStartTimeH = "0" + startTimeH;
                                }
                                var nextStartTimeM = (mins % 60)
                                if (nextStartTimeM.toString().length == 1) {
                                    nextStartTimeM = nextStartTimeM + "0";
                                }
                                var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                                unavailabilitySlot.push({
                                    slot: startTimeHM + "-" + nextStartTimeHM,
                                    status: 0
                                })
                                // const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
                                // allGeneralSlot2.push(startTimeHM2)
                            }

                        });
                        // console.log(unavailabilitySlot, "unavailabilitySlot");
                        var filterUnavailableSlot = filterUnavailableSlotFunction(unavailabilitySlot, allGeneralSlot[0].slot, allGeneralSlot[allGeneralSlot.length - 1].slot)
                        console.log(filterUnavailableSlot, "filterUnavailableSlot");
                        allGeneralSlot = uniqueArray(allGeneralSlot, filterUnavailableSlot)
                    }
                }
            }
            // console.log(allGeneralSlot,"daysArray",allGeneralSlot2);

            var todayDate = new Date().toISOString().split('T')[0]
            // console.log(onlyDate,"daysArray",todayDate);

            if (new Date(onlyDate).getTime() === new Date(todayDate).getTime()) {
                allGeneralSlot = filterBookedSlotsToday(allGeneralSlot)
            }
            const appointment = await Appointment.find({ doctorId, 'hospital_details.hospital_id': locationId, appointmentType, consultationDate: onlyDate })

            if (appointment.length > 0) {
                // console.log("insideee_______", appointment);
                const appointmentTimeArray = []
                appointment.forEach((element) => {
                    appointmentTimeArray.push(element.consultationTime)
                })
                allGeneralSlot = filterBookedSlots(allGeneralSlot, appointmentTimeArray)
            }
            // allGeneralSlot = allGeneralSlot.filter((data) => {
            //     return data.status == 0;
            // })

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    allGeneralSlot,
                    fee
                },
                message: `Successfully get time slot`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get time slot`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async notification(req, res) {
        try {
            // console.log("reqqqqqqqqqqqqqqqqqq", req.body)
            // const notificationValue = new Notification(req.body)

            // const notificationData = await notificationValue.save()
            const userData = await PortalUser.findOne({ _id: req.body.for_portal_user });
            let notificationData;
            let navigationlink;
            if (userData?.notification) {
                const notificationValue = new Notification(req.body);
                notificationData = await notificationValue.save();

                if (req.body.notitype == "New Appointment" || req.body.notitype == "Booked Appointment" || req.body.notitype == "Appointment" || req.body.notitype == "Cancel Appointment" || req.body.notitype == "Reshedule Appointment" || req.body.notitype == "Appointment Approved" || req.body.notitype == "Appointment Rejected" || req.body.notitype == "Appointment Reminder") {
                    navigationlink = `individual-doctor/appointment/appointmentdetails/${req.body.appointmentId}`
                    const content = AppointmentInvitation(userData?.email, userData?.full_name, req.body.content, req.body.appointmentId, req.body.title, req.body.notitype, navigationlink);
                    const mailSent = await sendEmail(content);
                    const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: req.body.for_portal_user }, {}, "gatewayServiceUrl");

                    console.log("mailSent---------", mailSent)
                }

            }
            sendResponse(req, res, 200, {
                status: true,
                body: notificationData,
                message: `notification save`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get reason for appointment list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async notificationlist(req, res) {
        try {
            const { page, limit } = req.query;
            const notificationData = await Notification.find({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)

            }).sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();

            const count = await Notification.countDocuments({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
                new: true
            });
            const isViewcount = await Notification.countDocuments({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
                isView: false
            });

            const totalCount = await Notification.countDocuments({ for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user) });

            const headers = {
                'Authorization': req.headers['authorization']
            }
            let newnotificationlist = [];
            if (notificationData.length > 0) {
                for await (const element of notificationData) {
                    let object = {
                        created_by_type: element.created_by_type,
                        appointmentId: element.appointmentId,
                        notitype: element.notitype,
                        _id: element._id,
                        content: element.content,
                        url: element.url,
                        created_by: element.created_by,
                        for_portal_user: element.for_portal_user,
                        createdAt: element.createdAt,
                        updatedAt: element.updatedAt,
                        isView: element.isView
                    };
                    if (element.created_by_type == 'patient') {
                        let ids = [element.created_by];
                        let resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: ids }, headers, 'patientServiceUrl');
                        object.name = resData.data[element.created_by].full_name
                        object.picture = resData.data[element.created_by].profile_pic
                        newnotificationlist.push(object)
                    } else {
                        object.name = ''
                        object.picture = ''
                        newnotificationlist.push(object)
                    }
                }

            }
            sendResponse(req, res, 200, {
                status: true,
                body: { list: newnotificationlist, count: count, isViewcount: isViewcount, totalCount: totalCount },

                message: `notification list`,
                errorCode: null,
            });
            //  Promise.all([completepromise]).then(async (values)=>{
            //     console.log(notificationData,"hjgdhfgskjf");

            // });

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get reason for appointment list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateNotification(req, res) {
        try {
            const {
                receiverId,
                isnew
            } = req.body;

            if (!isnew) {
                var notificationDetails = await Notification.updateMany(
                    { for_portal_user: { $eq: receiverId } },
                    {
                        $set: {
                            new: false,
                        },
                    },
                    { upsert: false, new: true }
                ).exec();
            }
            sendResponse(req, res, 200, {
                status: true,
                body: notificationDetails,
                message: `Notification updated successfully`,
                errorCode: null,
            });

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to update notification list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }



    }


    async rescheduleAppointment(req, res) {
        const headers = {
            'Authorization': req.headers['authorization']
        }
        try {
            const {
                appointmentId,
                rescheduleConsultationDate,
                rescheduleConsultationTime,
                rescheduled_by,
                rescheduled_by_id
            } = req.body
            var appointment = await Appointment.findOne({ _id: appointmentId })

            var newAppointmentDetails = await Appointment.findOneAndUpdate(
                { _id: appointmentId },
                {
                    $set: {
                        consultationDate: rescheduleConsultationDate,
                        consultationTime: rescheduleConsultationTime,
                        rescheduled_by,
                        rescheduled_by_id
                    },
                },
                { upsert: false, new: true }
            ).exec();

            var notificationCreator;
            var notificationReceiver;
            var serviceurl;
            var message;
            var doctorDetails;
            if (rescheduled_by == "patient") {
                notificationCreator = appointment.patientId;
                notificationReceiver = appointment.doctorId;
                serviceurl = "hospitalServiceUrl"
                message = `${newAppointmentDetails.patientDetails.patientFullName} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
            } else {
                notificationCreator = appointment.doctorId;
                doctorDetails = await PortalUser.findOne({ _id: appointment.doctorId })
                notificationReceiver = appointment.patientId;
                serviceurl = "patientServiceUrl"
                message = `${doctorDetails?.full_name} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
            }

            // var message = `${newAppointmentDetails.patientDetails.patientFullName} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
            var requestData = {
                created_by_type: rescheduled_by,
                created_by: notificationCreator,
                content: message,
                url: '',
                for_portal_user: notificationReceiver,
                notitype: 'Reshedule Appointment',
                appointmentId: appointmentId
            }

            var result = await notification(newAppointmentDetails.madeBy, notificationCreator, serviceurl, req.body.doctorId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
            // console.log("result-->", result);
            sendResponse(req, res, 200, {
                status: true,
                body: newAppointmentDetails,
                message: `Appointment rescheduled successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to rescheduled appointment`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async nextAvailableSlot(req, res) {
        try {
            const {
                appointmentId
            } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }
            var appointment = await Appointment.findOne({ _id: appointmentId })
            const doctorId = appointment.doctorId
            const hospitalId = appointment.hospital_details.hospital_id
            const appointmentType = appointment.appointmentType
            var timeStamp = new Date()
            var timeStampString
            var slot = null
            console.log("timeStamp-before", timeStamp);

            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1);

            console.log("TODAY===>", timeStamp)
            console.log("TOMMORROW===>", tomorrow)

            for (let index = 0; index < 3; index++) {
                const resData = await httpService.postStaging('hospital/doctor-available-slot', { locationId: hospitalId, doctorId: doctorId, appointmentType: appointmentType, timeStamp: timeStamp }, headers, 'hospitalServiceUrl');
                console.log("IN LOOP===>", resData)

                // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
                // timeStamp = new Date(timeStampString)
                const slots = resData?.body?.allGeneralSlot

                console.log("SLOTS===>", slots)
                let isBreak = false
                if (slots) {
                    for (let index = 0; index < slots.length; index++) {
                        const element = slots[index];
                        if (element.status == 0) {
                            slot = element
                            isBreak = true
                            break
                        }
                    }
                }

                if (slot != null) {
                    isBreak = true
                    break
                }

                if (!isBreak) {
                    timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
                    timeStamp = new Date(timeStampString)
                }
            }
            if (slot == null) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: `Choose appointment from calender`,
                    errorCode: null,
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    slot,
                    timeStamp
                },
                message: `Nearest available slot`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get nearest available slot`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getHospitalType(req, res) {
        const { hospitalTypeName } = req.body
        try {
            const result = await HospitalType.find({})
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully get all hospital type`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to get all hospital type`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async filterValue(req, res) {
        try {
            let filter = {
                verify_status: "APPROVED",
                'for_portal_user.lock_user': false,
                'for_portal_user.isDeleted': false,
                'for_portal_user.isActive': true,
            }
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                {
                    $lookup: {
                        from: "feemanagements",
                        localField: "in_fee_management",
                        foreignField: "_id",
                        as: "feemanagements",
                    }
                },
                { $unwind: { path: "$feemanagements", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $addFields: {
                        doctorOnlineBasicFee: "$feemanagements.online.basic_fee"
                    }
                },
                {
                    $group: {
                        _id: null,
                        max: { $max: "$doctorOnlineBasicFee" },
                        min: { $min: "$doctorOnlineBasicFee" }
                    }
                }
            ];
            const result = await BasicInfo.aggregate(aggregate);
            let filter_value = {
                online_basic_fee: {
                    min_value: result[0].min,
                    max_value: result[0].max
                }
            }
            // Get Hospital Type
            const getHospitalType = await HospitalType.find({}).select({ name: 1 })
            filter_value.hospital_type = getHospitalType
            sendResponse(req, res, 200, {
                status: true,
                body: { filter_value },
                message: `Successfully get filter value`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to get filter value`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async setDoctorAvailabilityForFilter(req, res) {
        try {
            let filter = {
                'for_portal_user_d.lock_user': false,
                'for_portal_user_d.isDeleted': false,
                'for_portal_user_d.isActive': true,
                appointment_type: "ONLINE"
            }
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user_d",
                    }
                },
                { $unwind: "$for_portal_user_d" },
                { $match: filter },
                {
                    $group: {
                        _id: '$for_portal_user',
                        week_days: { "$addToSet": "$week_days" },
                        unavailability_slot: { "$addToSet": "$unavailability_slot" }
                    }
                },
                { $unwind: "$_id" },
            ];
            const result = await DoctorAvailability.aggregate(aggregate);

            if (result.length > 0) {
                console.log("IFFF", result);
                for (const value of result) {

                    const getUnavailabilityDateArray = await getUnavailabilityDate(value.unavailability_slot)
                    console.log("getUnavailabilityDateArray-----", getUnavailabilityDateArray);
                    const getUnavailabilityDayArray = await getUnavailabilityDay(value.week_days)
                    console.log("getUnavailabilityDayArray--------------", getUnavailabilityDayArray);
                    await BasicInfo.findOneAndUpdate({
                        for_portal_user: { $eq: value._id }
                    }, {
                        $set: {
                            unavailability_date_array: getUnavailabilityDateArray,
                            unavailability_day_array: getUnavailabilityDayArray
                        }
                    }).exec();


                }
                // sendResponse(req, res, 200, {
                //     status: true,
                //     body:  result ,
                //     message: `Successfully set unavailability value`,
                //     errorCode: null,
                // });
            }

        } catch (error) {
            console.log("error------", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to set availability`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addAcceptedInsurance(req, res) {
        try {
            const { main_phone_number, insuracneCompanyId, oldInsuracneCompanyId, oldInsuracneCompanyIdforstatus } = req.body
            console.log("reeee", req.body);
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const adminData = await HospitalAdminInfo.find({ main_phone_number: { $in: main_phone_number } }, {
                insurance_accepted: 1
            });
            console.log("Aaaaaa==>", adminData);
            adminData.forEach(async element => {
                let insurance_accepted = 'insurance_accepted' in element ? element.insurance_accepted : [];
                console.log("AAAA==>", insurance_accepted);
                if (insurance_accepted.indexOf(insuracneCompanyId) == -1) {
                    insurance_accepted.push(insuracneCompanyId);
                }

                console.log("AAA2--->", insurance_accepted);
                if (oldInsuracneCompanyId) {
                    const index = insurance_accepted.indexOf(oldInsuracneCompanyId)
                    insurance_accepted.splice(index, 1)
                }


                if (oldInsuracneCompanyIdforstatus != undefined) {

                    if (oldInsuracneCompanyIdforstatus) {
                        if (insurance_accepted.indexOf(insuracneCompanyId) == -1) {
                            insurance_accepted.push(insuracneCompanyId);
                        }

                    }
                    else {
                        const index = insurance_accepted.indexOf(insuracneCompanyId)
                        insurance_accepted.splice(index, 1)
                    }

                }
                const setIp = await HospitalAdminInfo.updateOne(
                    { _id: element._id },
                    {
                        $set: {
                            insurance_accepted: insurance_accepted
                        },
                    },
                    { new: true }
                ).exec();

                console.log("setIpsetIpsetIp", setIp);
            });

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    adminData
                },
                message: `insurance companies added successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to add insurance companies`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllUsersForChat(req, res) {
        try {
            const { loggedInId, adminId, searchText } = req.query;
            console.log("req.query-->>>>>>>", req.query)

            let getData;
            const getRole = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(loggedInId) });
            // console.log("getRole.role-->>>>>>>", getRole.role)

            if (getRole.role === "HOSPITAL_ADMIN" || getRole.role === "HOSPITAL_STAFF") {
                console.log("run HOSPITAL_ADMIN or HOSPITAL_STAFF")
                getData = await getListforHospital(loggedInId, adminId, searchText, req);
            }
            if (getRole.role === "INDIVIDUAL_DOCTOR_STAFF") {
                console.log("run INDIVIDUAL_DOCTOR_STAFF")
                getData = await getIndividualDoctorStaff(loggedInId, adminId);
            }
            if (getRole.role === "INDIVIDUAL_DOCTOR") {
                console.log("run INDIVIDUAL_DOCTOR")
                getData = await getLisforIndividualDoctor(loggedInId, adminId);
            }
            if (getRole.role === "HOSPITAL_DOCTOR") {
                console.log("run HOSPITAL_DOCTOR")
                getData = await getListforHospitalDoctor(loggedInId, adminId);
            }

            // console.log("getData",getData);

            return sendResponse(req, res, 200, {
                status: true,
                body: getData,
                message: "successfully get all hospital staff",
                errorCode: null,
            });

        } catch (error) {
            console.error(error);
            return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get all hospital staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async resetForgotPassword(req, res) {
        const { user_id, resetToken, newPassword } = req.body
        console.log("req.body", req.body);
        try {
            let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({ user_id });
            if (!ForgotPasswordTokenData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Token has expired",
                    errorCode: null,
                });
            }
            const isPasswordMatch = await bcryptCompare(resetToken, ForgotPasswordTokenData.token);
            if (!isPasswordMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Token not match",
                    errorCode: null,
                });
            }
            const passCheck = await PortalUser.findOne({ _id: user_id });

            const isPasswordCheck = await checkPassword(newPassword, passCheck);

            if (isPasswordCheck) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "This is Previous password. Enter New Password.",
                    errorCode: null,
                });
            } else {
                const hashPassword = await generateTenSaltHash(newPassword);

                const updatedUser = await PortalUser.findOneAndUpdate(
                    { _id: user_id },
                    { password: hashPassword },
                    { new: true }
                )
                sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "New password set successfully",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    async departmentListforexport(req, res) {
        const { searchKey, limit, page, userid } = req.query;
        var filter;

        if (searchKey == "") {
            filter = {
                delete_status: false,
                added_by: mongoose.Types.ObjectId(userid)
            };
        } else {
            filter = {
                delete_status: false,
                department: { $regex: searchKey || "", $options: "i" },
                added_by: mongoose.Types.ObjectId(userid)
            };
        }

        try {
            var result = "";
            if (limit > 0) {
                result = await Department.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .populate("department")
                    .exec();
            } else {
                result = await Department.aggregate([
                    {
                        $match: filter,
                    },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "portalusers",
                            localField: "added_by",
                            foreignField: "_id",
                            as: "expertiseData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$expertiseData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            department: "$department",
                            added_by: "$expertiseData.role"
                        },
                    },
                ]);
            }

            console.log(result, "result check");
            let array = result.map((obj) => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array,
                },
                message: `List export successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: "failed to export list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async uploadExcelforDepartment(req, res) {
        try {
            console.log("check console.");
            const filePath = "./uploads/" + req.filename;
            const data = await processExcel(filePath);
            console.log(data, "datadata");
            let added_by = req.body.user_id;

            if (data.length === 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: "Excel data is empty",
                    errorCode: null,
                });
            }

            const isValidFile = validateColumnWithExcel(departmentHospital, data[0]);
            fs.unlinkSync(filePath);
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return;
            }
            var departmentArray = data;

            const duplicateDepartments = await Department.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { department: { $in: departmentArray.map(data => data.department_name) } }
                ]
            });
            if (duplicateDepartments.length > 0) {
                departmentArray = departmentArray.filter(department => {
                    return !duplicateDepartments.some(d =>
                        d.department === department.department_name &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }
            const list = departmentArray.map((singleData) => ({
                department : singleData.department_name,
                active_status: true,
                added_by
            }));
            const savedDepartment = await Department.insertMany(list)
           
            sendResponse(req, res, 200, {
                status: true,
                body: savedDepartment,
                message: "All department records added successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error check");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error 1",
                errorCode: null,
            });
        }
    }




    async expertiseListforexport(req, res) {
        const { searchKey, limit, page, userid } = req.query;
        var filter;

        if (searchKey == "") {
            filter = {
                delete_status: false,
                added_by: mongoose.Types.ObjectId(userid)
            };
        } else {
            filter = {
                delete_status: false,
                expertise: { $regex: searchKey || "", $options: "i" },
                added_by: mongoose.Types.ObjectId(userid)
            };
        }

        try {
            var result = "";
            if (limit > 0) {
                result = await Expertise.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .populate("country_id", "name")
                    .exec();
            } else {
                result = await Expertise.aggregate([
                    {
                        $match: filter,
                    },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "portalusers",
                            localField: "added_by",
                            foreignField: "_id",
                            as: "expertiseData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$expertiseData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            expertise: "$expertise",
                            added_by: "$expertiseData.role"
                        },
                    },
                ]);
            }

            console.log(result, "result check");
            let array = result.map((obj) => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array,
                },
                message: `List export successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: "failed to export list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async uploadExcelforExpertise(req, res) {
        try {
            console.log("check console.");
            const filePath = "./uploads/" + req.filename;
            const data = await processExcel(filePath);
            console.log(data, "datadata");
            let added_by = req.body.user_id;

            if (data.length === 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: "Excel data is empty",
                    errorCode: null,
                });
            }

            const isValidFile = validateColumnWithExcel(expertiseHospital, data[0]);
            fs.unlinkSync(filePath);
            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return;
            }
            var expertiseArray = data;
            console.log("duplicateExpertise___________",expertiseArray);

            const duplicateExpertise = await Expertise.find({
                $and: [
                    { added_by: added_by },
                    { delete_status: false },
                    { expertise: { $in: expertiseArray.map(data => data.expertise_name) } }
                ]
            });
            console.log("duplicateExpertise___________",duplicateExpertise);
            if (duplicateExpertise.length > 0) {
                expertiseArray = expertiseArray.filter(expertise => {
                    return !duplicateExpertise.some(d =>
                        d.expertise === expertise.expertise_name &&
                        d.added_by.toString() === added_by &&
                        d.delete_status === false
                    );
                });

            }

            const list = expertiseArray.map((singleData) => ({
                expertise : singleData.expertise_name,
                added_by
            }));
            const savedExpertise = await Expertise.insertMany(list)
      


            sendResponse(req, res, 200, {
                status: true,
                body: savedExpertise,
                message: "All expertise records added successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error check");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error 1",
                errorCode: null,
            });
        }
    }



    async uploadCSVForService(req, res) {
        try {
            console.log("check console.");
            const filePath = "./uploads/" + req.filename;
            const data = await processExcel(filePath);
            console.log("Datata", data);
            const isValidFile = validateColumnWithExcel(serviceHospital, data[0]);
            fs.unlinkSync(filePath);

            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return;
            }
            if (data.length === 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: "Excel data is empty",
                    errorCode: null,
                });
            }

            for (const element of data) {                
                const department = await Department.find({
                    department: element.for_department,
                    delete_status: false,
                    added_by: mongoose.Types.ObjectId(req.body.user_id)
                });
                if (!department) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: `Department '${element.for_department}' does not exist`,
                        errorCode: null,
                    });
                    
                } else {                 
                    var service;
                    for(let data of department){
                        service = data?._id
                    }
                    // Check if the combination of country name and region name already exists
                    const existingRegion = await Service.findOne({
                        service: element.service_name,
                        for_department: mongoose.Types.ObjectId(service),
                        delete_status: false,
                        added_by: req.body.user_id,

                    });
                    if (existingRegion) {
                        return sendResponse(req, res, 500, {
                            status: false,
                            body: null,
                            message: `'${element.service_name} already exists`,
                            errorCode: null,
                        });
                    } else {
                        const payload = {
                            service: element.service_name,
                            for_department: service,
                            added_by: req.body.user_id,
                        };
                        const region = new Service(payload);
                        await region.save();
                    }
                }
            }

            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Service added successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error check");
            return sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    async serviceListforexport(req, res) {
        const { searchKey, limit, page, userid } = req.query;
        var filter;

        if (searchKey == "") {
            filter = {
                delete_status: false,
                added_by: mongoose.Types.ObjectId(userid)
            };
        } else {
            filter = {
                delete_status: false,
                service: { $regex: searchKey || "", $options: "i" },
                added_by: mongoose.Types.ObjectId(userid)
            };
        }

        try {
            var result = "";
            if (limit > 0) {
                result = await Service.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .populate("country_id", "name")
                    .exec();
            } else {
                result = await Service.aggregate([
                    {
                        $match: filter,
                    },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "portalusers",
                            localField: "added_by",
                            foreignField: "_id",
                            as: "expertiseData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$expertiseData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "departments",
                            localField: "for_department",
                            foreignField: "_id",
                            as: "departmentData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$departmentData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            expertise: "$service",
                            department: "$departmentData.department",
                            added_by: "$expertiseData.role"
                        },
                    },
                ]);
            }

            console.log(result, "result check");
            let array = result.map((obj) => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array,
                },
                message: `List export successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: "failed to export list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    async uploadCSVForUnitHospital(req, res) {
        try {
            const filePath = "./uploads/" + req.filename;
            const data = await processExcel(filePath);
            const isValidFile = validateColumnWithExcel(unitHospital, data[0]);
            fs.unlinkSync(filePath);

            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return;
            }
            if (data.length === 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: "Excel data is empty",
                    errorCode: null,
                });
            }

            for (const element of data) {
                const service = await Service.findOne({
                    service: element.for_service,
                    delete_status: false,
                });

                const department = await Department.findOne({
                    department: element.for_department,
                    delete_status: false,
                });

                if (!service && !department) {
                    return sendResponse(req, res, 400, {
                        status: false,
                        body: null,
                        message: `does not exist`,
                        errorCode: null,
                    });
                } else {
                    const serviceId = service._id;
                    const departmentId = department._id;

                    // Check if the combination of country name and region name already exists
                    const existingRegion = await Unit.findOne({
                        unit: element.unit_name,
                        for_service: serviceId,
                        for_department: departmentId,
                        delete_status: false,
                        added_by: req.body.user_id,

                    });
                    if (existingRegion) {
                        return sendResponse(req, res, 500, {
                            status: false,
                            body: null,
                            message: `'${element.unit_name} already exists`,
                            errorCode: null,
                        });
                    } else {
                        const payload = {
                            unit: element.unit_name,
                            for_service: serviceId,
                            for_department: departmentId,
                            added_by: req.body.user_id,
                        };
                        const region = new Unit(payload);
                        await region.save();
                    }
                }
            }

            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Unit added successfully",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error check");
            return sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }



    async unitListforexport(req, res) {
        const { searchKey, limit, page, userid } = req.query;
        var filter;

        if (searchKey == "") {
            filter = {
                delete_status: false,
                added_by: mongoose.Types.ObjectId(userid)
            };
        } else {
            filter = {
                delete_status: false,
                unit: { $regex: searchKey || "", $options: "i" },
                added_by: mongoose.Types.ObjectId(userid)
            };
        }

        try {
            var result = "";
            if (limit > 0) {
                result = await Unit.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .populate("country_id", "name")
                    .exec();
            } else {
                result = await Unit.aggregate([
                    {
                        $match: filter,
                    },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "portalusers",
                            localField: "added_by",
                            foreignField: "_id",
                            as: "unitData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$unitData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    {
                        $lookup: {
                            from: "departments",
                            localField: "for_department",
                            foreignField: "_id",
                            as: "departmentData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$departmentData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },


                    {
                        $lookup: {
                            from: "services",
                            localField: "for_service",
                            foreignField: "_id",
                            as: "serviceData",
                        },
                    },
                    {
                        $unwind: {
                            path: "$serviceData",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            unit: "$unit",
                            department: "$departmentData.department",
                            service: "$serviceData.service",
                            added_by: "$unitData.role"
                        },
                    },
                ]);
            }

            // console.log(result, "result check");
            let array = result.map((obj) => Object.values(obj));
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    result,
                    array,
                },
                message: `List export successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: "failed to export list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }



    //Master-Team
    async addTeam_SuperAdmin(req, res) {
        try {
            const { teamArray, added_by } = req.body

            const list = teamArray.map((singleData) => ({
                ...singleData,
                added_by
            }));
            const namesToFind = list.map((item) => item.team);
            const foundItems = await Team.find({
                team: { $in: namesToFind }, added_by: mongoose.Types.ObjectId(added_by)
            });
            const CheckData = foundItems.map((item) => item.team);
            if (foundItems.length == 0) {
                const savedTeam = await Team.insertMany(list)
                sendResponse(req, res, 200, {
                    status: true,
                    body: savedTeam,
                    message: "Successfully add team",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,

                    message: `${CheckData} is already exist`,
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to add team",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allTeamList(req, res) {
        try {
            const { limit, page, searchText, userId } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }
            var filter = { added_by: mongoose.Types.ObjectId(userId), delete_status: false }
            if (searchText != "") {
                filter = {
                    added_by: mongoose.Types.ObjectId(userId),
                    delete_status: false,
                    team: { $regex: searchText || '', $options: "i" }
                }
            }
            const teamList = await Team.find(filter)
                .sort(sortingarray) // Use an object for sorting
                .skip((page - 1) * limit)
                .limit(limit)
                // No need for .exec() when using await
                .exec();

            const count = await Team.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalCount: count,
                    data: teamList,
                },
                message: "Successfully get Team list",
                errorCode: null,
            });
        } catch (error) {
            console.log("data0---", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get team list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async updateTeam(req, res) {
        try {
            const {
                teamId,
                team,
                active_status,
                delete_status
            } = req.body
            const list = await Team.find({ team: team, active_status: active_status });
            if (list.length == 0) {
                const updateTeam = await Team.updateOne(
                    { _id: teamId },
                    {
                        $set: {
                            team,
                            active_status,
                            delete_status
                        }
                    },
                    { new: true }
                ).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    body: updateTeam,
                    message: "Successfully updated Team",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,

                    message: "Team Already Exist",
                    errorCode: null,
                });
            }

        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to update Team`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionOnTeam(req, res) {
        try {
            const { teamId, action_name, action_value } = req.body

            var message = ''

            const filter = {}
            if (action_name == "active") filter['active_status'] = action_value
            if (action_name == "delete") filter['delete_status'] = action_value

            if (action_name == "active") {
                var result = await Team.updateOne(
                    { _id: teamId },
                    filter,
                    { new: true }
                ).exec();

                message = action_value == true ? 'Successfully Active Team' : 'Successfully In-active Team'
            }

            if (action_name == "delete") {
                if (teamId == '') {
                    await Team.updateMany(
                        { delete_status: { $eq: false } },
                        {
                            $set: { delete_status: true }
                        },
                        { new: true }
                    )
                }
                else {
                    await Team.updateMany(
                        { _id: { $in: teamId } },
                        {
                            $set: { delete_status: true }
                        },
                        { new: true }
                    )
                }
                message = 'Successfully Team deleted'
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: message,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to action done`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async allTeamListforexport(req, res) {
        const { searchText, limit, page, userId } = req.query
        // console.log("req.queryreq.query", req.query);
        var filter
        if (searchText == "") {
            console.log("IFFF");
            filter = {
                added_by: mongoose.Types.ObjectId(userId),
                delete_status: false
            }
        } else {
            console.log("ELSEE");

            filter = {
                delete_status: false,
                added_by: mongoose.Types.ObjectId(userId),
                team: { $regex: searchText || '', $options: "i" },
            }
        }
        try {
            var result = '';
            if (limit > 0) {
                result = await Team.find(filter)
                    .sort([["createdAt", -1]])
                    .skip((page - 1) * limit)
                    .limit(limit * 1)
                    .exec();
            }
            else {
                result = await Team.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        team: "$team"
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
                message: `Team added successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to add team`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async uploadCSVForTeam(req, res) {
        try {
            const filePath = './uploads/' + req.filename;
            const data = await processExcel(filePath);
            console.log(data, "dataaaa________");

            const isValidFile = validateColumnWithExcel(TeamColumns, data[0]);
            fs.unlinkSync(filePath);

            if (!isValidFile) {
                sendResponse(req, res, 500, {
                    status: false,
                    body: isValidFile,
                    message: "Invalid excel sheet! column not matched.",
                    errorCode: null,
                });
                return;
            }

            const existingTeams = await Team.find({}, 'team');
            const existingTeamNames = existingTeams.map(team => team.team);

            const inputArray = [];
            const duplicateTeams = [];

            for (const singleData of data) {
                const trimmedTeam = singleData.team.trim();
                const existingTeam = await Team.findOne({ added_by: req.body.added_by, team: trimmedTeam, delete_status: false });
                if (existingTeam) {
                    duplicateTeams.push(trimmedTeam);
                } else {
                    inputArray.push({
                        team: trimmedTeam,
                        added_by: req.body.added_by,
                    });
                }
            }

            if (duplicateTeams.length > 0) {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: `Teams already exist: ${duplicateTeams.join(', ')}`,
                    errorCode: null,
                });
            }
            if (inputArray.length > 0) {
                const result = await Team.insertMany(inputArray);
                return sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: "All team records added successfully",
                    errorCode: null,
                });
            } else {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "No new teams added",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error, 'error');
            return sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async commmonTeamList(req, res) {
        const { hospitalId } = req.query
        try {
            const list = await Team.find({ added_by: mongoose.Types.ObjectId(hospitalId), delete_status: false, active_status: true });
            // console.log("lisst===>", list);
            sendResponse(req, res, 200, {
                status: true,
                body: { list },
                message: `All Team list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error--->");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get Team list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async TeamById(req, res) {
        try {
            const { _id, hospitalId } = req.query;
            var filter = {}
            filter = {
                _id: mongoose.Types.ObjectId(_id),
                added_by: mongoose.Types.ObjectId(hospitalId),
                delete_status: false,
                active_status: true
            }
            const list = await Team.findOne(filter);
            console.log("listlistlist", list);
            sendResponse(req, res, 200, {
                status: true,
                body: { list },
                message: `All Team list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "error--->");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get Team list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async saveSuperadminNotification(req, res) {
        console.log("sddfr>>>>>>", req.body)
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            let saveNotify = await new Notification({
                created_by: req.body.data?.created_by,
                notification_name: req.body.data?.notification_name,
                for_portal_user: req.body?.data?.for_portal_user,
                content: req.body.data?.content,
                created_by_type: req.body.data?.created_by_type,
                notitype: req.body.data?.notitype
            })
            let saveData = await saveNotify.save();

            if (saveData) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: saveData,
                    message: "Notification Saved Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: [],
                    message: "Notification not Saved",
                });
            }

        } catch (err) {
            console.log("err", err)
            return sendResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Internal server error",
            });
        }
    }

    async totalHospitalforAdminDashboard(req, res) {
        try {
            const totalCount = await PortalUser.countDocuments({ isDeleted: false, role: "HOSPITAL_ADMIN" });

            if (totalCount >= 0) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalCount },
                    message: "Hospital Count Fetch Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalCount: 0 },
                    message: "Hospital Count not Fetch",
                });
            }
        } catch (err) {
            console.log("err", err);
            return sendResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Internal server error",
            });
        }
    }

    async totalConsultation(req, res) {
        try {
            const totalF2FCount = await Appointment.countDocuments({ appointmentType: "FACE_TO_FACE" });
            const totalHomeVisitCount = await Appointment.countDocuments({ appointmentType: "HOME_VISIT" });
            const totalOnlineCount = await Appointment.countDocuments({ appointmentType: "ONLINE" });

            if (totalF2FCount >= 0 || totalHomeVisitCount >= 0 || totalOnlineCount >= 0) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalF2FCount, totalHomeVisitCount, totalOnlineCount },
                    message: "Consultation Count Fetch Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalF2FCount: 0, totalHomeVisitCount: 0, totalOnlineCount: 0 },
                    message: "Consultation Count not Fetch",
                });
            }
        } catch (err) {
            console.log("err", err);
            return sendResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Internal server error",
            });
        }
    }

    async saveFouPortalLocationData(req, res) {
        try {
            console.log(" req.body.data>>>>>>>>>>>", req.body.data)
            const hlocData = new HospitalLocation({
                hospital_or_clinic_location,
                for_portal_user: req.body.data.portal_user_id,
                type
            })

            const hlocResult = await hlocData.save()

            sendResponse(req, res, 200, {
                status: true,
                data: hlocResult,
                message: `hospital location fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getHospitalLocationData(req, res) {
        try {
            let result = await HospitalLocation.find({ for_portal_user: mongoose.Types.ObjectId(req.query.data) }).exec();

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital location fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getServiceData(req, res) {
        try {
            let data1;
            let result = await Service.find({ _id: req.query.data }).exec();
            // data1=result[0]?.service;
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital Service fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getDepartmentData(req, res) {
        try {
            let data1;
            let result = await Department.find({ _id: req.query.data }).exec();
            // data1=result[0]?.department;
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital Department fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getUnitData(req, res) {
        try {
            let data1;
            let result = await Unit.find({ _id: req.query.data }).exec();

            // data1=result[0]?.unit;
            // console.log("data1>>>>>",data1)
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital Unit fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getSpecialityData(req, res) {
        try {
            let result = await Specialty.find({ _id: req.query.data }).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital specility fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getExpertiseData(req, res) {
        try {
            let result = await Expertise.find({ _id: req.query.data }).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital Expertise fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getPortalUserData(req, res) {
        try {
            let result = await PortalUser.find({ _id: mongoose.Types.ObjectId(req.query.data), isDeleted: false }).exec();
            // console.log("result>>>>>>>>>",result)
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `portal data fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getTeamsData(req, res) {
        try {
            let result = await Team.find({ _id: req.query.data }).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `hospital team fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getStaffProfileData(req, res) {
        try {
            let result = await ProfileInfo.find({ _id: mongoose.Types.ObjectId(req.query.data) }).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `profile data fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async updateNotificationStatus(req, res) {
        try {
            const { id, notification } = req.body;
            const updatedNotification = await PortalUser.findByIdAndUpdate(
                { _id: id },
                { notification: notification }, // Update only the notification field
                { upsert: false, new: true }
            );
            sendResponse(req, res, 200, {
                status: true,
                body: updatedNotification,
                message: "Successfully updated notification status",
                errorCode: null,
            })
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update notification",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async getPurchasedSubscriptionData(req, res) {
        try {
            let result = await SubscriptionPurchaseStatus.find({ for_user: mongoose.Types.ObjectId(req.query.data), isDeleted: false }).exec();
            // console.log("result>>>>>>>>>",result)
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Subscription data fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getAllLocationById(req, res) {
        try {
            const { portal_user_id } = req.query;
            let alllocation = await HospitalLocation.find({ for_portal_user: portal_user_id });

            if (alllocation.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: alllocation,
                    message: "List getting successfully!",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Failed to fetch list",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });

            }

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to fetch list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllHospitalListForClaim(req, res) {
        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const filter = {
                'isDeleted': false,
                'lock_user': false,
                'isActive': true,
                // 'for_hospital_info.verify_status':"APPROVED",
                'for_doctor_info.verify_status': "APPROVED"
            };

            const filter1 = {
                'for_portal_user.isDeleted': false,
                'for_portal_user.lock_user': false,
                'for_portal_user.isActive': true,
                verify_status: "APPROVED"
            }

            const locationData = await PortalUser.aggregate([
                {
                    $lookup: {
                        from: "basicinfos",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "for_doctor_info",
                    }
                },
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "hospitallocations",
                        localField: "_id",
                        foreignField: "for_portal_user",
                        as: "for_location_info",
                    }
                },
                { $unwind: "$for_location_info" },
                {
                    $project: {
                        _id: 1,
                        type: "Doctor",
                        for_location_info: {
                            $filter: {
                                input: {
                                    $map: {
                                        input: "$for_location_info.hospital_or_clinic_location",
                                        as: "location",
                                        in: {
                                            $cond: {
                                                if: { $eq: ["$$location.locationFor", "clinic"] },
                                                then: {
                                                    hospital_id: "$$location.hospital_id",
                                                    hospital_name: "$$location.hospital_name",
                                                    location: "$$location.location",
                                                    locationFor: "$$location.locationFor",
                                                },
                                                else: null
                                            }
                                        }
                                    }
                                },
                                as: "location",
                                cond: { $ne: ["$$location", null] }
                            }
                        }
                    }
                },
                {
                    $unwind: "$for_location_info"
                },
                {
                    $match: { "for_location_info": { $ne: null } }
                }
            ]);

            const hospitalData = await HospitalAdminInfo.aggregate([
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter1 },
                {
                    $project: {
                        for_location_info: {
                            hospital_id: '$for_portal_user._id',
                            hospital_name: '$hospital_name',
                        },
                        type: "Hospital"
                    }
                }
            ]);

            let hospitalDataResponse = await httpService.getStaging('labimagingdentaloptical/get-all-fouportal-list-per-loc', {}, headers, 'labimagingdentalopticalServiceUrl');
            if (!hospitalDataResponse.status || !hospitalDataResponse.body) {
                throw new Error("Failed to fetch hospital data");
            }

            const fourPortal = hospitalDataResponse.body;
            // Extracting the array of hospitals from fourPortal
            const fourPortalArray = Array.isArray(fourPortal) ? fourPortal : [];

            const combinedResults = [...locationData, ...hospitalData, ...fourPortalArray];
            sendResponse(req, res, 200, {
                status: true,
                body: combinedResults,
                message: "Successfully fetched all hospital",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed to fetch all hospital",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getDoctorListforLocation(req, res) {
        try {
            const { clinic_id } = req.query;

            let data1 = await HospitalLocation.find({
                'hospital_or_clinic_location': {
                    $elemMatch: {
                        'hospital_id': clinic_id  // Replace clinic_id with the specific value you are looking for
                    }
                }
            })

            let doctorDetails = await BasicInfo.find({ for_portal_user: data1[0]?.for_portal_user }).populate({
                path: "for_portal_user"
            })

            sendResponse(req, res, 200, {
                status: true,
                body: doctorDetails,
                message: "Successfully fetched all doctors",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched all hospital`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllHospitalAdmin(req, res) {
        try {

            const filter1 = {
                'for_portal_user.isDeleted': false,
                'for_portal_user.lock_user': false,
                'for_portal_user.isActive': true,
                verify_status: "APPROVED"
            }

            const hospitalData = await HospitalAdminInfo.aggregate([
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter1 },
                {
                    $project: {
                        for_location_info: {
                            hospital_id: '$for_portal_user._id',
                            hospital_name: '$hospital_name'
                        }

                    }
                }
            ]);

            sendResponse(req, res, 200, {
                status: true,
                body: hospitalData,
                message: "Successfully fetched all hospital",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed to fetch all hospital",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getHospitalStaffData(req, res) {
        try {
            console.log("req.query-------", req.query)
            let allresult = []
            if (req.query?.data?.length >= 1) {
                let assign_staff_array = []
                for (const data of req.query?.data) {
                    let basicData = await ProfileInfo.findById(data).select({ name: 1 }).populate({ path: 'for_portal_user', select: { email: 1, country_code: 1, mobile: 1 } })
                    if (basicData) {
                        let staff_info = await StaffInfo.find({ for_portal_user: basicData.for_portal_user._id }).select({ degree: 1 }).populate({ path: 'role', select: { name: 1 } })
                        assign_staff_array.push({
                            _id: data,
                            full_name: basicData.name,
                            email: basicData.for_portal_user.email,
                            country_code: basicData.for_portal_user.country_code,
                            mobile: basicData.for_portal_user.mobile,
                            role: staff_info[0].role.name,
                        })
                    }
                }
                allresult = assign_staff_array
            }

            if (allresult.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: allresult,
                    message: "Data getting successfully!",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Failed to fetch data",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });

            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed to fetch all staff data",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async updatelogsData(req, res) {

        const { currentLogID, userAddress } = req.body;
        try {
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            if (userAddress) {
                const findData = await Logs.findOneAndUpdate(
                    { _id: mongoose.Types.ObjectId(currentLogID) },
                    {
                        $set: {
                            userAddress: userAddress,

                        },
                    },
                    { new: true }
                ).exec();
            } else {

                const findData = await Logs.findOneAndUpdate(
                    { _id: mongoose.Types.ObjectId(currentLogID) },
                    {
                        $set: {
                            logoutDateTime: formattedDate,

                        },
                    },
                    { new: true }
                ).exec();
            }

            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Update Logs Successfully",
                errorCode: null,
            });
        } catch (error) {
            return sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllLogs(req, res) {
        const { userId, limit, page } = req.query
        try {

            var sort = req.query.sort
            var sortingarray = {};

            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;

            } else {
                sortingarray['createdAt'] = -1;
            }

            let filter = {}

            filter = { userId: mongoose.Types.ObjectId(userId) }

            const userData = await Logs.find(filter)
                .sort(sortingarray)
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();

            const count = await Logs.countDocuments(filter)
            if (userData) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        count,
                        userData
                    },
                    message: "Update Log Successfully",
                    errorCode: null,
                });
            } else {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User Not Found!!",
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log("error____________", error);
            return sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "Failed",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addProviderDocument(req, res) {
        try {
            const {
                for_portal_user_id,
                docType,
                title,
                upload_date
            } = req.body;
            const existingDocument = await ProviderDoc.findOne({ title, for_portal_user: for_portal_user_id });
            if (existingDocument) {
                return sendResponse(req, res, 201, {
                    status: false,
                    body: null,
                    message: "Document with the same title already exists for this user",
                    errorCode: "DOCUMENT_EXISTS",
                });
            }
            const result = await uploadFile(req.files.document.data, {
                Bucket: "healthcare-crm-stage-docs",
                Key: `hospital/${for_portal_user_id}/${docType}/${req.files.document.name}`,
                ACL: 'public-read'
            });
            if (result) {
                const documentMetadata = new ProviderDoc({
                    doc_name: result.key,
                    for_portal_user: for_portal_user_id,
                    title,
                    upload_date
                });
                const documentDetail = await documentMetadata.save();
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { documentDetail },
                    message: "Successfully added document details",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to add document details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getProviderDocumentsByFilters(req, res) {
        try {
            const { portalUserId, startDate, endDate, type } = req.query;
            const filter = { for_portal_user: portalUserId, isDeleted: false, type: type };
            if (startDate && endDate) {
                const formattedStartDate = startDate.split('-').reverse().join('/');
                const formattedEndDate = endDate.split('-').reverse().join('/');
                filter.upload_date = { $gte: formattedStartDate, $lte: formattedEndDate };
            }
            const documents = await ProviderDoc.find(filter).exec();
            if (!documents || documents.length === 0) {
                return sendResponse(req, res, 201, {
                    status: false,
                    body: documents,
                    message: "No documents found",
                    errorCode: "DOCUMENT_NOT_FOUND",
                });
            } else {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { documents },
                    message: "Documents retrieved successfully",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to retrieve documents",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getProviderDocument(req, res) {
        try {
            const { url } = req.query;
            const dataurl = await getDocument(url);
            sendResponse(req, res, 200, {
                status: true,
                data: dataurl,
                message: `file fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to get file url`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async inActive_isDeletedProviderDocument(req, res) {
        try {
            const { documentId, action, status } = req.body;
            if (!documentId || !action) {
                return sendResponse(req, res, 201, {
                    status: false,
                    body: null,
                    message: "Both documentId and action fields are required in the request body",
                    errorCode: "MISSING_PARAMETER",
                });
            }
            if (action === "inactive") {
                await ProviderDoc.findByIdAndUpdate(documentId, { status: status }).exec();
                return sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "Document update successfully",
                    errorCode: null,
                });
            } else if (action === "deleted") {
                await ProviderDoc.findByIdAndUpdate(documentId, { isDeleted: status }).exec();
                return sendResponse(req, res, 200, {
                    status: true,
                    body: null,
                    message: "Document deleted successfully",
                    errorCode: null,
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: false,
                    body: null,
                    message: "Invalid action provided",
                    errorCode: "INVALID_ACTION",
                });
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to update document status",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async totalCountforHospitalDashboard(req, res) {
        var { hospital_id, dateFilter, yearFilter } = req.query;
        let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_id) });

        if (checkUser.role === "HOSPITAL_STAFF") {
            let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_id) })
            hospital_id = adminData?.in_hospital;
        }

        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }

            let dateWiseFilter = {};
            if (dateFilter !== '') {
                let chooseDate = new Date(dateFilter).toISOString()
                dateWiseFilter = {
                    "appointments.createdAt": {
                        $lte: new Date(`${chooseDate}`)
                    }
                };
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "for_portal_user._id",
                        foreignField: "doctorId",
                        as: "appointments",
                    }
                },
                { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
                {
                    $match: dateWiseFilter
                },

                {
                    $project: {
                        appointments: "$appointments",
                    }
                }
            ];
            const totalCount = await BasicInfo.aggregate(aggregate);
            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/four-portal-appointment-details-hospital-dashboard', { hospital_id, dateFilter }, headers, 'labimagingdentalopticalServiceUrl');

            // Initialize sum to 0
            let totalDoctorAppointmentFees = 0;
            let totalFourPortalAppointmentFees = 0;
            let totalDoctorFourPortalClaimFees = 0;
            let portal_idSet = new Set();
            const promises = result.map(async (item) => {
                try {
                    if (item?.appointments?.doctorId != null) {
                        portal_idSet.add(String(item.appointments.doctorId)); // Convert ObjectId to string
                    }
                    if (item?.appointments?.paymentDetails != null) {
                        totalDoctorAppointmentFees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            const promises1 = fourportalData?.data?.data.map(async (item) => {
                try {
                    if (item?.appointments?.portalId != null) {
                        portal_idSet.add(String(item.appointments.portalId)); // Convert ObjectId to string
                    }
                    if (item?.appointments?.paymentDetails != null) {
                        totalFourPortalAppointmentFees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises1);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let portal_id = Array.from(portal_idSet);
            // let claimdata = await httpService.getStaging('claim/get-revenue-hospital-dashboard', { portal_id,dateFilter }, headers, 'insuranceServiceUrl');
            let totalClaimData = await httpService.getStaging('claim/get-all-claim-hospital-dashboard', { portal_id, dateFilter, yearFilter }, headers, 'insuranceServiceUrl');

            // claimdata?.data?.data?.forEach(item => {
            //     if (item?.requestAmount != null) {
            //         totalDoctorFourPortalClaimFees += parseFloat(item?.requestAmount);
            //     }
            // });

            let totalSubmitedClaim = 0
            totalSubmitedClaim = totalClaimData?.data?.submittedClaimCount;

            let totalAppointmentRevenue = 0
            totalAppointmentRevenue = totalDoctorAppointmentFees + totalFourPortalAppointmentFees

            // let totalRevenue =0
            // totalRevenue = totalAppointmentRevenue + totalDoctorFourPortalClaimFees;
            let totalRevenue = 0
            totalRevenue = totalDoctorAppointmentFees + totalFourPortalAppointmentFees;


            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totaldoctorcount: totalCount?.length,
                    fourportalData: fourportalData?.data,
                    totalRevenue: totalRevenue,
                    totalSubmitedClaimCount: totalSubmitedClaim,
                    claimgraphdata: totalClaimData?.data
                },
                message: `data fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async totalStaffDoctorClaimHospitalDashboard(req, res) {
        var { hospital_id, dateFilter } = req.query;

        try {
            // const staffCount = await PortalUser.find({role:'HOSPITAL_STAFF',created_by_user: hospital_id})
            let filter = { role: 'HOSPITAL_STAFF', created_by_user: hospital_id, isDeleted: false };

            // Apply date filter if provided
            if (dateFilter) {
                // Construct a filter based on the provided date filter
                filter.createdAt = { $lte: new Date(dateFilter).toISOString() };
            }

            const staffCount = await PortalUser.countDocuments(filter);

            let dateWiseFilter = {};

            if (dateFilter !== '') {
                let chooseDate = new Date(dateFilter).toISOString()
                dateWiseFilter = {
                    "for_portal_user.createdAt": {
                        $lte: new Date(`${chooseDate}`)
                    }
                };
            }

            var filter1 = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter1 },
                {
                    $match: dateWiseFilter

                }
            ];
            const result = await BasicInfo.aggregate(aggregate);

            sendResponse(req, res, 200, {
                status: true,
                data: { staffCount: staffCount, doctorCount: result?.length },
                message: `hospital doctor fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error__________", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async totalRevenueforHospitalManagement(req, res) {
        var { hospital_id, dateFilter, yearFilter } = req.query;
        let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_id) });

        if (checkUser.role === "HOSPITAL_STAFF") {
            let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_id) })
            hospital_id = adminData?.in_hospital;
        }

        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }

            let dateWiseFilter = {};
            if (dateFilter !== '') {
                let chooseDate = new Date(dateFilter).toISOString()
                dateWiseFilter = {
                    "appointments.createdAt": {
                        $lte: new Date(`${chooseDate}`)
                    }
                };
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "for_portal_user._id",
                        foreignField: "doctorId",
                        as: "appointments",
                    }
                },
                { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $and: [
                            dateWiseFilter
                        ]
                    }
                },
                {
                    $project: {
                        appointments: "$appointments"
                    }
                }
            ];

            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/four-portal-appointment-details-hospital-dashboard', { hospital_id, dateFilter, yearFilter }, headers, 'labimagingdentalopticalServiceUrl');

            // Initialize sum to 0
            let totalDoctorAppointmentFees = 0;
            let totalFourPortalAppointmentFees = 0;

            let F2FCoPay = 0;
            let F2FInsuranceToBePaid = 0;

            let OnlineCoPay = 0;
            let OnlineInsuranceToBePaid = 0;

            let HomeVisitCoPay = 0;
            let HomeVisitInsuranceToBePaid = 0;
            const promises = result.map(async (item) => {
                try {
                    // if (item?.appointments?.paymentDetails != null) {
                    //     totalDoctorAppointmentFees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    // }

                    if (item?.appointments?.appointmentType === "FACE_TO_FACE") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            F2FCoPay = F2FCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : F2FCoPay;
                            F2FInsuranceToBePaid = F2FInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : F2FInsuranceToBePaid;

                            //   console.log("F2FCopay________",F2FCoPay)
                        } else {
                            F2FCoPay = F2FCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : F2FCoPay;
                        }
                    }

                    if (item?.appointments?.appointmentType === "ONLINE") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            OnlineCoPay = OnlineCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : OnlineCoPay;
                            OnlineInsuranceToBePaid = OnlineInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : OnlineInsuranceToBePaid;

                            //   console.log(OnlineInsuranceToBePaid,"OnlineCoPay________",OnlineCoPay)

                        } else {
                            OnlineCoPay = OnlineCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : OnlineCoPay;
                        }
                    }

                    if (item?.appointments?.appointmentType === "HOME_VISIT") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            HomeVisitCoPay = HomeVisitCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : HomeVisitCoPay;
                            HomeVisitInsuranceToBePaid = HomeVisitInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : HomeVisitInsuranceToBePaid;

                            //   console.log(HomeVisitInsuranceToBePaid,"HomeVisitCoPay________",HomeVisitCoPay)

                        } else {
                            HomeVisitCoPay = HomeVisitCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : HomeVisitCoPay;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            const appointmentRevenuesCount = {
                F2FCoPay: F2FCoPay,
                F2FInsuranceToBePaid: F2FInsuranceToBePaid,

                OnlineCoPay: OnlineCoPay,
                OnlineInsuranceToBePaid: OnlineInsuranceToBePaid,

                HomeVisitCoPay: HomeVisitCoPay,
                HomeVisitInsuranceToBePaid: HomeVisitInsuranceToBePaid
            }
            // console.log("appointmentRevenuesCount________",appointmentRevenuesCount)

            let FourPortalF2FCoPay = 0;
            let FourPortalF2FInsuranceToBePaid = 0;

            let FourPortalOnlineCoPay = 0;
            let FourPortalOnlineInsuranceToBePaid = 0;

            let FourPortalHomeVisitCoPay = 0;
            let FourPortalHomeVisitInsuranceToBePaid = 0;
            const promises1 = fourportalData?.data?.data.map(async (item) => {
                try {
                    // if (item?.appointments?.paymentDetails != null) {
                    //     totalFourPortalAppointmentFees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    // }

                    if (item?.appointments?.appointmentType === "FACE_TO_FACE") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            FourPortalF2FCoPay = FourPortalF2FCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : FourPortalF2FCoPay;
                            FourPortalF2FInsuranceToBePaid = FourPortalF2FInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : FourPortalF2FInsuranceToBePaid;
                        } else {
                            FourPortalF2FCoPay = FourPortalF2FCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : FourPortalF2FCoPay;
                        }
                    }

                    if (item?.appointments?.appointmentType === "ONLINE") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            FourPortalOnlineCoPay = FourPortalOnlineCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : FourPortalOnlineCoPay;
                            FourPortalOnlineInsuranceToBePaid = FourPortalOnlineInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : FourPortalOnlineInsuranceToBePaid;
                        } else {
                            FourPortalOnlineCoPay = FourPortalOnlineCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : FourPortalOnlineCoPay;
                        }
                    }

                    if (item?.appointments?.appointmentType === "HOME_VISIT") {
                        if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                            FourPortalHomeVisitCoPay = FourPortalHomeVisitCoPay + Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : FourPortalHomeVisitCoPay;
                            FourPortalHomeVisitInsuranceToBePaid = FourPortalHomeVisitInsuranceToBePaid + (item?.appointments?.paymentDetails?.insuranceTobePaid) ? (item?.appointments?.paymentDetails?.insuranceTobePaid) : FourPortalHomeVisitInsuranceToBePaid;
                        } else {
                            FourPortalHomeVisitCoPay = FourPortalHomeVisitCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : FourPortalHomeVisitCoPay;
                        }
                    }

                    // if (item?.appointments?.paymentDetails != null && item?.appointments?.appointmentType === 'FACE_TO_FACE') {
                    //     fourPortalfaceTofacefees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    //     fourPortalf2fInsured += parseFloat(item?.appointments?.paymentDetails?.insuranceTobePaid);
                    // }

                    // if (item?.appointments?.paymentDetails != null && item?.appointments?.appointmentType === 'ONLINE') {
                    //     fourPortalonlinefees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    //     fourPortalonlineInsured += parseFloat(item?.appointments?.paymentDetails?.insuranceTobePaid);
                    // }

                    // if (item?.appointments?.paymentDetails != null && item?.appointments?.appointmentType === 'HOME_VISIT') {
                    //     fourPortalhomevisitfees += parseFloat(item?.appointments?.paymentDetails?.doctorFees);
                    //     fourPortalhomevisitInsured += parseFloat(item?.appointments?.paymentDetails?.insuranceTobePaid);
                    // }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises1);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }
            const appointmentRevenuesCountFourPortal = {
                FourPortalF2FCoPay: FourPortalF2FCoPay,
                FourPortalF2FInsuranceToBePaid: FourPortalF2FInsuranceToBePaid,

                FourPortalOnlineCoPay: FourPortalOnlineCoPay,
                FourPortalOnlineInsuranceToBePaid: FourPortalOnlineInsuranceToBePaid,

                FourPortalHomeVisitCoPay: FourPortalHomeVisitCoPay,
                FourPortalHomeVisitInsuranceToBePaid: FourPortalHomeVisitInsuranceToBePaid
            }
            // console.log("appointmentRevenuesCountFourPortal_____________",appointmentRevenuesCountFourPortal)
            // let totalRevenue =0
            // totalRevenue = totalDoctorAppointmentFees + totalFourPortalAppointmentFees;

            let totalF2FCopay = 0
            let totalOnlineCopay = 0
            let totalHomeVisitCopay = 0
            totalF2FCopay = F2FCoPay + FourPortalF2FCoPay;
            totalOnlineCopay = OnlineCoPay + FourPortalOnlineCoPay;
            totalHomeVisitCopay = HomeVisitCoPay + FourPortalHomeVisitCoPay;
            console.log("totalF2FCopay_______", totalF2FCopay, totalOnlineCopay, totalHomeVisitCopay)
            let totalF2FInsurance = 0
            let totalOnlineInsurance = 0
            let totalHomevisitInsurance = 0
            totalF2FInsurance = F2FInsuranceToBePaid + FourPortalF2FInsuranceToBePaid
            totalOnlineInsurance = OnlineInsuranceToBePaid + FourPortalOnlineInsuranceToBePaid
            totalHomevisitInsurance = HomeVisitInsuranceToBePaid + FourPortalHomeVisitInsuranceToBePaid
            let totalRevenueAmount = {
                totalF2FCopay: totalF2FCopay,
                totalOnlineCopay: totalOnlineCopay,
                totalHomeVisitCopay: totalHomeVisitCopay,
                totalF2FInsurance: totalF2FInsurance,
                totalOnlineInsurance: totalOnlineInsurance,
                totalHomevisitInsurance: totalHomevisitInsurance
            }
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    fourportalData: fourportalData?.data,
                    totalRevenueAmount: totalRevenueAmount
                    // totalRevenue:totalRevenue,
                    // appointmentRevenuesCount:appointmentRevenuesCount
                },
                message: `data fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async totalOnlineRevenueforHospital(req, res) {
        var { hospital_id, filterDateWise, dateFilter, yearFilter } = req.query;
        console.log("reqqqqqqqqqq_________", req.query)
        let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_id) });

        if (checkUser.role === "HOSPITAL_STAFF") {
            let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_id) })
            hospital_id = adminData?.in_hospital;
        }

        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }

            let currentYear = moment().year();

            let dateWiseFilter = {};

            if (filterDateWise !== '') {
                if (filterDateWise === 'yearly') {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(),
                            $lt: new Date(`${Number(currentYear) + 1}-01-01T00:00:00.000Z`).toISOString()
                        }
                    };
                } else if (filterDateWise === 'monthly') {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: moment().startOf('month').toDate().toISOString(),
                            $lt: moment().endOf('month').toDate().toISOString()
                        }
                    };
                } else {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: moment().startOf('week').toDate().toISOString(),
                            $lt: moment().endOf('week').toDate().toISOString()
                        }
                    };
                }
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "for_portal_user._id",
                        foreignField: "doctorId",
                        as: "appointments",
                    }
                },
                { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        appointments: "$appointments"
                    }
                },
                {
                    $match: dateWiseFilter
                }
            ];

            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/four-portal-appointment-details-hospital-dashboard', { hospital_id, dateFilter, filterDateWise, yearFilter }, headers, 'labimagingdentalopticalServiceUrl');
            // console.log("fourportalData____________",fourportalData)
            let monthlyCountCoPay = {};
            let monthlyCountInsuranceToBePaid = {};

            moment.months().forEach((month) => {
                monthlyCountCoPay[month] = 0;
                monthlyCountInsuranceToBePaid[month] = 0;
            });

            let OnlineCoPay = 0;
            let OnlineInsuranceToBePaid = 0;

            let createdDate;
            const promises = result.map(async (item) => {
                try {
                    if (item.appointments) { // Check if appointments is defined
                        createdDate = moment(item.appointments.createdAt);
                        if (item?.appointments?.appointmentType === "ONLINE") {
                            if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                                OnlineCoPay = Number(item?.appointments?.paymentDetails.copay ? item.appointments?.paymentDetails.copay : item.appointments?.paymentDetails.doctorFees);
                                OnlineInsuranceToBePaid = Number(item.appointments?.paymentDetails.insuranceTobePaid ? item.appointments?.paymentDetails.insuranceTobePaid : OnlineInsuranceToBePaid);
                            } else {
                                OnlineCoPay = OnlineCoPay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : OnlineCoPay;
                            }
                        }
                    } else {
                        // console.log("Appointments data missing for item:", item);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let FourPortalOnlineCoPay = 0;
            let FourPortalOnlineInsuranceToBePaid = 0;
            const promises1 = fourportalData?.data?.data.map(async (item) => {
                try {
                    if (item.appointments) { // Check if appointments is defined
                        createdDate = moment(item.appointments.createdAt);
                        if (item?.appointments?.appointmentType === "ONLINE") {
                            if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                                FourPortalOnlineCoPay = Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : Number(item?.appointments?.paymentDetails?.doctorFees);
                                console.log(FourPortalOnlineCoPay, "FourPortalOnlineCoPay")
                                FourPortalOnlineInsuranceToBePaid = Number(item?.appointments?.paymentDetails?.insuranceTobePaid) ? Number(item?.appointments?.paymentDetails?.insuranceTobePaid) : 0;
                            } else {
                                FourPortalOnlineCoPay = Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : 0;
                            }
                        }
                    } else {
                        // console.log("Appointments data missing for item:", item);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises1);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let amountCoPay = 0;
            let amountInsuranceToBePaid = 0;
            amountCoPay = OnlineCoPay + FourPortalOnlineCoPay;
            amountInsuranceToBePaid = OnlineInsuranceToBePaid + FourPortalOnlineInsuranceToBePaid;

            let year = createdDate.year();

            if (year === currentYear) {
                let month = createdDate.format("MMMM");
                if (monthlyCountCoPay[month] === 0 && monthlyCountInsuranceToBePaid[month] === 0) {
                    monthlyCountCoPay[month] = amountCoPay;
                    monthlyCountInsuranceToBePaid[month] = amountInsuranceToBePaid;
                } else {
                    monthlyCountCoPay[month] += amountCoPay;
                    monthlyCountInsuranceToBePaid[month] += amountInsuranceToBePaid;
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    monthlyCountCoPay: monthlyCountCoPay,
                    monthlyCountInsuranceToBePaid: monthlyCountInsuranceToBePaid
                },
                message: `data fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async totalf2fRevenueforHospital(req, res) {
        var { hospital_id, filterDateWise, dateFilter, yearFilter } = req.query;
        let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_id) });

        if (checkUser.role === "HOSPITAL_STAFF") {
            let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_id) })
            hospital_id = adminData?.in_hospital;
        }

        try {
            const headers = {
                'Authorization': req.headers['authorization']
            }

            let currentYear = moment().year();

            let dateWiseFilter = {};

            if (filterDateWise !== '') {
                if (filterDateWise === 'yearly') {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(),
                            $lt: new Date(`${Number(currentYear) + 1}-01-01T00:00:00.000Z`).toISOString()
                        }
                    };
                } else if (filterDateWise === 'monthly') {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: moment().startOf('month').toDate().toISOString(),
                            $lt: moment().endOf('month').toDate().toISOString()
                        }
                    };
                } else {
                    dateWiseFilter = {
                        'appointments.consultationDate': {
                            $gte: moment().startOf('week').toDate().toISOString(),
                            $lt: moment().endOf('week').toDate().toISOString()
                        }
                    };
                }
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };
            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "for_portal_user._id",
                        foreignField: "doctorId",
                        as: "appointments",
                    }
                },
                { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        appointments: "$appointments"
                    }
                },
                {
                    $match: dateWiseFilter
                }
            ];

            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/four-portal-appointment-details-hospital-dashboard', { hospital_id, dateFilter, filterDateWise, yearFilter }, headers, 'labimagingdentalopticalServiceUrl');

            let monthlyCountCoPay = {};
            let monthlyCountInsuranceToBePaid = {};

            moment.months().forEach((month) => {
                monthlyCountCoPay[month] = 0;
                monthlyCountInsuranceToBePaid[month] = 0;
            });

            let f2fCopay = 0;
            let f2fInsurancetobepaid = 0;

            let createdDate;
            const promises = result.map(async (item) => {
                try {
                    if (item.appointments) { // Check if appointments is defined
                        createdDate = moment(item.appointments.createdAt);
                        if (item?.appointments?.appointmentType === "FACE_TO_FACE") {
                            if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                                f2fCopay = Number(item?.appointments?.paymentDetails.copay ? item.appointments?.paymentDetails.copay : item.appointments?.paymentDetails.doctorFees);
                                f2fInsurancetobepaid = Number(item.appointments?.paymentDetails.insuranceTobePaid ? item.appointments?.paymentDetails.insuranceTobePaid : f2fInsurancetobepaid);
                            } else {
                                f2fCopay = f2fCopay + Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : f2fCopay;
                            }
                        }
                    } else {
                        // console.log("Appointments data missing for item:", item);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let FourPortalf2fCoPay = 0;
            let FourPortalf2fInsuranceToBePaid = 0;
            const promises1 = fourportalData?.data?.data.map(async (item) => {
                try {
                    if (item.appointments) { // Check if appointments is defined
                        createdDate = moment(item.appointments.createdAt);
                        if (item?.appointments?.appointmentType === "FACE_TO_FACE") {
                            if (item?.appointments?.paymentType === "post-payment" && item?.appointments?.paymentDetails !== null) {
                                FourPortalf2fCoPay = Number(item?.appointments?.paymentDetails?.copay) ? Number(item?.appointments?.paymentDetails?.copay) : Number(item?.appointments?.paymentDetails?.doctorFees);
                                FourPortalf2fInsuranceToBePaid = Number(item?.appointments?.paymentDetails?.insuranceTobePaid) ? Number(item?.appointments?.paymentDetails?.insuranceTobePaid) : 0;
                            } else {
                                FourPortalf2fCoPay = Number(item?.appointments?.paymentDetails?.doctorFees) ? Number(item?.appointments?.paymentDetails?.doctorFees) : 0;
                            }
                        }
                    } else {
                        // console.log("Appointments data missing for item:", item);
                    }
                } catch (error) {
                    console.error("Error fetching claim data:", error);
                }
            });
            try {
                await Promise.all(promises1);
            } catch (error) {
                console.error("Error in one of the promises:", error);
            }

            let amountCoPay = 0;
            let amountInsuranceToBePaid = 0;
            amountCoPay = f2fCopay + FourPortalf2fCoPay;
            amountInsuranceToBePaid = f2fInsurancetobepaid + FourPortalf2fInsuranceToBePaid;

            let year = createdDate.year();

            if (year === currentYear) {
                let month = createdDate.format("MMMM");
                if (monthlyCountCoPay[month] === 0 && monthlyCountInsuranceToBePaid[month] === 0) {
                    monthlyCountCoPay[month] = amountCoPay;
                    monthlyCountInsuranceToBePaid[month] = amountInsuranceToBePaid;
                } else {
                    monthlyCountCoPay[month] += amountCoPay;
                    monthlyCountInsuranceToBePaid[month] += amountInsuranceToBePaid;
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    monthlyCountCoPay: monthlyCountCoPay,
                    monthlyCountInsuranceToBePaid: monthlyCountInsuranceToBePaid
                },
                message: `data fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________", error)
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async getHospitalNameById(req, res) {
        let for_portal_user = req.query.for_portal_user
        try {
            let result = await HospitalAdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) })
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `portal data fetch successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async doctorFourPortalPaymentHistoryToHospital(req, res) {
        try {
            const {
                hospital_id,
                searchTextP,
                searchTextD,
                appointmentStatus,
                appointmentStartDate,
                appointmentEndDate,
                limit,
                page,
            } = req.query;
            const headers = {
                'Authorization': req.headers['authorization']
            }

            var sort = req.query.sort
            var sortingarray = {};
            var keynew = '';
            var value = '';
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                keynew = sort.split(":")[0];
                value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            var filter = {
                'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
                'for_portal_user.isDeleted': false,
                for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
            };

            let appointment_filter = {}
            if (appointmentStartDate !== '' && appointmentEndDate !== '') {
                appointment_filter = {
                    'appointments.consultationDate': {
                        $gte: new Date(appointmentStartDate).toISOString(),
                        $lte: new Date(appointmentEndDate).toISOString()
                    }
                };
            }

            let searchFilter;
            if (searchTextD !== "") {
                searchFilter = { full_name: { $regex: searchTextD || "", $options: "i" } }
            }

            let searchFilterPatient;
            if (searchTextP !== "") {
                searchFilterPatient = { 'appointments.patientDetails.patientFullName': { $regex: searchTextP || "", $options: "i" } }
            }

            let appointmentStatus_filter = {}
            if (appointmentStatus !== '') {
                appointmentStatus_filter = {
                    'appointments.status': appointmentStatus
                }
            }

            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "for_portal_user._id",
                        foreignField: "doctorId",
                        as: "appointments",
                    }
                },
                { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        appointments: { $exists: true, $ne: [] } // Filter out records without appointments
                    }
                },
                {
                    $match: {
                        $and: [
                            appointment_filter,
                            appointmentStatus_filter,
                            searchFilterPatient || {}      // Filter based on searchFilterPatient
                        ]
                    }
                },
                // {
                //     $match: appointment_filter
                // },
                // {
                //     $match: appointmentStatus_filter
                // },
                // {
                //     $match: searchFilterPatient || {}
                // },
                {
                    $project: {
                        full_name: 1,
                        patientDetails: "$appointments.patientDetails",
                        patientId: "$appointments.patientId",
                        madeBy: "$appointments.madeBy",
                        consultationDate: "$appointments.consultationDate",
                        consultationTime: "$appointments.consultationTime",
                        appointmentType: "$appointments.appointmentType",
                        consultationFee: "$appointments.consultationFee",
                        paymentDetails: "$appointments.paymentDetails",
                        status: "$appointments.status",
                        paymentMode: "$appointments.paymentMode",
                        doctorId: "$appointments.doctorId",
                        hospital_details: "$appointments.hospital_details",
                        portal_type: "$for_portal_user.role",
                        createdAt: "$appointments.createdAt",
                    }
                },
                {
                    $match: {
                        paymentDetails: { $ne: null }
                    }
                },
                {
                    $match: searchFilter || {}
                }
            ];
            const totalCount = await BasicInfo.aggregate(aggregate);
            const result = await BasicInfo.aggregate(aggregate);
            const fourportalData = await httpService.getStaging('labimagingdentaloptical/four-portal-to-hospital-payment-history', { hospital_id, searchTextP, searchTextD, appointmentStatus, appointmentStartDate, appointmentEndDate }, headers, 'labimagingdentalopticalServiceUrl');

            let allData = [...fourportalData?.data?.data, ...result]

            // let filteredData = allData.filter(item => item.paymentDetails !== null );
            let filteredData = allData.length;

            let totalAmount = 0;
            allData.forEach((item) => {
                if (item?.paymentDetails != null) {
                    totalAmount = totalAmount + parseInt(item?.paymentDetails?.doctorFees)
                }
            })

            if (keynew == 'patientDetails.patientFullName') {
                if (value == 1) {
                    allData.sort((a, b) => {
                        if (a.patientDetails.patientFullName < b.patientDetails.patientFullName) return -1;
                        if (a.patientDetails.patientFullName > b.patientDetails.patientFullName) return 1;
                        return 0;
                    });

                } else {
                    allData.sort((a, b) => {
                        if (a.patientDetails.patientFullName > b.patientDetails.patientFullName) return -1;
                        if (a.patientDetails.patientFullName < b.patientDetails.patientFullName) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'full_name') {
                if (value == 1) {
                    allData.sort((a, b) => {
                        if (a.full_name < b.full_name) return -1;
                        if (a.full_name > b.full_name) return 1;
                        return 0;
                    });

                } else {
                    allData.sort((a, b) => {
                        if (a.full_name > b.full_name) return -1;
                        if (a.full_name < b.full_name) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'portal_type') {
                if (value == 1) {
                    allData.sort((a, b) => {
                        if (a.portal_type < b.portal_type) return -1;
                        if (a.portal_type > b.portal_type) return 1;
                        return 0;
                    });

                } else {
                    allData.sort((a, b) => {
                        if (a.portal_type > b.portal_type) return -1;
                        if (a.portal_type < b.portal_type) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'consultationDate') {
                if (value == 1) {
                    allData.sort((a, b) => new Date(a.consultationDate) - new Date(b.consultationDate));

                } else {
                    allData.sort((a, b) => new Date(b.consultationDate) - new Date(a.consultationDate));
                }
            }

            if (keynew == 'paymentDetails.doctorFees') {
                if (value == 1) {
                    allData.sort((a, b) => parseInt(a.paymentDetails.doctorFees) - parseInt(b.paymentDetails.doctorFees));

                } else {
                    allData.sort((a, b) => parseInt(b.paymentDetails.doctorFees) - parseInt(a.paymentDetails.doctorFees));

                }
            }

            if (keynew == 'paymentMode') {
                if (value == 1) {
                    allData.sort((a, b) => {
                        if (a.paymentMode < b.paymentMode) return -1;
                        if (a.paymentMode > b.paymentMode) return 1;
                        return 0;
                    });

                } else {
                    allData.sort((a, b) => {
                        if (a.paymentMode > b.paymentMode) return -1;
                        if (a.paymentMode < b.paymentMode) return 1;
                        return 0;
                    });
                }
            }

            if (keynew == 'status') {
                if (value == 1) {
                    allData.sort((a, b) => {
                        if (a.status < b.status) return -1;
                        if (a.status > b.status) return 1;
                        return 0;
                    });

                } else {
                    allData.sort((a, b) => {
                        if (a.status > b.status) return -1;
                        if (a.status < b.status) return 1;
                        return 0;
                    });
                }
            }

            let start_index;
            let end_index;

            if (req.query.limit != 0) {
                let skip = (page - 1) * limit
                if (skip == 0) {
                    start_index = skip
                } else {
                    start_index = skip;
                }

                end_index = parseInt(limit) + parseInt(skip);
            }

            let finalResult = allData.slice(start_index, end_index);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    // result:result,
                    result: finalResult,
                    totalAmount: totalAmount,
                    totalCount: filteredData,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(filteredData / limit) : 1,
                },
                message: "Payment History Fetched successfully!",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrrrr______");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to Fetch Payment History.",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAcceptedHospital(req, res) {
        try {
            const { insuranceId } = req.query
            var filter = {
                'for_portal_user.role': 'HOSPITAL_ADMIN',
                'verify_status': 'APPROVED',
                'for_portal_user.isDeleted': false,
                insurance_accepted: insuranceId
            };
            console.log("filter___________", filter);

            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user",
                    }
                },
                { $unwind: "$for_portal_user" },
                {
                    $lookup: {
                        from: "locationinfos",
                        localField: "in_location",
                        foreignField: "_id",
                        as: "in_location",
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
                { $match: filter },
                {
                    $project: {
                        hospital_id: "$for_portal_user._id",
                        hospital_name: 1,
                        ifu_number: 1,
                        license: 1,
                        rccm_number: 1,
                        fax_number: 1,
                        main_phone_number: 1,
                        location: '$in_location.address',
                        for_portal_user: {
                            _id: "$for_portal_user._id",
                            email: "$for_portal_user.email",
                            country_code: "$for_portal_user.country_code",
                            phone_number: "$for_portal_user.mobile",
                            lock_user: "$for_portal_user.lock_user",
                            createdAt: "$for_portal_user.createdAt",
                            isActive: "$for_portal_user.isActive",
                            fcmToken: "$for_portal_user.fcmToken",
                            notification: "$for_portal_user.notification"
                        },
                        updatedAt: 1

                    }
                },
            ];

            const result = await HospitalAdminInfo.aggregate(aggregate);

            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `Hospital List`,
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }
}

export const getListforHospital = async (loggedInId, adminId, searchText, req) => {
    try {
        const headers = {
            'Authorization': req.headers['authorization']
        }

        const matchFilter = {
            isDeleted: false,
            isActive: true
        };

        let matchFilter2 = {};
        let aggregate = [];
        let query = [];
        let admininfo = [];

        matchFilter2 = {
            for_hospitalIds: mongoose.Types.ObjectId(loggedInId)
        }

        var filter = {
            isDeleted: false,
            isActive: true
        }

        if (searchText && searchText !== "") {
            filter["$or"] = [
                {
                    "hospitaladmininfos.full_name": { $regex: searchText, $options: "i" },
                },
                {
                    "full_name": { $regex: searchText, $options: "i" },
                }
            ];
        }

        aggregate = [
            {
                $match: matchFilter2,
            },
            // {
            //     $lookup: {
            //         from: "documentinfos",
            //         localField: "profile_picture",
            //         foreignField: "_id",
            //         as: "basicinfosImage",
            //     }
            // },
            // { $unwind: { path: "$basicinfosImage", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "portalusers",
                    localField: "for_portal_user",
                    foreignField: "_id",
                    as: "portaluserData",
                }
            },
            { $unwind: { path: "$portaluserData", preserveNullAndEmptyArrays: true } },
            { $match: filter },
            {
                $project: {
                    role: "$portaluserData.role",
                    id: "$for_portal_user",
                    name: "$full_name",
                    profile_pic: {
                        $cond: {
                            if: { $eq: ["$profile_picture", null] },
                            then: null,
                            else: "$basicinfosImage.url"
                        }
                    }
                },
            }
        ];

        admininfo = [
            {
                $match: matchFilter,
            },
            {
                $lookup: {
                    from: "hospitaladmininfos",
                    localField: "_id",
                    foreignField: "for_portal_user",
                    as: "hospitaladmininfos",
                },
            },
            { $unwind: "$hospitaladmininfos" },
            {
                $match: {
                    _id: mongoose.Types.ObjectId(adminId),
                    "hospitaladmininfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
                }
            },
            { $match: filter },
            {
                $project: {
                    role: 1,
                    id: "$hospitaladmininfos.for_portal_user",
                    name: "$hospitaladmininfos.full_name",
                    profile_pic: "$hospitaladmininfos.profile_picture"
                }
            },
        ];

        query = [
            {
                $match: matchFilter
            },
            {
                $lookup: {
                    from: "staffinfos",
                    localField: "_id",
                    foreignField: "for_portal_user",
                    as: "staffinfos",
                },
            },
            { $unwind: "$staffinfos" },
            {
                $match: {
                    "staffinfos.in_hospital": mongoose.Types.ObjectId(adminId),
                    "staffinfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
                }
            },
            {
                $project: {
                    role: 1,
                    id: "$staffinfos.for_portal_user",
                    name: "$staffinfos.name",
                    profile_pic: "$staffinfos.profile_picture",
                },
            },
        ];

        const resData = await httpService.getStaging('labimagingdentaloptical/get-fourportal-list-forchat-hosp', { data: loggedInId }, headers, 'labimagingdentalopticalServiceUrl');
        // console.log("resData>>>>>>>>>>>>",resData)

        let fourPortalResults = [];

        if (resData?.data?.length > 0) {
            for (const portalData of resData.data) {
                let getfourPortalData = {
                    role: portalData?.role,
                    id: portalData?._id,
                    name: portalData?.full_name,
                    profile_pic: portalData?.profile_picture || null, // Add a default value if profile_picture is undefined
                    type: portalData?.type
                };

                fourPortalResults.push(getfourPortalData);
            }
        }

        // Execute the query and aggregate pipelines separately
        const queryResults = await PortalUser.aggregate(query);
        // console.log("queryResults===>>>", queryResults)

        const aggregateResults = await BasicInfo.aggregate(aggregate);
        // console.log("aggregateResults==>>>", aggregateResults)

        const admininfoResults = await PortalUser.aggregate(admininfo);
        // console.log("admininfoResults===>>>", admininfoResults)

        // Combine the results 
        const combinedResults = [...queryResults, ...aggregateResults, ...admininfoResults, ...fourPortalResults];

        const resultsWithProfilePics = await Promise.all(combinedResults.map(async (doc) => {
            if (doc.profile_pic && doc.profile_pic.length > 0) {
                const groupProfilePic = await getDocument(doc.profile_pic);
                doc.profile_pic = groupProfilePic;
            }
            return doc;
        }));

        return resultsWithProfilePics;

    } catch (error) {
        console.error(error);
    }
}

// export const getListforHospital = async (loggedInId, adminId,searchText) => {
//     try {
//         const matchFilter = {
//             isDeleted: false,
//             isActive: true
//         };

//         let matchFilter2 = {};
//         let aggregate = [];
//         let query = [];
//         let admininfo = [];

//         matchFilter2 = {
//             for_hospitalIds: mongoose.Types.ObjectId(loggedInId)
//         }

//         var filter = {
//             isDeleted: false,
//             isActive: true
//         }

//         if (searchText && searchText !== "") {
//             filter["$or"] = [
//                 {
//                   "hospitaladmininfos.full_name": { $regex: searchText, $options: "i" },
//                 },
//                 {
//                     "full_name": { $regex: searchText, $options: "i" },
//                 }
//             ];
//         }

//         aggregate = [
//             {
//                 $match: matchFilter2,
//             },
//             // {
//             //     $lookup: {
//             //         from: "documentinfos",
//             //         localField: "profile_picture",
//             //         foreignField: "_id",
//             //         as: "basicinfosImage",
//             //     }
//             // },
//             // { $unwind: { path: "$basicinfosImage", preserveNullAndEmptyArrays: true } },
//             {
//                 $lookup: {
//                     from: "portalusers",
//                     localField: "for_portal_user",
//                     foreignField: "_id",
//                     as: "portaluserData",
//                 }
//             },
//             { $unwind: { path: "$portaluserData", preserveNullAndEmptyArrays: true } },
//             { $match: filter },
//             {
//                 $project: {
//                     role: "$portaluserData.role",
//                     id: "$for_portal_user",
//                     name: "$full_name",
//                     profile_pic: {
//                         $cond: {
//                             if: { $eq: ["$profile_picture", null] },
//                             then: null,
//                             else: "$basicinfosImage.url"
//                         }
//                     }
//                 },
//             }
//         ];

//         admininfo = [
//             {
//                 $match: matchFilter,
//             },
//             {
//                 $lookup: {
//                     from: "hospitaladmininfos",
//                     localField: "_id",
//                     foreignField: "for_portal_user",
//                     as: "hospitaladmininfos",
//                 },
//             },
//             { $unwind: "$hospitaladmininfos" },
//             {
//                 $match: {
//                     _id: mongoose.Types.ObjectId(adminId),
//                     "hospitaladmininfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
//                 }
//             },
//             { $match: filter },
//             {
//                 $project: {
//                     role: 1,
//                     id: "$hospitaladmininfos.for_portal_user",
//                     name: "$hospitaladmininfos.full_name",
//                     profile_pic: "$hospitaladmininfos.profile_picture"
//                 }
//             },
//         ];

//         query = [
//             {
//                 $match: matchFilter
//             },
//             {
//                 $lookup: {
//                     from: "staffinfos",
//                     localField: "_id",
//                     foreignField: "for_portal_user",
//                     as: "staffinfos",
//                 },
//             },
//             { $unwind: "$staffinfos" },
//             {
//                 $match: {
//                     "staffinfos.in_hospital": mongoose.Types.ObjectId(adminId),
//                     "staffinfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
//                 }
//             },
//             {
//                 $project: {
//                     role: 1,
//                     id: "$staffinfos.for_portal_user",
//                     name: "$staffinfos.name",
//                     profile_pic: "$staffinfos.profile_picture",
//                 },
//             },
//         ];


//         // Execute the query and aggregate pipelines separately
//         const queryResults = await PortalUser.aggregate(query);
//         console.log("queryResults===>>>", queryResults)

//         const aggregateResults = await BasicInfo.aggregate(aggregate);
//         console.log("aggregateResults==>>>", aggregateResults)

//         const admininfoResults = await PortalUser.aggregate(admininfo);
//         console.log("admininfoResults===>>>", admininfoResults)

//         // Combine the results 
//         const combinedResults = [...queryResults, ...aggregateResults, ...admininfoResults];

//         const resultsWithProfilePics = await Promise.all(combinedResults.map(async (doc) => {
//             if (doc.profile_pic && doc.profile_pic.length > 0) {
//                 const groupProfilePic = await getDocument(doc.profile_pic);
//                 doc.profile_pic = groupProfilePic;
//             }
//             return doc;
//         }));
//         console.log("HOSPITAL_ADMIN result");

//         return resultsWithProfilePics;
//         // return sendResponse(req, res, 200, {
//         //     status: true,
//         //     body: resultsWithProfilePics,
//         //     message: "successfully get all hospital staff",
//         //     errorCode: null,
//         // });

//     } catch (error) {
//         console.error(error);
//         // return sendResponse(req, res, 500, {
//         //     status: false,
//         //     body: null,
//         //     message: "failed to get all hospital staff",
//         //     errorCode: "INTERNAL_SERVER_ERROR",
//         // });
//     }
// }



export const getLisforIndividualDoctor = async (loggedInId, adminId) => {
    try {
        const matchFilter = {
            isDeleted: false,
            isActive: true
        };

        const getData = await BasicInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(loggedInId) });
        let query = [];
        let getHosp;
        let aggregateResults = [];
        if (getData) {
            for (let hospitalId of getData?.for_hospitalIds) {
                getHosp = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospitalId) });

                if (getHosp) {
                    let getHospitalData = {
                        role: getHosp?.role,
                        id: getHosp?._id,
                        name: getHosp?.full_name,
                        profile_pic: getHosp?.profile_picture
                    };

                    aggregateResults.push(getHospitalData);
                }
            }

            console.log("Aggregate Results:", aggregateResults);
        } else {
            console.log("No data found for the given user.");
        }
        // let getHosp = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(getData?.for_hospitalIds[0]) });

        // let query = [];
        // let aggregateResults = [];

        // let getHospitalData = {
        //     role: getHosp?.role,
        //     id: getHosp?._id,
        //     name: getHosp?.full_name,
        //     profile_pic: getHosp?.profile_picture
        // }
        // console.log("getHospitalData======>>>", getHospitalData)
        // aggregateResults.push(getHospitalData)

        query = [
            {
                $match: matchFilter,
            },
            {
                $lookup: {
                    from: "staffinfos",
                    localField: "_id",
                    foreignField: "for_portal_user",
                    as: "staffinfos",
                },
            },
            { $unwind: "$staffinfos" },
            {
                $match: {
                    "staffinfos.in_hospital": mongoose.Types.ObjectId(adminId),
                    "staffinfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
                }
            },
            {
                $project: {
                    role: 1,
                    id: "$staffinfos.for_portal_user",
                    name: "$staffinfos.name",
                    profile_pic: "$staffinfos.profile_picture",
                },
            },
        ];

        // Execute the query and aggregate pipelines separately
        const queryResults = await PortalUser.aggregate(query);
        // console.log("queryResults>>>>>>>", queryResults)

        // Combine the results 
        const combinedResults = getHosp ? [...queryResults, ...aggregateResults] : queryResults;

        const resultsWithProfilePics = await Promise.all(combinedResults.map(async (doc) => {
            if (doc?.profile_pic && doc?.profile_pic?.length > 0) {
                const groupProfilePic = await getDocument(doc?.profile_pic);
                doc.profile_pic = groupProfilePic;
            }
            return doc;
        }));

        return resultsWithProfilePics;

    } catch (error) {
        console.error(error);
    }
}

export const getIndividualDoctorStaff = async (loggedInId, adminId) => {
    try {
        const matchFilter = {
            isDeleted: false,
            isActive: true
        };

        const getData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(loggedInId) });
        let getDocPortal = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(getData?.in_hospital) });
        let getDoctor = await BasicInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(getDocPortal?._id) });
        let getDocImage = await DocumentInfo.findOne({ _id: mongoose.Types.ObjectId(getDoctor?.profile_picture) });

        let aggregateResults = [];

        let getHospitalData = {
            role: getDocPortal?.role,
            id: getDocPortal?._id,
            name: getDoctor?.full_name,
            profile_pic: getDocImage?.url
        }
        console.log("getHospitalData>>>", getHospitalData)
        aggregateResults.push(getHospitalData)

        let query = [];

        query = [
            {
                $match: matchFilter,
            },
            {
                $lookup: {
                    from: "staffinfos",
                    localField: "_id",
                    foreignField: "for_portal_user",
                    as: "staffinfos",
                }
            },
            { $unwind: "$staffinfos" },
            {
                $match: {
                    "staffinfos.in_hospital": mongoose.Types.ObjectId(adminId),
                    "staffinfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
                }
            },
            {
                $lookup: {
                    from: "basicinfos",
                    localField: "staffinfos.in_hospital",
                    foreignField: "for_portal_user",
                    as: "basicinfosData",
                }
            },
            { $unwind: "$basicinfosData" },
            {
                $project: {
                    role: 1,
                    id: "$staffinfos.for_portal_user",
                    name: "$staffinfos.name",
                    profile_pic: "$staffinfos.profile_picture",
                },
            },
            // {
            //     $project: {
            //       staffinfos: {
            //         $concatArrays: [
            //           [{ id: "$staffinfos.for_portal_user", name: "$staffinfos.name", profile_pic: "$staffinfos.profile_picture" }],
            //           [{ id: "$basicinfosData.for_portal_user", name: "$basicinfosData.full_name" }]
            //         ]
            //       }
            //     }
            // }
        ];

        // Execute the query and aggregate pipelines separately
        const queryResults = await PortalUser.aggregate(query);
        // console.log("queryResults----->>>>>>",queryResults)

        // Combine the results 
        const combinedResults = [...queryResults, ...aggregateResults];

        const resultsWithProfilePics = await Promise.all(combinedResults.map(async (doc) => {
            if (doc.profile_pic && doc.profile_pic.length > 0) {
                const groupProfilePic = await getDocument(doc.profile_pic);
                doc.profile_pic = groupProfilePic;
            }
            return doc;
        }));

        return resultsWithProfilePics;

    } catch (error) {
        console.error(error);
    }
}

export const getListforHospitalDoctor = async (loggedInId, adminId) => {
    try {
        const matchFilter = {
            isDeleted: false,
            isActive: true
        };

        const getData = await BasicInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(loggedInId) });
        let getHosp = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(getData?.for_hospitalIds[0]) });

        let query = [];
        let aggregateResults = [];

        let getHospitalData = {
            role: getData?.role,
            id: getHosp?._id,
            name: getHosp?.full_name,
            profile_pic: getHosp?.profile_picture,
        }
        aggregateResults.push(getHospitalData)

        // For Staff Data
        let staffInfoArray = [];
        let staffDataArray = [];
        if (getData && getData?.assign_staff && getData?.assign_staff?.length > 0) {
            for (let i = 0; i < getData?.assign_staff?.length; i++) {
                const staffId = getData?.assign_staff[i];
                // Add a check to skip empty strings
                if (staffId.trim() === '') {
                    continue;
                }
                // const staffInfo = await httpService.getStaging('hospital/get-staff-profile-data', { data: staffId }, headers, 'hospitalServiceUrl');
                const staffInfo = await ProfileInfo.find({ _id: mongoose.Types.ObjectId(staffId) }).exec();
                staffInfoArray.push(staffInfo);
            }
        }
        for (let i = 0; i < staffInfoArray.length; i++) {
            const staffInfo = staffInfoArray[i];
            if (staffInfo && staffInfo?.length > 0) {
                const staffData = {
                    // role: getHosp?.data[i]?.role,
                    id: staffInfo[0]?.for_portal_user,
                    name: staffInfo[0]?.name,
                    profile_pic: staffInfo[0]?.profile_picture,
                };
                staffDataArray.push(staffData);
            }
        }

        // query = [
        //     {
        //         $match: matchFilter,
        //     },
        //     {
        //         $lookup: {
        //             from: "staffinfos",
        //             localField: "_id",
        //             foreignField: "for_portal_user",
        //             as: "staffinfos",
        //         },
        //     },
        //     { $unwind: "$staffinfos" },
        //     {
        //         $match: {
        //             "staffinfos.for_doctor": { $in: [mongoose.Types.ObjectId(adminId)] },
        //             "staffinfos.for_portal_user": { $ne: mongoose.Types.ObjectId(loggedInId) }
        //         }
        //     },
        //     {
        //         $project: {
        //             role: 1,
        //             id: "$staffinfos.for_portal_user",
        //             name: "$staffinfos.name",
        //             profile_pic: "$staffinfos.profile_picture",
        //         },
        //     },
        // ];

        // // Execute the query and aggregate pipelines separately
        // const queryResults = await PortalUser.aggregate(query);

        // Combine the results 
        const combinedResults = [...aggregateResults, ...staffDataArray];

        const resultsWithProfilePics = await Promise.all(combinedResults.map(async (doc) => {
            if (doc.profile_pic && doc.profile_pic.length > 0) {
                const groupProfilePic = await getDocument(doc.profile_pic);
                doc.profile_pic = groupProfilePic;
            }
            return doc;
        }));

        return resultsWithProfilePics;

    } catch (error) {
        console.error(error);
    }
}

module.exports = new HospitalController();