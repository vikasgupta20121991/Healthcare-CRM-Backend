"use strict";

import { matchedData } from "express-validator";
const bcrypt = require('bcrypt');
import jwt from "jsonwebtoken";
import Superadmin from "../models/superadmin";
import InsuranceUser from "../models/insurance/user";
import Pharmacy from "../../pharmacy/models/admin_info"
// import SubscriptionPlan from "../models/subscriptionPlan";
import Otp2fa from "../models/otp2fa";
import { messageID, messages, responseCodes, htmlForgetPassword, htmlEmailFor2FAOTP } from "../constant.js";
import { sendEmail } from "../middleware/sendEmail";
const config = require('../config/config').get(process.env.NODE_ENV);
const { itemNotFound, handleRejectionError, buildErrObject } = require("../middleware/utils");
const { secret } = config;
const Http = require('../middleware/httpservice.js');
import { sendResponse } from "../helpers/transmission";


const httpService = new Http()
/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = payload => {
    console.log(config.JWT_EXPIRATION_IN_MINUTES, secret.jwt);
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * config.JWT_EXPIRATION_IN_MINUTES;

    // returns signed token
    return jwt.sign(
        {
            data: payload,
            exp: expiration
        },
        secret.jwt
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
        secret.jwt
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
        const data = req.body;
        const role = req.header("role")
        var ip = req.ip
        const findUser = await Superadmin.findOne({ email: data.email })
        const isIpMatch = await checkIp(ip, findUser.ipAddress)
        if (isIpMatch == false) {
            sendResponse(req, res, 200, {
                status: true,
                body: {
                    email: findUser.email,
                    isIpMatch,
                    role
                },
                message: "ip not matched",
                errorCode: null,
            });
        }
        const isPasswordMatch = await checkPassword(data.password, findUser);

        if (!isPasswordMatch) return handleRejectionError(res, { message: messages.incorrectPassword }, messageID.unAuthorizedUser)

        findUser.password = undefined
        sendResponse(req, res, 200, {
            status: true,
            body: {
                token: generateToken({ _id: findUser._id, email: findUser.email, role: findUser.role }),
                refreshToken: generateRefreshToken({ _id: findUser._id, email: findUser.email, role: findUser.role }),
                isIpMatch,
                role
            },
            message: "login done",
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const OTP2FA = async (req, res) => {
    try {
        const { email } = req.body;
        let otp = Math.floor(100000 + Math.random() * 900000);
        req.body.otp = otp
        if (email != "") {
            let newOtp2fa = new Otp2fa(
                req.body
            );
            let html = htmlEmailFor2FAOTP(otp);
            let sendEmailStatus = sendEmail(email.toLowerCase(), '2FA OTP', html);
            let savedOtp = await newOtp2fa.save();
            if (sendEmailStatus) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: {
                        otp,
                    },
                    message: "OTP sent to your email",
                    errorCode: null,
                });
            }
        }
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const sendOTP2FA = async (req, res) => {
    try {
        const { email, otp } = req.body;
        var ip = req.ip
        if (email != "") {
            const data = await Otp2fa.findOne({ email })
            if (data) {
                if (data.otp == otp) {
                    const setIp = await Superadmin.updateOne(
                        { email: data.email },
                        {
                            $set: {
                                ipAddress: ip
                            },
                        },
                        { new: true }
                    ).exec();
                    sendResponse(req, res, 200, {
                        status: true,
                        message: "OTP matched",
                        errorCode: null,
                    });
                }
            } else {
                sendResponse(req, res, 200, {
                    status: true,
                    message: "OTP expired",
                    errorCode: null,
                });
            }
        }
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const superadmin = await Superadmin.find()
        var OTP = Math.floor(1000 + Math.random() * 9000);
        const salt = await bcrypt.genSalt(10);
        let hashOTP = await bcrypt.hash(OTP.toString(), salt);
        const updatedSuperadmin = await Superadmin.findOneAndUpdate({ _id: superadmin[0]._id }, { forgotPasswordOTP: hashOTP }, { new: true })
        sendResponse(req, res, 200, {
            status: true,
            body: OTP,
            message: "OTP sent to your email",
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
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

        res.status(200).json({
            status: true,
            body: NotApprovedList,
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}


export const getInsuranceAdminApprovedList = async (req, res) => {
    try {
        console.log("accepttttt*****");

        const { page, perPage } = req.query
        const options = {
            page: parseInt(page, 10) || 1,
            perPage: parseInt(perPage, 10) || 10
        }

        const ApprovedList = await InsuranceUser.paginate({ isApproved: true }, { isDeleted: fasle }, options)

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







export const createSubscriptionPlan = async (req, res) => {
    try {
        const { subscriptionPlanName } = req.body

        let subscriptionPlanExist = await SubscriptionPlan.findOne(
            {
                subscriptionPlanName,
                isDeleted: false
            }
        );
        if (subscriptionPlanExist) {
            return sendResponse(req, res, 200, {
                status: true,
                message: "Subscription plan already exist",
                errorCode: null,
            });
        }

        let newSubscriptionPlanDetails = new SubscriptionPlan(
            req.body
        );
        let newSubscriptionPlan = await newSubscriptionPlanDetails.save();

        res.status(200).json({
            status: true,
            body: newSubscriptionPlan,
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const allSubscriptionPlans = async (req, res) => {
    try {
        let allPlans = await SubscriptionPlan.find();
        if (!allPlans) {
            return sendResponse(req, res, 200, {
                status: true,
                message: "No subscription plan exist",
                errorCode: null,
            });
        }
        res.status(200).json({
            status: true,
            body: allPlans,
            errorCode: null,
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}


export const editSubscriptionPlan = async (req, res) => {
    try {
        const { subscriptionPlanId } = req.body

        let updatedsubscriptionPlan = await SubscriptionPlan.findOneAndUpdate(
            {
                _id: subscriptionPlanId,
            },
            req.body,
            { new: true }
        );
        if (updatedsubscriptionPlan) {
            return res.status(200).json({
                status: true,
                message: "Subscription Plan updated successfully",
                body: updatedsubscriptionPlan,
                errorCode: null,
            });
        }
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}

export const deleteSubscriptionPlan = async (req, res) => {
    try {
        const { subscriptionPlanId } = req.body

        let deletedsubscriptionPlan = await SubscriptionPlan.findOneAndUpdate(
            {
                _id: subscriptionPlanId,
            },
            { isDeleted: true },
            { new: true }
        );
        if (deletedsubscriptionPlan) {
            return res.status(200).json({
                status: true,
                message: "Subscription Plan deleted successfully",
                errorCode: null,
            });
        }
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    } catch (error) {
        handleRejectionError(res, error, 500);
    }
}
