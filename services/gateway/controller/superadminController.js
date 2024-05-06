"use strict";

import 'dotenv/config';
import axios from "axios";
import HttpService from "../middleware/httpservice";
const FormData = require('form-data');

const NODE_ENV = process.env.NODE_ENV || "local";

const config = require("../config/config.js").get();
const { BASEURL } = config;


export const forgotPassword = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/forgot-password`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const resetForgotPassword = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/reset-forgot-password`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendEmailOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/send-email-otp-for-2fa`,
        data: req.body,
        headers: {
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const matchEmailOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/match-email-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/send-sms-otp-for-2fa`,
        data: req.body,
        headers: {
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const matchSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/match-sms-otp-for-2fa`,
        data: req.body,
        headers: {
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const superadminLogin = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    console.log(baseurl, "check base url");
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/login`,
        data: req.body,
        headers: {
            role: req.header("role"),
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        console.log(response, "response,123");
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error, "check error");
        await res.status(200).json({ data: error })

    });
}

export const approveOrRejectInsuranceAdmin = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/insurance/approve-or-reject-insurance-admin`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const approvePharmacyAdmin = async (req, res) => {
    const baseurl = BASEURL.pharmacyServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/pharmacy/approve-pharmacy-admin`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const setInsuranceTemplate = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/insurance/set-insurance-template`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getInsuranceAdminNotApprovedList = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-insurance-admin-not-approved-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getInsuranceAdminDetails = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-insurance-details`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getInsuranceAdminApprovedList = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-insurance-admin-approved-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getInsuranceAdminRejectList = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-insurance-admin-rejected-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getServiceField = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/superadmin/get-service-field`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const addMedicine = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/add-medicine`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const createSubscriptionPlan = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/create-subscription-plan`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const allSubscriptionPlans = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/superadmin/all-subscription-plans`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getPeriodicList = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/superadmin/get-periodic-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getSubscriptionPlanDetails = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/superadmin/get-subscription-plan-details`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const editSubscriptionPlan = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/superadmin/update-subscription-plan`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const deleteSubscriptionPlan = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/superadmin/delete-subscription-plan`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const createSpeciality = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/speciality/create`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const specialityList = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/speciality/speciality-list`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const specialityUpdate = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/speciality/update`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const specialityDelete = async (req, res) => {
    const baseurl = BASEURL.superadminServiceUrl;
    axios({
        method: 'delete',
        url: `${baseurl}/speciality/delete`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const getInsuranceTemplateList = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-insurance-template-list`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const listMedicine = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/list-medicine', 'superadminServiceUrl');
}

export const editMedicine = async (req, res) => {
    HttpService.postWithAuth(req, res, 'superadmin/edit-medicine', 'superadminServiceUrl');
}

export const deleteMedicine = async (req, res) => {
    HttpService.postWithAuth(req, res, 'superadmin/delete-medicine', 'superadminServiceUrl');
}

export const uploadCSVForMedicine = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        const fileRecievedFromClient = req.files.medicine_csv;
        form.append('medicine_csv', fileRecievedFromClient.data, fileRecievedFromClient.name);
    } else {
        form.append('medicine_csv', '');
    }
    form.append('userId', req.body.userId)

    HttpService.postWithAuth(req, res, 'superadmin/upload-csv-for-medicine', 'superadminServiceUrl', form);
}

export const setMaximumRequest = async (req, res) => {
    HttpService.postWithAuth(req, res, 'superadmin/set-maximum-request', 'superadminServiceUrl');
}