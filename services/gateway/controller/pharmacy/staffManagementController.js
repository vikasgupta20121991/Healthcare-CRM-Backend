"use strict";

import HttpService from "../../middleware/httpservice";
const FormData = require('form-data');

export const addStaff = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        const fileRecievedFromClient = req.files.staff_profile;
        form.append('staff_profile', fileRecievedFromClient.data, fileRecievedFromClient.name);
    } else {
        form.append('staff_profile', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }

    HttpService.postWithAuth(req, res, 'pharmacy/add-staff', 'pharmacyServiceUrl', form);
}
export const editStaff = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        const fileRecievedFromClient = req.files.staff_profile;
        form.append('staff_profile', fileRecievedFromClient.data, fileRecievedFromClient.name);
    } else {
        form.append('staff_profile', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }

    HttpService.postWithAuth(req, res, 'pharmacy/edit-staff', 'pharmacyServiceUrl', form);
}
export const listStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'pharmacy/list-staff', 'pharmacyServiceUrl');
}

export const viewStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'pharmacy/view-staff-details', 'pharmacyServiceUrl');
}

export const deleteActiveLockStaff = async (req, res) => {
    HttpService.postWithAuth(req, res, 'pharmacy/delete-active-lock-staff', 'pharmacyServiceUrl');
}

export const getAllStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'pharmacy/get-all-staff', 'pharmacyServiceUrl');
}
