"use strict";

import express from "express";
import { deleteInvitation, getAllInvitation, getInvitationById, sendInvitation } from "../controllers/email_invitation";
import labimagingdentalopticalRouteRole from "../controllers/roles/role";
import labimagingdentalopticalRouteStaff from "../controllers/staffmanagement";
import labimagingdentalopticalTemplate from "../controllers/templatebuilder";
import orderFlow from "../controllers/order-price-availibity-request";
import AppointmentController, { portal_viewAppointmentByRoomName, updateUnreadMessage, viewAppointmentByRoomName, viewAppointmentCheck } from '../controllers/appointment';
const fourportalappointment = new AppointmentController();

import portal_ePrescription from '../controllers/eprescription';
import { verifyToken } from "../helpers/verifyToken"

import { activeLockDeleteLabImagingDentalOptical, approveOrRejectLabImagingDentalOptical, getLabImagingDentalOpticalList, getLaboratoryList, labImagingDentalOpticalViewBasicInfo } from "../controllers/superadminmanagement";
const { labimagingdentaloptical } = require("../controllers/labimagingdentaloptical");
const { advFilterslabimagingdentaloptical } = require('../controllers/homepage-filter-list/advance_filters')
import { handleResponse } from "../middleware/utils";
import fs from "fs"
import { addMembersToGroupChat, allMessage, clearAllmessages, clearSinglemessages, createdChat, createGroupChat, getAllUsersForChat, getCreatedChats, getNotification, markAllReadNotification, markReadNotificationByID, saveNotification, sendMessage, updateNotification, updateOnlineStatus } from "../controllers/Chat";
const labimagingdentalopticalRoute = express.Router();

const uploadImage = async (req, res, next) => {
    const file = req.files.file;
    console.log("req.files.file-----", req.files.file);
    const filename = file.name.split('.')[0] + '-' + Date.now() + '.jpg';
    req.filename = filename;
    console.log(filename, "filename");
    const newPath = `${__dirname.replace('routes', 'uploadEsignature')}/${filename}`
    file.mv(newPath);
    next()
}

