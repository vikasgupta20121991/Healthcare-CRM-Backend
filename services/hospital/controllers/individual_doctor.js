"use strict";

// models
import PortalUser from "../models/portal_user";
import BasicInfo from "../models/basic_info";
import HospitalAdminInfo from "../models/hospital_admin_info";
import ProfileInfo from "../models/profile_info";
import LocationInfo from "../models/location_info";
import PathologyTestInfo from "../models/pathology_test_info";
import BankDetailInfo from "../models/bank_detail";
import MobilePayInfo from "../models/mobile_pay";
import DoctorInfo from "../models/doctor_info";
import IndividualDoctorInfo from "../models/individual_doctor_info";
import StaffInfo from "../models/staff_info";
import EducationalDetail from "../models/educational_details";
import DoctorAvailability from "../models/doctor_availability";
import DocumentInfo from "../models/document_info";
import Counter from "../models/counter";
import ForgotPasswordToken from "../models/forgot_password_token";
import Otp2fa from "../models/otp2fa";
import Logs from "../models/logs";

import { getDocument } from "../helpers/s3";

import { externalUserAddEmail, sendMailInvitations } from "../helpers/emailTemplate";
import Invitation from "../models/email_invitation"


// utils
import { sendResponse } from "../helpers/transmission";
import { hashPassword } from "../helpers/string";
import { bcryptCompare, checkPassword, encryptData, encryptObjectData, generateRefreshToken, generateTenSaltHash, generateToken, handleRejectionError } from "../middleware/utils";
import { messageID, messages } from "../constant";
import crypto from "crypto"
import bcrypt from "bcrypt"
import { sendEmail } from "../helpers/ses";
import { generate6DigitOTP, smsTemplateOTP } from "../constant";
import { sendSms } from "../middleware/sendSms";
import { verifyEmail2fa, forgotPasswordEmail, resetPasswordEmail, forgotPasswordEmailForIndividualDoctor } from "../helpers/emailTemplate";
import { getFile, uploadFile } from "../helpers/s3";
import { agoraTokenGenerator } from "../helpers/chat"
import Http from "../helpers/httpservice"
import appointment from "../models/appointment";
import mongoose from "mongoose";
import staff_info from "../models/staff_info";
import GuestUser from "../models/guestuser";
import { notification } from "../helpers/notification";

