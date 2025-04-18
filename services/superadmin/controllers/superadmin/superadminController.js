"use strict";

import { matchedData } from "express-validator";
const bcrypt = require('bcrypt');
import jwt from "jsonwebtoken";
import crypto from "crypto"
const fs = require('fs');
const csv = require("fast-csv");
import Superadmin from "../../models/superadmin/superadmin";
import Medicine from "../../models/medicine";
import MaximumRequest from "../../models/superadmin/maximum_request";
import PortalUser from "../../models/superadmin/portal_user";
// import InsuranceUser from "../models/insurance/user";
import SubscriptionPlan from "../../models/subscription/subscriptionplans";
import PlanPeriodical from "../../models/subscription/planperiodical";
import SubscriptionPlanService from "../../models/subscription/subscriptionplan_service";
import Otp2fa from "../../models/otp2fa";
import { messageID, messages, responseCodes, htmlEmailFor2FAOTP, htmlForgetPassword, geterate6DigitOTP, smsTemplateOTP } from "../../constant";
import { sendSmtpEmail } from "../../middleware/sendSmtpEmail";
import { config } from "../../config/constants";
// const config = require('../');
const { itemNotFound, handleRejectionError, buildErrObject, bcryptCompare, generateTenSaltHash, generate6DigitOTP, processExcel } = require("../../middleware/utils");
const secret = config.SECRET;
//const Http = require('../../middleware/httpservice.js');
import { sendResponse } from "../../helpers/transmission";
import ForgotPasswordToken from "../../models/forgot_password_token";
import { sendSms } from "../../middleware/sendSms";
import { MedicineColumns } from "../../config/constants";
import { forgotPasswordEmail, verifyEmail2fa } from "../../helpers/emailTemplate";
import { sendEmail } from "../../helpers/ses";

import Country from "../../models/common_data/country"
import City from "../../models/common_data/city"
import Department from "../../models/common_data/department"
import Province from "../../models/common_data/province"
import Region from "../../models/common_data/region"
import Village from "../../models/common_data/village"
import Speciality from "../../models/speciality"
import AppointmentCommission from "../../models/superadmin/appointment-commision"
import manualMedicineClaimData from "../../models/superadmin/manual_medicine_claim"
import mongoose from "mongoose";
import { uploadFile, getFile, getDocument } from "../../helpers/s3";
import Invitation from '../../models/superadmin/email_invitation';
import { sendMailInvitations } from '../../helpers/emailTemplate'
import Notification from "../../models/superadmin/Chat/Notification";
const Http = require('../../helpers/httpservice');
import Httpp from "../../helpers/httpservice";
import superadmin from "../../models/superadmin/superadmin";
import Logs from "../../models/superadmin/log"
const FormData = require('form-data');
// const httppService = new Httpp()


const httpService = new Http()
/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = payload => {
    // console.log(config.JWT_EXPIRATION_IN_MINUTES, secret.jwt);
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * config.JWT_EXPIRATION_IN_MINUTES;

    // returns signed token
    return jwt.sign(
        {
            data: payload,
            exp: expiration
        },
        secret.JWT
    );
};
const generateRefreshToken = payload => {
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * config.JWT_EXPIRATION_IN_MINUTES + 120;

    // returns signed token
    return jwt.sign(
        {
            data: payload,
            exp: expiration
        },
        secret.JWT
    );
};
/**
 * Compare password using bcrypt
 * @param {string} password 
 * @param {boolean} user 
 */
const checkPassword = async (password, user) => {
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch
}
/**
 * Login using email and password
 * @param {Object} req 
 * @param {Object} res 
 */
const checkIp = async (currentIP, userIP) => {
    if (currentIP === userIP) {
        return true
    }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(req.body, "check body");
        const { uuid, role } = req.headers;
        console.log(req.headers, "req.headers");
        const superAdminData = await Superadmin.findOne({ email, isDeleted: false }).lean();
        console.log(superAdminData, "superAdminData,123");
        if (!superAdminData) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "User not found",
                errorCode: "USER_NOT_FOUND",
            });
        }
        if (!superAdminData.isActive || superAdminData.isLocked || superAdminData.isDeleted) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "User account inactive contact with admin",
                errorCode: "USER_INACTIVE",
            });
        }
        const isPasswordMatch = await checkPassword(password, superAdminData);
        if (!isPasswordMatch) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "Credential not matched",
                errorCode: "INCORRECT_PASSWORD",
            });
        }
        superAdminData.password = undefined
        const deviceExist = await Otp2fa.findOne({ uuid, verified: true }).lean();
        if (!deviceExist || superAdminData.verified !== true) {
            return sendResponse(req, res, 200, {
                status: true,
                body: {
                    otp_verified: false,
                    token: null,
                    refreshToken: null,
                    findUser: superAdminData,
                    role
                },
                message: "OTP verification pending 2fa",
                errorCode: "VERIFICATION_PENDING",
            });
        }
        const tokenClaims = {
            _id: superAdminData._id,
            email: superAdminData.email,
            role: superAdminData.role,
            uuid
        }
        let adminData = {}
        if (superAdminData.role === "ASSOCIATION_USER" || superAdminData.role === "STAFF_USER") {
            adminData = await PortalUser.findOne({ superadmin_id: { $eq: superAdminData._id } })
                .populate({
                    path: "association_group_icon",
                    select: { url: 1, _id: 0 }
                })
            if (adminData.association_group_icon) {
                if (adminData.association_group_icon.url != undefined) {
                    var signedurl = await getDocument(adminData.association_group_icon.url);
                    adminData.association_group_icon.url = signedurl;
                }
            } else {
                Object.assign(adminData, { association_group_icon: "" });
            }
        }

        // logs
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString();
        let addLogs = {};
        let saveLogs = {};
        if (superAdminData.role == "superadmin") {
            addLogs = new Logs({
                userName: superAdminData?.fullName,
                userId: superAdminData?._id,
                loginDateTime: formattedDate,
                ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

            });
            saveLogs = await addLogs.save();
        } else {
            
            let checkAdmin = await Superadmin.findOne({ _id: mongoose.Types.ObjectId(adminData?.for_staff) })
            addLogs = new Logs({
                userName: superAdminData?.fullName,
                userId: superAdminData?._id,
                adminData: {
                    adminId: adminData?.for_staff,
                    adminName: checkAdmin?.fullName
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
                otp_verified: superAdminData.verified,
                token: generateToken(tokenClaims),
                refreshToken: generateRefreshToken(tokenClaims),
                findUser: superAdminData,
                adminData,
                role,
                savedLogId
            },
            message: "Super-admin login done",
            errorCode: null,
        });
    } catch (error) {
        console.log(error, "check rorrr")
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: null,
        });
    }
}

