"use strict";

import mongoose from "mongoose";
// models
import PortalUser from "../models/portal_user";
import HospitalAdminInfo from "../models/hospital_admin_info";
import ProfileInfo from "../models/profile_info";
import LocationInfo from "../models/location_info";
import HospitalLocation from "../models/hospital_location";
import PathologyTestInfo from "../models/pathology_test_info";
import PathologyTestInfoNew from "../models/pathologyTestInfoNew";
import BankDetailInfo from "../models/bank_detail";
import MobilePayInfo from "../models/mobile_pay";
import DoctorInfo from "../models/doctor_info";
import StaffInfo from "../models/staff_info";
import BasicInfo from "../models/basic_info";
import EducationalDetail from "../models/educational_details";
import DoctorAvailability from "../models/doctor_availability";
import FeeManagement from "../models/fee_management";
import DocumentInfo from "../models/document_info";
import DocumentManagement from "../models/document_management";
import Counter from "../models/counter";
import Appointment from "../models/appointment";
import ReviewAndRating from "../models/review";
import Template from "../models/template";
import Eprescription from "../models/eprescription";
import EprescriptionMedicineDosage from "../models/eprescription_medicine_dosage";
import EprescriptionLab from "../models/eprescription_lab";
import EprescriptionImaging from "../models/eprescription_imaging";
import EprescriptionVaccination from "../models/eprescription_vaccination";
import EprescriptionEyeglass from "../models/eprescription_eyeglass";
import EprescriptionOther from "../models/eprescription_other";
import location_info from "../models/location_info";
import HospitalType from "../models/hospitalType";
import { notification } from "../helpers/notification";
// utils
import { sendResponse } from "../helpers/transmission";
import { formatDateAndTime, formatDateAndTimeNew, processExcel } from "../middleware/utils"
import { hashPassword, formatString } from "../helpers/string";
import Http from "../helpers/httpservice"
import { getDocument, downloadSignedUrl, getBys3UrlDocument } from "../helpers/s3";
import { sendHospitalDoctorCred, verifyEmail2fa, sendEprescriptionEmail } from "../helpers/emailTemplate";
const httpService = new Http()
import { sendEmail } from "../helpers/ses";

import { getNextSequenceValue } from "../middleware/utils";
import SubscriptionPurchaseStatus from "../models/subscription/purchasestatus";
import { updatePaymentStatusAndSlot } from "./hospital_controller"
import moment from "moment";
import { HealthCenterColumns, config } from "../config/constants";
import { encryptObjectData } from "../middleware/utils";
import { log } from "console";
import Notification from "../models/notification"
import Specialty from "../models/specialty_info"
import "dotenv/config.js";


const fs = require("fs");

const validateColumnWithExcel = (toValidate, excelColumn) => {
  const requestBodyCount = Object.keys(toValidate).length;
  const fileColumnCount = Object.keys(excelColumn).length;
  if (requestBodyCount !== fileColumnCount) {
    return false;
  }

  let index = 1;
  for (const iterator of Object.keys(excelColumn)) {
    if (iterator !== toValidate[`col${index}`]) {
      return false;
    }
    index++;
  }
  return true;
};

export const updateSlotAvailability = async (hospitalId, notificationReceiver, timeStamp, req) => {
  console.log(hospitalId, "====", notificationReceiver, "====", timeStamp);

  var timeStampString
  var slot = null

  const headers = {
    'Authorization': req.headers['authorization']
  }
  for (let index = 0; index < 3; index++) {
    const resData = await httpService.postStaging('hospital/doctor-available-slot',
      {
        locationId: hospitalId,
        doctorId: notificationReceiver,
        appointmentType: 'ONLINE',
        timeStamp: timeStamp
      }, headers, 'hospitalServiceUrl');

    // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
    // timeStamp = new Date(timeStampString)
    const slots = resData?.body?.allGeneralSlot

    //console.log("SLOTSssssssss_______", slots)
    let isBreak = false
    if (slots) {
      for (let index = 0; index < slots.length; index++) {
        const element = slots[index];
        if (element.status == 0) {
          slot = element
          isBreak = true
          break
        }
      }
    }

    if (slot != null) {
      isBreak = true
      break
    }

    if (!isBreak) {
      //console.log("isBreakkk_______");
      timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
      timeStamp = new Date(timeStampString)
    }
  }

  if (slot != null) {
    const basicInfo = await BasicInfo.findOneAndUpdate(
      { for_portal_user: { $eq: notificationReceiver } },
      {
        $set: {
          nextAvailableSlot: slot.slot,
          nextAvailableDate: timeStamp
        },
      },

      { upsert: false, new: true }
    ).exec();
    // update data in basic info
  }
}

export const addTestsForMngDoc = async (pathologyInfo, id) => {
  // console.log(pathologyInfo, "pathologyInfooo___", id);
  var pathologyTestData
  for (const test of pathologyInfo) {
    //console.log(pathologyInfo,"pathologyInfooo_____");
    try {
      const existingTest = await PathologyTestInfoNew.findOne({
        for_portal_user: id,
        typeOfTest: test.typeOfTest,
        nameOfTest: test.nameOfTest
      });

      if (existingTest) {
        console.log("alreadyExisttt_______");
        //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
      } else {
        console.log("inside_elsee_____");
        if (test.isExist === false) {
          pathologyTestData = await PathologyTestInfoNew.create({
            for_portal_user: id,
            typeOfTest: test.typeOfTest,
            nameOfTest: test.nameOfTest,
            isExist: true
          });
        }

      }
    } catch (error) {
      console.error('Erroroccurreddddd:', error);
      // Handle the error as needed
    }
  }
}

