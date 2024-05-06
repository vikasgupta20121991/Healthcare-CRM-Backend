import express from "express";
import { addMembersToGroupChat, allMessage, clearAllmessages, clearSinglemessages, createdChat, createGroupChat, getCreatedChats, getNotification, markAllReadNotification, markReadNotificationByID, saveNotification, sendMessage, updateNotification, updateOnlineStatus, updateSocketId } from "../controllers/Chat-Controller/Chat";
const hospital = require("../controllers/hospital_controller");
import MasterController from "../controllers/masterController"
const hospitalStaff = require("../controllers/hospital_staff_controller");
import { verifyToken, verifyRole } from "../helpers/verifyToken";
import { handleResponse } from "../middleware/utils";
const openingHour = require("../controllers/hospital_openhour_controller");
const hospitalStaffRole = require("../controllers/roles/role");
const HospitalRoute = express.Router();
const fs = require('fs');


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
    // console.log(newPath, 'newPath');
    // console.log(file.data, 'file.data');
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


const uploadFileToLocalStoragecsv = (req, res, next) => {
    if (!req.files) {
        return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const file = req.files.file;
    console.log(file, "file log ");
    if (file.mimetype !== "text/csv") {
        return sendResponse(req, res, 200, {

            status: false,
            body: null,
            message: "Only .csv mime type allowed!",
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

HospitalRoute.post("/admin-signup", hospital.signup);
HospitalRoute.get("/get-hospital-details", hospital.getHospitalDetails);

HospitalRoute.post("/delete-hospital-pathology-tests",hospital.deletePathologyTest)

HospitalRoute.post("/login", hospital.login);
HospitalRoute.post("/send-sms-otp-for-2fa", hospital.sendSmsOtpFor2fa);
HospitalRoute.post("/send-email-otp-for-2fa", hospital.sendEmailOtpFor2fa);
HospitalRoute.post("/match-otp-for-2fa", hospital.matchOtpFor2fa);
HospitalRoute.post("/match-Email-Otp-For2fa", hospital.matchEmailOtpFor2fa);


HospitalRoute.post("/advance-hospital-filter", hospital.advanceHospitalFilter);
HospitalRoute.post("/get-signed-url", hospital.getDocument);
HospitalRoute.post("/create-hospital-profile", hospital.createHospitalProfile);
HospitalRoute.get("/get-hospital-type", hospital.getHospitalType);
HospitalRoute.get('/all-specialty', hospital.allSpecialty)
HospitalRoute.get('/filter-value', hospital.filterValue)
HospitalRoute.get('/set-doctor-availability-for-filter', hospital.setDoctorAvailabilityForFilter)
HospitalRoute.post("/upload-document", hospital.uploadDocument);
HospitalRoute.get('/export-speciality', hospital.allSpecialtyListforexport)



HospitalRoute.post("/upload-document-for-portal", hospital.uploadDocumentForPortal); //Generic API for uplaod document and return objectId
HospitalRoute.post("/doctor-available-slot", hospital.doctorAvailableSlot);
HospitalRoute.get('/get-health-center-types', openingHour.getHealthCenterTypes)


// //Staff Role
HospitalRoute.post("/add-staff-role", hospitalStaffRole.add_role);
HospitalRoute.get("/all-staff-role", hospitalStaffRole.all_role);
HospitalRoute.post("/update-staff-role", hospitalStaffRole.update_role);
HospitalRoute.post("/delete-staff-role", hospitalStaffRole.delete_role);

HospitalRoute.post('/update-socket-id', updateSocketId)
HospitalRoute.post("/forgot-password", hospital.forgotPassword);
HospitalRoute.post("/change-password", hospital.changePassword);
HospitalRoute.post("/reset-forgot-password", hospital.resetForgotPassword);


//Notification
HospitalRoute.post('/notification', hospital.notification);
HospitalRoute.get('/notificationlist', hospital.notificationlist);
HospitalRoute.post('/update-notification', hospital.updateNotification)
HospitalRoute.get('/get-all-notification', getNotification)
HospitalRoute.get("/get-hospital-location", hospital.getHospitalLocationData);
HospitalRoute.get("/get-portal-user-data", hospital.getPortalUserData);
HospitalRoute.get("/get-service-data", hospital.getServiceData);
HospitalRoute.get("/get-department-data", hospital.getDepartmentData);
HospitalRoute.get("/get-unit-data", hospital.getUnitData);
HospitalRoute.get("/get-speciality-data", hospital.getSpecialityData);
HospitalRoute.post("/save-four-portal-hospital-location", hospital.saveFouPortalLocationData);
HospitalRoute.get("/get-team-data", hospital.getTeamsData);
HospitalRoute.get("/get-expertise-data", hospital.getExpertiseData);
HospitalRoute.get("/get-staff-profile-data", hospital.getStaffProfileData);
HospitalRoute.get("/get-subscription-purchase-data", hospital.getPurchasedSubscriptionData);
HospitalRoute.get("/get-hospital-admin-data", hospital.getAllHospitalAdmin);

//logsUpdate
HospitalRoute.post("/update-logs", hospital.updatelogsData);
HospitalRoute.get("/get-all-logs-by-userId", hospital.getAllLogs);
HospitalRoute.get("/get-all-staff-data", hospital.getHospitalStaffData);


HospitalRoute.use(verifyToken);
HospitalRoute.post('/uploadExcelforDepartment', uploadFileToLocalStorage, hospital.uploadExcelforDepartment)
HospitalRoute.post('/uploadExcelforExpertise', uploadFileToLocalStorage, hospital.uploadExcelforExpertise)
HospitalRoute.post('/uploadCSVForService', uploadFileToLocalStorage, hospital.uploadCSVForService)
HospitalRoute.get('/expertiseListforexport', hospital.expertiseListforexport)
HospitalRoute.get('/departmentListforexport', hospital.departmentListforexport)
HospitalRoute.get('/serviceListforexport', hospital.serviceListforexport)
HospitalRoute.post('/uploadCSVForUnitHospital', uploadFileToLocalStorage, hospital.uploadCSVForUnitHospital)
HospitalRoute.get('/unitListforexport', hospital.unitListforexport)

HospitalRoute.post("/opening-hours", hospital.openingHours);

//Doctor Appointment
HospitalRoute.post("/doctor-appointment", hospital.doctorAppointment);
HospitalRoute.post("/booked-appointments-list", hospital.bookedAppointmentsList);
HospitalRoute.post("/reschedule-appointment", hospital.rescheduleAppointment);
HospitalRoute.get("/next-available-slot", hospital.nextAvailableSlot);

// //Staff
HospitalRoute.post("/add-staff", hospitalStaff.addStaff);
HospitalRoute.post("/edit-staff", hospitalStaff.editStaff);
HospitalRoute.get("/get-all-staff", hospitalStaff.getAllStaff);
HospitalRoute.get("/get-all-staff-without-pagination", hospitalStaff.getAllStaffWithoutPagination);
HospitalRoute.get("/get-staff-details", hospitalStaff.getStaffDetails)
HospitalRoute.post("/delete-active-and-lock-staff", hospitalStaff.actionForStaff);

//Specialty
HospitalRoute.post('/add-specialty', verifyRole(["superadmin"]), hospital.addSpecialty)
HospitalRoute.post('/update-specialty', verifyRole(["superadmin"]), hospital.updateSpecialty)
HospitalRoute.post('/action-on-specialty', verifyRole(["superadmin"]), hospital.actionOnSpecialty)
HospitalRoute.post('/upload-csv-for-specialty', uploadFileToLocalStorage, hospital.uploadCSVForSpecialty)
HospitalRoute.get('/export-specialty', hospital.exportSpecialty)

//Hospital Department
HospitalRoute.post("/add-department", hospital.addDepartment);
HospitalRoute.get("/all-department", hospital.allDepartment);
HospitalRoute.get("/department-details", hospital.departmentDetails);
HospitalRoute.post("/update-department", hospital.updateDepartment);
HospitalRoute.post("/action-on-department", hospital.actionOnDepartment);

//Hospital Service
HospitalRoute.post("/add-service", hospital.addService);
HospitalRoute.get("/all-service", hospital.allService);
HospitalRoute.get("/service-details", hospital.serviceDetails);
HospitalRoute.post("/update-service", hospital.updateService);
HospitalRoute.post("/action-on-service", hospital.actionOnService);

//Hospital Unit
HospitalRoute.post("/add-unit", hospital.addUnit);
HospitalRoute.get("/all-unit", hospital.allUnit);
HospitalRoute.get("/unit-details", hospital.unitDetails);
HospitalRoute.post("/update-unit", hospital.updateUnit);
HospitalRoute.post("/action-on-unit", hospital.actionOnUnit);

//Get Department, Service, Unit
HospitalRoute.post("/list-of-department-service-unit", hospital.listOfDepartmentServiceUnit);

//Lab Test
HospitalRoute.post('/add-lab-test-master', MasterController.addLabTest)
HospitalRoute.get('/lab-test-master-list', MasterController.labTestMasterList)
HospitalRoute.get('/lab-test-master-list-for-doctor', MasterController.labTestMasterListForDoctor)
HospitalRoute.get('/lab-test-master-details', MasterController.labTestMasterDetails)
HospitalRoute.post('/lab-test-master-edit', MasterController.labTestMasterEdit)
HospitalRoute.post('/lab-test-master-action', MasterController.labTestMasterAction)
HospitalRoute.post('/upload-csv-for-lab-test', uploadFileToLocalStorage, MasterController.uploadCSVForLabTest)
HospitalRoute.get('/export-lab-test-master', MasterController.exportLabTestMaster)
HospitalRoute.get('/lab-test-master-list-export', MasterController.labTestMasterListforexport)
HospitalRoute.get('/labTestList-without-pagination', MasterController.labTestListWithoutPagination)
HospitalRoute.get('/lab-test-byId', MasterController.labTestbyId)



//Imaging Test
HospitalRoute.post('/add-imaging-test-master', MasterController.addImagingTest)
HospitalRoute.get('/imaging-test-master-list', MasterController.imagingTestMasterList)
HospitalRoute.get('/imaging-test-master-list-for-doctor', MasterController.imagingTestMasterListForDoctor)
HospitalRoute.get('/imaging-test-master-details', MasterController.imagingTestMasterDetails)
HospitalRoute.post('/imaging-test-master-edit', MasterController.imagingTestMasterEdit)
HospitalRoute.post('/imaging-test-master-action', MasterController.imagingTestMasterAction)
HospitalRoute.post('/upload-csv-for-imaging-test', uploadFileToLocalStorage, MasterController.uploadCSVForImagingTest)
HospitalRoute.get('/export-imaging-test-master', MasterController.exportImagingTestMaster)
HospitalRoute.get('/imaging-test-master-list-export', MasterController.imagingTestMasterListforexport)
HospitalRoute.get('/imagingTestList-without-pagination', MasterController.imagingListWithoutPagination)
HospitalRoute.get('/imaging-test-byId', MasterController.imagingTestbyId)


//Vaccination Test
HospitalRoute.post('/add-vaccination-master', MasterController.addVaccinationTest)
HospitalRoute.get('/vaccination-master-list', MasterController.vaccinationTestMasterList)
HospitalRoute.get('/vaccination-master-list-for-doctor', MasterController.vaccinationTestMasterListForDoctor)
HospitalRoute.get('/vaccination-master-details', MasterController.vaccinationTestMasterDetails)
HospitalRoute.post('/vaccination-master-edit', MasterController.vaccinationTestMasterEdit)
HospitalRoute.post('/vaccination-master-action', MasterController.vaccinationTestMasterAction)
HospitalRoute.post('/upload-csv-for-vaccination-test', uploadFileToLocalStorage, MasterController.uploadCSVForVaccinationTest)
HospitalRoute.get('/export-vaccination-test-master', MasterController.exportVaccinationTestMaster)
HospitalRoute.get('/vaccination-master-list-export', MasterController.vaccinationTestMasterListforexport)


//Others Test
HospitalRoute.post('/add-others-test-master', MasterController.addOthersTest)
HospitalRoute.get('/others-test-master-list', MasterController.othersTestTestMasterList)
HospitalRoute.get('/others-test-master-list-for-doctor', MasterController.othersTestTestMasterListForDoctor)
HospitalRoute.get('/others-test-master-details', MasterController.othersTestTestMasterDetails)
HospitalRoute.post('/others-test-master-edit', MasterController.othersTestTestMasterEdit)
HospitalRoute.post('/others-test-master-action', MasterController.othersTestTestMasterAction)
HospitalRoute.post('/upload-csv-for-others-test', uploadFileToLocalStorage, MasterController.uploadCSVForOthersTest)
HospitalRoute.get('/export-others-test-master', MasterController.exportOthersTestMaster)
HospitalRoute.get('/otherstest-list-export', MasterController.othersTestTestMasterListforexport)
HospitalRoute.get('/othersTestList-without-pagination', MasterController.OthersListWithoutPagination)
HospitalRoute.get('/others-test-byId', MasterController.OthersTestbyId)

//EyeGlass
HospitalRoute.post('/add-eyeglass-master', MasterController.addEyeglassMaster)
HospitalRoute.get('/list-eyeglass-master', MasterController.listEyeglassMaster)
HospitalRoute.get('/list-eyeglass-master-for-doctor', MasterController.listEyeglassMasterForDoctor)
HospitalRoute.post('/active-delete-eyeglass-master', MasterController.activeDeleteEyeglassMaster)
HospitalRoute.get('/view-eyeglass-master', MasterController.viewEyeglassMaster)
HospitalRoute.post('/update-eyeglass-master', MasterController.updateEyeglassMaster)
HospitalRoute.post('/upload-csv-for-eyeglass-master', uploadFileToLocalStorage, MasterController.uploadCSVForEyeglassMaster)
HospitalRoute.get('/export-eyeglass-master', MasterController.exportEyeglassMaster)
HospitalRoute.get('/eyeglasses-list-export', MasterController.listEyeglassMasterforexport);
HospitalRoute.get('/eyeglassesTestList-without-pagination', MasterController.eyeglassesListWithoutPagination)
HospitalRoute.get('/eyeglasses-test-byId', MasterController.eyeglassesTestbyId)

//Reason for Appointment
HospitalRoute.post("/add-appointment-reason", hospital.addAppointmentReason);
HospitalRoute.post("/bulk-upload-appointment-reason", uploadFileToLocalStorage, hospital.bulkUploadAppointmentReason);
HospitalRoute.get("/reason-for-appointment-list", hospital.reasonForAppointmentList);
HospitalRoute.get("/appointment-reason-details", hospital.reasonForAppointmentDetails);
HospitalRoute.post("/update-appointment-reason", hospital.updateReasonForAppointment);
HospitalRoute.post("/action-on-appointment-reason", hospital.actionOnReasonForAppointment);
HospitalRoute.get('/get-all-doctor-location-by-id', hospital.getAllLocationById);

//Questionnaire
HospitalRoute.post("/add-questionnaire", hospital.addQuestionnaire);
HospitalRoute.get("/questionnaire-list", hospital.QuestionnaireList);
HospitalRoute.get("/questionnaire-details", hospital.QuestionnaireDetails);
HospitalRoute.post("/update-questionnaire", hospital.updateQuestionnaire);
HospitalRoute.post("/action-on-questionnaire", hospital.actionOnQuestionnaire);

//Patient Assessment
HospitalRoute.post("/add-and-edit-assessment", hospital.addAssessment);
HospitalRoute.get("/assessment-list", hospital.assessmentList);


//Hospital Expertise
HospitalRoute.post("/add-expertise", hospital.addExpertise);
HospitalRoute.get("/all-expertise", hospital.allExpertise);
HospitalRoute.get("/expertise-details", hospital.expertiseDetails);
HospitalRoute.post("/update-expertise", hospital.updateExpertise);
HospitalRoute.post("/action-on-expertise", hospital.actionOnExpertise);

HospitalRoute.get('/list-hospital-admin-user', hospital.listHospitalAdminUser);
HospitalRoute.get("/get-all-hospital-details-by-id", hospital.getAllHospitalDetailsByID);


// HospitalRoute.post("/upload-document-for-portal", hospital.uploadDocumentForPortal); //Generic API for uplaod document and return objectId
// Routes for superadmin
HospitalRoute.get('/get-all-hospital-list', hospital.getAllHospitalListForSuperAdmin);
HospitalRoute.get('/get-all-hospital-list-under-doctor', hospital.getAllHospitalListUnderDoctor);
HospitalRoute.get('/view-hospital-admin-details', hospital.viewHospitalAdminDetails);
HospitalRoute.post('/approve-or-reject-hospital', hospital.approveOrRejectHospital);
HospitalRoute.post('/active-lock-delete-hospital', hospital.activeLockDeleteHospital);

HospitalRoute.get('/get-all-hospital', hospital.getAllHospital);
HospitalRoute.get('/read-hospital-locations', hospital.readHospitalLocations);

HospitalRoute.get('/get-all-hospital-and-clinic', hospital.getAllHospitalListForClaim);
HospitalRoute.get('/get-all-doctor-as-per-loc', hospital.getDoctorListforLocation);

// Opening Hour By Superadmin
HospitalRoute.get('/get-health-center-details-by-name', openingHour.getHealthCenterDetailsByName)
HospitalRoute.post('/add-hospital', openingHour.addHospital)
HospitalRoute.get('/get-hospital-details-by-superadmin', openingHour.getHospitalDetails)
HospitalRoute.post('/edit-hospital-by-superadmin', openingHour.editHospital)
HospitalRoute.get('/list-hospital-added-by-superadmin', openingHour.getHospitalAddedBySuperadmin)
HospitalRoute.post('/add-hospital-bulk-csv', uploadFileToLocalStorage, openingHour.addHospitalBulkCsv) //CSV BULK
HospitalRoute.post('/delete-hospital-by-superadmin', openingHour.deleteHospital) //soft delete
HospitalRoute.post('/deleteHospitalMasterAction', openingHour.deleteHospitalMasterAction) //soft delete

//Add accepted insurance companies for hospital
HospitalRoute.post('/add-accepted-insurance', hospital.addAcceptedInsurance)

HospitalRoute.get('/get-all-user-for-chat', hospital.getAllUsersForChat);

// chat route
HospitalRoute.post('/create-chat', createdChat);
HospitalRoute.get('/get-create-chat', getCreatedChats);
HospitalRoute.post('/create-message', sendMessage);
HospitalRoute.get('/all-message', allMessage);
HospitalRoute.post('/create-group-chat', createGroupChat);
HospitalRoute.post('/addmembers-to-groupchat', addMembersToGroupChat)


// notification
HospitalRoute.post('/save-notification', saveNotification);
// HospitalRoute.get('/get-all-notification',getNotification);
HospitalRoute.put('/mark-all-read-notification', markAllReadNotification)
HospitalRoute.put('/mark-read-notification-id', markReadNotificationByID)
// HospitalRoute.post('/update-notification', updateNotification);

HospitalRoute.put('/clear-all-messages', clearAllmessages)
HospitalRoute.post('/update-online-status', updateOnlineStatus)
HospitalRoute.put('/clear-single-message', clearSinglemessages)

// Team
HospitalRoute.post('/add-team', hospital.addTeam_SuperAdmin)
HospitalRoute.get('/list-team', hospital.allTeamList)
HospitalRoute.put('/update-team', hospital.updateTeam)
HospitalRoute.post('/delete-team', hospital.actionOnTeam)
HospitalRoute.get('/exportsheetlist-team', hospital.allTeamListforexport)
HospitalRoute.post('/upload-csv-for-team-list', uploadFileToLocalStorage, hospital.uploadCSVForTeam)
HospitalRoute.get('/getById-team', hospital.TeamById)
HospitalRoute.get('/common-teamlist', hospital.commmonTeamList)

HospitalRoute.post("/save-superadmin-notification", hospital.saveSuperadminNotification);
HospitalRoute.get("/get-hospital-count-superadmin-dashboard", hospital.totalHospitalforAdminDashboard);

HospitalRoute.get("/get-consultation-count", hospital.totalConsultation);
HospitalRoute.post("/update-notification-status",hospital.updateNotificationStatus);

HospitalRoute.post("/providerdocument",hospital.addProviderDocument);
HospitalRoute.get("/providerdocumentlist",hospital.getProviderDocumentsByFilters);
HospitalRoute.get("/getproviderdocument",hospital.getProviderDocument);
HospitalRoute.put("/inactive_isdelete_providerdocument",hospital.inActive_isDeletedProviderDocument);

HospitalRoute.get("/get-hospital-dashboard-count", hospital.totalCountforHospitalDashboard);
HospitalRoute.get("/get-hospital-dashboard-staff-count", hospital.totalStaffDoctorClaimHospitalDashboard);

HospitalRoute.get("/get-revenue-management-count", hospital.totalRevenueforHospitalManagement);
HospitalRoute.get("/get-online-revenue-for-hospital", hospital.totalOnlineRevenueforHospital);
HospitalRoute.get("/get-f2f-revenue-for-hospital", hospital.totalf2fRevenueforHospital);
HospitalRoute.get("/get_hospital_by_id", hospital.getHospitalNameById);

HospitalRoute.get("/get-doctor-fourportal-payment-history", hospital.doctorFourPortalPaymentHistoryToHospital);


HospitalRoute.get('/get-insurance_accepted-hospital-list', hospital.getInsuranceAcceptedHospital);


export default HospitalRoute;