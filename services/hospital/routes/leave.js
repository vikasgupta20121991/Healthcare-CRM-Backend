"use strict";

import express from "express";
import { addLeave, getAllMyLeave, hospitalIds,getAllParticularHospitalLeave, LeaveAccept, LeaveReject, getAllAcceptedLeave, getAllMyDoctorStaffLeave, getAllMyStaffLeaves, StaffLeaveAccept, StaffLeaveReject, getAllMyHospitalStaffLeave, getAllMyHospitalStaffLeaves, HospitalStaffLeaveAccept, HospitalStaffLeaveReject } from "../controllers/leave_contoller";
const leaveManagementRoute = express.Router();

leaveManagementRoute.post("/add-leave",addLeave);
leaveManagementRoute.get("/get-myleave",getAllMyLeave);
leaveManagementRoute.post("/hospitalIds",hospitalIds);
leaveManagementRoute.get("/particularhospitalleave-list",getAllParticularHospitalLeave);
leaveManagementRoute.put("/leave-accept",LeaveAccept);
leaveManagementRoute.put("/leave-reject",LeaveReject);
leaveManagementRoute.get("/doctorstaffleave-list",getAllMyDoctorStaffLeave);

leaveManagementRoute.get("/staffallleave-list",getAllMyStaffLeaves);
leaveManagementRoute.put("/staffleave-accept",StaffLeaveAccept);
leaveManagementRoute.put("/staffleave-reject",StaffLeaveReject);
leaveManagementRoute.get("/hospitalstaffleavelist-list",getAllMyHospitalStaffLeave);

leaveManagementRoute.get("/hospitalstaffallleave-list",getAllMyHospitalStaffLeaves);

leaveManagementRoute.put("/hospitalstaffleave-accept",HospitalStaffLeaveAccept);
leaveManagementRoute.put("/hospitalstaffleave-reject",HospitalStaffLeaveReject);

export default leaveManagementRoute;