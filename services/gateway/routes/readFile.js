import express from "express";
const multer = require('multer');
const path = require('path')
import readFileContent from "../controller/readFile";
import { sendResponse } from '../helpers/transmission'

const userRoute = express.Router()

const uploadFileToLocalStorage = (req, res, next) => {
    if (!req.files) {
        return sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const file = req.files.file;
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Only .xlsx mime type allowed!",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const filename = file.name.split('.')[0] + '-' + Date.now() + '.xlsx';
    req.filename = filename;
    const path = `./uploads/${filename}`

    file.mv(path, (err) => {
        if (err) {
            return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Something went wrong while uploading file",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
        next()
    });
}

userRoute.post('/upload-csv-for-json', uploadFileToLocalStorage, readFileContent)

export default userRoute;