export const sendEmailOtpFor2fa = async (req, res) => {
    try {
        const { email } = req.body;
        const { uuid } = req.headers;
        const superAdminData = await Superadmin.findOne({ email }).lean();
        const deviceExist = await Otp2fa.findOne({ uuid, email }).lean();
        console.log("deviceExist", deviceExist);
        if (!superAdminData) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "User not found",
                errorCode: "USER_NOT_FOUND",
            });
        }
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
            result = await Otp2fa.findOneAndUpdate({ uuid }, {
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
                for_portal_user: superAdminData._id,
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

export const sendSmsOtpFor2fa = async (req, res) => {
    try {
        const { email } = req.body;
        const { uuid } = req.headers;
        const superAdminData = await Superadmin.findOne({ email }).lean();
        console.log("send-sms-otp-for-2fa", superAdminData);
        if (!superAdminData) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "user not exist",
                errorCode: "USER_NOT_EXIST",
            });
        }
        const mobile = superAdminData.mobile
        const country_code = superAdminData.country_code
        const deviceExist = await Otp2fa.findOne({ mobile, country_code, uuid, for_portal_user: superAdminData._id }).lean();
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
                result = await Otp2fa.findOneAndUpdate({ mobile, country_code, uuid, for_portal_user: superAdminData._id }, {
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
                    for_portal_user: superAdminData._id,
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
        console.log("Eooooooooooooooooooo", error);
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: null,
        });
    }
}

export const matchEmailOtpFor2fa = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const { uuid } = req.headers;

        const portalUserData = await Superadmin.findOne({
            email: email,
        }).lean();
        console.log("portalUserDataportalUserData", portalUserData);
        if (!portalUserData) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "user not exist",
                errorCode: null,
            });
        }
        const data = await Otp2fa.findOne({ uuid, email, for_portal_user: portalUserData._id, verified: false })
        console.log("datadatadata", data);

        if (data) {


            if (data.otp == otp) {
                const updateVerified = await Superadmin.findOneAndUpdate(
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
                    body: null,
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
        sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Internal server error",
            errorCode: null,
        });
    }
}

