import express from "express";
const patient = require("../controllers/patient_controller");
const PatientRoute = express.Router();

PatientRoute.get('/getInsuranceAcceptedListForDoc', patient.getInsuranceAcceptedListForDoc);
PatientRoute.get('/getInsuranceAcceptedListForHosp', patient.getInsuranceAcceptedListForHosp);
PatientRoute.get('/view-hospital-details-for-patient', patient.viewHospitalAdminDetailsForPatient);
PatientRoute.get('/hospitalDetailsById', patient.hospitalDetailsById);


PatientRoute.get('/view-hospital-doctor-for-patient', patient.viewHospitalDoctorsForPatient);
PatientRoute.get('/view-doctor-details-for-patient', patient.viewDoctorDetailsForPatient);
PatientRoute.post('/post-review-and-rating', patient.postReviewAndRating);
PatientRoute.get('/get-review-and-rating', patient.getReviewAndRating);
PatientRoute.get('/get-review-and-rating-for-superadmin', patient.getReviewAndRatingForSupeAdmin);
PatientRoute.post('/delete-review-and-rating-hospital', patient.deleteReviewAndRating);
PatientRoute.get('/list-appointment', patient.listAppointment);
PatientRoute.post('/cancel-appointment', patient.cancelAppointment);
PatientRoute.post("/updateAppointmentComplete", patient.updateAppointmentComplete);

PatientRoute.get('/view-appointment', patient.viewAppointment);
PatientRoute.post('/set-reminder-for-appointment', patient.setReminderForAppointment);
PatientRoute.get('/get-reminder-for-appointment', patient.getReminderForAppointment);
// PatientRoute.post('/update-reminder-for-appointment', patient.updateReminderForAppointment);

//get rating & review of hospital/doctor for patient
PatientRoute.get('/get-rating-review-by-patient', patient.getRatingReviewByPatient);

PatientRoute.get('/list-appointment-upcoming', patient.listAppointmentUpcomingCount);
PatientRoute.get('/getappointmentdetailDoctorName', patient.getappointmentdetailDoctorName)
PatientRoute.get('/getAllPatientAddedByHospitalDoctor', patient.getAllPatientAddedByHospitalDoctor)



export default PatientRoute;