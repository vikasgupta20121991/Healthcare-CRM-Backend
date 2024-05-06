"use strict";

import express from "express";
const fs = require("fs");

import {
    listMedicineWithoutPaginationForDoctor, addMedicine, listMedicine, editMedicine, deleteMedicine, uploadCSVForMedicine, allSubscriptionPlans,
    approveInsuranceAdmin, createSubscriptionPlan, deleteSubscriptionPlan, editSubscriptionPlan, forgotPassword, getInsuranceAdminApprovedList, getInsuranceAdminNotApprovedList, getPeriodicList, getServiceField, getSubscriptionPlanDetails, login, matchEmailOtpFor2fa,

     matchSmsOtpFor2fa, resetForgotPassword, sendEmailOtpFor2fa, sendSmsOtpFor2fa, setMaximumRequest, listMedicineWithoutPagination,
     fetchedMedicineByID, getLocationName, refreshToken, getMaximumRequest, getSelectedMasterData, addOrUpdateAppointmentCommission, getAppointmentCommission,listMedicineforexport,
     getallplanPriceforSuperAdmin,gettotalMonthWiseforSuperAdmingraph,getlistofmanualmedicinClaim,addmanualMedicinClaim,
      deletemanualmedicinClaim,getviewofmanualmedicinClaim,getallPaymentHistory,sendInvitation, getAllInvitation, getInvitationById,changePassword, deleteInvitation, updatelogsData, getAllLogs, getSuperAdminData, notification} from "../controllers/superadmin/superadminController";


import { verifyToken } from "../helpers/verifyToken";
import AssociationGroupController from "../controllers/superadmin/associationGroupController"
import StaffManagementController from "../controllers/superadmin/staffManagementController"
import { createdChat, getCreatedChats, sendMessage, allMessage, createGroupChat, saveNotification, getNotification, markAllReadNotification, updateNotification, clearAllmessages, markReadNotificationByID, addMembersToGroupChat, updateOnlineStatus, updateSocketId, clearSinglemessages } from "../controllers/Chat-Controller/Chat";
// import LabMasterController from "../../hospital/controllers/masterController"
import { handleResponse } from "../helpers/transmission";
import { addNotification, deleteNotification, getNotificationById, getNotificationList } from "../controllers/Notification-management/notification-management";
const path = require('path');

const superadminRoute = express.Router();