const uploadFileToLocalStorage = async (req, res, next) => {

    // console.log(req, "fileDataaaaa_____",req.files);


    if (!req.files) {
        console.log("insidee_____");
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
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
            console.log(err, 'errrrr_________');
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

// login
labimagingdentalopticalRoute.post("/sign-up", labimagingdentaloptical.signUp);
labimagingdentalopticalRoute.post("/login", labimagingdentaloptical.login);
labimagingdentalopticalRoute.post("/send-sms-otp-for-2fa", labimagingdentaloptical.sendSmsOtpFor2fa);
labimagingdentalopticalRoute.post("/send-email-otp-for-2fa", labimagingdentaloptical.sendEmailOtpFor2fa);
labimagingdentalopticalRoute.post("/match-otp-SMS-for-2fa", labimagingdentaloptical.matchOtpFor2fa);
labimagingdentalopticalRoute.post("/match-Otp-Email-For-2-fa", labimagingdentaloptical.matchEmailOtpFor2fa);
labimagingdentalopticalRoute.post("/forgot-password", labimagingdentaloptical.forgotPassword);
labimagingdentalopticalRoute.post("/reset-password", labimagingdentaloptical.resetForgotPassword);
labimagingdentalopticalRoute.post("/change-password", labimagingdentaloptical.changePassword);

// profile
labimagingdentalopticalRoute.post("/upload-document-for-four-portal", labimagingdentaloptical.uploadDocumentForPortal); //Generic API for uplaod document and return objectId
labimagingdentalopticalRoute.post('/fourPortal-create-profile', labimagingdentaloptical.fourPortalCreateProfile);
labimagingdentalopticalRoute.get('/fourPortal-view-profile', labimagingdentaloptical.fourPortalViewProfile);
labimagingdentalopticalRoute.post("/delete-fourportal-pathology-tests", labimagingdentaloptical.deletePathologyTest)
labimagingdentalopticalRoute.get('/get-Idby-portaluser-name', labimagingdentaloptical.getIdbyPortalUserName);
labimagingdentalopticalRoute.get('/get-all-location-by-id', labimagingdentaloptical.getAllLocationById);


// Superadmin portal
labimagingdentalopticalRoute.get("/get-four-portal-superadmin-list", getLabImagingDentalOpticalList);
labimagingdentalopticalRoute.post('/approve-or-reject-labimagingdentaloptical', approveOrRejectLabImagingDentalOptical);
labimagingdentalopticalRoute.post('/active-lock-delete-labimagingdentaloptical', activeLockDeleteLabImagingDentalOptical);
labimagingdentalopticalRoute.get('/view-doctor-profile-labimagingdentaloptical', labImagingDentalOpticalViewBasicInfo);

// email invitation
labimagingdentalopticalRoute.post("/send-email-invitation", sendInvitation);
labimagingdentalopticalRoute.get("/get-email-invitation-list", getAllInvitation);
labimagingdentalopticalRoute.get("/get-email-invitation-id", getInvitationById);
labimagingdentalopticalRoute.post('/delete-email-invitation', deleteInvitation);

//hospital management
labimagingdentalopticalRoute.get('/four-portal-management-request-list', labimagingdentaloptical.fourportalManagementRequestList);
labimagingdentalopticalRoute.get('/four-portal-all-management-list', labimagingdentaloptical.fourPortalAllManagementList);
labimagingdentalopticalRoute.post('/four-portal-management-educational-details', labimagingdentaloptical.fourportalManagementEducationalDetails);
labimagingdentalopticalRoute.post('/four-portal-management-hospital-location', labimagingdentaloptical.fourportalManagementHospitalLocation);
labimagingdentalopticalRoute.post('/four-portal-management-availability', labimagingdentaloptical.forPortalManagementAvailability);
labimagingdentalopticalRoute.get('/four-portal-management-get-locations', labimagingdentaloptical.fourPortalManagementGetLocations);
labimagingdentalopticalRoute.post('/four-portal-management-fee-management', labimagingdentaloptical.fourPortalManagementFeeManagement);
labimagingdentalopticalRoute.post('/four-portal-management-document-management', labimagingdentaloptical.fourPortalManagementDocumentManagement);
labimagingdentalopticalRoute.post('/four-portal-management-accept-or-reject', labimagingdentaloptical.acceptOrRejectFourPortalRequest);
labimagingdentalopticalRoute.post('/delete-availabilty-by-deleting-location', labimagingdentaloptical.deleteAvailability);

// role
labimagingdentalopticalRoute.post("/add-role", labimagingdentalopticalRouteRole.add_role);
labimagingdentalopticalRoute.get("/all-role", labimagingdentalopticalRouteRole.all_role);
labimagingdentalopticalRoute.post("/update-role", labimagingdentalopticalRouteRole.update_role);
labimagingdentalopticalRoute.post("/delete-role", labimagingdentalopticalRouteRole.delete_role);
labimagingdentalopticalRoute.post('/four-portal-management-appointmentReasons', labimagingdentaloptical.addAppointmentReason);
labimagingdentalopticalRoute.get('/four-portal-management-getAppointmentReasons', labimagingdentaloptical.reasonForAppointmentList);
labimagingdentalopticalRoute.post('/four-portal-management-updateAppointmentReasons', labimagingdentaloptical.updateReasonForAppointment);
labimagingdentalopticalRoute.post('/four-portal-management-updateAppointmentReasonsStatus', labimagingdentaloptical.actionOnReasonForAppointment);
labimagingdentalopticalRoute.post("/four-portal-management-bulkImportAppointmentReasons", uploadFileToLocalStorage, labimagingdentaloptical.bulkUploadAppointmentReason);
labimagingdentalopticalRoute.post("/four-portal-management-addQuestionnaire", labimagingdentaloptical.addQuestionnaire);
labimagingdentalopticalRoute.get("/four-portal-management-getQuestionnaires", labimagingdentaloptical.QuestionnaireList);
labimagingdentalopticalRoute.get("/four-portal-management-getQuestionnaireDetail", labimagingdentaloptical.QuestionnaireDetails);
labimagingdentalopticalRoute.post("/four-portal-management-updateQuestionnaire", labimagingdentaloptical.updateQuestionnaire);
labimagingdentalopticalRoute.post("/four-portal-management-deleteQuestionnaire", labimagingdentaloptical.actionOnQuestionnaire);

labimagingdentalopticalRoute.post('/add-accepted-insurance', labimagingdentaloptical.addAcceptedInsurance);
labimagingdentalopticalRoute.get("/listCategoryStaff", labimagingdentaloptical.listCategoryStaff);

//Advance Filter
labimagingdentalopticalRoute.post("/four-portal-management-advFilters", advFilterslabimagingdentaloptical.advanceFourPortalFilters);
labimagingdentalopticalRoute.get("/four-portal-management-detail", advFilterslabimagingdentaloptical.viewFourPortalDetailsForPatient);
labimagingdentalopticalRoute.post("/four-portal-management-available-slots", advFilterslabimagingdentaloptical.portalAvailableSlot);
labimagingdentalopticalRoute.get('/getInsuranceAcceptedListForFourPortal', advFilterslabimagingdentaloptical.getInsuranceAcceptedListForFourPortal);
labimagingdentalopticalRoute.post('/four-portal-management-addReviews', advFilterslabimagingdentaloptical.postReviewAndRating);
labimagingdentalopticalRoute.get('/four-portal-management-getReviews', advFilterslabimagingdentaloptical.getReviewAndRating);
labimagingdentalopticalRoute.post('/delete-review-and-rating-fourportal', advFilterslabimagingdentaloptical.deleteReviewAndRating);


// //Staff
labimagingdentalopticalRoute.post("/add-staff", labimagingdentalopticalRouteStaff.addStaff);
labimagingdentalopticalRoute.post("/edit-staff", labimagingdentalopticalRouteStaff.editStaff);
labimagingdentalopticalRoute.get("/get-all-staff", labimagingdentalopticalRouteStaff.getAllStaff);
labimagingdentalopticalRoute.get("/get-all-staff-without-pagination", labimagingdentalopticalRouteStaff.getAllStaffWithoutPagination);
labimagingdentalopticalRoute.get("/get-staff-details", labimagingdentalopticalRouteStaff.getStaffDetails)
labimagingdentalopticalRoute.post("/delete-active-and-lock-staff", labimagingdentalopticalRouteStaff.actionForStaff);

//Template Builder
labimagingdentalopticalRoute.post('/add-template', labimagingdentalopticalTemplate.addTemplate);
labimagingdentalopticalRoute.get('/template-list', labimagingdentalopticalTemplate.templateList);
labimagingdentalopticalRoute.get('/template-details', labimagingdentalopticalTemplate.templateDetails);
labimagingdentalopticalRoute.post('/template-delete', labimagingdentalopticalTemplate.templateDelete);

// orderFLow
labimagingdentalopticalRoute.post('/add-new-lab-order', orderFlow.newOrder);
labimagingdentalopticalRoute.post("/four-portal-order-list", orderFlow.listOrder);
labimagingdentalopticalRoute.get("/four-portal-totalOrderCount", orderFlow.totalOrderCount);
labimagingdentalopticalRoute.post("/four-portal-fetchOrderDetails", orderFlow.fetchOrderDetails);
labimagingdentalopticalRoute.post("/four-portal-verify-insurance-for-order", orderFlow.verifyInsuranceForOrder);
labimagingdentalopticalRoute.post("/four-portal-updateOrderComplete", orderFlow.updateOrderComplete);
labimagingdentalopticalRoute.put("/four-portal-update-order-details", orderFlow.updateOrderDetails);
labimagingdentalopticalRoute.post("/four-portal-cancel-order", orderFlow.cancelOrder);
labimagingdentalopticalRoute.post("/four-portal-confirm-order", orderFlow.confirmOrder);
labimagingdentalopticalRoute.post("/four-portal-update-schedule-order", orderFlow.updateConfirmScheduleorder);
labimagingdentalopticalRoute.post("/four-portal-save-pdf-data", orderFlow.fourPortalSavePdf);
labimagingdentalopticalRoute.post('/edit-new-lab-name-superadmin', orderFlow.editImagingName);


// Chat
labimagingdentalopticalRoute.get('/get-all-chat-user', getAllUsersForChat);

// chat route
labimagingdentalopticalRoute.post('/create-chat', createdChat);
labimagingdentalopticalRoute.get('/get-create-chat', getCreatedChats);
labimagingdentalopticalRoute.post('/create-message', sendMessage);
labimagingdentalopticalRoute.get('/all-message', allMessage);
labimagingdentalopticalRoute.post('/create-group-chat', createGroupChat);
labimagingdentalopticalRoute.post('/addmembers-to-groupchat', addMembersToGroupChat)


// notification
labimagingdentalopticalRoute.post('/save-notification', saveNotification);
labimagingdentalopticalRoute.get('/get-all-notification', getNotification);
labimagingdentalopticalRoute.put('/mark-all-read-notification', markAllReadNotification)
labimagingdentalopticalRoute.put('/mark-read-notification-id', markReadNotificationByID)
labimagingdentalopticalRoute.post('/update-notification', updateNotification);

labimagingdentalopticalRoute.put('/clear-all-messages', clearAllmessages)
labimagingdentalopticalRoute.post('/update-online-status', updateOnlineStatus)
labimagingdentalopticalRoute.put('/clear-single-message', clearSinglemessages)

labimagingdentalopticalRoute.get('/get-portaluser-data', labimagingdentaloptical.getPortalUserData);
labimagingdentalopticalRoute.get('/get-fourportal-basicinfo-data', labimagingdentaloptical.getBasicInfoData);
labimagingdentalopticalRoute.get('/get-fourportal-list-forchat-hosp', labimagingdentaloptical.fourPortalHospitalListforChat);

labimagingdentalopticalRoute.get('/four-portal_totalTests_allAppTypes', labimagingdentaloptical.totalTestsOfAllAppointmentTypes);
labimagingdentalopticalRoute.get('/four-portal_totalTests_ForLineChart', labimagingdentaloptical.totalTestsOfAllAppntForLineChart);
labimagingdentalopticalRoute.get('/four-portal_totalClaims_ForGraph', labimagingdentaloptical.totalClaimReportedOfAppmnts);

//appointment
labimagingdentalopticalRoute.post("/four-portal-appointment", fourportalappointment.portalAppointment);
labimagingdentalopticalRoute.get("/four-portal-view-Appointment", fourportalappointment.portal_viewAppointment);
labimagingdentalopticalRoute.post("/four-portal-update-Appointment", fourportalappointment.portal_updateAppointmentPaymentStatus);
labimagingdentalopticalRoute.get("/four-portal-list-Appointment", fourportalappointment.portal_listAppointment);
labimagingdentalopticalRoute.post('/four-portal-cancel-and-approve-appointment', fourportalappointment.portal_cancelAppointment);
labimagingdentalopticalRoute.get('/four-portal_appointment-details', fourportalappointment.portal_appointmentDetails);

labimagingdentalopticalRoute.get('/appointmentList_for_patient', fourportalappointment.appointmentList_for_patient);
labimagingdentalopticalRoute.post('/four-portal-assign-healthcare-provider', fourportalappointment.portal_assignHealthcareProvider);
labimagingdentalopticalRoute.post('/four-portal-consulatation-data', fourportalappointment.portal_post_updateConsulatation);
labimagingdentalopticalRoute.get("/four-portal-next-available-slot", fourportalappointment.portal_nextAvailableSlot);
labimagingdentalopticalRoute.post("/four-portal-reschedule-appointment", fourportalappointment.portal_rescheduleAppointment);
labimagingdentalopticalRoute.post("/four-portal-set-reminder", fourportalappointment.portal_setReminder);
labimagingdentalopticalRoute.get("/four-portal-get-reminder", fourportalappointment.portal_getReminder);
labimagingdentalopticalRoute.post("/four-portal-add-and-edit-assessment", fourportalappointment.portal_addAssessment);
labimagingdentalopticalRoute.get("/four-portal-assessment-list", fourportalappointment.portal_assessmentList);
labimagingdentalopticalRoute.post("/four-portal-available-slots", fourportalappointment.fourPortalAvailableSlot);

labimagingdentalopticalRoute.get("/four-portal-to-hospital-payment-history", fourportalappointment.hospitalPaymentHistory);

/* videocalling */
labimagingdentalopticalRoute.get('/four-portal-view-appointment-by-roomname', portal_viewAppointmentByRoomName);


// revenue management
labimagingdentalopticalRoute.get('/four-portal-appointment-revenues-count', labimagingdentaloptical.totalAppointmentsCountRevenueOfFourPortal);
labimagingdentalopticalRoute.get('/four-portal-totalRevenue-monthwise-online', labimagingdentaloptical.getfourPortalTotalRevMonthWiseforOnline);
labimagingdentalopticalRoute.get('/four-portal-totalRevenue-monthwise-f2f', labimagingdentaloptical.getfourPortalTotalRevMonthWiseforF2F);
labimagingdentalopticalRoute.get('/four-portal-totalRevenue-all-appointment-type', labimagingdentaloptical.totalRevenuefourPortalAllAppointmentTypes);


//ePrescription

labimagingdentalopticalRoute.post('/four-portal-create-eprescription', portal_ePrescription.createEprescription);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription', portal_ePrescription.getEprescription);
labimagingdentalopticalRoute.get('/four-portal-recent-medicine-prescribed', portal_ePrescription.listRecentMedicinesPrescribed);
labimagingdentalopticalRoute.post('/four-portal-delete-eprescription-medicine', portal_ePrescription.deleteEprescriptionMedicineDosage);

labimagingdentalopticalRoute.post('/four-portal-add-eprescription-medicine', portal_ePrescription.addEprescriptionMedicineDosage);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-lab', portal_ePrescription.addEprescriptionLabTest);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-imaging', portal_ePrescription.addEprescriptionImagingTest);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-vaccination', portal_ePrescription.addEprescriptionVaccination);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-eyeglasses', portal_ePrescription.addEprescriptionEyeglass);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-others', portal_ePrescription.addEprescriptionOther);

