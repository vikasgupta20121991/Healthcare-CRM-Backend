"use strict";

import express from "express";
import HospitalController from "../controllers/hospital/hospitalController";
import validate from "../controllers/hospital/hopsital.validate";
import { verifyToken } from "../helpers/verifyToken";
const hospitalRoute = express.Router();

hospitalRoute.use(verifyToken);

//For Hospital
// hospitalRoute.get('/list-all-hospital-admin-user', HospitalController.listAllHospitalAdminUser)
// hospitalRoute.post('/approve-or-reject-hospital', validate.approveOrRejectHospital, HospitalController.approveOrRejectHospital)
// hospitalRoute.get('/view-hospital-admin-details', validate.viewHospitalAdminDetails ,HospitalController.viewHospitalAdminDetails)

export default hospitalRoute;