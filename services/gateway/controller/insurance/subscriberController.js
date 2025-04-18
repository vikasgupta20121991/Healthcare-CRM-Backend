"use strict";

import HttpService from "../../middleware/httpservice";
const FormData = require('form-data');

export const addPrimarySubscriber = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('insurance_card_id_proof' in req.files) {
            const fileRecievedFromClient = req.files.insurance_card_id_proof;
            form.append('insurance_card_id_proof', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('insurance_card_id_proof', '');
        }
       
    } else {
        form.append('insurance_card_id_proof', '');
    }
    for (const key in req.body) {
    form.append(key, req.body[key]);
    }
    HttpService.postWithAuth(req, res, 'insurance-subscriber/add-primary-subscriber', 'insuranceServiceUrl', form);
}

export const addSecondarySubscriber = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('insurance_card_id_proof' in req.files) {
            const fileRecievedFromClient = req.files.insurance_card_id_proof;
            form.append('insurance_card_id_proof', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('insurance_card_id_proof', '');
        }
       
    } else {
        form.append('insurance_card_id_proof', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }
    HttpService.postWithAuth(req, res, 'insurance-subscriber/add-secondary-subscriber', 'insuranceServiceUrl', form);
}

export const deleteSubscriber = async (req, res) => {
    HttpService.postWithAuth(req, res, 'insurance-subscriber/delete-subscriber', 'insuranceServiceUrl');
}

export const updateSubscriber = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('insurance_card_id_proof' in req.files) {
            const fileRecievedFromClient = req.files.insurance_card_id_proof;
            form.append('insurance_card_id_proof', fileRecievedFromClient.data, fileRecievedFromClient.name);
        } else {
            form.append('insurance_card_id_proof', '');
        }
       
    } else {
        form.append('insurance_card_id_proof', '');
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }
    HttpService.postWithAuth(req, res, 'insurance-subscriber/update-subscriber', 'insuranceServiceUrl', form);
}

export const listSubscriber = async (req, res) => {
    HttpService.getWithAuth(req, res, 'insurance-subscriber/list-subscriber', 'insuranceServiceUrl');
}

export const listSubscriberType = async (req, res) => {
    HttpService.getWithAuth(req, res, 'insurance-subscriber/list-subscriber-type', 'insuranceServiceUrl');
}

export const viewSubscriber = async (req, res) => {
    HttpService.getWithAuth(req, res, 'insurance-subscriber/view-subscriber', 'insuranceServiceUrl');
}

export const uploadSubscriberFromCSV = async (req, res) => {
    let form = new FormData();
    if (req.files) {
        if ('csv_file' in req.files) {
            const fileRecievedFromClient = req.files.csv_file;
            form.append('csv_file', fileRecievedFromClient.data, fileRecievedFromClient.name);
        }
    } else {
        res.status(500).json({message: "CSV file not found"})
        return
    }
    for (const key in req.body) {
        form.append(key, req.body[key]);
    }
    HttpService.postWithAuth(req, res, 'insurance-subscriber/upload-subscribers-csv', 'insuranceServiceUrl', form);
}

export const uploadFile = async (req, res) => {
    const fileRecievedFromClient = req.files.file;
    console.log(fileRecievedFromClient, 'fileRecievedFromClient');
    let form = new FormData();
    // form.append('file', req.files);
    form.append('file', fileRecievedFromClient.data, fileRecievedFromClient.name);
    form.append('test_key', req.body.test_key);
    HttpService.postWithAuth(req, res, 'insurance-subscriber/upload-file', 'insuranceServiceUrl', form);
}