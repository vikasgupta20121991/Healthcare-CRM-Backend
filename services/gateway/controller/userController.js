"use strict";

import 'dotenv/config';
import axios from "axios";
import FormData from "form-data"

const NODE_ENV = process.env.NODE_ENV || "local";

const config = require("../config/config.js").get();
const { BASEURL } = config;


export const hospitalAdminSignup = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/admin-signup`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}


export const createHospitalStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/create-staff`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}


export const craeteHospitalProfile = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/hospital/create-hospital-profile`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}


export const editHospitalProfile = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/hospital/edit-hospital-profile`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}


export const insuranceAdminSignup = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    // console.log(baseurl)
    axios({
        method: 'post',
        url: `${baseurl}/insurance/admin-signup`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const insuranceAdminLogin = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/admin-login`,
        data: req.body,
        headers: {
            role: req.header("role"),
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendEmailOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/send-email-otp-for-2fa`,
        data: req.body,
        headers: {
            role: req.header("role"),
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
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/match-email-otp-for-2fa`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const sendSmsOtpFor2fa = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/send-sms-otp-for-2fa`,
        data: req.body,
        headers: {
            role: req.header("role"),
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
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/match-sms-otp-for-2fa`,
        data: req.body,
        headers: {
            role: req.header("role"),
            uuid: req.header("uuid")
        }
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const craeteInsuranceProfile = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/create-insurance-profile`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const editInsuranceProfile = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/insurance/edit-insurance-profile`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const changePassword = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'put',
        url: `${baseurl}/insurance/change-password`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const forgotPassword = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/forgot-password`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const resetForgotPassword = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/reset-forgot-password`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const addCategory = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/add-category`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const addService = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/add-service`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const addExlusionData = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/add-exclusion-details`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const deleteExlusionData = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/delete-exclusion-data`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}

export const deleteCategoryService = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/delete-category-service`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        console.log(error)
        await res.status(200).json({ data: error })
    });
}



//Insurance staff 
export const addStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;

    // const fileRecievedFromClient = req.file;
    let form = new FormData();
    form.append('staff_profile', '');
    for (const key of Object.keys(req.body)) {
        form.append(key, req.body[key])
    }
    axios({
        method: 'post',
        url: `${baseurl}/insurance/add-staff`,
        data: form
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const editStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    // const fileRecievedFromClient = req.file;
    let form = new FormData();
    form.append('staff_profile', '');
    for (const key of Object.keys(req.body)) {
        form.append(key, req.body[key])
    }
    axios({
        method: 'put',
        url: `${baseurl}/insurance/edit-staff`,
        data: form
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const getAllStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-all-staff`,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const getAllInsuranceStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-all-insurance-staff`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const getStaffDetails = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/get-staff-details`,
        data: req.body,
        params: req.query,
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const actionForStaff = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/delete-active-and-lock-staff`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const addStaffRole = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/add-staff-role`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const allStaffRole = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'get',
        url: `${baseurl}/insurance/all-staff-role`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const updateStaffRole = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/update-staff-role`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const deleteStaffRole = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/delete-staff-role`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}

export const viewRes = async (req, res) => {
    const baseurl = BASEURL.insuranceServiceUrl;
    axios({
        method: 'post',
        url: `${baseurl}/insurance/viewRes`,
        data: req.body
    }).then(async function (response) {
        await res.status(200).json({ data: response.data })
    }).catch(async function (error) {
        await res.status(200).json({ data: error })
    });
}