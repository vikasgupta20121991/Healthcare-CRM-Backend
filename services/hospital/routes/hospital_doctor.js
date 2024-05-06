"use strict";

import express from "express";
const { hospitalDoctor } = require("../controllers/hospital_doctor");
import { verifyToken } from "../helpers/verifyToken";
import { handleResponse } from "../middleware/utils";

const fs = require('fs');

const hospitalDoctorRoute = express.Router();

const uploadImage = async (req, res, next) => {
  const file = req.files.file;
  const filename = file.name.split('.')[0] + '-' + Date.now() + '.jpg';
  req.filename = filename;
  console.log(filename, "filename");
  const newPath = `${__dirname.replace('routes', 'uploadEsignature')}/${filename}`
  file.mv(newPath);
  next()
}
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

// hospitalDoctorRoute.post("/update-hospital-profile", hospitalDoctor.hospitalProfile);
hospitalDoctorRoute.post("/add-staff", hospitalDoctor.addStaff);
hospitalDoctorRoute.post("/delete-staff", hospitalDoctor.deleteStaff);
hospitalDoctorRoute.put(
  "/update-staff-details",
  hospitalDoctor.updateStaffDetails
);
hospitalDoctorRoute.post("/add-doctor", hospitalDoctor.addDoctor);
hospitalDoctorRoute.post("/delete-doctor", hospitalDoctor.deleteDoctor);
hospitalDoctorRoute.put(
  "/update-doctor-details",
  hospitalDoctor.updateDoctorDetails
);
hospitalDoctorRoute.post(
  "/add-doctor-education",
  hospitalDoctor.addDoctorEducation
);
hospitalDoctorRoute.put(
  "/update-doctor-education",
  hospitalDoctor.updateDoctorEducation
);
hospitalDoctorRoute.post(
  "/delete-doctor-education",
  hospitalDoctor.deleteDoctorEducation
);
hospitalDoctorRoute.post(
  "/add-doctor-availability",
  hospitalDoctor.addDoctorAvailability
);
hospitalDoctorRoute.put(
  "/update-doctor-availability",
  hospitalDoctor.updateDoctorAvailability
);
hospitalDoctorRoute.post(
  "/delete-doctor-availability",
  hospitalDoctor.deleteDoctorAvailability
);
hospitalDoctorRoute.put(
  "/update-doctor-consultation",
  hospitalDoctor.updateDoctorConsultation
);
hospitalDoctorRoute.post(
  "/delete-doctor-consultation",
  hospitalDoctor.deleteDoctorConsultation
);
hospitalDoctorRoute.post("/save-document", hospitalDoctor.saveDocumentMetadata);
hospitalDoctorRoute.post(
  "/delete-document",
  hospitalDoctor.deleteDocumentMetadata
);
hospitalDoctorRoute.post("/list-document", hospitalDoctor.listDocumentMetadata);
hospitalDoctorRoute.post(
  "/list-hospital-doctor",
  hospitalDoctor.listHospitalDoctor
);
hospitalDoctorRoute.post(
  "/view-doctor-details",
  hospitalDoctor.viewHospitalDoctor
);
hospitalDoctorRoute.post(
  "/list-hospital-staff",
  hospitalDoctor.listHospitalStaff
);
hospitalDoctorRoute.post(
  "/view-staff-details",
  hospitalDoctor.viewHospitalStaff
);

hospitalDoctorRoute.post('/advance-doctor-filter', hospitalDoctor.advanceDoctorFilter);
hospitalDoctorRoute.post('/doctor-management-basic-info', hospitalDoctor.doctorManagementBasicInfo);
hospitalDoctorRoute.get('/doctor-management-view-basic-info', hospitalDoctor.doctorManagementViewBasicInfo);
hospitalDoctorRoute.get('/doctor-management-get-locations', hospitalDoctor.doctorManagementGetLocations);
hospitalDoctorRoute.get('/get-related-doctors', hospitalDoctor.getRelatedDoctors);
hospitalDoctorRoute.get('/get-related-doctors-fourPortals', hospitalDoctor.getRelatedDoctorsForFourPortals);
hospitalDoctorRoute.post('/update-appointment-status', hospitalDoctor.updateAppointmentPaymentStatus);
hospitalDoctorRoute.get('/get-eprescription-template-url', hospitalDoctor.getEprescriptionTemplateUrl);
hospitalDoctorRoute.get('/get-Idby-DoctorName', hospitalDoctor.getIdbyDoctorName);
hospitalDoctorRoute.post('/send-Mail-TO-Patient', hospitalDoctor.sendMailTOPatient);
hospitalDoctorRoute.get('/get-eprescription', hospitalDoctor.getEprescription);

hospitalDoctorRoute.post('/add-manuall-tests', hospitalDoctor.addManualTest);
hospitalDoctorRoute.post('/edit-manual-tests', hospitalDoctor.editManualTest);

