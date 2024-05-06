"use strict";

import express from "express";
import { FourPortalStaffLeaveAccept, FourPortalStaffLeaveReject, addLeaves, fourPortalLeaveAcceptInDoctor, fourPortalLeaveRejectInDoctor, getAllDentalLeave, getAllLaboratoryLeave, getAllMyLeaveFourPortal, getAllOpticalLeave, getAllParaMedicalLeave, getAllStaffLeave_instaffPortal, getallStaffLeavesInfourPortal } from "../controllers/leave_management";

const leaveManagementsRoute = express.Router();


leaveManagementsRoute.post("/addfourPortalleave",addLeaves);
leaveManagementsRoute.get("/getLeavelistforstaffportal",getAllStaffLeave_instaffPortal);
leaveManagementsRoute.get("/getallStaffleavesInfourportal",getallStaffLeavesInfourPortal);
leaveManagementsRoute.put("/fourportalstaffleaveaccept",FourPortalStaffLeaveAccept);
leaveManagementsRoute.put("/fourportalstaffleavereject",FourPortalStaffLeaveReject);
leaveManagementsRoute.get("/getAllMyLeaveFourPortal",getAllMyLeaveFourPortal);
leaveManagementsRoute.get("/getAllLaboratoryLeave",getAllLaboratoryLeave);
leaveManagementsRoute.get("/getAllDentalLeave",getAllDentalLeave);
leaveManagementsRoute.get("/getAllOpticalLeave",getAllOpticalLeave);
leaveManagementsRoute.get("/getAllParaMedicalLeave",getAllParaMedicalLeave);
leaveManagementsRoute.put("/fourPortalLeaveAcceptInDoctor",fourPortalLeaveAcceptInDoctor);
leaveManagementsRoute.put("/fourPortalLeaveRejectInDoctor",fourPortalLeaveRejectInDoctor);


export default leaveManagementsRoute;
