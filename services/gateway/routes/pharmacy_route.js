import express from "express";
import { advanceSearchPharmacyList,sendnoti, login, matchSmsOtpFor2fa, pharmacyOnDuty, pharmacyOpeningHours, sendSmsOtpFor2fa, signup, subscriptionPurchasedPlans, viewSubscriptionPurchasedPlans, getAllPharmacy, getAllPharmacyAdminDetails } from "../controller/pharmacyController";
import { addStaff, listStaff, getAllStaff, editStaff, deleteActiveLockStaff, viewStaff } from "../controller/pharmacy/staffManagementController";
const pharmacyRoute = express.Router()

//Patient Subscription Routes
pharmacyRoute.get("/subscription-purchased-plan", subscriptionPurchasedPlans);
pharmacyRoute.get("/view-subscription-purchased-plan", viewSubscriptionPurchasedPlans);
pharmacyRoute.post("/signup", signup);
pharmacyRoute.post("/login", login);
pharmacyRoute.post("/send-sms-otp-for-2fa", sendSmsOtpFor2fa)
pharmacyRoute.post("/match-sms-otp-for-2fa", matchSmsOtpFor2fa)
pharmacyRoute.post("/pharmacy-opening-hours", pharmacyOpeningHours);
pharmacyRoute.post("/pharmacy-on-duty", pharmacyOnDuty);


pharmacyRoute.get("/get-all-pharmacy", getAllPharmacy); //get all pharmacy without paginate
pharmacyRoute.get("/get-all-pharmacy-admin-details", getAllPharmacyAdminDetails); //get all pharmacy without paginate

//Staff Management
pharmacyRoute.post('/add-staff', addStaff)
pharmacyRoute.post('/edit-staff', editStaff)
pharmacyRoute.get("/list-staff", listStaff);
pharmacyRoute.get("/get-all-staff", getAllStaff)
pharmacyRoute.get('/view-staff-details', viewStaff)
pharmacyRoute.post('/delete-active-lock-staff', deleteActiveLockStaff)

pharmacyRoute.get("/sendnoti", sendnoti);


export default pharmacyRoute;