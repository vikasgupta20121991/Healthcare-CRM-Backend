"use strict";
const multer = require('multer')();

import express from "express";
import { category, exclusion, plan } from "../controllers/insurance/healthplan";
import { user } from "../controllers/insurance/user";
import { add_role, all_role, delete_role, update_role } from "../controllers/roles/role"
import { handleResponse } from "../middleware/utils";
import { card } from '../controllers/insurance/card_Preview_master'

import {
    categoryServiceValiator,
    categoryValidator,
    categoryUserServiceValiator,
    deleteCategoryValidator,
    deleteCategoryServiceValidator,
    updateCategoryServiceValiator,
    listCategoryValiator,
    exclusionValidator,
    exclusionDataValiator,
    deleteExclusionValidator,
    deleteExclusionDataValidator,
    updateExclusionValiator,
    updateExclusionDataValiator,
    planServiceValidator,
    planExclusionValidator,
    planValiator,
    updatePlanServiceValidator,
    updatePlanValidator,
    updatePlanExclusionValidator,
    listPlanValidator,
    getPlanValidator,

    //insurancr user validator
    adminSignupValidator,
    companyProfileValidator,
    adminLoginValidator,
} from "../validator/insurance";
import { dataValidation } from "../helpers/transmission";
import fs from "fs"
import { addMembersToGroupChat, allMessage, clearAllmessages, clearSinglemessages, createdChat, createGroupChat, getCreatedChats, getNotification, markAllReadNotification, markReadNotificationByID, saveNotification, sendMessage, updateNotification, updateSocketId } from "../controllers/Chat-Controller/Chat";
import { updateOnlineStatus } from "../../insurance/controllers/Chat-Controller/Chat";
const insurance = express.Router();

