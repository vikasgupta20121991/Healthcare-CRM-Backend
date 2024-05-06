"use strict";

// models
import PortalUser from "../../../models/insurance/user/portal_user";
import AdminInfo from "../../../models/insurance/user/admin_info";
import Counter from "../../../models/counter";
import Template from "../../../models/insurance/template";
import StaffInfo from "../../../models/insurance/user/staff_info";
import LoctationInfo from "../../../models/insurance/user/location_info";
import ForgotPasswordToken from "../../../models/insurance/forgot_password_token";
import InsuranceAssignPlan from "../../../models/assignPlanToInsurance";
import ClaimField from "../../../models/claimContentField";
import AssignClaimField from "../../../models/assignClaimField";
import Subscriber from "../../../models/insurance/subscriber/subscriber"
import Plan from "../../../models/insurance/plan";
import PlanService from "../../../models/insurance/plan/service";
import PlanServiceNew from "../../../models/insurance/plan/service2";
import PlanExclusionNew from "../../../models/insurance/plan/exclusion2";
import HealthcareNetwork from "../../../models/insurance/healthcare_network";
import Http from "../../../helpers/httpservice"
import portaltypeandinsuranceId from "../../../models/insurance/portaltypeandinsuranceId";
import Notification from "../../../models/Chat/Notification"
import MediClaimCommonInfo from "../../../models/medicineClaim/commonInfo"
import SubscriptionPurchaseStatus from "../../../models/subscription/purchasestatus";
// utils
import { sendResponse } from "../../../helpers/transmission";
import bcrypt from "bcrypt";
import { bcryptCompare, generate6DigitOTP, generateRefreshToken, generateTenSaltHash, generateToken, handleRejectionError, processExcel, smsTemplateOTP } from "../../../middleware/utils";
import { htmlEmailFor2FAOTP, htmlForgetPassword, messageID, messages } from "../../../constant";
import Otp2fa from "../../../models/otp2fa";
import { sendEmail } from "../../../helpers/ses";
import { sendSms } from "../../../middleware/sendSms";

import { decryptionData } from "../../../helpers/crypto";
import crypto from "crypto"
import { verifyEmail2fa, forgotPasswordEmail, sendStaffDetails } from "../../../helpers/emailTemplate";
import { sendSmtpEmail } from "../../../middleware/sendSmtpEmail";
import Category from "../../../models/insurance/category";
import CategoryService from "../../../models/insurance/category/service";
import Exclusion from "../../../models/insurance/exclusion";
import ExclusionData from "../../../models/insurance/exclusion/detail";
import mongoose from "mongoose";
import Role from "../../../models/insurance/role_model";
import { HealthcareNetworkColumns, IncHealthcareNetworkColumns } from "../../../config/constants";
import { getFile, uploadFile, getDocument } from "../../../helpers/s3";
import claimProcessRole from "../../../models/claim_process_role/claimProcessRole";
import LocationInfo from "../../../models/insurance/user/location_info"
import MobilePayInfo from "../../../models/insurance/user/mobile_pay"
import Staffinfos from "../../../models/insurance/user/staff_info";
import Logs from "../../../models/insurance/user/log"
import {notificationfunction} from "../../../helpers/notification";
const csv = require('fast-csv');
const fs = require('fs');
const httpService = new Http();
const checkIp = async (currentIP, userIP) => {
    if (currentIP === userIP) {
        return true
    }
    return false
}

