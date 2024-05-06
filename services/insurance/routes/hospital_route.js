"use strict";

import express from "express";
import HospitalController from "../controllers/hospital/hospitalController";
import validate from "../controllers/hospital/hospital.validate";
import { verifyToken } from "../helpers/verifyToken";
const hospitalRoute = express.Router();
hospitalRoute.use(verifyToken);

hospitalRoute.post("/assign-staff", validate.assignStaff, HospitalController.assignStaff);
hospitalRoute.get("/list-assigned-staff", HospitalController.listAssignedStaff);

export default hospitalRoute;