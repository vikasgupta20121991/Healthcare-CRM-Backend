"use strict";

import HttpService from "../middleware/httpservice";
import { sendResponse } from "../helpers/transmission";
const express = require('express');
const app = express();

export const subscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/subscription-purchased-plan', 'pharmacyServiceUrl');
}
export const viewSubscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/view-subscription-purchased-plan', 'pharmacyServiceUrl');
}
export const signup = async (req, res) => {
    HttpService.postWithoutAuth(req, res, 'pharmacy/signup', 'pharmacyServiceUrl');
}
export const login = async (req, res) => {
    HttpService.postWithoutAuth(req, res, 'pharmacy/login', 'pharmacyServiceUrl');
}
export const sendSmsOtpFor2fa = async (req, res) => {
    HttpService.postWithoutAuth(req, res, 'pharmacy/send-sms-otp-for-2fa', 'pharmacyServiceUrl');
}
export const matchSmsOtpFor2fa = async (req, res) => {
    HttpService.postWithoutAuth(req, res, 'pharmacy/match-sms-otp-for-2fa', 'pharmacyServiceUrl');
}
export const pharmacyOpeningHours = async (req, res) => {
    HttpService.postWithAuth(req, res, 'pharmacy/pharmacy-opening-hours', 'pharmacyServiceUrl');
}
export const pharmacyOnDuty = async (req, res) => {
    HttpService.postWithAuth(req, res, 'pharmacy/pharmacy-on-duty', 'pharmacyServiceUrl');
}
export const getAllPharmacy = async (req, res) => {
    HttpService.getWithAuth(req, res, 'pharmacy/get-all-pharmacy', 'pharmacyServiceUrl');
}

export const getAllPharmacyAdminDetails = async (req, res) => {
    HttpService.getWithAuth(req, res, 'pharmacy/get-all-pharmacy-admin-details', 'pharmacyServiceUrl');
}

export const sendnoti = async (req, res) => {
    console.log("fsdfsdfdfsdfsd",req.query.socketuserid);
    const io = req.app.get('io');
    // console.log("io",io);
    io.emit("recievenoti","");
    sendResponse(req, res, 200, {
        status: true,
        body: [],
        message: `notification save`,
        errorCode: null,
      });
  }