labimagingdentalopticalRoute.get('/four-portal-get-eprescription-medicine', portal_ePrescription.getEprescriptionMedicineDosage);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-labTest', portal_ePrescription.getEprescriptionLabTest);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-imaging', portal_ePrescription.getEprescriptionImagingTest);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-vaccination', portal_ePrescription.getEprescriptionVaccinationTest);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-eyeglasses', portal_ePrescription.getEprescriptionEyeglassTest);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-others', portal_ePrescription.getEprescriptionOtherTest);

labimagingdentalopticalRoute.get('/four-portal-get-all-tests-eprescription', portal_ePrescription.getAllTests);
labimagingdentalopticalRoute.get('/four-portal-get-LocationInfo-ById', portal_ePrescription.getLocationInfoById);
labimagingdentalopticalRoute.get('/four-portal-get-eprescription-template-url', portal_ePrescription.getEprescriptionTemplateUrl);
labimagingdentalopticalRoute.post('/four-portal-add-eprescription-esignature', uploadImage, portal_ePrescription.addEprescriptionEsignature);
labimagingdentalopticalRoute.post('/four-portal-list-all-eprescription', portal_ePrescription.listAllEprescription);
labimagingdentalopticalRoute.post('/four-portal-send-Mail-TO-Patient', portal_ePrescription.sendMailTOPatient);
labimagingdentalopticalRoute.get('/getAllEprescriptionDetailsForFourPortal', portal_ePrescription.getAllEprescriptionDetailsForFourPortal);
labimagingdentalopticalRoute.get('/checkEprescriptionAvailabilityForFourPortal', portal_ePrescription.checkEprescriptionAvailability);


