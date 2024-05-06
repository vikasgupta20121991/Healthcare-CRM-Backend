"use strict";

import express from "express";
import SpecialityController from "../controllers/speciality/specialityController";
import validate from "../controllers/speciality/speciality.validate";
import { verifyToken } from "../helpers/verifyToken";
const specialityRoute = express.Router();

specialityRoute.get('/speciality-list',  SpecialityController.list)
specialityRoute.use(verifyToken);
//For Hospital
specialityRoute.post('/add',  SpecialityController.create)
specialityRoute.post('/update',  SpecialityController.update)
specialityRoute.post('/action', SpecialityController.delete)

export default specialityRoute;