export const matchSmsOtpFor2fa = async (req, res) => {
    try {
        const { otp, for_portal_user } = req.body;
        const { uuid } = req.headers;
        console.log(uuid);
        const otpResult = await Otp2fa.findOne({ uuid, for_portal_user });
        if (otpResult) {
            const superAdminData = await Superadmin.findOne({ _id: for_portal_user }).lean();
            if (!superAdminData) {
                return sendResponse(req, res, 422, {
                    status: false,
                    body: null,
                    message: "user not exist",
                    errorCode: null,
                });
            }
            if (otpResult.otp == otp) {
                // req.session.ph_verified = true;
                const updateVerified = await Superadmin.findOneAndUpdate({ _id: for_portal_user }, {
                    $set: {
                        verified: true
                    }
                }, { new: true }).exec();
                const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid }, {
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








    // try {
    //     const { country_code, mobile, otp } = req.body;
    //     var ip = req.ip
    //     const role = req.header("role")
    //     const data = await Otp2fa.findOne({ mobile: country_code + mobile })
    //     console.log(data);
    //     if (data) {
    //         if (data.otp == otp) {
    //             const setIp = await Superadmin.updateOne(
    //                 {
    //                     country_code,
    //                     mobile
    //                 },
    //                 {
    //                     $set: {
    //                         ipAddress: ip
    //                     },
    //                 },
    //                 { new: true }
    //             ).exec();
    //             return sendResponse(req, res, 200, {
    //                 status: true,
    //                 body: null,
    //                 message: "OTP matched",
    //                 errorCode: null,
    //             });
    //         } else {
    //             sendResponse(req, res, 200, {
    //                 status: false,
    //                 message: "OTP not matched",
    //                 errorCode: null,
    //             });
    //         }
    //     } else {
    //         sendResponse(req, res, 200, {
    //             status: false,
    //             message: "OTP expired",
    //             errorCode: null,
    //         });
    //     }
    // } catch (error) {
    //     sendResponse(req, res, 500, {
    //         status: false,
    //         body: null,
    //         message: "Internal server error",
    //         errorCode: null,
    //     });
    // }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        let userData = await Superadmin.findOne({ email });
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
        // let sendEmailStatus = sendSmtpEmail(email.toLowerCase(), 'Forgot password reset link', html);
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

export const resetForgotPassword = async (req, res) => {
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
        const passCheck = await Superadmin.findOne({ _id: user_id });
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

            const updatedUser = await Superadmin.findOneAndUpdate(
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

export const addMedicine = async (req, res) => {
    try {
        const {
            medicines,
            userId,
            isNew,
            type,
            for_user
        } = req.body
        console.log("AAAAAAAAAAAA", req.body);
        let added_by = req.body.added_by

        if (added_by == undefined) {
            added_by = userId

        }
        const medicineArray = []
        for (const medicine of medicines) {
            let checkMedicineExists = await Medicine.find({ 'medicine.medicine_name': medicine.medicine.medicine_name, 'medicine.dosage': medicine.medicine.dosage, 'isDeleted': false })
            if (checkMedicineExists.length <= 0) {
                medicine.medicine.status = true; // Set status to true for the medicine being added
                medicineArray.push({
                    ...medicine,
                    for_user: userId,
                    isNew: isNew !== undefined ? isNew : false,
                    added_by,
                    type
                })
            }
        }
        // const medicinesList = medicines.map((medicine) => ({
        //     ...medicine,
        //     for_user: userId,
        //     isNew: isNew !== undefined ? isNew : false
        // }));
        if (medicineArray.length > 0) {
            const result = await Medicine.insertMany(medicineArray);
            return sendResponse(req, res, 200, {
                status: true,
                body: { result },
                message: "New medicine added successfully",
                errorCode: null,
            });
        } else {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "Medicine already exist",
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

export const editMedicine = async (req, res) => {
    try {
        const {
            medicines,
            medicineId
        } = req.body
        const headers = {
            'Authorization': req.headers['authorization']
        }
        const getMedicineById = await Medicine.findById(medicineId)
        let checkMedicineExists = await Medicine.find({ 'medicine.medicine_name': medicines.medicine_name, 'medicine.dosage': medicines.dosage, _id: { $ne: medicineId } })
        if (checkMedicineExists.length == 0) {
            const updateMedicine = await Medicine.findOneAndUpdate(
                { _id: { $eq: medicineId } },
                {
                    $set: { medicine: medicines, isNew: false }
                },
                { new: true }
            )

            const updateinPharmacyPortal = await httpService.postStaging('order/update-medicine-name-superadmin', {medicines, medicineId}, headers, 'pharmacyServiceUrl');

            sendResponse(req, res, 200, {
                status: true,
                body: updateMedicine,
                message: "medicine updated successfully",
                errorCode: null,
            });
        } else {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "Medicine already exist",
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

export const deleteMedicine = async (req, res) => {
    try {
        const {
            medicineId
        } = req.body
        // await Medicine.findOneAndUpdate(
        //     { _id: { $eq: medicineId } },
        //     {
        //         $set: { isDeleted: true }
        //     },
        //     { new: true }
        // )

        if (medicineId == '') {
            await Medicine.updateMany(
                { isDeleted: { $eq: false } },
                {
                    $set: { isDeleted: true }
                },
                { new: true }
            )
        } else {
            await Medicine.updateMany(
                { _id: { $in: medicineId } },
                {
                    $set: { isDeleted: true }
                },
                { new: true }
            )
        }

        sendResponse(req, res, 200, {
            status: true,
            body: null,
            message: "medicine deleted successfully",
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

export const listMedicine = async (req, res) => {
    try {
        const { page, limit, searchText } = req.query;
        var sort = req.query.sort
        var sortingarray = { "createdAt": -1 };
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        } else {
            sortingarray['createdAt'] = -1;
        }
        let medicineDetails = await Medicine.find({
            isDeleted: false,
            $or: [{
                'medicine.medicine_name': { $regex: searchText || '', $options: "i" },
            }]
        })
            .populate({
                path: 'for_user',
                select: 'fullName'
            })
            .sort(sortingarray)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        const count = await Medicine.countDocuments({
            isDeleted: false
        });
        let medAddedbyName;
        const medicneArray = []
        for (const medicine of medicineDetails) {
            console.log("medicine------", medicine);
            let doctorName;
            if (medicine.type === "Doctor") {
                doctorName = await httpService.getStaging('hospital-doctor/get-Idby-DoctorName', { doctorId: medicine.added_by }, {}, 'hospitalServiceUrl');
                medAddedbyName = doctorName?.body;
            } else if (medicine.type === "Dental" || medicine.type === "Optical" || medicine.type === "Paramedical-Professions" || medicine.type === "Laboratory-Imaging") {
                doctorName = await httpService.getStaging('labimagingdentaloptical/get-Idby-portaluser-name', { portalId: medicine.added_by }, {}, 'labimagingdentalopticalServiceUrl');
                medAddedbyName = doctorName?.body;
            } else {
                medAddedbyName = medicine.for_user ? medicine.for_user.fullName : ''
                // medAddedbyName =  ''

            }
            console.log("medAddedbyName----", medAddedbyName);
            medicneArray.push({
                _id: medicine._id,
                added_by_name: medAddedbyName,
                number: medicine.medicine.number,
                medicine_name: medicine.medicine.medicine_name,
                inn: medicine.medicine.inn,
                dosage: medicine.medicine.dosage,
                pharmaceutical_formulation: medicine.medicine.pharmaceutical_formulation,
                administration_route: medicine.medicine.administration_route,
                therapeutic_class: medicine.medicine.therapeutic_class,
                manufacturer: medicine.medicine.manufacturer,
                other: medicine.medicine.other,
                link: medicine.medicine.link,
                status: medicine.medicine.status,
                isNew: medicine.isNew !== undefined ? medicine.isNew : false,
                updatedAt: medicine?.updatedAt,
            })
        }
        sendResponse(req, res, 200, {
            status: true,
            body: {
                data: medicneArray,
                totalRecords: count
            },
            message: "fetched medicine records successfully",
            errorCode: null,
        });
    } catch (error) {
        console.log('error', error);
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to fetched medicine records",
            errorCode: null,
        });
    }
}

export const listMedicineforexport = async (req, res) => {
    const { searchText, limit, page } = req.query
    var filter
    if (searchText == "") {
        filter = {
            isDeleted: false
        }
    } else {
        filter = {
            isDeleted: false,
            lab_test: { $regex: searchText || '', $options: "i" },
        }
    }
    try {
        var result = '';
        if (limit > 0) {
            result = await Medicine.find(filter)
                .sort([["createdAt", -1]])
                .skip((page - 1) * limit)
                .limit(limit * 1)
                .exec();
        }
        else {
            result = await Medicine.aggregate([{
                $match: filter
            },
            { $sort: { "createdAt": -1 } },
            {
                $project: {
                    _id: 0,
                    number: "$medicine.number",
                    medicine_name: "$medicine.medicine_name",
                    inn: "$medicine.inn",
                    dosage: "$medicine.dosage",
                    pharmaceutical_formulation: "$medicine.pharmaceutical_formulation",
                    administration_route: "$medicine.administration_route",
                    therapeutic_class: "$medicine.therapeutic_class",
                    manufacturer: "$medicine.manufacturer",
                    condition_of_prescription: "$medicine.condition_of_prescription",
                    other: "$medicine.other",
                    link: "$medicine.link"
                }
            }
            ])
        }
        console.log(result, "resultresult");
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


export const fetchedMedicineByID = async (req, res) => {
    try {
        const { medicineIds } = req.body;
        // const medicineArray = {}
        const medicineArray = await Medicine.find({ _id: { $in: medicineIds } }, { _id: 1, medicine: 1 })

        // let medicineDetails = await Medicine.find({ _id:  }).select('medicine.medicine_name').exec()
        // for (const id in medicineIds) {
        //     medicineArray[id] = medicineDetails[0].medicine.medicine_name
        // }
        return sendResponse(req, res, 200, {
            status: true,
            body: medicineArray,
            message: "fetched medicine records successfully",
            errorCode: null,
        });

    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to fetched medicine records",
            errorCode: null,
        });
    }
}

export const listMedicineWithoutPagination = async (req, res) => {
    try {
        let medicineDetails = await Medicine.find({
            isDeleted: false,
            isNew: false,
            'medicine.status': true,
            $or: [
                {
                    'medicine.medicine_name': { $regex: req.query.query || '', $options: "i" },
                }
            ]
        }).select('medicine.medicine_name')
            .sort([["createdAt", -1]])
            .limit(20)
            .exec();
        const medicneArray = []
        console.log(medicneArray,"medicine array list",medicineDetails);
        for (const medicine of medicineDetails) {
            medicneArray.push({
                _id: medicine._id,
                medicine_name: medicine.medicine.medicine_name,
            })
        }

        
        sendResponse(req, res, 200, {
            status: true,
            body: { medicneArray },
            message: "fetched medicine records successfully",
            errorCode: null,
        });
    } catch (error) {
        console.log(error, 'error');
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to fetched medicine records",
            errorCode: null,
        });
    }
}

export const listMedicineWithoutPaginationForDoctor = async (req, res) => {
    try {
        let medicineDetails = await Medicine.find({
            isDeleted: false,
            $or: [
                {
                    'medicine.medicine_name': { $regex: (req.query.query).trim() || '', $options: "i" },
                }
            ],
            added_by: { $in: [mongoose.Types.ObjectId("63763d9eda5f0a2708aff9fe"), req.query.doctorId] }
        }).select('medicine.medicine_name')
            .sort([["createdAt", -1]])
            .limit(20)
            .exec();
        const medicneArray = []
        for (const medicine of medicineDetails) {
            medicneArray.push({ 
                _id: medicine._id,
                medicine_name: medicine.medicine.medicine_name,
            })
        }

        sendResponse(req, res, 200, {
            status: true,
            body: { medicneArray },
            message: "fetched medicine records successfully",
            errorCode: null,
        });
    } catch (error) {
        console.log(error, 'error');
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to fetched medicine records",
            errorCode: null,
        });
    }
}


const validateColumnWithExcel = (toValidate, excelColumn) => {
    console.log(toValidate, 'toValidate, excelColumn');
    console.log(excelColumn, 'excelColumn');
    const requestBodyCount = Object.keys(toValidate).length
    const fileColumnCount = Object.keys(excelColumn).length
    console.log(requestBodyCount, fileColumnCount, 'fileColumnCount');
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

// export const uploadCSVForMedicine = async (req, res) => {
//     try {
//         const filePath = './uploads/' + req.filename
//         // let data = await csvExtraction(filePath);
//         console.log(filePath, 'fielpath');
//         const data = await processExcel(filePath);
//         // console.log(data, 'data');
//         // return;
//         // const file = reader.readFile(filePath)
//         // console.log(file, 'file');
//         // return
//         // let data = []
//         // const sheets = file.SheetNames
//         // for (let i = 0; i < sheets.length; i++) {
//         //     const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]], {
//         //         header: 0,
//         //         defval: "",
//         //         raw: false
//         //     })
//         //     temp.forEach((res) => {
//         //         data.push(res)
//         //     })
//         // }\

//         const isValidFile = validateColumnWithExcel(MedicineColumns, data[0])

//         fs.unlinkSync(filePath)

//         if (!isValidFile) {
//             return sendResponse(req, res, 500, {
//                 status: false,
//                 body: isValidFile,
//                 message: "Invalid excel sheet! column not matched.",
//                 errorCode: null,
//             });
//         }

//         let checkMedicineExists = await Medicine.find({}, 'MedicineName' )
// console.log(checkMedicineExists,"checkMedicineExists");
//         // let checkMedicineExists = await Medicine.find({ 'medicine.medicine_name': medicine.medicine.medicine_name })
//         const medicineData = []

//         for (const medicine of data) {

//             medicineData.push({
//                 medicine: {
//                     number: medicine.MedicineNumber,
//                     medicine_name: medicine.MedicineName,
//                     inn: medicine.INN,
//                     dosage: medicine.Dosage,
//                     pharmaceutical_formulation: medicine.PharmaceuticalFormulation,
//                     administration_route: medicine.AdministrationRoute,
//                     therapeutic_class: medicine.TherapeuticClass,
//                     manufacturer: medicine.Manufacturer,
//                     condition_of_prescription: medicine.ConditionOfPrescription,
//                     other: medicine.Other,
//                     link: medicine.Link,
//                     status: true
//                 },
//                 for_user: req.body.userId,
//                 added_by: req.body.userId
//             })
//         }

//         // console.log(medicineData,'medicineData');
//         // return;
//         const result = await Medicine.insertMany(medicineData);
//         sendResponse(req, res, 200, {
//             status: true,
//             body: null,
//             message: "All medicine records added successfully",
//             errorCode: null,
//         });
//     } catch (error) {
//         console.log(error, 'error');
//         sendResponse(req, res, 500, {
//             status: false,
//             body: error,
//             message: error.message ? error.message : "Internal server error",
//             errorCode: error.message ? error.message : Null,
//         });
//     }
// }
export const uploadCSVForMedicine = async (req, res) => {
    try {
        const filePath = './uploads/' + req.filename
        const data = await processExcel(filePath);

        const isValidFile = validateColumnWithExcel(MedicineColumns, data[0]);
        fs.unlinkSync(filePath);

        if (!isValidFile) {
            return sendResponse(req, res, 500, {
                status: false,
                body: isValidFile,
                message: "Invalid excel sheet! column not matched.",
                errorCode: null,
            });
        }

        const existingMedicineNames = await Medicine.distinct('medicine.medicine_name', { 'isDeleted': false });
        const existingDosages = await Medicine.distinct('medicine.dosage', { 'isDeleted': false });

        const medicineData = [];

        for (const medicine of data) {
            const medicineName = medicine.MedicineName;
            const dosage = medicine.Dosage;

            if (
                existingMedicineNames.includes(medicineName) &&
                existingDosages.includes(dosage)
            ) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: `Medicine with name '${medicineName}' and dosage '${dosage}' already exists`,
                    errorCode: null,
                });
                continue;
            }

            medicineData.push({
                medicine: {
                    number: medicine.MedicineNumber,
                    medicine_name: medicineName,
                    inn: medicine.INN,
                    dosage: dosage,
                    pharmaceutical_formulation: medicine.PharmaceuticalFormulation,
                    administration_route: medicine.AdministrationRoute,
                    therapeutic_class: medicine.TherapeuticClass,
                    manufacturer: medicine.Manufacturer,
                    condition_of_prescription: medicine.ConditionOfPrescription,
                    other: medicine.Other,
                    link: medicine.Link,
                    status: true,
                },
                for_user: req.body.userId,
                added_by: req.body.userId,
            });
        }

        if (medicineData.length === 0) {
            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "All medicine records already exist",
                errorCode: null,
            });
        }

        const result = await Medicine.insertMany(medicineData);
        sendResponse(req, res, 200, {
            status: true,
            body: null,
            message: "Medicine records added successfully",
            errorCode: null,
        });
    } catch (error) {
        console.log(error, 'error');
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Internal server error",
            errorCode: error.message ? error.message : null,
        });
    }
}

export const approveInsuranceAdmin = async (req, res) => {
    try {
        const { userId } = req.body;
        const findUser = await InsuranceUser.findOneAndUpdate({ userId }, { isApproved: true }, { new: true })

        if (!findUser) {
            return handleRejectionError(res, { message: messages.internalError }, messageID.internalServerError)
        }

        res.status(200).json({
            status: true,
            message: "Approval done",
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const getInsuranceAdminNotApprovedList = async (req, res) => {
    try {
        const { page, perPage } = req.query
        const options = {
            page: parseInt(page, 10) || 1,
            perPage: parseInt(perPage, 10) || 10
        }

        const NotApprovedList = await InsuranceUser.paginate({ isApproved: false }, options)

        if (!NotApprovedList) {
            return handleRejectionError(res, { message: messages.dataNotFound }, messageID.nocontent)
        }
        sendResponse(req, res, 200, {
            status: true,
            body: {
                NotApprovedList,
            },
            message: "get not approved insurance admin list",
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}


export const getInsuranceAdminApprovedList = async (req, res) => {
    try {
        const { page, perPage } = req.query
        const options = {
            page: parseInt(page, 10) || 1,
            perPage: parseInt(perPage, 10) || 10
        }

        const ApprovedList = await InsuranceUser.paginate({ isApproved: true }, options)

        if (!ApprovedList) {
            return handleRejectionError(res, { message: messages.dataNotFound }, messageID.nocontent)
        }

        res.status(200).json({
            status: true,
            body: ApprovedList,
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const getServiceField = async (req, res) => {
    try {
        const { plan_for } = req.query
        let allSubscriptionPlanService = await SubscriptionPlanService.find({ plan_for });
        if (allSubscriptionPlanService.length < 1) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "No service exist",
                errorCode: null,
            });
        }
        sendResponse(req, res, 200, {
            status: true,
            body: allSubscriptionPlanService,
            message: "all service",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 200, {
            status: false,
            body: { error },
            message: "server error",
            errorCode: "Internal server error",
        });
    }
}

export const createSubscriptionPlan = async (req, res) => {
    try {
        const {
            plan_for,
            plan_name,
            services,
            plan_price,
            plan_duration,
            is_activated,
            createdBy
        } = req.body

        let subscriptionPlanExist = await SubscriptionPlan.findOne(
            {
                plan_name,
                isDeleted: false
            }
        );
        if (subscriptionPlanExist) {
            return sendResponse(req, res, 200, {
                status: false,
                body: subscriptionPlanExist,
                message: "Subscription plan already exist",
                errorCode: null,
            });
        }
        let newSubscriptionPlanDetails = new SubscriptionPlan({
            plan_for,
            plan_name,
            services,
            plan_price,
            plan_duration,
            is_activated,
            createdBy
        });
        let newSubscriptionPlan = await newSubscriptionPlanDetails.save();
        sendResponse(req, res, 200, {
            status: true,
            body: newSubscriptionPlan,
            message: "Subscription plan created",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const getSubscriptionPlanDetails = async (req, res) => {
    try {
        const { id } = req.query
        let planDetail = await SubscriptionPlan.findOne({
            _id: id,
            is_deleted: false
        })
            .populate({
                path: "plan_duration",
            })
        if (planDetail) {
            return sendResponse(req, res, 200, {
                status: true,
                body: planDetail,
                message: "subscription plan details",
                errorCode: null,
            });
        }
        sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "This subscription plan not exist",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const allSubscriptionPlans = async (req, res) => {
    const { limit, page, is_deleted, is_activated, plan_for, plan_name } = req.query;
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
    } else {
        sortingarray['createdAt'] = -1;
    }

    const filter = {
        is_deleted,
        is_activated,
        plan_for,
        plan_name: {
            $regex: plan_name,
            $options: "i"
        }
    }

    if (is_deleted == "all") {
        delete filter.is_deleted
    }
    if (is_activated == "all") {
        delete filter.is_activated
    }
    if (plan_for == "all") {
        delete filter.plan_for
    }
    if (plan_name == "") {
        delete filter.plan_name
    }

    try {
        let allPlans = await SubscriptionPlan.find(filter)
            .populate({
                path: "plan_duration",
            })
            .sort(sortingarray)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        const count = await SubscriptionPlan.countDocuments(filter)
        if (count < 1) {
            return sendResponse(req, res, 200, {
                status: false,
                message: "No subscription plan exist",
                errorCode: null,
            });
        }
        sendResponse(req, res, 200, {
            status: true,
            body: {
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalRecords: count,
                allPlans,
            },
            message: "All subscription plan list",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const getPeriodicList = async (req, res) => {
    try {
        let allPeriodicalPlans = await PlanPeriodical.find()
        sendResponse(req, res, 200, {
            status: true,
            body: {
                allPeriodicalPlans,
            },
            message: "All periodic plan list",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const editSubscriptionPlan = async (req, res) => {
    try {
        const {
            _id,
            plan_for,
            plan_name,
            services,
            plan_price,
            plan_duration,
            is_activated
        } = req.body

        let updatedsubscriptionPlan = await SubscriptionPlan.findOneAndUpdate(
            {
                _id
            },
            {
                plan_for,
                plan_name,
                services,
                plan_price,
                plan_duration,
                is_activated
            },
            { new: true }
        );
        if (updatedsubscriptionPlan) {
            return sendResponse(req, res, 200, {
                status: true,
                body: updatedsubscriptionPlan,
                message: "Subscription Plan updated successfully",
                errorCode: null,
            });
        }
        sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "failed on subscription Plan updated",
            errorCode: "Internal server error",
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const deleteSubscriptionPlan = async (req, res) => {
    try {
        const { _id } = req.body

        let deletedsubscriptionPlan = await SubscriptionPlan.findOneAndUpdate(
            {
                _id
            },
            { is_deleted: true },
            { new: true }
        );
        if (deletedsubscriptionPlan) {
            return sendResponse(req, res, 200, {
                status: true,
                body: deletedsubscriptionPlan,
                message: "Subscription Plan deleted successfully",
                errorCode: null,
            });
        }
        sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "failed on delete subscription plan",
            errorCode: "Internal server error",
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Internal server error",
            errorCode: "Internal server error",
        });
    }
}

export const setMaximumRequest = async (req, res) => {
    try {
        var { userId, pharmacy, hospital_doctor, individual_doctor, patient, dental, optical, labimg,para,createdBy } = req.body

        let checkUser = await Superadmin.findOne({ _id: mongoose.Types.ObjectId(userId) });

        if (checkUser.role === 'STAFF_USER') {
            let userFind = await PortalUser.findOne({ superadmin_id: mongoose.Types.ObjectId(userId) });
            userId = userFind?.for_staff;
        }

        const checkDataExists = await MaximumRequest.find({ superadmin_id: userId })
        var result
        if (checkDataExists.length > 0) {
            result = await MaximumRequest.findOneAndUpdate(
                { superadmin_id: { $eq: userId } },
                {
                    $set: {
                        pharmacy,
                        hospital_doctor,
                        individual_doctor,
                        patient,
                        dental, 
                        optical, 
                        labimg,
                        para
                    }
                }
            )
        } else {
            const newRequest = new MaximumRequest({
                pharmacy,
                hospital_doctor,
                individual_doctor,
                patient,
                dental, 
                optical, 
                labimg,
                para,
                superadmin_id: userId,
                createdBy: createdBy
            })
            result = await newRequest.save()
        }
        sendResponse(req, res, 200, {
            status: true,
            body: result,
            message: "successfully set maximum request",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to set maximum request",
            errorCode: "Internal server error",
        });
    }
}
export const getMaximumRequest = async (req, res) => {
    try {
        var { userId } = req.query

        let checkUser = await Superadmin.findOne({ _id: mongoose.Types.ObjectId(userId) });

        if (checkUser.role === 'STAFF_USER') {
            let userFind = await PortalUser.findOne({ superadmin_id: mongoose.Types.ObjectId(userId) });
            userId = userFind?.for_staff;
        }

        const checkDataExists = await MaximumRequest.find({ superadmin_id: userId })
        if (checkDataExists.length > 0) {
            return sendResponse(req, res, 200, {
                status: true,
                body: checkDataExists,
                message: "successfully get maximum request",
                errorCode: null,
            });
        } else {
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "No record found",
                errorCode: null,
            });
        }
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "failed to get maximum request",
            errorCode: "Internal server error",
        });
    }
}
export const getLocationName = async (req, res) => {
    try {
        const { _id, country, region, province, department, city, village, address, neighborhood, pincode } = req.body.location
        const countryName = country != '' ? (await Country.findById(country).select('name').exec()) : '';
        const regionName = region != '' ? (await Region.findById(region).select('name').exec()) : '';
        const provinceName = province != '' ? (await Province.findById(province).select('name').exec()) : '';
        const departmentName = department != '' ? (await Department.findById(department).select('name').exec()) : "";
        const cityName = city != '' ? (await City.findById(city).select('name').exec()) : '';
        const villageName = village != '' ? (await Village.findById(village).select('name').exec()) : '';

        const location = { _id, countryName, regionName, provinceName, departmentName, cityName, villageName, address, neighborhood, pincode }

        sendResponse(req, res, 200, {
            status: true,
            body: location,
            message: "location name fetched successfully",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Something went wrong fetching location name",
            errorCode: "Internal server error",
        });
    }
}

export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body
        if (refreshToken == "") {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "The refresh token is required",
                errorCode: null,
            });
        }
        jwt.verify(refreshToken, secret.JWT, (err, decoded) => {
            if (err) {
                return sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "The refresh token is not valid",
                    errorCode: null,
                });
            } else {
                const tokenClaims = {
                    _id: decoded.data._id,
                    email: decoded.data.email,
                    role: decoded.data.role,
                    uuid: decoded.data.uuid
                }
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        token: generateToken(tokenClaims),
                        refreshToken: generateRefreshToken(tokenClaims),
                    },
                    message: "Generated new token and refresh token",
                    errorCode: null,
                });
            }
        })
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: "Something went wrong",
            errorCode: "Internal server error",
        });
    }
}

export const getSelectedMasterData = async (req, res) => {
    try {
        const { speciality, team } = req.body
        let resultArray = {}
        if (speciality.length > 0) {
            let specialityArry = speciality.map(val => mongoose.Types.ObjectId(val))
            const specialityData = await Speciality.find({ _id: { $in: specialityArry } }).select({ specilization: 1 })
            let specialityObject = {}
            for (const value of specialityData) {
                specialityObject[value._id] = value.specilization
            }
            resultArray.speciality = specialityData
            resultArray.specialityObject = specialityObject
        }
        sendResponse(req, res, 200, {
            status: true,
            body: { result: resultArray },
            message: "master data fetched successfully",
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong fetching master details",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}
export const addOrUpdateAppointmentCommission = async (req, res) => {
    try {
        const { type, online, home_visit, face_to_face, for_user, createdBy } = req.body
        const checkExist = await AppointmentCommission.find({ type })
        if (checkExist.length > 0) {
            await AppointmentCommission.findOneAndUpdate({ _id: { $eq: checkExist[0]._id } }, {
                $set: {
                    online,
                    home_visit,
                    face_to_face
                }
            }, { new: true }).exec();
        } else {
            const result = new AppointmentCommission({
                type,
                online,
                home_visit,
                face_to_face,
                for_user,
                createdBy
            })
            await result.save()
        }
        sendResponse(req, res, 200, {
            status: true,
            body: null,
            message: `commission data ${checkExist.length > 0 ? 'updated' : 'added'} successfully`,
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}
export const getAppointmentCommission = async (req, res) => {
    try {
        var { for_user } = req.query

        let checkUser = await Superadmin.findOne({ _id: mongoose.Types.ObjectId(for_user) });

        if (checkUser.role === 'STAFF_USER') {
            let userFind = await PortalUser.findOne({ superadmin_id: mongoose.Types.ObjectId(for_user) });
            for_user = userFind?.for_staff;
        }

        const checkExist = await AppointmentCommission.find({ for_user: { $eq: for_user } })

        sendResponse(req, res, 200, {
            status: true,
            body: checkExist,
            message: `commission data fetched successfully`,
            errorCode: null,
        });
    } catch (error) {
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}

export const gettotalMonthWiseforSuperAdmingraph = async (req, res) => {
    try {

        const { createdDate, updatedDate } = req.query
        const headers = {
            'Authorization': req.headers['authorization']
        }
        let patientData = await httpService.getStaging('payment/patient-getplanPriceMonthWise', { createdDate, updatedDate }, headers, 'patientServiceUrl');
        let insuranceData = await httpService.getStaging('payment/insurance-getplanPriceMonthWise', { createdDate, updatedDate }, headers, 'insuranceServiceUrl');
        let pharmacyData = await httpService.getStaging('payment/pharmacy-getplanPriceMonthWise', { createdDate, updatedDate }, headers, 'pharmacyServiceUrl');
        let hospitalData = await httpService.getStaging('payment/hospital-getplanPriceMonthWise', { createdDate, updatedDate }, headers, 'hospitalServiceUrl');

        //console.log(patientData,"patientDataaaa______");

        const allsubscriptionArray = Object.keys(patientData.body.subscriptionArray).reduce((result, month) => {
            result[month] = patientData.body.subscriptionArray[month] +
                insuranceData.body.subscriptionArray[month] +
                pharmacyData.body.subscriptionArray[month] +
                hospitalData.body.subscriptionArray[month];
            return result;
        }, {});

        const allcommisionArray = Object.keys(patientData.body.commissionArray).reduce((result, month) => {
            result[month] = patientData.body.commissionArray[month] +
                insuranceData.body.commissionArray[month] +
                pharmacyData.body.commissionArray[month] +
                hospitalData.body.commissionArray[month];
            return result;
        }, {});
        const alltotalTransaction = Object.keys(patientData.body.totalTransaction).reduce((result, month) => {
            result[month] = patientData.body.totalTransaction[month] +
                insuranceData.body.totalTransaction[month] +
                pharmacyData.body.totalTransaction[month] +
                hospitalData.body.totalTransaction[month];
            return result;
        }, {});



        sendResponse(req, res, 200, {
            status: true,
            body: { allsubscriptionArray, allcommisionArray, alltotalTransaction },
            message: `All graph data fetched successfully`,
            errorCode: null,
        });
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}
export const getallplanPriceforSuperAdmin = async (req, res) => {
    try {
        const { createdDate, updatedDate } = req.query

        const headers = {
            'Authorization': req.headers['authorization']
        }
        let totalcommisionamount = 0;
        let totalsubscriptionamount = 0;
        let totalnumber = 0;



        let sumOfPatient = await httpService.getStaging('payment/patient-getallplanPrice', { createdDate, updatedDate }, headers, 'patientServiceUrl');
        if (sumOfPatient.status == true) {
            totalsubscriptionamount += parseInt(sumOfPatient.body.totalPlanPrice)
            totalcommisionamount += parseInt(sumOfPatient.body.commission)
            totalnumber += parseInt(sumOfPatient.body.totalnumber)

        }
        let sumOfInsurance = await httpService.getStaging('payment/insurance-getallplanPrice', { createdDate, updatedDate }, headers, 'insuranceServiceUrl');
        if (sumOfInsurance.status == true) {
            totalsubscriptionamount += parseInt(sumOfInsurance.body.totalPlanPrice)
            totalcommisionamount += parseInt(sumOfInsurance.body.commission)
            totalnumber += parseInt(sumOfInsurance.body.totalnumber)

        }
        let sumOfHospital = await httpService.getStaging('payment/hospital-getallplanPrice', { createdDate, updatedDate }, headers, 'hospitalServiceUrl');
        if (sumOfHospital.status == true) {
            totalsubscriptionamount += parseInt(sumOfHospital.body.totalPlanPrice)
            totalcommisionamount += parseInt(sumOfHospital.body.commission)
            totalnumber += parseInt(sumOfHospital.body.totalnumber)

        }
        let sumOfpharmacy = await httpService.getStaging('payment/pharmacy-getallplanPrice', { createdDate, updatedDate }, headers, 'pharmacyServiceUrl');
        if (sumOfpharmacy.status == true) {
            totalsubscriptionamount += parseInt(sumOfpharmacy.body.totalPlanPrice)
            totalcommisionamount += parseInt(sumOfpharmacy.body.commission)
            totalnumber += parseInt(sumOfpharmacy.body.totalnumber)

        }


        sendResponse(req, res, 200, {
            status: true,
            body: { totalcommisionamount, totalsubscriptionamount, totalnumber },
            message: `All subscription plan price fetched successfully`,
            errorCode: null,
        });
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}


export const getlistofmanualmedicinClaim = async (req, res) => {
    try {
        const { limit, page, createdDate, updatedDate, searchText } = req.query;
        let filter = {}
        if (searchText != "") {
            filter = {

                isDeleted: false,
                $or: [
                    { pharmacyName: { $regex: searchText || '' } },

                ]


            }
        }
        var dateFilter = {}
        if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
            const createdDateObj = new Date(createdDate);
            const updatedDateObj = new Date(updatedDate);

            // dateFilter.createdAt = createdDateObj.toISOString();
            dateFilter.dateofFilling = { $gte: createdDateObj, $lte: updatedDateObj };
        }
        else if (createdDate && createdDate !== "") {
            const createdDateObj = new Date(createdDate);

            dateFilter.dateofFilling = { $gte: createdDateObj };
        }
        else if (updatedDate && updatedDate !== "") {
            const updatedDateObj = new Date(updatedDate);
            dateFilter.dateofFilling = { $lte: updatedDateObj };
        }
        console.log(req.query, "PPPPPPPPPPPPP");
        const result = await manualMedicineClaimData.find({ isDeleted: false, ...dateFilter, ...filter })
            .sort([["createdAt", -1]])
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        const count = await manualMedicineClaimData.countDocuments({
            isDeleted: false, ...dateFilter, ...filter
        });

        sendResponse(req, res, 200, {
            status: true,
            body: {
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalRecords: count,
                result,
            },
            // body: { totalcommisionamount, totalsubscriptionamount, totalnumber },
            message: `Manual Medicine Claim list fetched successfully`,
            errorCode: null,
        });
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}
export const deletemanualmedicinClaim = async (req, res) => {
    try {
        const { id } = req.body;
        const result = await manualMedicineClaimData.findByIdAndUpdate({ _id: mongoose.Types.ObjectId(id) }, {
            $set: { isDeleted: true }
        }, { new: true })

        if (result) {
            sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: `Record deleted successfully`,
                errorCode: null,
            });
        } else {

            sendResponse(req, res, 400, {
                status: true,
                body: null,
                message: `Something went wrong`,
                errorCode: null,
            });
        }
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}
const getDocumentObject = async (req, userId) => {
    let referenceofFile_object = {}
    if (req.files) {
        if ('referenceofFile' in req.files) {
            const s3result = await uploadFile(req.files.referenceofFile.data, {
                Bucket: 'healthcare-crm-stage-docs',
                Key: `superadmin/${userId}/group-icon/${req.files.referenceofFile.name}`,
            })
            referenceofFile_object['name'] = req.files.referenceofFile.name
            referenceofFile_object['code'] = 'group-icon'
            referenceofFile_object['e_tag'] = s3result.ETag
            referenceofFile_object['url'] = s3result.Key
        } else {
            referenceofFile_object = {}
        }
    }
    return referenceofFile_object
}
export const addmanualMedicinClaim = async (req, res) => {
    try {
        const { id, createdBy, dateofFilling, pharmacyName, pharmacyMobile, pharmacyEmail, dateofClaimSubmittion,
            invoiceDate, invoiceNumber, claimNumber, insuranceCompany, expectedPaymentDate, dateOfPayment, methodOfPayment,
            requestedAmount, approvedAmount, rejectedAmount, paidbytheInsured, reasonOfRejecting, comments, externalReimbursement } = req.body

        const resultdocument = await getDocumentObject(req, createdBy)
        var referenceofFile_key = ''
        if (Object.values(resultdocument).length > 0) {
            referenceofFile_key = resultdocument.url
        }
        if (id) {
            await manualMedicineClaimData.findOneAndUpdate({ _id: id }, {
                $set: {
                    createdBy, dateofFilling, referenceofFile: referenceofFile_key, pharmacyName, pharmacyMobile, pharmacyEmail, dateofClaimSubmittion,
                    invoiceDate, invoiceNumber, claimNumber, insuranceCompany, expectedPaymentDate, dateOfPayment, methodOfPayment,
                    requestedAmount, approvedAmount, rejectedAmount, paidbytheInsured, reasonOfRejecting, comments, externalReimbursement
                }
            }, { new: true }).exec();

        }
        else {
            const result = new manualMedicineClaimData({
                createdBy, dateofFilling, referenceofFile: referenceofFile_key, pharmacyName, pharmacyMobile, pharmacyEmail, dateofClaimSubmittion,
                invoiceDate, invoiceNumber, claimNumber, insuranceCompany, expectedPaymentDate, dateOfPayment, methodOfPayment,
                requestedAmount, approvedAmount, rejectedAmount, paidbytheInsured, reasonOfRejecting, comments, externalReimbursement
            })

            await result.save()
        }
        sendResponse(req, res, 200, {
            status: true,
            body: null,
            message: `Manual medicine data ${id ? 'updated' : 'added'} successfully`,
            errorCode: null,
        });


    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}

export const getviewofmanualmedicinClaim = async (req, res) => {
    try {
        const { id } = req.query;
        const result = await manualMedicineClaimData.findOne({ _id: mongoose.Types.ObjectId(id) })
        if (result.referenceofFile) {
            var signedurl = await getDocument(result.referenceofFile);
            result.referenceofFile = signedurl;
        }
        if (result) {
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Record fetched successfully`,
                errorCode: null,
            });
        } else {

            sendResponse(req, res, 400, {
                status: true,
                body: null,
                message: `Something went wrong`,
                errorCode: null,
            });
        }
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}

export const sendInvitation = async (req, res) => {
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
            addedBy,
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
                        verify_status: "PENDING",

                    }
                },
                { new: true }
            );

            if (updatedUserData) {
                const loggedInData = await Superadmin.find({ _id: created_By });
                const loggeInname = loggedInData[0].fullName;
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
                    addedBy,
                    verify_status: "PENDING"
                });
                userData = await userData.save();
            }

            const loggedInData = await Superadmin.find({ _id: created_By });
            const loggeInname = loggedInData[0].fullName;
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

// export const sendInvitation = async (req, res) => {
//     try {
//         const { first_name, middle_name, last_name, email, phone, address, created_By, verify_status,invitationId } = req.body;
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

//         const loggedInData = await Superadmin.find({ _id: req.body.created_By });
//         const loggeInname = loggedInData[0].fullName;
//         console.log("loggeInname===>", loggeInname)
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

export const getAllInvitation = async (req, res) => {
    try {
        var { for_portal_user, page, limit, searchKey, createdDate, updatedDate } = req.query;

        let checkUser = await Superadmin.findOne({ _id: mongoose.Types.ObjectId(for_portal_user) });

        if (checkUser.role === 'STAFF_USER') {
            let userFind = await PortalUser.findOne({ superadmin_id: mongoose.Types.ObjectId(for_portal_user) });
            for_portal_user = userFind?.for_staff;
        }


        var sort = req.query.sort
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            var keynew = sort.split(":")[0];
            var value = sort.split(":")[1];
            sortingarray[keynew] = value;
        } else {
            sortingarray['createdAt'] = -1;
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

export const getInvitationById = async (req, res) => {
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

export const deleteInvitation = async (req, res) => {
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
            message: `failed to delete invitation`,
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
}

export const getallPaymentHistory = async (req, res) => {
    try {
        const allowedPortals = ["PHARMACY_ADMIN", "PATIENT", "INSURANCE_ADMIN", "INDIVIDUAL_DOCTOR", "HOSPITAL_ADMIN", "INDIVIDUAL"];
        const { limit, page, createdDate, updatedDate, order_type, portal, searchText } = req.query;

        var sort = req.query.sort
        var keynew = '';
        var value = '';
        var sortingarray = {};
        if (sort != 'undefined' && sort != '' && sort != undefined) {
            keynew = sort.split(":")[0];
            value = sort.split(":")[1];
            sortingarray[keynew] = value;
        } else {
            sortingarray['createdAt'] = -1;

        }
        const headers = {
            'Authorization': req.headers['authorization']
        }
        let totalRecords = 0;
        let totalAmount = 0;
        let list = [];
        console.log(portal, "portal")

        let patientPayment = await httpService.getStaging('payment/patient-getPaymentHistory', { createdDate, updatedDate, order_type, searchText }, headers, 'patientServiceUrl');
        if (patientPayment.status == true) {
            list.push(patientPayment.body.paytransactions)
            totalRecords += parseInt(patientPayment.body.totalCount)
            totalAmount += parseInt(patientPayment.body.totalAmount)


        }
        let pharmacyPayment = await httpService.getStaging('payment/pharmacy-getPaymentHistory', { createdDate, updatedDate, order_type, searchText }, headers, 'pharmacyServiceUrl');
        if (pharmacyPayment.status == true) {
            list.push(pharmacyPayment.body.paytransactions)
            totalRecords += parseInt(pharmacyPayment.body.totalCount)
            totalAmount += parseInt(pharmacyPayment.body.totalAmount)

        }
        let insurancePayment = await httpService.getStaging('payment/insurance-getPaymentHistory', { createdDate, updatedDate, order_type, searchText }, headers, 'insuranceServiceUrl');
        if (insurancePayment.status == true) {
            list.push(insurancePayment.body.paytransactions)
            totalRecords += parseInt(insurancePayment.body.totalCount)
            totalAmount += parseInt(insurancePayment.body.totalAmount)

        }
        let individualdoctorPayment = await httpService.getStaging('payment/hospital-getPaymentHistory', { createdDate, updatedDate, order_type, searchText }, headers, 'hospitalServiceUrl');
        if (individualdoctorPayment.status == true) {
            list.push(individualdoctorPayment.body.paytransactions)
            totalRecords += parseInt(individualdoctorPayment.body.totalCount)
            totalAmount += parseInt(individualdoctorPayment.body.totalAmount)

        }

        let hospitalPayment = await httpService.getStaging('payment/hospital-getPaymentHistory_Hospital', { createdDate, updatedDate, order_type, searchText }, headers, 'hospitalServiceUrl');
        if (hospitalPayment.status == true) {
            list.push(hospitalPayment.body.paytransactions)
            totalRecords += parseInt(hospitalPayment.body.totalCount)
            totalAmount += parseInt(hospitalPayment.body.totalAmount)

        }

        let labimagingdentaloptical = await httpService.getStaging('payment/four-portal-getPaymentHistory_four-portal', { createdDate, updatedDate, order_type, searchText }, headers, 'labimagingdentalopticalServiceUrl');
        console.log("labimagingdentaloptical======", labimagingdentaloptical);

        if (labimagingdentaloptical.status == true) {
            list.push(labimagingdentaloptical.body.paytransactions)
            totalRecords += parseInt(labimagingdentaloptical.body.totalCount)
            totalAmount += parseInt(labimagingdentaloptical.body.totalAmount)

        }
        list = list.flat();


        if (portal !== undefined && allowedPortals.includes(portal)) {
            list = list.filter(item => item.paymentBy === portal);
        }

        if (keynew == 'createdAt') {
            if (value == 'asc') {
                list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            } else {
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            }
        }

        if (keynew == 'Name') {
            if (value == 'asc') {
                list.sort((a, b) => {
                    if (a.Name < b.Name) return -1;
                    if (a.Name > b.Name) return 1;
                    return 0;
                });

            } else {
                list.sort((a, b) => {
                    if (a.Name > b.Name) return -1;
                    if (a.Name < b.Name) return 1;
                    return 0;
                });
            }
        }

        if (keynew == 'paymentBy') {
            if (value == 'asc') {
                list.sort((a, b) => {
                    if (a.paymentBy < b.paymentBy) return -1;
                    if (a.paymentBy > b.paymentBy) return 1;
                    return 0;
                });

            } else {
                list.sort((a, b) => {
                    if (a.paymentBy > b.paymentBy) return -1;
                    if (a.paymentBy < b.paymentBy) return 1;
                    return 0;
                });
            }
        }

        if (keynew == 'paymentType') {
            if (value == 'asc') {
                list.sort((a, b) => {
                    if (a.paymentType < b.paymentType) return -1;
                    if (a.paymentType > b.paymentType) return 1;
                    return 0;
                });

            } else {
                list.sort((a, b) => {
                    if (a.paymentType > b.paymentType) return -1;
                    if (a.paymentType < b.paymentType) return 1;
                    return 0;
                });
            }
        }


        if (keynew == 'Amount') {
            if (value == 'asc') {
                list.sort((a, b) => parseInt(a.Amount) - parseInt(b.Amount));

            } else {
                list.sort((a, b) => parseInt(b.Amount) - parseInt(a.Amount));

            }
        }

        if (keynew == 'payment_mode') {
            if (value == 'asc') {
                list.sort((a, b) => {
                    if (a.payment_mode < b.payment_mode) return -1;
                    if (a.payment_mode > b.payment_mode) return 1;
                    return 0;
                });

            } else {
                list.sort((a, b) => {
                    if (a.payment_mode > b.payment_mode) return -1;
                    if (a.payment_mode < b.payment_mode) return 1;
                    return 0;
                });
            }
        }

        if (keynew == 'transaction_id') {
            if (value == 'asc') {
                list.sort((a, b) => {
                    if (a.transaction_id < b.transaction_id) return -1;
                    if (a.transaction_id > b.transaction_id) return 1;
                    return 0;
                });

            } else {
                list.sort((a, b) => {
                    if (a.transaction_id > b.transaction_id) return -1;
                    if (a.transaction_id < b.transaction_id) return 1;
                    return 0;
                });
            }
        }


        let skip = (page - 1) * limit
        let start_index;
        if (skip == 0) {
            start_index = skip
        } else {
            start_index = skip;
        }

        const end_index = parseInt(limit) + parseInt(skip);
        const result = list.slice(start_index, end_index);

        sendResponse(req, res, 200, {
            status: true,
            body: {
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: page,
                totalRecords: totalRecords,
                result, totalAmount
            },

            message: `Payment history list fetched successfully`,
            errorCode: null,
        });
    } catch (error) {
        console.log(error, "error");
        sendResponse(req, res, 500, {
            status: false,
            body: error,
            message: error.message ? error.message : "Something went wrong",
            errorCode: error.code ? error.code : "Internal server error",
        });
    }
}



export const changePassword = async (req, res) => {
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
        const findUser = await Superadmin.findOne({ _id: id });
        const isPasswordOldMatch = await checkPassword(old_password, findUser);
        if (!isPasswordOldMatch) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "Incorrect Old Password.",
                errorCode: null,
            });
        }

        const isPasswordMatch = await checkPassword(new_password, findUser);
        console.log("isPasswordMatch", isPasswordMatch);
        if (isPasswordMatch) {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "This is Previous password. Enter New Password.",
                errorCode: null,
            });
        }

        const salt = await bcrypt.genSalt(10);
        let hashPassword = await bcrypt.hash(new_password, salt);
        let changedPassword = await Superadmin.findOneAndUpdate(
            { _id: id },
            { password: hashPassword },
            { new: true }
        );
        sendResponse(req, res, 200, {
            status: true,
            body: changedPassword,
            message: "Successfully change password.",
            errorCode: null,
        });
    } catch (error) {
        console.log("errorerror", error);
        sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Failed change password. ",
            errorCode: "INTERNAL_SERVER_ERROR",
        });
    }
}

export const updatelogsData = async (req, res) => {
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

export const getAllLogs = async (req, res) => {
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

export const getSuperAdminData = async (req, res) => {
    try {
        const superAdminData = await Superadmin.findOne({role:"superadmin"});

        if (superAdminData) {
            return sendResponse(req, res, 200, {
                status: true,
                body: superAdminData,
                message: "Data fetch successfully",
                errorCode: null,
            });
        } else {
            return sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: "Data not fetch successfully",
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

export const notification = async (req, res) => {
    try {
        const userData = await Superadmin.findOne({ _id: req.body.for_portal_user });
        const notificationValue = new Notification(req.body);
        let notificationData = await notificationValue.save();

        const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: req.body.for_portal_user }, {}, "gatewayServiceUrl");

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