const uploadFileToLocalStorage = async (req, res, next) => {
    if (!req.files) {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    // console.log(req.files.file, "fileData");
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

const uploadImage = async (req, res, next) => {
    const file = req.files.file;

    const filename = file.name.split('.')[0] + '-' + Date.now() + '.jpg';
    req.filename = filename;
    // console.log(filename, "filename");
    const newPath = `${__dirname.replace('routes', 'uploadEsignature')}/${filename}`
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
    // file.mv(newPath);
    // next()
}

insurance.post('/update-socket-id', updateSocketId)

//Card

insurance.get(
    "/get-CategoryServiceFor-card",
    card.getCategoryServiceForCard
);

insurance.get(
    "/get-cardPreview-template",
    card.getCardPreviewTemplates
);

insurance.post(
    "/add-cardPreview-template",
    dataValidation,
    card.addCardPreviewTemplate
);

insurance.post(
    "/add-card",
    dataValidation,
    card.addCardFilds
);

insurance.get(
    "/get-card-fields",
    dataValidation,
    card.getCardFieldsBycompany
);

// category
insurance.post(
    "/add-category",
    // categoryValidator,
    dataValidation,
    category.addCategory
);
insurance.post(
    "/add-category-service",
    // categoryUserServiceValiator,
    dataValidation,
    category.addService
);
insurance.post(
    "/delete-category",
    deleteCategoryValidator,
    dataValidation,
    category.deleteCategory
);
insurance.post(
    "/delete-category-service",
    deleteCategoryServiceValidator,
    dataValidation,
    category.deleteCategoryService
);
insurance.put(
    "/update-category",
    categoryServiceValiator,
    dataValidation,
    category.updateCategory
);
insurance.put(
    "/update-category-service",
    updateCategoryServiceValiator,
    dataValidation,
    category.updateCategoryService
);
insurance.post(
    "/list-category",
    listCategoryValiator,
    // dataValidation,
    category.listCategory
);
insurance.post(
    "/list-category-service",
    listCategoryValiator,
    // dataValidation,
    category.listCategoryService
);

// exclusion
insurance.post(
    "/add-exclusion",
    exclusionValidator,
    dataValidation,
    exclusion.addExclusion
);
insurance.post(
    "/add-exclusion-details",
    exclusionDataValiator,
    dataValidation,
    exclusion.addDetails
);
insurance.post(
    "/delete-exclusion",
    deleteExclusionValidator,
    dataValidation,
    exclusion.deleteExclusion
);
insurance.post(
    "/delete-exclusion-data",
    deleteExclusionDataValidator,
    dataValidation,
    exclusion.deleteExclusionData
);
insurance.put(
    "/update-exclusion",
    updateExclusionValiator,
    dataValidation,
    exclusion.updateExclusion
);
insurance.put(
    "/update-exclusion-details",
    updateExclusionDataValiator,
    dataValidation,
    exclusion.updateExclusionDetails
);
insurance.post(
    "/list-exclusion",
    listCategoryValiator,
    // dataValidation,
    exclusion.listExclusion
);
insurance.post(
    "/list-exclusion-details",
    listCategoryValiator,
    // dataValidation,
    exclusion.listExclusionDetails
);

// plan
insurance.post(
    "/add-plan-service",
    // planServiceValidator,
    dataValidation,
    plan.addService
);
insurance.post(
    "/delete-plan-service",
    // planServiceValidator,
    dataValidation,
    plan.deletePlanService
);
insurance.post(
    "/add-plan-exclusion",
    planExclusionValidator,
    dataValidation,
    plan.addExclusion
);
insurance.post(
    "/delete-plan-exclusion",
    // planServiceValidator,
    dataValidation,
    plan.deletePlanExclusion
);
insurance.post("/add-plan", planValiator, dataValidation, plan.addPlan);
insurance.put(
    "/update-plan-service",
    updatePlanServiceValidator,
    dataValidation,
    plan.updateService
);
insurance.put(
    "/update-plan-exclusion",
    updatePlanExclusionValidator,
    dataValidation,
    plan.updateExclusion
);
insurance.put(
    "/update-plan",
    plan.updatePlan
);
insurance.post(
    "/list-plan",
    listCategoryValiator,
    dataValidation,
    plan.listPlanService
);
insurance.get("/get-all-health-plan", plan.getAllHealthPlan);
insurance.get(
    "/plan-details/:planId",
    getPlanValidator,
    dataValidation,
    plan.getPlan
);
insurance.post(
    "/list-plan-service",
    listPlanValidator,
    dataValidation,
    plan.listService
);
insurance.post(
    "/list-plan-exclusion",
    listPlanValidator,
    dataValidation,
    plan.listExclusion
);
insurance.get("/get-planserviceneByForUser", plan.getplanserviceneByForUser);
insurance.post('/healthplanDelete', plan.healthplanDelete)
//Insurance user
insurance.post(
    "/admin-signup",
    // adminSignupValidator,
    dataValidation,
    user.adminSignUp
);
insurance.post(
    "/admin-login",
    // adminLoginValidator,
    dataValidation,
    user.adminLogin
);
insurance.post(
    "/send-email-otp-for-2fa",
    dataValidation,
    user.sendEmailOtpFor2fa
);
insurance.post(
    "/match-email-otp-for-2fa",
    dataValidation,
    user.matchEmailOtpFor2fa
);
insurance.post("/send-sms-otp-for-2fa", dataValidation, user.sendSmsOtpFor2fa);
insurance.post(
    "/match-sms-otp-for-2fa",
    dataValidation,
    user.matchSmsOtpFor2fa
);
insurance.post(
    "/create-insurance-profile",
    // upload.single("companyLogo"),
    // companyProfileValidator,
    dataValidation,
    user.craeteInsuranceProfile
);
insurance.put(
    "/edit-insurance-profile",
    // upload.single("companyLogo"),
    // companyProfileValidator,    
    user.editInsuranceProfile
);

insurance.post(
    "/upload-document",
    user.uploadDocument
);

insurance.put(
    "/change-password",
    // companyProfileValidator,
    dataValidation,
    user.changePassword
);
insurance.get(
    "/get-insurance-admin-not-approved-list",
    dataValidation,
    user.getInsuranceAdminNotApprovedList
);
insurance.get(
    "/get-insurance-details",
    dataValidation,
    user.getInsuranceDetails
);
insurance.put(
    "/updatesuperadminpermission",
    dataValidation,
    user.updatesuperadminpermission
);
insurance.get(
    "/get-insurance-details-by-portal-id",
    dataValidation,
    user.getInsuranceDetailsByPortalId
);
insurance.put(
    "/approve-or-reject-insurance-admin",
    dataValidation,
    user.approveOrRejectInsuranceAdmin
);
insurance.get(
    "/get-insurance-admin-approved-list",
    dataValidation,
    user.getInsuranceAdminApprovedList
);
insurance.get(
    "/get-insurance-admin-approved-allowed-list",
    dataValidation,
    user.getInsuranceAdminAllowedApprovedList
);
insurance.get(
    "/get-insurance-admin-rejected-list",
    dataValidation,
    user.getInsuranceAdminRejectList
);
insurance.get(
    "/get-insurance-template-list",
    dataValidation,
    user.getInsuranceTemplateList
);
insurance.put(
    "/set-insurance-template",
    dataValidation,
    user.setInsuranceTemplate
);
insurance.get(
    "/get-insurance-template-details",
    dataValidation,
    user.getInsuranceTemplateDetails
);
insurance.post('/delete-active-insurance-admin', dataValidation, user.deleteActiveadmin)

insurance.get(
    "/get-insurance-admin-approved-list-superadmin",
    dataValidation,
    user.getInsuranceAdminApprovedListSuperadmin
);

insurance.get(
    "/get-insurance-admin-not-approved-list-superadmin",
    dataValidation,
    user.getInsuranceAdminNotApprovedListSuperadmin
);

insurance.get(
    "/get-insurance-admin-rejected-list-superadmin",
    dataValidation,
    user.getInsuranceAdminRejectListSuperadmin
);

insurance.get(
    "/get-insurance-count-superadmin-dashboard",
    dataValidation,
    user.totalInsuranceforAdminDashboard
);

insurance.get(
    "/get-claim-count-superadmin-dashboard",
    dataValidation,
    user.claimCountSuperadminDashboard
);

insurance.get("/subscriber-list-by-first-last-name-dob-mobile", user.subscriberListByPolicyIdAndInsuranceId);
insurance.post("/post-subscriber-list-by-first-last-name-dob-mobile", user.subscriberListByPolicyIdAndInsuranceIdPost);


insurance.get("/list-category-and-category-services", category.listCategoryAndCategoryServices);
insurance.get("/list-exclusion-and-category-exclusion", exclusion.listExclusionAndCategoryExclusion);

//Assign Plan Master to Insurance
insurance.post("/insurance-assign-plan", user.insuranceAssignPlan);
insurance.post("/insurance-assign-categories", user.insuranceAssignCategories);
insurance.post("/insurance-assign-category-service", user.insuranceAssignCategoryService);
insurance.post("/insurance-assign-exclusion", user.insuranceAssignExclusion);
insurance.post("/insurance-assign-exclusion-data", user.insuranceAssignExclusionData);

insurance.post("/forgot-password", user.forgotPassword);
insurance.post("/reset-forgot-password", user.resetForgotPassword);

//staff
insurance.post("/add-staff", user.addStaff);
insurance.put("/edit-staff", user.editStaff);
insurance.get("/get-all-insurance-staff", user.getAllInsuranceStaff);
insurance.get("/get-all-insurance-staff-for-staffmanagement", user.getAllInsuranceStaffforStaffmanagement);
insurance.get("/get-all-staff", user.getAllStaff); //Get all Staff without paginate
insurance.get("/get-staff-details", user.getStaffDetails)
insurance.post("/delete-active-and-lock-staff", dataValidation, user.actionForStaff);
insurance.post("/medicine-claim-next-insurance-staff-list", user.medicineClaimNextInsuranceStaffList);


insurance.post("/add-staff-role", dataValidation, add_role);
insurance.get("/all-staff-role", dataValidation, all_role);
insurance.post("/update-staff-role", dataValidation, update_role);
insurance.post("/delete-staff-role", dataValidation, delete_role);

// claims
insurance.post("/mange-claim-content-add-field", dataValidation, user.mangeClaimContentAddField);
insurance.get("/get-mange-claim-content-field", dataValidation, user.getMangeClaimContentField);
insurance.post("/mange-claim-content", dataValidation, user.mangeClaimContent);
insurance.post("/get-assign-claim-content-primary", dataValidation, user.getAssignClaimContentPrimary);
insurance.post("/get-assign-claim-content-secondary", dataValidation, user.getAssignClaimContentSecondary);
insurance.post("/get-assign-claim-content-accident", dataValidation, user.getAssignClaimContentAccident);
insurance.post("/medicine-claim-check-valid", dataValidation, user.medicineClaimCheckValid);
insurance.get("/get-subscriber-details-for-claim", dataValidation, user.getSubscriberDetailsForClaim);
insurance.post('/add-claim-esignature', uploadImage, user.addClaimEsignature);
//Healthcare Network
insurance.post("/add-healthcare-network", user.addHealthcareNetwork);
insurance.post("/import-healthcare-network", uploadFileToLocalStorage, user.importHealthcareNetwork);
insurance.get("/healthcare-network-list", user.listHealthcareNetwork);
insurance.get('/export-healthcare-network-list', user.listHealthcareNetworkforexport)
insurance.post("/edit-healthcare-network", user.editHealthcareNetwork);
insurance.post("/delete-healthcare-network", user.deleteHealthcareNetwork);
insurance.get("/export-healthcare-network", user.exportHealthcareNetwork);
insurance.get("/accepted-insurance-companies", user.acceptedInsuranceCompanies);
insurance.get("/get-Insurance-By-Id", user.getInsuranceById);

// made by Tanay
insurance.post("/add-portaltypeandinsuranceId", user.portaltypeandinsuranceId);
insurance.get("/get-portaltypeandinsuranceId", user.getportaltypeandinsuranceId);



insurance.post("/viewRes", user.viewRes);

insurance.get("/get-user-list-for-chat", user.getAllChatUser);

// chat route
insurance.post('/create-chat', createdChat);
insurance.get('/get-create-chat', getCreatedChats);
insurance.post('/create-message', sendMessage);
insurance.get('/all-message', allMessage);
insurance.post('/create-group-chat', createGroupChat);
insurance.post('/addmembers-to-groupchat', addMembersToGroupChat)


// notification
insurance.post('/save-notification', saveNotification);
insurance.get('/get-all-notification', getNotification);
insurance.put('/mark-all-read-notification', markAllReadNotification)
insurance.put('/mark-read-notification-id', markReadNotificationByID)
insurance.post('/update-notification', updateNotification);

insurance.put('/clear-all-messages', clearAllmessages)
insurance.put('/clear-single-message', clearSinglemessages)

insurance.post('/update-online-status',updateOnlineStatus)

insurance.post(
    "/save-superadmin-notification",dataValidation,
    user.saveSuperadminNotification
);
insurance.post("/update-notification-status",user.updateNotificationStatus);
insurance.get(
    "/get-Inusrance-AdminData-By-Id",
    card.getInusranceAdminDataById
);

//update logs
insurance.post("/update-logs",user.updatelogsData)
insurance.get("/get-all-logs-by-userId" , user.getAllLogs)
export default insurance;
