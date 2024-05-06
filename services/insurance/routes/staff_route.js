"use strict";

import express from "express";
const { check, validationResult} = require("express-validator");
const staffController = require("../controllers/staff/staff");
import { staffValidator,editStaffValidator } from "../validator/staff";
const staffRoute = express.Router();

staffRoute.post("/add-staff",staffValidator,
(req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.json({
            status:false,
            message:'form validation message',
            error:errors.array()
        })
    }
    next();
}
, staffController.add_staff);
staffRoute.put("/edit-staff",editStaffValidator,(req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.json({
            status:false,
            message:'form validation message',
            error:errors.array()
        })
    }
    next();
}, staffController.edit_staff);
staffRoute.put("/delete-staff", staffController.delete_staff);
staffRoute.get("/all-staff", staffController.all_staff);

export default staffRoute;