labimagingdentalopticalRoute.post('/add-manuall-tests', labimagingdentaloptical.addManualTest);
labimagingdentalopticalRoute.post('/edit-manual-tests', labimagingdentaloptical.editManualTest);


//Notification
labimagingdentalopticalRoute.post('/notification', labimagingdentaloptical.notification);
labimagingdentalopticalRoute.get('/notificationlist', labimagingdentaloptical.notificationlist);
labimagingdentalopticalRoute.post("/update-notification-status", labimagingdentaloptical.updateNotificationStatus);

// For claim
labimagingdentalopticalRoute.get('/get-fourportal-all-hospital-and-clinic', labimagingdentaloptical.getAllHospitalandClinicListForClaim);
labimagingdentalopticalRoute.get('/get-all-fouportal-as-per-loc', labimagingdentaloptical.getFourPortalListforLocation);
labimagingdentalopticalRoute.get('/get-all-fouportal-list-per-loc', labimagingdentaloptical.getAllFourPortalListForClaim);
labimagingdentalopticalRoute.get('/get-all-fouportal-list-for-hospital', labimagingdentaloptical.fourPortalAllList);

//logs update
labimagingdentalopticalRoute.post("/update-logs", labimagingdentaloptical.updatelogsData)
labimagingdentalopticalRoute.get("/get-all-logs-by-userId", labimagingdentaloptical.getAllLogs)

