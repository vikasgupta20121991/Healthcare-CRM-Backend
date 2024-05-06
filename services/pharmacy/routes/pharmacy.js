import express from "express";
import { registerValidator } from "../validator/pharmacy";
import { dataValidation } from "../helpers/transmission";
const pharmacy = require("../controllers/pharmacy_controller");
import StaffManagementController from "../controllers/staffManagementController"
import OnDutyGroupController from "../controllers/onDutyGroupController"
import { verifyToken } from "../helpers/verifyToken";
import { sendResponse } from "../helpers/transmission";
import { addMembersToGroupChat, allMessage, clearAllmessages, createdChat, createGroupChat, getCreatedChats, getNotification, markAllReadNotification, markReadNotificationByID, saveNotification, sendMessage, updateNotification, updateOnlineStatus, updateConfirmScheduleorder, clearSinglemessages } from "../controllers/Chat-Controller/Chat";
import { updateSocketId } from "../../pharmacy/controllers/Chat-Controller/Chat";
const pharmacyRoute = express.Router();

const uploadFileToLocalStorage = (req, res, next) => {
    if (!req.files) {
        return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const file = req.files.csv_file;
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Only .xlsx mime type allowed!",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    // if (file.mimetype !== "text/csv") {
    //     return sendResponse(req, res, 200, {

    //         status: false,
    //         body: null,
    //         message: "Only .csv mime type allowed!",
    //         errorCode: "INTERNAL_SERVER_ERROR",
    //     })
    // }
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



pharmacyRoute.get("/list-pharmacy-admin-user", pharmacy.listPharmacyAdminUser);
// pharmacyRoute.post(
//     "/approve-or-reject-pharmacy",
//     pharmacy.approveOrRejectPharmacy
// );
pharmacyRoute.get(
    "/view-pharmacy-admin-details",
    pharmacy.viewPharmacyAdminDetails
);
pharmacyRoute.post("/send-sms-otp", pharmacy.sendSmsOtpFor2fa)
pharmacyRoute.post("/match-sms-otp", pharmacy.matchSmsOtpFor2fa)
pharmacyRoute.post("/match-Email-Otp-For2fa", pharmacy.matchEmailOtpFor2fa)

pharmacyRoute.post('/send-email-verification', pharmacy.sendVerificationEmail);
pharmacyRoute.post("/signup", registerValidator, dataValidation, pharmacy.signup);
pharmacyRoute.post("/login", pharmacy.login);
pharmacyRoute.post("/refresh-token", pharmacy.refreshToken);
pharmacyRoute.post("/forgot-password", pharmacy.forgotPassword);
pharmacyRoute.post("/change-password", pharmacy.changePassword);
// pharmacyRoute.post("/pharmacy-profile", pharmacy.pharmacyProfile);
pharmacyRoute.post("/lock-profile", pharmacy.lockProfile);
pharmacyRoute.post('/delete-active-admin', pharmacy.deleteActiveadmin)
pharmacyRoute.post("/upload-document", pharmacy.uploadDocument);
pharmacyRoute.post("/upload-base64", pharmacy.uploadBase64);
pharmacyRoute.post("/get-signed-url", pharmacy.getDocument);
pharmacyRoute.post("/save-documentmetadata", pharmacy.saveDocumentMetaData);
pharmacyRoute.get("/get-document-metadata", pharmacy.documentInformation);
pharmacyRoute.post("/pharmacy-opening-hours", pharmacy.pharmacyOpeningHours);
pharmacyRoute.post("/pharmacy-on-duty", pharmacy.pharmacyOnDuty);
pharmacyRoute.post("/reset-password", pharmacy.resetPassword);
pharmacyRoute.get("/get-all-pharmacy", pharmacy.getAllPharmacy);
pharmacyRoute.get("/get-all-pharmacy-admin-details", pharmacy.getAllPharmacyAdminDetails);
pharmacyRoute.get("/get-pharmacy-details", pharmacy.getAllPharmacyAdminDetails);
pharmacyRoute.get("/check-route", pharmacy.checkRoute);
pharmacyRoute.post("/advance-search-pharmacy-list", pharmacy.advanceSearchPharmacyList);
pharmacyRoute.get("/pharmacy-admin-details", pharmacy.pharmacyAdminDetails);
pharmacyRoute.get("/pharmacy-details", pharmacy.pharmacyDetails);


// pharmacyRoute.post("/add-location", pharmacy.enterLocation);

pharmacyRoute.post("/save-superadmin-notification", pharmacy.saveSuperadminNotification);
pharmacyRoute.get("/get-pharmacy-count-superadmin-dashboard", pharmacy.totalPharmacyforAdminDashboard);

//Staff Management
pharmacyRoute.post('/add-staff', StaffManagementController.addStaff)
pharmacyRoute.post('/edit-staff', StaffManagementController.editStaff)
pharmacyRoute.get("/list-staff", StaffManagementController.listStaff);
pharmacyRoute.get("/get-all-staff", StaffManagementController.getAllStaff); //Get all Staff without paginate
pharmacyRoute.get("/view-staff-details", StaffManagementController.viewStaff);
pharmacyRoute.post('/delete-active-lock-staff', StaffManagementController.deleteActiveLockStaff)
pharmacyRoute.get("/list-category-staff", StaffManagementController.listCategoryStaff)

//On Duty Group
pharmacyRoute.post('/add-on-duty-group', OnDutyGroupController.addOnDutyGroup)
pharmacyRoute.get('/list-on-duty-group', OnDutyGroupController.listOnDutyGroup)
pharmacyRoute.get('/get-on-duty-group', OnDutyGroupController.getOnDutyGroup)
pharmacyRoute.post('/delete-on-duty-group', OnDutyGroupController.deleteOnDutyGroup)
pharmacyRoute.post('/deleteOnDutyGroupMasterAction', OnDutyGroupController.deleteOnDutyGroupMasterAction)
pharmacyRoute.post("/upload-on-duty-group-csv", uploadFileToLocalStorage, OnDutyGroupController.uploadOnDutyGroupFromCSV);

//On Duty Pharmacy
pharmacyRoute.post('/add-pharmacy-on-duty-group', OnDutyGroupController.addPharmacyOnDutyGroup)
pharmacyRoute.post("/upload-on-duty-pharmcy-group-csv", uploadFileToLocalStorage, OnDutyGroupController.addPharmacyOnDutyGroupBulkCsv);
pharmacyRoute.post('/edit-pharmacy-on-duty-group', OnDutyGroupController.editPharmacyOnDutyGroup)
pharmacyRoute.get('/list-pharmacy-on-duty-group', OnDutyGroupController.listPharmacyOnDutyGroup)
pharmacyRoute.get('/details-pharmacy-on-duty-group', OnDutyGroupController.detailsPharmacyOnDutyGroup)


pharmacyRoute.get('/get-review-and-rating', pharmacy.getReviewAndRating);
pharmacyRoute.post('/delete-review-and-rating-pharmacy', pharmacy.deleteReviewAndRating);
pharmacyRoute.get('/get-review-and-rating-by-patient', pharmacy.getReviewAndRatinByPatient);
pharmacyRoute.post('/update-socket-id', updateSocketId)
pharmacyRoute.post("/pharmacy-profile-create", pharmacy.pharmacyCreateProfile);

pharmacyRoute.post('/post-review-and-rating', pharmacy.postReviewAndRating);

//logsUpdate
pharmacyRoute.post("/update-logs", pharmacy.updatelogsData);
pharmacyRoute.get("/get-all-logs-by-userId", pharmacy.getAllLogs);
pharmacyRoute.get("/get-pharmacy-association-by-id", pharmacy.getPharmacyAssociation);

pharmacyRoute.use(verifyToken);
pharmacyRoute.post("/pharmacy-profile", pharmacy.pharmacyProfile);

pharmacyRoute.post("/approve-or-reject-pharmacy", pharmacy.approveOrRejectPharmacy);
pharmacyRoute.post("/pharmacy-profile-set-hours", pharmacy.pharmacyProfileSetHours);
pharmacyRoute.post("/get-pharmacy-by-mainmobilenumber", pharmacy.getPharmacyByMainmobilenumber);

pharmacyRoute.get("/list-approved-pharmacy-admin-user", pharmacy.listApprovedPharmacyAdminUser);



pharmacyRoute.get("/get-PharmacyBy-Id", pharmacy.getPharmacyById);

// Invitation
pharmacyRoute.post("/send-email-invitation", pharmacy.sendInvitation);
pharmacyRoute.get("/get-email-invitation-list", pharmacy.getAllInvitation);
pharmacyRoute.get("/get-email-invitation-id", pharmacy.getInvitationById);
pharmacyRoute.get("/get-medicine-orderdetails-byid", pharmacy.getOrderDetailsById);
pharmacyRoute.post("/delete-email-invitation", pharmacy.deleteInvitation);

pharmacyRoute.get("/chat-list-staff", StaffManagementController.pharmacyListForChat);
// chat route
pharmacyRoute.post('/create-chat', createdChat);
pharmacyRoute.get('/get-create-chat', getCreatedChats);
pharmacyRoute.post('/create-message', sendMessage);
pharmacyRoute.get('/all-message', allMessage);
pharmacyRoute.post('/create-group-chat', createGroupChat);
pharmacyRoute.post('/addmembers-to-groupchat', addMembersToGroupChat)


// notification
pharmacyRoute.post('/save-notification', saveNotification);
pharmacyRoute.get('/get-all-notification', getNotification);
pharmacyRoute.put('/mark-all-read-notification', markAllReadNotification)
pharmacyRoute.put('/mark-read-notification-id', markReadNotificationByID)
pharmacyRoute.post('/update-notification', updateNotification);

pharmacyRoute.put('/clear-all-messages', clearAllmessages)
pharmacyRoute.post('/update-online-status', updateOnlineStatus)
pharmacyRoute.put("/update-schedule-order", updateConfirmScheduleorder);
pharmacyRoute.put('/clear-single-message', clearSinglemessages)

//Notification for order
pharmacyRoute.post('/notification', pharmacy.notification);
pharmacyRoute.get('/notificationlist', pharmacy.notificationlist);

pharmacyRoute.post("/update-notification-status",pharmacy.updateNotificationStatus);
pharmacyRoute.get("/get-portaluser-data",pharmacy.getPortalUserData);

export default pharmacyRoute;
