import express from "express";
const multer = require('multer')();
import { addCategory, addService, addExlusionData, craeteInsuranceProfile, insuranceAdminSignup, editInsuranceProfile, hospitalAdminSignup, craeteHospitalProfile, editHospitalProfile, createHospitalStaff, insuranceAdminLogin, sendEmailOtpFor2fa, sendSmsOtpFor2fa, matchEmailOtpFor2fa, matchSmsOtpFor2fa, changePassword, addStaff, addStaffRole, allStaffRole, updateStaffRole, deleteStaffRole, getAllInsuranceStaff, editStaff, actionForStaff, deleteExlusionData, deleteCategoryService, getStaffDetails, viewRes, getAllStaff, forgotPassword, resetForgotPassword } from "../controller/userController";
import { addPrimarySubscriber, addSecondarySubscriber, deleteSubscriber, updateSubscriber, listSubscriber, viewSubscriber, uploadSubscriberFromCSV, listSubscriberType, uploadFile } from "../controller/insurance/subscriberController";
import { assignStaff, listAssignedStaff } from "../controller/hospital/hospitalController";
import { getAllHealthPlan } from "../controller/insurance/healthPlanController";
import { listAllHospitalAdminUser } from "../controller/superadmin/hospitalController";

const userRoute = express.Router()
// Insurance user routes
userRoute.post("/insurance-admin-signup", insuranceAdminSignup)
userRoute.post("/send-email-otp-for-2fa", sendEmailOtpFor2fa)
userRoute.post("/send-sms-otp-for-2fa", sendSmsOtpFor2fa)
userRoute.post("/match-email-otp-for-2fa", matchEmailOtpFor2fa)
userRoute.post("/match-sms-otp-for-2fa", matchSmsOtpFor2fa)
userRoute.post("/insurance-admin-login", insuranceAdminLogin)
userRoute.post("/create-insurance-profile", craeteInsuranceProfile)
userRoute.put("/edit-insurance-profile", editInsuranceProfile)
userRoute.put("/change-password", changePassword)
userRoute.post("/forgot-password", forgotPassword);
userRoute.post("/reset-forgot-password", resetForgotPassword);

//add insurance staff
userRoute.post("/add-staff", addStaff)
userRoute.put("/edit-staff", editStaff)
userRoute.get("/get-all-staff", getAllStaff)
userRoute.get("/get-staff-details", getStaffDetails)
userRoute.post("/delete-active-and-lock-staff", actionForStaff)



// userRoute.post("/add-staff-role", addStaffRole);
// userRoute.get("/all-staff-role", allStaffRole);
// userRoute.post("/update-staff-role", updateStaffRole);
// userRoute.post("/delete-staff-role", deleteStaffRole);

userRoute.post("/viewRes", viewRes);


//Hospital user routes
userRoute.post("/hospital-admin-signup", hospitalAdminSignup)
userRoute.post("/create-hospital-staff", createHospitalStaff)
userRoute.post("/create-hospital-profile", craeteHospitalProfile)
userRoute.put("/edit-hospital-profile", editHospitalProfile)

userRoute.post("/add-category", addCategory)
userRoute.post("/add-service", addService)
userRoute.post("/add-exclusion-details", addExlusionData)
userRoute.post("/delete-exclusion-data", deleteExlusionData)
userRoute.post("/delete-category-service", deleteCategoryService)

// Subscriber routes
userRoute.post("/add-primary-subscriber", addPrimarySubscriber)
userRoute.post("/add-secondary-subscriber", addSecondarySubscriber)
userRoute.post("/delete-subscriber", deleteSubscriber)
userRoute.post("/update-subscriber", updateSubscriber)
userRoute.get("/list-subscriber", listSubscriber)
userRoute.get("/view-subscriber", viewSubscriber)
userRoute.get("/list-subscriber-type", listSubscriberType)
userRoute.post("/upload-subscribers-csv", uploadSubscriberFromCSV)
userRoute.post("/upload-file", uploadFile) // Test upload file

// Health Plan
userRoute.get("/get-all-health-plan", getAllHealthPlan)
userRoute.get("/get-all-insurance-staff", getAllInsuranceStaff)


//Hospital Routes
userRoute.post('/hospital/assign-staff', assignStaff)
userRoute.get('/hospital/list-assigned-staff', listAssignedStaff)


//Super Admin routes
userRoute.get('/superadmin/list-all-hospital-admin-user', listAllHospitalAdminUser)
export default userRoute;