hospitalDoctorRoute.get('/doctor_totalClaims_ForGraph', hospitalDoctor.totalClaimReportedOfDoctor);

hospitalDoctorRoute.get('/view-appointment-by-roomname', hospitalDoctor.viewAppointmentByRoomName);
hospitalDoctorRoute.get('/updateUnreadMessage', hospitalDoctor.updateUnreadMessage);
hospitalDoctorRoute.get('/viewAppointmentCheck', hospitalDoctor.viewAppointmentCheck);

//Check Eprescription available or not based on return all medicine
hospitalDoctorRoute.get('/check-eprescription-availability', hospitalDoctor.checkEprescriptionAvailability);
hospitalDoctorRoute.use(verifyToken);

//Hospital OR Individual Doctor routes
hospitalDoctorRoute.post('/doctor-management-educational-details', hospitalDoctor.doctorManagementEducationalDetails);
hospitalDoctorRoute.post('/doctor-management-hospital-location', hospitalDoctor.doctorManagementHospitalLocation);
hospitalDoctorRoute.post('/doctor-management-doctor-availability', hospitalDoctor.doctorManagementDoctorAvailability);
hospitalDoctorRoute.post('/doctor-management-fee-management', hospitalDoctor.doctorManagementFeeManagement);
hospitalDoctorRoute.post('/doctor-management-document-management', hospitalDoctor.doctorManagementDocumentManagement);
hospitalDoctorRoute.get('/doctor-management-view-doctor-profile', hospitalDoctor.doctorManagementViewDoctorProfile);
hospitalDoctorRoute.get('/doctor-management-list-doctor', hospitalDoctor.doctorManagementListDoctor);
hospitalDoctorRoute.get('/doctor-management-request-list', hospitalDoctor.doctorManagementRequestList);
hospitalDoctorRoute.post('/doctor-management-accept-or-reject', hospitalDoctor.acceptOrRejectDoctorRequest);
hospitalDoctorRoute.post('/doctor-management-active-lock-delete-doctor', hospitalDoctor.doctorManagementActiveLockDeleteDoctor);
hospitalDoctorRoute.post('/delete-availabilty-by-deleting-location', hospitalDoctor.deleteAvailability);
hospitalDoctorRoute.get('/doctor-four-portal-management-list', hospitalDoctor.doctorFourPortalListForHospital);

//Doctor Routes for Super-admin
hospitalDoctorRoute.get('/get-doctor-list', hospitalDoctor.getDoctorList);
hospitalDoctorRoute.post('/approve-or-reject-doctor', hospitalDoctor.approveOrRejectDoctor);
hospitalDoctorRoute.post('/active-lock-delete-doctor', hospitalDoctor.activeLockDeleteDoctor);

//Appointment APIs
hospitalDoctorRoute.get('/list-appointment', hospitalDoctor.listAppointment);
hospitalDoctorRoute.post('/cancel-and-approve-appointment', hospitalDoctor.cancelAppointment);

hospitalDoctorRoute.get('/view-appointment', hospitalDoctor.viewAppointment);
hospitalDoctorRoute.post("/update-videocall-appointment", hospitalDoctor.UpdateVideocallAppointment);
hospitalDoctorRoute.post("/update-videocall-chatmessage", hospitalDoctor.UpdateVideocallchatmessage);
hospitalDoctorRoute.post('/assign-healthcare-provider', hospitalDoctor.assignHealthcareProvider);
hospitalDoctorRoute.get('/allDoctorsHopitalizationList', hospitalDoctor.allDoctorsHopitalizationList);
hospitalDoctorRoute.get('/all-doctors', hospitalDoctor.allDoctors);

hospitalDoctorRoute.post('/add-consulatation-data', hospitalDoctor.updateAppointmentData);

//Template Builder
hospitalDoctorRoute.post('/add-template', hospitalDoctor.addTemplate);
hospitalDoctorRoute.get('/template-list', hospitalDoctor.templateList);
hospitalDoctorRoute.get('/template-details', hospitalDoctor.templateDetails);
hospitalDoctorRoute.post('/template-delete', hospitalDoctor.templateDelete);

