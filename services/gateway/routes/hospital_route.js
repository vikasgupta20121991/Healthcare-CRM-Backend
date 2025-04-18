import express from "express";
import { hospitalAdminSignup, matchSmsOtpFor2fa, sendSmsOtpFor2fa } from "../controller/hospitalController";
const hospitalRoute = express.Router();

//hospital Subscription Routes
hospitalRoute.post("/admin-signup", hospitalAdminSignup);
hospitalRoute.post("/send-sms-otp-for-2fa", sendSmsOtpFor2fa)
hospitalRoute.post("/match-sms-otp-for-2fa", matchSmsOtpFor2fa)



export default hospitalRoute;