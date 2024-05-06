"use strict";

import 'dotenv/config';
import axios from "axios";

const NODE_ENV = process.env.NODE_ENV || "local";

const config = require("../config/config.js").get();
const { BASEURL } = config;


export const hospitalAdminSignup = async (req, res) => {
    const baseurl = BASEURL.hospitalServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/admin-signup`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.hospitalServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/send-sms-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const matchSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.hospitalServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/match-sms-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}
