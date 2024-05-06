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

    HttpService.postWithAuth(req, res, 'superadmin/add-staff', 'superadminServiceUrl', form);
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

    HttpService.postWithAuth(req, res, 'superadmin/edit-staff', 'superadminServiceUrl', form);
}
export const listStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/list-staff', 'superadminServiceUrl');
}

export const viewStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/view-staff-details', 'superadminServiceUrl');
}

export const deleteActiveLockStaff = async (req, res) => {
    HttpService.postWithAuth(req, res, 'superadmin/delete-active-lock-staff', 'superadminServiceUrl');
}

export const getAllStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/get-all-staff', 'superadminServiceUrl');
}

// chat
export const listStaffForChat = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/list-staff-forchat', 'superadminServiceUrl');
}