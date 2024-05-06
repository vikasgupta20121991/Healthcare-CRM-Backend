"use strict";

import express from "express";
import { dataValidation } from "../helpers/transmission";
import { approveInsuranceAdmin, createSubscriptionPlan, deleteSubscriptionPlan, editSubscriptionPlan, getInsuranceAdminNotApprovedList, getInsuranceAdminApprovedList, login, allSubscriptionPlans, forgotPassword, OTP2FA, sendOTP2FA, getInsuranceAcceptedList } from "../controllers/superadmin";


const superadmin = express.Router();

superadmin.post("/login", login);
superadmin.post("/send-email-otp-2fa", OTP2FA);
superadmin.post("/send-otp-2fa", sendOTP2FA);
superadmin.get("/forgot-password", forgotPassword);
superadmin.put("/approve-insurance-admin", approveInsuranceAdmin);
superadmin.get("/get-insurance-admin-notapproved-list", getInsuranceAdminNotApprovedList);
superadmin.get("/get-insurance-admin-approved-list", getInsuranceAdminApprovedList);


getInsuranceAcceptedList

//Subscription Plan
superadmin.post("/create-subscription-plan", createSubscriptionPlan);
superadmin.get("/all-subscription-plans", allSubscriptionPlans);
superadmin.put("/update-subscription-plan", editSubscriptionPlan);
superadmin.delete("/delete-subscription-plan", deleteSubscriptionPlan);




export default superadmin;