const checkPassword = async (password, user) => {
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch
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
const AddAcceptedInsuranceCompanies = async (healthcareNetworkArray, insuranceId, token, oldInsuracneCompanyId = '') => {
    const pharmacyMobile = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Pharmacy') return singleData.mobile });
    const hospitalMobile = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Hospital') return singleData.mobile });
    const doctorMobile = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Doctor') return singleData.mobile });
    const Laboratory_Imaging = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Laboratory-Imaging') return singleData.mobile });
    const Paramedical = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Paramedical-Professions') return singleData.mobile });
    const Dental = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Dental') return singleData.mobile });
    const Optical = healthcareNetworkArray.map((singleData) => { if (singleData.providerType == 'Optical') return singleData.mobile });

    const headers = {
        'Authorization': token
    }
    if (pharmacyMobile.length > 0) {
        await httpService.postStaging('pharmacy/get-pharmacy-by-mainmobilenumber', {
            "main_phone_number": pharmacyMobile,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'pharmacyServiceUrl');
    }
    if (hospitalMobile.length > 0) {
        await httpService.postStaging('hospital/add-accepted-insurance', {
            "main_phone_number": hospitalMobile,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'hospitalServiceUrl');
    }
    if (doctorMobile.length > 0) {
        await httpService.postStaging('hospital-doctor/add-accepted-insurance', {
            "main_phone_number": doctorMobile,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'hospitalServiceUrl');
    }

    if (Laboratory_Imaging.length > 0) {
        console.log("check log2323");
        await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
            "main_phone_number": Laboratory_Imaging,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'labimagingdentalopticalServiceUrl');
    }

    if (Paramedical.length > 0) {
        console.log("check log2323");
        await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
            "main_phone_number": Paramedical,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'labimagingdentalopticalServiceUrl');
    }

    if (Dental.length > 0) {
        console.log("check log2323");
        await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
            "main_phone_number": Dental,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'labimagingdentalopticalServiceUrl');
    }

    if (Optical.length > 0) {
        console.log("check log2323");
        await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
            "main_phone_number": Optical,
            "insuracneCompanyId": insuranceId,
            "oldInsuracneCompanyId": oldInsuracneCompanyId
        }, headers, 'labimagingdentalopticalServiceUrl');
    }
}
export class InsuranceUserClass {
    async adminSignUp(req, res) {
        try {
            const {
                email,
                password,
                country_code,
                mobile,
                full_name,
                first_name,
                middle_name,
                last_name,
                company_name
            } = req.body;
            let userFind = await PortalUser.findOne(
                {
                    email: email.toLowerCase(), isDeleted: false
                }
            );
            if (userFind) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: userFind,
                    message: "User already exist",
                    errorCode: null,
                });
            }
            const salt = await bcrypt.genSalt(10);
            let newPassword = await bcrypt.hash(password, salt);
            var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
            let userData = new PortalUser(
                {
                    email,
                    country_code,
                    mobile,
                    password: newPassword,
                    user_id: sequenceDocument.sequence_value,
                    user_name:`${first_name} ${middle_name} ${last_name}`
                }
            );
            let userDetails = await userData.save();
            let adminData = new AdminInfo(
                {
                    full_name: first_name + " " + middle_name + " " + last_name,
                    first_name,
                    middle_name,
                    last_name,
                    company_name,
                    for_portal_user: userDetails._id
                }
            );
            let adminDetails = await adminData.save();

            let superadminData = await httpService.getStaging(
                "superadmin/get-super-admin-data",
                {},
                {},
                "superadminServiceUrl"
              );
       
              var requestData = {
                created_by_type: "insurance",
                created_by: userDetails?._id,
                content: `New Registration From ${userDetails?.user_name}`,
                url: '',
                for_portal_user: superadminData?.body?._id,
                notitype: "New Registration",
                appointmentId:  userDetails?._id
            }
           
            var result = await notificationfunction('', '', "superadminServiceUrl", '', '', '','', requestData);            console.log("result______",result)
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    adminDetails,
                    userDetails
                },
                message: "successfully Sign Up",
                errorCode: null,
            });
        } catch (error) {
            console.log("error____",error)
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };


    async addClaimEsignature(req, res) {
        try {

            const fileName = req.filename;
            sendResponse(req, res, 200, {
                status: true,
                body: fileName,
                message: 'Eprescription validated successfully',
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check error 201");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to validate eprescription",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            const { uuid, role } = req.headers;
            // const headers = {
            //     Authorization: req.headers["authorization"],
            // };
            const portalUserData = await PortalUser.findOne({ email: email.toLowerCase(), isDeleted: false }).lean();

            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }

            const isPasswordMatch = await checkPassword(password, portalUserData);
            if (!isPasswordMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Credential not matched",
                    errorCode: "INCORRECT_PASSWORD",
                });
            }

            portalUserData.password = undefined

            if (portalUserData.lock_user === true) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User temporarily locked",
                    errorCode: "USER_LOCKED",
                });
            }

            var adminData = '';
            // adminData = await AdminInfo.findOne({
            //     for_portal_user: portalUserData._id,
            // }).lean();

            var adminData1 = await AdminInfo.aggregate([
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
                adminData = adminData1[0]
            }
            if (adminData != '') {
                if (adminData?.locationinfos.length > 0) {
                    try {
                        var locationids = {
                            country_id: adminData?.locationinfos[0]?.country,
                            region_id: adminData?.locationinfos[0]?.region,
                            province_id: adminData?.locationinfos[0]?.province,
                            village_id: adminData?.locationinfos[0]?.village,
                            city_id: adminData?.locationinfos[0]?.city,
                            department_id: adminData?.locationinfos[0]?.department,
                        };

                        const locationdata = await httpService.postStaging(
                            "common-api/get-location-name",
                            { locationids: locationids }, {},

                            "superadminServiceUrl"
                        );

                        if (locationdata.status) {
                            adminData.locationinfos[0].country = {
                                countryname: locationdata.body.country_name,
                                country_iso_code: locationdata.body.country_iso_code,
                            };
                            adminData.locationinfos[0].region = locationdata.body.region_name;
                            adminData.locationinfos[0].province = locationdata.body.province_name;
                            adminData.locationinfos[0].village = locationdata.body.village_name;
                            adminData.locationinfos[0].city = locationdata.body.city_name;
                            adminData.locationinfos[0].department = locationdata.body.department_name;
                        }
                    } catch (err) {
                        console.log(err, "erraaaa");
                    }
                }
            }
            if (adminData != null && adminData != '') {
                if (adminData?.profile_pic) {
                    let element = adminData?.profile_pic
                    const resData = await getDocument(element)
                    adminData.profile_pic = resData

                } else {
                    adminData.profile_pic = ""
                }

                if (adminData?.company_logo) {
                    let element = adminData?.company_logo
                    const resData = await getDocument(element)
                    adminData.company_logo = resData

                } else {
                    adminData.company_logo = ""
                }
            }

            const deviceExist = await Otp2fa.findOne({ uuid, for_portal_user: portalUserData?._id, verified: true }).lean();
            if (!deviceExist || portalUserData?.verified !== true) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        otp_verified: false,
                        token: null,
                        refreshToken: null,
                        user_details: {
                            portalUserData,
                            adminData
                        }
                    },
                    message: "OTP verification pending 2fa",
                    errorCode: "VERIFICATION_PENDING",
                });
            }

            if (portalUserData.role == "INSURANCE_ADMIN") {
                if (adminData.verify_status !== "APPROVED") {
                    const currentDate = new Date();
                    const formattedDate = currentDate.toISOString();
                    let addLogs = {};
                    let saveLogs = {};
                 
                        addLogs = new Logs({
                            userName: portalUserData?.user_name,
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
                                adminData,
                                savedLogId
                            }
                        },
                        message: "Super-admin not approved yet",
                        errorCode: "PROFILE_NOT_APPROVED",
                    });
                }
            }

            if (portalUserData?.role == "INSURANCE_STAFF") {
                adminData = await StaffInfo.findOne({
                    for_portal_user: portalUserData._id,
                }).populate({
                    path: "role"
                });


                let checkInsurance = await AdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(adminData?.for_user) })

                adminData = Object.assign({}, adminData._doc, {
                    adminCompanyName: checkInsurance?.company_name,

                });
            }

            const tokenClaims = {
                _id: portalUserData._id,
                email: portalUserData.email,
                role: portalUserData.role,
                uuid
            }
            // createSession(req, portalUserData);

            if (portalUserData.role == "INSURANCE_ADMIN") {
                if (adminData?.isInfoCompleted === false) {
                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            otp_verified: portalUserData.verified,
                            user_details: {
                                portalUserData,
                                adminData
                            }
                        },
                        message: "Fill Profile Details",
                        errorCode: "FILL PROFILE DETAILS",
                    });
                }
            }
            // logs
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            let addLogs = {};
            let saveLogs = {};
            if (portalUserData.role == "INSURANCE_ADMIN") {
                addLogs = new Logs({
                    userName: portalUserData?.user_name,
                    userId: portalUserData?._id,
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

                });
                saveLogs = await addLogs.save();
            } else {
                let checkAdmin = await AdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(adminData?.for_user) })
                addLogs = new Logs({
                    userName: portalUserData?.user_name,
                    userId: portalUserData?._id,
                    adminData: {
                        adminId: adminData?.for_user,
                        company_name: checkAdmin?.company_name
                    },
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,
                });
                saveLogs = await addLogs.save();
            }
            const savedLogId = saveLogs ? saveLogs._id : null;

            return sendResponse(req, res, 200, {
                status: true,
                body: {
                    otp_verified: portalUserData.verified,
                    token: generateToken(tokenClaims),
                    refreshToken: generateRefreshToken(tokenClaims),
                    user_details: {
                        portalUserData,
                        adminData,
                        savedLogId
                    }
                },
                message: "Insurance login done",
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
    };

    // async adminLogin(req, res) {
    //     try {
    //         const { email, password } = req.body;
    //         const { uuid, role } = req.headers;
    //         const portalUserData = await PortalUser.findOne({ email: email.toLowerCase(), isDeleted: false }).lean();

    //         if (!portalUserData) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User not found",
    //                 errorCode: "USER_NOT_FOUND",
    //             });
    //         }

    //         const isPasswordMatch = await checkPassword(password, portalUserData);
    //         if (!isPasswordMatch) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "Credential not matched",
    //                 errorCode: "INCORRECT_PASSWORD",
    //             });
    //         }

    //         portalUserData.password = undefined

    //         if (portalUserData.lock_user === true) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User temporarily locked",
    //                 errorCode: "USER_LOCKED",
    //             });
    //         }

    //         var adminData
    //         adminData = await AdminInfo.findOne({
    //             for_portal_user: portalUserData._id,
    //         }).lean();


    //         if (adminData != null) {
    //             if (adminData?.profile_pic) {
    //                 let element = adminData?.profile_pic
    //                 const resData = await getDocument(element)
    //                 adminData.profile_pic = resData

    //             } else {
    //                 adminData.profile_pic = ""
    //             }

    //             if (adminData?.company_logo) {
    //                 let element = adminData?.company_logo
    //                 const resData = await getDocument(element)
    //                 adminData.company_logo = resData

    //             } else {
    //                 adminData.company_logo = ""
    //             }
    //         }

    //         const deviceExist = await Otp2fa.findOne({ uuid, for_portal_user: portalUserData._id, verified: true }).lean();
    //         if (!deviceExist || portalUserData.verified !== true) {
    //             return sendResponse(req, res, 200, {
    //                 status: true,
    //                 body: {
    //                     otp_verified: false,
    //                     token: null,
    //                     refreshToken: null,
    //                     user_details: {
    //                         portalUserData,
    //                         adminData
    //                     }
    //                 },
    //                 message: "OTP verification pending 2fa",
    //                 errorCode: "VERIFICATION_PENDING",
    //             });
    //         }

    //         if (portalUserData.role == "INSURANCE_ADMIN") {
    //             if (adminData.verify_status !== "APPROVED") {
    //                 return sendResponse(req, res, 200, {
    //                     status: true,
    //                     body: {
    //                         otp_verified: portalUserData.verified,
    //                         token: null,
    //                         refreshToken: null,
    //                         user_details: {
    //                             portalUserData,
    //                             adminData
    //                         }
    //                     },
    //                     message: "Super-admin not approved yet",
    //                     errorCode: "PROFILE_NOT_APPROVED",
    //                 });
    //             }
    //         }

    //         if (portalUserData.role == "INSURANCE_STAFF") {
    //             adminData = await StaffInfo.findOne({
    //                 for_portal_user: portalUserData._id,
    //             }).populate({
    //                 path: "role"
    //             })
    //         }

    //         const tokenClaims = {
    //             _id: portalUserData._id,
    //             email: portalUserData.email,
    //             role: portalUserData.role,
    //             uuid
    //         }
    //         // createSession(req, portalUserData);

    //         if (portalUserData.role == "INSURANCE_ADMIN") {
    //             if (adminData?.isInfoCompleted === false) {
    //                 return sendResponse(req, res, 200, {
    //                     status: true,
    //                     body: {
    //                         otp_verified: portalUserData.verified,
    //                         user_details: {
    //                             portalUserData,
    //                             adminData
    //                         }
    //                     },
    //                     message: "Fill Profile Details",
    //                     errorCode: "FILL PROFILE DETAILS",
    //                 });
    //             }
    //         }


    //         return sendResponse(req, res, 200, {
    //             status: true,
    //             body: {
    //                 otp_verified: portalUserData.verified,
    //                 token: generateToken(tokenClaims),
    //                 refreshToken: generateRefreshToken(tokenClaims),
    //                 user_details: {
    //                     portalUserData,
    //                     adminData
    //                 }
    //             },
    //             message: "Insurance login done",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error)
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: error,
    //             message: "Internal server error",
    //             errorCode: null,
    //         });
    //     }
    // };

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

    async sendSmsOtpFor2fa(req, res) {
        try {
            const { email } = req.body;
            const { uuid } = req.headers;
            const portalUserData = await PortalUser.findOne({ email, isDeleted: false }).lean();
            if (!portalUserData) {
                return sendResponse(req, res, 200, {
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
                return sendResponse(req, res, 200, {
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
                    result = await otpData.save();
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

    async matchEmailOtpFor2fa(req, res) {
        try {
            const { email, otp } = req.body;
            const { uuid, role } = req.headers;

            const portalUserData = await PortalUser.findOne({
                email: email, isDeleted: false
            }).lean();

            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "user not exist",
                    errorCode: null,
                });
            }
            const data = await Otp2fa.findOne({ uuid, email, for_portal_user: portalUserData._id, verified: false })

            if (data) {


                if (data.otp == otp) {
                    const updateVerified = await PortalUser.findOneAndUpdate(
                        { _id: portalUserData._id },
                        {
                            $set: {
                                verified: true,
                            },
                        },
                        { new: true }
                    ).exec();
                    const updateVerifiedUUID = await Otp2fa.findOneAndUpdate(
                        { uuid, email, for_portal_user: portalUserData._id, verified: false },
                        {
                            $set: {
                                verified: true,
                            },
                        },
                        { new: true }
                    ).exec();
                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            token: generateToken({ _id: portalUserData._id, email: portalUserData.email, role }),
                            refreshToken: generateRefreshToken({ _id: portalUserData._id, email: portalUserData.email, role }),
                            role,
                            portalUserData
                        },
                        message: "OTP matched",
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 200, {
                        status: false,
                        message: "OTP not matched",
                        errorCode: null,
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    message: "OTP expired",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }

    async matchSmsOtpFor2fa(req, res) {
        try {
            const { otp, for_portal_user } = req.body;
            const { uuid } = req.headers;
            const portalUserData = await PortalUser.findOne({ _id: for_portal_user }).lean();
            if (!portalUserData) {
                return sendResponse(req, res, 422, {
                    status: false,
                    body: null,
                    message: "user not exist",
                    errorCode: null,
                });
            }
            const otpResult = await Otp2fa.findOne({ uuid, for_portal_user, mobile: portalUserData.mobile, verified: false });
            if (otpResult) {

                if (otpResult.otp == otp) {
                    // req.session.ph_verified = true;
                    const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, for_portal_user, mobile: portalUserData.mobile, verified: false }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();

                    let adminData = await AdminInfo.findOne({ for_portal_user }).lean();

                    if (portalUserData.role == "INSURANCE_ADMIN") {
                        if (adminData?.isInfoCompleted === false) {
                            return sendResponse(req, res, 200, {
                                status: true,
                                body: {
                                    id: updateVerified._id,
                                    uuid: updateVerifiedUUID._id
                                },
                                message: "OTP matched",
                                errorCode: "FILL PROFILE DETAILS",
                            });
                        }
                    }

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

    async craeteInsuranceProfile(req, res) {
        try {
            const { userId } = req.body;
            let userFind = await InsuranceUser.findOne({ userId });
            if (userFind) {
                req.body.userId = userFind.userId
                req.body.objectId = userFind._id
                req.body.companyLogo = req.file.filename
                let userData = new InsuranceCompanyDetail(
                    req.body
                );
                let createdProfile = await userData.save();

                sendResponse(req, res, 200, {
                    status: true,
                    body: createdProfile,
                    message: "successfully Create Profile",
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };

    async editInsuranceProfile(req, res) {
        const {
            id,
            profile_pic,
            email,
            full_name,
            first_name,
            middle_name,
            last_name,
            dob,
            language,
            address,
            neighborhood,
            country,
            region,
            province,
            department,
            city,
            village,
            pincode,
            company_logo,
            company_name,
            company_slogan,
            company_type,
            other_company_type_name,
            company_address,
            head_Office_address,
            capital,
            fax,
            laws_governing,
            office_phone,
            ifu_number,
            rccm_number,
            other_company_number,
            banking_reference,
            country_code,
            phone,
            bank_name,
            bank_accName,
            accountNumber,
            bank_ifsc,
            bank_address,
            mobile_pay_details
        } = req.body;
        console.log(mobile_pay_details, "reeeeeeeee---->", req.body);
        try {
            const findUser = await PortalUser.findOne({ _id: id })
            const isExist = await PortalUser.findOne({ email: email, _id: { $ne: id }, isDeleted: false });
            if (isExist) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Email Already Exist",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
            const PortalUserDetails = await PortalUser.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        email: email,
                        user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name,
                        country_code: country_code,
                        mobile: phone,
                        profile_picture: profile_pic

                    },
                },
                { upsert: false, new: true }
            )
            const getLocationData = await LoctationInfo.findOne({ for_portal_user: id })
            if (getLocationData) {
                var updatedLocationDetails = await LoctationInfo.findOneAndUpdate(
                    { for_portal_user: findUser._id },
                    {
                        address: address == '' ? null : address,
                        neighborhood: neighborhood == '' ? null : neighborhood,
                        country: country == '' ? null : country,
                        region: region == '' ? null : region,
                        province: province == '' ? null : province,
                        department: department == '' ? null : department,
                        city: city == '' ? null : city,
                        village: village == '' ? null : village,
                        pincode: pincode == '' ? null : pincode,
                    },
                    { new: true }
                );
            } else {
                let locationData = new LoctationInfo(
                    {
                        address: address == '' ? null : address,
                        neighborhood: neighborhood == '' ? null : neighborhood,
                        country: country == '' ? null : country,
                        region: region == '' ? null : region,
                        province: province == '' ? null : province,
                        department: department == '' ? null : department,
                        city: city == '' ? null : city,
                        village: village == '' ? null : village,
                        pincode: pincode == '' ? null : pincode,
                        for_portal_user: id
                    }
                );
                var updatedLocationDetails = await locationData.save();
            }

            // Mobile Pay 
            let dataArray = []
            for (const data of mobile_pay_details) {
                if (data?.provider != '') {
                    dataArray.push({
                        provider: data.provider,
                        pay_number: data.pay_number,
                        mobile_country_code: data?.mobile_country_code
                    })
                }
            }
            let mobilePayResult
            const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: id } }).select('_id').exec();
            if (id && getMobilePayInfo.length > 0) {
                mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                    $set: { mobilePay: dataArray }
                }).exec();
            } else {
                const mobilePayData = new MobilePayInfo({
                    mobilePay: dataArray,
                    for_portal_user: id
                })
                mobilePayResult = await mobilePayData.save()
            }
            const mobile_pay_object_id = mobilePayResult?._id

            let updatedInsuranceAdminDetails = await AdminInfo.findOneAndUpdate(
                { for_portal_user: findUser._id },
                {
                    full_name: first_name + " " + middle_name + " " + last_name,
                    first_name,
                    middle_name,
                    last_name,
                    dob,
                    language,
                    in_location: updatedLocationDetails._id,
                    profile_pic,
                    company_logo,
                    company_name,
                    company_slogan,
                    company_type,
                    other_company_type_name,
                    company_address,
                    head_Office_address,
                    capital,
                    fax,
                    laws_governing,
                    office_phone,
                    ifu_number,
                    rccm_number,
                    other_company_number,
                    banking_reference,
                    bank_name,
                    bank_accName,
                    accountNumber,
                    bank_ifsc,
                    bank_address,
                    for_portal_user: id,
                    isInfoCompleted: true,
                    in_mobile_pay: mobile_pay_object_id
                },
                { new: true }
            );

            const locationinfos = await LocationInfo.find({ for_portal_user: findUser?._id });

            const updatedAdminDetails = {
                ...updatedInsuranceAdminDetails.toObject(), // Convert to plain JavaScript object
                locationinfos: locationinfos.map(location => location.toObject()),
            };

            if (updatedAdminDetails?.locationinfos.length > 0) {
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
                        updatedAdminDetails.locationinfos[0].country = {
                            countryname: locationdata?.body?.country_name,
                            country_iso_code: locationdata?.body?.country_iso_code,
                        };
                        updatedAdminDetails.locationinfos[0].region = locationdata?.body?.region_name;
                        updatedAdminDetails.locationinfos[0].province = locationdata?.body?.province_name;
                        updatedAdminDetails.locationinfos[0].village = locationdata?.body?.village_name;
                        updatedAdminDetails.locationinfos[0].city = locationdata?.body?.city_name;
                        updatedAdminDetails.locationinfos[0].department = locationdata?.body?.department_name;
                    }
                } catch (err) {
                    console.log(err, "erraaaa");
                }
            }

            if (updatedAdminDetails != null && updatedAdminDetails != '') {
                if (updatedAdminDetails?.profile_pic) {
                    let element = updatedAdminDetails?.profile_pic
                    const resData = await getDocument(element)
                    updatedAdminDetails.profile_pic = resData

                } else {
                    updatedAdminDetails.profile_pic = ""
                }

                if (updatedAdminDetails?.company_logo) {
                    let element = updatedAdminDetails?.company_logo
                    const resData = await getDocument(element)
                    updatedAdminDetails.company_logo = resData

                } else {
                    updatedAdminDetails.company_logo = ""
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                body: { updatedAdminDetails, PortalUserDetails },
                message: "Successfully Updated Company Details",
                errorCode: null,
            });
        } catch (error) {
            console.log("errorerror", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to update profile",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };

    async uploadDocument(req, res) {
        try {
            const { userId, docType, multiple } = req.body;
            let result = null;
            if (multiple == "true") {
                let tempResult = [];
                req.files.docName.forEach(doc => {
                    let s3result = uploadFile(doc.data, {
                        Bucket: "healthcare-crm-stage-docs",
                        Key: `insurance/${userId}/${docType}/${doc.name}`,
                    });
                    tempResult.push(s3result);
                });
                result = await Promise.all(tempResult);
            } else {
                console.log("--->", req.files);
                // return
                if (req.files) {


                    if (userId == 'subscriberProfile') {
                        result = await uploadFile(req.files.docName.data, {
                            Bucket: "healthcare-crm-stage-docs",
                            Key: `insurance/${docType}/${req.files.docName.name}`,
                        });
                    } else {
                        result = await uploadFile(req.files.docName.data, {
                            Bucket: "healthcare-crm-stage-docs",
                            Key: `insurance/${userId}/${docType}/${req.files.docName.name}`,
                        });
                    }

                }
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

    async changePassword(req, res) {
        const { id, old_password, new_password } = req.body;
        if (old_password === new_password) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "New password shouldn't be same as old password.",
                errorCode: "PASSWORD_MATCHED",
            });
        }
        try {
            const findUser = await PortalUser.findOne({ _id: id })
            const isPasswordMatch = await checkPassword(old_password, findUser);
            if (!isPasswordMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Incorrect Old Password.",
                    errorCode: null,
                });
            }
            const isPasswordNewMatch = await checkPassword(new_password, findUser);
            if (isPasswordNewMatch) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "This is Previous password. Enter New Password.",
                    errorCode: null,
                });
            }

            const salt = await bcrypt.genSalt(10);
            let hashPassword = await bcrypt.hash(new_password, salt);
            let changedPassword = await PortalUser.findOneAndUpdate(
                { _id: id },
                { password: hashPassword },
                { new: true }
            );
            sendResponse(req, res, 200, {
                status: true,
                body: changedPassword,
                message: "Successfully change password",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };

    async getInsuranceAdminNotApprovedListSuperadmin(req, res) {
        try {
            const { limit, page, searchText, startDate, endDate } = req.query;
            // Match stage to filter documents by verify_status and for_portal_user.isDeleted

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            const matchStage = {
                $match: {
                    verify_status: "PENDING",
                    "for_portal_user.isDeleted": false
                }
            };

            // Optional match stage for searchText
            if (searchText != "") {
                matchStage.$match.company_name = { $regex: searchText || '', $options: "i" };
            }

            // Optional match stage for date range
            if (startDate != "" && endDate != "") {
                matchStage.$match.createdAt = { $gt: startDate, $lt: endDate };
            }

            // Aggregation pipeline
            const pipeline = [
                {
                    $lookup: {
                        from: "portalusers", // Replace with your actual collection name
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                {
                    $unwind: "$for_portal_user"
                },
                matchStage,
                {
                    $lookup: {
                        from: "locationinfos", // Replace with the actual collection name for in_location
                        localField: "in_location",
                        foreignField: "_id",
                        as: "in_location"
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
            ];

            const totalCount = await AdminInfo.aggregate(pipeline);

            if (limit != 0) {
                pipeline.push(
                    {
                        $sort: sortingarray
                    },
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await AdminInfo.aggregate(pipeline);

            // const count = result.length;

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(totalCount / limit),
                    currentPage: page,
                    totalRecords: totalCount.length,
                    result,
                },
                message: "successfully fetched not approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch not approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminNotApprovedList(req, res) {
        try {
            const { limit, page, searchText, startDate, endDate } = req.query;
            var filter = { verify_status: "PENDING" }


            if (searchText != "") {
                filter.company_name = { $regex: searchText || '', $options: "i" }
            }

            if (startDate != "" && endDate != "") {
                filter.createdAt = { $gt: startDate }
                filter.createdAt = { $gt: endDate }
            }
            console.log(filter, "Filter");
            const result = await AdminInfo.find(filter)
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, mobile: 1 },
                })
                .populate({
                    path: "in_location",
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = result.length
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched not approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch not approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceDetails(req, res) {
        try {
            const { id } = req.query;
            const result = await AdminInfo.findOne({ for_portal_user: id })
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, mobile: 1, country_code: 1, notification: 1 },
                })
                .populate({
                    path: "in_location",
                })
                .populate({
                    path: "in_mobile_pay",
                })

            let obj = {
                ...result._doc
            }

            if (obj?.profile_pic) {
                let element = obj?.profile_pic
                const resData = await getDocument(element)
                obj.profile_pic_signed_url = resData

            } else {
                obj.profile_pic_signed_url = ""
            }

            if (obj?.company_logo) {
                let element = obj?.company_logo
                const resData = await getDocument(element)
                obj.company_logo_signed_url = resData

            } else {
                obj.company_logo_signed_url = ""
            }


            sendResponse(req, res, 200, {
                status: true,
                body: obj,
                message: "successfully fetched insurance admin details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched insurance admin details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async updatesuperadminpermission(req, res) {
        try {

            const { id, allowHealthPlan, allowSubscription } = req.body;

            let updatepermission = await AdminInfo.findOneAndUpdate(
                { for_portal_user: id },
                { $set: { allowHealthPlan: allowHealthPlan, allowSubscription: allowSubscription } },
                { new: true }
            );

            if (updatepermission) {

                sendResponse(req, res, 200, {
                    status: true,
                    body: updatepermission,
                    message: "successfully fetched super admin permissions",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 400, {
                    status: false,
                    body: updatepermission,
                    message: "something went wrong",
                    errorCode: null,
                });
            }
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched super admin permissions",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceDetailsByPortalId(req, res) {
        try {
            const { portal_id } = req.query;
            const portalData = await PortalUser.findOne({ _id: portal_id })
            const adminData = await AdminInfo.findOne({ for_portal_user: portal_id })

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    portalData,
                    adminData
                },
                message: "successfully fetched insurance admin details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched insurance admin details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async approveOrRejectInsuranceAdmin(req, res) {
        const { action, id, approved_or_rejected_by } = req.body
        let status;
        let date = null
        let verify_status;
        if (action === 1) {
            status = 'Approved'
            verify_status = 'APPROVED'
            const cdate = new Date()
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1}-${cdate.getDate()}`
        } else {
            status = 'Rejected'
            verify_status = 'DECLINED'
            const cdate = new Date()
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1}-${cdate.getDate()}`
        }

        try {
            const updatedAdminData = await AdminInfo.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        verify_status,
                        approved_at: date,
                        approved_or_rejected_by
                    },
                },
                { upsert: false, new: true }
            )
            if (action === 1) {
                // const roleInput = [
                //     {
                //         name: "Receptionist",
                //         status: true,
                //         for_user: updatedAdminData.for_portal_user
                //     },
                //     {
                //         name: "Medical Advisor",
                //         status: true,
                //         for_user: updatedAdminData.for_portal_user
                //     },
                //     {
                //         name: "Contract Advisor",
                //         status: true,
                //         for_user: updatedAdminData.for_portal_user
                //     },
                //     {
                //         name: "CFO",
                //         status: true,
                //         for_user: updatedAdminData.for_portal_user
                //     },
                // ]
                // const roleData = await Role.insertMany(roleInput)
            }

            sendResponse(req, res, 200, {
                status: true,
                body: { updatedAdminData },
                message: `${status} insurance admin`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: `failed to ${status} insurance admin request`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async setInsuranceTemplate(req, res) {
        try {
            const { _id, template_id, card_preview_id } = req.body;
            //console.log(_id,"_iddd",template_id,"template_idd___",card_preview_id);
            const findUser = await AdminInfo.findOneAndUpdate({ _id }, { template_id: template_id, card_preview_id: card_preview_id }, { new: true })
            //console.log(findUser,"findUserrrr________");
            if (!findUser) {
                return handleRejectionError(res, { message: messages.internalError }, messageID.internalServerError)
            }
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Insurance template set",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorr_________");
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: `failed to set insurance template`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminApprovedListSuperadmin(req, res) {
        try {
            const { limit, page, searchText, startDate, endDate } = req.query;
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }
            // Match stage to filter documents by verify_status and for_portal_user.isDeleted
            const matchStage = {
                $match: {
                    verify_status: "APPROVED",
                    "for_portal_user.isDeleted": false
                }
            };

            // Optional match stage for searchText
            if (searchText != "") {
                matchStage.$match.company_name = { $regex: searchText || '', $options: "i" };
            }

            // Optional match stage for date range
            if (startDate != "" && endDate != "") {
                matchStage.$match.createdAt = { $gt: startDate, $lt: endDate };
            }

            // Aggregation pipeline
            const pipeline = [
                {
                    $lookup: {
                        from: "portalusers", // Replace with your actual collection name
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                {
                    $unwind: "$for_portal_user"
                },
                matchStage,
                {
                    $lookup: {
                        from: "locationinfos", // Replace with the actual collection name for in_location
                        localField: "in_location",
                        foreignField: "_id",
                        as: "in_location"
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
            ];

            const totalCount = await AdminInfo.aggregate(pipeline);

            if (limit != 0) {
                pipeline.push(
                    {
                        $sort: sortingarray
                    },
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await AdminInfo.aggregate(pipeline);

            // const count = result.length;

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(totalCount / limit),
                    currentPage: page,
                    totalRecords: totalCount.length,
                    result,
                },
                message: "successfully fetched not approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrrrrrr______");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch not approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminApprovedList(req, res) {
        try {
            const { limit, page, isDeleted } = req.query;
            console.log("req.query-->", req.query);
            let filter = { verify_status: "APPROVED" }
            if (isDeleted != undefined && isDeleted != "") {
                filter["for_portal_user.isDeleted"] = {
                    $ne: Boolean(isDeleted)
                }
            }
            const pipeline = [
                {
                    $lookup: {
                        from: "portalusers", // Replace with your actual collection name
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                {
                    $unwind: "$for_portal_user"
                },
                {
                    $match: filter
                }

            ];

            const count = await AdminInfo.aggregate(pipeline);

            if (limit != 0) {
                pipeline.push(
                    {
                        $sort: { createdAt: -1 }
                    },
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await AdminInfo.aggregate(pipeline);
            // const result = await AdminInfo.find(filter)
            //     .populate({
            //         path: "for_portal_user",
            //         select: { _id: 1, email: 1, mobile: 1 },
            //     })
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            // const count = await AdminInfo.countDocuments(filter);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminAllowedApprovedList(req, res) {
        try {
            const { limit, page } = req.query;
            let obj = { verify_status: "APPROVED" }
            if (req.query.type == 'Healthplan') {
                obj.allowHealthPlan = true;
            }
            else if (req.query.type == 'Subcribers') {
                obj.allowSubscription = true;

            }
            const result = await AdminInfo.find(obj)
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, mobile: 1 },
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await AdminInfo.countDocuments(obj);
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminRejectList(req, res) {
        try {
            const { limit, page } = req.query;
            const result = await AdminInfo.find({ verify_status: "DECLINED" })
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, mobile: 1 },
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await AdminInfo.countDocuments({
                verify_status: "DECLINED",
            });
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched rejected insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch rejected insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceAdminRejectListSuperadmin(req, res) {
        try {
            const { limit, page, searchText, startDate, endDate } = req.query;
            // Match stage to filter documents by verify_status and for_portal_user.isDeleted
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }
            const matchStage = {
                $match: {
                    verify_status: "DECLINED",
                    "for_portal_user.isDeleted": false
                }
            };

            // Optional match stage for searchText
            if (searchText != "") {
                matchStage.$match.company_name = { $regex: searchText || '', $options: "i" };
            }

            // Optional match stage for date range
            if (startDate != "" && endDate != "") {
                matchStage.$match.createdAt = { $gt: startDate, $lt: endDate };
            }

            // Aggregation pipeline
            const pipeline = [
                {
                    $lookup: {
                        from: "portalusers", // Replace with your actual collection name
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                {
                    $unwind: "$for_portal_user"
                },
                matchStage,
                {
                    $lookup: {
                        from: "locationinfos", // Replace with the actual collection name for in_location
                        localField: "in_location",
                        foreignField: "_id",
                        as: "in_location"
                    }
                },
                { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
            ];

            const totalCount = await AdminInfo.aggregate(pipeline);

            if (limit != 0) {
                pipeline.push(
                    {
                        $sort: sortingarray
                    },
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 })
            }

            const result = await AdminInfo.aggregate(pipeline);

            // const count = result.length;

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(totalCount / limit),
                    currentPage: page,
                    totalRecords: totalCount.length,
                    result,
                },
                message: "successfully fetched not approved insurance admin list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch not approved insurance admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
        // try {
        //     const { limit, page } = req.query;
        //     const result = await AdminInfo.find({ verify_status: "DECLINED" })
        //         .populate({
        //             path: "for_portal_user",
        //             select: { _id: 1, email: 1, mobile: 1 },
        //         })
        //         .sort([["createdAt", -1]])
        //         .limit(limit * 1)
        //         .skip((page - 1) * limit)
        //         .exec();
        //     const count = await AdminInfo.countDocuments({
        //         verify_status: "DECLINED",
        //     });
        //     sendResponse(req, res, 200, {
        //         status: true,
        //         body: {
        //             totalPages: Math.ceil(count / limit),
        //             currentPage: page,
        //             totalRecords: count,
        //             result,
        //         },
        //         message: "successfully fetched rejected insurance admin list",
        //         errorCode: null,
        //     });
        // } catch (error) {
        //     sendResponse(req, res, 500, {
        //         status: false,
        //         body: null,
        //         message: "failed to fetch rejected insurance admin list",
        //         errorCode: "INTERNAL_SERVER_ERROR",
        //     });
        // }
    }

    async getInsuranceTemplateList(req, res) {
        try {
            const templateList = await Template.find()
            sendResponse(req, res, 200, {
                status: true,
                body: templateList,
                message: "get insurance template list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: `failed to get insurance list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInsuranceTemplateDetails(req, res) {
        const { insuranceId } = req.query
        try {
            const templateDetails = await AdminInfo.findOne({ for_portal_user: insuranceId }, { template_id: 1, _id: 0 })
                .populate({
                    path: "template_id"
                })
            sendResponse(req, res, 200, {
                status: true,
                body: templateDetails,
                message: "get insurance template details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: `failed to get insurance details`,
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

    async resetForgotPassword(req, res) {
        try {
            const { user_id, resetToken, newPassword } = req.body
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
                    body: { hashPassword },
                    message: "New password set successfully",
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


    //-----------------------------------------------------------------------------------------------------------------------------------Staff----------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



    async addStaff(req, res) {
        const {
            staff_name,
            staff_profile,
            first_name,
            middle_name,
            last_name,
            dob,
            language,
            address,
            neighbourhood,
            country,
            region,
            province,
            department,
            city,
            village,
            pincode,
            degree,
            country_code,
            phone,
            email,
            role,
            userName,
            password,
            aboutStaff,
            for_user,
            added_by,
            dateofcreation
        } = req.body;
        // console.log(req.body, "req.body______");
        try {
            const checkUser = await PortalUser.findOne({ _id: for_user });
            let staffCount = {};
            let checkPlan = {};
            if (checkUser?.role === 'INSURANCE_STAFF') {
                staffCount = await PortalUser.countDocuments({ staff_createdBy: checkUser?.staff_createdBy, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: checkUser?.staff_createdBy });
            } else {
                staffCount = await PortalUser.countDocuments({ staff_createdBy: added_by, isDeleted: false });
                checkPlan = await SubscriptionPurchaseStatus.find({ for_user: for_user });
            }

            let staffDetails;
            let checkCondition;
            checkCondition = await getData(checkPlan);

            if (checkCondition?.statusData === "active") {
                // for (const data of checkPlan) {
                let shouldAddStaff = false;
                for (const data12 of checkCondition?.data1?.services) {
                    if (data12?.name === 'staff' && data12?.is_unlimited === false) {
                        if (staffCount < data12?.max_number) {
                            shouldAddStaff = true;
                            break; // Exit the inner loop if conditions are satisfied
                        } else {
                            return sendResponse(req, res, 200, {
                                status: false,
                                body: null,
                                message: "Unable to add Staff. As Staff Maximum limit has exceeded as per your purchased plan.",
                                errorCode: null,
                            });
                        }
                    }
                }

                if (shouldAddStaff) {
                    const selectedLanguagesArray = JSON.parse(language);
                    const selectedRoleArray = JSON.parse(role);
                    let userFind = await PortalUser.findOne(
                        {
                            email: email.toLowerCase(),
                            isDeleted: false
                        }
                    );
                    if (userFind) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: userFind,
                            message: "Staff already exist",
                            errorCode: null,
                        });
                    }
                    const salt = await bcrypt.genSalt(10);
                    let newPassword = await bcrypt.hash(password, salt);
                    var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
                    let userData = new PortalUser(
                        {
                            user_id: sequenceDocument.sequence_value,
                            user_name: first_name + " " + middle_name + " " + last_name,
                            email,
                            mobile: phone,
                            country_code: country_code,
                            role: "INSURANCE_STAFF",
                            password: newPassword,
                            verified: false,
                            profile_picture: staff_profile,
                            staff_createdBy: added_by
                        }
                    );
                    let userDetails = await userData.save();
                    let locatiionData = new LoctationInfo({
                        address,
                        neighbourhood,
                        pincode,
                        country: country == '' ? null : country,
                        city: city == '' ? null : city,
                        region: region == '' ? null : region,
                        province: province == '' ? null : province,
                        department: department == '' ? null : department,
                        village: village == '' ? null : village,
                        for_portal_user: userDetails._id
                    }
                    );
                    let locationDetails = await locatiionData.save();
                    let staffData = new StaffInfo(
                        {
                            staff_name: first_name + " " + middle_name + " " + last_name,
                            first_name,
                            middle_name,
                            last_name,
                            dob,
                            language: selectedLanguagesArray,
                            in_location: locationDetails?._id,
                            degree,
                            role: selectedRoleArray,
                            about: aboutStaff,
                            for_user,
                            staff_profile,
                            for_portal_user: userDetails._id,
                            added_by,
                            dateofcreation
                        }
                    );
                    staffDetails = await staffData.save()
                    const content = sendStaffDetails(email, password, 'Insuarnce');

                    let checkerror = await sendEmail(content);

                } else {
                    const selectedLanguagesArray = JSON.parse(language);
                    const selectedRoleArray = JSON.parse(role);
                    let userFind = await PortalUser.findOne(
                        {
                            email: email.toLowerCase(),
                            isDeleted: false
                        }
                    );
                    if (userFind) {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: userFind,
                            message: "Staff already exist",
                            errorCode: null,
                        });
                    }
                    const salt = await bcrypt.genSalt(10);
                    let newPassword = await bcrypt.hash(password, salt);
                    var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
                    let userData = new PortalUser(
                        {
                            user_id: sequenceDocument.sequence_value,
                            user_name: first_name + " " + middle_name + " " + last_name,
                            email,
                            mobile: phone,
                            country_code: country_code,
                            role: "INSURANCE_STAFF",
                            password: newPassword,
                            verified: false,
                            profile_picture: staff_profile,
                            staff_createdBy: for_user
                        }
                    );
                    let userDetails = await userData.save();
                    let locatiionData = new LoctationInfo({
                        address,
                        neighbourhood,
                        pincode,
                        country: country == '' ? null : country,
                        city: city == '' ? null : city,
                        region: region == '' ? null : region,
                        province: province == '' ? null : province,
                        department: department == '' ? null : department,
                        village: village == '' ? null : village,
                        for_portal_user: userDetails._id
                    }
                    );
                    let locationDetails = await locatiionData.save();
                    let staffData = new StaffInfo(
                        {
                            staff_name: first_name + " " + middle_name + " " + last_name,
                            first_name,
                            middle_name,
                            last_name,
                            dob,
                            language: selectedLanguagesArray,
                            in_location: locationDetails?._id,
                            degree,
                            role: selectedRoleArray,
                            about: aboutStaff,
                            for_user,
                            staff_profile,
                            for_portal_user: userDetails._id,
                        }
                    );
                    staffDetails = await staffData.save()
                    const content = sendStaffDetails(email, password, 'Insuarnce');

                    let checkerror = await sendEmail(content);
                }
                // }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: staffDetails,
                message: "successfully add staff",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to add staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editStaff(req, res) {
        const {
            id,
            staff_name,
            first_name,
            middle_name,
            last_name,
            email,
            dob,
            language,
            address,
            neighbourhood,
            country,
            region,
            province,
            department,
            city,
            village,
            pincode,
            degree,
            country_code,
            phone,
            role,
            userName,
            aboutStaff,
            staff_profile,
            for_user
        } = req.body;
        try {
            // const selectedLanguagesArray = JSON.parse(language);
            const selectedRoleArray = JSON.parse(role);
            var updatedPortalUserDetails = await PortalUser.updateOne(
                { _id: id },
                {
                    $set: {
                        user_name: first_name + " " + middle_name + " " + last_name,
                        country_code: country_code,
                        mobile: phone,
                        profile_picture: staff_profile,
                        staff_createdBy: for_user,
                        email:email
                    }
                }
            );
            var updatedLocationDetails = await LoctationInfo.updateOne(
                { for_portal_user: id },
                {
                    $set: {
                        address: address,
                        neighborhood: neighbourhood,
                        country: country == "" ? null : country,
                        region: region == "" ? null : region,
                        province: province == "" ? null : province,
                        department: department == "" ? null : department,
                        city: city == "" ? null : city,
                        village: village == '' ? null : village,
                        pincode: pincode,
                    }
                },
                { new: true }
            );

            var updatedStaffDetails = await StaffInfo.findOneAndUpdate(
                { for_portal_user: id },
                {
                    staff_name: first_name + " " + middle_name + " " + last_name,
                    first_name,
                    middle_name,
                    last_name,
                    dob,
                    language,
                    degree,
                    role: selectedRoleArray,
                    about: aboutStaff,
                    for_user,
                    staff_profile
                },
                { new: true }

            )
                .populate({
                    path: "for_portal_user",
                    select: { password: 0 },
                })
                .populate({
                    path: "in_location",
                })
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    updatedStaffDetails
                },
                message: "successfully update staff",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `failed to add staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllStaff(req, res) {
        try {
            const result = await StaffInfo.find({
                for_user: req.query.for_user,
                is_deleted: false,
            }).select('staff_name').populate({
                path: "for_portal_user",
                select: { verify_status: 1 },
                match: { isDeleted: false } // Add this match condition
            });
            // Filter out any documents where for_portal_user is null
            const filteredResult = result.filter(item => item.for_portal_user);
            sendResponse(req, res, 200, {
                status: true,
                body: filteredResult,
                message: "fetched all staff",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch insurance staff",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAllInsuranceStaff(req, res) {
        try {
            const { limit, page, role_id, staff_name, admin_id } = req.query;

            const filter = {
                for_user: admin_id,
                is_deleted: false,
                role: role_id,
            };

            if (staff_name) {
                filter.staff_name = {
                    "staff_name": { $regex: staff_name || '', $options: "i" }
                };
            }

            if (role_id === "all") {
                delete filter.role;
            }
            const result = await StaffInfo.find(filter)
                .populate({
                    path: "in_location",
                })
                .populate({
                    path: "role",
                })
                .populate({
                    path: "for_portal_user",
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();


            const count = await StaffInfo.countDocuments(filter);

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched all insurance staff list",
                errorCode: null,
            });
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

    async getAllInsuranceStaffforStaffmanagement(req, res) {
        try {
            var { page, limit, admin_id, role_id, searchKey } = req.query;

            let checkUser = await PortalUser.findOne(mongoose.Types.ObjectId(admin_id))


            if (checkUser.role == 'INSURANCE_STAFF') {

                let staffData = await Staffinfos.findOne({ for_portal_user: mongoose.Types.ObjectId(admin_id) })

                admin_id = staffData?.for_user

            }

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            console.log("sortingarray-----", sortingarray);
            var filter = {
                'for_portal_user.role': 'INSURANCE_STAFF',
                'for_portal_user.isDeleted': false,                
                for_user: mongoose.Types.ObjectId(admin_id),
                'role.status': true,
                'role.is_delete': 'No'
            };
            console.log(filter, "filter44");
            if (searchKey) {
                filter['staff_name'] = { $regex: searchKey || "", $options: "i" }
            }
            if (role_id) {
                filter['role._id'] = mongoose.Types.ObjectId(role_id)
            }
            // if (role_id) {
            //     filter['role._id'] = { $in: [mongoose.Types.ObjectId(role_id)] };
            // }
            let aggregate = [
                {
                    $lookup: {
                        from: "roles",
                        localField: "role",
                        foreignField: "_id",
                        as: "role",
                    }
                },
                { $unwind: "$role" },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                { $unwind: "$for_portal_user" },
                { $match: filter },
                {
                    $group: {
                        _id: '$_id', // Group by staff member ID
                        doj: { $first: '$doj' },
                        staff_name: { $first: '$staff_name' },
                        createdAt: { $first: '$createdAt' },
                        for_portal_user: { $first: '$for_portal_user' },
                        roles: { $push: '$role' } // Collect roles in an array
                    }
                },
                {
                    $project: {
                        _id: 0,
                        doj: 1,
                        staff_name: 1,
                        createdAt: 1,
                        roles: 1,
                        // role: {
                        //     name: "$role.name",
                        //     _id: "$role._id"
                        // },
                        for_portal_user: {
                            _id: '$for_portal_user._id',
                            country_code: '$for_portal_user.country_code',
                            email: '$for_portal_user.email',
                            isActive: '$for_portal_user.isActive',
                            lock_user: '$for_portal_user.lock_user',
                            phone_number: '$for_portal_user.mobile',
                            user_name: '$for_portal_user.user_name'
                        }
                    }
                },
            ];
            const totalCount = await StaffInfo.aggregate(aggregate);
            if (limit != 0) {
                aggregate.push(
                    {
                        $sort: sortingarray
                    },
                    { $skip: (page - 1) * limit },
                    { $limit: limit * 1 },

                )
            }
            const result = await StaffInfo.aggregate(aggregate);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: totalCount.length
                },
                message: `staff fetched successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getStaffDetails(req, res) {
        try {
            const { staff_id } = req.query;

            const staffData = await StaffInfo.findOne({ for_portal_user: staff_id })
                .populate({
                    path: "in_location",
                })
                .populate({
                    path: "role",
                })
                .populate({
                    path: "for_portal_user",
                    select: { password: 0 },
                })
                .exec();
            let documentURL = ''
            if (staffData && staffData.staff_profile) {
                console.log(staffData.staff_profile, "testtt");
                documentURL = await getFile({
                    Bucket: 'healthcare-crm-stage-docs',
                    Key: staffData.staff_profile,
                    Expires: 60 * 5
                })
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    staffData,
                    documentURL
                },
                message: "successfully fetched insurance staff details",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to fetch insurance staff details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async actionForStaff(req, res) {
        try {
            const { staff_id, action_name, action_value } = req.body
            let key;
            key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
            if (key) {
                const portalData = await PortalUser.findOneAndUpdate(
                    { _id: { $eq: staff_id } },
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
                    const staffinfo = await StaffInfo.findOneAndUpdate(
                        { for_portal_user: { $eq: staff_id } },
                        {
                            $set: {
                                is_deleted: true
                            }
                        },
                        { new: true },
                    )
                }
                if (action_name === "lock" && action_value) {
                    actionMessage = "locked"
                } else if (action_name === "lock" && !action_value) {
                    actionMessage = "unlocked"
                }

                sendResponse(req, res, 200, {
                    status: true,
                    data: portalData,
                    message: `hospital ${actionMessage} successfully`,
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
        // try {
        //     const { staff_id, action_name, action_value } = req.body
        //     console.log("req.body>>>>>>",req.body)
        //     const findUser = await PortalUser.findOne({ _id: staff_id })

        //     const filter = {}
        //     if (action_name == "active") filter['is_active'] = action_value
        //     if (action_name == "lock") filter['is_locked'] = action_value
        //     if (action_name == "delete") filter['is_deleted'] = action_value

        //     var updatedStaffDetails = await StaffInfo.updateOne(
        //         { for_portal_user: findUser._id },
        //         filter,
        //         { new: true }
        //     );
        //     console.log("updatedStaffDetails>>>>>>",updatedStaffDetails)
        //     sendResponse(req, res, 200, {
        //         status: true,
        //         body: updatedStaffDetails,
        //         message: `successfully ${action_name} insurance staff`,
        //         errorCode: null,
        //     });
        // } catch (error) {
        //     console.log(error);
        //     sendResponse(req, res, 500, {
        //         status: false,
        //         body: error,
        //         message: "failed to fetch insurance staff list",
        //         errorCode: "INTERNAL_SERVER_ERROR",
        //     });
        // }
    }

    async viewRes(req, res) {
        try {
            const { serverData } = req.body
            res.status(200).json(JSON.parse(decryptionData(serverData)));
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get view res",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceAssignPlan(req, res) {
        const {
            insuranceId,
            categories,
            exclusions,
            getDetails
        } = req.body
        try {
            const getInsuranceAssignPlan = await InsuranceAssignPlan.findOne({ insuranceId })
            if (getDetails != "") {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: getInsuranceAssignPlan,
                    message: `successfully get assign plan details for insurance`,
                    errorCode: null,
                });
            }
            var InsuranceAssignPlanData
            var action
            if (getInsuranceAssignPlan) {
                action = "updated"
                InsuranceAssignPlanData = await InsuranceAssignPlan.findOneAndUpdate(
                    { insuranceId },
                    {
                        categories,
                        exclusions
                    },
                    { new: true }
                )
            } else {
                action = "added"
                InsuranceAssignPlanData = new InsuranceAssignPlan(
                    {
                        insuranceId,
                        categories,
                        exclusions
                    }
                );
            }
            let InsuranceAssignPlanDetails = await InsuranceAssignPlanData.save();
            sendResponse(req, res, 200, {
                status: true,
                body: InsuranceAssignPlanDetails,
                message: `successfully ${action} assign plan to insurance`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to assign plan to insurance",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceAssignCategories(req, res) {
        const {
            insuranceId
        } = req.body
        let id = {}
        if (insuranceId !== "") {
            id = { insuranceId: { $eq: insuranceId } }
        }

        try {
            var getInsuranceAssignPlan = await InsuranceAssignPlan.findOne(id)
            var existData = []
            var singleCategory
            if (getInsuranceAssignPlan?.categories.length > 0) {
                for (let index = 0; index < getInsuranceAssignPlan?.categories.length; index++) {
                    singleCategory = await Category.findOne({ _id: getInsuranceAssignPlan.categories[index].categoryId })
                    existData.push(singleCategory)
                }
            }
            var name = "name"
            let uniqueCategory = [...new Map(existData.map((item) => [item[name], item])).values()];
            sendResponse(req, res, 200, {
                status: true,
                body: uniqueCategory,
                message: `successfully assign plan to insurance`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to assign plan to insurance",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceAssignCategoryService(req, res) {
        const {
            insuranceId,
            categoryId
        } = req.body
        try {
            var getInsuranceAssignPlan = await InsuranceAssignPlan.findOne({ insuranceId })
            var existData = []
            var y
            for (let index = 0; index < getInsuranceAssignPlan.categories.length; index++) {
                if (getInsuranceAssignPlan.categories[index].categoryId == categoryId) {
                    y = await CategoryService.findOne({ _id: getInsuranceAssignPlan.categories[index].categoryServiceId })
                    existData.push(y)
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: existData,
                message: `successfully assign plan to insurance`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to assign plan to insurance",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceAssignExclusion(req, res) {
        const {
            insuranceId,
        } = req.body
        let id = {};
        if (insuranceId !== "") {
            id = { insuranceId: { $eq: insuranceId } }
            // id=  {  for_user: { $eq: userId } }  
        }
        try {
            var getInsuranceAssignPlan = await InsuranceAssignPlan.findOne(id)
            var existData = []
            var singleExclusion
            if (getInsuranceAssignPlan?.exclusions.length > 0) {
                for (let index = 0; index < getInsuranceAssignPlan?.exclusions.length; index++) {
                    singleExclusion = await Exclusion.findOne({ _id: getInsuranceAssignPlan.exclusions[index].exclusionId })
                    existData.push(singleExclusion)
                }
            }

            var name = "name"
            let uniqueExclusion = [...new Map(existData.map((item) => [item[name], item])).values()];

            sendResponse(req, res, 200, {
                status: true,
                body: uniqueExclusion,
                message: `successfully assign plan to insurance`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to assign plan to insurance",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async insuranceAssignExclusionData(req, res) {
        const {
            insuranceId,
            exclusionId
        } = req.body
        try {
            var getInsuranceAssignPlan = await InsuranceAssignPlan.findOne({ insuranceId })
            var existData = []
            var singleExclusionData
            for (let index = 0; index < getInsuranceAssignPlan.exclusions.length; index++) {
                if (getInsuranceAssignPlan.exclusions[index].exclusionId == exclusionId) {
                    singleExclusionData = await ExclusionData.findOne({ _id: getInsuranceAssignPlan.exclusions[index].exclusionDataId })
                    existData.push(singleExclusionData)
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                body: existData,
                message: `successfully assign plan to insurance`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to assign plan to insurance",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async mangeClaimContentAddField(req, res) {
        const {
            fieldDataArray
        } = req.body
        try {
            const fieldDataList = fieldDataArray.map((singleData) => ({
                ...singleData,
            }));
            const result = await ClaimField.insertMany(fieldDataList);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully added claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to add claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getMangeClaimContentField(req, res) {
        console.log(req.query, "queryyyy");
        const {
            fieldType
        } = req.query
        try {
            const result = await ClaimField.find({ fieldType }).sort('sequence');
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully get claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async mangeClaimContent(req, res) {
        const {
            primaryClaimField,
            secondaryClaimField,
            accidentRelatedField,
            insuranceId,
            createdBy
        } = req.body
        try {
            const userExist = await AssignClaimField.findOne({ for_user: insuranceId })
            var result
            if (userExist) {
                result = await AssignClaimField.findOneAndUpdate(
                    { for_user: insuranceId },
                    {
                        primaryClaimField,
                        secondaryClaimField,
                        accidentRelatedField,
                    },
                    { new: true }
                )
            } else {
                const mangeClaimFieldsData = new AssignClaimField(
                    {
                        primaryClaimField,
                        secondaryClaimField,
                        accidentRelatedField,
                        for_user: insuranceId,
                        createdBy
                    }
                );
                result = await mangeClaimFieldsData.save();
            }
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully save claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to save claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAssignClaimContentPrimary(req, res) {
        const {
            insuranceId
        } = req.body
        try {
            const insuranceData = await AssignClaimField.findOne({ for_user: insuranceId })
            if (!insuranceData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `no record`,
                    errorCode: null,
                });
            }
            var claimFieldData
            var primaryData = []
            if (insuranceData.primaryClaimField.length > 0) {
                const primary = insuranceData.primaryClaimField
                for (let index = 0; index < primary.length; index++) {
                    claimFieldData = await ClaimField.findOne({ _id: primary[index].fieldId })
                    primaryData.push(claimFieldData)
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    primaryData,
                },
                message: `successfully get primary assign claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get primary assign claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAssignClaimContentSecondary(req, res) {
        const {
            insuranceId
        } = req.body
        try {
            const insuranceData = await AssignClaimField.findOne({ for_user: insuranceId })
            if (!insuranceData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `no record`,
                    errorCode: null,
                });
            }
            var claimFieldData
            var secondaryData = []
            if (insuranceData.secondaryClaimField.length > 0) {
                const secondary = insuranceData.secondaryClaimField
                for (let index = 0; index < secondary.length; index++) {
                    claimFieldData = await ClaimField.findOne({ _id: secondary[index].fieldId })
                    secondaryData.push(claimFieldData)
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    secondaryData,
                },
                message: `successfully get secondary assign claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get secondary assign claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getAssignClaimContentAccident(req, res) {
        const {
            insuranceId
        } = req.body
        try {
            const insuranceData = await AssignClaimField.findOne({ for_user: insuranceId })
            if (!insuranceData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `no record`,
                    errorCode: null,
                });
            }
            var claimFieldData
            var accidentData = []
            if (insuranceData.accidentRelatedField.length > 0) {
                const accident = insuranceData.accidentRelatedField
                for (let index = 0; index < accident.length; index++) {
                    claimFieldData = await ClaimField.findOne({ _id: accident[index].fieldId })
                    accidentData.push(claimFieldData)
                }
            }
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    accidentData
                },
                message: `successfully get accident assign claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get accident assign claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimNextInsuranceStaffList(req, res) {
        const {
            insuranceId,
            insuranceStaffRole,
            approvedStaffRole,
            uniquerole
            // nextRoleArray,

        } = req.body
        try {
            var result
            var filter = {
                for_user: mongoose.Types.ObjectId(insuranceId),
                is_locked: false
            };
            let approvedStaffRolelength = approvedStaffRole.length + 1
            console.log(approvedStaffRolelength, "approvedStaffRolelength");
            let claimROles = await claimProcessRole.find({ isDeleted: false, insurance_id: insuranceId }).sort({ sequence: 1 });
            console.log(claimROles, "claimROles1");
            let roleidSequence
            if (claimROles) {
                roleidSequence = claimROles[approvedStaffRolelength]?.roleId
                roleidSequence = mongoose.Types.ObjectId(roleidSequence);
                filter["role"] = roleidSequence;
                // if (approvedStaffRole.length > 0) {

                //     let objectIdArray = approvedStaffRole.map(s => mongoose.Types.ObjectId(s));
                //     console.log(objectIdArray, "filter");

                //     
                // }
                console.log(filter, "filter");

                console.log(claimROles[approvedStaffRolelength]?.sequence, "claimROles")


                result = await StaffInfo.aggregate([
                    {
                        $match: filter
                    },
                    // {
                    //     $match: {
                    //         role: {
                    //             $elemMatch: { $eq: roleidSequence }
                    //         }
                    //     }
                    // },

                    {
                        $lookup: {
                            from: "roles",
                            localField: "role",
                            foreignField: "_id",
                            as: "staffRoleDetails",
                        }
                    },

                    {
                        $addFields: {
                            matchingRole: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$staffRoleDetails", // Change to staffRoleDetails
                                            as: "roleDetail",
                                            cond: { $eq: ["$$roleDetail._id", roleidSequence] } // Compare with _id
                                        }
                                    },
                                    0
                                ]
                            }
                        }
                    },
                    // {
                    //     $unwind: "$staffRoleDetails"
                    // },
                    {
                        $lookup: {
                            from: "claimprocessroles",
                            localField: "role",
                            foreignField: "roleId",
                            as: "claimprocessrolesData",
                        }
                    },
                    // {
                    //     $unwind: "$claimprocessrolesData"
                    // },


                    {
                        $project: {
                            _id: 0,
                            staff_name: 1,
                            staff_role: "$matchingRole.name",
                            staffRoleId: "$matchingRole._id",
                            for_portal_user: 1
                        }
                    },
                ])
            }
            console.log(result, "check result11");
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: "successfully get insurance staff list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "1212");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to get insurance staff list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async medicineClaimCheckValid(req, res) {
        const {
            insuranceNumber,
            insurerType,
        } = req.body
        try {
            const healthPlan = await Subscriber.findOne({ insurance_id: insuranceNumber, subscription_for: insurerType }, { health_plan_for: 1 })
            const planDetails = await Plan.findOne({ _id: healthPlan.health_plan_for })
            const primaryCareLimit = planDetails.total_care_limit.primary_care_limit
            const secondaryCareLimit = planDetails.total_care_limit.secondary_care_limit
            const grandotal = planDetails.total_care_limit.grand_total
            sendResponse(req, res, 200, {
                status: true,
                body: planDetails,
                message: `successfully get accident assign claim fields`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get accident assign claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getSubscriberDetailsForClaim(req, res) {
        const {
            subscriberId
        } = req.query
        console.log(req.query, "query11");
        try {
            const subscriberData = await Subscriber.findOne({ _id: subscriberId })
            console.log(subscriberData, "subscriberDataaa_____");
            const plan = await Plan.findOne({ _id: subscriberData.health_plan_for })
            const planService = await PlanServiceNew.find({ for_plan: subscriberData.health_plan_for })
            const planExclusion = await PlanExclusionNew.find({ for_plan: subscriberData.health_plan_for })
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    subscriberData,
                    plan,
                    planService,
                    planExclusion
                },
                message: `successfully get subscriber details`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get accident assign claim fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async subscriberListByPolicyIdAndInsuranceId(req, res) {
        const {
            insurance_id,
            firstName,
            lastName,
            dob,
            mobile,
        } = req.query
        try {


            var subscriberList = await Subscriber.findOne({
                $and: [
                    {
                        for_user: insurance_id.trim()
                    },
                    {
                        subscriber_first_name: { $regex: `^${firstName}$`, $options: 'i' },
                    },
                    {
                        subscriber_last_name: { $regex: `^${lastName}$`, $options: 'i' },
                    },
                    {
                        date_of_birth: dob.trim(),
                    }, {
                        mobile: mobile.trim()
                    }
                ]
            })


            if (!subscriberList) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `No subscriber`,
                    errorCode: null,
                });
            }
            let actualsubscriberId = subscriberList._id;
            if (subscriberList.subscription_for == "Secondary") {
                var subscriberId = subscriberList._id
                var abc = subscriberId.toString()
                subscriberList = await Subscriber.findOne({ secondary_subscriber: abc })
            }
            var allSecondarySubscriber

            if (subscriberList.secondary_subscriber.length > 0) {
                allSecondarySubscriber = await Subscriber.find({ _id: { $in: subscriberList.secondary_subscriber } })
            }
            subscriberList.secondary_subscriber = allSecondarySubscriber
            sendResponse(req, res, 200, {
                status: true,
                body: { subscriberList, actualsubscriberId },
                message: `successfully get subscriber list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get subscriber list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addHealthcareNetwork(req, res) {
        const {
            addedBy,
            insuranceId,
            healthcareNetworkArray,
        } = req.body
        console.log("Main funct Req.body", req.body);
        try {
            const list = healthcareNetworkArray.map((singleData) => ({
                provider_type: singleData.providerType,
                provider_name: singleData.providerName,
                ceo_name: singleData.ceoName,
                email: singleData.email,
                mobile: singleData.mobile,
                city: singleData.city,
                address: singleData.address,
                region: singleData.region,
                neighborhood: singleData.neighborhood,
                added_by: addedBy,
                for_portal_user: insuranceId,
                dateofcreation: singleData.dateofcreation
            }));
            const healthcareNetworkDetails = await HealthcareNetwork.insertMany(list);
            await AddAcceptedInsuranceCompanies(healthcareNetworkArray, insuranceId, req.headers['authorization'])
            sendResponse(req, res, 200, {
                status: true,
                body: healthcareNetworkDetails,
                message: `successfully added healthcare network`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to add healthcare network",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editHealthcareNetwork(req, res) {
        const {
            healthcareNetworkId,
            insuranceId,
            healthcareNetworkArray,
            oldInsuracneCompanyId
        } = req.body
        try {
            const healthcareNetworkDetails = await HealthcareNetwork.findOneAndUpdate(
                { _id: healthcareNetworkId },
                {
                    for_portal_user: insuranceId,
                    ...healthcareNetworkArray,
                },
                { new: true }
            )
            const dataArray = [healthcareNetworkArray].map((value) => { return { providerType: value.provider_type, mobile: value.mobile } })
            await AddAcceptedInsuranceCompanies(dataArray, insuranceId, req.headers['authorization'], oldInsuracneCompanyId)
            sendResponse(req, res, 200, {
                status: true,
                body: healthcareNetworkDetails,
                message: `successfully updated healthcare network`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to updated healthcare network",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listHealthcareNetwork(req, res) {
        var {
            insuranceId,
            providerType,
            searchText,
            limit,
            page
        } = req.query
        console.log("req.query==>", req.query);

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

            if (insuranceId != 'null') {
                const checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(insuranceId) });
                if (checkUser?.role === 'INSURANCE_STAFF') {
                    const data = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(insuranceId) });
                    insuranceId = data?.for_user;
                }
            }


            var filter = {
                is_deleted: false,
            }
            if (searchText != "") {
                filter = {
                    ...filter,
                    $or: [
                        { provider_name: { $regex: searchText || '', $options: "i" } },
                        { ceo_name: { $regex: searchText || '', $options: "i" } },
                        { email: { $regex: searchText || '', $options: "i" } },
                        { mobile: { $regex: searchText || '', $options: "i" } }
                    ]
                }
            }
            if (providerType != "") {
                filter = {
                    ...filter,
                    provider_type: providerType,
                }
            }
            if (insuranceId != 'null') {
                filter = {
                    ...filter,
                    for_portal_user: mongoose.Types.ObjectId(insuranceId)
                }
            }
            console.log(filter, 'filter');
            console.log("sort===>", sortingarray);

            const result = await HealthcareNetwork.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "for_portal_user",
                    }
                },
                { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
                { $sort: sortingarray },
                { $skip: (page - 1) * limit },
                { $limit: limit * 1 },
            ])
            const totalResult = await HealthcareNetwork.countDocuments(filter)
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalResult,
                    result,
                },
                message: `successfully get healthcare network list`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error--->", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "failed to get healthcare network list",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listHealthcareNetworkforexport(req, res) {
        const { for_portal_user } = req.query
        console.log(for_portal_user, "forportaluser");
        var filter
        // if (searchText == "") {
            filter = {
                is_deleted: false,
                for_portal_user: mongoose.Types.ObjectId(for_portal_user),
            }
        // } 
        // else {
        //     filter = {
        //         is_deleted: false,
        //         // provider_name: { $regex: searchText || '', $options: "i" },
        //     }
        // }
        console.log(filter, "filter check");

        try {
            var result = '';
            // if (limit > 0) {
            //     result = await HealthcareNetwork.find(filter)
            //         .sort([["createdAt", -1]])
            //         .skip((page - 1) * limit)
            //         .limit(limit * 1)
            //         .exec();
            // }
            // else {
                result = await HealthcareNetwork.aggregate([{
                    $match: filter
                },
                { $sort: { "createdAt": -1 } },
                {
                    $project: {
                        _id: 0,
                        dateofcreation:"$dateofcreation",
                        provider_type: "$provider_type",
                        provider_name: "$provider_name",
                        ceo_name: "$ceo_name",
                        email: "$email",
                        mobile: "$mobile",
                        city: "$city",
                        address: "$address",
                        region: "$region",
                        neighborhood: "$neighborhood"
                    }
                }
                ])
            // }
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


    async deleteHealthcareNetwork(req, res) {
        try {
            const { healthcareNetworkId, action_name, action_value } = req.body;
            console.log(req.body, "check request");
            // return;
            var message = ''
            var result;

            const filter = {}
            if (action_name == "active") filter['active'] = action_value
            if (action_name == "delete") filter['is_deleted'] = action_value

            // var result = await HealthcareNetwork.findOneAndUpdate(
            //     { _id: healthcareNetworkId },
            //     filter,
            //     { new: true }
            // );

            if (action_name == "active") {

                let healthcareresult = await HealthcareNetwork.findOne({ _id: healthcareNetworkId });
                const headers = {
                    'Authorization': req.headers['authorization']
                }

                if (healthcareresult.provider_type == "Pharmacy") {
                    await httpService.postStaging('pharmacy/get-pharmacy-by-mainmobilenumber', {
                        "main_phone_number": [healthcareresult.mobile],
                        "insuracneCompanyId": healthcareresult.for_portal_user,
                        "oldInsuracneCompanyId": "",
                        oldInsuracneCompanyIdforstatus: action_value
                    }, headers, 'pharmacyServiceUrl');
                }
                else if (healthcareresult.provider_type == "Hospital") {
                    await httpService.postStaging('hospital/add-accepted-insurance', {
                        "main_phone_number": [healthcareresult.mobile],
                        "insuracneCompanyId": healthcareresult.for_portal_user,
                        "oldInsuracneCompanyId": "",
                        oldInsuracneCompanyIdforstatus: action_value
                    }, headers, 'hospitalServiceUrl');
                }

                else if (healthcareresult.provider_type == "Doctor") {
                    await httpService.postStaging('hospital-doctor/add-accepted-insurance', {
                        "main_phone_number": [healthcareresult.mobile],
                        "insuracneCompanyId": healthcareresult.for_portal_user,
                        "oldInsuracneCompanyId": "",
                        oldInsuracneCompanyIdforstatus: action_value
                    }, headers, 'hospitalServiceUrl');
                }

                else if (healthcareresult.provider_type == "Dental" || healthcareresult.provider_type == "Optical" || healthcareresult.provider_type == "Paramedical-Professions" || healthcareresult.provider_type == "Laboratory-Imaging") {
                    await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
                        "main_phone_number": [healthcareresult.mobile],
                        "insuracneCompanyId": healthcareresult.for_portal_user,
                        "oldInsuracneCompanyId": "",
                        oldInsuracneCompanyIdforstatus: action_value
                    }, headers, 'labimagingdentalopticalServiceUrl');

                }

                result = await HealthcareNetwork.findOneAndUpdate(
                    { _id: healthcareNetworkId },
                    filter,
                    { new: true }
                );

                message = action_value == true ? 'Successfully Active HealthCare-network' : 'Successfully In-active HealthCare-network'
            }


            if (action_name == "delete") {

                if (healthcareNetworkId == '') {
                    result = await HealthcareNetwork.updateMany(
                        { is_deleted: { $eq: false } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }
                else {
                    let healthcareresult = await HealthcareNetwork.find({ _id: { $in: healthcareNetworkId } });
                    
                    const headers = {
                        'Authorization': req.headers['authorization']
                    }
                    for (let index = 0; index < healthcareresult.length; index++) {
                        if (healthcareresult[index].provider_type == "Pharmacy") {
                            await httpService.postStaging('pharmacy/get-pharmacy-by-mainmobilenumber', {
                                "main_phone_number": [healthcareresult[index].mobile],
                                "insuracneCompanyId": healthcareresult[index].for_portal_user,
                                "oldInsuracneCompanyId": "",
                                oldInsuracneCompanyIdforstatus: false
                            }, headers, 'pharmacyServiceUrl');
                        }
                        else if (healthcareresult[index].provider_type == "Hospital") {
                            await httpService.postStaging('hospital/add-accepted-insurance', {
                                "main_phone_number": [healthcareresult[index].mobile],
                                "insuracneCompanyId": healthcareresult[index].for_portal_user,
                                "oldInsuracneCompanyId": "",
                                oldInsuracneCompanyIdforstatus: false
                            }, headers, 'hospitalServiceUrl');
                        }

                        else if (healthcareresult[index].provider_type == "Doctor") {
                            await httpService.postStaging('hospital-doctor/add-accepted-insurance', {
                                "main_phone_number": [healthcareresult[index].mobile],
                                "insuracneCompanyId": healthcareresult[index].for_portal_user,
                                "oldInsuracneCompanyId": "",
                                oldInsuracneCompanyIdforstatus: false
                            }, headers, 'hospitalServiceUrl');
                        }

                        else if (healthcareresult[index].provider_type == "Dental" || healthcareresult[index].provider_type == "Optical" || healthcareresult[index].provider_type == "Paramedical-Professions" || healthcareresult[index].provider_type == 'Laboratory-Imaging') {
                           await httpService.postStaging('labimagingdentaloptical/add-accepted-insurance', {
                                "main_phone_number": [healthcareresult[index].mobile],
                                "insuracneCompanyId": healthcareresult[index].for_portal_user,
                                "oldInsuracneCompanyId": "",
                                oldInsuracneCompanyIdforstatus: false
                            }, headers, 'labimagingdentalopticalServiceUrl');
        
                        }

                    }



                    result = await HealthcareNetwork.updateMany(
                        { _id: { $in: healthcareNetworkId } },
                        {
                            $set: { is_deleted: true }
                        },
                        { new: true }
                    )
                }

                message = 'Successfully Deleted Health Care Network'
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

    async importHealthcareNetwork(req, res) {
        try {
            const filePath = './uploads/' + req.filename
            console.log("filePath------", filePath);
            const data = await processExcel(filePath);
            console.log("data--------", data);
            // const column = req.body.user_type == 'Insurance' ? IncHealthcareNetworkColumns : HealthcareNetworkColumns
            const isValidFile = validateColumnWithExcel(IncHealthcareNetworkColumns, data[0])
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
            let insurance_id = ''
            if (req.body.user_type == 'Insurance') {
                insurance_id = req.body.user_id
            } else {
                insurance_id = req.body.insuranceID
            }
            const inputArray = []
            console.log(data, "data check 123");
            for (const singleData of data) {
                if (singleData.providerType == 'Hospital' || singleData.providerType == 'Doctor' || singleData.providerType == 'Pharmacy' || singleData.providerType == 'Dental' || singleData.providerType == 'Optical' || singleData.providerType == 'Laboratory-Imaging' || singleData.providerType == 'Paramedical-Professions' ) {
                    inputArray.push({
                        dateofcreation:singleData.dateofcreation,
                        provider_type: singleData.providerType,
                        provider_name: singleData.providerName,
                        ceo_name: singleData.ceoName,
                        email: singleData.email,
                        mobile: singleData.mobile,
                        city: singleData.city,
                        address: singleData.address,
                        region: singleData.region,
                        neighborhood: singleData.neighborhood,
                        for_portal_user: insurance_id,
                        added_by: {
                            user_id: req.body.user_id,
                            user_type: req.body.user_type
                        },
                    })
                }
                else {
                    sendResponse(req, res, 500, {
                        status: false,
                        body: null,
                        message: "Check Provider name in sheet properly",
                        errorCode: null,
                    });
                }
            }
            console.log(inputArray, 'inputArray');
            const result = await HealthcareNetwork.insertMany(inputArray);
            if (inputArray.length > 0) {
                await AddAcceptedInsuranceCompanies(data, insurance_id, req.headers['authorization'])
            }
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "All healthcare records added successfully",
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
    async exportHealthcareNetwork(req, res) {
        try {
            var csv
            const result = await HealthcareNetwork.find({});
            const newPath = `./downloadCSV/healthcareNetworkExport.csv`
            csv = result.map((row) => {
                return `"${row.for_portal_user}","${row.provider_type}","${row.provider_name}","${row.ceo_name}","${row.email}","${row.mobile}","${row.city}","${row.address}","${row.region}","${row.neighborhood}"`
            })
            const columns = Object.values(HealthcareNetworkColumns).join(",")
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
    async acceptedInsuranceCompanies(req, res) {
        const {
            mobile
        } = req.query
        var aggregateQuery = [
            {
                $match: { mobile }
            },
            {
                $lookup: {
                    from: "admininfos",
                    localField: "for_portal_user",
                    foreignField: "for_portal_user",
                    as: "admininfos",
                }
            },
            {
                $addFields: {
                    InsuranceName: "$admininfos.company_name",
                }
            },
            {
                $unwind: "$InsuranceName"
            },
            {
                $project: {
                    _id: 0,
                    InsuranceName: 1
                }
            }
        ]
        try {
            const result = await HealthcareNetwork.aggregate(aggregateQuery)

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `successfully get accepted insurance list`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get accepted insurance list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getInsuranceById(req, res) {
        const { for_portal_user } = req.query
        try {
            let filter = { for_portal_user: mongoose.Types.ObjectId(for_portal_user), "portalUserData.isDeleted": false }
            const pipeline = [
                {
                    $lookup: {
                        from: "portalusers", // Replace with your actual collection name
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalUserData"
                    }
                },
                {
                    $unwind: "$portalUserData"
                },
                {
                    $match: filter
                },
                {
                    $project: {
                        for_portal_user: 1,
                        company_name: 1,
                        profile_picture: 1
                    }
                }

            ];

            const findUsersOne = await AdminInfo.aggregate(pipeline);
            console.log("findUsersOne", findUsersOne);
            // const findUsers = await AdminInfo.findOne({ for_portal_user }, {
            //     for_portal_user: 1,
            //     company_name: 1,
            //     profile_picture: 1
            // })
            const findUsers = findUsersOne[0]

            if (findUsers?.profile_picture != '' && findUsers?.profile_picture != null) {
                const profilePic = await getDocument(findUsers?.profile_picture)
                findUsers.profile_picture = profilePic
            }
            sendResponse(req, res, 200, {
                status: true,
                body: findUsers,
                message: "Get insurance list",
                errorCode: null,
            });
        }
        catch (error) {
            console.log("Error---->", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get insurance details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    //made by Tanay to fetch data from db behalf of insuranceId, portalType
    async getportaltypeandinsuranceId(req, res) {
        try {
            const { insuranceId, portalType } = req.query;
            const result = await portaltypeandinsuranceId.find({
                insuranceId: mongoose.Types.ObjectId(insuranceId),
                portalType: portalType,
            })

            if (result.length > 0) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        result,
                    },
                    message: "successfully fetched portal type record",
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        result,
                    },
                    message: "Data not found",
                    errorCode: null,
                });
            }



        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch plan list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    //made by Tanay to save data in DB and assign portal type record
    async portaltypeandinsuranceId(req, res) {

        try {
            const {
                insuranceId,
                forportaluserId,
                portalType,

                categoryName,
                addedBy,
                created_by
            } = req.body;
            console.log("req.body-------------", req.body);
            const checkExists = await portaltypeandinsuranceId.find({ insuranceId: insuranceId, portalType: portalType })
            if (checkExists.length > 0) {
                let deleteData = await portaltypeandinsuranceId.deleteOne({ insuranceId: insuranceId, portalType: portalType })

            }
            const portalassignData = new portaltypeandinsuranceId({
                insuranceId,
                forportaluserId,
                portalType,
                categoryName,
                addedBy,
                created_by
            });

            const result = await portalassignData.save();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully assign category to portal type",
                errorCode: null,
            });
        } catch (error) {
            console.log("error----------", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add plan",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteActiveadmin(req, res) {
        try {
            const { action_name, action_value, id } = req.body
            let key;
            key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
            if (key) {
                const portalData = await PortalUser.findOneAndUpdate(
                    { _id: { $eq: id } },
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
                    message: `hospital ${actionMessage} successfully`,
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


    async getAllChatUser(req, res) {
        try {
            const { page, limit, loggedInId, searchKey } = req.query;

            let matchFilter = {
                isDeleted: false,
                _id: mongoose.Types.ObjectId(loggedInId)
            };
            var filter = {}

            if (searchKey && searchKey !== "") {
                filter["$or"] = [
                    {
                        user_name: { $regex: searchKey, $options: "i" },
                    }
                ];
            }

            let getLoginUserData = await PortalUser.findOne(matchFilter);

            const parsedLimit = parseInt(limit);

            let aggregate;

            if (getLoginUserData?.role === 'INSURANCE_ADMIN') {
                aggregate = [
                    { $match: filter },
                    // {
                    //     $match: {
                    //       $or: [ // Include PHARMACY_ADMIN users
                    //         {isDeleted: false, role: 'INSURANCE_ADMIN' },
                    //         { isDeleted: false, staff_createdBy: loggedInId }
                    //       ]
                    //     }
                    // },
                    {
                        $match: {
                            isDeleted: false,
                            staff_createdBy: loggedInId
                        }
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * parsedLimit,
                    },
                    {
                        $limit: parsedLimit,
                    },
                ];
            }

            if (getLoginUserData?.role === 'INSURANCE_STAFF') {
                aggregate = [
                    { $match: filter },
                    {
                        $match: {
                            isDeleted: false,
                            $and: [
                                { _id: { $ne: mongoose.Types.ObjectId(loggedInId) } },
                                {
                                    $or: [
                                        { _id: mongoose.Types.ObjectId(getLoginUserData?.staff_createdBy) },
                                        { staff_createdBy: getLoginUserData?.staff_createdBy }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $sort: { createdAt: -1 },
                    },
                    {
                        $skip: (page - 1) * parsedLimit,
                    },
                    {
                        $limit: parsedLimit,
                    },
                ];
            }

            const result = await PortalUser.aggregate(aggregate);

            const uniqueDataObject = {}; // Object to store unique data by _id

            for (const doc of result) {
                if (!uniqueDataObject[doc?._id]) {
                    let profilePic = null;

                    if (doc?.profile_picture) {
                        profilePic = await getDocument(doc?.profile_picture);
                    }

                    uniqueDataObject[doc?._id] = {
                        ...doc,
                        profile_picture: profilePic || ''
                    };
                }
            }

            const dataArray = Object.values(uniqueDataObject); // Convert object values to an array

            // var filter = {
            //     // role: { $in: ['STAFF_USER', "superadmin"] },
            //     // is_deleted: false,
            //     _id: mongoose.Types.ObjectId(loggedInId),
            //     isDeleted: false
            // };

            // let aggregate = [
            //     { $match: filter },
            //     {
            //         $lookup: {
            //             from: "staffinfos",
            //             localField: "_id",
            //             foreignField: "for_user",
            //             as: "staffInfo"
            //         }
            //     },
            //     { $unwind: "$staffInfo" },
            //     {
            //         $project: {
            //             //   profile_picture: 1,
            //             //   user_name: 1,
            //             isOnline: 1,
            //             staffInfo: {
            //                 user_name: "$staffInfo.staff_name",
            //                 profile_pic: "$staffInfo.staff_profile",
            //             },
            //         }
            //     }
            // ];
            // const totalCount = await PortalUser.aggregate(aggregate);

            // if (limit != 0) {
            //     aggregate.push(
            //         { $skip: (page - 1) * limit },
            //         { $limit: limit * 1 }
            //     )
            // }
            // const result = await PortalUser.aggregate(aggregate);

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: dataArray
                },
                message: `user list fetched successfully`,
                errorCode: null,
            });
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



    async subscriberListByPolicyIdAndInsuranceIdPost(req, res) {
        const {
            insurance_id,
            firstName,
            lastName,
            dob,
            mobile,
        } = req.body
        console.log(req.body, " req.body123");
        try {


            var subscriberList = await Subscriber.findOne({
                $and: [
                    {
                        for_user: mongoose.Types.ObjectId(insurance_id)
                    },
                    // {
                    //     subscriber_first_name: { $regex: `^${firstName}$`, $options: 'i' },
                    // },
                    // {
                    //     subscriber_last_name: { $regex: `^${lastName}$`, $options: 'i' },
                    // },
                    {
                        date_of_birth: dob.trim(),
                    }, {
                        mobile: mobile.trim()
                    }, {
                        is_deleted: false
                    }
                ]
            })
            console.log(subscriberList, "subscriberList123");
            if (!subscriberList) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `No subscriber`,
                    errorCode: null,
                });
            }
            let actualsubscriberId = subscriberList._id;
            if (subscriberList.subscription_for == "Secondary") {
                var subscriberId = subscriberList._id
                var abc = subscriberId.toString()
                subscriberList = await Subscriber.findOne({ secondary_subscriber: abc })
            }
            var allSecondarySubscriber

            if (subscriberList.secondary_subscriber.length > 0) {
                allSecondarySubscriber = await Subscriber.find({ _id: { $in: subscriberList.secondary_subscriber } })
            }
            subscriberList.secondary_subscriber = allSecondarySubscriber
            sendResponse(req, res, 200, {
                status: true,
                body: { subscriberList, actualsubscriberId },
                message: `successfully get subscriber list`,
                errorCode: null,
            });
        } catch (error) {
            console.log("Error", error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to get subscriber list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async saveSuperadminNotification(req, res) {
        // console.log("sddf insurance>>>>>>",req.body)
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
                    body: saveData,
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

    async totalInsuranceforAdminDashboard(req, res) {
        try {
            const totalCount = await PortalUser.countDocuments({ isDeleted: false });

            if (totalCount >= 0) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalCount },
                    message: "Insurance Count Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalCount: 0 },
                    message: "Insurance Count not Fetch",
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

    async claimCountSuperadminDashboard(req, res) {
        try {
            const { createdDate, updatedDate } = req.query;
            //   console.log("req.query>>>>>>>>>>",req.query)
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

            const totalCountClaimSubmitted = await MediClaimCommonInfo.countDocuments({
                claimComplete: true,
                ...dateFilter,
            });

            //   console.log("totalCountClaimSubmitted>>>>>>>",totalCountClaimSubmitted)

            const totalCountTreatedInsurance = await MediClaimCommonInfo.countDocuments({
                status: "approved",
                ...dateFilter,
            });

            if (totalCountClaimSubmitted >= 0 || totalCountTreatedInsurance >= 0) {
                // console.log("totalCountClaimSubmitted===>>>>>>>>", totalCountClaimSubmitted)
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalCountClaimSubmitted, totalCountTreatedInsurance },
                    message: "Insurance Count Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalCountClaimSubmitted: 0, totalCountTreatedInsurance: 0 },
                    message: "Insurance Count not Fetch",
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
}

// export const getData = async (data) => {
//     let statusData = '';
//     for (const data1 of data) {
//         let d = new Date();
//         var g1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
//         var g2 = new Date(data1?.expiry_date);
//         if (g1.getTime() < g2.getTime()) {
//             statusData = 'active';
//             break;
//         }
//     }
//     return statusData;
// }


export const getData = async (data) => {
    let result = {
        statusData: '', // You can set an appropriate default value here
        data1: null
    };

    for (const data1 of data) {
        let d = new Date();
        var g1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var g2 = new Date(data1?.expiry_date);

        if (g1.getTime() < g2.getTime()) {
            result.statusData = 'active';
            result.data1 = data1;
            break;
        }
    }
    return result;
}

