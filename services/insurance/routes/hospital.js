"use strict";

import express from "express";
import { user} from "../controllers/hospital";
import {
  //insurancr user validator
  adminSignupValidator,
  hospitalProfileValidator,
  loginValidator
} from "../validator/hospital";
import { dataValidation } from "../helpers/transmission";
import multer from "multer";

const hospital = express.Router();

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/hospitalLogos/');
  },
  filename: (req, file, cb) => {
    console.log(file);
    var filetype = '';
    if(file.mimetype === 'image/gif') {
      filetype = 'jpeg';
    }
    if(file.mimetype === 'image/png') {
      filetype = 'png';
    }
    if(file.mimetype === 'image/jpeg') {
      filetype = 'jpg';
    }
    cb(null, 'image-' + Date.now() + '.' + filetype);
  }
});
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB (max file size)
  },
});


//hospital user
hospital.post(
  "/admin-signup",
  adminSignupValidator,
  dataValidation,
  user.adminSignUp
);
hospital.post(
  "/create-staff",
  adminSignupValidator,
  dataValidation,
  user.createStaff
);
hospital.post(
  "/create-hospital-profile",
  upload.single('hospitalLogo'),
  hospitalProfileValidator,
  user.editHospitalProfile
);
hospital.put(
  "/edit-hospital-profile",
  upload.single('hospitalLogo'),
  hospitalProfileValidator,
  dataValidation,
  user.editHospitalProfile
);

export default hospital;