//Eprescription Create
hospitalDoctorRoute.post('/create-eprescription', hospitalDoctor.createEprescription);
hospitalDoctorRoute.post('/add-eprescription-medicine-dosage', hospitalDoctor.addEprescriptionMedicineDosage);
hospitalDoctorRoute.post('/delete-eprescription-medicine-dosage', hospitalDoctor.deleteEprescriptionMedicineDosage);
hospitalDoctorRoute.post('/add-eprescription-labTest', hospitalDoctor.addEprescriptionLabTest);
hospitalDoctorRoute.get('/get-eprescription-lab-test', hospitalDoctor.getEprescriptionLabTest);
hospitalDoctorRoute.post('/add-eprescription-imagingTest', hospitalDoctor.addEprescriptionImagingTest);
hospitalDoctorRoute.get('/get-eprescription-imaging-test', hospitalDoctor.getEprescriptionImagingTest);
hospitalDoctorRoute.post('/add-eprescription-vaccination', hospitalDoctor.addEprescriptionVaccination);
hospitalDoctorRoute.get('/get-eprescription-vaccination-test', hospitalDoctor.getEprescriptionVaccinationTest);
hospitalDoctorRoute.post('/add-eprescription-eyeglass', hospitalDoctor.addEprescriptionEyeglass);
hospitalDoctorRoute.get('/get-eprescription-eyeglass-test', hospitalDoctor.getEprescriptionEyeglassTest);
hospitalDoctorRoute.post('/add-eprescription-other', hospitalDoctor.addEprescriptionOther);
hospitalDoctorRoute.get('/get-eprescription-other-test', hospitalDoctor.getEprescriptionOtherTest);
hospitalDoctorRoute.get('/get-eprescription-medicine-dosage', hospitalDoctor.getEprescriptionMedicineDosage);
hospitalDoctorRoute.get('/get-all-eprescription-tests', hospitalDoctor.getAllTests);
hospitalDoctorRoute.post('/add-eprescription-esignature', uploadImage, hospitalDoctor.addEprescriptionEsignature);
hospitalDoctorRoute.post('/list-all-eprescription', hospitalDoctor.listAllEprescription);
hospitalDoctorRoute.get('/recent-medicine-prescribed-by-doctor', hospitalDoctor.listRecentMedicinesPrescribed);
hospitalDoctorRoute.get('/get-doctor-location', hospitalDoctor.getDoctorLocationInfo);
hospitalDoctorRoute.get('/get-all-eprescription-details-for-claim-medicine', hospitalDoctor.getAllEprescriptionDetailsForClaimMedicine);

//Add accepted insurance companies for hospital
hospitalDoctorRoute.post('/add-accepted-insurance', hospitalDoctor.addAcceptedInsurance)




// department_asper_hospital
hospitalDoctorRoute.post('/department-Asper-Hospital_Doctor', hospitalDoctor.getdataAsperHospitalDoctor);

hospitalDoctorRoute.post('/get-AssignDoctor', hospitalDoctor.postAssignDoctor);

hospitalDoctorRoute.get('/online-consultation-count', hospitalDoctor.onlineConsultationCount);
hospitalDoctorRoute.get('/facetoface-consultation-count', hospitalDoctor.facetofaceConsultationCount);
hospitalDoctorRoute.get('/home-consultation-count', hospitalDoctor.homeConsultationCount);
hospitalDoctorRoute.get('/all-consultation-count', hospitalDoctor.allConsultationCount);
hospitalDoctorRoute.get('/graph-list-status', hospitalDoctor.graphListHospital);
hospitalDoctorRoute.get('/Patient-payment-historyToDoc', hospitalDoctor.patientPaymentHistoryToDoctor);
hospitalDoctorRoute.get('/doctor_totalTests_allAppTypes', hospitalDoctor.totalTestsOfAllAppointmentTypes);

hospitalDoctorRoute.get('/appointment-revenues-count', hospitalDoctor.totalAppointmentsCountRevenueOfDoctor);
hospitalDoctorRoute.get('/totalRevenue-monthwise-f2f', hospitalDoctor.getTotalRevMonthWiseforF2F);
hospitalDoctorRoute.get('/totalRevenue-monthwise-online', hospitalDoctor.getTotalRevMonthWiseforOnline);
hospitalDoctorRoute.get('/getAllDoctorData', hospitalDoctor.getAllDoctorData);


// HospitalTypes
hospitalDoctorRoute.post('/add-healthcentre', hospitalDoctor.addHealthCentre_SuperAdmin)
hospitalDoctorRoute.get('/list-healthcentre', hospitalDoctor.allHealthCentreList)
hospitalDoctorRoute.put('/update-healthcentre', hospitalDoctor.updateHealthCentre)
hospitalDoctorRoute.post('/delete-healthcentre', hospitalDoctor.actionOnHealthCentre)
hospitalDoctorRoute.get('/exportsheetlist-healthcentre', hospitalDoctor.allHealthCentreListforexport)
hospitalDoctorRoute.post('/upload-csv-for-healthcentre-list', uploadFileToLocalStorage, hospitalDoctor.uploadCSVForHealthCentre)

hospitalDoctorRoute.get('/common-healthcentrelist', hospitalDoctor.commmonHealthCentreList)

hospitalDoctorRoute.post("/save-superadmin-notification", hospitalDoctor.saveSuperadminNotification);

export default hospitalDoctorRoute;
