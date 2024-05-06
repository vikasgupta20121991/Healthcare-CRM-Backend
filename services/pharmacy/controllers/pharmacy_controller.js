"use strict";

// models
import PortalUser from "../models/portal_user";
import AdminInfo from "../models/admin_info";
import StaffInfo from "../models/staff_info";
import LocationInfo from "../models/location_info";
import BankDetailInfo from "../models/bank_detail";
import MobilePayInfo from "../models/mobile_pay";
import ResetPasswordHistory from "../models/reset_password_history";
import Otp2fa from "../models/otp2fa";
import OpeningHours from "../models/opening_hours_info";
import OnDuty from "../models/on_duty_info";
import DocumentInfo from "../models/document_info";
import ReviewAndRating from "../models/review"
// utils
import axios from "axios";
import { sendResponse, ensureMultifactor, createSession } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { uploadFile, uploadBase64, getFile, getDocument, getDocuments } from "../helpers/s3";
import { verifyEmail2fa, resetPasswordEmail, sendMailInvitations } from "../helpers/emailTemplate";
import { sendEmail } from "../helpers/ses";
import { geterate6DigitOTP, smsTemplateOTP } from "../constant";
import { sendSms } from "../middleware/sendSms";
import {
    generateRefreshToken,
    generateToken,
    checkPassword,
    generateRandomString,
    callGoogleCoordinateAPI
} from "../middleware/utils";
import { IoTJobsDataPlane } from "aws-sdk";
import mongoose from "mongoose";
import Http from "../helpers/httpservice"
import { decryptionData } from "../helpers/crypto";
import Invitation from "../models/email_invitation";
import crypto from "crypto"
import OrderDetail from "../models/order/order_detail";
const httpService = new Http()
import Notification from "../models/Chat/Notification";
import Logs from "../models/logs";
import {sendNotification} from "../helpers/firebase_notification";
import {emailNotification} from "../helpers/emailTemplate";
import {notification} from "../helpers/notification";
class PharmacyController {
    async signup(req, res) {
        try {
            const { email, password, phone_number, user_name, first_name, middle_name, last_name, pharmacy_name, country_code } =
                req.body;
            console.log("req.body;req.body;", req.body);
            const passwordHash = await hashPassword(password);
            var userData
            var adminData
            const createdBySuperAdmin = await PortalUser.findOne({ email, createdBy: "super-admin" }).lean();
            if (createdBySuperAdmin) {
                userData = await PortalUser.findOneAndUpdate(
                    { _id: createdBySuperAdmin._id },
                    {
                        $set: {
                            password: passwordHash,
                            phone_number,
                            country_code,
                            user_name: first_name + " " + middle_name + " " + last_name,
                            first_name,
                            middle_name,
                            last_name,
                            createdBy: "self"
                        }
                    },
                    { new: true }).exec();
                adminData = await AdminInfo.findOneAndUpdate(
                    { _id: createdBySuperAdmin._id },
                    {
                        $set: {
                            pharmacy_name
                        }
                    },
                    { new: true }).exec();
                return sendResponse(req, res, 200, {
                    status: true,
                    data: {
                        user_details: {
                            portalUserData: userData,
                            adminData
                        }
                    },
                    message: "successfully created pharmacy admin",
                    errorCode: null,
                });
            }

            const portalUserData = await PortalUser.findOne({ email, createdBy: "self", isDeleted: false }).lean();
            if (portalUserData) {
                portalUserData.password = undefined
                return sendResponse(req, res, 200, {
                    status: false,
                    data: {
                        portalUserData
                    },
                    message: "user already exist",
                    errorCode: null,
                });
            }
            const userDetails = new PortalUser({
                email: email,
                user_name: first_name + " " + middle_name + " " + last_name,
                first_name,
                middle_name,
                last_name,
                password: passwordHash,
                phone_number,
                country_code,
                verified: false,
                role: "PHARMACY_ADMIN",
            });
            userData = await userDetails.save();
            const adminDetails = new AdminInfo({
                pharmacy_name,
                verify_status: "PENDING",
                for_portal_user: userData._id,
            });
            console.log("adminDetailsadminDetails", adminDetails);
            adminData = await adminDetails.save();

            let superadminData = await httpService.getStaging(
                "superadmin/get-super-admin-data",
                {},
                {},
                "superadminServiceUrl"
              );
        
              var requestData = {
                created_by_type: "pharmacy",
                created_by: userData?._id,
                content: `New Registration From ${userData?.user_name}`,
                url: '',
                for_portal_user: superadminData?.body?._id,
                notitype: "New Registration",
                appointmentId:  adminData?._id, 
            }
           
            var result = await notification("superadminServiceUrl","", requestData)

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    user_details: {
                        portalUserData: userData,
                        adminData
                    }
                },
                message: "successfully created pharmacy admin",
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to create pharmacy admin",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password, fcmToken } = req.body;
            const { uuid } = req.headers;
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

            if (req.body.fcmToken != "" || req.body.fcmToken != undefined) {
                let pushNotification = await PortalUser.findByIdAndUpdate(
                    portalUserData._id,
                    { $set: { fcmToken: req.body.fcmToken } }
                );
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
            console.log('incorrect')

            if (portalUserData.lock_user === true) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User temporarily locked",
                    errorCode: "USER_LOCKED",
                });
            }

            console.log('lock')


            if (portalUserData.isActive === false) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User temporarily not active",
                    errorCode: "USER_NOT_ACTIVE",
                });
            }

            console.log('active')


            if (portalUserData.isDeleted === true) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User deleted",
                    errorCode: "USER_DELETED",
                });
            }

            console.log('delete')

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
                            adminData
                        }
                    },
                    message: "OTP verification pending 2fa",
                    errorCode: "VERIFICATION_PENDING",
                });
            }
            var adminData = {}
            if (portalUserData.role == "PHARMACY_ADMIN") {
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

                if (adminData?.locationinfos.length > 0) {
                    try {
                        var locationids = {
                            country_id: adminData?.locationinfos[0]?.nationality,
                            region_id: adminData?.locationinfos[0]?.region,
                            province_id: adminData?.locationinfos[0]?.province,
                            village_id: adminData?.locationinfos[0]?.village,
                            city_id: adminData?.locationinfos[0]?.city,
                            department_id: adminData?.locationinfos[0]?.department,
                        };

                        console.log("locationids>>>>>>>>", locationids)

                        const locationdata = await httpService.postStaging(
                            "common-api/get-location-name",
                            { locationids: locationids },
                            {},
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
                console.log("savedLogId__________",savedLogId);
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
                        message: "Superadmin not approved yet",
                        errorCode: "PROFILE_NOT_APPROVED",
                    });
                }
            } else {
                adminData = await StaffInfo.findOne({
                    for_portal_user: portalUserData._id,
                }).populate({
                    path: "role"
                })

                let checkAdmin = await AdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(adminData?.for_staff) })

                adminData = Object.assign({}, adminData._doc, {
                    pharmacy_name: checkAdmin?.pharmacy_name,

                });
            }

            console.log("ADMIN DATA===>", adminData)


            console.log('device')

            const tokenClaims = {
                portalUserId: portalUserData._id,
                uuid
            }
            console.log('claim')

            if (adminData?.profile_picture != "") {
                adminData.profile_picture_signed_url = await getDocument(adminData.profile_picture)
            }
            console.log('profile')

            if (adminData?.pharmacy_picture?.length > 0) {
                adminData.pharmacy_picture_signed_urls = await getDocuments(adminData.pharmacy_picture)
            }
            console.log('pict')

            createSession(req, portalUserData);
            console.log('session')
            // logs
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            let addLogs = {};
            let saveLogs = {};
            if (portalUserData.role == "PHARMACY_ADMIN") {
                addLogs = new Logs({
                    userName: portalUserData?.user_name,
                    userId: portalUserData?._id,
                    loginDateTime: formattedDate,                    
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

                });
                saveLogs = await addLogs.save();
            } else {
                let checkAdmin = await AdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(portalUserData?.staff_createdBy) })
                addLogs = new Logs({
                    userName: portalUserData?.user_name,
                    userId: portalUserData?._id,
                    adminData: {
                        adminId: portalUserData?.staff_createdBy,                        
                        pharmacyName: checkAdmin?.pharmacy_name
                    },
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,
                });
                saveLogs = await addLogs.save();
            }
            const savedLogId = saveLogs ? saveLogs._id : null;
            console.log("savedLogId__________",savedLogId);

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
                    },
                },
                message: "pharmacy login done",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "check error")
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }


    // async login(req, res) {
    //     try {
    //         const { email, password, fcmToken } = req.body;
    //         const { uuid } = req.headers;
    //         const portalUserData = await PortalUser.findOne({ email: email.toLowerCase(), isDeleted: false }).lean();

    //         if (!portalUserData) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User not found",
    //                 errorCode: "USER_NOT_FOUND",
    //             });
    //         }

    //         if (req.body.fcmToken != "" || req.body.fcmToken != undefined) {
    //             let pushNotification = await PortalUser.findByIdAndUpdate(
    //                 portalUserData._id,
    //                 { $set: { fcmToken: req.body.fcmToken } }
    //             );
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
    //         console.log('incorrect')

    //         if (portalUserData.lock_user === true) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User temporarily locked",
    //                 errorCode: "USER_LOCKED",
    //             });
    //         }

    //         console.log('lock')


    //         if (portalUserData.isActive === false) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User temporarily not active",
    //                 errorCode: "USER_NOT_ACTIVE",
    //             });
    //         }

    //         console.log('active')


    //         if (portalUserData.isDeleted === true) {
    //             return sendResponse(req, res, 200, {
    //                 status: false,
    //                 body: null,
    //                 message: "User deleted",
    //                 errorCode: "USER_DELETED",
    //             });
    //         }

    //         console.log('delete')

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
    //         var adminData
    //         if (portalUserData.role == "PHARMACY_ADMIN") {
    //             adminData = await AdminInfo.findOne({
    //                 for_portal_user: portalUserData._id,
    //             }).lean();

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
    //                     message: "Superadmin not approved yet",
    //                     errorCode: "PROFILE_NOT_APPROVED",
    //                 });
    //             }
    //         } else {
    //             adminData = await StaffInfo.findOne({
    //                 for_portal_user: portalUserData._id,
    //             }).populate({
    //                 path: "role"
    //             })
    //         }

    //         console.log("ADMIN DATA===>", adminData)


    //         console.log('device')

    //         const tokenClaims = {
    //             portalUserId: portalUserData._id,
    //             uuid
    //         }
    //         console.log('claim')

    //         if (adminData?.profile_picture != "") {
    //             adminData.profile_picture_signed_url = await getDocument(adminData.profile_picture)
    //         }
    //         console.log('profile')

    //         if (adminData?.pharmacy_picture?.length > 0) {
    //             adminData.pharmacy_picture_signed_urls = await getDocuments(adminData.pharmacy_picture)
    //         }
    //         console.log('pict')

    //         createSession(req, portalUserData);
    //         console.log('session')

    //         return sendResponse(req, res, 200, {
    //             status: true,
    //             body: {
    //                 otp_verified: portalUserData.verified,
    //                 token: generateToken(tokenClaims),
    //                 refreshToken: generateRefreshToken(tokenClaims),
    //                 user_details: {
    //                     portalUserData,
    //                     adminData,
    //                 },
    //             },
    //             message: "pharmacy login done",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error, "check error")
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: error,
    //             message: "Internal server error",
    //             errorCode: null,
    //         });
    //     }
    // }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            const { uuid } = req.headers;




            return sendResponse(req, res, 200, {
                status: true,
                body: refreshToken,
                message: "pharmacy refresh token",
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

    logout(req, res) {
        req.session.destroy(function (err) {
            if (err) {
                console.log("Error Logging Out: ", err);
                return sendResponse(req, res, 500, {
                    status: false,
                    body: err,
                    message: "Something went wrong",
                    errorCode: "LOGOUT_SESSION_ERROR",
                });
            }
            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "logout successful",
                errorCode: null,
            });
        });
    };


    loggedIn(req, res) {
        if (req.session.loggedIn && req.session.ph_verified) {
            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "pharmacy session active",
                errorCode: null,
            });
        } else if (req.session.loggedIn && !req.session.ph_verified) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "pharmacy session inactive",
                errorCode: "TWO_FA_FAILED",
            });
        } else {
            return sendResponse(req, res, 409, {
                status: false,
                body: null,
                message: "pharmacy session inactive",
                errorCode: "MISSING_AUTH",
            });
        }
    };


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
            const mobile = portalUserData.phone_number
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
            const otp = geterate6DigitOTP();
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

    async matchSmsOtpFor2fa(req, res) {
        try {
            const { mobile, otp, for_portal_user } = req.body;
            const { uuid } = req.headers;
            console.log(uuid, 'uuid');
            console.log(req.body, 'req.body');
            const otpResult = await Otp2fa.findOne({ uuid, mobile, for_portal_user, verified: false });
            console.log(otpResult, 'otpResult');
            if (otpResult) {
                const portalUserData = await PortalUser.findOne({ _id: otpResult.for_portal_user, isDeleted: false }).lean();
                if (!portalUserData) {
                    return sendResponse(req, res, 422, {
                        status: false,
                        body: null,
                        message: "user not exist",
                        errorCode: null,
                    });
                }
                if (otpResult.otp == otp) {
                    req.session.ph_verified = true;
                    const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
                        $set: {
                            verified: true
                        }
                    }, { new: true }).exec();
                    const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, mobile, for_portal_user, verified: false }, {
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
            const { uuid } = req.headers;
            const otpResult = await Otp2fa.findOne({ uuid, email, for_portal_user, verified: false });
            if (otpResult) {
                const portalUserData = await PortalUser.findOne({ _id: otpResult.for_portal_user, isDeleted: false }).lean();
                if (!portalUserData) {
                    return sendResponse(req, res, 422, {
                        status: false,
                        body: null,
                        message: "user not exist",
                        errorCode: null,
                    });
                }
                if (otpResult.otp == otp) {
                    req.session.ph_verified = true;
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

    async sendVerificationEmail(req, res) {
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
            const deviceExist = await Otp2fa.findOne({ uuid, email, for_portal_user: portalUserData._id }).lean();

            if (deviceExist && deviceExist.send_attempts >= 500000) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Maximum attempt exceeded",
                    errorCode: "MAX ATTEMPT_EXCEEDED",
                });
            }
            const otp = geterate6DigitOTP();
            const content = verifyEmail2fa(email, otp);
            await sendEmail(content);
            let result = null;
            if (deviceExist) {
                result = await Otp2fa.findOneAndUpdate({ uuid, email, for_portal_user: portalUserData._id }, {
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

    async forgotPassword(req, res) {
        const { email } = req.body;
        const { uuid } = req.headers;
        try {
            const portalUserData = await PortalUser.findOne({ email }).lean();
            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User Not Found.",
                    errorCode: "USER_NOT_FOUND",
                });
            }
            const passwordToken = crypto.randomBytes(32).toString("hex");
            const content = resetPasswordEmail(email, passwordToken);
            let checkResponse = await sendEmail(content);
            console.log("checkResponsecheckResponse", checkResponse);
            const otpData = new ResetPasswordHistory({
                email,
                uuid,
                for_portal_user: portalUserData._id,
                passwordToken
            });
            const result = await otpData.save();
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
            const isPasswordMatch = await checkPassword(new_password, portalUserData);
            if (isPasswordMatch) {
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

    async resetPassword(req, res) {
        const { passwordToken, new_password } = req.body;
        console.log("req.body", req.body);
        const { uuid } = req.headers;
        try {
            const resetPaswordResult = await ResetPasswordHistory.findOne({ uuid, passwordToken }).lean();
            if (!resetPaswordResult) {
                return sendResponse(req, res, 200, {
                    status: false,
                    data: null,
                    message: "Invalid email token",
                    errorCode: "INVALID_TOKEN",
                });
            }

            const passCheck = await PortalUser.findOne({ _id: resetPaswordResult.for_portal_user });

            const isPasswordCheck = await checkPassword(new_password, passCheck);

            if (isPasswordCheck) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "This is Previous password. Enter New Password.",
                    errorCode: null,
                });
            } else {
                const passwordHash = await hashPassword(new_password);
                const result = await PortalUser.findOneAndUpdate({ _id: resetPaswordResult.for_portal_user }, {
                    $set: {
                        password: passwordHash
                    }
                }, { new: true }).exec();
                sendResponse(req, res, 200, {
                    status: true,
                    data: { id: result._id },
                    message: "Successfully reset password",
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

    async pharmacyProfile(req, res) {
        try {
            const {
                address,
                loc,
                first_name,
                middle_name,
                last_name,
                pharmacy_name,
                slogan,
                main_phone_number,
                mobile_phone_number,
                additional_phone_number,
                about_pharmacy,
                medicine_request,
                association,
                profile_picture,
                pharmacy_picture,
                licence_details,
                duty_group,
                show_to_patient,
                bank_details,
                mobile_pay_details,
                location_info,
                for_portal_user,
                country_code
            } = req.body;
            console.log("req.body", req.body);
            const {
                nationality,
                neighborhood,
                region,
                province,
                department,
                city,
                village,
                pincode,
            } = location_info;
            const {
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                bank_address,
            } = bank_details;


            const { provider, pay_number } = mobile_pay_details;
            const PortalUserDetails = await PortalUser.findOneAndUpdate(
                { _id: for_portal_user },
                {
                    $set: {

                        user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name,
                        country_code: country_code
                    },
                },
                { upsert: false, new: true }
            )
            const findLocation = await LocationInfo.findOne({ for_portal_user: for_portal_user });
            var locationData
            if (!findLocation) {
                const locationInfo = new LocationInfo({
                    nationality: nationality == '' ? null : nationality,
                    neighborhood: neighborhood == '' ? null : neighborhood,
                    region: region == '' ? null : region,
                    province: province == '' ? null : province,
                    department: department == '' ? null : department,
                    city: city == '' ? null : city,
                    village: village == '' ? null : village,
                    pincode: pincode == '' ? null : pincode,
                    for_portal_user,
                    address: address == '' ? null : address,
                    loc: loc == '' ? null : loc,
                });
                locationData = locationInfo.save();
            } else {
                locationData = await LocationInfo.findOneAndUpdate(
                    { for_portal_user: for_portal_user },
                    {
                        $set: {
                            nationality: nationality == '' ? null : nationality,
                            neighborhood: neighborhood == '' ? null : neighborhood,
                            region: region == '' ? null : region,
                            province: province == '' ? null : province,
                            department: department == '' ? null : department,
                            city: city == '' ? null : city,
                            village: village == '' ? null : village,
                            pincode: pincode == '' ? null : pincode,
                            for_portal_user,
                            address: address == '' ? null : address,
                            loc: loc == '' ? null : loc,
                        },
                    },
                    { new: true }
                ).exec();
            }
            const findBank = await BankDetailInfo.findOne({ for_portal_user: for_portal_user });
            var bankData
            if (!findBank) {
                const bankDetailInfo = new BankDetailInfo({
                    bank_name,
                    account_holder_name,
                    account_number,
                    ifsc_code,
                    bank_address,
                    for_portal_user,
                });
                bankData = bankDetailInfo.save();
            } else {
                bankData = await BankDetailInfo.findOneAndUpdate(
                    { for_portal_user: for_portal_user },
                    {
                        $set: {
                            bank_name,
                            account_holder_name,
                            account_number,
                            ifsc_code,
                            bank_address,
                        },
                    },
                    { new: true }
                ).exec();
            }
            // let mobilePayData = null;
            // if (req.body.mobile_pay_details.pay_number != "") {
            //     const findMobilePay = await MobilePayInfo.findOne({ for_portal_user: for_portal_user });
            //     if (!findMobilePay) {
            //         const mobilePayInfoInfo = new MobilePayInfo({
            //             provider,
            //             pay_number,
            //             for_portal_user,
            //         });
            //         mobilePayData = mobilePayInfoInfo.save();
            //     } else {
            //         mobilePayData = await MobilePayInfo.findOneAndUpdate(
            //             { for_portal_user: for_portal_user },
            //             {
            //                 $set: {
            //                     provider,
            //                     pay_number,
            //                 },
            //             },
            //             { new: true }
            //         ).exec();
            //     }
            // }

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
            const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: for_portal_user } }).select('_id').exec();
            if (for_portal_user && getMobilePayInfo.length > 0) {
                mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: for_portal_user } }, {
                    $set: { mobilePay: dataArray }
                }).exec();
            } else {
                const mobilePayData = new MobilePayInfo({
                    mobilePay: dataArray,
                    for_portal_user: for_portal_user
                })
                mobilePayResult = await mobilePayData.save()
            }
            const mobile_pay_object_id = mobilePayResult?._id

            await Promise.all([locationData, bankData]);



            let associationdata = await AdminInfo.findOne({ for_portal_user }).select('association');
            console.log(associationdata, "asso333");
            let associationName = [];
            if (associationdata) {
                associationName = associationdata.association.name;

            }
            var assicationNamenew = []
            console.log(associationName, "check data111", association.name);
            if (association.name != null && association.name.length > 0) {
                console.log("444");
                assicationNamenew = association.name.filter(value => value !== null).map(objectId => objectId.toString());
            }

            console.log(assicationNamenew, "now check");
            var isMatch = false;
            if (assicationNamenew.length > 0) {
                isMatch = assicationNamenew.every(value => value === associationName);

            }
            const pharmacyAdminInfo = await AdminInfo.findOneAndUpdate(
                { for_portal_user },
                {
                    $set: {
                        address,
                        pharmacy_name,
                        first_name,
                        middle_name,
                        last_name,
                        slogan,
                        main_phone_number,
                        mobile_phone_number,
                        additional_phone_number,
                        about_pharmacy,
                        medicine_request,
                        association,
                        profile_picture,
                        pharmacy_picture,
                        licence_details,
                        duty_group,
                        show_to_patient,
                        // verify_status: "PENDING",
                        in_location: locationData?._id,
                        in_bank: bankData?._id,
                        in_mobile_pay: mobile_pay_object_id,
                        // in_mobile_pay: mobilePayData?._id,
                    },
                },
                { new: true }
            );

            console.log(pharmacyAdminInfo, "pharmacyAdminInfo");

            try {
                const headers = {
                    'Authorization': req.headers['authorization']
                }
                console.log(headers, "headers check");
                if (!isMatch) {
                    var acceptedAssociationData = await httpService.postStaging('superadmin/addAssociationData', { pharmacyId: for_portal_user, newassociationid: pharmacyAdminInfo.association.name, oldAssociationid: associationName }, headers, 'superadminServiceUrl');
                    console.log(acceptedAssociationData, "check association data");
                }

            }
            catch (error) {
                console.log(error, "error12344")
            }


            sendResponse(req, res, 200, {
                status: true,
                data: { pharmacyAdminInfo },
                message: "successfully created pharmacy admin profile",
                errorCode: null,
            });
        } catch (error) {
            console.error(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to create pharmacy admin profile",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async pharmacyCreateProfile(req, res) {
        try {
            const {
                address,
                email,
                loc,
                first_name,
                middle_name,
                last_name,
                pharmacy_name,
                slogan,
                main_phone_number,
                mobile_phone_number,
                additional_phone_number,
                about_pharmacy,
                medicine_request,
                association,
                profile_picture,
                pharmacy_picture,
                licence_details,
                duty_group,
                show_to_patient,
                bank_details,
                mobile_pay_details,
                location_info,
                for_portal_user,
                country_code
            } = req.body;
            console.log("req.body", req.body);
            const {
                nationality,
                neighborhood,
                region,
                province,
                department,
                city,
                village,
                pincode,
            } = location_info;
            const {
                bank_name,
                account_holder_name,
                account_number,
                ifsc_code,
                bank_address,
            } = bank_details;

            const findUser = await PortalUser.findOne({ _id: for_portal_user })
            const { provider, pay_number } = mobile_pay_details;
            const isExist = await PortalUser.findOne({ email: email, _id: { $ne: for_portal_user }, isDeleted: false });
            if (isExist) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Email Already Exist",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
            const PortalUserDetails = await PortalUser.findOneAndUpdate(
                { _id: for_portal_user },
                {
                    $set: {
                        email: email,
                        user_name: first_name + " " + middle_name + " " + last_name, first_name, middle_name, last_name, phone_number: main_phone_number,
                        country_code: country_code, profile_picture: profile_picture
                    },
                },
                { upsert: false, new: true }
            )
            const findLocation = await LocationInfo.findOne({ for_portal_user: findUser?._id });
            var locationData
            if (!findLocation) {
                const locationInfo = new LocationInfo({
                    nationality: nationality == '' ? null : nationality,
                    neighborhood: neighborhood == '' ? null : neighborhood,
                    region: region == '' ? null : region,
                    province: province == '' ? null : province,
                    department: department == '' ? null : department,
                    city: city == '' ? null : city,
                    village: village == '' ? null : village,
                    pincode: pincode == '' ? null : pincode,
                    for_portal_user,
                    address: address == '' ? null : address,
                    loc: loc == '' ? null : loc,
                });
                try {
                    locationData = await locationInfo.save();
                } catch (error) {
                    console.error("Error saving locationData:", error);
                }
            } else {
                locationData = await LocationInfo.findOneAndUpdate(
                    { for_portal_user: for_portal_user },
                    {
                        $set: {
                            nationality: nationality == '' ? null : nationality,
                            neighborhood: neighborhood == '' ? null : neighborhood,
                            region: region == '' ? null : region,
                            province: province == '' ? null : province,
                            department: department == '' ? null : department,
                            city: city == '' ? null : city,
                            village: village == '' ? null : village,
                            pincode: pincode == '' ? null : pincode,
                            for_portal_user,
                            address: address == '' ? null : address,
                            loc: loc == '' ? null : loc,
                        },
                    },
                    { new: true }
                ).exec();
            }
            const findBank = await BankDetailInfo.findOne({ for_portal_user: for_portal_user });
            var bankData
            if (!findBank) {
                const bankDetailInfo = new BankDetailInfo({
                    bank_name,
                    account_holder_name,
                    account_number,
                    ifsc_code,
                    bank_address,
                    for_portal_user,
                });
                bankData = bankDetailInfo.save();
            } else {
                bankData = await BankDetailInfo.findOneAndUpdate(
                    { for_portal_user: for_portal_user },
                    {
                        $set: {
                            bank_name,
                            account_holder_name,
                            account_number,
                            ifsc_code,
                            bank_address,
                        },
                    },
                    { new: true }
                ).exec();
            }
            // let mobilePayData = null;
            // if (req.body.mobile_pay_details.pay_number != "") {
            //     const findMobilePay = await MobilePayInfo.findOne({ for_portal_user: for_portal_user });
            //     if (!findMobilePay) {
            //         const mobilePayInfoInfo = new MobilePayInfo({
            //             provider,
            //             pay_number,
            //             for_portal_user,
            //         });
            //         mobilePayData = mobilePayInfoInfo.save();
            //     } else {
            //         mobilePayData = await MobilePayInfo.findOneAndUpdate(
            //             { for_portal_user: for_portal_user },
            //             {
            //                 $set: {
            //                     provider,
            //                     pay_number,
            //                 },
            //             },
            //             { new: true }
            //         ).exec();
            //     }
            // }

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
            const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: for_portal_user } }).select('_id').exec();
            if (for_portal_user && getMobilePayInfo.length > 0) {
                mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: for_portal_user } }, {
                    $set: { mobilePay: dataArray }
                }).exec();
            } else {
                const mobilePayData = new MobilePayInfo({
                    mobilePay: dataArray,
                    for_portal_user: for_portal_user
                })
                mobilePayResult = await mobilePayData.save()
            }
            const mobile_pay_object_id = mobilePayResult?._id

            await Promise.all([locationData, bankData]);

            const pharmacyAdminData = await AdminInfo.findOneAndUpdate(
                { for_portal_user },
                {
                    $set: {
                        address,
                        pharmacy_name,
                        first_name,
                        middle_name,
                        last_name,
                        slogan,
                        main_phone_number,
                        mobile_phone_number,
                        additional_phone_number,
                        about_pharmacy,
                        medicine_request,
                        association,
                        profile_picture,
                        pharmacy_picture,
                        licence_details,
                        duty_group,
                        show_to_patient,
                        // verify_status: "PENDING",
                        in_location: locationData._id,
                        in_bank: bankData._id,
                        in_mobile_pay: mobile_pay_object_id,
                    },
                },
                { new: true }
            );
            const locationinfos = await LocationInfo.find({ for_portal_user: findUser?._id });

            const pharmacyAdminInfo = {
                ...pharmacyAdminData.toObject(), // Convert to plain JavaScript object
                locationinfos: locationinfos.map(location => location.toObject()),
            };

            if (pharmacyAdminInfo?.locationinfos) {
                try {
                    var locationids = {
                        country_id: locationinfos[0]?.nationality,
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
                        pharmacyAdminInfo.locationinfos[0].country = {
                            countryname: locationdata?.body?.country_name,
                            country_iso_code: locationdata?.body?.country_iso_code,
                        };
                        pharmacyAdminInfo.locationinfos[0].region = locationdata?.body?.region_name;
                        pharmacyAdminInfo.locationinfos[0].province = locationdata?.body?.province_name;
                        pharmacyAdminInfo.locationinfos[0].village = locationdata?.body?.village_name;
                        pharmacyAdminInfo.locationinfos[0].city = locationdata?.body?.city_name;
                        pharmacyAdminInfo.locationinfos[0].department = locationdata?.body?.department_name;
                    }
                } catch (err) {
                    console.log(err, "erraaaa");
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                data: { pharmacyAdminInfo, PortalUserDetails },
                message: "successfully created pharmacy admin profile",
                errorCode: null,
            });
        } catch (error) {
            console.error(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to create pharmacy admin profile",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async pharmacyProfileSetHours(req, res) {
        try {
            const {
                hoursset,
                for_portal_user,
            } = req.body;

            const pharmacyAdminInfo = await AdminInfo.findOneAndUpdate(
                { for_portal_user },
                {
                    $set: {
                        hoursset,
                    },
                },
                { new: true }
            );

            sendResponse(req, res, 200, {
                status: true,
                data: { pharmacyAdminInfo },
                message: "successfully Set Hours",
                errorCode: null,
            });
        } catch (error) {
            console.error(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to create pharmacy admin profile",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async pharmacyOpeningHours(req, res) {
        try {
            const { pharmacy_id, week_days, open_date_and_time, close_date_and_time, getDetails } = req.body;
            const openingHoursDetails = await OpeningHours.findOne({ for_portal_user: pharmacy_id })
            if (getDetails != "") {
                return sendResponse(req, res, 200, {
                    status: true,
                    data: { openingHoursDetails },
                    message: "successfully get details pharmacy opening hours",
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
                openingHoursData = await OpeningHours.findOneAndUpdate(
                    { for_portal_user: pharmacy_id },
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
                const openingHoursInfo = new OpeningHours({
                    week_days,
                    open_date_and_time: newArray,
                    close_date_and_time: newArray2,
                    for_portal_user: pharmacy_id
                });
                openingHoursData = await openingHoursInfo.save();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: { openingHoursData },
                message: "successfully added pharmacy opening hours",
                errorCode: null,
            });
        } catch (error) {
            console.log(error)
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add pharmacy opening hours",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async pharmacyOnDuty(req, res) {
        try {
            const { pharmacy_id, on_duty, getDetails } = req.body;
            const onDutyDetails = await OnDuty.findOne({ for_portal_user: pharmacy_id })
            if (getDetails != "") {
                return sendResponse(req, res, 200, {
                    status: true,
                    data: { onDutyDetails },
                    message: "successfully get details pharmacy on duty",
                    errorCode: null,
                });
            }
            var newObject
            var newArray = []
            if (on_duty.length > 0) {
                on_duty.map((singleData) => {
                    newObject = {
                        from_date_timestamp: new Date(singleData.from_date + "T" + singleData.from_time + ":15.215Z"),
                        to_date_timestamp: new Date(singleData.to_date + "T" + singleData.to_time + ":15.215Z")
                    }
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

            var onDutyData
            if (onDutyDetails) {
                onDutyData = await OnDuty.findOneAndUpdate(
                    { for_portal_user: pharmacy_id },
                    {
                        $set: {
                            on_duty: newArray
                        },
                    },
                    { new: true }
                ).exec();
            } else {
                const onDutyInfo = new OnDuty({
                    on_duty: newArray,
                    for_portal_user: pharmacy_id
                });
                onDutyData = await onDutyInfo.save();
            }
            sendResponse(req, res, 200, {
                status: true,
                data: { onDutyData },
                message: "successfully added pharmacy on duty",
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorrr_1111")
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to add pharmacy on duty",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async listPharmacyAdminUser(req, res) {
    //     try {
    //         const { page, limit, name, status, start_date, end_date } = req.query;

    //         let limits = parseInt(limit)
    //          let name_search = "";
    //         if (name != "") {
    //             name_search = name.trim();
    //         } 
    //         let end_date_search = {}
    //         if (end_date != "") {
    //             end_date_search = { createdAt: { $lte: new Date(end_date) } }
    //         }
    //         let start_date_search = {}
    //         if (start_date != "") {
    //             start_date_search = { createdAt: { $gte: new Date(start_date) } }
    //         }
    //         const searchQuery = {
    //             $and: [

    //                 { pharmacy_name: { $regex: name_search, $options: "i" } },
    //                 {
    //                     verify_status: { $eq: status },
    //                 },
    //                 end_date_search,
    //                 start_date_search
    //             ],
    //         };


    //         console.log(searchQuery,'searchQuery');

    //         const result = await AdminInfo.aggregate([


    //             {
    //                 $match: searchQuery
    //             },
    //             {
    //                 $lookup: {
    //                     from: "portalusers",
    //                     localField: "for_portal_user",
    //                     foreignField: "_id",
    //                     as: "portalusers",
    //                 }
    //             },
    //             {
    //                 $unwind: "$portalusers"
    //             },
    //             {
    //                 $match: {
    //                     "portalusers.createdBy": "self",
    //                 }
    //             },
    //             { $sort: { createdAt: -1 } },
    //             { $skip: (page - 1) * limit },
    //             { $limit: limit * 1 }

    //         ])


    //         const count = await AdminInfo.countDocuments(searchQuery);

    //         console.log(result,'listPharmacyAdminUser');
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             data: {
    //                 data: result,
    //                 totalCount: count,
    //             },
    //             message: "successfully fetched pharmacy admin list",
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             data: error,
    //             message: "failed to fetch pharmacy admin list",
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async listPharmacyAdminUser(req, res) {
        try {
            const { page, limit, name, status, start_date, end_date } = req.query;

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;

            }

            let filter = {
                // pharmacy_name: { $regex: name || "", $options: "i" },
                verify_status: status,
                "for_portal_user.createdBy": "self",
                "for_portal_user.isDeleted": false
                // ,
                // {
                //     "for_portal_user.createdBy": "self",
                // }
            }
            if (name != '') {
                filter.pharmacy_name = { $regex: name || "", $options: "i" }
            }
            if (start_date != '' && end_date != '') {
                filter.createdAt = {
                    $gte: new Date(start_date), $lte: new Date(end_date)
                }
            }
            else if (start_date != '') {
                filter.createdAt = { $gte: new Date(start_date) }


            }
            else if (end_date != '') {
                filter.createdAt = {
                    $lte: new Date(end_date)
                }

            }


            var aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user"
                    }
                },
                {
                    $unwind: {
                        path: "$for_portal_user",
                        preserveNullAndEmptyArrays: true
                    }
                },
                // {
                //     $match: {
                //       "for_portal_user": { $ne: null }, // Filter out documents with empty "productData" (no match in the "products" collection)
                //     }
                //   },
                {
                    $match: filter
                },

            ]
            console.log(filter, "filter");
            const count = await AdminInfo.aggregate(aggregate);

            if (limit != 0) {
                aggregate.push(
                    {
                        $sort: sortingarray
                    },
                    {
                        $skip: (page - 1) * limit

                    }, {
                    $limit: limit * 1
                }
                )
            }
            // await AdminInfo.find({
            //     $and:filter ,
            // })
            //     .select(
            //         "pharmacy_name address association licence_details verify_status"
            //     )
            //     .populate(
            //         {
            //             path: 'for_portal_user',
            //             match: {  createdBy: 'self', isDeleted: false }
            //         })
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();
            const result = await AdminInfo.aggregate(aggregate);


            // console.log("testtttt", JSON.stringify(result));
            // const count = await AdminInfo.find({
            //     $and:filter ,
            // })
            //     .select(
            //         "pharmacy_name address association licence_details verify_status"
            //     )
            //     .populate(
            //         {
            //             path: 'for_portal_user',
            //             match: {  createdBy: 'self',isDeleted: false }
            //         })

            //     .exec();


            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: count.length,
                },
                message: "successfully fetched pharmacy admin list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error)
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch pharmacy admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async approveOrRejectPharmacy(req, res) {
        const { verify_status, id, approved_or_rejected_by } = req.body;
        let date = null;
        if (verify_status == "APPROVED") {
            const cdate = new Date();
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1
                }-${cdate.getDate()}`;
        }

        try {
            const result = await AdminInfo.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        verify_status,
                        approved_at: date,
                        approved_or_rejected_by,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            // console.log(result, "check log")
            // return;
            try {
                const headers = {
                    'Authorization': req.headers['authorization']
                }
                console.log(headers, "headers check");
                if (result.association.name != null && result.association.name != '') {
                    var acceptedAssociationData = await httpService.postStaging('superadmin/addAssociationData', { pharmacyId: result.for_portal_user, newassociationid: result.association.name, oldAssociationid: [] }, headers, 'superadminServiceUrl');
                    console.log(acceptedAssociationData, "check association data");
                }

            }
            catch (error) {
                console.log(error, "error12344")
            }

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `${verify_status} pharmacy successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "123error");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `pharmacy request ${verify_status}`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async pharmacyAdminDetails(req, res) {
        try {
            const { id } = req.query;
            // const adminData = await AdminInfo.findOne({
            //     _id: id,
            // })
            //     .populate({
            //         path: "for_portal_user",
            //     })
            //     .exec();

            // const portalUserData = await PortalUser.findOne({ _id: id }).exec();
            const adminData = await AdminInfo.findOne({
                _id: id,
            })
                .populate({
                    path: "in_location",
                })
                .exec();
            const bankDetails = await BankDetailInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const mobilePayData = await MobilePayInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const documentData = await DocumentInfo.find({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const locationData = await LocationInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const onDutyData = await OnDuty.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const openingHoursData = await OpeningHours.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();

            const portalUserData = await PortalUser.findOne({ _id: adminData.for_portal_user }).exec();
            const profilePicKey = adminData.profile_picture;
            const profilePictureArray = [profilePicKey]
            const headers = {
                'Authorization': req.headers['authorization']
            }

            if (profilePicKey != "" && profilePicKey != undefined) {
                const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, headers, 'pharmacyServiceUrl');
                adminData.profile_picture_signed_url = pharmacyLogo.data[0]
            } else {
                adminData.profile_picture_signed_url = ""
            }

            if (0 < adminData.pharmacy_picture.length) {
                const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: adminData.pharmacy_picture }, headers, 'pharmacyServiceUrl');
                adminData.pharmacy_picture_signed_urls = pharmacyLogo.data
            } else {
                adminData.pharmacy_picture_signed_urls = []
            }


            let licencePic = adminData?.licence_details?.licence_picture

            if (licencePic != "" && licencePic != undefined) {
                const licencePicture = await httpService.postStaging('pharmacy/get-signed-url', { url: [licencePic] }, headers, 'pharmacyServiceUrl');
                adminData.licence_details.licence_picture = licencePicture.data[0]

            } else {
                adminData.licence_details.licence_picture = ""
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    portalUserData,
                    mobilePayData,
                    bankDetails,
                    adminData,
                    documentData,
                    locationData,
                    onDutyData,
                    openingHoursData
                },
                message: `pharmacy admin details fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: null,
                message: `failed to fetch pharmacy admin details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async viewPharmacyAdminDetails(req, res) {
        try {
            const { id } = req.query;
            const portalUserData = await PortalUser.findOne({ _id: id }).exec();
            const adminData = await AdminInfo.findOne({
                for_portal_user: portalUserData._id,
            })
                .populate({
                    path: "in_location",
                })
                .exec();
            const bankDetails = await BankDetailInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const mobilePayData = await MobilePayInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const documentData = await DocumentInfo.find({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const locationData = await LocationInfo.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const onDutyData = await OnDuty.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const openingHoursData = await OpeningHours.findOne({
                for_portal_user: adminData.for_portal_user._id,
            }).exec();
            const profilePicKey = adminData.profile_picture;
            const profilePictureArray = [profilePicKey]
            const headers = {
                'Authorization': req.headers['authorization']
            }


            if (profilePicKey != "" && profilePicKey != undefined) {
                const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, headers, 'pharmacyServiceUrl');
                adminData.profile_picture_signed_url = pharmacyLogo.data[0]
            } else {
                adminData.profile_picture_signed_url = ""
            }

            if (0 < adminData.pharmacy_picture.length) {
                const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: adminData.pharmacy_picture }, headers, 'pharmacyServiceUrl');
                adminData.pharmacy_picture_signed_urls = pharmacyLogo.data
            } else {
                adminData.pharmacy_picture_signed_urls = []
            }

            let licencePic = adminData?.licence_details?.licence_picture;
            let licencePicSignedUrl = "";

            if (licencePic != "" && licencePic != undefined) {
                const licencePicture = await httpService.postStaging('pharmacy/get-signed-url', { url: [licencePic] }, headers, 'pharmacyServiceUrl');
                licencePicSignedUrl = licencePicture.data[0]

            } else {
                licencePicSignedUrl = ""
            }

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    portalUserData,
                    mobilePayData,
                    bankDetails,
                    adminData,
                    licencePicSignedUrl,
                    documentData,
                    locationData,
                    onDutyData,
                    openingHoursData
                },
                message: `pharmacy admin details fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: null,
                message: `failed to fetch pharmacy admin details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteActiveadmin(req, res) {
        let actionMessage;

        try {
            const { action_name, action_value, id } = req.body
            console.log(req.body, 'req.body');
            let key;
            key = action_name === "delete" ? 'isDeleted' : action_name === "active" ? "isActive" : ''
            console.log(key, 'key');
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
                if (action_name === "active" && action_value) {
                    actionMessage = "actived"
                } else if (action_name === "active" && !action_value) {
                    actionMessage = "deactived"
                }
                if (action_name === "delete" && action_value) {
                    actionMessage = "deleted"
                }

                sendResponse(req, res, 200, {
                    status: true,
                    data: portalData,
                    message: `Pharmacy ${actionMessage} successfully`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `Invalid Parameter`,
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to ${actionMessage} staff`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async lockProfile(req, res) {
        try {
            const { id, lock_user } = req.body;
            const portalUserData = await PortalUser.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        lock_user,
                    },
                },
                { new: true }
            ).exec();
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    portalUserData,
                },
                message: `pharmacy admin details updated successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to update pharmacy admin details`,
                errorCode: "INTERNAL_SERVER_ERROR",
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
                        Key: `pharmacy/${userId}/${docType}/${doc.name}`,
                    });
                    tempResult.push(s3result);
                });
                result = await Promise.all(tempResult);
            } else {
                result = await uploadFile(req.files.docName.data, {
                    Bucket: "healthcare-crm-stage-docs",
                    Key: `pharmacy/${userId}/${docType}/${req.files.docName.name}`,
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


    async uploadBase64(req, res) {
        try {
            const { userId, docType, multiple, docName, fileName } = req.body;
            let result = null;

            result = await uploadBase64(docName, {
                Bucket: "healthcare-crm-stage-docs",
            }, userId, docType, fileName);

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

    async saveDocumentMetaData(req, res) {
        try {
            const result = await DocumentInfo.insertMany(req.body);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully saved document metadata",
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to save document metadata`,
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
    async getAllPharmacy(req, res) {
        try {
            const { searchKey } = req.query;
            var filter = { verify_status: "APPROVED" };
            if (searchKey != '' && searchKey) {
                filter.pharmacy_name = { $regex: searchKey || "", $options: "i" }
            }
            const result = await AdminInfo.find(filter).select({ for_portal_user: 1, pharmacy_name: 1 }).exec();
            console.log(result, "result check");
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `all pharmacy fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async checkRoute(req, res) {
        try {
            sendResponse(req, res, 200, {
                status: true,
                data: 'result',
                message: `route working`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async advanceSearchPharmacyList(req, res) {
        try {
            const {
                limit,
                page,
                pharmacy_name,
                city,
                neighborhood,
                province,
                department,
                onDutyStatus,
                openingHoursStatus,
                long,
                lat,
                currentTimeStamp,
                healthcare-crmPartner,
                rating,
                medicinesOrder,
                medicineAvailability,
                medicinePrice,
                insuranceAccpted
            } = req.body
            console.log(onDutyStatus, "onDutyStatusss___");
            var maxDistance = req.body.maxDistance
            console.log(maxDistance, "maxDistance")
            if (maxDistance == undefined || maxDistance == 0) {
                maxDistance = 5
            }
            // const current_timestamp = new Date()
            const current_timestamp = new Date(currentTimeStamp)
            console.log(current_timestamp, "current_timestamppp");
            var day = current_timestamp.getDay()
            var hour = current_timestamp.getHours().toString()
            var minute = current_timestamp.getMinutes().toString()
            if (hour.toString().length == 1) {
                hour = "0" + hour;
            }
            if (minute.toString().length == 1) {
                minute = "0" + minute;
            }
            var ratingnew = '';
            if (rating == 'LH') {
                ratingnew = { $sort: { rating: 1 } };
            }
            else if (rating == 'HL') {
                ratingnew = { $sort: { rating: -1 } };

            }
            console.log(ratingnew, "ratingnew");
            const hourAndMin = hour + minute
            var pharmacy_name_filter = {}
            var city_filter = {}
            var neighborhood_filter = {}
            var province_filter = {}
            var department_filter = {}
            var onDutyStatus_filter = {}
            var openingHoursStatus_filter = {}
            var geoNear_filter = {}
            var healthcare-crmPartner_filter = {}
            var medicinesOrder_filter = {}
            var medicineAvailability_filter = {}
            var medicinePrice_filter = {}
            var insuranceAccpted_filter = {}

            if (long != "" && lat != "") {
                geoNear_filter = {
                    $geoNear:
                    {
                        near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
                        distanceField: "distance",
                        minDistance: 0, //0 KM
                        maxDistance: maxDistance * 1000, //5 KM         
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
                        //  minDistance: 0, //0 KM
                        //  maxDistance: 500, //5 KM         
                        includeLocs: "loc",
                        spherical: true,
                        distanceMultiplier: 0.001
                    }
                }
            }
            if (pharmacy_name != "") {
                pharmacy_name_filter = {
                    pharmacy_name: { $regex: pharmacy_name || '', $options: "i" }
                }
            }
            console.log(pharmacy_name_filter, "pharmacy_name_filterr____");
            if (medicinesOrder) {
                medicinesOrder_filter = {
                    "medicine_request.prescription_order": Boolean(medicinesOrder)
                }
            }
            if (medicineAvailability) {
                medicineAvailability_filter = {
                    "medicine_request.request_medicine_available": Boolean(medicineAvailability)
                }
            }
            if (medicinePrice) {
                medicinePrice_filter = {
                    "medicine_request.medicine_price_request": Boolean(medicinePrice)
                }
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
            console.log(insuranceAccpted);
            if (insuranceAccpted != "") {
                insuranceAccpted_filter = {
                    insurance_accepted: mongoose.Types.ObjectId(insuranceAccpted),
                }
            }
            if (healthcare-crmPartner != "" && healthcare-crmPartner != 'ALL') {

                healthcare-crmPartner_filter = {
                    createdBy: { $regex: 'self' || '', $options: "i" }
                }
            }
            if (day == 0) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.sun.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.sun.end_time", hourAndMin] }
                ]
            }
            if (day == 1) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.mon.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.mon.end_time", hourAndMin] }
                ]
            }
            if (day == 2) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.tue.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.tue.end_time", hourAndMin] }
                ]
            }
            if (day == 3) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.wed.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.wed.end_time", hourAndMin] }
                ]
                console.log(day_filter, "day_filter_Wedayyyyyyy___");
            }
            if (day == 4) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.thu.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.thu.end_time", hourAndMin] }
                ]
            }
            if (day == 5) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.fri.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.fri.end_time", hourAndMin] }
                ]
                //console.log(day_filter, "day_filter_Fridayyyyyyy");
            }
            if (day == 6) {
                var day_filter = [
                    { $lte: ["$openingshours.week_days.sat.start_time", hourAndMin] },
                    { $gt: ["$openingshours.week_days.sat.end_time", hourAndMin] }
                ]
                //console.log(day_filter, "day_filter_Saturday");
            }

            if (onDutyStatus.toString() != "") {
                if (onDutyStatus.toString() == "true") {
                    onDutyStatus_filter = {
                        onDutyStatus: true
                    }
                } else {

                    onDutyStatus_filter = {
                        onDutyStatus: { $size: 0 }
                    }
                }
            }
            console.log(onDutyStatus, "onDutyStatussss_New");
            if (openingHoursStatus.toString() != "") {
                if (openingHoursStatus.toString() == "true") {
                    openingHoursStatus_filter = {
                        openingHoursStatus: true
                    }
                } else {
                    openingHoursStatus_filter = {
                        openingHoursStatus: { $size: 0 }
                    }
                }
            }
            var pipeline = [

                geoNear_filter,
                {
                    $lookup: {
                        from: "admininfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "admin",
                    }
                },
                { $unwind: "$admin" },
                {
                    $addFields: {
                        pharmacy_name: "$admin.pharmacy_name",
                        profile_picture: "$admin.profile_picture",
                        medicine_request: "$admin.medicine_request",
                        verify_status: "$admin.verify_status",
                        insurance_accepted: "$admin.insurance_accepted",
                    }
                },
                {
                    $lookup: {
                        from: "openinghoursinfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "openinghours",
                    }
                },
                { $unwind: "$openinghours" },
                { $unwind: "$openinghours.week_days" },
                { $unwind: "$openinghours.open_date_and_time" },
                { $unwind: "$openinghours.close_date_and_time" },
                {
                    $addFields: {

                        closingHoursStartTimestamp: "$openinghours.close_date_and_time.start_time_with_date",
                        closingHoursEndTimestamp: "$openinghours.close_date_and_time.end_time_with_date",
                    }
                },
                {
                    $lookup: {
                        from: "ondutyinfos",
                        localField: "for_portal_user",
                        foreignField: "for_portal_user",
                        as: "onduty",
                    }
                },
                { $unwind: "$onduty" },
                { $unwind: "$onduty.on_duty" },
                { $unwind: "$onduty.on_duty.from_date_timestamp" },
                { $unwind: "$onduty.on_duty.to_date_timestamp" },


                {
                    $addFields: {
                        onDutyStatus: { //if currentTimeStamp in between onDuty open and close
                            $and: [{ $lte: ["$onduty.on_duty.from_date_timestamp", current_timestamp] }, { $gte: ["$onduty.on_duty.to_date_timestamp", current_timestamp] }]
                        },

                    }
                },
                {
                    $addFields: {
                        openingHoursStatus: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $lte: ["$onduty.on_duty.from_date_timestamp", current_timestamp] },
                                        { $gte: ["$onduty.on_duty.to_date_timestamp", current_timestamp] }
                                    ]
                                },
                                then: true, // First condition is true, set openingHoursStatus to true
                                else: {
                                    $cond: {
                                        if: {
                                            $and: day_filter // Second condition (day_filter) will be evaluated only if the first condition is false
                                        },
                                        then: true, // Second condition is true, set openingHoursStatus to true
                                        else: false // Second condition is false, set openingHoursStatus to false
                                    }
                                }
                            }
                        }
                    }
                },
                //{ $addFields: { onDutyStatus: { $filter: { input: "$onDutyStatus1", as: "item", cond: { $eq: ["$$item", true] } } } } },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "portalusersdata",
                    }
                },
                { $unwind: "$portalusersdata" },
                {
                    $addFields: {
                        rating: "$portalusersdata.average_rating",
                        isDeleted: "$portalusersdata.isDeleted",
                        lock_user: "$portalusersdata.lock_user",
                        isActive: "$portalusersdata.isActive",
                        createdBy: "$portalusersdata.createdBy",
                        email: "$portalusersdata.email",
                        phone_number: "$portalusersdata.phone_number"
                    }
                },
                {
                    $match: {
                        verify_status: "APPROVED",
                        isDeleted: false,
                        lock_user: false,
                        isActive: true,
                        $nor: [
                            { $and: [{ closingHoursStartTimestamp: { $lt: current_timestamp } }, { closingHoursEndTimestamp: { $gt: current_timestamp } }] }
                        ],
                        $and: [
                            pharmacy_name_filter,
                            city_filter,
                            neighborhood_filter,
                            //openingHoursStatus_filter,
                            /*   {
                                  onDutyStatus: true,
                              }, */
                            //{ $expr: { $not: { $eq: [{ $size: "$onDutyStatus" }, 0] } } },

                            province_filter,
                            department_filter,
                            healthcare-crmPartner_filter,
                            medicinesOrder_filter,
                            medicineAvailability_filter,
                            medicinePrice_filter,
                            insuranceAccpted_filter
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$admin.for_portal_user",
                        pharmacy_name: { $addToSet: "$pharmacy_name" },
                        for_portal_user: { $addToSet: "$for_portal_user" },
                        address: { $addToSet: "$address" },
                        profile_picture: { $addToSet: "$profile_picture" },
                        medicine_request: { $addToSet: "$medicine_request" },
                        slogan: { $addToSet: "$admin.slogan" },
                        about_pharmacy: { $addToSet: "$admin.about_pharmacy" },
                        // location: { $addToSet: "$location" },
                        onDutyStatus1: { $addToSet: "$onDutyStatus" },
                        openingHoursStatus1: { $addToSet: "$openingHoursStatus" },
                        // document: { $addToSet: "$document" },
                        city: { $addToSet: "$city" },
                        neighborhood: { $addToSet: "$neighborhood" },
                        province: { $addToSet: "$province" },
                        department: { $addToSet: "$department" },
                        distance: { $addToSet: "$distance" },
                        rating: { $addToSet: "$rating" },
                        createdBy: { $addToSet: "$createdBy" },
                        hoursset: { $addToSet: "$admin.hoursset" },
                        email: { $addToSet: "$email" },
                        phone_number: { $addToSet: "$phone_number" },
                        coordinates : {$addToSet : "$loc"}
                    }
                },
                { $addFields: { onDutyStatus: { $filter: { input: "$onDutyStatus1", as: "item", cond: { $eq: ["$$item", true] } } } } },
                { $addFields: { openingHoursStatus: { $filter: { input: "$openingHoursStatus1", as: "item", cond: { $eq: ["$$item", true] } } } } },

                { $unwind: "$pharmacy_name" },
                { $unwind: "$for_portal_user" },
                { $unwind: "$address" },
                { $unwind: "$profile_picture" },
                { $unwind: "$medicine_request" },
                { $unwind: "$slogan" },
                { $unwind: "$about_pharmacy" },
                // { $unwind: "$location" },
                // { $unwind: "$onDutyStatus" },
                // { $unwind: "$for_portal_user" },
                // { $unwind: "$openingHoursStatus" },
                // { $unwind: "$document" },
                { $unwind: "$city" },
                { $unwind: "$neighborhood" },
                { $unwind: "$province" },
                { $unwind: "$department" },
                { $unwind: "$distance" },
                { $unwind: "$rating" },
                { $unwind: "$hoursset" },
                { $unwind: "$email" },

                { $unwind: "$phone_number" },
                // { $match: {
                //     $and:[onDutyDoctor_filter, openNow_filter]
                //   }},
                { $match: onDutyStatus_filter },
                { $match: openingHoursStatus_filter },
                { $sort: { distance: 1 } },
                // { $sort: { rating: ratingnew } },
                // { $skip: (page - 1) * limit },
                // { $limit: limit * 1 },
            ]
            if (ratingnew != '') {
                pipeline.push(ratingnew);
            }
            console.log(ratingnew, "ratingnew");
            const count = await LocationInfo.aggregate(pipeline)

            if (limit > 0) {
                pipeline.push({ $skip: (page - 1) * limit });
                pipeline.push({ $limit: limit * 1 });
            }
            const result = await LocationInfo.aggregate(pipeline)
            const headers = {
                'Authorization': req.headers['authorization']
            }
            //console.log(result, "resultresulttttt");
            for (let index = 0; index < result.length; index++) {
                const profilePicKey = result[index].profile_picture;
                if (profilePicKey != "") {
                    const profilePictureArray = [profilePicKey]
                    const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, headers, 'pharmacyServiceUrl');
                    result[index].profile_picture = pharmacyLogo.data[0]
                }
                const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: result[index].for_portal_user } }).countDocuments()
                result[index].review = getRatingCount;
            }
            console.log(result.length, "resultLoopppppppp_____");


            sendResponse(req, res, 200, {
                status: true,
                data: {
                    totalPages: Math.ceil(count.length / limit),
                    currentPage: page,
                    totalResult: count.length,
                    result
                },
                message: `all pharmacy fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "errorr_____");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async postReviewAndRating(req, res) {
        try {
            const { for_portal_user, patient_login_id, rating, comment } = req.body
            //Store Location details
            let reviewObject = { rating, comment }
            const getReview = await ReviewAndRating.find({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }).select('rating');
            console.log(getReview, 'getAllRatings');
            if (getReview.length > 0) {
                await ReviewAndRating.findOneAndUpdate({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }, {
                    $set: reviewObject
                }, { new: true }).exec();
            } else {
                reviewObject.for_portal_user = for_portal_user
                reviewObject.patient_login_id = patient_login_id
                reviewObject.portal_user_id = for_portal_user
                const reviewData = new ReviewAndRating(reviewObject);
                await reviewData.save()
            }
            const getAllRatings = await ReviewAndRating.find({ portal_user_id: mongoose.Types.ObjectId(for_portal_user) }).select('rating')
            console.log(getAllRatings, 'getAllRatings');
            const totalCount = getAllRatings.length
            let count = 0
            for (const rating of getAllRatings) {
                count += rating.rating
            }
            console.log(count, 'count');
            const average_rating = (count / totalCount).toFixed(1);
            console.log(average_rating, 'average_rating');
            await PortalUser.findOneAndUpdate({ _id: { $eq: for_portal_user } }, {
                $set: { average_rating }
            }, { new: true }).exec();
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: `Review added successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong to post review`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getReviewAndRating(req, res) {
        try {
            var { portal_user_id, page, limit } = req.query;
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }
            if(portal_user_id !=''){

                let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portal_user_id) });
    
                if (checkUser.role === 'PHARMACY_STAFF') {
    
                    let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(portal_user_id) });
    
                    portal_user_id = adminData?.for_staff
    
                }
            }

            var filter = {};
            if (portal_user_id == '') {

            } else {

                filter = {
                    portal_user_id: { $in: [mongoose.Types.ObjectId(portal_user_id)] },
                }
            }

            console.log("FILTER==>", filter)

            // const result = await ReviewAndRating.find(filter)
            //     .sort([["createdAt", -1]])
            //     .limit(limit * 1)
            //     .skip((page - 1) * limit)
            //     .exec();

            let aggregate = [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'admininfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'admininfos'
                    }
                },
                { $unwind: "$admininfos" },
                {
                    $project: {
                        rating: 1,
                        comment: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        patient_login_id: 1,
                        pharmacyName: '$admininfos.pharmacy_name'
                    }
                },
            ];

            const totalCount = await ReviewAndRating.aggregate(aggregate);
            aggregate.push(
                {
                    $sort: sortingarray
                }
            )

            if (limit > 0) {
                aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
            }

            const result = await ReviewAndRating.aggregate(aggregate);

            // console.log("RESULT===>", result, result.length)

            let patientIDArray = []
            for (const id of result) {
                patientIDArray.push(id.patient_login_id)
            }
            console.log("patientIDArray==>", patientIDArray)

            const resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: patientIDArray }, {}, 'patientServiceUrl');
            const patientDetails = resData.data
            let ratingArray = [];

            for (const value of result) {
                ratingArray.push({
                    rating: value?.rating,
                    comment: value?.comment,
                    createdAt: value?.createdAt,
                    updatedAt: value?.updatedAt,
                    patientName: patientDetails[value?.patient_login_id]?.full_name,
                    profile_picture: patientDetails[value?.patient_login_id]?.profile_pic,
                    pharmacyName: value?.pharmacyName,
                    _id: value?._id
                })
            }

            var getAverage;
            var getAllRatings;
            var ratingCount;

            if (portal_user_id != '') {
                getAverage = await PortalUser.findById(portal_user_id).select('average_rating')
                getAllRatings = await ReviewAndRating.find({ portal_user_id: { $eq: portal_user_id } }).select('rating')

                let fiveStart = 0
                let fourStart = 0
                let threeStart = 0
                let twoStart = 0
                let oneStart = 0

                for (const rating of getAllRatings) {
                    if (rating.rating === 5) fiveStart += 1
                    if (rating.rating === 4) fourStart += 1
                    if (rating.rating === 3) threeStart += 1
                    if (rating.rating === 2) twoStart += 1
                    if (rating.rating === 1) oneStart += 1
                }
                ratingCount = { fiveStart, fourStart, threeStart, twoStart, oneStart }
            }


            // const totalCount = await ReviewAndRating.find({ portal_user_id: { $eq: portal_user_id } }).countDocuments()

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    ratingArray,
                    getAverage,
                    ratingCount,
                    totalCount: totalCount?.length,
                    currentPage: page,
                    totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
                },
                message: `successfully fetched review and ratings`,
                errorCode: null,
            });
        } catch (error) {
            console.log("error_________",error);
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `something went wrong while fetching reviews`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async deleteReviewAndRating(req, res) {
        try {
            const { _id } = req.body;

            const result = await ReviewAndRating.deleteOne({ _id })

            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    data: null,
                    message: `Rating & Review Deleted Successfully`,
                    errorCode: null,
                });
            }

        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: `something went wrong`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async documentInformation(req, res) {
        try {
            const result = []
            for (const id of req.query.id.split(',')) {
                const data = await DocumentInfo.findOne({ _id: id }).exec();
                result.push(data);
            }
            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `document fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy`,
            });
        }
    }

    async getAllPharmacyAdminDetails(req, res) {
        try {
            const allIds = req.query.pharmacyIDs
            let ObjectIdArray = [];
            for (const id of allIds.split(",")) {
                ObjectIdArray.push(mongoose.Types.ObjectId(id))
            }
            const filter = {
                verify_status: "APPROVED",
                'for_portal_user_data.isDeleted': false,
                'for_portal_user_data.isActive': true,
                'for_portal_user_data.lock_user': false,
                for_portal_user: { $in: ObjectIdArray }
            }

            let aggregate = [
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_portal_user",
                        foreignField: "_id",
                        as: "for_portal_user_data",
                    }
                },
                { $unwind: "$for_portal_user_data" },
                { $match: filter },
                {
                    $project: {
                        pharmacy_name: 1,
                        profile_picture: 1,
                        portal_user_id: "$for_portal_user_data._id"
                    }
                },
            ];
            const result = await AdminInfo.aggregate(aggregate);
            const dataArray = []
            for (let data of result) {
                data['name'] = data.pharmacy_name
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
            console.log(error, "check eroror00");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async enterLocation(req, res) {
    //     try {
    //         const locationInfo = new LocationInfo(req.body);
    //         const locationData = await locationInfo.save();
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             data: locationData,
    //             message: `location added`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             data: error,
    //             message: `failed to get all pharmacy details`,
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async pharmacyDetails(req, res) {
        try {
            const { pharmacyId } = req.query
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const portalUserData = await PortalUser.findOne({ _id: pharmacyId })
            const adminData = await AdminInfo.findOne({ for_portal_user: pharmacyId }).populate({ path: "for_portal_user" })
            const openingHours = await OpeningHours.findOne({ for_portal_user: pharmacyId })
            console.log(openingHours, "openingHours________");
            const onDuty = await OnDuty.findOne({ for_portal_user: pharmacyId })
            var onDutyStatus = false
            if (onDuty) {
                for (let index = 0; index < onDuty.on_duty.length; index++) {
                    onDutyStatus = onDuty.on_duty[index].from_date_timestamp < new Date() && onDuty.on_duty[index].to_date_timestamp > new Date()
                    if (onDutyStatus == true) {
                        break
                    }
                }
            }
            const pharmacy_location = await LocationInfo.findOne({_id: mongoose.Types.ObjectId(adminData?.in_location)})
            const associationIdArray = adminData?.association?.name
            const profilePictureArray = [adminData?.profile_picture]
            const pharmacyLogo = await httpService.postStaging('pharmacy/get-signed-url', { url: profilePictureArray }, headers, 'pharmacyServiceUrl');

            var Sunday = []
            var Monday = []
            var Tuesday = []
            var Wednesday = []
            var Thursday = []
            var Friday = []
            var Saturday = []
            if (openingHours) {
                openingHours.week_days.forEach((data) => {
                    Sunday.push({
                        "start_time": data.sun.start_time.slice(0, 2) + ":" + data.sun.start_time.slice(2, 4),
                        "end_time": data.sun.end_time.slice(0, 2) + ":" + data.sun.end_time.slice(2, 4)
                    })
                    Monday.push({
                        "start_time": data.mon.start_time.slice(0, 2) + ":" + data.mon.start_time.slice(2, 4),
                        "end_time": data.mon.end_time.slice(0, 2) + ":" + data.mon.end_time.slice(2, 4)
                    })
                    Tuesday.push({
                        "start_time": data.tue.start_time.slice(0, 2) + ":" + data.tue.start_time.slice(2, 4),
                        "end_time": data.tue.end_time.slice(0, 2) + ":" + data.tue.end_time.slice(2, 4)
                    })
                    Wednesday.push({
                        "start_time": data.wed.start_time.slice(0, 2) + ":" + data.wed.start_time.slice(2, 4),
                        "end_time": data.wed.end_time.slice(0, 2) + ":" + data.wed.end_time.slice(2, 4)
                    })
                    Thursday.push({
                        "start_time": data.thu.start_time.slice(0, 2) + ":" + data.thu.start_time.slice(2, 4),
                        "end_time": data.thu.end_time.slice(0, 2) + ":" + data.thu.end_time.slice(2, 4)
                    })
                    Friday.push({
                        "start_time": data.fri.start_time.slice(0, 2) + ":" + data.fri.start_time.slice(2, 4),
                        "end_time": data.fri.end_time.slice(0, 2) + ":" + data.fri.end_time.slice(2, 4)
                    })
                    Saturday.push({
                        "start_time": data.sat.start_time.slice(0, 2) + ":" + data.sat.start_time.slice(2, 4),
                        "end_time": data.sat.end_time.slice(0, 2) + ":" + data.sat.end_time.slice(2, 4)
                    })
                }
                )
            }


            var backGround = {
                "pharmacy_name": adminData?.pharmacy_name,
                "createdBy": portalUserData?.createdBy,
                "hoursset": adminData?.hoursset,
                "PharmacyId": portalUserData?._id,
                "pharmacy_logo": pharmacyLogo?.data[0],
                "slogan": adminData?.slogan,
                "medicine_request": adminData?.medicine_request,
                "about_pharmacy": adminData?.about_pharmacy,
                "associationGroup": {
                    "enabled": adminData?.association.enabled,
                    // "name": [
                    //     "Sun Association"
                    // ]
                    "name": [
                        adminData?.association?.name
                    ]
                },
                "show_to_patient":adminData?.show_to_patient,
                "contactInfo": {
                    "phone": adminData?.main_phone_number,
                    "email": adminData?.for_portal_user.email,
                    "location": adminData?.address,
                },
                "pharmacyLocation":pharmacy_location,
                // "openingHours": openingHours.week_days,
                "openingHours": {
                    Sunday,
                    Monday,
                    Tuesday,
                    Wednesday,
                    Thursday,
                    Friday,
                    Saturday
                },
                onDutyStatus
            }
            //Get Accepted Insurance company

            //var acceptedInsuranceCompanies = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: adminData.main_phone_number }, {}, 'insuranceServiceUrl');
            var acceptedInsuranceCompanies = await httpService.getStaging('claim/getInsuranceAcceptedList', { pharmacyId: adminData?.for_portal_user._id }, {}, 'pharmacyServiceUrl');

            acceptedInsuranceCompanies = acceptedInsuranceCompanies.body
            var reviews = {
                "rating": 4.5,
                "star5": "2.0k",
                "star4": "2.0k",
                "star3": "2.0k",
                "star2": "2.0k",
                "star1": "2.0k",
                "comments": [
                    {
                        "userName": "John Doe",
                        "userProfilePic": "https://d2ng8gz95cwpar.cloudfront.net/pharmacy/638266cad3c3b145fd5de224/profilepicture/iphone14.jpeg?Expires=1674036455634&Key-Pair-Id=AKIARAUGHQ6MZIPOR7SK&Signature=NSUxWVrwQ42SFmpDXDIlnWpb7rVWWqbbCrwqU4wV9~ZvVxk15kCQxMSni1MmvA9kJQWUUt~8Xea~5WR0uUPn14h5MEJCxNFnwbrT1ZkvPb9nb08WlBWjck1nQ4jbJQUWTbu3zESmyeOXg-nIbTGREMwt79Pl3Nj7XdZANMt-3-Eay1wF-TGKTOaVERIh9g103oNjP1P3qcsZCCfZa9EzT8Bji6VnmZv-Mgt8l1IKQXncGbFnYdWZpRCb77-kZUorgG3ZedaAG7uKPbbMdYjm9D4-1iptTARB6UAZUup3Qx6H4I4MkPCPL-wb2IyBmHxOd3et~qexAscvltkabQ7zgg__",
                        "ratingByUser": 4,
                        "userComment": `Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo.`,
                        "date": "2023-01-18"
                    }
                ]
            }





            sendResponse(req, res, 200, {
                status: true,
                data: {
                    backGround,
                    acceptedInsuranceCompanies,
                    reviews
                },
                message: `pharmacy details fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            console.log(error, "dhhjdg____");
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getPharmacyByMainmobilenumber(req, res) {
        try {
            const { main_phone_number, insuracneCompanyId, oldInsuracneCompanyId, oldInsuracneCompanyIdforstatus } = req.body
            const headers = {
                'Authorization': req.headers['authorization']
            }
            const adminData = await AdminInfo.find({ main_phone_number: { $in: main_phone_number } }, {
                insurance_accepted: 1
            });
            adminData.forEach(async element => {
                let insurance_accepted = 'insurance_accepted' in element ? element.insurance_accepted : [];
                if (insurance_accepted.indexOf(insuracneCompanyId) == -1) {
                    insurance_accepted.push(insuracneCompanyId);
                }
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
                const setIp = await AdminInfo.updateOne(
                    { _id: element._id },
                    {
                        $set: {
                            insurance_accepted: insurance_accepted
                        },
                    },
                    { new: true }
                ).exec();


            });

            sendResponse(req, res, 200, {
                status: true,
                data: {
                    adminData
                },
                message: `pharmacy details fetched successfully`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `failed to get all pharmacy details`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getReviewAndRatinByPatient(req, res) {
        try {
            const { patientId } = req.query;

            const result = await ReviewAndRating.aggregate([
                {
                    $match: { patient_login_id: mongoose.Types.ObjectId(patientId) }
                },
                {
                    $lookup: {
                        from: 'portalusers',
                        localField: 'portal_user_id',
                        foreignField: '_id',
                        as: 'portalusers'
                    }
                },
                { $unwind: { path: "$portalusers", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'admininfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'admininfos'
                    }
                },
                { $unwind: { path: "$admininfos", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'staffinfos',
                        localField: 'portal_user_id',
                        foreignField: 'for_portal_user',
                        as: 'staffinfos'
                    }
                },
                { $unwind: { path: "$staffinfos", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'documentinfos',
                        localField: 'staffinfos.staff_profile',
                        foreignField: '_id',
                        as: 'documentinfos'
                    }
                },
                { $unwind: { path: "$documentinfos", preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        _id: 1,
                        rating: 1,
                        comment: 1,
                        updatedAt: 1,
                        portal_user_id: 1,
                        role: "$portalusers.role",
                        pharmacyName: "$admininfos.pharmacy_name",
                        pharmacyProfile: "$admininfos.profile_picture",
                        staffProfile: "$documentinfos.url",
                        staffName: "$staffinfos.staff_name"
                    }
                }
            ]);

            let objArray = [];

            //arrange data
            for (const element of result) {
                const date = new Date(element.updatedAt);

                const year = date.getFullYear();
                const month = date.getMonth() + 1; // JavaScript months are zero-based
                const day = date.getDate();
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const seconds = date.getSeconds();

                let filteredDate = `${year}-${month}-${day}`
                let filteredTime = `${hours}:${minutes}:${seconds}`
                if (element.role === 'PHARMACY_ADMIN') {
                    objArray.push(
                        {
                            _id: element?._id,
                            rating: element?.rating,
                            comment: element?.comment,
                            date: filteredDate,
                            time: filteredTime,
                            role: element?.role,
                            name: element?.pharmacyName,
                            for_portal_user: element?.portal_user_id,
                            profileUrl: element?.pharmacyProfile ? element?.pharmacyProfile : '',
                        }
                    )
                } else {
                    objArray.push(
                        {
                            rating: element?.rating,
                            comment: element?.comment,
                            role: element?.role,
                            date: filteredDate,
                            time: filteredTime,
                            name: element?.staffName,
                            for_portal_user: element?.portal_user_id,
                            profileUrl: element?.staffProfile ? element?.staffProfile : '',
                        }
                    )
                }
            }

            //get signed profile picture url
            for (const element of objArray) {
                if (element?.profileUrl != "") {
                    const profilePic = await getDocument(element?.profileUrl)
                    element.profileUrl = profilePic
                } else {
                    element.profileUrl = ""
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                data: objArray,
                message: `successfully fetched review and ratings`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `something went wrong while fetching reviews`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getPharmacyById(req, res) {
        const { for_portal_user } = req.query
        try {

            const findUsers = await AdminInfo.findOne({ for_portal_user }, {
                for_portal_user: 1,
                pharmacy_name: 1,
                profile_picture: 1
            })

            if (findUsers?.profile_picture != '' && findUsers?.profile_picture != null) {
                const profilePic = await getDocument(findUsers?.profile_picture)
                findUsers.profile_picture = profilePic
            }
            sendResponse(req, res, 200, {
                status: true,
                body: findUsers,
                message: "Get pharmacy list",
                errorCode: null,
            });
        }
        catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get pharmacy details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async listApprovedPharmacyAdminUser(req, res) {
        try {
            const { name, status } = req.query;
            console.log("req.query", req.query);
            const result = await AdminInfo.find({
                $and: [
                    {
                        pharmacy_name: { $regex: name || "", $options: "i" },
                    },
                    {
                        verify_status: { $regex: status || "", $options: "i" }
                    },
                ],
            })
                .select(
                    "for_portal_user pharmacy_name verify_status"
                )
                .populate('for_portal_user', null, null, { createdBy: 'self' })

                .exec();
            console.log("result", result);
            const count = await AdminInfo.countDocuments({
                $and: [
                    {
                        pharmacy_name: { $regex: name || "", $options: "i" },
                    },
                    {
                        verify_status: { $regex: status || "", $options: "i" }
                    }
                ],
            });
            console.log("result", result);
            sendResponse(req, res, 200, {
                status: true,
                data: {
                    data: result,
                    totalCount: count,
                },
                message: "successfully fetched pharmacy admin list",
                errorCode: null,
            });
        } catch (error) {
            console.log(error)
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: "failed to fetch pharmacy admin list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async sendInvitation(req, res) {
        try {
            const {
                first_name,
                middle_name,
                last_name,
                email,
                phone,
                address,
                created_By,
                verify_status,
                invitationId
            } = req.body;
            console.log(req.body, "=========req");

            if (invitationId) {
                // Update the existing record
                const updatedUserData = await Invitation.findOneAndUpdate(
                    { _id: invitationId },
                    {
                        $set: {
                            first_name,
                            middle_name,
                            last_name,
                            email,
                            phone,
                            address,
                            created_By,
                            verify_status: "PENDING"
                        }
                    },
                    { new: true }
                );

                if (updatedUserData) {
                    const loggedInData = await AdminInfo.find({ for_portal_user: created_By });
                    const loggeInname = loggedInData[0].pharmacy_name;
                    console.log("loggeInname===>", loggeInname);
                    const content = sendMailInvitations(email, first_name, last_name, loggeInname);
                    const mailSent = await sendEmail(content);

                    if (mailSent) {
                        updatedUserData.verify_status = "SEND";
                        const result = await updatedUserData.save();
                        console.log("result-->", result);
                    }

                    sendResponse(req, res, 200, {
                        status: true,
                        data: updatedUserData,
                        message: `Invitation updated and sent successfully`,
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 404, {
                        status: false,
                        data: null,
                        message: `Invitation with ID ${invitationId} not found`,
                        errorCode: "NOT_FOUND",
                    });
                }
            } else {
                // Create a new record
                let userData = await Invitation.findOne({ email, verify_status: "PENDING" });

                if (!userData) {
                    userData = new Invitation({
                        first_name,
                        middle_name,
                        last_name,
                        email,
                        phone,
                        address,
                        created_By,
                        verify_status: "PENDING"
                    });
                    userData = await userData.save();
                }

                const loggedInData = await AdminInfo.find({ for_portal_user: created_By });
                const loggeInname = loggedInData[0].pharmacy_name;
                console.log("loggeInname===>", loggeInname);
                const content = sendMailInvitations(email, first_name, last_name, loggeInname);
                const mailSent = await sendEmail(content);

                if (mailSent) {
                    userData.verify_status = "SEND";
                    const result = await userData.save();
                    console.log("result-->", result);
                }

                if (userData) {
                    console.log("run");
                    sendResponse(req, res, 200, {
                        status: true,
                        data: userData,
                        message: `Invitation sent successfully`,
                        errorCode: null,
                    });
                } else {
                    sendResponse(req, res, 200, {
                        status: false,
                        data: null,
                        message: `Invitation Send successfully`,
                        errorCode: null,
                    });
                }
            }
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `Failed to send invitation`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    };

    // async sendInvitation(req, res) {
    //     try {
    //         const { first_name, middle_name, last_name, email, phone, address, created_By, verify_status } = req.body;
    //         console.log(req.body, "=========req")
    //         let userData = await Invitation.findOne({ email, verify_status: "PENDING" });

    //         if (!userData) {
    //             userData = new Invitation({
    //                 first_name,
    //                 middle_name,
    //                 last_name,
    //                 email,
    //                 phone,
    //                 address,
    //                 created_By,
    //                 verify_status: "PENDING"
    //             });
    //             userData = await userData.save();
    //         }

    //         const loggedInData = await AdminInfo.find({ for_portal_user: req.body.created_By });
    //         const loggeInname = loggedInData[0].pharmacy_name;
    //         console.log("loggeInnameloggeInname=", loggeInname)
    //         const content = sendMailInvitations(email, first_name, last_name, loggeInname);

    //         const mailSent = await sendEmail(content);

    //         if (mailSent) {
    //             userData.verify_status = "SEND";
    //             const result = await userData.save();
    //             console.log("result-->", result);
    //         }

    //         if (userData) {
    //             console.log("run");
    //             sendResponse(req, res, 200, {
    //                 status: true,
    //                 data: userData,
    //                 message: `Invitation Send successfully`,
    //                 errorCode: null,
    //             });

    //         } else {
    //             sendResponse(req, res, 200, {
    //                 status: false,
    //                 data: null,
    //                 message: `Invitation Send successfully`,
    //                 errorCode: null,
    //             });
    //         }

    //     } catch (err) {
    //         console.log(err);
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             data: err,
    //             message: `failed to fetched list`,
    //             errorCode: "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async getAllInvitation(req, res) {
        try {
            var { for_portal_user, page, limit, searchKey, createdDate, updatedDate } = req.query;
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }

            let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(for_portal_user) });

            if (checkUser.role === 'PHARMACY_STAFF') {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) });

                for_portal_user = adminData?.for_staff

            }


            const filter = {};
            // const filterDate = {};

            if (searchKey && searchKey !== "") {
                filter.$or = [
                    { first_name: { $regex: searchKey } },
                ];
            }

            var dateFilter = {}
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);
                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj };
            }
            else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }

            const listdata = await Invitation.find({
                created_By: for_portal_user,
                ...filter,
                ...dateFilter,
            })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            const count = await Invitation.countDocuments({});

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    listdata,
                },
                message: `List Fetch successfully`,
                errorCode: null,
            });
        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInvitationById(req, res) {
        try {
            const { id } = req.query;
            const result = await Invitation.findOne({ _id: mongoose.Types.ObjectId(id) })

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Invitation Send successfully`,
                errorCode: null,
            })

        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteInvitation(req, res) {
        try {
            const { id } = req.body;
            const result = await Invitation.deleteOne({ _id: mongoose.Types.ObjectId(id) })

            sendResponse(req, res, 200, {
                status: true,
                data: result,
                message: `Invitation Deleted successfully`,
                errorCode: null,
            })

        } catch (err) {
            console.log(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: `failed to fetched list`,
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getOrderDetailsById(req, res) {
        try {
            const { ids } = req.query;


            const idObjects = ids.map((id) => mongoose.Types.ObjectId(id));

            const results = await OrderDetail.find({ _id: { $in: idObjects } });

            if (results.length === 0) {
                return res.status(200).json({ message: 'No matching OrderDetail found' });
            }

            sendResponse(req, res, 200, {
                status: true,
                data: results,
                message: 'Order Details',
                errorCode: null,
            });
        } catch (err) {
            console.error(err);
            sendResponse(req, res, 500, {
                status: false,
                data: err,
                message: 'Failed to fetch data',
                errorCode: 'INTERNAL_SERVER_ERROR',
            });
        }
    }


    async getPharmacyAssociation(req, res) {
        try {
            const { pharmacy_portal_id } = req.query
            const result = await AdminInfo.find({ for_portal_user: pharmacy_portal_id })
                .select({
                    association: 1
                })
                .populate({
                    path: "for_portal_user",
                    select: { email: 1 },
                    match: { 'for_portal_user.isDeleted': false },
                })

            let data = result[0];
            let name = []
            if (data.association.enabled && data.association.name.length > 0) {
                const resData = await httpService.getStaging('superadmin/get-all-association-group-by-id', { associationIds: data.association.name }, {}, 'superadminServiceUrl');

                for (const gname of resData.data) {
                    name.push(gname.group_name);
                }
            }
            var data11 = {
                association: {
                    enabled: data.association.enabled,
                    name: name
                },
                _id: data._id,
                for_portal_user: {
                    _id: data.for_portal_user._id,
                    email: data.for_portal_user.email
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: data11,
                message: `Pharmacy association details`,
                errorCode: null,
            });
        } catch (error) {
            // console.log(error,"error___");

            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : `failed to fetched hospital admin details`,
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async saveSuperadminNotification(req, res) {
        // console.log("sddfr>>>>>>", req.body)
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

    async totalPharmacyforAdminDashboard(req, res) {
        try {
            const totalCount = await PortalUser.countDocuments({ isDeleted: false });

            if (totalCount >= 0) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalCount },
                    message: "Pharmacy Count Fetch Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalCount: 0 },
                    message: "Pharmacy Count not Fetch",
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

    async notification(req, res) {
        try {

            // const notificationValue = new Notification(req.body)

            // const notificationData = await notificationValue.save()
            const userData = await PortalUser.findOne({ _id: req.body.for_portal_user });
            let notificationData;
            let navigationlink;
            if (userData?.notification) {
              const notificationValue = new Notification(req.body);
              notificationData = await notificationValue.save();

              const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", {socketuserid:req.body.for_portal_user }, {}, "gatewayServiceUrl");

              if (req.body.notitype == "Insurance Verified" || req.body.notitype == "Amount Send") {
                navigationlink = `patient/presciptionorder/neworder?orderId=${req.body.appointmentId}&pharmacyId${req.body.created_by}`
              }

              if (req.body.notitype == "medicine_price_request") {
                navigationlink = `pharmacy/medicinepricerequest/newprice?orderId=${req.body.appointmentId}`
              }

              if (req.body.notitype == "medicine_availability_request") {
                navigationlink = `pharmacy/medicinerequest/newavailability?orderId=${req.body.appointmentId}`
              }
              if (req.body.notitype == "order_request") {
                navigationlink = `pharmacy/presciptionorder/neworder?orderId=${req.body.appointmentId}`
              }
      
              const content = emailNotification(userData?.email, userData?.user_name, req.body.content, req.body.notitype, navigationlink);
              const mailSent = await sendEmail(content);
              console.log("mailSent_____________", mailSent)

              if(userData?.fcmToken) {
                await sendNotification(
                  req.body.content,
                  req.body.notitype,
                  userData?.fcmToken,
                  userData?._id
                );
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
            //    console.log(req.query);
            const notificationData = await Notification.find({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)

            }).sort({ createdAt: -1 }).limit(10)
            const count = await Notification.countDocuments({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
                new: true
            });
            const isViewcount = await Notification.countDocuments({
                for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
                isView: false
            });
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
                body: { list: newnotificationlist, count: count, isViewcount: isViewcount },

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

    async getPortalUserData(req, res) {
        try {
            let result = await PortalUser.find({ _id: mongoose.Types.ObjectId(req.query.data), isDeleted: false }).exec();

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


    async updatelogsData(req, res) {
        const { currentLogID , userAddress } = req.body;
        try {
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            if(userAddress){
                const findData = await Logs.findOneAndUpdate(
                    { _id: mongoose.Types.ObjectId(currentLogID) },
                    {
                        $set: {
                            userAddress: userAddress,
                            
                        },
                    },
                    { new: true }
                ).exec();
            }else{

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
module.exports = new PharmacyController();