labimagingdentalopticalRoute.get('/viewAppointmentCheck', viewAppointmentCheck);
labimagingdentalopticalRoute.get('/updateUnreadMessage', updateUnreadMessage);


//video-calling
labimagingdentalopticalRoute.use(verifyToken)

labimagingdentalopticalRoute.get('/view-appointment-by-roomname', viewAppointmentByRoomName);

labimagingdentalopticalRoute.post("/four-portal-fetch-room-call", labimagingdentaloptical.portal_fetchRoomCall);
labimagingdentalopticalRoute.post("/four-portal-update-videocall-appointment", fourportalappointment.portal_UpdateVideocallAppointment);
labimagingdentalopticalRoute.post("/four-portal-update-videocall-chatmessage", fourportalappointment.portal_updateVideocallchatmessage);
labimagingdentalopticalRoute.get("/four-portal-participant-details", fourportalappointment.portal_participantInfo);
labimagingdentalopticalRoute.post("/appointment-details", fourportalappointment.fetchAppointmentDetails);
labimagingdentalopticalRoute.get("/four-portal-appointment-details-hospital-dashboard", fourportalappointment.totalCountforAppointmentHospitalDashboard);
labimagingdentalopticalRoute.get("/four-portal-payment-history", fourportalappointment.patientPaymentHistoryToFourPortal);


