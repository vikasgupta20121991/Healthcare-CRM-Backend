"use strict";

import express from "express";
const { patient } = require("../controllers/patient");
const patientRoute = express.Router();
const fs = require('fs');

import { verifyToken } from "../helpers/verifyToken"
const uploadFileToLocalStorage = async (req, res, next) => {
    if (!req.files) {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    console.log(req.files.file, "fileData");
    const file = req.files.file;
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
    const newPath = `${__dirname.replace('routes', 'uploads')}/${filename}`
    console.log(newPath, 'newPath');
    console.log(file.data, 'file.data');
    fs.writeFile(newPath, file.data, (err, data) => {
        if (err) {
            console.log(err, 'err');
            return handleResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Something went wrong while uploading file",
                errorCode: "INTERNAL_SERVER_ERROR ",
            })
        }
        next()
    })
}
patientRoute.post("/signup", patient.signup);
patientRoute.post("/login", patient.login);



patientRoute.post("/get-signed-url", patient.getDocument);



patientRoute.post("/send-email-otp-for-2fa", patient.sendEmailOtpFor2fa);
patientRoute.post("/match-email-otp-for-2fa", patient.matchEmailOtpFor2fa);
patientRoute.post("/send-sms-otp-for-2fa", patient.sendSmsOtpFor2fa);
patientRoute.post("/match-sms-otp-for-2fa", patient.matchSmsOtpFor2fa);

patientRoute.get("/static-immunization-list", patient.staticImmunizationList);
patientRoute.get("/static-allergies-list", patient.staticAllergiesList);
patientRoute.get("/static-patient-history-type-list", patient.staticPatientHistoryTypeList);
patientRoute.get("/static-patient-lifestyle-type-list", patient.staticPatientLifestyleTypeList);
patientRoute.get("/static-family-history-type-list", patient.staticFamilyHistoryTypeList);
patientRoute.get("/allergy-reaction-list", patient.allergyReactionList);


patientRoute.post("/create-profile/personal-details", patient.personalDetails);
patientRoute.post("/patient-add-by-doctor", patient.patientAddByDoctor);
patientRoute.post("/create-profile/insurance-details", patient.insuranceDetails);
patientRoute.post("/create-profile/add-vitals", patient.addVitals);
patientRoute.post("/create-profile/medicine-details", patient.medicineDetails);
patientRoute.post("/create-profile/immunization-details", patient.immunizationDetails);
patientRoute.post("/edit-immunization", patient.editImmunization);
patientRoute.post("/delete-Immunization", patient.deleteImmunization);

patientRoute.post("/create-profile/history-details", patient.historyDetails);
patientRoute.post("/create-profile/medical-document", patient.medicalDocument);
patientRoute.post("/create-profile/family-details", patient.familyDetails);
patientRoute.post("/upload-document", patient.uploadDocument);
patientRoute.post("/change-password", patient.changePassword);
patientRoute.post("/forgot-password", patient.forgotPassword);
patientRoute.post("/reset-forgot-password", patient.resetForgotPassword);
patientRoute.get("/common-api", patient.commonAPI);
patientRoute.get("/get-payment-details", patient.getPaymentDetails);
patientRoute.get("/get-all-patient", patient.getAllPatient);
patientRoute.get("/get-all-patient-added-by-doctor", patient.getAllPatientAddedByDoctor);
patientRoute.get("/getAllPatientForSuperAdmin", patient.getAllPatientForSuperAdmin);// Added by Tanay
patientRoute.get("/subscribers-list-for-patient", patient.subscribersListForPatient);
patientRoute.post("/patient-action", patient.patientAction);
patientRoute.post("/delete-patient-docs", patient.deletePatientDocs);
patientRoute.get("/getAllPatienthaving-fcm-Token", patient.getPatienthavingFCMtoken);
patientRoute.post("/save-superadmin-notification", patient.saveSuperadminNotification);

patientRoute.get("/patient-details", patient.patientFullDetails);
patientRoute.get("/patient-personal-details", patient.patientPersonalDetails);
patientRoute.get("/profile-details", patient.profileDetails);
patientRoute.get("/patient-existing-docs", patient.patientExistingDocs);
patientRoute.get("/patient-common-details", patient.patientCommonDetails); //using for appointment(Full-name,Mobile,Email,InsuranceNumber)
patientRoute.post("/get-patient-details-by-id", patient.getPatientDetailsById)
patientRoute.post("/get-patient-details-basedon-request", patient.getPatientDetailsBasedOnRequest) //Return data based on request (like GraphQL)
patientRoute.post("/get-patient-documents-by-ids", patient.getPatientDocumentsById);
patientRoute.post('/notification', patient.notification);
patientRoute.get("/patient-medical-details-by-subscriberId-for-claim-details", patient.patientMedicalDetailsBySubscriberIdForClaimDetails);
patientRoute.get("/get-patient-profile-signed-url", patient.patientProfileSignedUrl);
patientRoute.get("/patient-dependent-family-members", patient.getDependentFamilyMembers);


//Roles and permissions
patientRoute.post('/set-profile-permission', patient.setProfilePermission);
patientRoute.get('/get-profile-permission', patient.getProfilePermission);

//Waiting Room
patientRoute.post("/add-medicine-on-waiting-room", patient.addMedicineOnWaitingRoom);
patientRoute.post("/edit-medicine-on-waiting-room", patient.editMedicineOnWaitingRoom);

//get all rating and reviews given by patient
patientRoute.get("/all-rating-reviews-by-patient", patient.getAllRatingReviewByGivenByPatient);
patientRoute.get("/get-plan-purchased-by-patient", patient.getPurchasedPlanByPatient);
patientRoute.get("/search-any-portaluser-by-search-keyword", patient.SearchAnyPortaluserBySearchKeyword);


patientRoute.get("/get-vitals", patient.vitalsList);

// email invitation
patientRoute.post("/send-email-invitation", patient.sendInvitation);
patientRoute.get("/get-email-invitation-list", patient.getAllInvitation);
patientRoute.get("/get-email-invitation-id", patient.getInvitationById);
patientRoute.post("/delete-email-invitation", patient.deleteInvitation);

patientRoute.get('/get-all-notification',  patient.getNotification);
patientRoute.put('/mark-all-read-notification',  patient.markAllReadNotification)
patientRoute.put('/mark-read-notification-id',  patient.markReadNotificationByID)
patientRoute.post('/update-notification',  patient.updateNotification);

patientRoute.post("/update-notification-status",patient.updateNotificationStatus);
patientRoute.get("/get-portal-data",patient.getPortalData)
patientRoute.get("/get-profile-info-data",patient.getProfileInfoData)
// patientRoute.use(verifyToken);





// Immunization in superadmin master

patientRoute.post("/add-immunization", patient.addImmunization_SuperAdmin);
patientRoute.get("/list-immunizationlist", patient.allImmunizationList);
patientRoute.put('/update-immunization', patient.updateImmunization)
patientRoute.post('/delete-immunizationstatus', patient.actionOnImmunization)
patientRoute.get('/exportsheetlist-immunization', patient.allImmunizationListforexport)
patientRoute.post('/upload-csv-for-immunization-list', uploadFileToLocalStorage, patient.uploadCSVForImmunization)
patientRoute.get('/get-id-by-immunization', patient.getIDbyImmunization)
patientRoute.get('/get-QRcode-Scan-Data', patient.getQRcodeScanData)



export default patientRoute;
