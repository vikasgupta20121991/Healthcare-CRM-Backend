import express from "express";
import { addVitals, advanceSearchPharmacyList, familyDetails, historyDetails, immunizationDetails, insuranceDetails, login, matchEmailOtpFor2fa, matchSmsOtpFor2fa, medicalDocument, medicineDetails, personalDetails, profileDetails, sendEmailOtpFor2fa, sendSmsOtpFor2fa, signup, subscriptionPurchasedPlans, uploadDocument, viewSubscriptionPurchasedPlans, getPaymentDetails } from "../controller/patientController";

const patientRoute = express.Router()
//patient
patientRoute.post('/signup', signup)
patientRoute.post("/login", login);
patientRoute.post("/send-email-otp-for-2fa", sendEmailOtpFor2fa)
patientRoute.post("/send-sms-otp-for-2fa", sendSmsOtpFor2fa)
patientRoute.post("/match-email-otp-for-2fa", matchEmailOtpFor2fa)
patientRoute.post("/match-sms-otp-for-2fa", matchSmsOtpFor2fa)

patientRoute.post('/create-profile/personal-details', personalDetails)
patientRoute.post("/create-profile/insurance-details", insuranceDetails);
patientRoute.post("/create-profile/add-vitals", addVitals);
patientRoute.post("/create-profile/medicine-details", medicineDetails);
patientRoute.post("/create-profile/immunization-details", immunizationDetails);
patientRoute.post("/create-profile/history-details", historyDetails);
patientRoute.post("/create-profile/medical-document", medicalDocument);
patientRoute.post("/create-profile/family-details", familyDetails);
patientRoute.post("/upload-document", uploadDocument);

patientRoute.get("/profile-details", profileDetails);
patientRoute.get("advance-search-pharmacy-list", advanceSearchPharmacyList);
patientRoute.get("/get-payment-details", getPaymentDetails);

//Patient Subscription Routes
patientRoute.get("/subscription-purchased-plan", subscriptionPurchasedPlans);
patientRoute.get("/view-subscription-purchased-plan", viewSubscriptionPurchasedPlans);

export default patientRoute;