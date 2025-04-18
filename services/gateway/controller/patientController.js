"use strict";

import 'dotenv/config';
import axios from "axios";
import HttpService from "../middleware/httpservice";
import FormData from "form-data"

const NODE_ENV = process.env.NODE_ENV || "local";

const config = require("../config/config.js").get();
const { BASEURL } = config;


export const signup = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/signup`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const login = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    console.log('iiiiiiii');
    axios({
        method: 'post',
        url: `${baseurl}/patient/login`,
        data: req.body,
    headers: { role: req.header("role") },
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const sendEmailOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/send-email-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const matchEmailOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/match-email-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/send-sms-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const matchSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/match-sms-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const personalDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/personal-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const insuranceDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/insurance-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const addVitals = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
    url: `${baseurl}/patient/create-profile/add-vitals`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const medicineDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/medicine-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const immunizationDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/immunization-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const historyDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/history-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const medicalDocument = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/medical-document`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const familyDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/patient/create-profile/family-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const uploadDocument = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    let form = new FormData();
    for (const key of Object.keys(req.body)) {
        form.append(key, req.body[key])
    }
    form.append('docName', req.files.docName.data, req.files.docName.name);
    // console.log(form);
    // return
    axios({
        method: 'post',
        url: `${baseurl}/patient/upload-document`,
        data: form
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const profileDetails = async (req, res) => {
    const baseurl = BASEURL.patientServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/patient/profile-details`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const advanceSearchPharmacyList = async (req, res) => {
    const baseurl = BASEURL.pharmacyServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/pharmacy/advance-search-pharmacy-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error.response.data })
    });
}

export const subscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/subscription-purchased-plan', 'patientServiceUrl');
}
export const viewSubscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/view-subscription-purchased-plan', 'patientServiceUrl');
}
export const getPaymentDetails = async (req, res) => {
    HttpService.getWithAuth(req, res, 'patient/get-payment-details', 'patientServiceUrl');
}