labimagingdentalopticalRoute.post("/addProviderDocuments", labimagingdentaloptical.addProviderDocuments);
labimagingdentalopticalRoute.get("/getProviderDocumentslist", labimagingdentaloptical.getProviderDocumentsByFilters);
labimagingdentalopticalRoute.get("/getProviderDocuments", labimagingdentaloptical.getProviderDocuments);
labimagingdentalopticalRoute.put("/updatestatusDocuments", labimagingdentaloptical.inActive_isDeletedProviderDocument);

labimagingdentalopticalRoute.get("/getFourPortalList", labimagingdentaloptical.getFourPortalList);

labimagingdentalopticalRoute.get("/fourtportalDetails", labimagingdentaloptical.fourtportalDetails);
labimagingdentalopticalRoute.get("/get-rating-and-reveiws", labimagingdentaloptical.getReviewAndRatinByPatient);
labimagingdentalopticalRoute.get("/get-reviews-rating-superadmin", labimagingdentaloptical.getReviewAndRatingForSupeAdmin);
labimagingdentalopticalRoute.post("/updateAppointmentComplete", labimagingdentaloptical.updateAppointmentComplete);

// save superadmin notification
labimagingdentalopticalRoute.post('/save-superadmin-notification', labimagingdentaloptical.saveSuperadminNotification);

export default labimagingdentalopticalRoute;