"use strict";

import 'dotenv/config';
import axios from "axios";

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
        console.log(error)
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
    axios({
        method: 'post',
        url: `${baseurl}/insurance/admin-signup`,
        data: req.body
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