const uploadFileToLocalStorage = async (req, res, next) => {
    if (!req.files) {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const file = req.files.medicine_csv;

    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Only excel allowed!",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }

    const filename = file.name.split('.')[0] + '-' + Date.now() + '.xlsx';
    req.filename = filename;
    const newPath = `${__dirname.replace('routes', 'uploads')}/${filename}`
    fs.writeFile(newPath, file.data, (err, data) => {
        if (err) {
            return handleResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Something went wrong while uploading file",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
        next()
    })
}

superadminRoute.post("/login", login);
superadminRoute.post("/forgot-password", forgotPassword);
superadminRoute.post("/change-password", changePassword);
superadminRoute.post("/reset-forgot-password", resetForgotPassword);
superadminRoute.post("/send-email-otp-for-2fa", sendEmailOtpFor2fa);
superadminRoute.post("/match-email-otp-for-2fa", matchEmailOtpFor2fa);
superadminRoute.post("/send-sms-otp-for-2fa", sendSmsOtpFor2fa);
superadminRoute.post("/match-sms-otp-for-2fa", matchSmsOtpFor2fa);
superadminRoute.post("/refresh-token", refreshToken);
superadminRoute.get("/get-all-association-group", AssociationGroupController.getAllAssociationGroup);
superadminRoute.get("/get-all-association-group-by-id", AssociationGroupController.getAllAssociationGroupByID);

superadminRoute.get("/list-medicine-without-pagination", listMedicineWithoutPagination);
superadminRoute.get("/list-medicine-without-pagination-for-doctor", listMedicineWithoutPaginationForDoctor);

superadminRoute.post('/get-selected-master-data', getSelectedMasterData) //Get selected master data
superadminRoute.get("/list-association-group", AssociationGroupController.listAssociationGroup);
superadminRoute.post('/update-socket-id', updateSocketId)

//update logs
superadminRoute.post("/update-logs", updatelogsData);
superadminRoute.get("/get-all-logs-by-userId", getAllLogs);

superadminRoute.get("/get-super-admin-data", getSuperAdminData);
superadminRoute.post('/notification',notification);

superadminRoute.use(verifyToken);

superadminRoute.put("/approve-insurance-admin", approveInsuranceAdmin);
superadminRoute.get("/get-insurance-admin-notapproved-list", getInsuranceAdminNotApprovedList);
superadminRoute.get("/get-insurance-admin-approved-list", getInsuranceAdminApprovedList);

superadminRoute.post("/addAssociationData", AssociationGroupController.addAssociationData);

//Subscription Plan
superadminRoute.get("/get-service-field", getServiceField);
superadminRoute.post("/create-subscription-plan", createSubscriptionPlan);
superadminRoute.get("/all-subscription-plans", allSubscriptionPlans);
superadminRoute.get("/get-subscription-plan-details", getSubscriptionPlanDetails);
superadminRoute.put("/update-subscription-plan", editSubscriptionPlan);
superadminRoute.post("/delete-subscription-plan", deleteSubscriptionPlan);
superadminRoute.get("/get-periodic-list", getPeriodicList);
superadminRoute.get('/getallplanPriceforSuperAdmin', getallplanPriceforSuperAdmin)
superadminRoute.get('/gettotalMonthWiseforSuperAdmingraph', gettotalMonthWiseforSuperAdmingraph)

//Association routes
superadminRoute.post("/create-association-group", AssociationGroupController.createAssociationGroup);
superadminRoute.get("/view-association-group", AssociationGroupController.viewAssociationGroup);
superadminRoute.post("/edit-association-group", AssociationGroupController.editAssociationGroup);
superadminRoute.post("/edit-pharmacy-association-group", AssociationGroupController.editPharmacyAssociationGroup);
superadminRoute.post("/delete-active-lock-association-group", AssociationGroupController.deleteActiveLockAssociationGroup);
//Added by Tanay
superadminRoute.get('/getlistofmanualmedicinClaim', getlistofmanualmedicinClaim)
superadminRoute.post('/addmanualMedicinClaim', addmanualMedicinClaim)
superadminRoute.put('/deletemanualmedicinClaim', deletemanualmedicinClaim)
superadminRoute.get('/getviewofmanualmedicinClaim', getviewofmanualmedicinClaim)
superadminRoute.get('/getallPaymentHistory', getallPaymentHistory)
//Medicine 
superadminRoute.post("/add-medicine", addMedicine);
superadminRoute.get("/list-medicine", listMedicine);
superadminRoute.post("/edit-medicine", editMedicine);
superadminRoute.post("/delete-medicine", deleteMedicine);
superadminRoute.post("/upload-csv-for-medicine", uploadFileToLocalStorage, uploadCSVForMedicine);
superadminRoute.post("/get-all-medicine-byits-id", fetchedMedicineByID);
superadminRoute.get("/list-medicine-export", listMedicineforexport);

//Set Maximum Request
superadminRoute.post("/set-maximum-request", setMaximumRequest);
superadminRoute.get("/get-maximum-request", getMaximumRequest);

//Staff Management
superadminRoute.post('/add-staff', StaffManagementController.addStaff)
superadminRoute.post('/edit-staff', StaffManagementController.editStaff)
superadminRoute.get("/list-staff", StaffManagementController.listStaff);
superadminRoute.get("/get-all-staff", StaffManagementController.getAllStaff); //Get all Staff without paginate
superadminRoute.get("/view-staff-details", StaffManagementController.viewStaff);
superadminRoute.post('/delete-active-lock-staff', StaffManagementController.deleteActiveLockStaff)
superadminRoute.get("/list-staff-forchat", StaffManagementController.listStaffforChat);

superadminRoute.post('/get-locations-name', getLocationName) //Get Location name from location ID
superadminRoute.post('/add-or-update-appointment-commission', addOrUpdateAppointmentCommission)
superadminRoute.get('/get-appointment-commission', getAppointmentCommission)


// chat route
superadminRoute.post('/create-chat', createdChat);
superadminRoute.get('/get-create-chat', getCreatedChats);
superadminRoute.post('/create-message', sendMessage);
superadminRoute.get('/all-message', allMessage);
superadminRoute.post('/create-group-chat', createGroupChat);
superadminRoute.post('/addmembers-to-groupchat', addMembersToGroupChat)


// notification
superadminRoute.post('/save-notification', saveNotification);
superadminRoute.get('/get-all-notification', getNotification);
superadminRoute.put('/mark-all-read-notification', markAllReadNotification)
superadminRoute.put('/mark-read-notification-id', markReadNotificationByID)
superadminRoute.post('/update-notification', updateNotification);

superadminRoute.put('/clear-all-messages', clearAllmessages)
superadminRoute.put('/clear-single-message', clearSinglemessages)
superadminRoute.post('/update-online-status', updateOnlineStatus)


// email invitation
superadminRoute.post("/send-email-invitation", sendInvitation);
superadminRoute.get("/get-email-invitation-list", getAllInvitation);
superadminRoute.get("/get-email-invitation-id", getInvitationById);
superadminRoute.post("/delete-email-invitation", deleteInvitation);

// notification management
superadminRoute.post("/add-notification", addNotification);
superadminRoute.get("/get-all-notification-list", getNotificationList);
superadminRoute.get("/get-notification-by-id", getNotificationById);
superadminRoute.put("/delete-notification", deleteNotification);


export default superadminRoute;