class HospitalDoctor {
  async addStaff(req, res) {
    try {
      const {
        first_name,
        middle_name,
        last_name,
        email,
        password,
        phone_number,
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        nationality,
        country,
        state,
        city,
        zip,
        degree,
        role,
        for_doctor,
        in_hospital,
      } = req.body;
      const portalInput = {
        first_name,
        middle_name,
        last_name, email, password, phone_number
      };
      const profileInput = {
        name: first_name + ' ' + middle_name + ' ' + last_name,
        first_name,
        middle_name,
        last_name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
      };
      const locationInput = { nationality, country, state, city, zip };
      const staffInput = { degree, role, for_doctor, in_hospital };
      const passwordHash = await hashPassword(password);
      var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
      const userDetails = new PortalUser({

        email,
        userId: sequenceDocument.sequence_value,
        password: passwordHash,
        phone_number,
        verified: false,
        role: "HOSPITAL_STAFF",
      });
      const userData = await userDetails.save();
      const locationInfo = new LocationInfo({
        nationality: nationality == '' ? null : nationality,
        country: country == '' ? null : country,
        state: state == '' ? null : state,
        city: city == '' ? null : city,
        zip,
        for_portal_user: userData._id,
      });
      const locationData = await locationInfo.save();
      const profileInfo = new ProfileInfo({
        name: first_name + ' ' + middle_name + ' ' + last_name,
        first_name,
        middle_name,
        last_name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        in_location: locationData._id,
        for_portal_user: userData._id,
      });
      const profileData = await profileInfo.save();
      const staffInfo = new StaffInfo({
        degree,
        role,
        for_doctor,
        in_profile: profileData._id,
        in_hospital,
        for_portal_user: userData._id,
      });
      const staffData = await staffInfo.save();
      sendResponse(req, res, 200, {
        status: true,
        body: { staffData },
        message: "successfully created hospital staff",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to create hospital staff",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateStaffDetails(req, res) {
    try {
      const {
        for_portal_user,
        user_name,
        phone_number,
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        nationality,
        country,
        state,
        city,
        zip,
        degree,
        role,
        for_doctor,
        in_hospital,
      } = req.body;
      const portalInput = { user_name, phone_number };
      const profileInput = {
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
      };
      const locationInput = { nationality, country, state, city, zip };
      const staffInput = { degree, role, for_doctor, in_hospital };
      const userData = PortalUser.updateOne(
        { _id: for_portal_user },
        {
          $set: {
            user_name,
            phone_number,
            role: "HOSPITAL_STAFF",
          },
        },
        { new: true }
      ).exec();

      const locationData = LocationInfo.updateOne(
        { for_portal_user },
        {
          $set: {
            nationality,
            country,
            state,
            city,
            zip,
          },
        },
        { new: true }
      ).exec();

      const profileData = ProfileInfo.updateOne(
        { for_portal_user },
        {
          $set: {
            name,
            dob,
            language,
            gender,
            address,
            about,
            profile_picture,
          },
        },
        { new: true }
      ).exec();

      const staffData = StaffInfo.updateOne(
        { for_portal_user, in_hospital },
        {
          $set: {
            degree,
            role,
            for_doctor,
          },
        },
        { new: true }
      ).exec();

      await Promise.all([userData, locationData, profileData, staffData]);

      sendResponse(req, res, 200, {
        status: true,
        body: { staffData },
        message: "successfully updated hospital staff",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to updated hospital staff",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteStaff(req, res) {
    try {
      const { for_portal_user, in_hospital } = req.body;
      const portalUser = PortalUser.deleteOne(
        { _id: for_portal_user, in_hospital },
        { new: true }
      ).exec();
      const locationData = LocationInfo.deleteOne(
        { for_portal_user },
        { new: true }
      ).exec();
      const profileData = ProfileInfo.deleteOne(
        { for_portal_user },
        { new: true }
      ).exec();
      const staffData = StaffInfo.deleteOne(
        { for_portal_user, in_hospital },
        { new: true }
      ).exec();
      const DocumentData = DocumentInfo.deleteMany(
        { for_portal_user },
        { new: true }
      ).exec();
      await Promise.all([
        portalUser,
        locationData,
        profileData,
        staffData,
        DocumentData,
      ]);
      sendResponse(req, res, 200, {
        status: true,
        body: { staffData },
        message: "successfully deleted hospital staff",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to delete hospital staff",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addDoctor(req, res) {
    try {
      const {
        user_name,
        email,
        password,
        phone_number,
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        nationality,
        country,
        state,
        city,
        zip,
        title,
        exp_years,
        unite,
        licence_number,
        as_staff,
        specilaization,
        act,
        in_hospital,
      } = req.body;
      const portalInput = { user_name, email, password, phone_number };
      const profileInput = {
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
      };
      const locationInput = { nationality, country, state, city, zip };
      const doctorInput = {
        title,
        exp_years,
        unite,
        as_staff,
        licence_number,
        specilaization,
        act,
        in_hospital,
      };
      const passwordHash = await hashPassword(password);
      const userDetails = new PortalUser({
        user_name,
        email,
        password: passwordHash,
        phone_number,
        verified: false,
        role: "HOSPITAL_DOCTOR",
      });
      const userData = await userDetails.save();
      const locationInfo = new LocationInfo({
        nationality,
        country,
        state,
        city,
        zip,
        for_portal_user: userData._id,
      });
      const locationData = await locationInfo.save();
      const profileInfo = new ProfileInfo({
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        in_location: locationData._id,
        for_portal_user: userData._id,
      });
      const profileData = await profileInfo.save();
      const doctorInfo = new DoctorInfo({
        in_profile: profileData._id,
        title,
        exp_years,
        unite,
        licence_number,
        as_staff,
        specilaization,
        act,
        in_hospital,
        for_portal_user: userData._id,
      });
      const doctorDetails = await doctorInfo.save();
      sendResponse(req, res, 200, {
        status: true,
        body: { doctorDetails },
        message: "successfully created doctor",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to create doctor",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateDoctorDetails(req, res) {
    try {
      const {
        for_portal_user,
        user_name,
        phone_number,
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
        nationality,
        country,
        state,
        city,
        zip,
        title,
        exp_years,
        unite,
        licence_number,
        as_staff,
        specilaization,
        act,
        in_hospital,
      } = req.body;
      // console.log(req.body);
      const portalInput = { user_name, phone_number };
      const profileInput = {
        name,
        dob,
        language,
        gender,
        address,
        about,
        profile_picture,
      };
      const locationInput = { nationality, country, state, city, zip };
      const doctorInput = {
        title,
        exp_years,
        unite,
        as_staff,
        licence_number,
        specilaization,
        act,
        in_hospital,
      };
      const userData = PortalUser.updateOne(
        { _id: for_portal_user },
        {
          $set: {
            user_name,
            phone_number,
            role: "HOSPITAL_DOCTOR",
          },
        },
        { new: true }
      ).exec();

      const locationData = LocationInfo.updateOne(
        { for_portal_user },
        {
          $set: {
            nationality,
            country,
            state,
            city,
            zip,
          },
        },
        { new: true }
      ).exec();

      const profileData = ProfileInfo.updateOne(
        { for_portal_user },
        {
          $set: {
            name,
            dob,
            language,
            gender,
            address,
            about,
            profile_picture,
          },
        },
        { new: true }
      ).exec();

      const doctorDetails = DoctorInfo.updateOne(
        { for_portal_user, in_hospital },
        {
          $set: {
            title,
            exp_years,
            unite,
            licence_number,
            as_staff,
            specilaization,
            act,
          },
        },
        { new: true }
      ).exec();

      await Promise.all([userData, locationData, profileData, doctorDetails]);
      sendResponse(req, res, 200, {
        status: true,
        body: { doctorDetails },
        message: "successfully updated doctor details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to update doctor details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDoctor(req, res) {
    try {
      const { for_portal_user, in_hospital } = req.body;
      const portalUser = PortalUser.deleteOne(
        { _id: for_portal_user, in_hospital },
        { new: true }
      ).exec();
      const locationData = LocationInfo.deleteOne(
        { for_portal_user },
        { new: true }
      ).exec();
      const profileData = ProfileInfo.deleteOne(
        { for_portal_user },
        { new: true }
      ).exec();
      const doctorData = DoctorInfo.deleteOne(
        { for_portal_user, in_hospital },
        { new: true }
      ).exec();
      const doctorAvailabilityData = DoctorAvailability.deleteOne(
        { for_portal_user, for_hospital: in_hospital },
        { new: true }
      ).exec();
      const educationalData = EducationalDetail.deleteMany(
        { for_portal_user },
        { new: true }
      ).exec();
      const DocumentData = DocumentInfo.deleteMany(
        { for_portal_user },
        { new: true }
      ).exec();
      await Promise.all([
        portalUser,
        locationData,
        profileData,
        doctorData,
        doctorAvailabilityData,
        educationalData,
        DocumentData,
      ]);
      sendResponse(req, res, 200, {
        status: true,
        body: { doctorData },
        message: "successfully deleted hospital doctor",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to delete hospital doctor",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addDoctorEducation(req, res) {
    try {
      const educationalData = await EducationalDetail.insertMany(req.body);
      sendResponse(req, res, 200, {
        status: true,
        body: { educationalData },
        message: "successfully updated doctor educational details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to update doctor educational details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDoctorEducation(req, res) {
    try {
      const { _id, for_portal_user } = req.body;
      const educationalData = await EducationalDetail.deleteOne(
        { _id, for_portal_user },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { educationalData },
        message: "successfully deleted doctor educational details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to delete doctor educational details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateDoctorEducation(req, res) {
    try {
      const { _id, for_portal_user, course, university, start_date, end_date } =
        req.body;
      const educationalData = await EducationalDetail.updateOne(
        { _id, for_portal_user },
        {
          $set: {
            course,
            university,
            start_date,
            end_date,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { educationalData },
        message: "successfully updated doctor educational details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to update doctor educational details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addDoctorAvailability(req, res) {
    try {
      const {
        week_days,
        slot_interval,
        appointment_type,
        unavailability_slot,
        for_hospital,
        for_portal_user,
      } = req.body;
      const doctorAvailability = new DoctorAvailability({
        week_days,
        slot_interval,
        appointment_type,
        unavailability_slot,
        for_hospital,
        for_portal_user,
      });
      const doctorAvailableDetails = await doctorAvailability.save();
      sendResponse(req, res, 200, {
        status: true,
        body: { doctorAvailableDetails },
        message: "successfully added doctor availability details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add doctor availability details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDoctorAvailability(req, res) {
    try {
      const { _id, for_portal_user } = req.body;
      const availabilityData = await DoctorAvailability.deleteOne(
        { _id, for_portal_user },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { availabilityData },
        message: "successfully deleted doctor availability details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to delete doctor availability details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateDoctorAvailability(req, res) {
    try {
      const {
        _id,
        week_days,
        slot_interval,
        appointment_type,
        unavailability_slot,
        for_hospital,
        for_portal_user,
      } = req.body;
      const doctorAvailableDetails = await DoctorAvailability.updateOne(
        { _id, for_portal_user },
        {
          $set: {
            week_days,
            slot_interval,
            appointment_type,
            unavailability_slot,
            for_hospital,
            for_portal_user,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { doctorAvailableDetails },
        message: "successfully updated doctor availability details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to update doctor availability details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateDoctorConsultation(req, res) {
    try {
      const { for_portal_user, consultation_fee } = req.body;
      const consultationFee = await DoctorInfo.updateOne(
        { for_portal_user },
        { $set: { consultation_fee } },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { consultationFee },
        message: "successfully updated doctor consultation details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to update doctor consultation details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDoctorConsultation(req, res) {
    try {
      const { for_portal_user } = req.body;
      const consultationFee = await DoctorInfo.updateOne(
        { for_portal_user },
        { $set: { consultation_fee: [] } },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { consultationFee },
        message: "successfully deleted doctor consultation details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to delete doctor consultation details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listHospitalDoctor(req, res) {
    try {
      const { in_hospital, limit, page } = req.body;
      const result = await DoctorInfo.find({
        in_hospital: { $eq: in_hospital },
      })
        .select({
          specilaization: 1,
          _id: 1,
          exp_years: 1,
          unite: 1,
          licence_number: 1,
        })
        .populate({
          path: "in_profile",
          select: { _id: 1, name: 1 },
        })
        .populate({
          path: "for_portal_user",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
        })
        .sort([["createdAt", -1]])
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
      const count = await DoctorInfo.countDocuments({
        in_hospital: { $eq: in_hospital },
      });
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalRecords: count,
          result,
        },
        message: "successfully fetched doctor list",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to fetch doctor list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listHospitalStaff(req, res) {
    try {
      const { in_hospital, limit, page } = req.body;
      const result = await StaffInfo.find({ in_hospital: { $eq: in_hospital } })
        .select({ is_active: 1, _id: 1, lock_user: 1, role: 1, created_at: 1 })
        .populate({
          path: "in_profile",
          select: { _id: 1, name: 1 },
        })
        .populate({
          path: "for_portal_user",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
        })
        .sort([["createdAt", -1]])
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
      const count = await StaffInfo.countDocuments({
        in_hospital: { $eq: in_hospital },
      });
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalRecords: count,
          result,
        },
        message: "successfully fetched staff list",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to fetch staff list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async viewHospitalDoctor(req, res) {
    try {
      const { in_hospital, for_portal_user } = req.body;
      const result = await DoctorInfo.find({ in_hospital, for_portal_user })
        .select({
          specilaization: 1,
          _id: 1,
          exp_years: 1,
          unite: 1,
          licence_number: 1,
        })
        .populate({
          path: "in_profile",
          populate: {
            path: "in_location",
            model: "LocationInfo",
          },
          model: "ProfileInfo",
        })
        .populate({
          path: "for_portal_user",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
          model: "PortalUser",
        })
        .populate({
          path: "as_staff",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
          model: "PortalUser",
        })
        .exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "successfully fetched doctor details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to fetch doctor details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async viewHospitalStaff(req, res) {
    try {
      const { in_hospital, for_portal_user } = req.body;
      const result = await StaffInfo.find({ in_hospital, for_portal_user })
        .select({ degree: 1, _id: 1, role: 1, is_active: 1, lock_user: 1 })
        .populate({
          path: "in_profile",
          populate: {
            path: "in_location",
            model: "LocationInfo",
          },
          model: "ProfileInfo",
        })
        .populate({
          path: "for_portal_user",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
          model: "PortalUser",
        })
        .populate({
          path: "for_doctor",
          select: { _id: 1, email: 1, user_name: 1, phone_number: 1 },
          model: "PortalUser",
        })
        .exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "successfully fetched staff details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to fetch staff details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async saveDocumentMetadata(req, res) {
    try {
      const {
        name,
        e_tag,
        code,
        issued_date,
        expiry_date,
        url,
        for_portal_user,
      } = req.body;
      const documentMetadata = new DocumentInfo({
        name,
        e_tag,
        code,
        issued_date,
        expiry_date,
        url,
        is_deleted: false,
        for_portal_user,
      });
      const documentDetail = await documentMetadata.save();
      sendResponse(req, res, 200, {
        status: true,
        body: { documentDetail },
        message: "successfully added document details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add document details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDocumentMetadata(req, res) {
    try {
      const { _id, code, for_portal_user } = req.body;
      const documentDetail = await DocumentInfo.updateOne(
        {
          _id,
          code,
          for_portal_user,
        },
        {
          $set: { is_deleted: true },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: { documentDetail },
        message: "successfully deleted document details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to delete document details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listDocumentMetadata(req, res) {
    try {
      const { for_portal_user, limit, page, code } = req.body;
      const result = await DocumentInfo.find({
        for_portal_user: { $eq: for_portal_user },
        code: { $eq: code },
      })
        .sort([["createdAt", -1]])
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
      const count = await DoctorInfo.countDocuments({
        for_portal_user: { $eq: for_portal_user },
      });
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalRecords: count,
          result,
        },
        message: "successfully fetched document list",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to fetch document list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async doctorManagementBasicInfo(req, res) {
    //Add or update document
    const { id, for_hospital, pathologyInfo,
      doctor_profile_object_id,
      first_name, middle_name,
      last_name, loc, address, neighborhood, country, region,
      province, location_department, city, village,
      pincode, mobile, country_code, dob, designation,
      title, years_of_experience, assign_doctor, assign_staff, email,
      gender, spoken_language, password, urgent_care_service, about,
      license_number, license_expiry_date, license_image_object_id, team,
      speciality, services, department, unit, expertise,
      medical_act_performed, lab_test_performed, imaging_performed,
      vaccination_performed, other_test, bank_name, account_holder_name, account_number, ifsc_code, bank_address, mobile_pay_details, appointment_accepted } = req.body
    try {
      if (for_hospital != '') {
        console.log("run11111111111111111")
        const doctorCount = await PortalUser.countDocuments({ created_by_user: for_hospital, isDeleted: false, role: "HOSPITAL_DOCTOR" });
        const checkPlan = await SubscriptionPurchaseStatus.find({ for_user: for_hospital });
        let checkCondition;
        checkCondition = await getData(checkPlan);

        if (checkCondition?.statusData === "active") {
          let shouldAddDoctor = false;
          for (const data12 of checkCondition?.data1?.services) {
            if (data12?.name === 'doctor' && data12?.is_unlimited === false) {
              if (doctorCount < data12?.max_number) {
                shouldAddDoctor = true;
                break; // Exit the inner loop if conditions are satisfied
              } else {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "Unable to add Hospital Doctor. As Hospital Doctor Maximum limit has exceeded as per your purchased plan.",
                  errorCode: null,
                });
              }
            }
          }

          if (shouldAddDoctor) {
            console.log("insidee____");
            //Check email exist

            //Create account for doctor
            let portal_user_id = ''
            if (id) {

              const CheckEmail = await PortalUser.findOne({ email: email, _id: { $ne: id }, isDeleted: false })
              console.log(CheckEmail, "CheckEmailll____");
              if (CheckEmail) {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "Email already exists",
                  errorCode: "INTERNAL_SERVER_ERROR",
                })
              }

              portal_user_id = id;
              let portaluserdatanew = { email, country_code, mobile, full_name: `${first_name} ${middle_name} ${last_name}` };

              if (doctor_profile_object_id) {
                portaluserdatanew.profile_picture = doctor_profile_object_id;
                // Check if `doctor_profile_object_id` exists in `documentinfos` collection
                const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });
                if (documentInfo) {
                  portaluserdatanew.profile_picture = documentInfo?.url; // Use the document data
                }
              }

              await PortalUser.findOneAndUpdate({ _id: { $eq: id } }, {
                $set: portaluserdatanew
              }).exec();
            } else {
              const CheckEmail = await PortalUser.findOne({ email: email, isDeleted: false })
              if (CheckEmail) {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "Email already exists",
                  errorCode: "INTERNAL_SERVER_ERROR",
                })
              }
              const passwordHash = await hashPassword(password);
              const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL_DOCTOR', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), created_by_user: for_hospital }
              // if (doctor_profile_object_id) {
              //   accountData.profile_picture = doctor_profile_object_id
              // }
              if (doctor_profile_object_id) {
                accountData.profile_picture = doctor_profile_object_id;
                // Check if `doctor_profile_object_id` exists in `documentinfos` collection
                const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });
                if (documentInfo) {
                  accountData.profile_picture = documentInfo?.url; // Use the document data
                }
              }
              const portal_user = new PortalUser(accountData)

              const portalData = await portal_user.save()
              const content = sendHospitalDoctorCred(email, password)
              await sendEmail(content)
              portal_user_id = portalData._id
            }

            const accountType = await PortalUser.findById(portal_user_id).select('role').exec();
            //Store Location details
            let locationObject = {
              loc: loc == '' ? null : loc,
              address: address == '' ? null : address,
              neighborhood: neighborhood == '' ? null : neighborhood,
              country: country == '' ? null : country,
              region: region == '' ? null : region,
              province: province == '' ? null : province,
              department: location_department == '' ? null : location_department,
              city: city == '' ? null : city,
              village: village == '' ? null : village,
              pincode: pincode == '' ? null : pincode

            }
            let locationResult
            const getLocationInfo = await LocationInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('address');
            if (id && getLocationInfo.length > 0) {
              locationResult = await LocationInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: locationObject
              }, { new: true }).exec();
            } else {
              locationObject.for_portal_user = portal_user_id
              const locationData = new LocationInfo(locationObject);
              locationResult = await locationData.save()
            }
            const location_object_id = locationResult._id

            //Store Bank information
            const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address }
            let bankResult
            const getBankDetailInfo = await BankDetailInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('_id').exec();
            if (id && getBankDetailInfo.length > 0) {
              bankResult = await BankDetailInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: bankObject
              }).exec();
            } else {
              bankObject.for_portal_user = portal_user_id
              const bankData = new BankDetailInfo(bankObject);
              bankResult = await bankData.save()
            }
            const bank_object_id = bankResult._id
            // Store Mobile Pay details
            let dataArray = []
            for (const data of mobile_pay_details) {
              dataArray.push({
                provider: data.provider,
                pay_number: data.pay_number,
                mobile_country_code: data?.mobile_country_code
              })
            }
            let mobilePayResult
            const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: portal_user_id }).select('_id').exec();
            if (id && getMobilePayInfo.length > 0) {
              mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: { mobilePay: dataArray }
              }).exec();
            } else {
              const mobilePayData = new MobilePayInfo({
                mobilePay: dataArray,
                for_portal_user: portal_user_id
              })
              mobilePayResult = await mobilePayData.save()
            }
            const mobile_pay_object_id = mobilePayResult._id

            // Store Basic Info of doctor
            let license_details_object = {
              license_number, license_expiry_date
            }
            if (license_image_object_id) {
              license_details_object['image'] = license_image_object_id
            }
            let basicInfoData = {
              first_name, middle_name, last_name, full_name: formatString(`${first_name} ${middle_name} ${last_name}`),
              main_phone_number: mobile,
              dob, designation, title, years_of_experience, assign_doctor, assign_staff, gender, spoken_language,
              urgent_care_service, about, license_details: license_details_object, team, speciality,
              services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
              vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
              in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted
            }
            if (accountType?.role != 'INDIVIDUAL_DOCTOR') {
              basicInfoData.verify_status = 'APPROVED'
              basicInfoData.isInfoCompleted = true
            }

            if (doctor_profile_object_id) {
              basicInfoData.profile_picture = doctor_profile_object_id
            }
            if (id) {
              basicInfoData.isInfoCompleted = true
              await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: basicInfoData
              }).exec();

              var pathologyTestData
              for (const test of pathologyInfo) {
                try {
                  const existingTest = await PathologyTestInfoNew.findOne({
                    for_portal_user: id,
                    typeOfTest: test.typeOfTest,
                    nameOfTest: test.nameOfTest
                  });

                  if (existingTest) {
                    //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
                  } else {
                    if (test.isExist === false) {
                      pathologyTestData = await PathologyTestInfoNew.create({
                        for_portal_user: id,
                        typeOfTest: test.typeOfTest,
                        nameOfTest: test.nameOfTest,
                        isExist: true
                      });
                    }

                  }
                } catch (error) {
                  console.error('Erroroccurreddddd:', error);
                  // Handle the error as needed
                }
              }

            } else {

              basicInfoData['approved_at'] = new Date()
              basicInfoData['approved_or_rejected_by'] = for_hospital
              basicInfoData['for_hospital'] = for_hospital
              basicInfoData['for_hospitalIds'] = for_hospital
              basicInfoData['for_portal_user'] = portal_user_id
              const basicInfoDataResult = new BasicInfo(basicInfoData)
              console.log(basicInfoDataResult, "basicInfoDataResulttt__");
              const result = await basicInfoDataResult.save()
              await addTestsForMngDoc(pathologyInfo, result.for_portal_user)

            }
            sendResponse(req, res, 200, {
              status: true,
              data: { portal_user_id },
              message: `doctor basic info ${id ? 'updated' : 'added'} successfully`,
              errorCode: null,
            });
          } else {
            //Check email exist

            //Create account for doctor
            let portal_user_id = ''
            if (id) {
              const CheckEmail = await PortalUser.findOne({ email: email, _id: { $ne: id }, isDeleted: false })
              if (CheckEmail) {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "Email already exists",
                  errorCode: "INTERNAL_SERVER_ERROR",
                })
              }
              // portal_user_id = id
              // let portaluserdatanew = { country_code, mobile, full_name: `${first_name} ${middle_name} ${last_name}` };
              // if (doctor_profile_object_id) {
              //   portaluserdatanew.profile_picture = doctor_profile_object_id
              // }
              // await PortalUser.findOneAndUpdate({ _id: { $eq: id } }, {
              //   $set: portaluserdatanew
              // }).exec();

              portal_user_id = id;
              let portaluserdatanew = { email, country_code, mobile, full_name: `${first_name} ${middle_name} ${last_name}` };

              if (doctor_profile_object_id) {
                portaluserdatanew.profile_picture = doctor_profile_object_id;
                // Check if `doctor_profile_object_id` exists in `documentinfos` collection
                const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });
                if (documentInfo) {
                  portaluserdatanew.profile_picture = documentInfo?.url; // Use the document data
                }
              }

              await PortalUser.findOneAndUpdate({ _id: { $eq: id } }, {
                $set: portaluserdatanew
              }).exec();
            } else {
              const CheckEmail = await PortalUser.findOne({ email: email, isDeleted: false })
              if (CheckEmail) {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "Email already exists",
                  errorCode: "INTERNAL_SERVER_ERROR",
                })
              }
              const passwordHash = await hashPassword(password);
              const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL_DOCTOR', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), created_by_user: for_hospital }
              // if (doctor_profile_object_id) {
              //   accountData.profile_picture = doctor_profile_object_id
              // }
              if (doctor_profile_object_id) {
                accountData.profile_picture = doctor_profile_object_id;
                // Check if `doctor_profile_object_id` exists in `documentinfos` collection
                const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });
                if (documentInfo) {
                  accountData.profile_picture = documentInfo?.url; // Use the document data
                }
              }
              const portal_user = new PortalUser(accountData)

              const portalData = await portal_user.save()
              const content = sendHospitalDoctorCred(email, password)
              await sendEmail(content)
              portal_user_id = portalData._id
            }

            const accountType = await PortalUser.findById(portal_user_id).select('role').exec();
            //Store Location details
            let locationObject = {
              loc: loc == '' ? null : loc,
              address: address == '' ? null : address,
              neighborhood: neighborhood == '' ? null : neighborhood,
              country: country == '' ? null : country,
              region: region == '' ? null : region,
              province: province == '' ? null : province,
              department: location_department == '' ? null : location_department,
              city: city == '' ? null : city,
              village: village == '' ? null : village,
              pincode: pincode == '' ? null : pincode

            }
            let locationResult
            const getLocationInfo = await LocationInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('address');
            if (id && getLocationInfo.length > 0) {
              locationResult = await LocationInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: locationObject
              }, { new: true }).exec();
            } else {
              locationObject.for_portal_user = portal_user_id
              const locationData = new LocationInfo(locationObject);
              locationResult = await locationData.save()
            }
            const location_object_id = locationResult._id

            //Store Bank information
            const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address }
            let bankResult
            const getBankDetailInfo = await BankDetailInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('_id').exec();
            if (id && getBankDetailInfo.length > 0) {
              bankResult = await BankDetailInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: bankObject
              }).exec();
            } else {
              bankObject.for_portal_user = portal_user_id
              const bankData = new BankDetailInfo(bankObject);
              bankResult = await bankData.save()
            }
            const bank_object_id = bankResult._id
            // Store Mobile Pay details
            let dataArray = []
            for (const data of mobile_pay_details) {
              dataArray.push({
                provider: data.provider,
                pay_number: data.pay_number,
                mobile_country_code: data?.mobile_country_code
              })
            }
            let mobilePayResult
            const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('_id').exec();
            if (id && getMobilePayInfo.length > 0) {
              mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: { mobilePay: dataArray }
              }).exec();
            } else {
              const mobilePayData = new MobilePayInfo({
                mobilePay: dataArray,
                for_portal_user: portal_user_id
              })
              mobilePayResult = await mobilePayData.save()
            }
            const mobile_pay_object_id = mobilePayResult._id

            // Store Basic Info of doctor
            let license_details_object = {
              license_number, license_expiry_date
            }
            if (license_image_object_id) {
              license_details_object['image'] = license_image_object_id
            }
            let basicInfoData = {
              first_name, middle_name, last_name, full_name: formatString(`${first_name} ${middle_name} ${last_name}`),
              main_phone_number: mobile,
              dob, designation, title, years_of_experience, assign_doctor, assign_staff, gender, spoken_language,
              urgent_care_service, about, license_details: license_details_object, team, speciality,
              services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
              vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
              in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted
            }
            if (accountType?.role != 'INDIVIDUAL_DOCTOR') {
              basicInfoData.verify_status = 'APPROVED'
              basicInfoData.isInfoCompleted = true
            }

            if (doctor_profile_object_id) {
              basicInfoData.profile_picture = doctor_profile_object_id
            }
            if (id) {
              basicInfoData.isInfoCompleted = true
              await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
                $set: basicInfoData
              }).exec();

              var pathologyTestData
              for (const test of pathologyInfo) {
                try {
                  const existingTest = await PathologyTestInfoNew.findOne({
                    for_portal_user: id,
                    typeOfTest: test.typeOfTest,
                    nameOfTest: test.nameOfTest
                  });

                  if (existingTest) {
                    //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
                  } else {
                    if (test.isExist === false) {
                      pathologyTestData = await PathologyTestInfoNew.create({
                        for_portal_user: id,
                        typeOfTest: test.typeOfTest,
                        nameOfTest: test.nameOfTest,
                        isExist: true
                      });
                    }

                  }
                } catch (error) {
                  console.error('Erroroccurreddddd:', error);
                  // Handle the error as needed
                }
              }

            } else {
              basicInfoData['approved_at'] = new Date()
              basicInfoData['approved_or_rejected_by'] = for_hospital
              basicInfoData['for_hospital'] = for_hospital
              basicInfoData['for_hospitalIds'] = for_hospital
              basicInfoData['for_portal_user'] = portal_user_id
              const basicInfoDataResult = new BasicInfo(basicInfoData)
              const result = await basicInfoDataResult.save()
              await addTestsForMngDoc(pathologyInfo, result.for_portal_user)

            }
            sendResponse(req, res, 200, {
              status: true,
              data: { portal_user_id },
              message: `doctor basic info ${id ? 'updated' : 'added'} successfully`,
              errorCode: null,
            });
          }
        }

      } else {
        console.log("run22222222222222")
        //Create account for doctor
        let portal_user_id = ''
        if (id) {
          //Check email exist
          const CheckEmail = await PortalUser.findOne({ email: email, _id: { $ne: id }, isDeleted: false })
          if (CheckEmail) {
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: "Email already exists",
              errorCode: "INTERNAL_SERVER_ERROR",
            })
          }
          portal_user_id = id;
          let portaluserdatanew = {
            email: email,
            country_code,
            mobile,
            full_name: `${first_name} ${middle_name} ${last_name}`
          };

          if (doctor_profile_object_id) {
            portaluserdatanew.profile_picture = doctor_profile_object_id;

            const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });

            if (documentInfo) {
              portaluserdatanew.profile_picture = documentInfo.url;
            }
          }

          // Update only the fields that need to be changed
          var PortalUserDetails = await PortalUser.findOneAndUpdate(
            { _id: { $eq: id } },
            { $set: { country_code: portaluserdatanew.country_code, email: portaluserdatanew.email, mobile, full_name: portaluserdatanew.full_name, profile_picture: portaluserdatanew.profile_picture } },
            { new: true } // This ensures that the updated document is returned
          ).exec();

        } else {
          const CheckEmail = await PortalUser.findOne({ email: email, isDeleted: false })
          if (CheckEmail) {
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: "Email already exists",
              errorCode: "INTERNAL_SERVER_ERROR",
            })
          }
          const passwordHash = await hashPassword(password);
          const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL_DOCTOR', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), created_by_user: for_hospital }
          // if (doctor_profile_object_id) {
          //   accountData.profile_picture = doctor_profile_object_id
          // }
          if (doctor_profile_object_id) {
            accountData.profile_picture = doctor_profile_object_id;
            // Check if `doctor_profile_object_id` exists in `documentinfos` collection
            const documentInfo = await DocumentInfo.findOne({ _id: doctor_profile_object_id });
            if (documentInfo) {
              accountData.profile_picture = documentInfo?.url; // Use the document data
            }
          }
          const portal_user = new PortalUser(accountData)

          const portalData = await portal_user.save()
          const content = sendHospitalDoctorCred(email, password)
          await sendEmail(content)
          portal_user_id = portalData._id
        }

        const accountType = await PortalUser.findById(portal_user_id).select('role').exec();
        //Store Location details
        let locationObject = {
          loc: loc == '' ? null : loc,
          address: address == '' ? null : address,
          neighborhood: neighborhood == '' ? null : neighborhood,
          country: country == '' ? null : country,
          region: region == '' ? null : region,
          province: province == '' ? null : province,
          department: location_department == '' ? null : location_department,
          city: city == '' ? null : city,
          village: village == '' ? null : village,
          pincode: pincode == '' ? null : pincode

        }
        let locationResult
        const getLocationInfo = await LocationInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('address');
        if (id && getLocationInfo.length > 0) {
          locationResult = await LocationInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
            $set: locationObject
          }, { new: true }).exec();
        } else {
          locationObject.for_portal_user = portal_user_id
          const locationData = new LocationInfo(locationObject);
          locationResult = await locationData.save()
        }
        const location_object_id = locationResult._id

        //Store Bank information
        const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address }
        let bankResult
        const getBankDetailInfo = await BankDetailInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('_id').exec();
        if (id && getBankDetailInfo.length > 0) {
          bankResult = await BankDetailInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
            $set: bankObject
          }).exec();
        } else {
          bankObject.for_portal_user = portal_user_id
          const bankData = new BankDetailInfo(bankObject);
          bankResult = await bankData.save()
        }
        const bank_object_id = bankResult._id
        // Store Mobile Pay details
        let dataArray = []
        for (const data of mobile_pay_details) {
          dataArray.push({
            provider: data.provider,
            pay_number: data.pay_number,
            mobile_country_code: data?.mobile_country_code
          })
        }
        let mobilePayResult
        const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: portal_user_id } }).select('_id').exec();
        if (id && getMobilePayInfo.length > 0) {
          mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
            $set: { mobilePay: dataArray }
          }).exec();
        } else {
          const mobilePayData = new MobilePayInfo({
            mobilePay: dataArray,
            for_portal_user: portal_user_id
          })
          mobilePayResult = await mobilePayData.save()
        }
        const mobile_pay_object_id = mobilePayResult._id

        // Store Basic Info of doctor
        let license_details_object = {
          license_number, license_expiry_date
        }
        if (license_image_object_id) {
          license_details_object['image'] = license_image_object_id
        }
        let basicInfoData = {
          first_name, middle_name, last_name, full_name: formatString(`${first_name} ${middle_name} ${last_name}`),
          main_phone_number: mobile,
          dob, designation, title, years_of_experience, assign_doctor, assign_staff, gender, spoken_language,
          urgent_care_service, about, license_details: license_details_object, team, speciality,
          services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
          vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
          in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted
        }
        if (accountType?.role != 'INDIVIDUAL_DOCTOR') {
          basicInfoData.verify_status = 'APPROVED'
          basicInfoData.isInfoCompleted = true
        }