const httpService = new Http()
class IndividualDoctor {
    async CreateGuestUser(req,res)
    {
        try {
            const {name} =req.body;
            if(name=='')
            {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Please enter Name",
                    errorCode: null,
                });
            }
            let token =  generateToken({name:name})
            let guestData= new GuestUser({
                name:name,
                token:token
            })
            let response=await guestData.save();
            if(response)
            {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: response,
                    message: "successfully created",
                    errorCode: null,
                });
            }
            else{
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Something went wrong",
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async signUp(req, res) {
        try {
            const {
                full_name,
                first_name,
                middle_name,
                last_name,
                email,
                password,
                country_code,
                mobile,
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
                    full_name: first_name + " " + middle_name + " " + last_name,
                    email,
                    country_code,
                    mobile,
                    password: newPassword,
                    role: "INDIVIDUAL_DOCTOR",
                    user_id: sequenceDocument.sequence_value,
                    isFirstTime: 0
                }
            );
            let userDetails = await userData.save();
            let adminData = new BasicInfo(
                {
                    full_name: first_name + " " + middle_name + " " + last_name,
                    first_name,
                    middle_name,
                    last_name,
                    for_portal_user: userDetails._id,
                    main_phone_number: mobile
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
                created_by_type: "individual-doctor",
                created_by: userDetails?._id,
                content: `New Registration From ${userDetails?.full_name}`,
                url: '',
                for_portal_user: superadminData?.body?._id,
                notitype: "New Registration",
                appointmentId:  userDetails?._id, 
            }
           
            var result = await notification('', '', "superadminServiceUrl", '', '', '','', requestData);
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
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to create user",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async listIndividualDoctor(req, res) {
        try {
            const { in_hospital, limit, page } = req.body;
            const result = await IndividualDoctorInfo.find({
                in_hospital: { $eq: in_hospital },
            })
                .select({
                    specilaization: 1,
                    _id: 1,
                    exp_years: 1,
                    unite: 1,
                    licence_number: 1,
                })
                .populate({
                    path: "in_profile",
                    select: { _id: 1, name: 1 },
                })
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
                })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await IndividualDoctorInfo.countDocuments({
                in_hospital: { $eq: in_hospital },
            });
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result,
                },
                message: "successfully fetched individual doctor list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch doctor list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async individualDoctor(req, res) {
        try {
            const { individual_doctor_id } = req.body;
            const result = await IndividualDoctorInfo.find({
                _id: individual_doctor_id
            })
                .select({
                    specilaization: 1,
                    _id: 1,
                    exp_years: 1,
                    unite: 1,
                    licence_number: 1,
                })
                .populate({
                    path: "in_profile",
                    select: { _id: 1, name: 1 },
                })
                .populate({
                    path: "for_portal_user",
                    select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
                })
                .exec();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched doctor details",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch doctor list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const { uuid, role } = req.headers;
            // const headers = {
            //     Authorization: req.headers["authorization"],
            // };
            const portalUserData = await PortalUser.findOne({ email, isDeleted: false }).lean();
            // console.log("portalUserData role-->", portalUserData.role);

            if (!portalUserData) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "User not found",
                    errorCode: "USER_NOT_FOUND",
                });
            }

            var restrictUser = ['HOSPITAL_ADMIN']
            if (restrictUser.includes(portalUserData.role)) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Please Login via Hospital Portal",
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


            var adminData
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
                            adminData,
                        }
                    },
                    message: "OTP verification pending 2fa",
                    errorCode: "VERIFICATION_PENDING",
                });
            }




            if (portalUserData.role === 'INDIVIDUAL_DOCTOR' || portalUserData.role === 'HOSPITAL_DOCTOR') {

                // adminData = await BasicInfo.findOne({
                //     for_portal_user: portalUserData._id,
                // }).populate({
                //     path: 'profile_picture',
                //     select: 'url'
                // }).exec();

                var adminData1 = await BasicInfo.aggregate([
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
                            country_id: adminData?.locationinfos[0]?.country,
                            region_id: adminData?.locationinfos[0]?.region,
                            province_id: adminData?.locationinfos[0]?.province,
                            village_id: adminData?.locationinfos[0]?.village,
                            city_id: adminData?.locationinfos[0]?.city,
                            department_id: adminData?.locationinfos[0]?.department,
                        };

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
            } else {

                adminData = await StaffInfo.findOne({
                    for_portal_user: portalUserData._id,
                }).populate({
                    path: 'in_profile'
                }).exec();

                // console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
                if (adminData?.in_profile?.profile_picture) {
                    const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
                    adminData.in_profile.profile_picture = profilePic
                }

            }

            // console.log("ADMIN DATA==>", adminData)
            if (adminData?.in_hospital) {
                const adminName = await BasicInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(adminData.in_hospital) })
                console.log("adminName___________", adminName.full_name);

                adminData = Object.assign({}, adminData._doc, {
                    adminName: adminName.full_name,

                });

            }

            if (portalUserData.role === 'INDIVIDUAL_DOCTOR' || portalUserData.role === 'HOSPITAL_DOCTOR') {

                if (adminData?.profile_picture) {
                    console.log("CHECKING===>", adminData.profile_picture)
                    const profilePic = await getDocument(adminData.profile_picture.url)
                    adminData.profile_picture.url = profilePic
                }
            }

            if (portalUserData.role == "INDIVIDUAL_DOCTOR") {
                // adminData = await BasicInfo.findOne({
                //     for_portal_user: portalUserData._id,
                // }).lean();

                if (adminData.verify_status !== "APPROVED") {                    
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
                                adminData,
                                savedLogId
                            }
                        },
                        message: "Super-admin not approved yet",
                        errorCode: "PROFILE_NOT_APPROVED",
                    });
                }
            }

            // if (portalUserData.role == "INDIVIDUAL_DOCTOR_STAFF") {
            //     adminData = await StaffInfo.findOne({
            //         for_portal_user: portalUserData._id,
            //     }).populate({
            //         path: "role"
            //     })
            // }

            const tokenClaims = {
                _id: portalUserData._id,
                email: portalUserData.email,
                role: portalUserData.role,
                uuid
            }
            // createSession(req, portalUserData);

            if (adminData?.isInfoCompleted === false && portalUserData.role == "INDIVIDUAL_DOCTOR") {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        otp_verified: portalUserData.verified,
                        user_details: {
                            portalUserData,
                            adminData,
                        }
                    },
                    message: "Please Fill Basic Info",
                    errorCode: 'FILL BASIC INFO!!',
                });
            }




            const forUserData = await staff_info.find({ for_portal_user: mongoose.Types.ObjectId(portalUserData._id) })
            console.log("forUserData length-->", forUserData);

            if (portalUserData.role == "HOSPITAL_STAFF") {
                // console.log("inside hospital staff");
                if (forUserData.length > 0) {
                    // console.log("forUserData.length->>", forUserData.length);

                    if (forUserData[0].for_doctor?.length || forUserData[0].department?.length || forUserData[0].unit?.length || forUserData[0].service?.length) {
                        // console.log("hospital staff login");


                        return sendResponse(req, res, 200, {
                            status: true,
                            body: {
                                otp_verified: portalUserData.verified,
                                token: generateToken(tokenClaims),
                                refreshToken: generateRefreshToken(tokenClaims),
                                user_details: {
                                    portalUserData,
                                    adminData
                                }
                            },
                            message: "Hospital staff login done",
                            errorCode: null,
                        });
                    } else {
                        return sendResponse(req, res, 200, {
                            status: false,
                            body: null,
                            message: "Please Login via Hospital Portal",
                            errorCode: "USER_NOT_FOUND"
                        });
                    }
                } else {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: null,
                        message: "Please Login via Hospital Portal",
                        errorCode: "USER_NOT_FOUND"
                    });
                }

            }

            const findFirstLogin = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portalUserData._id) });
            if (findFirstLogin && findFirstLogin.isFirstTime === 0) {
                findFirstLogin.isFirstTime = 1;
                await findFirstLogin.save();
            }

            // logs
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString();
            let addLogs = {};
            let saveLogs = {};
            if (portalUserData.role == "INDIVIDUAL_DOCTOR" || portalUserData.role == "HOSPITAL_DOCTOR") {
                addLogs = new Logs({
                    userName: portalUserData?.full_name,
                    userId: portalUserData?._id,
                    loginDateTime: formattedDate,
                    ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

                });
                saveLogs = await addLogs.save();
            } else {
                console.log("portalUserData?.created_by_user___________", portalUserData?.created_by_user);
                let checkAdmin = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portalUserData?.created_by_user) })
                addLogs = new Logs({
                    userName: portalUserData?.full_name,
                    userId: portalUserData?._id,
                    adminData: {
                        adminId: portalUserData?.created_by_user,
                        adminName: checkAdmin?.full_name
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
                message: "Login Successfully!",
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
    async getIndividualDoctorsByStatus(req, res) {
        try {
            const { status } = req.query
            const findUsers = await IndividualDoctorProfile.find({ verify_status: status })
                .populate({
                    path: "for_portal_user"
                })
            sendResponse(req, res, 200, {
                status: true,
                body: findUsers,
                message: "Get individual doctor list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get individual doctor list",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async approveOrRejectIndividualDoctor(req, res) {
        const { verify_status, individualDoctorId, approved_or_rejected_by } = req.body;
        let date = null;
        if (verify_status == "APPROVED") {
            const cdate = new Date();
            date = `${cdate.getFullYear()}-${cdate.getMonth() + 1
                }-${cdate.getDate()}`;
        }

        try {
            const result = await BasicInfo.findOneAndUpdate(
                { for_portal_user: individualDoctorId },
                {
                    $set: {
                        verify_status,
                        approved_at: date,
                        approved_or_rejected_by,
                    },
                },
                { upsert: false, new: true }
            ).exec();
            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    data: result,
                    message: `${verify_status} individual doctor successfully`,
                    errorCode: null,
                });
            }
        } catch (error) {
            console.log(error);
            sendResponse(req, res, 500, {
                status: false,
                data: error,
                message: `individual doctor request ${verify_status}`,
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
            const content = forgotPasswordEmailForIndividualDoctor(email.toLowerCase(), resetToken, userData._id)
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
            const { uuid } = req.headers;
            console.log(" uuid, for_portal_user ", uuid, for_portal_user);
            const otpResult = await Otp2fa.findOne({ uuid, mobile, for_portal_user, verified: false });
            console.log("otpResult", otpResult);
            if (otpResult) {
                const portalUserData = await PortalUser.findOne({ _id: for_portal_user }).lean();
                if (!portalUserData) {
                    return sendResponse(req, res, 422, {
                        status: false,
                        body: null,
                        message: "user not exist",
                        errorCode: null,
                    });
                }
                if (otpResult.otp == otp) {
                    const tokenClaims = {
                        _id: portalUserData._id,
                        email: portalUserData.email,
                        role: portalUserData.role,
                        uuid
                    }
                    // req.session.ph_verified = true;
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

                    // let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id }).populate({
                    //     path: 'profile_picture',
                    //     select: 'url'
                    // }).exec();
                    var adminData

                    if (portalUserData.role === 'INDIVIDUAL_DOCTOR') {
                        adminData = await BasicInfo.findOne({
                            for_portal_user: portalUserData._id,
                        }).populate({
                            path: 'profile_picture',
                            select: 'url'
                        }).exec();
                    } else {

                        adminData = await StaffInfo.findOne({
                            for_portal_user: portalUserData._id,
                        }).populate({
                            path: 'in_profile'
                        }).exec();

                        if (adminData?.in_profile?.profile_picture) {
                            // console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
                            const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
                            adminData.in_profile.profile_picture = profilePic
                        }

                    }

                    if (adminData?.profile_picture) {
                        // console.log("CHECKING===>", adminData.profile_picture)
                        const profilePic = await getDocument(adminData.profile_picture.url)
                        adminData.profile_picture.url = profilePic
                    }

                    if (portalUserData.role == 'INDIVIDUAL_DOCTOR'
                        || portalUserData.role == 'HOSPITAL_DOCTOR') {
                        let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id }).populate({
                            path: 'profile_picture',
                            select: 'url'
                        }).exec();

                        if (adminData.profile_picture) {
                            // console.log("CHECKING===>", adminData.profile_picture)
                            const profilePic = await getDocument(adminData.profile_picture.url)
                            adminData.profile_picture.url = profilePic
                        }
                    }


                    if (adminData?.isInfoCompleted === false && portalUserData?.role == "INDIVIDUAL_DOCTOR") {
                        return sendResponse(req, res, 200, {
                            status: true,
                            body: {
                                otp_verified: portalUserData.verified,
                                user_details: {
                                    portalUserData,
                                    adminData
                                }
                            },
                            message: "OTP matched",
                            errorCode: 'FILL BASIC INFO!!',
                        });
                    }


                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            id: updateVerified._id,
                            uuid: updateVerifiedUUID._id,
                            token: generateToken(tokenClaims),
                            refreshToken: generateRefreshToken(tokenClaims),
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
            console.log(" uuid, for_portal_user ", uuid, for_portal_user);
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
                    const tokenClaims = {
                        _id: portalUserData._id,
                        email: portalUserData.email,
                        role: portalUserData.role,
                        uuid
                    }
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

                    // let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id }).populate({
                    //     path: 'profile_picture',
                    //     select: 'url'
                    // }).exec();
                    var adminData

                    if (portalUserData.role === 'INDIVIDUAL_DOCTOR') {
                        adminData = await BasicInfo.findOne({
                            for_portal_user: portalUserData._id,
                        }).populate({
                            path: 'profile_picture',
                            select: 'url'
                        }).exec();
                    } else {

                        adminData = await StaffInfo.findOne({
                            for_portal_user: portalUserData._id,
                        }).populate({
                            path: 'in_profile'
                        }).exec();

                        if (adminData?.in_profile?.profile_picture) {
                            // console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
                            const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
                            adminData.in_profile.profile_picture = profilePic
                        }

                    }

                    if (adminData?.profile_picture) {
                        // console.log("CHECKING===>", adminData.profile_picture)
                        const profilePic = await getDocument(adminData.profile_picture.url)
                        adminData.profile_picture.url = profilePic
                    }

                    if (portalUserData.role == 'INDIVIDUAL_DOCTOR'
                        || portalUserData.role == 'HOSPITAL_DOCTOR') {
                        let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id }).populate({
                            path: 'profile_picture',
                            select: 'url'
                        }).exec();

                        if (adminData.profile_picture) {
                            // console.log("CHECKING===>", adminData.profile_picture)
                            const profilePic = await getDocument(adminData.profile_picture.url)
                            adminData.profile_picture.url = profilePic
                        }
                    }


                    if (adminData?.isInfoCompleted === false && portalUserData?.role == "INDIVIDUAL_DOCTOR") {
                        return sendResponse(req, res, 200, {
                            status: true,
                            body: {
                                otp_verified: portalUserData.verified,
                                user_details: {
                                    portalUserData,
                                    adminData
                                }
                            },
                            message: "OTP matched",
                            errorCode: 'FILL BASIC INFO!!',
                        });
                    }


                    return sendResponse(req, res, 200, {
                        status: true,
                        body: {
                            id: updateVerified._id,
                            uuid: updateVerifiedUUID._id,
                            token: generateToken(tokenClaims),
                            refreshToken: generateRefreshToken(tokenClaims),
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

    async resetForgotPassword(req, res) {
        const { user_id, resetToken, newPassword } = req.body
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
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Internal server error",
                errorCode: null,
            });
        }
    }
    // async fetchRoomCall(req, res) {
    //     try {
    //         // let checkavailableUser = await videoRooms.findOne({
    //         //   roomName: req.body.roomName,
    //         // });
    //         const headers = {
    //             'Authorization': req.body.authtoken
    //         }
    //         var appintmentdetails = await httpService.getStaging('hospital-doctor/view-appointment-by-roomname', { roomname: req.body.roomName }, headers, 'hospitalServiceUrl');
    //         // return;
    //         let checkavailableUser = {
    //             participants: appintmentdetails.data.participantsinfodetails,
    //         }
    //         // {
    //         //     userId:"63e1f567a825766f5c52b0de",
    //         //     userIdentity:"544dishfhsdgfds",
    //         //     isAudioMuted:false,
    //         //     isVideoMuted:false
    //         //    }
    //         const roomName = req.body.roomName;
    //         const uniqueId = req.body.uid;
    //         var completepromise = new Promise(async (resolve, reject) => {
    //             if (checkavailableUser.participants.length > 0) {
    //                 let count = 0;
    //                 checkavailableUser.participants.forEach(async (el) => {
    //                     console.log("req3", el.userId, req.user._id);

    //                     if (el.userId.toString() == req.user._id || el.userId.toString() == req.user.portalUserId) {


    //                         // let appintmentdetails11 = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
    //                         //     {
    //                         //         appointmentId: req.body.chatId,
    //                         //         participants: "",
    //                         //         leftparticipantsid:el.userId.toString(),
    //                         //         participantstype: "remove",

    //                         //     }
    //                         //     , headers, 'hospitalServiceUrl');

    //                         // let dataPass = {
    //                         //     userId: el.userId,
    //                         //     userName: el.userName,
    //                         //     userImage: "",
    //                         //     userIdentity: uniqueId,
    //                         // };
    //                         // const headers = {
    //                         //     'Authorization': req.body.authtoken
    //                         // }
    //                         // let appintmentdetails = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
    //                         //     {
    //                         //         appointmentId: req.body.chatId,
    //                         //         participants: dataPass,
    //                         //         participantstype: "add"
    //                         //     }
    //                         //     , headers, 'hospitalServiceUrl');
    //                         var token = await agoraTokenGenerator(appintmentdetails.data.roomdetails.roomName, el.userIdentity);


    //                         // return res.json({
    //                         //     status: "SUCESS",
    //                         //     messageID: 200,
    //                         //     message: "Token Generated",
    //                         //     data: token,
    //                         // });
    //                         return sendResponse(req, res, 200, {
    //                             status: true,
    //                             body: token,
    //                             message: "Token Generated",
    //                             errorCode: null,
    //                         });
    //                     }
    //                     else {
    //                         count++;
    //                     }
    //                 });
    //                 if (checkavailableUser.participants.length == count) {
    //                     resolve("")
    //                 }
    //             }
    //             else {
    //                 resolve("")
    //             }
    //         });
    //         Promise.all([completepromise]).then(async (values) => {
    //             const roomName = req.body.roomName;
    //             const uniqueId = req.body.uid;

    //             if (!roomName) {
    //                 return sendResponse(req, res, 200, {
    //                     status: false,
    //                     body: token,
    //                     message: "Must include roomName argument.",
    //                     errorCode: null,
    //                 });
    //                 // return res.status(200).json("Must include roomName argument.");
    //             }
    //             let token = await agoraTokenGenerator(roomName, uniqueId);
    //             if (req.body.loggedInUserId) {
    //                 let dataPass = {
    //                     userId: req.body.loggedInUserId,
    //                     userName: req.body.loginname,
    //                     userImage: "",
    //                     userIdentity: uniqueId,
    //                 };
    //                 const headers = {
    //                     'Authorization': req.body.authtoken
    //                 }
    //                 let appintmentdetails = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
    //                     {
    //                         appointmentId: req.body.chatId,
    //                         participants: dataPass,
    //                         participantstype: "add"
    //                     }
    //                     , headers, 'hospitalServiceUrl');
    //                 //   let updateData = await videoRooms.findOneAndUpdate(
    //                 //     { roomName: roomName },
    //                 //     { $push: { participants: dataPass } },
    //                 //     { new: true }
    //                 //   );
    //             }
    //             return sendResponse(req, res, 200, {
    //                 status: true,
    //                 body: token,
    //                 message: "Token Generated",
    //                 errorCode: null,
    //             });
    //         })

    //     } catch (e) {
    //         return sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "Token Generated",
    //             errorCode: "Some thing went wrong",
    //         });

    //     }
    // }
    async fetchRoomCall(req, res) {
        try {
            console.log(`checknewrequest`);
            const headers = {
                'Authorization': req.body.authtoken
            } 
            var appintmentdetails = await httpService.getStaging('hospital-doctor/view-appointment-by-roomname', { roomname: req.body.roomName }, headers, 'hospitalServiceUrl');
            console.log(`appintmentdetails`,appintmentdetails);
 
            // return;
 
            let checkavailableUser = {
                participants: appintmentdetails.data.participantsinfodetails,
            }
            const uniqueId = req.body.uid;
            var completepromise = new Promise(async (resolve, reject) => {
                if (checkavailableUser.participants.length > 0) {
                    let count = 0;
                    checkavailableUser.participants.forEach(async (el) => {
                        console.log("req3", el.userId, req.user._id);
                        if (el.userId.toString() == req.user._id || el.userId.toString() == req.user.portalUserId) {
                            const headers = {
                                'Authorization': req.body.authtoken
                            }
                            let dataPass = {
                                userId: el.userId.toString(),
                                userName: el.userName,
                                userImage: "",
                                userIdentity: uniqueId,
                            };
                            let appintmentdetails11 = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
                                {
                                    appointmentId: req.body.chatId,
                                    participants: "",
                                    leftparticipantsid: el.userId.toString(),
                                    participantstype: "remove",
                                }
                                , headers, 'hospitalServiceUrl');
                            let appintmentdetailsnewwww = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
                                {
                                    appointmentId: req.body.chatId,
                                    participants: dataPass,
                                    participantstype: "add"
                                }
                                , headers, 'hospitalServiceUrl');
                                console.log(`appintmentdetails-1`,appintmentdetails,req.body.uid );
                            var token = await agoraTokenGenerator(appintmentdetails.data.roomdetails.roomName, req.body.uid);
                            return sendResponse(req, res, 200, {
                                status: true,
                                body: token,
                                message: "Token Generated",
                                errorCode: null,
                            });
                        }
                        else {
                            count++;
                        }
                    });
                    if (checkavailableUser.participants.length == count) {
                        resolve("")
                    }
                }
                else {
                    resolve("")
                }
            });
 
            Promise.all([completepromise]).then(async (values) => {
                const roomName = req.body.roomName;
                const uniqueId = req.body.uid;
                if (!roomName) {
                    return sendResponse(req, res, 200, {
                        status: false,
                        body: token,
                        message: "Must include roomName argument.",
                        errorCode: null,
                    });
                    // return res.status(200).json("Must include roomName argument.");
                }
                let token = await agoraTokenGenerator(roomName, uniqueId);
                console.log(req.body.loggedInUserId,"=====================req.body.loggedInUserId");
                if (req.body.loggedInUserId) {
                    let dataPass = {
                        userId: req.body.loggedInUserId,
                        userName: req.body.loginname,
                        userImage: "",
                        userIdentity: uniqueId,
                    };
 
                    const headers = {
                        'Authorization': req.body.authtoken
                    }
                    let appintmentdetails = await httpService.postStaging('hospital-doctor/update-videocall-appointment',
                        {
                            appointmentId: req.body.chatId,
                            participants: dataPass,
                            participantstype: "add"
                        }
                        , headers, 'hospitalServiceUrl');

                console.log(appintmentdetails,"=====================req.body.loggedInUserId1");

                }
 
                return sendResponse(req, res, 200, {
                    status: true,
                    body: token,
                    message: "Token Generated",
                    errorCode: null,
                });
            })
 
        } catch (e) {
            return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Token Generated",
                errorCode: "Some thing went wrong",
            });
        }
 
    }


    async sendEmailtojoinexternaluser(req, res) {
        try {
            const { email,appointment,portaltype,dec_appointment } = req.body;
            const headers = {
                'Authorization': req.headers['authorization']
              }
            console.log(portaltype,"=============>123");
            let portalinfo = (portaltype!= '') ? `&portal=${portaltype}`: ''
            const link = `${process.env.healthcare-crm_FRONTEND_URL}/external-video?id=${appointment}${portalinfo}`;
            console.log(link,"===============>link");
            
            let result = await PortalUser.findOne({email: email});
            if(result){
                let receiverId = result._id;
                let serviceurl = "hospitalServiceUrl";
                let message = `Join Meeting to open the given link <a href="${link}">${link}</a>`;
            
                var requestData = {
                    created_by_type: "doctor",
                    created_by: req.user._id,
                    content: message,
                    url: '',
                    for_portal_user: receiverId,
                    notitype: "External Meeting Join",
                    appointmentId: dec_appointment,
                    title: "External Meeting"
                }
                
                var result1 = await notification('', '', serviceurl, '', '', '', headers, requestData);
            console.log(`result`, result1);

            }
            console.log(`result`, result);
            return;
            const content = externalUserAddEmail(email, link);
         
            await sendEmail(content);
            return sendResponse(req, res, 200, {
                status: true,
                body: {},
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

    async participantInfo(req, res) {
        try {

            let getData = await appointment
                .findOne({
                    roomName: req.query.roomName,
                    participants: {
                        $elemMatch: { userIdentity: req.query.identtity },
                    },
                })
            console.log(getData.participants, "dsfsdhgfhkshdjkfhsdjkkfhsdfsdfsd");
            if (getData.participants) {
                getData.participants.forEach(async (ele) => {
                    console.log(ele, "dsfsdhgfhkshdjkfhsdjkkfhsdfsdfsd");
                    let audioFlag;
                    let videoFlag;
                    if (ele.userIdentity == req.query.identtity) {
                        console.log(ele.userIdentity, "dsfsdhgfhkshdjkfhsdjkkfhsdfsdfsd");
                        return sendResponse(req, res, 200, {
                            status: true,
                            body: ele,
                            message: "Data Done",
                            errorCode: null,
                        });

                    }
                });
            }
            else {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Data Failed",
                    errorCode: "Some thing went wrong",
                });
            }
        } catch (e) {
            return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: e.errorCode,
                errorCode: "Some thing went wrong",
            });
        }
    }

    async getIndividualDoctorsById(req, res) {
        const { for_portal_user, forUser } = req.query
        try {
            var findUsers;
            if (forUser == 'doctor') {
                findUsers = await BasicInfo.findOne({ for_portal_user }, { for_portal_user: 1, full_name: 1 })
                    .populate({
                        path: "profile_picture",
                        select: 'url'
                    })

                if (findUsers?.profile_picture?.url != '') {
                    const profilePic = await getDocument(findUsers?.profile_picture?.url)
                    findUsers.profile_picture.url = profilePic
                }
            }
            else {
                findUsers = await HospitalAdminInfo.findOne({ for_portal_user }, {
                    for_portal_user: 1,
                    hospital_name: 1,
                    profile_picture: 1
                })

                if (findUsers?.profile_picture != '' && findUsers?.profile_picture != null) {
                    const profilePic = await getDocument(findUsers?.profile_picture)
                    findUsers.profile_picture = profilePic
                }
            }
            console.log("FIND USER===>", findUsers)
            sendResponse(req, res, 200, {
                status: true,
                body: findUsers,
                message: "Get individual doctor list",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to get individual doctor details",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async sendInvitation(req, res) {
    //     try {
    //         const { first_name, middle_name, last_name, email, phone, address, created_By, verify_status} = req.body;

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

    //         const loggedInData = await PortalUser.find({ for_portal_user: req.body.created_By });
    //         const loggeInname = loggedInData[0].full_name;
    //         console.log("logggggggged", loggeInname)
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
                    const loggedInData = await PortalUser.find({ for_portal_user: created_By });
                    const loggeInname = loggedInData[0].full_name;
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

                const loggedInData = await PortalUser.find({ for_portal_user: created_By });
                const loggeInname = loggedInData[0].full_name;
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

            if (checkUser.role === "HOSPITAL_STAFF") {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) })

                for_portal_user = adminData?.in_hospital;
            }


            if (checkUser.role === "INDIVIDUAL_DOCTOR_STAFF") {

                let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) })

                for_portal_user = adminData?.in_hospital;
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

    async totalIndividualDoctorforAdminDashboard(req, res) {
        try {
            const totalCount = await PortalUser.countDocuments({ isDeleted: false, role: "INDIVIDUAL_DOCTOR" });

            if (totalCount >= 0) {
                return sendResponse(req, res, 200, {
                    status: true,
                    body: { totalCount },
                    message: "Individual Doctor Count Fetch Successfully",
                });
            } else {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: { totalCount: 0 },
                    message: "Individual Doctor Count not Fetch",
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

module.exports = {
    individualDoctor: new IndividualDoctor(),
};
