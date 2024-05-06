"use strict";
const individualDoctorStaffRole = require("../controllers/roles/role");
const individualDoctorStaff = require("../controllers/individual_doctor_staff_controller");

import express from "express";
const {individualDoctor} = require("../controllers/individual_doctor");
const individualDoctorRoute = express.Router();
import {verifyToken} from "../helpers/verifyToken"
// individualDoctorRoute.post("/add-role", manageDoctorController.add_role);
// individualDoctorRoute.get("/all-role", manageDoctorController.all_role);
// individualDoctorRoute.put("/update-role", manageDoctorController.update_role);
// individualDoctorRoute.put("/delete-role", manageDoctorController.delete_role);

individualDoctorRoute.post("/sign-up", individualDoctor.signUp);
individualDoctorRoute.post("/login", individualDoctor.login);
individualDoctorRoute.get("/get-doctors-list", individualDoctor.listIndividualDoctor);
individualDoctorRoute.get("/get-doctor-details", individualDoctor.individualDoctor);
individualDoctorRoute.post("/forgot-password", individualDoctor.forgotPassword);
individualDoctorRoute.post("/reset-forgot-password", individualDoctor.resetForgotPassword);
individualDoctorRoute.post("/send-sms-otp-for-2fa", individualDoctor.sendSmsOtpFor2fa);
individualDoctorRoute.post("/send-email-otp-for-2fa", individualDoctor.sendEmailOtpFor2fa);
individualDoctorRoute.post("/match-otp-for-2fa", individualDoctor.matchOtpFor2fa);
individualDoctorRoute.post("/match-Email-Otp-For-2-fa", individualDoctor.matchEmailOtpFor2fa);

individualDoctorRoute.post("/change-password", individualDoctor.changePassword);
individualDoctorRoute.post("/upload-document", individualDoctor.uploadDocument);
individualDoctorRoute.post("/get-signed-url", individualDoctor.getDocument);

// //Staff
individualDoctorRoute.post("/add-staff", individualDoctorStaff.addStaff);
individualDoctorRoute.post("/edit-staff", individualDoctorStaff.editStaff);
individualDoctorRoute.get("/get-all-staff", individualDoctorStaff.getAllStaff);
individualDoctorRoute.get("/get-all-staff-without-pagination", individualDoctorStaff.getAllStaffWithoutPagination);
individualDoctorRoute.get("/get-staff-details", individualDoctorStaff.getStaffDetails)
individualDoctorRoute.post("/delete-active-and-lock-staff", individualDoctorStaff.actionForStaff);

// //Staff Role
individualDoctorRoute.post("/add-staff-role", individualDoctorStaffRole.add_role);
individualDoctorRoute.get("/all-staff-role", individualDoctorStaffRole.all_role);
individualDoctorRoute.post("/update-staff-role", individualDoctorStaffRole.update_role);
individualDoctorRoute.post("/delete-staff-role", individualDoctorStaffRole.delete_role);

//Individual Doctor For Super-admin
individualDoctorRoute.get("/get-individual-doctors-by-status", individualDoctor.getIndividualDoctorsByStatus);
individualDoctorRoute.post("/approve-or-reject-individual-doctor", individualDoctor.approveOrRejectIndividualDoctor);
individualDoctorRoute.get("/get-individual-doctors-by-id", individualDoctor.getIndividualDoctorsById);

//update logs
individualDoctorRoute.post("/update-logs" ,individualDoctor.updatelogsData);
individualDoctorRoute.get("/get-all-logs-by-userId",individualDoctor.getAllLogs);

individualDoctorRoute.post("/create-guest-user", individualDoctor.CreateGuestUser);
individualDoctorRoute.use(verifyToken)
individualDoctorRoute.post("/fetch-room-call", individualDoctor.fetchRoomCall);
individualDoctorRoute.get("/get-participant-details", individualDoctor.participantInfo);

individualDoctorRoute.post("/send-email-invitation", individualDoctor.sendInvitation);
individualDoctorRoute.get("/get-email-invitation-list", individualDoctor.getAllInvitation);
individualDoctorRoute.get("/get-email-invitation-id", individualDoctor.getInvitationById);
individualDoctorRoute.post("/delete-email-invitation", individualDoctor.deleteInvitation);

individualDoctorRoute.get("/get-individualdoctor-count-superadmin-dashboard", individualDoctor.totalIndividualDoctorforAdminDashboard);

individualDoctorRoute.post("/send-external-user-email", individualDoctor.sendEmailtojoinexternaluser);



export default individualDoctorRoute;