        if (doctor_profile_object_id) {
          basicInfoData.profile_picture = doctor_profile_object_id
        }
        if (id) {
          basicInfoData.isInfoCompleted = true
          let basicInfoDetails = await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: id } }, {
            $set: basicInfoData
          }).exec();

          var pathologyTestData
          for (const test of pathologyInfo) {
            try {
              const existingTest = await PathologyTestInfoNew.findOne({
                for_portal_user: id,
                typeOfTest: test.typeOfTest,
                nameOfTest: test.nameOfTest
              });

              if (existingTest) {
                //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
              } else {
                if (test.isExist === false) {
                  pathologyTestData = await PathologyTestInfoNew.create({
                    for_portal_user: id,
                    typeOfTest: test.typeOfTest,
                    nameOfTest: test.nameOfTest,
                    isExist: true
                  });
                }

              }
            } catch (error) {
              console.error('Erroroccurreddddd:', error);
              // Handle the error as needed
            }
          }

          const locationinfos = await LocationInfo.find({ for_portal_user: { $eq: id } });

          var updatedBasicInfoDetails = {
            ...basicInfoDetails.toObject(), // Convert to plain JavaScript object
            locationinfos: locationinfos.map(location => location.toObject()),
          };

          if (updatedBasicInfoDetails?.locationinfos.length > 0) {
            try {
              var locationids = {
                country_id: locationinfos[0]?.country,
                region_id: locationinfos[0]?.region,
                province_id: locationinfos[0]?.province,
                village_id: locationinfos[0]?.village,
                city_id: locationinfos[0]?.city,
                department_id: locationinfos[0]?.department,
              };

              const locationdata = await httpService.postStaging(
                "common-api/get-location-name",
                { locationids: locationids },
                {},
                "superadminServiceUrl"
              );
              if (locationdata.status) {
                updatedBasicInfoDetails.locationinfos[0].country = {
                  countryname: locationdata?.body?.country_name,
                  country_iso_code: locationdata?.body?.country_iso_code,
                };
                updatedBasicInfoDetails.locationinfos[0].region = locationdata?.body?.region_name;
                updatedBasicInfoDetails.locationinfos[0].province = locationdata?.body?.province_name;
                updatedBasicInfoDetails.locationinfos[0].village = locationdata?.body?.village_name;
                updatedBasicInfoDetails.locationinfos[0].city = locationdata?.body?.city_name;
                updatedBasicInfoDetails.locationinfos[0].department = locationdata?.body?.department_name;
              }
            } catch (err) {
              console.log(err, "erraaaa");
            }
          }

        } else {
          basicInfoData['approved_at'] = new Date()
          basicInfoData['approved_or_rejected_by'] = for_hospital
          basicInfoData['for_hospital'] = for_hospital
          basicInfoData['for_hospitalIds'] = for_hospital
          basicInfoData['for_portal_user'] = portal_user_id
          const basicInfoDataResult = new BasicInfo(basicInfoData)
          const result = await basicInfoDataResult.save()
          await addTestsForMngDoc(pathologyInfo, result.for_portal_user)

        }
        sendResponse(req, res, 200, {
          status: true,
          data: { PortalUserDetails, updatedBasicInfoDetails },
          message: `doctor basic info ${id ? 'updated' : 'added'} successfully`,
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);

      const CheckEmail = await PortalUser.find({ email: req.body.email })
      if (CheckEmail.length > 0) {
        await PortalUser.deleteOne({ _id: { $eq: CheckEmail[0]._id } })
      }
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async doctorManagementEducationalDetails(req, res) {
    const { portal_user_id, education_details } = req.body
    try {
      const checkExist = await EducationalDetail.find({ for_portal_user: portal_user_id }).exec()
      if (checkExist.length > 0) {
        await EducationalDetail.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { education_details }
        }).exec();
      } else {
        const eduData = new EducationalDetail({
          education_details,
          for_portal_user: portal_user_id
        })
        const eduResult = await eduData.save()
        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { in_education: eduResult._id }
        }).exec();
      }
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `education details ${checkExist.length > 0 ? 'updated' : 'added'} successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async doctorManagementHospitalLocation(req, res) {
    const { portal_user_id, hospital_or_clinic_location } = req.body
    try {
      const checkExist = await HospitalLocation.find({ for_portal_user: portal_user_id }).exec()

      console.log("CHECK EXIST===>", checkExist)

      const basicInfo = await BasicInfo.findOne({ for_portal_user: portal_user_id }, { for_hospitalIds: 1, for_hospitalIds_temp: 1, for_hospital: 1 })
      console.log("CHECK EXIST HOSPITAL===>", basicInfo)

      let permissionToHospital = []

      if (basicInfo?.for_hospitalIds_temp.length > 0) {
        for (const previousData of basicInfo?.for_hospitalIds_temp) {
          permissionToHospital.push(previousData.toString());
        }
      }
      let getRole = ""
      if (basicInfo?.for_hospital) {
        getRole = await PortalUser.findById({ _id: basicInfo?.for_hospital })
        console.log("getRole-->", getRole);
      }


      let locationArray = []
      for (const value of hospital_or_clinic_location) {

        let status = value.locationFor == 'hospital' ? 'PENDING' : 'APPROVED';
        if (getRole != "") {
          if (getRole.role == 'HOSPITAL_ADMIN') {
            console.log("getRole-->", getRole.role);

            status = 'APPROVED'
          }
        }
        value.status = status;
        locationArray.push(value)

        if (value.locationFor === 'hospital') {
          if (!basicInfo?.for_hospitalIds.map(id => id.toString()).includes(value?.hospital_id)) {
            if (!basicInfo?.for_hospitalIds_temp.map(id => id.toString()).includes(value?.hospital_id)) {
              permissionToHospital.push(value?.hospital_id);
            }
          } else {
            value.isPermited = true
          }
        } else {
          value.isPermited = true
        }
      }

      console.log("PERMISSION ARRAY===>", permissionToHospital)

      if (checkExist.length > 0) {
        await HospitalLocation.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { hospital_or_clinic_location }
        }).exec();

        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { for_hospitalIds_temp: permissionToHospital }
        }).exec();

      } else {
        const hlocData = new HospitalLocation({
          hospital_or_clinic_location,
          for_portal_user: portal_user_id
        })

        const hlocResult = await hlocData.save()

        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { in_hospital_location: hlocResult._id, for_hospitalIds_temp: permissionToHospital }
        }).exec();
      }

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `hospital location ${checkExist.length > 0 ? 'updated' : 'added'} successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async doctorManagementDoctorAvailability(req, res) {
    const { portal_user_id, doctor_availability, location_id } = req.body
    try {
      //await DoctorAvailability.deleteMany({ for_portal_user: { $eq: portal_user_id }, location_id })
      const dataArray = []
      for (let data of doctor_availability) {
        data['for_portal_user'] = portal_user_id
        if (data.existingIds === '') {
          dataArray.push(data)
        } else {
          await DoctorAvailability.findOneAndUpdate({ _id: { $eq: data.existingIds } }, {
            $set: {
              week_days: data.week_days,
              availability_slot: data.availability_slot,
              unavailability_slot: data.unavailability_slot,
              slot_interval: data.slot_interval,
            }
          }).exec();
        }
      }
      if (dataArray.length > 0) {

        const result = await DoctorAvailability.insertMany(dataArray)
        const existingInavailability = await BasicInfo.findOne({ for_portal_user: { $eq: portal_user_id } }, { in_availability: 1 });

        const resultArray = existingInavailability.in_availability;
        const appointmentArray = []
        for (const data of result) {
          appointmentArray.push(data.appointment_type)
          resultArray.push(data._id)
        }
        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: {
            in_availability: resultArray,
            accepted_appointment: appointmentArray
          }
        }).exec();
      }
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `doctor availability added successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }

  async deleteAvailability(req, res) {
    const { portal_user_id, location_id } = req.body
    try {
      await DoctorAvailability.deleteMany({ for_portal_user: { $eq: portal_user_id }, location_id })

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Location and its availability deleted successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }

  async doctorManagementFeeManagement(req, res) {
    const { portal_user_id, location_id, online, home_visit, f2f } = req.body
    try {
      const checkExist = await FeeManagement.find({ for_portal_user: portal_user_id, location_id: location_id }).exec()
      let objectData = { online, home_visit, f2f }
      if (checkExist.length > 0) {
        await FeeManagement.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id }, location_id: location_id }, {
          $set: objectData
        }).exec();
      } else {
        objectData['for_portal_user'] = portal_user_id
        objectData['location_id'] = location_id
        const feeData = new FeeManagement(objectData)
        const feeResult = await feeData.save()
        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { in_fee_management: feeResult._id }
        }).exec();
      }
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `fee data ${checkExist.length > 0 ? 'updated' : 'added'} successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }
  async doctorManagementDocumentManagement(req, res) {
    const { portal_user_id, document_details } = req.body;
    try {
      const checkExist = await DocumentManagement.find({ for_portal_user: portal_user_id }).exec()
      if (checkExist.length > 0) {
        // await DocumentManagement.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
        //   $set: { document_details }
        // }).exec();
        await DocumentManagement.findOneAndUpdate(
          { for_portal_user: portal_user_id },
          { $set: { document_details: document_details } },
          { new: true } // to return the updated document
        ).exec();
      } else {
        const docData = new DocumentManagement({
          document_details,
          for_portal_user: portal_user_id
        })
        const docResult = await docData.save()
        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { in_document_management: docResult._id }
        }).exec();
      }
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `document ${checkExist.length > 0 ? 'updated' : 'added'} successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async doctorManagementViewDoctorProfile(req, res) {
    const { portal_user_id } = req.query
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      let result = await BasicInfo.find({ for_portal_user: mongoose.Types.ObjectId(portal_user_id) })
        .populate({
          path: 'for_portal_user',
          select: { email: 1, country_code: 1, mobile: 1, role: 1, notification: 1 }
        })
        .populate({
          path: 'speciality',
          // select: { specilization: 1 }
        })
        .populate({
          path: 'department',
          select: { department: 1 }
        })
        .populate({
          path: 'services',
          select: { service: 1 }
        })
        .populate({
          path: 'unit',
          select: { unit: 1 }
        })
        .populate({
          path: 'expertise',
          select: { expertise: 1 }
        })
        .populate({
          path: 'in_location'
        })
        .populate({
          path: 'in_bank'
        })
        .populate({
          path: 'in_mobile_pay'
        })
        .populate({
          path: 'in_education'
        })
        .populate({
          path: 'in_hospital_location'
        })
        .populate({
          path: 'in_fee_management'
        })
        .populate({
          path: 'in_document_management'
        })
        .populate({
          path: 'profile_picture',
          select: 'url'
        })
        .exec();

      const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: portal_user_id })
      if (result.length > 0) {
        const specialityIds = result[0].speciality;  // Assuming there's only one document in the result
        const specializations = await Specialty.find({ _id: { $in: specialityIds } }).select('specilization').exec();
        let specilizationValues = specializations.map(spec => spec.specilization);

        const availability = result[0].in_availability
        let availabilityArray = []
        availabilityArray = await DoctorAvailability.find({ for_portal_user: portal_user_id })

        let feeMAnagementArray = []
        feeMAnagementArray = await FeeManagement.find({ for_portal_user: portal_user_id })

        let documentManagementList = [];
        documentManagementList = await DocumentManagement.find({ for_portal_user: portal_user_id });

        const documents = result[0]?.in_document_management;
        const documentsArray = [];

        if (documents) {
          for (const data of documents.document_details) {
            let image = '';
            console.log("data.image_url------", data.image_url);
            if (data.image_url !== '') {
              if (typeof data.image_url === 'String') {
                console.log("runn11111111", data);
                let getDocumentData = await DocumentInfo.findOne({ _id: data?.image_url });
                if (getDocumentData) {
                  image = await getDocument(getDocumentData?.url);
                }
                data.image_url = image;
              } else {
                console.log("runn22222");
                let getDocumentData = await DocumentInfo.findOne({ _id: mongoose.Types.ObjectId(data?.image_url) });
                if (getDocumentData) {
                  image = await getDocument(getDocumentData?.url);
                }
                data.image_url = image;
              }
            }
            documentsArray.push(data);
          }
        }
        let license_detailsData = result[0]?.license_details
        if (license_detailsData?.image) {
          const url = await DocumentInfo.findById(license_detailsData?.image).select('url').exec()
          const licenseImage = await getDocument(url.url)
          license_detailsData.image_url = licenseImage
        }
        if (result[0]?.profile_picture) {
          const profilePic = await getDocument(result[0]?.profile_picture?.url)
          result[0].profile_picture.url = profilePic
        }
        if (result[0]?.assign_doctor?.length > 0) {
          let assign_doctor_array = []
          for (const data of result[0]?.assign_doctor) {
            let basicData = await BasicInfo.findById(data).select({ full_name: 1 }).populate({ path: 'for_portal_user', select: { email: 1, country_code: 1, mobile: 1 } })
            if (basicData) {
              assign_doctor_array.push({
                _id: data,
                full_name: basicData.full_name,
                email: basicData.for_portal_user.email,
                country_code: basicData.for_portal_user.country_code,
                mobile: basicData.for_portal_user.mobile,
                role: 'Doctor',
              })
            }
          }
          result[0].assign_doctor = assign_doctor_array
        }
        // if (result[0].assign_staff.length >= 1) {
        if (result[0].assign_staff && result[0]?.assign_staff[0] !== '') {
          let assign_staff_array = []
          for (const data of result[0].assign_staff) {
            let basicData = await ProfileInfo.findById(data).select({ name: 1 }).populate({ path: 'for_portal_user', select: { email: 1, country_code: 1, mobile: 1 } })
            if (basicData) {
              let staff_info = await StaffInfo.find({ for_portal_user: basicData.for_portal_user._id }).select({ degree: 1 }).populate({ path: 'role', select: { name: 1 } })
              assign_staff_array.push({
                _id: data,
                full_name: basicData.name,
                email: basicData.for_portal_user.email,
                country_code: basicData.for_portal_user.country_code,
                mobile: basicData.for_portal_user.mobile,
                role: staff_info[0].role.name,
              })
            }
          }
          result[0].assign_staff = assign_staff_array
        }

        const subscriptionPlans = await SubscriptionPurchaseStatus.find({ for_user: portal_user_id });

        sendResponse(req, res, 200, {
          status: true,
          data: { result, availabilityArray, feeMAnagementArray, subscriptionPlans, pathology_tests, specilizationValues, documentManagementList },
          message: `doctor details fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          data: null,
          message: `doctor details fetched successfully`,
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }

  async doctorManagementViewBasicInfo(req, res) {
    const { portal_user_id } = req.query
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: portal_user_id })
      const result = await BasicInfo.find({ for_portal_user: { $eq: portal_user_id } })
        .populate({
          path: 'for_portal_user',
          select: { email: 1, country_code: 1, mobile: 1, notification: 1 }
        })
        .populate({
          path: 'speciality',
          select: { specilization: 1 }
        })
        .populate({
          path: 'department',
          select: { department: 1 }
        })
        .populate({
          path: 'services',
          select: { service: 1 }
        })
        .populate({
          path: 'unit',
          select: { unit: 1 }
        })
        .populate({
          path: 'expertise',
          select: { expertise: 1 }
        })
        .populate({
          path: 'in_location'
        })
        .populate({
          path: 'in_bank'
        })
        .populate({
          path: 'in_mobile_pay'
        }).populate({
          path: 'profile_picture',
          select: 'url'
        })
        .exec();

      let license_detailsData = result[0].license_details
      if (license_detailsData.image) {
        const url = await DocumentInfo.findById(license_detailsData.image).select('url').exec()
        const licenseImage = await getDocument(url.url)
        license_detailsData.image_url = licenseImage
      }
      if (result[0].profile_picture) {
        const profilePic = await getDocument(result[0].profile_picture.url)
        result[0].profile_picture.url = profilePic
      }

      sendResponse(req, res, 200, {
        status: true,
        data: { result, pathology_tests },
        message: `doctor basic info fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }



  async doctorManagementListDoctor(req, res) {
    var { hospital_portal_id, page, limit, searchKey } = req.query
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray['for_portal_user.createdAt'] = -1;
    }

    let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_portal_id) });

    if (checkUser.role === "HOSPITAL_STAFF") {

      let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_portal_id) })

      hospital_portal_id = adminData?.in_hospital;
    }


    var doctorId = req.query.doctorId;
    console.log("check", doctorId);
    var filterDoctor = {};
    if (doctorId != "undefined" && doctorId != undefined && doctorId != "") {
      console.log("check", doctorId);
      const doctorIdArray = doctorId.split(",");
      const doctorObjectIds = doctorIdArray.map(id => mongoose.Types.ObjectId(id));

      filterDoctor["for_portal_user"] = { $in: doctorObjectIds };
    }

    try {
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
        'for_portal_user.isDeleted': false,
        // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
        for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
      };

      if (searchKey) {
        filter['$or'] = [
          { full_name: { $regex: searchKey || "", $options: "i" } },
          // {speciality: { $in: [searchKey] } }
        ]
      }
      let aggregate = [
        {
          $match: filterDoctor
        },
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "services",
            localField: "services",
            foreignField: "_id",
            as: "services",
          }
        },
        { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "departments",
          }
        },
        { $unwind: { path: "$departments", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'specialties',
            localField: 'speciality',
            foreignField: '_id',
            as: 'speciality1'
          }
        },
        // { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "units",
            localField: "unit",
            foreignField: "_id",
            as: "unit",
          }
        },
        { $unwind: { path: "$unit", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            // speciality: "$speciality.specilization",
            speciality: { $ifNull: ["$speciality1.specilization", ""] },
            services: "$services.service",
            department: "$departments.department",
            unit: "$unit.unit",
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
              role: "$for_portal_user.role"
            },
          }
        },
      ];
      const totalCount = await BasicInfo.aggregate(aggregate);
      aggregate.push({
        $sort: sortingarray

      },
        { $limit: limit * 1 },
        { $skip: (page - 1) * limit })
      const result = await BasicInfo.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: result,
          totalCount: totalCount.length,
        },
        message: `hospital doctor fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async doctorManagementRequestList(req, res) {
    var { hospital_portal_id, page, limit, searchKey } = req.query
    try {
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['for_portal_user.createdAt'] = -1;
      }

      let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(hospital_portal_id) });

      if (checkUser.role === "HOSPITAL_STAFF") {

        let adminData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(hospital_portal_id) })

        hospital_portal_id = adminData?.in_hospital;
      }
      var filter = {
        'for_portal_user.role': { $in: ['INDIVIDUAL_DOCTOR'] },
        'for_portal_user.isDeleted': false,
        // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
        for_hospitalIds_temp: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
      };

      if (searchKey) {
        filter['$or'] = [
          { full_name: { $regex: searchKey || "", $options: "i" } },
        ]
      }
      let aggregate = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $lookup: {
            from: "services",
            localField: "services",
            foreignField: "_id",
            as: "services",
          }
        },
        { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "specialties",
            localField: "speciality",
            foreignField: "_id",
            as: "speciality",
          }
        },
        { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$_id", // Group by the unique identifier (document _id)
            first_document: { $first: "$$ROOT" } // Select the first document in each group
          }
        },
        {
          $replaceRoot: { newRoot: "$first_document" } // Replace the root with the grouped document
        },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            speciality: "$speciality.specilization",
            services: "$services.service",
            department: 1,
            unit: 1,
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
            },
          }
        },
      ];
      const totalCount = await BasicInfo.aggregate(aggregate);
      aggregate.push({
        $sort: sortingarray
      },
        { $limit: limit * 1 },
        { $skip: (page - 1) * limit })
      const result = await BasicInfo.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: result,
          totalCount: totalCount.length,
        },
        message: `hospital doctor fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async acceptOrRejectDoctorRequest(req, res) {
    const { action, doctor_portal_id, hospital_id } = req.body;

    try {
      var result;

      if (action === 'accept') {
        result = await BasicInfo.updateOne(
          { for_portal_user: doctor_portal_id },
          { $push: { for_hospitalIds: hospital_id } },
        )

        const result2 = await BasicInfo.updateOne(
          { for_portal_user: doctor_portal_id },
          { $pull: { for_hospitalIds_temp: hospital_id } }
        )

        const result3 = await HospitalLocation.updateOne(
          { for_portal_user: doctor_portal_id, "hospital_or_clinic_location.hospital_id": hospital_id },
          { $set: { "hospital_or_clinic_location.$.isPermited": true, "hospital_or_clinic_location.$.status": "APPROVED" } }
        )
      } else {
        result = await BasicInfo.updateOne(
          { for_portal_user: doctor_portal_id },
          { $pull: { for_hospitalIds_temp: hospital_id } }
        )

        const result2 = await HospitalLocation.updateOne(
          { for_portal_user: doctor_portal_id },
          { $pull: { hospital_or_clinic_location: { hospital_id: hospital_id } } },
          { multi: true }
        )
      }

      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `Doctor ${action} successfully`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to ${verify_status} doctor`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async doctorManagementActiveLockDeleteDoctor(req, res) {
    try {
      const { action_name, action_value, doctor_portal_id } = req.body
      let key;
      key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
      if (key) {
        const portalData = await PortalUser.findOneAndUpdate(
          { _id: { $eq: doctor_portal_id } },
          {
            $set: {
              [key]: action_value
            }
          },
          { new: true },
        )
        let actionMessage;
        if (action_name === "active" && action_value) {
          actionMessage = "activated"
        } else if (action_name === "active" && !action_value) {
          actionMessage = "deactivated"
        }
        if (action_name === "delete" && action_value) {
          actionMessage = "deleted"
        }
        if (action_name === "lock" && action_value) {
          actionMessage = "locked"
        } else if (action_name === "lock" && !action_value) {
          actionMessage = "unlocked"
        }
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `staff ${actionMessage} successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 500, {
          status: false,
          data: null,
          message: `Something went wrong`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }
  async getDoctorList(req, res) {
    try {
      const { page, limit, status, searchText, from_date, to_date } = req.query
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != undefined && sort != '') {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }

      var docRoleChange;
      if(req.query.docRole == ''){
        docRoleChange = ['INDIVIDUAL_DOCTOR']
      }else{
        docRoleChange = ['INDIVIDUAL_DOCTOR', 'HOSPITAL_DOCTOR']
      }


      var filter = {
        'for_portal_user.role': { $in: docRoleChange },
        'for_portal_user.isDeleted': false,
        verify_status: status,
      };
     
      if (searchText) {
        filter['$or'] = [
          { full_name: { $regex: searchText || "", $options: "i" } },
          { 'for_portal_user.email': { $regex: searchText || "", $options: "i" } },
        ]
      }
      // if (from_date && to_date) {
      //   filter['for_portal_user.createdAt'] = { $gte:from_date, $lt:to_date }
      // }
      // console.log(filter, 'filterfilter');
      let aggregate = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: "$for_portal_user" },
        { $match: filter },
        {
          $lookup: {
            from: 'specialties',
            localField: 'speciality',
            foreignField: '_id',
            as: 'speciality1'
          }
        },
        // {
        //   $unwind: {
        //     path: "$speciality",
        //     preserveNullAndEmptyArrays: true // This option prevents null if there's no match
        //   }
        // },
        {
          $lookup: {
            from: "locationinfos",
            localField: "in_location",
            foreignField: "_id",
            as: "in_location",
          }
        },
        {
          $unwind: {
            path: "$in_location",
            preserveNullAndEmptyArrays: true // This option prevents null if there's no match
          }
        },
        {
          $project: {
            verify_status: 1,
            full_name: 1,
            license_details: 1,
            // speciality: 1,
            speciality: { $ifNull: ["$speciality1.specilization", ""] },
            years_of_experience: 1,
            department: 1,
            services: 1,
            unit: 1,
            in_location: 1,
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
              fcmToken: "$for_portal_user.fcmToken"
            },
            updatedAt: 1
          }
        },
      ];
      const totalCount = await BasicInfo.aggregate(aggregate);
      aggregate.push({
        $sort: sortingarray
      })
      if (limit !== "0") {
        aggregate.push(
          { $skip: (page - 1) * limit },
          { $limit: limit * 1 }
        )
      }

      const result = await BasicInfo.aggregate(aggregate);

      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: result,
          totalCount: totalCount.length
        },
        message: `hospital fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }
  async approveOrRejectDoctor(req, res) {
    const { verify_status, doctor_portal_id, approved_or_rejected_by } = req.body;
    let date = null;
    if (verify_status == "APPROVED") {
      const cdate = new Date();
      date = `${cdate.getFullYear()}-${cdate.getMonth() + 1
        }-${cdate.getDate()}`;
    }

    try {
      const result = await BasicInfo.findOneAndUpdate(
        { for_portal_user: doctor_portal_id },
        {
          $set: {
            verify_status,
            approved_at: date,
            approved_or_rejected_by,
          },
        },
        { upsert: false, new: true }
      ).exec();
      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `${verify_status} doctor successfully`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to ${verify_status} doctor`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async activeLockDeleteDoctor(req, res) {
    try {
      const { action_name, action_value, doctor_portal_id } = req.body
      let key;
      key = action_name === "delete" ? 'isDeleted' : action_name === "lock" ? "lock_user" : action_name === "active" ? "isActive" : ''
      if (key) {
        const portalData = await PortalUser.findOneAndUpdate(
          { _id: { $eq: doctor_portal_id } },
          {
            $set: {
              [key]: action_value
            }
          },
          { new: true },
        )
        let actionMessage;
        if (action_name === "active" && action_value) {
          actionMessage = "activated"
        } else if (action_name === "active" && !action_value) {
          actionMessage = "deactivated"
        }
        if (action_name === "delete" && action_value) {
          actionMessage = "deleted"
        }
        if (action_name === "lock" && action_value) {
          actionMessage = "locked"
        } else if (action_name === "lock" && !action_value) {
          actionMessage = "unlocked"
        }
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `hospital ${actionMessage} successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 500, {
          status: false,
          data: null,
          message: `Something went wrong`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `Something went wrong`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async doctorManagementGetLocations(req, res) {
    try {
      const { portal_user_id } = req.query
      const results = await HospitalLocation.aggregate([
        { $match: { for_portal_user: mongoose.Types.ObjectId(portal_user_id), } },
        { $unwind: '$hospital_or_clinic_location' },
        { $match: { 'hospital_or_clinic_location.isPermited': true } },
        {
          $group:
          {
            _id: '$_id',
            for_portal_user: { $first: '$for_portal_user' },
            hospital_or_clinic_location: { $push: '$hospital_or_clinic_location' }
          }
        }
      ])
      sendResponse(req, res, 200, {
        status: true,
        data: results,
        message: `hospital locations fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `Something went wrong`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async advanceDoctorFilter(req, res) {
    try {
      const {
        searchText,
        city,
        neighborhood,
        insuranceAccepted,
        long,
        lat,
        province,
        department,
        consultationFeeStart,
        consultationFeeEnd,
        consultationFeeSort,
        appointmentType,
        doctorAvailability,
        ratingSort,
        doctorYearOfExperienceSort,
        doctorGender,
        onDutyDoctor,
        openNow,
        spokenLanguage,
        page,
        limit,
        currentTimeStamp
      } = req.body
      var maxDistance = req.body.maxDistance
      console.log(maxDistance, "maxDistance")
      if (maxDistance == undefined || maxDistance == 0) {
        maxDistance = 5
      }
      var searchText_filter = [{}]
      var city_filter = {}
      var neighborhood_filter = {}
      var insuranceAccepted_filter = {}
      var province_filter = {}
      var department_filter = {}
      var geoNear_filter = {}
      var consultationFeeFilter_filter = {}
      var appointmentType_filter = {}
      var doctorAvailability_filter = {}
      var doctorGender_filter = {}
      var spokenLanguage_filter = {}
      var onDutyDoctor_filter = {}
      var openNow_filter = {}

      let formattedTimestamp = new Date();


      let timeZone = config.TIMEZONE; // Change this to the appropriate time zone
      //console.log(timeZone, "timeZoneeeeeee____");
      let current_timestamp1 = formattedTimestamp.toLocaleString('en-US', { timeZone: timeZone });
      let current_timestamp = new Date(current_timestamp1);
      //console.log(current_timestamp, "current_timestamppp_________");

      let current_timestamp_UTC = new Date();

      var day = current_timestamp.getDay()
      //console.log(day, "dayyyyyyyyy____");
      var hour = current_timestamp.getHours().toString()
      var minute = current_timestamp.getMinutes().toString()
      if (hour.toString().length == 1) {
        hour = "0" + hour;
      }
      if (minute.toString().length == 1) {
        minute = "0" + minute;
      }
      const hourAndMin = hour + minute
      //console.log(hourAndMin, "hourAndMin_____");

      if (long != "" && lat != "") {
        geoNear_filter = {
          $geoNear:
          {
            near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
            distanceField: "distance",
            minDistance: 0, //0 KM
            maxDistance: maxDistance * 1000,
            includeLocs: "locations",
            spherical: true,
            distanceMultiplier: 0.001
          }
        }
      } else {
        geoNear_filter = {
          $geoNear:
          {
            near: { type: "Point", coordinates: [0, 0] },
            distanceField: "distance",
            //  minDistance: 0, //0 KM
            //  maxDistance: 500, //5 KM         
            includeLocs: "loc",
            spherical: true,
            distanceMultiplier: 0.001
          }
        }
      }

      if (searchText != "") {
        searchText_filter = [
          {
            locations: {
              $elemMatch: {
                hospital_name: {
                  $regex: searchText,
                  $options: "i"
                }
              }
            }
          },
          { pathologyTestsName: { $regex: searchText || '', $options: "i" } },
          /*  { doctorMedicalActPerformed: { $regex: searchText || '', $options: "i" } },
           { doctorLabTestPerformed: { $regex: searchText || '', $options: "i" } },
           { doctorImagingPerformed: { $regex: searchText || '', $options: "i" } },
           { doctorVaccinationPerformed: { $regex: searchText || '', $options: "i" } },
           { doctorOtherTest: { $regex: searchText || '', $options: "i" } }, */

          // { doctor_full_name: { $regex: searchText || '', $options: "i" } },
          { doctorFullName: { $regex: searchText || '', $options: "i" } },
          // { doctorSpecialty: { $regex: searchText || '', $options: "i" } },
          {
            doctorSpecialty: {
              $regex: searchText.split('').map(letter => `${letter}.*`).join(''),
              $options: "i"
            }
          }

        ]
      }
      if (city != "") {
        city_filter = {
          city: mongoose.Types.ObjectId(city)
        }
      }
      if (neighborhood != "") {
        neighborhood_filter = {
          neighborhood: { $regex: neighborhood || '', $options: "i" }
        }
      }
      if (province != "") {
        province_filter = {
          province: mongoose.Types.ObjectId(province)
        }
      }
      if (department != "") {
        department_filter = {
          department: mongoose.Types.ObjectId(department),
        }
      }
      if (consultationFeeStart >= 0 && consultationFeeEnd) {
        //console.log(consultationFeeStart,"consultationFeeStart___",consultationFeeEnd);

        consultationFeeFilter_filter = {
          ['feemanagements.online.basic_fee']: {
            $gte: consultationFeeStart == 0 ? 1 : parseFloat(consultationFeeStart),
            $lte: parseFloat(consultationFeeEnd)
          }
        }
      }
      if (doctorGender.length > 0) {
        if (doctorGender.length === 1) {
          doctorGender_filter = {
            'doctors.gender': doctorGender[0]
          };
        } else {
          doctorGender_filter = {};
        }
      }

      if (insuranceAccepted.length > 0) {
        //console.log(insuranceAccepted, "insuranceAccepteddd__");
        insuranceAccepted_filter = {
          ['doctors.insurance_accepted']: { $in: [insuranceAccepted] }
        }
      }


      if (spokenLanguage) {
        spokenLanguage_filter = {
          ['doctors.spoken_language']: spokenLanguage
        }
      }
      if (appointmentType.length > 0) {
        appointmentType_filter = {
          ['doctors.accepted_appointment']: { $in: appointmentType }
        }
      }
      //const resData1 = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: data.portal_user_data.mobile }, {}, 'insuranceServiceUrl');

      //console.log(onDutyDoctor, "onDutyDoctor_______");

      if (onDutyDoctor.toString() != "") {
        if (onDutyDoctor.toString() == "true") {
          onDutyDoctor_filter = {
            $or: [
              { unavailability_slot_status1: true },
              { availability_slot_status1: true },
              { week_days_status1: true }
            ]
          }
        } else {
          onDutyDoctor_filter = {
            unavailability_slot_status1: { $size: 0 },
            availability_slot_status1: { $size: 0 },
            week_days_status1: { $size: 0 },
          }
        }
      }
      //console.log(onDutyDoctor_filter, "onDutyDoctor_filter____");

      if (openNow.toString() != "") {
        if (openNow.toString() == "true") {
          openNow_filter = {
            $or: [
              { week_days_status1: true }
            ]
          }
        } else {
          openNow_filter = {
            week_days_status1: { $size: 0 },
          }
        }
      }

      if (doctorAvailability) {
        let dateArray = []
        let unavailability_day_array = []
        const cdate = new Date()
        if (doctorAvailability == 'TODAY') {
          const tdate = formatDateAndTimeNew(cdate)
          dateArray.push(tdate.split(' ')[0])
          //console.log(dateArray,"dateArray11111");
        } else if (doctorAvailability == 'TOMORROW') {
          cdate.setDate(cdate.getDate() + 1)
          const tomorrowDate = formatDateAndTime(cdate)
          dateArray.push(tomorrowDate.split(' ')[0])
        }
        else if (doctorAvailability == 'NEXT7DAYS') {
          for (let index = 1; index <= 7; index++) {
            const cudate = new Date()
            cudate.setDate(cudate.getDate() + index)
            const nextDate = formatDateAndTime(cudate)
            dateArray.push(nextDate.split(' ')[0])
          }
        } else {
          const anyDate = formatDateAndTime(new Date(doctorAvailability))
          dateArray.push(anyDate.split(' ')[0])
          console.log(dateArray, "dateArray2222");
        }
        const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        console.log(dateArray, "dateArrayyy_____",);

        for (const sdate of dateArray) {
          const gdate = new Date(sdate)
          unavailability_day_array.push(day[gdate.getDay()])
        }
        //console.log(dateArray, 'dateArray');
        //console.log(unavailability_day_array, 'unavailability_day_array___');
        doctorAvailability_filter = {
          ['doctors.unavailability_date_array']: { $nin: dateArray },
          ['doctors.unavailability_day_array']: { $nin: unavailability_day_array }
        }
      }
      // All Sorting Filters
      let allSort
      if (!consultationFeeSort && !ratingSort && !doctorYearOfExperienceSort) {
        allSort = { distance: 1 }
      } else {
        allSort = {}
      }
      if (consultationFeeSort) {
        allSort.doctorOnlineBasicFee = consultationFeeSort == "LOW_TO_HIGH" ? 1 : -1
      }
      if (ratingSort) {
        allSort.rating = ratingSort == "LOW_TO_HIGH" ? 1 : -1
      }
      if (doctorYearOfExperienceSort) {
        console.log(doctorYearOfExperienceSort, "doctorYearOfExperienceSortttt____");
        allSort.doctorYearOfExperience = doctorYearOfExperienceSort == "LOW_TO_HIGH" ? 1 : -1
      }




      if (day == 0) {

        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.sun_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.sun_start_time", hourAndMin] },
                { $gt: ["$week_days.sun_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 1) {

        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.mon_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.mon_start_time", hourAndMin] },
                { $gt: ["$week_days.mon_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 2) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.tue_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.tue_start_time", hourAndMin] },
                { $gt: ["$week_days.tue_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 3) {
        console.log(hourAndMin, "hourAndMinnn___________");
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.wed_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.wed_start_time", hourAndMin] },
                { $gt: ["$week_days.wed_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
        //console.log(day_filter, "day_filter_Wed_____");

      }
      if (day == 4) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.thu_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.thu_start_time", hourAndMin] },
                { $gt: ["$week_days.thu_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 5) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.fri_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.fri_start_time", hourAndMin] },
                { $gt: ["$week_days.fri_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }

      }
      if (day == 6) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.sat_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.sat_start_time", hourAndMin] },
                { $gt: ["$week_days.sat_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }




      console.log(insuranceAccepted_filter, 'insuranceAccepted_filter');
      var pipeline = [
        geoNear_filter,
        {
          $lookup: {
            from: "basicinfos",
            localField: "_id",
            foreignField: "in_location",
            as: "doctors",
          }
        },
        { $unwind: { path: "$doctors", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "specialties",
            localField: "doctors.speciality",
            foreignField: "_id",
            as: "doctors.speciality",
          }
        },
        // { $unwind: { path: "$doctors.speciality", preserveNullAndEmptyArrays: true } },



        {
          $lookup: {
            from: "doctoravailabilities",
            localField: "doctors.in_availability",
            foreignField: "_id",
            as: "doctors.onduty"
          }
        },
        {
          $unwind: "$doctors.onduty"
        },
        {
          $addFields: {
            availability_slot: "$doctors.onduty.availability_slot",
            unavailability_slot: "$doctors.onduty.unavailability_slot",
            week_days: "$doctors.onduty.week_days"
          }
        },
        { $unwind: "$unavailability_slot" },
        { $unwind: "$availability_slot" },
        { $unwind: "$week_days" },
        {
          $addFields: {
            unavailability_slot_status: {
              $cond: {
                if: { $ne: ["$unavailability_slot.date", ""] }, // Check if date is not empty
                then: {
                  $eq: [
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $toDate: "$$NOW" }
                      }
                    },
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $dateFromString: { dateString: "$unavailability_slot.date" } }
                      }
                    }
                  ]
                },
                else: false // Set isSlotWithinTimestamp to false for empty dates
              }
            }
          }
        },
        {
          $addFields: {
            availability_slot_status: {
              $cond: {
                if: { $ne: ["$availability_slot.date", ""] }, // Check if date is not empty
                then: {
                  $eq: [
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $toDate: "$$NOW" }
                      }
                    },
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $dateFromString: { dateString: "$availability_slot.date" } }
                      }
                    }
                  ]
                },
                else: false // Set isSlotWithinTimestamp to false for empty dates
              }
            }
          }
        },
        {
          $addFields: {
            week_days_status: day_filter
          }
        },
        {
          $lookup: {
            from: "pathologytestinfonews",
            let: { userId: "$doctors.for_portal_user" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$for_portal_user", "$$userId"]
                  }
                }
              }
            ],
            as: "pathologyTests"
          }
        },
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "portal_user",
          }
        },
        { $unwind: { path: "$portal_user", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            doctor_full_name: "$doctors.full_name",
            pathologyTestsName: { $ifNull: ["$pathologyTests.nameOfTest", ""] },
            doctor_verify_status: "$doctors.verify_status",
            doctorYearOfExperience: "$doctors.years_of_experience",
            nextAvailableSlot: "$doctors.nextAvailableSlot",
            nextAvailableDate: "$doctors.nextAvailableDate",
            is_deleted: "$portal_user.isDeleted",
            is_active: "$portal_user.isActive",
            is_lock: "$portal_user.lock_user",
            average_rating: "$portal_user.average_rating",

            /* doctorMedicalActPerformed: "$doctors.medical_act_performed",
            doctorLabTestPerformed: "$doctors.lab_test_performed",
            doctorImagingPerformed: "$doctors.imaging_performed",
            doctorVaccinationPerformed: "$doctors.vaccination_performed",
            doctorOtherTest: "$doctors.other_test", */
          }
        },
        {
          $match: {
            doctor_verify_status: "APPROVED",
            is_deleted: false,
            is_active: true,
            is_lock: false
          }
        },
        {
          $lookup: {
            from: "documentinfos",
            localField: "doctors.profile_picture",
            foreignField: "_id",
            as: "documentinfos",
          }
        },
        { $unwind: { path: "$documentinfos", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            doctorProfilePic: { $ifNull: ["$documentinfos.url", "NA"] }
          }
        },
        {
          $lookup: {
            from: "feemanagements",
            localField: "doctors.in_fee_management",
            foreignField: "_id",
            as: "feemanagements",
          }
        },
        { $unwind: { path: "$feemanagements", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            doctorOnlineBasicFee: "$feemanagements.online.basic_fee",
            doctorHomeVisitBasicFee: "$feemanagements.home_visit.basic_fee",
            doctorHomeVisitTravelFee: "$feemanagements.home_visit.travel_fee",
            doctorF2FBasicFee: "$feemanagements.f2f.basic_fee",
          }
        },
        {
          $lookup: {
            from: "hospitallocations",
            localField: "doctors.in_hospital_location",
            foreignField: "_id",
            as: "hospitallocations",
          }
        },
        { $unwind: { path: "$hospitallocations", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            hospital_or_clinic_location: "$hospitallocations.hospital_or_clinic_location",
          }
        },
        { $unwind: { path: "$hospital_or_clinic_location", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            "hospital_or_clinic_location.status": "APPROVED",
          }
        },
        {
          $match: {
            $and: [
              city_filter,
              neighborhood_filter,
              insuranceAccepted_filter,
              province_filter,
              department_filter,
              consultationFeeFilter_filter,
              appointmentType_filter,
              doctorGender_filter,
              spokenLanguage_filter,
              doctorAvailability_filter,
            ],
            // $or: searchText_filter
          }
        },
        {
          $group: {
            _id: "$doctors.for_portal_user",
            doctorFullName: { $addToSet: "$doctor_full_name" },
            pathologyTestsName: { $addToSet: "$pathologyTestsName" },
            doctorProfilePic: { $addToSet: "$doctorProfilePic" },
            doctorSpecialty: { $addToSet: "$doctors.speciality.specilization" },

            unavailability_slot_status: { $addToSet: "$unavailability_slot_status" },
            availability_slot_status: { $addToSet: "$availability_slot_status" },
            week_days_status: { $addToSet: "$week_days_status" },

            //onDutyDoctor1: { $addToSet: "$onDutyDoctor" },
            availability_slot: { $addToSet: "$doctors.onduty.availability_slot" },
            unavailability_slot: { $addToSet: "$doctors.onduty.unavailability_slot" },
            week_days: { $addToSet: "$doctors.onduty.week_days" },

            doctorOnlineBasicFee: { $addToSet: "$doctorOnlineBasicFee" },
            doctorHomeVisitBasicFee: { $addToSet: "$doctorHomeVisitBasicFee" },
            doctorHomeVisitTravelFee: { $addToSet: "$doctorHomeVisitTravelFee" },
            doctorF2FBasicFee: { $addToSet: "$doctorF2FBasicFee" },
            nextAvailableSlot: { $addToSet: "$nextAvailableSlot" },
            nextAvailableDate: { $addToSet: "$nextAvailableDate" },
            doctorYearOfExperience: { $addToSet: "$doctorYearOfExperience" },
            rating: { $addToSet: "$average_rating" },
            locations: { $addToSet: "$hospital_or_clinic_location" },

            // hospitalName: { $addToSet: "$hospital_name" },
            // address: { $addToSet: "$address" },
            distance: { $addToSet: "$distance" },
            // rating: { $addToSet: "4.5" },
            // reviews: { $addToSet: "$numberOfReviews" },
            // onDutyStatus: { $addToSet: true },
            // nextAppointmentAvailable: { $addToSet: "2023-01-24T08:27:51.857Z" },
          }
        },
        { $addFields: { unavailability_slot_status1: { $filter: { input: "$unavailability_slot_status", as: "item", cond: { $eq: ["$$item", true] } } } } },
        { $addFields: { availability_slot_status1: { $filter: { input: "$availability_slot_status", as: "item", cond: { $eq: ["$$item", true] } } } } },
        { $addFields: { week_days_status1: { $filter: { input: "$week_days_status", as: "item", cond: { $eq: ["$$item", true] } } } } },

        { $unwind: "$doctorFullName" },
        { $unwind: "$pathologyTestsName" },
        { $unwind: "$doctorProfilePic" },
        { $unwind: "$doctorSpecialty" },
        { $unwind: "$doctorOnlineBasicFee" },
        { $unwind: "$doctorHomeVisitBasicFee" },
        { $unwind: "$doctorHomeVisitTravelFee" },
        { $unwind: "$doctorF2FBasicFee" },
        { $unwind: "$doctorYearOfExperience" },
        // { $unwind: "$hospitalName" },
        // { $unwind: "$address" },
        { $unwind: "$distance" },
        { $unwind: "$rating" },
        // { $unwind: "$reviews" },
        // { $unwind: "$onDutyStatus" },
        { $unwind: "$nextAvailableSlot" },
        { $unwind: "$nextAvailableDate" },
        {
          $match: {
            $and: [onDutyDoctor_filter, openNow_filter],
            $or: searchText_filter
          }
        },
        { $sort: allSort },
        {
          $facet: {
            totalCount: [
              {
                $count: 'count'
              }
            ],
            paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }],
          }
        },
      ]
      const result = await LocationInfo.aggregate(
        pipeline
      );



      //console.log(result[0].paginatedResults, "resulttttDoc_______________", result.length);

      for (let index = 0; index < result[0].paginatedResults.length; index++) {
        const profilePicKey = result[0].paginatedResults[index].doctorProfilePic;
        const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: result[0].paginatedResults[index]._id } }).countDocuments()
        const speciality_id = result[0].paginatedResults[index].doctorSpecialty
        // console.log(result[0].paginatedResults[index], 'paginatedResults[index]');
        result[0].paginatedResults[index].doctorProfilePic = ""
        result[0].paginatedResults[index].reviews = getRatingCount
        // result[0].paginatedResults[index].nextAppointmentDate = "January 1, 2023"

        // console.log(result[0].paginatedResults[index],"onDutyTodayyyyyyy");

        result[0].paginatedResults[index].onDutyToday = true

        result[0].paginatedResults[index].reviews = getRatingCount
        if (profilePicKey !== 'NA') {
          result[0].paginatedResults[index].doctorProfilePic = await getDocument(profilePicKey)
        }


      }
      let totalCount = 0
      if (result[0].totalCount.length > 0) {
        totalCount = result[0].totalCount[0].count
      }
      let totalDocsList = result[0].paginatedResults;
      //console.log(totalDocsList,"totalDocsListttttt_______");

      for (let i = 0; i < totalDocsList.length; i++) {
        //console.log(totalDocsList[0].locations,"paginatedResultsss_______");
        let hospital = totalDocsList[i].locations;
        var timeStamp = new Date()
        let hospitalId = hospital[totalDocsList[i].locations.length - 1].hospital_id;
        let for_portal_user = totalDocsList[i]._id;
        //console.log(hospitalId, "hospitalIddd______");
        await updateSlotAvailability(hospitalId, for_portal_user, timeStamp, req);
      }


      sendResponse(req, res, 200, {
        status: true,
        data: {
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          totalRecords: totalCount,
          result: result[0].paginatedResults,
        },
        message: `Successfully get doctor list`,
        errorCode: null,
      });

    } catch (error) {
      console.log(error, "error______");
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: error.message ? error.message : `Failed to get doctor list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async listAppointment(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const { doctor_portal_id, page, limit, consultation_type, status, date, to_date, filterByDocLocname, filterByPatientname } = req.query;
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }
      // console.log("AFTER FILTER===>", typeof (doctor_portal_id))
      // var doctorPortalId = doctor_portal_id.map(s => mongoose.Types.ObjectId(s));

      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      // console.log("AFTER FILTER ARRAY===>", doctorPortalId)

      // console.log("req.query--------------", req.query);

      // //For UPDATING MISSED APPOINTMENT
      const missedAppointments = await Appointment.find({ doctorId: { $in: doctor_portal_id }, status: ["NEW", "APPROVED",] });
      var dateToday = new Date().toISOString().split('T')[0] //string
      // console.log("missedAppointments-----", missedAppointments);
      const today = new Date(dateToday); //Today date
      let appointmentsToBeMissed = [] //appointment id array

      for (const appointment of missedAppointments) {
        let consultedDate = new Date(appointment?.consultationDate);

        if (consultedDate < today) {
          appointmentsToBeMissed.push(appointment?._id.toString())
        } else if (consultedDate > today) {

        } else {
          const now = new Date(); //current time

          const endTime = appointment?.consultationTime?.split("-")[1]?.split(":"); //apointment end time

          const givenTime = new Date();
          givenTime.setHours(endTime[0]);
          givenTime.setMinutes(endTime[1]);
          givenTime.setSeconds(0);

          // Compare the two times
          if (now.getTime() > givenTime.getTime()) {
            appointmentsToBeMissed.push(appointment?._id.toString())
          }
        }
      }

      var afterUpdateResult;
      if (appointmentsToBeMissed.length != 0) {
        afterUpdateResult = await Appointment.updateMany({ _id: { $in: appointmentsToBeMissed } },
          { $set: { status: 'MISSED' } },
          { multi: true });
      }


      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {

        statusFilter = {
          status: { $ne: 'NA' }
        }
        if (status == 'NEW') {
          statusFilter = {
            status: 'NEW'
          }
        }
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }
        if (status == 'TODAY') {
          statusFilter = {
            consultationDate: { $eq: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'UPCOMING') {
          statusFilter = {
            consultationDate: { $gt: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'REJECTED') {
          statusFilter = {
            status: "REJECTED"
          }
        }
        if (status == 'PAST') {
          statusFilter = {
            consultationDate: { $lt: new Date().toISOString().split('T')[0] },
            status: "PAST"
          }
        }

        if (status == 'MISSED') {
          statusFilter = {
            status: "MISSED"
          }
        }

      }
      var dateFilter = {}
      if (date && date != "" && to_date && to_date != "") {
        dateFilter = {
          consultationDate: { $gte: date, $lte: to_date },
        }
      }
      if (date && date != "" && to_date == "") {
        dateFilter = {
          consultationDate: { $gte: date },
        }
      }


      var filterName = {};
      if (filterByDocLocname) {
        if (typeof filterByDocLocname === 'string') {
          filterName["hospital_details.hospital_id"] = mongoose.Types.ObjectId(filterByDocLocname)
        } else if (Array.isArray(filterByDocLocname) && filterByDocLocname.length >= 1) {
          const objectIdArray = filterByDocLocname.map(name => mongoose.Types.ObjectId(name));
          filterName["hospital_details.hospital_id"] = { $in: objectIdArray };
        }
      }

      // console.log("filterByPatientname------------", filterByPatientname);
      var filterPetName = {};
      if (filterByPatientname) {
        if (typeof filterByPatientname === 'string') {
          // console.log("IFFFF");
          filterPetName["patientDetails.patientFullName"] = { $regex: filterByPatientname || '', $options: 'i' };
        } else if (Array.isArray(filterByPatientname) && filterByPatientname.length >= 1) {
          // console.log("ELSEEE");

          const regexArray = filterByPatientname.map(name => new RegExp(name, 'i'));
          filterPetName["patientDetails.patientFullName"] = { $in: regexArray };
        }
      }





      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter,
              filterName,
              filterPetName
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
            isPrescriptionValidate: 1,
            cancel_by: 1,
            appointment_complete: 1
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: sortingarray
      })
      if (limit > 0) {
        aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
      }
      const result = await Appointment.aggregate(aggregate);
      // console.log("doctordata----->", result.length);




      let listArray = []
      for (const appointment of result) {
        // console.log("appointment-------->doctor", appointment);
        const todayDate = new Date().toISOString().split('T')[0]
        // const doctorDetails = await BasicInfo.find({for_portal_user: {$eq: appointment.doctorId}})
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
        if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

        //call signed url api here
        let patient_profile = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: appointment.patientId }, headers, 'patientServiceUrl');
        listArray.push({
          appointment_id: appointment._id,
          patient_name: appointment.patientDetails.patientFullName,
          patient_id: appointment.patientId,
          doctor_name: appointment.doctorDetails.full_name,
          doctorId: appointment.doctorId,
          hospital_details: appointment.hospital_details,
          hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          made_by: appointment.madeBy,
          consultation_date: appointment.consultationDate,
          consultation_time: appointment.consultationTime,
          consultation_type: consultationType,
          reason_for_appointment: appointment.reasonForAppointment,
          fee: appointment.consultationFee,
          order_id: appointment.order_id ? appointment.order_id : '',
          status,
          patient_profile: patient_profile?.body,
          createdAt: appointment.createdAt,
          isPrescriptionValidate: appointment.isPrescriptionValidate,
          cancel_by: appointment.cancel_by,
          appointment_complete: appointment.appointment_complete

        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length,
          currentPage: page,
          totalPages: limit > 0 ? Math.ceil(totalCount.length / limit) : 1,
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error---", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async cancelAppointment(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }

      const { appointment_id, loginId, cancelReason, status, cancelledOrAcceptedBy, fromDate, toDate, consultationType } = req.body

      if (fromDate && toDate) {
        var cancelIddoctor = (cancelledOrAcceptedBy);

        let filter = {
          consultationDate: { $gte: fromDate, $lte: toDate },
          doctorId: cancelIddoctor,
          status: { $in: ['NEW', 'APPROVED'] }

        }

        if (!consultationType || consultationType == 'all') {
          filter.appointmentType = { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
        } else {
          filter.appointmentType = { $in: consultationType }
        }

        await Appointment.updateMany(filter, {
          $set: {
            loginId,
            cancelReason,
            status,
            cancelledOrAcceptedBy,
          }
        }, { new: false }).exec();

      } else {

        var appointmentDetails = await Appointment.findOneAndUpdate({ _id: { $eq: appointment_id } }, {
          $set: {
            loginId,
            cancelReason,
            status,
            cancelledOrAcceptedBy,
            // type
          }
        }, { new: true }).exec();
        // return;
        var notificationCreator = null
        var notificationReceiver = null
        let serviceurl = "";
        if (appointmentDetails.madeBy == "doctor") {
          notificationCreator = appointmentDetails.doctorId
          notificationReceiver = appointmentDetails.patientId
          serviceurl = "patientServiceUrl"
        } else {
          notificationCreator = appointmentDetails.patientId 
          notificationReceiver = appointmentDetails.doctorId
          serviceurl= "hospitalServiceUrl"
        }
        var appointType = appointmentDetails.appointmentType.replace("_", " ");

        var noti_messaged = ''
        var noti_type = ''
        switch (status) {
          case ('REJECTED'):
            noti_type = "Appointment Rejected"
            noti_messaged = `Your ${appointType} appointment
             which is scheduled at ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} 
             has been rejected due to ${cancelReason}`;
            break;
          case ('APPROVED'):
            noti_type = "Appointment Approved"
            noti_messaged = `Your ${appointType} appointment
             which is scheduled at ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} 
             has been approved`;
            break;
        }

        var requestData = {
          created_by_type: 'doctor',
          created_by: notificationCreator,
          content: noti_messaged,
          url: '',
          for_portal_user: notificationReceiver,
          notitype: noti_type,
          appointmentId: appointment_id
        }
        var result = await notification(appointmentDetails.madeBy, notificationCreator, serviceurl, req.body.doctorId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
        console.log("result--->", result);
      }


      const message = status == 'REJECTED' ? 'cancelled' : 'Approved';

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Patient appointment ${message} successfully!`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `Something went wrong while cancelling appointment.`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async viewAppointment(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { appointment_id } = req.query
      const result = await Appointment.findById(appointment_id)
        .populate({
          path: 'doctorId',
          select: {
            email: 1,
            mobile: 1,
            country_code: 1,
          }
        })
        .populate({
          path: 'assigned_staff',
          select: {
            email: 1,
            mobile: 1,
            country_code: 1
          }
        })
        .populate({
          path: 'reasonForAppointment',
          select: {
            name: 1,
          }
        })
      let patinetDetails = {
        // patient_name: result.patientDetails.patientFullName,
        patientId:result.patientDetails.patientId,
        patient_name: `${result.patientDetails.patientFirstName} ${result.patientDetails.patientMiddleName} ${result.patientDetails.patientLastName}`,
        patient_mobile: result.patientDetails.patientMobile,
        patient_email: result.patientDetails.patientEmail,
        patient_dob: result.patientDetails.patientDob,
        patient_gender: result.patientDetails.gender,
        patient_ssn_number: '',
        patient_matital_status: '',
        patient_insuranceNumber: result.patientDetails.insuranceNumber,
        address: result.patientDetails.address,
        loc: result.patientDetails.loc,
        postal_code: '',
        country: '',
        emergency_contact: {
          name: '',
          relationship: '',
          mobile: '',
          address: '',
        },
        patient_profle: ''
      }
      if (result.patientDetails.patientId != null) {
        const resData = await httpService.getStaging('insurance-subscriber/view-subscriber', { subscriber_id: result.patientDetails.patientId }, headers, 'insuranceServiceUrl');
        if (resData.body) {
          const subscriberDetails = resData.body.subscriber_details
          patinetDetails.patient_dob = subscriberDetails.date_of_birth
          patinetDetails.patient_gender = subscriberDetails.gender
        }
      }
      let assignedStaff = []
      if (result.assigned_staff.length > 0) {
        const getStaff = await ProfileInfo.find({ for_portal_user: { $in: result.assigned_staff } }).populate({ path: 'for_portal_user', select: { email: 1, mobile: 1, country_code: 1 } })
        for (const staff of getStaff) {
          let image = ''
          if (staff.profile_picture) {
            image = await getDocument(staff.profile_picture)
          }
          assignedStaff.push({
            name: staff.name,
            staff_portal_id: staff.for_portal_user._id,
            profile_picture: image,
            email: staff.for_portal_user.email,
            mobile: staff.for_portal_user.mobile,
            country_code: staff.for_portal_user.country_code
          })
        }
      }
      const date = formatDateAndTime(new Date())
      let status = ''
      if (result.status === 'NEW') status = 'New'
      if (result.status === 'REJECTED') status = 'Rejected'
      if (result.status == 'PAST') status = 'Past'
      if (result.status == 'MISSED') status = 'Missed'
      if (result.status === 'APPROVED') {
        status = date == result.consultationDate ? 'Today' : 'Upcoming'
      }
      const appointmentDetails = {
        appointment_id: result._id,
        date: result.consultationDate,
        time: result.consultationTime,
        consultationType: result.appointmentType,
        consultationFee: result.consultationFee,
        reasonForAppointment: result.reasonForAppointment,
        cancelReason: result.cancelReason,
        cancel_by: result.cancel_by,
        order_id: result.order_id ? result.order_id : '',
        status,
        consultationData: result.consultationData ? result.consultationData : '',
        doctorId: result?.doctorId?._id,
        hospital_details: result?.hospital_details,
        paymentStatus: result.isPaymentDone,
        subscriberId: result.consultationUserType,
        paymentType: result.paymentType,
        paymentdetails: result?.paymentDetails,
      }
      let patientAllDetails = "";
      if (result.patientId != null) {
        const getPatientDetails = await httpService.getStaging('patient/patient-details', { patient_id: result.patientId }, headers, 'patientServiceUrl');
        patientAllDetails = getPatientDetails.body

        if (patientAllDetails.personalDetails.in_location) {
          let getLocationDetails = await httpService.postStaging('superadmin/get-locations-name', { location: patientAllDetails.locationDetails }, headers, 'superadminServiceUrl');
          const locationDetails = getLocationDetails.body
          patinetDetails.postal_code = locationDetails.pincode
          patinetDetails.country = locationDetails.countryName.name
          patinetDetails.emergency_contact.address = locationDetails.address
        }
        patinetDetails.emergency_contact = patientAllDetails.personalDetails.emergency_contact
        let patient_profile_response = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: result.patientId }, headers, 'patientServiceUrl');
        patinetDetails.patient_profle = patient_profile_response?.body ? patient_profile_response?.body?.profile_signed_url : ''

      }



      //getting doctor profile signed url
      const basic_info = await BasicInfo.findOne(
        { for_portal_user: result?.doctorId?._id }
      ).select(
        { for_portal_user: 1, full_name: 1 }
      ).populate(
        { path: 'profile_picture', select: 'url' }
      )

      let doctor_basic_info = {
        profile_picture: '',
        full_name: basic_info ? basic_info?.full_name : '',
        email: result?.doctorId?.email,
        mobile: result?.doctorId?.mobile,
      }
      if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
        const image_url = await getDocument(basic_info?.profile_picture?.url)
        doctor_basic_info.profile_picture = image_url ? image_url : ''
      }
      let otherinfo = {
        ANSJSON: result?.ANSJSON,
        consultationData: result?.consultationData,
        templateJSON: result?.templateJSON
      }

      sendResponse(req, res, 200, {
        status: true,
        data: { patinetDetails, appointmentDetails, patientAllDetails, assignedStaff, doctor_basic_info, otherinfo },
        message: `patient appointment fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message,
        errorCode: error.code,
      });
    }
  }
  async viewAppointmentByRoomName(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { roomname, appointment_id } = req.query
      var result = {}
      if (appointment_id == undefined) {
        result = await Appointment.findOne({ roomName: roomname })

      }
      else {
        result = await Appointment.findOne({ _id: appointment_id })

      }


      let userinfodetails = []
      if (result?.users) {
        userinfodetails = result.users;
      }
      let participantsinfodetails = []
      if (result?.participants) {
        participantsinfodetails = result.participants;
      }
      let roomdetails = {
        roomName: result.roomName,
        callstatus: result.callstatus,
        callerId: result.callerId,
        roomDate: result.roomDate,
        appointmentId: result._id
      }

      sendResponse(req, res, 200, {
        status: true,
        data: { roomdetails, userinfodetails, participantsinfodetails },
        message: `patient appointment fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message,
        errorCode: error.code,
      });
    }
  }

  async updateUnreadMessage(req, res) {
    try {
      const user_id = req.query.id;
      const chatId = req.query.chatId;
      const headers = {
        'Authorization': req.headers['authorization']
      }

      const result = await Appointment.findOneAndUpdate(
        { 
          _id: chatId,
          'chatmessage.receiver.id': user_id,
          'chatmessage.receiver.read': true
      },
      { $set: { 'chatmessage.$[elem].receiver.$[innerElem].read': false } },
      { 
          new: true,
          arrayFilters: [
              { 'elem.receiver.id': user_id },
              { 'innerElem.read': true }
          ]
      }
      );

      sendResponse(req, res, 200, {
        status: true,
        data: { result : result},
        message: `Message field updated fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(`error============`, error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message,
        errorCode: error.code,
      });
    }
  }

  async viewAppointmentCheck(req, res) {
    try {
      const { appointment_id } = req.query
      var result = {}
     
      result = await Appointment.findOne({ _id: appointment_id,status: "APPROVED" })
      if(result){
        sendResponse(req, res, 200, {
          status: true,
          data: { appointment_id:appointment_id  },
          message: `patient appointment fetched successfully`,
          errorCode: null,
        });
      }
      else{
        sendResponse(req, res, 500, {
          status: false,
          body: "Appointment not found.",
          message: "Appointment not found."
        });
      }
      
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message,
        errorCode: error.code,
      });
    }
  }

  async UpdateVideocallAppointment(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const {
        appointmentId,
        callstatus,
        roomName,
        callerId,
        roomDate,
        participants,
        participantstype,
        leftparticipantsid,
        participantuserId,
        isAudioMuted,
        isVideoMuted
      } = req.body
      var appointmentDetails
      // console.log(participants);
      if (participantuserId != undefined) {
        appointmentDetails = await Appointment.findOneAndUpdate(
          { "participants.userId": participantuserId },
          {
            $set: {
              "participants.$.isAudioMuted": isAudioMuted,
              "participants.$.isVideoMuted": isVideoMuted,
            },
          },
          { new: true }
        );
      }
      else {
        if (participants != undefined) {
          console.log(participants);
          console.log(participantstype);
          console.log(appointmentId);

          if (participantstype == 'add') {
            appointmentDetails = await Appointment.findOneAndUpdate(
              { _id: appointmentId },
              { $push: { participants: participants } },
              { new: true }
            );
          }
          else {
            appointmentDetails = await Appointment.findOneAndUpdate(
              { _id: appointmentId },
              {
                $pull: {
                  participants: {
                    userId: mongoose.Types.ObjectId(leftparticipantsid),
                  },
                },
              },
              { new: true }
            );
          }
        }
        else {
          appointmentDetails = await Appointment.findOneAndUpdate(
            { _id: appointmentId },
            {
              $set: {
                callstatus,
                roomName,
                callerId,
                roomDate
              },
            },

            { upsert: false, new: true }
          ).exec();
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: appointmentDetails,
        message: `Appointment updated successfully`,
        errorCode: null,
      });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to add appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async UpdateVideocallchatmessage(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const {
        appointmentId,
        chatmessage,
      } = req.body
      var appointmentDetails
      if (chatmessage != undefined) {
        // if (participantstype == 'add') {
        appointmentDetails = await Appointment.findOneAndUpdate(
          { _id: appointmentId },
          { $push: { chatmessage: chatmessage } },
          { new: true }
        );
        // }
        // else {
        //   appointmentDetails = await Appointment.findOneAndUpdate(
        //     { _id: appointmentId },
        //     {
        //       $pull: {
        //         participants: {
        //           userId: mongoose.Types.ObjectId(leftparticipantsid),
        //         },
        //       },
        //     },
        //     { new: true }
        //   );
        // }
      }



      sendResponse(req, res, 200, {
        status: true,
        body: appointmentDetails,
        message: `Appointment updated successfully`,
        errorCode: null,
      });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to add appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateAppointmentData(req, res) {
    try {
      const { appointment_id, columnData } = req.body

      await Appointment.findOneAndUpdate({ _id: { $eq: appointment_id } }, {
        $set: columnData
      }, { new: true }).exec();

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Data updated successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong while updating appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async assignHealthcareProvider(req, res) {
    try {
      const { appointment_id, staff_id } = req.body
      await Appointment.updateOne(
        { _id: { $eq: appointment_id } },
        {
          $set: {
            assigned_staff: staff_id,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `healthcare provider assigned successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong while assig healthcare provider`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allDoctors(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const result = await BasicInfo.find({ verify_status: "APPROVED" })
        .select({ first_name: 1, middle_name: 1, last_name: 1, full_name: 1, for_portal_user: 1, _id: 0 })
        .populate({
          path: "for_portal_user",
          match: { isDeleted: false } // Add this match condition
        });
      let filteredResult = result.filter(item => item.for_portal_user);

      let fourPortalData = await httpService.getStaging('labimagingdentaloptical/get-fourportal-basicinfo-data', {}, headers, 'labimagingdentalopticalServiceUrl');
      // console.log("fourPortalData>>>>>>>>>>",fourPortalData)
      let fourPortalfilteredResult = [];

      for (let data1 of fourPortalData?.data) {
        if (data1.for_portal_user) {
          fourPortalfilteredResult.push(data1);
        }
      }
      // Concatenate the arrays
      let allResult = fourPortalfilteredResult.concat(filteredResult);

      sendResponse(req, res, 200, {
        status: true,
        data: allResult,
        message: `Successfully get all doctors`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `Failed to get all doctors`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allDoctorsHopitalizationList(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const result = await BasicInfo.find({ verify_status: "APPROVED" })
        .select({ first_name: 1, middle_name: 1, last_name: 1, full_name: 1, for_portal_user: 1, _id: 0 })
        .populate({
          path: "for_portal_user",
          match: { isDeleted: false } // Add this match condition
        });

      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Successfully get all doctors`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `Failed to get all doctors`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  // async allDoctors(req, res) {
  //   try {
  //     const result = await BasicInfo.find({ verify_status: "APPROVED" }).select({ first_name: 1, middle_name: 1, last_name: 1, full_name: 1, for_portal_user: 1, _id: 0 }).populate({
  //       path: "for_portal_user",
  //       match: { isDeleted: false } // Add this match condition
  //     })
  //     // Filter out any documents where for_portal_user is null
  //     const filteredResult = result.filter(item => item.for_portal_user);
  //     sendResponse(req, res, 200, {
  //       status: true,
  //       data: filteredResult,
  //       message: `Successfully get all doctors`,
  //       errorCode: null,
  //     });
  //   } catch (error) {
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: error,
  //       message: `Failed to get all doctors`,
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }
  async getRelatedDoctors(req, res) {
    try {
      const { speciality, limit, current_doctor_id } = req.query;

      console.log(speciality, "speciality________", current_doctor_id);

      const filter = {
        speciality: mongoose.Types.ObjectId(speciality),
        for_portal_user: { $ne: mongoose.Types.ObjectId(current_doctor_id) },
        'for_portal_user_d.isDeleted': false,
        'for_portal_user_d.lock_user': false,
        'for_portal_user_d.isActive': true
      }
      const project = {
        full_name: 1,
        years_of_experience: 1,
        profile_picture: "$profile_picture.url",
        fee_management: {
          online: "$in_fee_management.online",
          home_visit: "$in_fee_management.home_visit",
          f2f: "$in_fee_management.f2f",
        },
        about: 1,
        portal_user_data: {
          mobile: "$for_portal_user_d.mobile",
          email: "$for_portal_user_d.email",
          country_code: "$for_portal_user_d.country_code",
          portal_user_id: "$for_portal_user_d._id",
          average_rating: "$for_portal_user_d.average_rating",
        },
        services: "$services.service",
        speciality: "$specialties.specilization",
      }
      let aggregate = [
        {
          $lookup: {
            from: 'portalusers',
            localField: 'for_portal_user',
            foreignField: '_id',
            as: 'for_portal_user_d'
          }
        },
        { $unwind: "$for_portal_user_d" },
        /*  {
          $lookup: {
            from: 'documentinfos',
            localField: 'profile_picture',
            foreignField: '_id',
            as: 'profile_picture'
          }
        },
        { $unwind: "$profile_picture" }, */
        {
          $lookup: {
            from: 'feemanagements',
            localField: 'in_fee_management',
            foreignField: '_id',
            as: 'in_fee_management'
          }
        },
        { $unwind: "$in_fee_management" },
        {
          $lookup: {
            from: 'specialties',
            localField: 'speciality',
            foreignField: '_id',
            as: 'specialties'
          }
        },
        { $unwind: "$specialties" },
        { $match: filter },
        //{ $project: project },
        // { $limit: limit * 1 }
      ]
      let result = await BasicInfo.aggregate(aggregate);

      let relatedDataArray = []
      /*       for (const data of result) {
              getDocument(data.profile_picture)
              console.log(data, "resultttttttt__");
              const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: data.portal_user_data.portal_user_id } }).countDocuments()
              const doctor_rating = {
                average_rating: data.portal_user_data.average_rating ? data.portal_user_data.average_rating : 0,
                total_review: getRatingCount
              }
              data.doctor_rating = doctor_rating
              relatedDataArray.push(data)
            } */
      for (const data of result) {
        try {
          const fullImageUrl = '';
          if (data.profile_picture) {
            fullImageUrl = await getDocument(data.profile_picture);
          }
          console.log(data, "successss________");
          const getRatingCount = await ReviewAndRating.find({
            portal_user_id: { $eq: data.for_portal_user_d._id }
          }).countDocuments();

          const doctor_rating = {
            average_rating: data.for_portal_user_d.average_rating ? data.for_portal_user_d.average_rating : 0,
            total_review: getRatingCount
          };

          // Update the doctor_rating and profile_picture with the updated URL
          const updatedData = {
            ...data,
            doctor_rating,
            profile_picture: fullImageUrl
          };
          console.log(updatedData, "updatedDataaaaa____");

          relatedDataArray.push(updatedData);
        } catch (error) {
          console.error('Error getting full image URL:', error);
        }
      }


      sendResponse(req, res, 200, {
        status: true,
        data: { result: relatedDataArray },
        message: `Successfully get related doctors`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `Failed to get related doctors`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getRelatedDoctorsForFourPortals(req, res) {
    try {

      const headers = {
        'Authorization': req.headers['authorization']
      }

      const { speciality, limit } = req.query;

      console.log(speciality, "speciality________");

      const filter = {
        speciality: mongoose.Types.ObjectId(speciality),
        'for_portal_user_d.isDeleted': false,
        'for_portal_user_d.lock_user': false,
        'for_portal_user_d.isActive': true
      }

      let aggregate = [
        {
          $lookup: {
            from: 'portalusers',
            localField: 'for_portal_user',
            foreignField: '_id',
            as: 'for_portal_user_d'
          }
        },
        { $unwind: "$for_portal_user_d" },
        {
          $lookup: {
            from: 'feemanagements',
            localField: 'in_fee_management',
            foreignField: '_id',
            as: 'in_fee_management'
          }
        },
        { $unwind: "$in_fee_management" },
        { $match: filter },
        { $limit: limit * 1 }
      ]
      let result = await BasicInfo.aggregate(aggregate);

      let relatedDataArray = []

      for (const data of result) {
        try {
          const fullImageUrl = '';
          if (data.profile_picture) {
            fullImageUrl = await getDocument(data.profile_picture);
          }
          console.log(data.speciality, "successsss________");

          const speciality = await httpService.getStaging('hospital/get-speciality-data', { data: data.speciality }, headers, 'hospitalServiceUrl')
          //console.log(speciality,"specialityInfooo_____");

          const getRatingCount = await ReviewAndRating.find({
            portal_user_id: { $eq: data.for_portal_user_d._id }
          }).countDocuments();

          const doctor_rating = {
            average_rating: data.for_portal_user_d.average_rating ? data.for_portal_user_d.average_rating : 0,
            total_review: getRatingCount
          };

          // Update the doctor_rating and profile_picture with the updated URL
          const updatedData = {
            ...data,
            doctor_rating,
            profile_picture: fullImageUrl,
            specialityInfo: speciality.data[0]
          };
          //console.log(updatedData, "updatedDataaaaa____");

          relatedDataArray.push(updatedData);
        } catch (error) {
          console.error('Error getting full image URL:', error);
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        data: { result: relatedDataArray },
        message: `Successfully get related doctors`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `Failed to get related doctors`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  //Template Builder
  async addTemplate(req, res) {
    try {
      const {
        templateId,
        templateName,
        templateCategory,
        templateJSON,
        doctorId
      } = req.body;

      const templateNameExist = await Template.findOne({ template_name: templateName, isDeleted: false, for_portal_user: doctorId })



      if (templateNameExist) {
        if (templateId != "") {
          const checkForEdit = await Template.findOne({ _id: templateId });

          if (checkForEdit?.template_name != templateName) {
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: "Template name already taken",
              errorCode: null,
            });
          }
        } else {
          return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Template name should be unique",
            errorCode: null,
          });
        }
      }

      var result
      var message = "successfully created template";

      if (templateId == "") {
        const templateInfo = new Template({
          template_name: templateName,
          template_category: templateCategory,
          template_json: templateJSON,
          for_portal_user: doctorId
        });
        result = await templateInfo.save();
      } else {
        result = await Template.findOneAndUpdate(
          { _id: templateId },
          {
            $set: {
              template_name: templateName,
              template_category: templateCategory,
              template_json: templateJSON,
            }
          },
          { new: true }
        )

        message = "successfully updated template"
      }
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      if (error.code = 11000) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Template name is unique",
          errorCode: "UNIQUE_KEY",
        });
      }
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to create template",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateList(req, res) {
    try {
      const {
        doctorId,
        page,
        limit,
        searchText
      } = req.query;
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray['createdAt'] = -1;
      }
      var filter
      if (searchText == "") {
        filter = {
          for_portal_user: doctorId,
          isDeleted: false
        }
      } else {
        filter = {
          for_portal_user: doctorId,
          isDeleted: false,
          $or: [
            { template_name: { $regex: searchText || '', $options: "i" } },
            { template_category: { $regex: searchText || '', $options: "i" } }
          ]
        }
      }
      var result;
      if (limit == 0) {
        result = await Template.find(filter)
          .sort(sortingarray)
          .exec();
      }
      else {
        result = await Template.find(filter)
          .sort(sortingarray)
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      const count = await Template.countDocuments(filter)
      sendResponse(req, res, 200, {
        status: true,
        body: {
          result,
          count
        },
        message: "Successfully get template list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to get template list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateDetails(req, res) {
    try {
      const {
        templateId
      } = req.query;
      const result = await Template.findOne({ _id: templateId })
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully get template details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to get template details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateDelete(req, res) {
    try {
      const {
        templateId
      } = req.body;
      var result
      result = await Template.findOneAndUpdate(
        { _id: templateId },
        {
          $set: {
            isDeleted: true,
          }
        },
        { new: true }
      )
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully deleted template details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to deleted template details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async createEprescription(req, res) {
    const {
      appointmentId,
      doctorId,
      ePrescriptionNumber,
      patientBiometric,
      liverFailure,
      renalFailure,
      allergies,
      medicalHistory,
      accidentRelated,
      occupationalDesease,
      freeOfCharge
    } = req.body;

    try {

      if (appointmentId == "") {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Appointment Id is required",
          errorCode: null,
        });
      }

      var result;
      var message = ""

      if (ePrescriptionNumber == "") {
        const ePrescNumber = await getNextSequenceValue("ePrescriptionNumber"); //Create New ePrescription Number

        const prescriptionInfo = new Eprescription({
          appointmentId,
          doctorId,
          ePrescriptionNumber: "PRESC-" + ePrescNumber,
          patientBiometric,
          liverFailure,
          renalFailure,
          allergies,
          medicalHistory,
          accidentRelated,
          occupationalDesease,
          freeOfCharge
        });

        result = await prescriptionInfo.save();
        message = "Successfully Saved E-prescription"
      } else {
        result = await Eprescription.findOneAndUpdate(
          { ePrescriptionNumber, appointmentId: appointmentId },
          {
            $set: {
              patientBiometric,
              liverFailure,
              renalFailure,
              allergies,
              medicalHistory,
              accidentRelated,
              occupationalDesease,
              freeOfCharge
            }
          },
          { new: true }
        ).exec();

        message = "Successfully Updated E-prescription"
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to create eprescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionMedicineDosage(req, res) {
    const { dosages } = req.body;

    try {

      dosages.forEach(async (element) => {
        await EprescriptionMedicineDosage.findOneAndUpdate(
          { ePrescriptionId: element.ePrescriptionId, dose_no: element.dose_no, medicineId: element.medicineId },
          { $set: element },
          { upsert: true, new: true }
        )
      });
      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Dosage added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to add medicine dosages",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionLabTest(req, res) {
    const {
      _id,
      ePrescriptionId,
      doctorId,
      labId, lab_name,
      reason_for_lab,
      relevant_clinical_information,
      specific_instruction,
      comment
    } = req.body;

    try {

      var result;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionLab({
          ePrescriptionId,
          doctorId,
          labId, lab_name,
          reason_for_lab,
          relevant_clinical_information,
          specific_instruction,
          comment
        })

        result = await labData.save()

      } else {
        var obj = {
          reason_for_lab,
          relevant_clinical_information,
          specific_instruction,
          comment
        }

        result = await EprescriptionLab.findOneAndUpdate({ _id: _id }, { $set: obj }, { new: true })

        if (result == null) {
          return sendResponse(req, res, 200, {
            status: false,
            body: result,
            message: 'No Record Found',
            errorCode: null,
          });
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Lab Test added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to add Lab Test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionImagingTest(req, res) {
    const {
      _id,
      ePrescriptionId,
      doctorId,
      imagingId,
      imaging_name,
      reason_for_imaging,
      relevant_clinical_information,
      specific_instruction,
      comment
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionImaging({
          ePrescriptionId,
          imagingId,
          doctorId,
          imaging_name,
          reason_for_imaging,
          relevant_clinical_information,
          specific_instruction,
          comment
        })

        result = await labData.save()
        message = "Imaging Test added successfully"

      } else {
        var obj = {
          reason_for_imaging,
          relevant_clinical_information,
          specific_instruction,
          comment
        }

        result = await EprescriptionImaging.findOneAndUpdate({ _id: _id }, { $set: obj }, { new: true })
        if (result == null) {
          return sendResponse(req, res, 200, {
            status: false,
            body: result,
            message: 'No Record Found',
            errorCode: null,
          });
        }
        message = "Imaging Test Updated successfully"
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed To Imaging Test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionVaccination(req, res) {
    const {
      _id,
      ePrescriptionId,
      doctorId,
      vaccinationId,
      vaccination_name,
      dosage,
      comment
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionVaccination({
          ePrescriptionId,
          vaccinationId,
          doctorId,
          vaccination_name,
          dosage,
          comment
        })

        result = await labData.save()
        message = "Vaccination Test added successfully"

      } else {
        var obj = {
          dosage,
          comment
        }

        result = await EprescriptionVaccination.findOneAndUpdate({ _id: _id }, { $set: obj }, { new: true })
        if (result == null) {
          return sendResponse(req, res, 200, {
            status: false,
            body: result,
            message: 'No Record Found',
            errorCode: null,
          });
        }
        message = "Vaccination Test Updated successfully"
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed To Imaging Test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionEyeglass(req, res) {
    const {
      _id,
      ePrescriptionId,
      eyeglassId,
      doctorId,
      eyeglass_name,
      left_eye,
      right_eye,
      treatments,
      visual_acuity,
      comment
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionEyeglass({
          ePrescriptionId,
          eyeglassId,
          doctorId,
          eyeglass_name,
          left_eye,
          right_eye,
          treatments,
          visual_acuity,
          comment
        })

        result = await labData.save()
        message = "Eyeglass Test added successfully"

      } else {
        var obj = {
          left_eye,
          right_eye,
          treatments,
          visual_acuity,
          comment
        }

        result = await EprescriptionEyeglass.findOneAndUpdate({ _id: _id }, { $set: obj }, { new: true })
        if (result == null) {
          return sendResponse(req, res, 200, {
            status: false,
            body: result,
            message: 'No Record Found',
            errorCode: null,
          });
        }
        message = "Eyeglass Test Updated successfully"
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed To Imaging Test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionOther(req, res) {
    const {
      _id,
      ePrescriptionId,
      doctorId,
      otherId, other_name,
      reason_for_other,
      relevant_clinical_information,
      specific_instruction,
      comment
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionOther({
          ePrescriptionId,
          otherId,
          doctorId,
          other_name,
          reason_for_other,
          relevant_clinical_information,
          specific_instruction,
          comment
        })

        result = await labData.save()
        message = "Other Test added successfully"

      } else {
        var obj = {
          reason_for_other,
          relevant_clinical_information,
          specific_instruction,
          comment
        }

        result = await EprescriptionOther.findOneAndUpdate({ _id: _id }, { $set: obj }, { new: true })
        message = "Other Test Updated Successfully"

        if (result == null) {
          return sendResponse(req, res, 200, {
            status: false,
            body: result,
            message: 'No Record Found',
            errorCode: null,
          });
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to add Other Test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescription(req, res) {
    const {
      appointmentId,
    } = req.query;

    try {

      var result;
      var message;

      result = await Eprescription.findOne({ appointmentId })

      let environvent = process.env.NODE_ENV;

      // result.eSignature = `http://localhost:8005/healthcare-crm-hospital/esignature-for-e-prescription/${result.eSignature}`


      if (environvent == 'local') {
        result.eSignature = `http://localhost:8005/healthcare-crm-hospital/esignature-for-e-prescription/${result.eSignature}`

      } else {
        result.eSignature = `${config.healthcare-crm_Backend_url}/healthcare-crm-hospital/esignature-for-e-prescription/${result.eSignature}`
      }

      if (result?.previewTemplate != null) {
        var template = result?.previewTemplate;

        result.previewTemplateSigendUrl = await getBys3UrlDocument(template);

      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'E-prescription fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No E-prescription Found!!',
          errorCode: null,
        });
      }




    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get E-prescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionMedicineDosage(req, res) {
    const {
      ePrescriptionId,
      medicineId
    } = req.query;

    try {
      var result;

      if (medicineId) {
        result = await EprescriptionMedicineDosage.find({ ePrescriptionId, medicineId })
      } else {
        result = await EprescriptionMedicineDosage.find({ ePrescriptionId })
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: 'Medicine Dosage fetched successfully',
        errorCode: null,
      });

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get medicine dosage",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteEprescriptionMedicineDosage(req, res) {
    const {
      doseId
    } = req.body;

    try {
      var result;

      result = await EprescriptionMedicineDosage.findOneAndDelete({
        _id: doseId
      })

      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: 'Medicine Dose Deleted successfully',
        errorCode: null,
      });

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get medicine dosage",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionLabTest(req, res) {
    const {
      ePrescriptionId,
      labId
    } = req.query;

    try {
      var result;

      if (labId) {
        result = await EprescriptionLab.findOne({ ePrescriptionId, labId })
      } else {
        result = await EprescriptionLab.find({ ePrescriptionId })
      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Lab Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Lab Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionImagingTest(req, res) {
    const {
      ePrescriptionId,
      imagingId
    } = req.query;

    try {
      var result;

      if (imagingId) {
        result = await EprescriptionImaging.findOne({ ePrescriptionId, imagingId })
      } else {
        result = await EprescriptionImaging.find({ ePrescriptionId })
      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Imaging Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Imaging Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get imaging test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionVaccinationTest(req, res) {
    const {
      ePrescriptionId,
      vaccinationId
    } = req.query;

    try {
      var result;

      if (vaccinationId) {
        result = await EprescriptionVaccination.findOne({ ePrescriptionId, vaccinationId })
      } else {
        result = await EprescriptionVaccination.find({ ePrescriptionId })
      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Vaccination Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Vaccination Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get vaccination test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionOtherTest(req, res) {
    const {
      ePrescriptionId,
      otherId
    } = req.query;

    try {
      var result;

      if (otherId) {
        result = await EprescriptionOther.findOne({ ePrescriptionId, otherId })
      } else {
        result = await EprescriptionOther.find({ ePrescriptionId })
      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Other Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Other Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get other test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionEyeglassTest(req, res) {
    const {
      ePrescriptionId,
      eyeglassId
    } = req.query;

    try {
      var result;

      if (eyeglassId) {
        result = await EprescriptionEyeglass.findOne({ ePrescriptionId, eyeglassId })
      } else {
        result = await EprescriptionEyeglass.find({ ePrescriptionId })
      }


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Eyeglass Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Eyeglass Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get eyeglass test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllTests(req, res) {
    const {
      appointmentId,
    } = req.query;

    try {
      var result;

      result = await Eprescription.aggregate([
        {
          $match: { appointmentId: mongoose.Types.ObjectId(appointmentId) }
        },
        {
          $lookup: {
            from: 'eprescriptionmedicinedosages',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'dosages'
          }
        },
        {
          $lookup: {
            from: 'eprescriptionlabs',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'labs'
          }
        },
        {
          $lookup: {
            from: 'eprescriptionimagings',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'imaging'
          }
        },
        {
          $lookup: {
            from: 'eprescriptionvaccinations',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'vaccinations'
          }
        },
        {
          $lookup: {
            from: 'eprescriptioneyeglasses',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'eyeglasses'
          }
        },
        {
          $lookup: {
            from: 'eprescriptionothers',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'others'
          }
        }


      ])

      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'All Tests fetched successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Tests Found!!',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get eyeglass test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionEsignature(req, res) {
    const {
      ePrescriptionId,
      previewTemplate,
      appointmentId
    } = req.body;
    console.log("doctorreq.body;___________", req.body);
    try {


      const fileName = req.filename;

      var result;


      result = await Eprescription.findOneAndUpdate(
        { _id: ePrescriptionId },
        { $set: { eSignature: fileName, isValidate: true, previewTemplate: previewTemplate } },
        { new: true });

      if (result) {

        if (appointmentId) {
          await Appointment.findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(appointmentId) },
            { $set: { isPrescriptionValidate: true } }, { new: true })
        }


        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Eprescription validated successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'Eprescription not found',
          errorCode: 'NOT_FOUND',
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to validate eprescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listAllEprescription(req, res) {
    const {
      doctorId,
      page,
      limit,
      appointmentType
    } = req.body;

    try {
      var sort = req.body.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }
      var result;
      var matchFilter = {};

      if (appointmentType == "ALL") {
        matchFilter = { $match: { 'appointment.appointmentType': { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] } } }
      } else {
        matchFilter = { $match: { 'appointment.appointmentType': { $in: [appointmentType] } } }

      }


      result = await Eprescription.aggregate([
        {
          $match: { doctorId: mongoose.Types.ObjectId(doctorId) }
        },
        {
          $lookup: {
            from: 'appointments',
            localField: 'appointmentId',
            foreignField: '_id',
            as: 'appointment'
          }
        },
        { $unwind: "$appointment" },
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'appointment.reasonForAppointment',
            foreignField: '_id',
            as: 'reasonforappointments'
          }
        },
        {

          $set: {

            "appointment.reasonForAppointment": "$reasonforappointments.name",

          }

        },
        matchFilter,
        { $sort: sortingarray },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 },


      ])

      const count = await Eprescription.aggregate([
        {
          $match: { doctorId: mongoose.Types.ObjectId(doctorId), isValidate: true }
        },
        {
          $lookup: {
            from: 'appointments',
            localField: 'appointmentId',
            foreignField: '_id',
            as: 'appointment'
          }
        },
        { $unwind: "$appointment" },
        matchFilter
      ])


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: {
            totalPages: Math.ceil(count.length / limit),
            currentPage: page,
            totalRecords: count.length,
            result,
          },
          message: 'Eprescriptions fetched succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetched eprescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listRecentMedicinesPrescribed(req, res) {
    const {
      doctorId,
      recentItemsFor
    } = req.query;

    try {
      var result;

      if (recentItemsFor == 'Medicines') {
        result = await EprescriptionMedicineDosage.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Labs') {
        result = await EprescriptionLab.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Imaging') {
        result = await EprescriptionImaging.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Vaccination') {
        result = await EprescriptionVaccination.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Eyeglass') {
        result = await EprescriptionEyeglass.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      } else {
        result = await EprescriptionOther.find({ doctorId }).sort({ "createdAt": -1 }).limit(10);
      }

      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Recent prescribes fetched succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to recent prescribes",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getDoctorLocationInfo(req, res) {
    const {
      doctorId
    } = req.query;

    try {
      var result;

      result = await location_info.findOne({ for_portal_user: doctorId })


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Location info fetched succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetched lacation info ",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async updateAppointmentPaymentStatus(req, res) {
    try {
      const { data } = req.body
      console.log("data---------->>>>>>>", data)
      if (data?.metadata) {
        let appointmentDetails = await Appointment.updateOne(
          { order_id: data.metadata.order_id },
          {
            $set: {
              isPaymentDone: true,
              paymentDetails: {
                doctorFees: data.metadata.plan_price,
                transactionID: data.id
              }
            },
          }
        )
        console.log("appointmentDetails---->>>>>", appointmentDetails)
        updatePaymentStatusAndSlot(data.metadata.order_id);

        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: 'data updated succesfully',
          errorCode: null,
        });
      } else {
        let appointmentDetails = await Appointment.updateOne(
          { order_id: data.order_id },
          {
            $set: {
              isPaymentDone: true,
              paymentDetails: {
                doctorFees: data?.plan_price,
                transactionID: data?.transaction_id
              }
            },
          }
        )
        console.log("appointmentDetails---->>>>>", appointmentDetails)
        updatePaymentStatusAndSlot(data.order_id);

        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: 'data updated succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Failed to update appointment payment status",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async addAcceptedInsurance(req, res) {
    try {
      const { main_phone_number, insuracneCompanyId, oldInsuracneCompanyId, oldInsuracneCompanyIdforstatus } = req.body
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const adminData = await BasicInfo.find({ main_phone_number: { $in: main_phone_number } }, {
        insurance_accepted: 1
      });
      adminData.forEach(async element => {
        let insurance_accepted = 'insurance_accepted' in element ? element.insurance_accepted : [];
        if (insurance_accepted.indexOf(insuracneCompanyId) == -1) {
          insurance_accepted.push(insuracneCompanyId);
        }
        if (oldInsuracneCompanyId) {
          const index = insurance_accepted.indexOf(oldInsuracneCompanyId)
          insurance_accepted.splice(index, 1)
        }

        if (oldInsuracneCompanyIdforstatus != undefined) {

          if (oldInsuracneCompanyIdforstatus) {
            if (insurance_accepted.indexOf(insuracneCompanyId) == -1) {
              insurance_accepted.push(insuracneCompanyId);
            }

          }
          else {
            const index = insurance_accepted.indexOf(insuracneCompanyId)
            insurance_accepted.splice(index, 1)
          }

        }
        const setIp = await BasicInfo.updateOne(
          { _id: element._id },
          {
            $set: {
              insurance_accepted: insurance_accepted
            },
          },
          { new: true }
        ).exec();


      });

      sendResponse(req, res, 200, {
        status: true,
        data: {
          adminData
        },
        message: `insurance companies added successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to add insurance companies`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllEprescriptionDetailsForClaimMedicine(req, res) {
    const {
      ePrescriptionNumber,
    } = req.query;

    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      var result;

      result = await Eprescription.aggregate([
        {
          $match: { ePrescriptionNumber: ePrescriptionNumber }
        },
        {
          $lookup: {
            from: 'eprescriptionmedicinedosages',
            localField: '_id',
            foreignField: 'ePrescriptionId',
            as: 'dosages'
          }
        },
        // { $unwind: { path: "$dosages", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'appointments',
            localField: 'appointmentId',
            foreignField: '_id',
            as: 'appointment'
          }
        },
        { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'basicinfos',
            localField: 'appointment.doctorId',
            foreignField: 'for_portal_user',
            as: 'basicinfos'
          }
        },
        { $unwind: { path: "$basicinfos", preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'specialties',
            localField: 'basicinfos.speciality',
            foreignField: '_id',
            as: 'specialties'
          }
        },
        { $unwind: { path: "$specialties", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            ePrescriptionNumber: 1,
            appointmentId: 1,
            medicines: "$dosages",
            subscriberId: "$appointment.consultationUserType",
            reasonForAppointment: "$appointment.reasonForAppointment",
            prescriberCenterDetails: {
              prescriberCenter: '$appointment.hospital_details.hospital_name',
              prescriberFirstName: '$basicinfos.first_name',
              prescriberMiddleName: '$basicinfos.middle_name',
              prescriberLastName: '$basicinfos.last_name',
              prescriberTitle: '$basicinfos.title',
              prescriberSpeciality: '$specialties.specilization'
            }
          }
        },

      ])

      let wrapResult = { ...result[0] }

      if (result[0]?.subscriberId) {
        let subscriberDetails = await httpService.getStaging('insurance-subscriber/view-subscriber', { subscriber_id: result[0]?.subscriberId }, headers, 'insuranceServiceUrl');
        if (subscriberDetails) {
          wrapResult = { ...wrapResult, insuranceId: subscriberDetails?.body?.subscriber_details?.for_user }
        }
      }


      if (result?.length > 0) {
        sendResponse(req, res, 200, {
          status: true,
          body: wrapResult,
          message: 'Eprescription Data Fetched Successfully',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Details Found!! Please Enter Valid ePrescription Number',
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get eprescription details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  
  async checkEprescriptionAvailability(req, res) {
    try {
      const getData = await Eprescription.find({ ePrescriptionNumber: req.query.eprescription_number })
      console.log("reqqqqqqqqqqqqqq__________",req.query)
      console.log("getData111__________",getData)
      if (getData.length > 0) {
        const eprescriptionID = getData[0]._id
        // const getAllMedicine = await EprescriptionMedicineDosage.find({ ePrescriptionId: { $eq: eprescriptionID } });

        let getAllMedicine={};
      console.log("eprescriptionID___________",eprescriptionID)
        if(req.query.test_type === 'Laboratory-Imaging'){
          getAllMedicine = await EprescriptionImaging.find({ ePrescriptionId: { $eq: eprescriptionID } });
          console.log("getAllMedicine________",getAllMedicine)
        }else if(req.query.test_type === 'Paramedical-Professions'){
          getAllMedicine = await EprescriptionLab.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }else if(req.query.test_type === 'Dental'){
          getAllMedicine = await EprescriptionOther.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }else if(req.query.test_type === 'Optical'){
          getAllMedicine = await EprescriptionEyeglass.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }else if(req.query.test_type === 'Medicine'){
          getAllMedicine = await EprescriptionMedicineDosage.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }else{
          getAllMedicine = await EprescriptionMedicineDosage.find({ ePrescriptionId: { $eq: eprescriptionID } }); 
        }

        sendResponse(req, res, 200, {
          status: true,
          body: {
            medicineDosageData: getAllMedicine
          },
          message: 'Successfully fetched data',
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No Details Found!! Please Enter Valid ePrescription Number',
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error__________________________",error)
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  // get-data-Asper-assign-Doctor-for-hospital-staff
  async getdataAsperHospitalDoctor(req, res) {
    try {
      const { in_hospital, doctor_list, departmentArray, unitArray, serviceArray } = req.body;
      console.log("req.query---->", req.body);

      const filter = {
        for_hospitalIds: mongoose.Types.ObjectId(in_hospital),
        $or: [
          { department: { $in: departmentArray.map(id => mongoose.Types.ObjectId(id)) } },
          { unit: { $in: unitArray.map(id => mongoose.Types.ObjectId(id)) } },
          { services: { $in: serviceArray.map(id => mongoose.Types.ObjectId(id)) } },
          { for_portal_user: { $in: doctor_list.map(id => mongoose.Types.ObjectId(id)) } }
        ]
      };
      console.log("filter----->", filter);
      const findData = await BasicInfo.aggregate([
        {
          $match: filter
        },
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_userData"
          }
        },
        {
          $unwind: { path: "$for_portal_userData", preserveNullAndEmptyArrays: true }
        },
        {
          $match: { "for_portal_userData.isDeleted": false }
        }
      ]);

      sendResponse(req, res, 200, {
        status: true,
        body: {
          count: findData.length,
          data: findData
        },
        message: "Data Fetched successfully",
        errorCode: null
      });

    } catch (error) {
      console.log("errorrrrrrrrrr", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  // get-assign-doctor-details-for -hospital-staff
  async postAssignDoctor(req, res) {
    try {
      const { doctor_ids } = req.body;
      console.log("doctor_ids--->", req.body);

      const findData = await BasicInfo.find({ for_portal_user: { $in: doctor_ids } })
      sendResponse(req, res, 200, {
        status: true,
        body: {
          data: findData
        },
        message: "Get individual doctor list",
        errorCode: null,
      });

    } catch (error) {
      console.log("eror--->", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get individual doctor details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }

  }

  async onlineConsultationCount(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      // console.log("insideeeOnline_____",req.query);
      const { doctor_portal_id, consultation_type, status, date } = req.query;
      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];
      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      //console.log("totalCount=======>", totalCount)

      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })


      const result = await Appointment.aggregate(aggregate);

      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
        listArray.push({
          // appointment_id: appointment._id,
          // patient_name: appointment.patientDetails.patientFullName,
          // patient_id: appointment.patientId,
          // doctor_name: appointment.doctorDetails.full_name,
          // doctorId: appointment.doctorId,
          // hospital_details: appointment.hospital_details,
          // hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          // made_by: appointment.madeBy,
          // consultation_date: appointment.consultationDate,
          // consultation_time: appointment.consultationTime,
          // consultation_type: consultationType,
          // reason_for_appointment: appointment.reasonForAppointment,
          fee: appointment.consultationFee,
          // order_id: appointment.order_id ? appointment.order_id : '',
          status,
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length,
          // currentPage: page,
          // totalPages: limit > 0 ? Math.ceil(totalCount.length / limit) : 1,
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async facetofaceConsultationCount(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { doctor_portal_id, consultation_type, status, date } = req.query;
      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];
      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })

      const result = await Appointment.aggregate(aggregate);

      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

        listArray.push({
          // appointment_id: appointment._id,
          // patient_name: appointment.patientDetails.patientFullName,
          // patient_id: appointment.patientId,
          // doctor_name: appointment.doctorDetails.full_name,
          // doctorId: appointment.doctorId,
          // hospital_details: appointment.hospital_details,
          // hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          // made_by: appointment.madeBy,
          // consultation_date: appointment.consultationDate,
          // consultation_time: appointment.consultationTime,
          // consultation_type: consultationType,
          // reason_for_appointment: appointment.reasonForAppointment,
          fee: appointment.consultationFee,
          // order_id: appointment.order_id ? appointment.order_id : '',
          status,
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async homeConsultationCount(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { doctor_portal_id, consultation_type, status, date } = req.query;
      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];
      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })

      const result = await Appointment.aggregate(aggregate);

      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'

        listArray.push({
          // appointment_id: appointment._id,
          // patient_name: appointment.patientDetails.patientFullName,
          // patient_id: appointment.patientId,
          // doctor_name: appointment.doctorDetails.full_name,
          // doctorId: appointment.doctorId,
          // hospital_details: appointment.hospital_details,
          // hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          // made_by: appointment.madeBy,
          // consultation_date: appointment.consultationDate,
          // consultation_time: appointment.consultationTime,
          // consultation_type: consultationType,
          // reason_for_appointment: appointment.reasonForAppointment,
          fee: appointment.consultationFee,
          // order_id: appointment.order_id ? appointment.order_id : '',
          status,
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allConsultationCount(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { doctor_portal_id, consultation_type, status, date } = req.query;
      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];
      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            // patientDetails: 1,
            // patientId: 1,
            // madeBy: 1,
            // consultationDate: 1,
            // consultationTime: 1,
            // appointmentType: 1,
            consultationFee: 1,
            // reasonForAppointment: 1,
            status: 1,
            // doctorId: 1,
            // hospital_details: 1,
            // doctorDetails: 1,
            // createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })

      const result = await Appointment.aggregate(aggregate);

      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'

        listArray.push({
          fee: appointment.consultationFee,
          status,
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async graphListHospital(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { doctor_portal_id, consultation_type, status, date } = req.query;

      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {

        statusFilter = {
          status: { $ne: 'NA' }
        }
        if (status == 'NEW') {
          statusFilter = {
            status: 'NEW'
          }
        }
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }
        if (status == 'APPROVED') {
          statusFilter = {
            // consultationDate: { $eq: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }

        if (status == 'REJECTED') {
          statusFilter = {
            status: "REJECTED"
          }
        }
        if (status == 'PAST') {
          statusFilter = {
            consultationDate: { $lt: new Date().toISOString().split('T')[0] },
            status: "PAST"
          }
        }

        if (status == 'MISSED') {
          statusFilter = {
            status: "MISSED"
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })
      const result = await Appointment.aggregate(aggregate);
      // console.log("doctordata----->",result.doctorDetails);

      // For graph purpose
      let monthlyCount = {};
      let currentYear = moment().year();
      moment.months().forEach((month) => {
        monthlyCount[month] = 0;
      });

      result.forEach((item) => {
        if (item) {
          let createDate = moment(item.createdAt);
          let year = createDate.year();

          // console.log("createDateyear",year,createDate)

          if (year === currentYear) {
            let month = createDate.format("MMMM");
            if (!monthlyCount[month]) {
              monthlyCount[month] = 1;
            } else {
              monthlyCount[month]++;
            }
          }

        }
      });
      // console.log("monthlyCount",monthlyCount)
      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
        if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

        listArray.push({
          appointment_id: appointment._id,
          doctorId: appointment.doctorId,
          status,
          createdAt: appointment.createdAt
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          graphData: monthlyCount,
          totalCount: totalCount.length,

        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }





  // Type of Health Type
  async addHealthCentre_SuperAdmin(req, res) {
    try {
      const { healthcentreArray, added_by } = req.body
      const list = healthcentreArray.map((singleData) => ({
        ...singleData,
        added_by
      }));
      const namesToFind = list.map((item) => item.name);
      const foundItems = await HospitalType.find({
        name: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.name);
      if (foundItems.length == 0) {
        const savedHealthCentre = await HospitalType.insertMany(list)
        sendResponse(req, res, 200, {
          status: true,
          body: savedHealthCentre,
          message: "Successfully add HospitalType",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: `${CheckData} is already exist`,
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add HospitalType",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allHealthCentreList(req, res) {
    try {
      const { limit, page, searchText } = req.query
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != undefined && sort != '') {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray["createdAt"] = -1;

      }
      var filter = { delete_status: false }
      if (searchText != "") {
        filter = {
          delete_status: false,
          name: { $regex: searchText || '', $options: "i" }
        }
      }
      const healthList = await HospitalType.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await HospitalType.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: healthList,
        },
        message: "Successfully get HospitalType list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get HospitalType list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateHealthCentre(req, res) {
    try {
      const {
        healthcentreId,
        name,
        active_status,
        delete_status
      } = req.body
      const list = await HospitalType.find({ name: name, active_status: active_status, _id: { $ne: mongoose.Types.ObjectId(healthcentreId) }, is_deleted: false });
      if (list.length == 0) {
        const updateHealthCentre = await HospitalType.updateOne(
          { _id: healthcentreId },
          {
            $set: {
              name,
              active_status,
              delete_status
            }
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: updateHealthCentre,
          message: "Successfully updated HospitalType",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "HealthType already exist",
          errorCode: null,
        });
      }

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update HospitalType`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnHealthCentre(req, res) {
    try {
      const { healthcentreId, action_name, action_value } = req.body
      var message = ''

      const filter = {}
      if (action_name == "active") filter['active_status'] = action_value
      if (action_name == "delete") filter['delete_status'] = action_value

      if (action_name == "active") {
        var result = await HospitalType.updateOne(
          { _id: healthcentreId },
          filter,
          { new: true }
        ).exec();

        message = action_value == true ? 'Successfully Active HospitalType' : 'Successfully In-active HospitalType'
      }

      if (action_name == "delete") {
        if (healthcentreId == '') {
          await HospitalType.updateMany(
            { delete_status: { $eq: false } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        else {
          await HospitalType.updateMany(
            { _id: { $in: healthcentreId } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        message = 'Successfully HospitalType deleted'
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to HospitalType done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allHealthCentreListforexport(req, res) {
    const { searchText, limit, page } = req.query
    var filter
    if (searchText == "") {
      filter = {
        delete_status: false
      }
    } else {
      filter = {
        delete_status: false,
        name: { $regex: searchText || '', $options: "i" },
      }
    }
    try {
      var result = '';
      if (limit > 0) {
        result = await HospitalType.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      else {
        result = await HospitalType.aggregate([{
          $match: filter
        },
        { $sort: { "createdAt": -1 } },
        {
          $project: {
            _id: 0,
            name: "$name"
          }
        }
        ])
      }
      console.log(result, "result check")
      let array = result.map(obj => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array
        },
        message: `HospitalType added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add HospitalType`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForHealthCentre(req, res) {
    try {
      const filePath = './uploads/' + req.filename;
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(HealthCenterColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }

      const existingHealthCentres = await HospitalType.find({}, 'name');
      const existingHealthCentreNames = existingHealthCentres.map(center => center.name);

      const inputArray = [];
      const duplicateHealthCentres = [];

      for (const singleData of data) {
        const trimmedHealthCentre = singleData.name.trim();
        if (existingHealthCentreNames.includes(trimmedHealthCentre)) {
          duplicateHealthCentres.push(trimmedHealthCentre);
        } else {
          inputArray.push({
            name: trimmedHealthCentre,
            added_by: req.body.added_by,
          });
        }
      }

      if (duplicateHealthCentres.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Health centers already exist: ${duplicateHealthCentres.join(', ')}`,
          errorCode: null,
        });
      }

      if (inputArray.length > 0) {
        const result = await HospitalType.insertMany(inputArray);
        return sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All health centre records added successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "No new health centers added",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error');
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async commmonHealthCentreList(req, res) {
    try {
      const list = await HospitalType.find({ delete_status: false, active_status: true });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All HealthCentre list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get HealthCentre list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionTemplateUrl(req, res) {
    const {
      appointmentId,
    } = req.query;
    try {
      var result;
      result = await Eprescription.findOne({ appointmentId })
      let previewTemplate = '';

      let environvent = process.env.NODE_ENV;
      let url = process.env.healthcare-crm_FRONTEND_URL;

      if (result?.previewTemplate != null) {
        var template = result?.previewTemplate;
        previewTemplate = await downloadSignedUrl(template);

      } else {
        res.send('There is no eSignature. Please add eSignature!!')
      }
      console.log("previewTemplate", previewTemplate, "envvvv", environvent);
      if (result) {
        if (previewTemplate != '') {
          if (environvent == 'local') {
            console.log("iffff");
            res.redirect(`http://localhost:4200/individual-doctor/eprescription-viewpdf?id=${appointmentId}`);

          } else {
            console.log("else");
            res.redirect(`${url}/individual-doctor/eprescription-viewpdf?id=${appointmentId}`);

          }
        } else {
          res.redirect();
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'No E-prescription Found!!',
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get E-prescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async getIdbyDoctorName(req, res) {
    try {
      const { doctorId } = req.query;

      const matchStage = {
        $match: {
          _id: mongoose.Types.ObjectId(doctorId),
          verified: true,
          isActive: true,
          isDeleted: false,
          lock_user: false
        }
      };

      const pipeline = [
        matchStage,
        {
          $lookup: {
            from: "basicinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "doctorData"
          }
        },
        {
          $unwind: "$doctorData"
        },
        {
          $project: {
            full_name: "$doctorData.full_name"
          }
        }

      ];
      const result = await PortalUser.aggregate(pipeline);

      console.log("result-------", result);

      sendResponse(req, res, 200, {
        status: true,
        body: result[0]?.full_name,
        message: "List getting successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetch list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async sendMailTOPatient(req, res) {
    try {
      const { patient_data, doctor_email, doctor_name, appointment_Id } = req.body;
      let patient_email = patient_data?.patient_email
      let patient_name = patient_data?.patient_name

      const content = sendEprescriptionEmail(patient_email, doctor_email, appointment_Id, patient_name, doctor_name)
      await sendEmail(content)
      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Email Send successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Send Email.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async saveSuperadminNotification(req, res) {
    console.log("sddfr>>>>>>", req.body)
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      let saveNotify = await new Notification({
        created_by: req.body.data?.created_by,
        notification_name: req.body.data?.notification_name,
        for_portal_user: req.body?.data?.for_portal_user,
        content: req.body.data?.content,
        created_by_type: req.body.data?.created_by_type,
        notitype: req.body.data?.notitype
      })
      let saveData = await saveNotify.save();


      if (saveData) {

        return sendResponse(req, res, 200, {

          status: true,

          body: saveData,

          message: "Notification Saved Successfully",

        });

      } else {

        return sendResponse(req, res, 400, {

          status: true,

          body: [],

          message: "Notification not Saved",

        });

      }



    } catch (err) {

      console.log("err", err)

      return sendResponse(req, res, 500, {

        status: false,

        body: err,

        message: "Internal server error",

      });

    }

  }

  async onlineAndInsurancePaymentCountOfPatientForDoctor(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { doctor_portal_id, consultation_type, status, date } = req.query;
      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];
      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }

      }

      var dateFilter = {}
      if (date && date != "") {
        dateFilter = {
          consultationDate: date,
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);
      aggregate.push({
        $sort: {
          createdAt: -1
        }
      })

      console.log("totalCount=======>", totalCount)

      const result = await Appointment.aggregate(aggregate);

      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'

        listArray.push({
          fee: appointment.consultationFee,
          status,
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length,
          // currentPage: page,
          // totalPages: limit > 0 ? Math.ceil(totalCount.length / limit) : 1,
        },
        message: `patient appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async patientPaymentHistoryToDoctor(req, res) {
    try {
      const {
        doctor_portal_id,
        searchTextP,
        searchTextD,
        appointmentStatus,
        appointmentStartDate,
        appointmentEndDate,
        limit,
        page
      } = req.query;

      //console.log(req.query,"queryyyy_______");

      let filter = [{}]
      let appointmentStatus_filter = {}
      let appointment_filter = {}

      if (searchTextD !== "") {
        filter =
          [
            { 'doctorDetails.full_name': { $regex: searchTextD || '', $options: 'i' } },
          ]
      }
      if (searchTextP !== "") {
        filter =
          [
            { 'patientDetails.patientFullName': { $regex: searchTextP || '', $options: 'i' } },
          ]
      }

      if (appointmentStatus !== '') {
        appointmentStatus_filter = {
          'status': appointmentStatus
        }
      }

      if (appointmentStartDate !== '' && appointmentEndDate !== '') {
        appointment_filter = {
          'consultationDate': {
            $gte: new Date(appointmentStartDate).toISOString(),
            $lte: new Date(appointmentEndDate).toISOString()
          }
        };
      }

      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL_DOCTOR"] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 },
        {
          $match: {
            $and: [
              appointmentStatus_filter,
              { $or: filter },
              appointment_filter
            ]
          }
        }
      ];

      const totalResult = await Appointment.aggregate([
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL_DOCTOR"] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $match: {
            $and: [
              appointmentStatus_filter,
              { $or: filter },
              appointment_filter
            ]
          }
        }
      ]);
      let totalCount = totalResult.length;
      let totalAmount = 0;

      for (let totalRevenue of totalResult) {
        totalAmount = totalAmount + Number(totalRevenue.paymentDetails.doctorFees)
      }
      console.log(totalResult.length, "totalResultstoryyy______");

      const paymentHistory = await Appointment.aggregate(aggregate);

      sendResponse(req, res, 200, {
        status: true,
        data: {
          paymentHistory: paymentHistory, totalCount: totalCount, totalAmount: totalAmount
        },
        message: "Payment History Fetched successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Fetch Payment History.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async totalAppointmentsCountRevenueOfDoctor(req, res) {
    try {
      const {
        doctor_portal_id,
        yearFilter,
        dateFilter
      } = req.query;

      //console.log(req.query,"queryyyy_______");  

      var date = new Date();
      var yearWiseFilter = {};
      var dateWiseFilter = {};

      var currentYear = date.getFullYear();
      //console.log(currentYear, "currentYearrr",yearFilter);

      if (Number(yearFilter) !== Number(currentYear)) {
        yearWiseFilter = {
          'consultationDate': {
            $gte: new Date(`${yearFilter}-01-01T00:00:00.000Z`).toISOString(),
            $lt: new Date(`${Number(yearFilter) + 1}-01-01T00:00:00.000Z`).toISOString()
          }
        };
      }

      if (dateFilter !== '') {
        dateWiseFilter = {
          'consultationDate': {
            $gte: new Date(dateFilter).toISOString()
          }
        };
      }

      //console.log(dateWiseFilter,"dateWiseFilter___");

      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL_DOCTOR"] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            paymentType: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        {
          $match: {
            $and: [
              yearWiseFilter,
              dateWiseFilter
            ]
          }
        }
      ];

      const paymentAppointmentsRevenuesCount = await Appointment.aggregate(aggregate);

      let F2FCoPay = 0;
      let F2FInsuranceToBePaid = 0;

      let OnlineCoPay = 0;
      let OnlineInsuranceToBePaid = 0;

      let HomeVisitCoPay = 0;
      let HomeVisitInsuranceToBePaid = 0;
      //console.log(paymentAppointmentsRevenuesCount[0],"detailssss_______");

      for (let appointment of paymentAppointmentsRevenuesCount) {


        if (appointment.appointmentType === "FACE_TO_FACE") {
          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            F2FCoPay = F2FCoPay + Number(appointment?.paymentDetails?.copay ? appointment?.paymentDetails?.copay : F2FCoPay);
            F2FInsuranceToBePaid = F2FInsuranceToBePaid + (appointment?.paymentDetails?.insuranceTobePaid ? appointment?.paymentDetails?.insuranceTobePaid : F2FInsuranceToBePaid)
          } else {
            F2FCoPay = F2FCoPay + Number(appointment?.paymentDetails?.doctorFees ? appointment?.paymentDetails?.doctorFees : F2FCoPay);
          }
        }

        if (appointment.appointmentType === "ONLINE") {
          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            //console.log("insideee222222__");
            OnlineCoPay = OnlineCoPay + Number(appointment.paymentDetails.copay ? appointment.paymentDetails.copay : OnlineCoPay);
            OnlineInsuranceToBePaid = OnlineInsuranceToBePaid + (appointment.paymentDetails.insuranceTobePaid ? appointment.paymentDetails.insuranceTobePaid : OnlineInsuranceToBePaid)
          } else {
            OnlineCoPay = OnlineCoPay + Number(appointment.paymentDetails.doctorFees ? appointment.paymentDetails.doctorFees : OnlineCoPay);
          }
        }

        if (appointment.appointmentType === "HOME_VISIT") {
          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            //console.log("insideee33333____");
            HomeVisitCoPay = HomeVisitCoPay + Number(appointment.paymentDetails.copay ? appointment.paymentDetails.copay : HomeVisitCoPay);
            //console.log(HomeVisitCoPay,"HomeVisitInsuranceToBePaid__");
            HomeVisitInsuranceToBePaid = HomeVisitInsuranceToBePaid + (appointment.paymentDetails.insuranceTobePaid ? appointment.paymentDetails.insuranceTobePaid : HomeVisitInsuranceToBePaid)
          } else {
            HomeVisitCoPay = HomeVisitCoPay + Number(appointment.paymentDetails.doctorFees ? appointment.paymentDetails.doctorFees : HomeVisitCoPay);
            console.log(HomeVisitCoPay, "HomeVisitCoPay_else__");
          }
        }

      }

      const appointmentRevenuesCount = {
        F2FCoPay: F2FCoPay,
        F2FInsuranceToBePaid: F2FInsuranceToBePaid,

        OnlineCoPay: OnlineCoPay,
        OnlineInsuranceToBePaid: OnlineInsuranceToBePaid,

        HomeVisitCoPay: HomeVisitCoPay,
        HomeVisitInsuranceToBePaid: HomeVisitInsuranceToBePaid
      }

      //console.log(paymentAppointmentsRevenuesCount.length,"paymentAppointmentsRevenuesCountyy______");

      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: appointmentRevenuesCount
        },
        message: "Payment History Counts successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Fetch Payment History Count.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getTotalRevMonthWiseforF2F(req, res) {
    try {

      const { createdDate, updatedDate, doctor_portal_id, yearFilter, f2fYearFilter } = req.query;

      let currentYear = moment().year();
      let yearWiseFilter = {};
      let f2fYearWiseFilter = {};

      console.log(currentYear, "currentYearrr", yearFilter);

      if (Number(yearFilter) !== Number(currentYear)) {
        yearWiseFilter = {
          'consultationDate': {
            $gte: new Date(`${yearFilter}-01-01T00:00:00.000Z`).toISOString(),
            $lt: new Date(`${Number(yearFilter) + 1}-01-01T00:00:00.000Z`).toISOString()
          }
        };
      }
      if (Number(f2fYearFilter) !== Number(currentYear)) {
        f2fYearWiseFilter = {
          'consultationDate': {
            $gte: new Date(`${f2fYearFilter}-01-01T00:00:00.000Z`).toISOString(),
            $lt: new Date(`${Number(f2fYearFilter) + 1}-01-01T00:00:00.000Z`).toISOString()
          }
        };
      }


      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      var dateFilter = {}
      if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
        const createdDateObj = new Date(createdDate);
        const updatedDateObj = new Date(updatedDate);

        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      }
      else if (createdDate && createdDate !== "") {
        const createdDateObj = new Date(createdDate);
        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj };
      }
      else if (updatedDate && updatedDate !== "") {
        const updatedDateObj = new Date(updatedDate);
        dateFilter.createdAt = { $lte: updatedDateObj };
      }
      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL_DOCTOR"] },
            appointmentType: { $in: ['FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
            ...dateFilter
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            paymentType: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        {
          $match: {
            $and: [
              yearWiseFilter,
              f2fYearWiseFilter
            ]
          }
        }
      ];

      const result = await Appointment.aggregate(aggregate);

      var monthlyCountCoPay = {};
      var monthlyCountInsuranceToBePaid = {};

      moment.months().forEach((month) => {
        monthlyCountCoPay[month] = 0;
        monthlyCountInsuranceToBePaid[month] = 0;
      });

      let amountCoPay = 0;
      let amountInsuranceToBePaid = 0;
      result.forEach((item) => {
        if (item) {

          let createDate = moment(item.createdAt);

          if (item.appointmentType === "FACE_TO_FACE" || item.appointmentType === "HOME_VISIT") {
            if (item.paymentType === "post-payment" && item.paymentDetails !== null) {
              //console.log("insideeeeAmoountt___");
              amountCoPay = Number(item.paymentDetails.copay ? item.paymentDetails.copay : item.paymentDetails.doctorFees);
              amountInsuranceToBePaid = Number(item.paymentDetails.insuranceTobePaid ? item.paymentDetails.insuranceTobePaid : amountInsuranceToBePaid);
            } else {
              amountCoPay = Number(item.paymentDetails.doctorFees);
            }
          }

          //console.log(amountCoPay,"amountCoPayyyy_____",amountInsuranceToBePaid);


          let year = createDate.year();

          if (year === currentYear) {
            let month = createDate.format("MMMM");
            if (monthlyCountCoPay[month] === 0 && monthlyCountInsuranceToBePaid[month] === 0) {
              monthlyCountCoPay[month] = amountCoPay;
              monthlyCountInsuranceToBePaid[month] = amountInsuranceToBePaid;
            } else {
              monthlyCountCoPay[month] += amountCoPay;
              monthlyCountInsuranceToBePaid[month] += amountInsuranceToBePaid;
            }
          }
        }
      });

      sendResponse(req, res, 200, {
        status: true,
        body: { monthlyCountCoPay, monthlyCountInsuranceToBePaid },
        message: `All graph data fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }

  async getTotalRevMonthWiseforOnline(req, res) {
    try {

      const { createdDate, updatedDate, doctor_portal_id, filterDateWise } = req.query;

      let currentYear = moment().year();

      let dateWiseFilter = {};

      if (filterDateWise !== '') {
        if (filterDateWise === 'Yearly') {
          dateWiseFilter = {
            'consultationDate': {
              $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(),
              $lt: new Date(`${Number(currentYear) + 1}-01-01T00:00:00.000Z`).toISOString()
            }
          };
        } else if (filterDateWise === 'Monthly') {
          dateWiseFilter = {
            'consultationDate': {
              $gte: moment().startOf('month').toDate().toISOString(),
              $lt: moment().endOf('month').toDate().toISOString()
            }
          };
        } else {
          dateWiseFilter = {
            'consultationDate': {
              $gte: moment().startOf('week').toDate().toISOString(),
              $lt: moment().endOf('week').toDate().toISOString()
            }
          };
        }
      }

      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      var dateFilter = {}
      if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
        const createdDateObj = new Date(createdDate);
        const updatedDateObj = new Date(updatedDate);

        dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      }
      else if (createdDate && createdDate !== "") {
        const createdDateObj = new Date(createdDate);
        dateFilter.createdAt = { $gte: createdDateObj };
      }
      else if (updatedDate && updatedDate !== "") {
        const updatedDateObj = new Date(updatedDate);
        dateFilter.createdAt = { $lte: updatedDateObj };
      }
      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL_DOCTOR"] },
            appointmentType: { $in: ['ONLINE'] },
            isPaymentDone: true,
            ...dateFilter
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            paymentType: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        {
          $match: dateWiseFilter
        }
      ];

      const result = await Appointment.aggregate(aggregate);

      let monthlyCountCoPay = {};
      let monthlyCountInsuranceToBePaid = {};

      moment.months().forEach((month) => {
        monthlyCountCoPay[month] = 0;
        monthlyCountInsuranceToBePaid[month] = 0;
      });

      let amountCoPay = 0;
      let amountInsuranceToBePaid = 0;
      result.forEach((item) => {
        if (item) {

          let createDate = moment(item.createdAt);


          if (item.appointmentType === "ONLINE") {
            if (item.paymentType === "post-payment" && item.paymentDetails !== null) {
              amountCoPay = Number(item.paymentDetails.copay ? item.paymentDetails.copay : item.paymentDetails.doctorFees);
              amountInsuranceToBePaid = Number(item.paymentDetails.insuranceTobePaid ? item.paymentDetails.insuranceTobePaid : amountInsuranceToBePaid);
            } else {
              amountCoPay = Number(item.paymentDetails.doctorFees);
            }
          }

          let year = createDate.year();

          if (year === currentYear) {
            let month = createDate.format("MMMM");
            if (monthlyCountCoPay[month] === 0 && monthlyCountInsuranceToBePaid[month] === 0) {
              monthlyCountCoPay[month] = amountCoPay;
              monthlyCountInsuranceToBePaid[month] = amountInsuranceToBePaid;
            } else {
              monthlyCountCoPay[month] += amountCoPay;
              monthlyCountInsuranceToBePaid[month] += amountInsuranceToBePaid;
            }
          }
        }
      });

      sendResponse(req, res, 200, {
        status: true,
        body: { monthlyCountCoPay, monthlyCountInsuranceToBePaid },
        message: `All graph data fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "Internal server error",
      });
    }
  }

  async getAllDoctorData(req, res) {
    try {
      const { for_portal_user } = req.query;
      console.log(req.body, "for_portal_user123");
      const doctorData = await BasicInfo.find({ for_portal_user: mongoose.Types.ObjectId(for_portal_user) });

      sendResponse(req, res, 200, {
        status: true,
        data: doctorData,
        message: "successfully get Doctor claim list",
        errorCode: null,
      });

    } catch (error) {
      console.log(error, "check error8989")
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "failed to get medicine claim list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async doctorFourPortalListForHospital(req, res) {
    try {
      const { hospital_portal_id } = req.query
      const headers = {
        'Authorization': req.headers['authorization']
      }
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL_DOCTOR', 'INDIVIDUAL_DOCTOR'] },
        'for_portal_user.isDeleted': false,
        // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
        for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_portal_id)] }
      };

      let aggregate = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "services",
            localField: "services",
            foreignField: "_id",
            as: "services",
          }
        },
        { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "departments",
          }
        },
        { $unwind: { path: "$departments", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "specialties",
            localField: "speciality",
            foreignField: "_id",
            as: "speciality",
          }
        },
        { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "units",
            localField: "unit",
            foreignField: "_id",
            as: "unit",
          }
        },
        { $unwind: { path: "$unit", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            speciality: "$speciality.specilization",
            services: "$services.service",
            department: "$departments.department",
            unit: "$unit.unit",
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
              role: "$for_portal_user.role"
            },
          }
        },
      ];
      const result = await BasicInfo.aggregate(aggregate);

      let fourPortalDataResponse = await httpService.getStaging('labimagingdentaloptical/get-all-fouportal-list-for-hospital', { hospital_portal_id }, headers, 'labimagingdentalopticalServiceUrl');

      if (!fourPortalDataResponse.status || !fourPortalDataResponse.data) {
        throw new Error("Failed to fetch hospital data");
      }

      const fourPortal = fourPortalDataResponse.data;
      // Extracting the array of hospitals from fourPortal
      const fourPortalArray = Array.isArray(fourPortal) ? fourPortal : [];

      const combinedResults = [...result, ...fourPortalArray];

      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: combinedResults
        },
        message: `hospital doctor fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("errrrrrrrrr", error)
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async addManualTest(req, res) {
    try {
      const { entriesArray, added_by } = req.body
      console.log("req.body???????????", req.body)
      const list = entriesArray.map((singleData) => ({
        ...singleData,
        for_portal_user: added_by,
        isExist: true
      }));
      const typeToFind = list.map((item) => item.typeOfTest);
      const namesToFind = list.map((item) => item.nameOfTest);
      const foundItems = await PathologyTestInfoNew.find({
        for_portal_user:added_by,
        typeOfTest: { $in: typeToFind },
        nameOfTest: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.nameOfTest);
      if (foundItems.length == 0) {
        const savedtests = await PathologyTestInfoNew.insertMany(list)
        sendResponse(req, res, 200, {
          status: true,
          body: savedtests,
          message: "Successfully add Tests",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: `${CheckData} is already exist`,
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add Language",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editManualTest(req, res) {
    try {
      const existingTest = await PathologyTestInfoNew.findOne({
        typeOfTest: req.body.typeOfTest,
        nameOfTest: req.body.nameOfTest,
        for_portal_user: req.body.loggedInId
      });
      if (existingTest) {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Test with the same name already exists for this type of test",
          errorCode: "TEST_ALREADY_EXISTS"
        });
        return;
      }

      const data = {
        typeOfTest: req.body.typeOfTest,
        nameOfTest: req.body.nameOfTest
      };
      const updatedtest = await PathologyTestInfoNew.findByIdAndUpdate(
        { _id: req.body.id },
        data,
        { upsert: false, new: true }
      );
      sendResponse(req, res, 200, {
        status: true,
        body: updatedtest,
        message: "Successfully updated Test",
        errorCode: null,
      })
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to update test",
        errorCode: "INTERNAL_SERVER_ERROR",
      })
    }
  }

  async totalClaimReportedOfDoctor(req, res) {
    const {
      doctor_portal_id
    } = req.query;

    //console.log("reqqqqee______",req.query)
    try {

      const headers = {
        'Authorization': req.headers['authorization']
      }
      const claimsList = await httpService.getStaging('claim/get-claims-doctor', { for_portal_user: doctor_portal_id }, headers, 'insuranceServiceUrl');

      //console.log(claimsList,"claimsListtt___");

      let pending = 0;
      let approved = 0;
      let rejected = 0;
      let reSubmited = 0;


      for (let claim of claimsList.data) {
        if (claim.status === 'approved') {
          approved++
        }
        if (claim.status === 'pending') {
          pending++;
        }
        if (claim.status === 'rejected') {
          rejected++;
        }
        if (claim.status === 'resubmit') {
          reSubmited++;
        }
      }
      let claimsStatus = {
        pending: pending,
        approved: approved,
        rejected: rejected,
        reSubmited: reSubmited
      }

      sendResponse(req, res, 200, {
        status: true,
        data: claimsStatus,
        message: `hospital Doctor fetched successfully`,
        errorCode: null,
      });

    } catch (error) {
      //console.log(error,"erorrrr____");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async totalTestsOfAllAppointmentTypes(req, res) {
    try {
      const {
        doctor_portal_id,
        dateFilter
      } = req.query;

      let dateWiseFilter = {};

      if (dateFilter !== '') {
        dateWiseFilter = {
          'consultationDate': {
            $gte: new Date(dateFilter).toISOString()
          }
        };
      }

      console.log(req.query, "queryyyyTests_______", dateWiseFilter);


      var doctorPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'doctorId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            doctorId: { $in: doctorPortalId },
            madeBy: { $in: ['patient'] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            //isPaymentDone:true,
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            doctorId: 1,
            hospital_details: 1,
            paymentType: 1,
            doctorDetails: 1,
            createdAt: 1,
          }
        },
        {
          $match: {
            $and: [
              dateWiseFilter
            ]
          }
        }
      ];

      const totalTestsCountInfo = await Appointment.aggregate(aggregate);
      console.log(totalTestsCountInfo.length, "lengthhh____");

      let f2fAppointments = 0;
      let onlineAppointments = 0;
      let homeVisitAppointments = 0;

      let totalF2FRevenue = 0;
      let totalOnlineRevenue = 0;
      let totalHomeVisitRevenue = 0;

      let amountCoPay = 0;
      let amountInsuranceToBePaid = 0;

      for (let appointment of totalTestsCountInfo) {

        if (appointment.appointmentType === "FACE_TO_FACE") {
          f2fAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalF2FRevenue =
              totalF2FRevenue +
              Number(appointment.paymentDetails?.copay ?? appointment.paymentDetails?.doctorFees) +
              Number(appointment.paymentDetails?.insuranceTobePaid ?? amountInsuranceToBePaid);
          } else {
            amountCoPay = Number(appointment.paymentDetails?.doctorFees ?? amountCoPay);
            totalF2FRevenue = totalF2FRevenue + amountCoPay;
          }

        }

        if (appointment.appointmentType === "ONLINE") {
          onlineAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalOnlineRevenue =
              totalOnlineRevenue +
              Number(appointment.paymentDetails?.copay ?? appointment.paymentDetails?.doctorFees) +
              Number(appointment.paymentDetails?.insuranceTobePaid ?? amountInsuranceToBePaid);
          } else {
            amountCoPay = Number(appointment.paymentDetails?.doctorFees ?? amountCoPay);
            totalOnlineRevenue = totalOnlineRevenue + amountCoPay;
          }
        }

        if (appointment.appointmentType === "HOME_VISIT") {
          homeVisitAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalHomeVisitRevenue =
              totalHomeVisitRevenue +
              Number(appointment.paymentDetails?.copay ?? appointment.paymentDetails?.doctorFees) +
              Number(appointment.paymentDetails?.insuranceTobePaid ?? amountInsuranceToBePaid);
          } else {
            amountCoPay = Number(appointment.paymentDetails?.doctorFees ?? amountCoPay);
            totalHomeVisitRevenue = totalHomeVisitRevenue + amountCoPay;
          }

        }

      }

      let appointmentsRevenue = {
        totalF2FRevenue: totalF2FRevenue,
        totalOnlineRevenue: totalOnlineRevenue,
        totalHomeVisitRevenue: totalHomeVisitRevenue,
      }


      //console.log(totalTestsCountInfo.length,"totalTestsCountInfo______");

      sendResponse(req, res, 200, {
        status: true,
        data: {
          totalTestsCountInfo: totalTestsCountInfo,
          appointmentsRevenue: appointmentsRevenue,
          f2fAppointments: f2fAppointments,
          onlineAppointments: onlineAppointments,
          homeVisitAppointments: homeVisitAppointments
        },
        message: "Tests Counts Fetch successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Fetch Tests Counts",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
}

export const getData = async (data) => {
  let result = {
    statusData: '', // You can set an appropriate default value here
    data1: null
  };

  for (const data1 of data) {
    let d = new Date();
    var g1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var g2 = new Date(data1?.expiry_date);

    if (g1.getTime() < g2.getTime()) {
      result.statusData = 'active';
      result.data1 = data1;
      break;
    }
  }
  return result;
}

module.exports = {
  hospitalDoctor: new HospitalDoctor(),
};
