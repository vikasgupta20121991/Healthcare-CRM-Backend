"use strict";

import express from "express";
import InsuranceSubscriber from "../controllers/insurance/subscriber/subscriber.js";
import validate from "../controllers/insurance/subscriber/subscriber.validate";
import { verifyToken } from "../helpers/verifyToken";
import { handleResponse } from "../helpers/transmission";
const insuranceRoute = express.Router();

// insuranceRoute.use(verifyToken);

const uploadFileToLocalStorage = (req, res, next) => {
    if (!req.files) {
        return handleResponse(req, res, 200, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const file = req.files.csv_file;
    // if (file.mimetype !== "text/csv") {
    //     return handleResponse(req, res, 200, {

    //         status: false,
    //         body: null,
    //         message: "Only .csv mime type allowed!",
    //         errorCode: "INTERNAL_SERVER_ERROR",
    //     })
    // }
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Only excel file allowed!",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const filename = file.name.split('.')[0] + '-' + Date.now() + '.xlsx';
    req.filename = filename;
    const path = `./uploads/${filename}`

    file.mv(path, (err) => {
        if (err) {
            return handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Something went wrong while uploading file",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
        next()
    });
}
insuranceRoute.post("/get-subscriber-plan-details", InsuranceSubscriber.getSubscribersPlanDetail);
insuranceRoute.post("/update-subscriber-plan-validity", InsuranceSubscriber.updateSubscriberPlanValidity);
insuranceRoute.post("/get-subscriber-plan-history", InsuranceSubscriber.getSubscribersHealthPlanHistory);
insuranceRoute.post("/add-subscriber-plan-history", InsuranceSubscriber.addSubscribersHealthPlanHistory);
insuranceRoute.get("/get-primaryWithItsSecondary-subscribers", InsuranceSubscriber.viewPrimarySubscriberWithItsSecondary);

insuranceRoute.post("/add-primary-subscriber", InsuranceSubscriber.addPrimarySubscriber);
insuranceRoute.post("/add-secondary-subscriber", InsuranceSubscriber.addSecondarySubscriber);
insuranceRoute.post("/delete-subscriber", InsuranceSubscriber.deleteSubscriber);
insuranceRoute.post("/update-subscriber", InsuranceSubscriber.updateSubscriber);
insuranceRoute.get("/list-subscriber", InsuranceSubscriber.listSubscriber);
insuranceRoute.get("/all-subscribers", InsuranceSubscriber.allSubscriber);
insuranceRoute.get("/list-subscriber-type", InsuranceSubscriber.listSubscriberType);
insuranceRoute.get("/view-subscriber", validate.viewSubscriber, InsuranceSubscriber.viewSubscriber);
insuranceRoute.post("/active_deactive-subscriber", InsuranceSubscriber.activeORdeactivte_Subscriber);


insuranceRoute.post("/view-subscribers-detail",InsuranceSubscriber.viewSubscriberDetailsWithItsSecondary);

insuranceRoute.get("/get-subscriber-details-for-claim", validate.viewSubscriber, InsuranceSubscriber.getSubscriberDetailsForClaim);
insuranceRoute.post("/upload-subscribers-csv", uploadFileToLocalStorage, InsuranceSubscriber.uploadSubscriberFromCSV);
insuranceRoute.post("/upload-file", InsuranceSubscriber.readAndUploadFile);
insuranceRoute.post("/subscriber-by-insurance", InsuranceSubscriber.getSubscriberInsurance);
insuranceRoute.post("/check-subscription-expiry", InsuranceSubscriber.checkSubscriptionExpiry);
insuranceRoute.get("/verify-insurance-details", InsuranceSubscriber.verifyInsuranceDetails);
insuranceRoute.get("/get-plan-service-by-subscriber", InsuranceSubscriber.getPlanServiceBySubscriber);
insuranceRoute.get("/list-all-type-of-subscriber", InsuranceSubscriber.listAllTypeOFSubscriber
);
insuranceRoute.get("/subscriber-details", InsuranceSubscriber.subscriberDetails);
insuranceRoute.post("/list-all-type-of-subscriberbyid", InsuranceSubscriber.listAllTypeOFSubscriberbyid);

insuranceRoute.get('/subscriber-list-export-insurance', InsuranceSubscriber.insuranceSubscriberListforexport)

insuranceRoute.get('/subscriber-list-export-insurance-superadmin', InsuranceSubscriber.insuranceSubscriberListforexportSuperadmin)


insuranceRoute.get("/allSubscriberCountByinsuranceId", InsuranceSubscriber.allSubscriberCountByinsuranceId);

export default insuranceRoute;