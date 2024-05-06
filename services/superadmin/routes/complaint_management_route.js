"use strict";

import express from "express";
import ComplaintManagementController from "../controllers/complaintManagement/complaintManagement";
import { verifyToken } from "../helpers/verifyToken";
const complaintManagementRoute = express.Router();

complaintManagementRoute.use(verifyToken);


complaintManagementRoute.get('/all-complaint-management', ComplaintManagementController.allComplaintManagement);
complaintManagementRoute.post('/add-complaint-management', ComplaintManagementController.addComplaintManagement);
complaintManagementRoute.get('/allDetails-complaint-management', ComplaintManagementController.allDetails);
complaintManagementRoute.put('/add-response', ComplaintManagementController.add_updateResponse);



export default complaintManagementRoute;