"use strict";

import HttpService from "../../middleware/httpservice";
const FormData = require('form-data');

export const createAssociationGroup = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('association_group_icon' in req.files) {
            const fileRecievedFromClient = req.files.association_group_icon;
            form.append('association_group_icon', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('association_group_icon', '');
        }
        if ('license_card_id_proof' in req.files) {
            const fileRecievedFromClient = req.files.license_card_id_proof;
            form.append('license_card_id_proof', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('license_card_id_proof', '');
        }
    } else {
        form.append('association_group_icon', '');
        form.append('license_card_id_proof', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }

    HttpService.postWithAuth(req, res, 'superadmin/create-association-group', 'superadminServiceUrl', form);
}
export const editAssociationGroup = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('association_group_icon' in req.files) {
            const fileRecievedFromClient = req.files.association_group_icon;
            form.append('association_group_icon', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('association_group_icon', '');
        }
        if ('license_card_id_proof' in req.files) {
            const fileRecievedFromClient = req.files.license_card_id_proof;
            form.append('license_card_id_proof', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('license_card_id_proof', '');
        }
    } else {
        form.append('association_group_icon', '');
        form.append('license_card_id_proof', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }

    HttpService.postWithAuth(req, res, 'superadmin/edit-association-group', 'superadminServiceUrl', form);
}
export const listAssociationGroup = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/list-association-group', 'superadminServiceUrl');
}
export const viewAssociationGroup = async (req, res) => {
    HttpService.getWithAuth(req, res, 'superadmin/view-association-group', 'superadminServiceUrl');
}

export const deleteActiveLockAssociationGroup = async (req, res) => {
    HttpService.postWithAuth(req, res, 'superadmin/delete-active-lock-association-group', 'superadminServiceUrl');
}