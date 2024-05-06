"use strict";

import PortalUser from "../models/portal_user";
import BasicInfo from "../models/basic_info";
import Counter from "../models/counter";
import Otp2fa from "../models/otp";
import BankDetailInfo from "../models/bank_detail";
import LocationInfo from "../models/location_info";
import DocumentInfo from "../models/document_info";
import MobilePayInfo from "../models/mobile_pay";
import StaffInfo from "../models/staffInfo";
import ForgotPasswordToken from "../models/forgot_password_token";
import { generate6DigitOTP, smsTemplateOTP } from "../constant";
import { sendSms } from "../middleware/sendSms";
import { sendEmail } from "../helpers/ses";
import crypto from "crypto"
import bcrypt from "bcrypt"
import { sendResponse } from "../helpers/transmission";
// import { getDocument } from "../helpers/s3";
import { bcryptCompare, checkPassword, generateRefreshToken, generateTenSaltHash, generateToken, handleRejectionError, processExcel } from "../middleware/utils";
import { verifyEmail2fa, forgotPasswordEmail, resetPasswordEmail, forgotPasswordEmailForIndividualDoctor, sendHospitalDoctorCred } from "../helpers/emailTemplate";
import mongoose from "mongoose";
import { getFile, uploadFile, getDocument } from "../helpers/s3";
import { hashPassword, formatString } from "../helpers/string";
import EducationalDetail from '../models/educational_details';
import HospitalLocation from '../models/hospital_location';
import Http from "../helpers/httpservice";
const httpService = new Http();
import Availability from '../models/availability'
import FeeManagement from '../models/fee_management'
import DocumentManagement from '../models/document_management'
import ReasonForAppointment from '../models/reason_of_appointment'
import ReviewAndRating from "../models/reviews";
import { AppointmentReasonColumns } from '../config/constants';
import Questionnaire from "../models/questionnaire";
import fs from "fs"
import PathologyTestInfoNew from '../models/pathologyTestInfoNew'
import Appointment from '../models/appointment';
import moment from "moment";
import Notification from "../models/notification";
import { agoraTokenGenerator } from "../helpers/chat"
import Logs from "../models/logs"
import { sendAppointmentInvitation } from "../helpers/emailTemplate";
import { orderInvitation } from "../helpers/emailTemplate";
import ProviderDocs from "../models/provider_document";
import {notification} from "../helpers/notification";
//const fs = require('fs');

const validateColumnWithExcel = (toValidate, excelColumn) => {
  const requestBodyCount = Object.keys(toValidate).length
  const fileColumnCount = Object.keys(excelColumn).length
  if (requestBodyCount !== fileColumnCount) {
    return false
  }

  let index = 1
  for (const iterator of Object.keys(excelColumn)) {
    if (iterator !== toValidate[`col${index}`]) {
      return false
    }
    index++
  }
  return true
}

export const addTestsForMngDoc = async (pathologyInfo, id, type) => {
  console.log(pathologyInfo, "pathologyInfooo___", id);
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
        // console.log("alreadyExisttt_______");
        //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
      } else {
        // console.log("inside_elsee_____");
        if (test.isExist === false) {
          pathologyTestData = await PathologyTestInfoNew.create({
            for_portal_user: id,
            typeOfTest: test.typeOfTest,
            nameOfTest: test.nameOfTest,
            isExist: true,
            type
          });
        }

      }
    } catch (error) {
      console.error('Erroroccurreddddd:', error);
      // Handle the error as needed
    }
  }
}

const getDoctorOpeningsHours = async (week_days) => {
  var Sunday = []
  var Monday = []
  var Tuesday = []
  var Wednesday = []
  var Thursday = []
  var Friday = []
  var Saturday = []
  if (week_days) {
    week_days.forEach((data) => {
      Sunday.push({
        "start_time": data.sun_start_time.slice(0, 2) + ":" + data.sun_start_time.slice(2, 4),
        "end_time": data.sun_end_time.slice(0, 2) + ":" + data.sun_end_time.slice(2, 4)
      })
      Monday.push({
        "start_time": data.mon_start_time.slice(0, 2) + ":" + data.mon_start_time.slice(2, 4),
        "end_time": data.mon_end_time.slice(0, 2) + ":" + data.mon_end_time.slice(2, 4)
      })
      Tuesday.push({
        "start_time": data.tue_start_time.slice(0, 2) + ":" + data.tue_start_time.slice(2, 4),
        "end_time": data.tue_end_time.slice(0, 2) + ":" + data.tue_end_time.slice(2, 4)
      })
      Wednesday.push({
        "start_time": data.wed_start_time.slice(0, 2) + ":" + data.wed_start_time.slice(2, 4),
        "end_time": data.wed_end_time.slice(0, 2) + ":" + data.wed_end_time.slice(2, 4)
      })
      Thursday.push({
        "start_time": data.thu_start_time.slice(0, 2) + ":" + data.thu_start_time.slice(2, 4),
        "end_time": data.thu_end_time.slice(0, 2) + ":" + data.thu_end_time.slice(2, 4)
      })
      Friday.push({
        "start_time": data.fri_start_time.slice(0, 2) + ":" + data.fri_start_time.slice(2, 4),
        "end_time": data.fri_end_time.slice(0, 2) + ":" + data.fri_end_time.slice(2, 4)
      })
      Saturday.push({
        "start_time": data.sat_start_time.slice(0, 2) + ":" + data.sat_start_time.slice(2, 4),
        "end_time": data.sat_end_time.slice(0, 2) + ":" + data.sat_end_time.slice(2, 4)
      })
    })
  }
  return {
    Sunday,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday
  }
}

class LabImagingDentalOptical {
  async signUp(req, res) {
    try {
      const {
        full_name,
        first_name,
        middle_name,
        last_name,
        email,
        password,
        country_code,
        mobile,
        type
      } = req.body;
      let userFind = await PortalUser.findOne(
        {
          email: email.toLowerCase(), isDeleted: false
        }
      );
      if (userFind) {
        return sendResponse(req, res, 200, {
          status: false,
          body: userFind,
          message: "User already exist",
          errorCode: null,
        });
      }
      const salt = await bcrypt.genSalt(10);
      let newPassword = await bcrypt.hash(password, salt);
      var sequenceDocument = await Counter.findOneAndUpdate({ _id: "employeeid" }, { $inc: { sequence_value: 1 } }, { new: true })
      let userData = new PortalUser(
        {
          full_name: first_name + " " + middle_name + " " + last_name,
          email,
          country_code,
          mobile,
          password: newPassword,
          role: "INDIVIDUAL",
          type,
          user_id: sequenceDocument.sequence_value,
          isFirstTime: 0
        }
      );
      let userDetails = await userData.save();
      let adminData = new BasicInfo(
        {
          full_name: first_name + " " + middle_name + " " + last_name,
          first_name,
          middle_name,
          last_name,
          for_portal_user: userDetails._id,
          main_phone_number: mobile,
          type
        }
      );
      let adminDetails = await adminData.save();

      let superadminData = await httpService.getStaging(
        "superadmin/get-super-admin-data",
        {},
        {},
        "superadminServiceUrl"
      );

      var requestData = {
        created_by_type: userDetails?.type,
        created_by: userDetails?._id,
        content: `New Registration From ${userDetails?.full_name}`,
        url: '',
        for_portal_user: superadminData?.body?._id,
        notitype: "New Registration",
        appointmentId:  userDetails?._id, 
    }
   
    var result = await notification('', '', "superadminServiceUrl", '', '', '','', requestData);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          adminDetails,
          userDetails
        },
        message: "Registration Successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Failed to create user.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password, type } = req.body;
      console.log("req.body====", req.body);
      const { uuid, role } = req.headers;
      // const headers = {
      //   Authorization: req.headers["authorization"],
      // };
      const portalUserData = await PortalUser.findOne({ email, isDeleted: false }).lean();

      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }

      if (type !== portalUserData.type) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: `Please login to ${portalUserData.type} portal.`,
          errorCode: "TYPE_MISMATCH",
        });
      }
      const isPasswordMatch = await checkPassword(password, portalUserData);
      if (!isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Credential not matched",
          errorCode: "INCORRECT_PASSWORD",
        });
      }
      portalUserData.password = undefined

      if (portalUserData.isDeleted === true) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User deleted",
          errorCode: "USER_DELETED",
        });
      }
      if (portalUserData.lock_user === true) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User temporarily locked",
          errorCode: "USER_LOCKED",
        });
      }
      if (portalUserData.isActive === false) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User temporarily not active",
          errorCode: "USER_NOT_ACTIVE",
        });
      }


      var adminData
      const deviceExist = await Otp2fa.findOne({ uuid, for_portal_user: portalUserData._id, verified: true }).lean();
      if (!deviceExist || portalUserData.verified !== true) {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            otp_verified: false,
            token: null,
            refreshToken: null,
            user_details: {
              portalUserData,
              adminData,
            }
          },
          message: "OTP verification pending 2fa",
          errorCode: "VERIFICATION_PENDING",
        });
      }




      if (portalUserData.role === 'HOSPITAL') {

        // adminData = await BasicInfo.findOne({
        //   for_portal_user: portalUserData?._id, type
        // })
        var adminData1 = await BasicInfo.aggregate([
          {
            $match: { for_portal_user: portalUserData?._id, type: type },
          },
          {
            $lookup: {
              from: "locationinfos",
              localField: "in_location",
              foreignField: "_id",
              as: "locationinfos",
            },
          }
        ]);

        if (adminData1.length > 0) {
          adminData = adminData1[0]
        }

        if (adminData?.locationinfos.length > 0) {
          try {
            var locationids = {
              country_id: adminData?.locationinfos[0]?.country,
              region_id: adminData?.locationinfos[0]?.region,
              province_id: adminData?.locationinfos[0]?.province,
              village_id: adminData?.locationinfos[0]?.village,
              city_id: adminData?.locationinfos[0]?.city,
              department_id: adminData?.locationinfos[0]?.department,
            };

            const locationdata = await httpService.postStaging(
              "common-api/get-location-name",
              { locationids: locationids },
              {},
              "superadminServiceUrl"
            );

            if (locationdata.status) {
              adminData.locationinfos[0].country = {
                countryname: locationdata?.body?.country_name,
                country_iso_code: locationdata?.body?.country_iso_code,
              };
              adminData.locationinfos[0].region = locationdata?.body?.region_name;
              adminData.locationinfos[0].province = locationdata?.body?.province_name;
              adminData.locationinfos[0].village = locationdata?.body?.village_name;
              adminData.locationinfos[0].city = locationdata?.body?.city_name;
              adminData.locationinfos[0].department = locationdata?.body?.department_name;
            }
          } catch (err) {
            console.log(err, "erraaaa");
          }
        }
      }
      else {

        adminData = await StaffInfo.findOne({
          for_portal_user: portalUserData._id, type
        })
        // .populate({
        //     path: 'in_profile'
        // }).exec();

        if (adminData?.in_profile?.profile_picture) {
          console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
          // const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
          // adminData.in_profile.profile_picture = profilePic
        }

      }

      console.log("ADMIN DATA==>", adminData)


      if (portalUserData.role === 'INDIVIDUAL' || portalUserData.role === 'HOSPITAL') {

        if (adminData?.profile_picture) {
          console.log("CHECKING===>", adminData.profile_picture)
          // const profilePic = await getDocument(adminData.profile_picture.url)
          // adminData.profile_picture.url = profilePic
        }
      }

      if (portalUserData.role == "INDIVIDUAL") {
        // adminData = await BasicInfo.findOne({
        //   for_portal_user: portalUserData._id,
        // }).lean();

        var adminData1 = await BasicInfo.aggregate([
          {
            $match: { for_portal_user: portalUserData?._id, type: type },
          },
          {
            $lookup: {
              from: "locationinfos",
              localField: "in_location",
              foreignField: "_id",
              as: "locationinfos"
            },
          }
        ]);

        if (adminData1.length > 0) {
          adminData = adminData1[0]
        }

        if (adminData?.locationinfos.length > 0) {
          try {
            var locationids = {
              country_id: adminData?.locationinfos[0]?.country,
              region_id: adminData?.locationinfos[0]?.region,
              province_id: adminData?.locationinfos[0]?.province,
              village_id: adminData?.locationinfos[0]?.village,
              city_id: adminData?.locationinfos[0]?.city,
              department_id: adminData?.locationinfos[0]?.department,
            };

            const locationdata = await httpService.postStaging(
              "common-api/get-location-name",
              { locationids: locationids },
              {},
              "superadminServiceUrl"
            );

            if (locationdata.status) {
              adminData.locationinfos[0].country = {
                countryname: locationdata?.body?.country_name,
                country_iso_code: locationdata?.body?.country_iso_code,
              };
              adminData.locationinfos[0].region = locationdata?.body?.region_name;
              adminData.locationinfos[0].province = locationdata?.body?.province_name;
              adminData.locationinfos[0].village = locationdata?.body?.village_name;
              adminData.locationinfos[0].city = locationdata?.body?.city_name;
              adminData.locationinfos[0].department = locationdata?.body?.department_name;
            }
          } catch (err) {
            console.log(err, "erraaaa");
          }
        }

        if (adminData.verify_status !== "APPROVED") {          
          const currentDate = new Date();
          const formattedDate = currentDate.toISOString();
          let addLogs = {};
          let saveLogs = {};

          addLogs = new Logs({
            userName: portalUserData?.full_name,
            userId: portalUserData?._id,
            loginDateTime: formattedDate,
            ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

          });
          saveLogs = await addLogs.save();
          const savedLogId = saveLogs ? saveLogs._id : null;
          return sendResponse(req, res, 200, {
            status: true,
            body: {
              otp_verified: portalUserData.verified,
              token: null,
              refreshToken: null,
              user_details: {
                portalUserData,
                adminData,
                savedLogId
              }
            },
            message: "Super-admin not approved yet",
            errorCode: "PROFILE_NOT_APPROVED",
          });
        }
      }

      if (portalUserData.role == "STAFF") {
        adminData = await StaffInfo.findOne({
          for_portal_user: portalUserData._id,
        }).populate({
          path: "role"
        })
      }

      if (adminData?.creatorId) {
        const adminName = await BasicInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(adminData.creatorId) })
        console.log("adminName___________", adminName.full_name);

        adminData = Object.assign({}, adminData._doc, {
          adminName: adminName.full_name,

        });

      }

      const tokenClaims = {
        _id: portalUserData._id,
        email: portalUserData.email,
        role: portalUserData.role,
        uuid
      }
      // createSession(req, portalUserData);

      if (adminData?.isInfoCompleted === false && portalUserData.role == "INDIVIDUAL") {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            otp_verified: portalUserData.verified,
            user_details: {
              portalUserData,
              adminData,
            }
          },
          message: "Please Fill Basic Info",
          errorCode: 'FILL BASIC INFO!!',
        });
      }

      const findFirstLogin = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portalUserData._id) });
      if (findFirstLogin && findFirstLogin.isFirstTime == 0) {
        findFirstLogin.isFirstTime = 1;
        await findFirstLogin.save();
      }
      // logs
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString();
      let addLogs = {};
      let saveLogs = {};
      if (portalUserData.role == "INDIVIDUAL" || portalUserData.role == "HOSPITAL") {
        addLogs = new Logs({
          userName: portalUserData?.full_name,
          userId: portalUserData?._id,
          loginDateTime: formattedDate,
          ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,

        });
        saveLogs = await addLogs.save();
      } else {
        console.log("portalUserData?.created_by_user___________", portalUserData?.created_by_user);
        let checkAdmin = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(portalUserData?.created_by_user) })
        addLogs = new Logs({
          userName: portalUserData?.full_name,
          userId: portalUserData?._id,
          adminData: {
            adminId: portalUserData?.created_by_user,
            adminName: checkAdmin?.full_name
          },
          loginDateTime: formattedDate,
          ipAddress: req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress,
        });
        saveLogs = await addLogs.save();
      }
      const savedLogId = saveLogs ? saveLogs._id : null;
      console.log("savedLogId________", savedLogId);
      return sendResponse(req, res, 200, {
        status: true,
        body: {
          otp_verified: portalUserData.verified,
          token: generateToken(tokenClaims),
          refreshToken: generateRefreshToken(tokenClaims),
          user_details: {
            portalUserData,
            adminData,
            savedLogId
          }
        },
        message: "Login Successfully!",
        errorCode: null,
      });

    } catch (error) {
      console.log(error)
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async sendSmsOtpFor2fa(req, res) {
    try {
      const { mobile, type } = req.body;
      const { uuid } = req.headers;
      const portalUserData = await PortalUser.findOne({ type, mobile, isDeleted: false }).lean();
      if (!portalUserData) {
        return sendResponse(req, res, 422, {
          status: false,
          body: null,
          message: "User not exist.",
          errorCode: "USER_NOT_EXIST",
        });
      }
      const country_code = portalUserData.country_code
      const deviceExist = await Otp2fa.findOne({ mobile, country_code, uuid, for_portal_user: portalUserData._id, type }).lean();
      if (deviceExist && deviceExist.send_attempts >= 500000) {
        return sendResponse(req, res, 422, {
          status: false,
          body: null,
          message: "Maximum attempt exceeded",
          errorCode: "MAX ATTEMPT_EXCEEDED",
        });
      }
      const otp = generate6DigitOTP();
      const otpText = smsTemplateOTP(otp);
      const smsRes = await sendSms(country_code + mobile, otpText);
      let result = null;
      if (smsRes == 200) {
        if (deviceExist) {
          result = await Otp2fa.findOneAndUpdate({ mobile, country_code, uuid, for_portal_user: portalUserData._id, type }, {
            $set: {
              otp,
              send_attempts: deviceExist.send_attempts + 1
            }
          }).exec();
        } else {
          const otpData = new Otp2fa({
            mobile,
            otp,
            country_code,
            uuid,
            for_portal_user: portalUserData._id,
            send_attempts: 1,
            type
          });
          try {
            result = await otpData.save();
          } catch (error) {
            sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: "Something went wrong.",
              errorCode: null,
            });
          }
        }
        sendResponse(req, res, 200, {
          status: true,
          body: {
            id: result._id
          },
          message: "Otp send successfully!",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 500, {
          status: false,
          body: null,
          message: "Can't Sent SMS.",
          errorCode: null,
        });
      }
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

  async sendEmailOtpFor2fa(req, res) {
    try {
      const { email, type } = req.body;
      const { uuid } = req.headers;

      const portalUserData = await PortalUser.findOne({ email, type, isDeleted: false }).lean();
      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }
      const deviceExist = await Otp2fa.findOne({ email, uuid, for_portal_user: portalUserData._id, type }).lean();

      if (deviceExist && deviceExist.send_attempts >= 500000) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Maximum attempt exceeded",
          errorCode: "MAX ATTEMPT_EXCEEDED",
        });
      }
      const otp = generate6DigitOTP();
      const content = verifyEmail2fa(email, otp);
      await sendEmail(content);
      let result = null;
      if (deviceExist) {
        result = await Otp2fa.findOneAndUpdate({ email, uuid, for_portal_user: portalUserData._id, type }, {
          $set: {
            otp,
            send_attempts: deviceExist.send_attempts + 1
          }
        }).exec();
      } else {
        const otpData = new Otp2fa({
          email,
          otp,
          uuid,
          for_portal_user: portalUserData._id,
          type,
          send_attempts: 1
        });
        result = await otpData.save();
      }
      return sendResponse(req, res, 200, {
        status: true,
        body: {
          id: result._id
        },
        message: "Otp Sent to your email successfully!",
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


  async matchOtpFor2fa(req, res) {
    try {
      const { mobile, otp, for_portal_user, type } = req.body;
      const { uuid } = req.headers;
      const otpResult = await Otp2fa.findOne({ uuid, mobile, for_portal_user, verified: false, type });
      if (otpResult) {
        const portalUserData = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(for_portal_user) }).lean();
        if (!portalUserData) {
          return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "User not exist",
            errorCode: null,
          });
        }
        if (otpResult.otp == otp) {
          const tokenClaims = {
            _id: portalUserData._id,
            email: portalUserData.email,
            role: portalUserData.role,
            uuid
          }
          // req.session.ph_verified = true;
          const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
            $set: {
              verified: true
            }
          }, { new: true }).exec();
          const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, mobile, for_portal_user, verified: false, type }, {
            $set: {
              verified: true
            }
          }, { new: true }).exec();

          // let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id }).populate({
          //     path: 'profile_picture',
          //     select: 'url'
          // }).exec();
          var adminData

          if (portalUserData.role === 'INDIVIDUAL') {
            adminData = await BasicInfo.findOne({
              for_portal_user: portalUserData._id,
            })
            // .populate({
            //     path: 'profile_picture',
            //     select: 'url'
            // }).exec();
          } else {

            adminData = await Staff.findOne({
              for_portal_user: portalUserData._id,
            })
            // .populate({
            //     path: 'in_profile'
            // }).exec();

            if (adminData?.in_profile?.profile_picture) {
              console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
              // const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
              // adminData.in_profile.profile_picture = profilePic
            }

          }

          if (adminData?.profile_picture) {
            console.log("CHECKING===>", adminData.profile_picture)
            // const profilePic = await getDocument(adminData.profile_picture.url)
            // adminData.profile_picture.url = profilePic
          }

          if (portalUserData.role == 'INDIVIDUAL' || portalUserData.role == 'HOSPITAL') {
            let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id })
            // .populate({
            //     path: 'profile_picture',
            //     select: 'url'
            // }).exec();

            if (adminData.profile_picture) {
              console.log("CHECKING===>", adminData.profile_picture)
              // const profilePic = await getDocument(adminData.profile_picture.url)
              // adminData.profile_picture.url = profilePic
            }
          }


          if (adminData?.isInfoCompleted === false && portalUserData?.role == "INDIVIDUAL") {
            return sendResponse(req, res, 200, {
              status: true,
              body: {
                otp_verified: portalUserData.verified,
                user_details: {
                  portalUserData,
                  adminData
                }
              },
              message: "OTP Matched Successfully!",
              errorCode: 'FILL BASIC INFO!!',
            });
          }


          return sendResponse(req, res, 200, {
            status: true,
            body: {
              id: updateVerified._id,
              uuid: updateVerifiedUUID._id,
              token: generateToken(tokenClaims),
              refreshToken: generateRefreshToken(tokenClaims),
            },
            message: "OTP Matched Successfully!",
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Incorrect OTP",
            errorCode: "INCORRECT_OTP",
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }
    } catch (error) {
      console.log("error=========", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async matchEmailOtpFor2fa(req, res) {
    try {
      const { email, otp, for_portal_user, type } = req.body;
      const { uuid } = req.headers;
      const otpResult = await Otp2fa.findOne({ uuid, email, for_portal_user, verified: false, type });
      if (otpResult) {
        const portalUserData = await PortalUser.findOne({ _id: for_portal_user }).lean();
        if (!portalUserData) {
          return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "user not exist",
            errorCode: null,
          });
        }
        if (otpResult.otp == otp) {
          const tokenClaims = {
            _id: portalUserData._id,
            email: portalUserData.email,
            role: portalUserData.role,
            uuid
          }
          // req.session.ph_verified = true;
          const updateVerified = await PortalUser.findOneAndUpdate({ _id: portalUserData._id }, {
            $set: {
              verified: true
            }
          }, { new: true }).exec();
          const updateVerifiedUUID = await Otp2fa.findOneAndUpdate({ uuid, email, for_portal_user, verified: false, type }, {
            $set: {
              verified: true
            }
          }, { new: true }).exec();

          // let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id })
          // .populate({
          //     path: 'profile_picture',
          //     select: 'url'
          // }).exec();
          var adminData

          if (portalUserData.role === 'INDIVIDUAL') {
            adminData = await BasicInfo.findOne({
              for_portal_user: portalUserData._id,
            })
            // .populate({
            //     path: 'profile_picture',
            //     select: 'url'
            // }).exec();
          } else {

            adminData = await StaffInfo.findOne({
              for_portal_user: portalUserData._id,
            })
            // .populate({
            //     path: 'in_profile'
            // }).exec();

            if (adminData?.in_profile?.profile_picture) {
              console.log("CHECKING===>", adminData?.in_profile?.profile_picture)
              // const profilePic = await getDocument(adminData?.in_profile?.profile_picture)
              // adminData.in_profile.profile_picture = profilePic
            }

          }

          if (adminData?.profile_picture) {
            console.log("CHECKING===>", adminData.profile_picture)
            // const profilePic = await getDocument(adminData.profile_picture.url)
            // adminData.profile_picture.url = profilePic
          }

          if (portalUserData.role == 'INDIVIDUAL' || portalUserData.role == 'HOSPITAL') {
            let adminData = await BasicInfo.findOne({ for_portal_user: portalUserData._id })
            // .populate({
            //     path: 'profile_picture',
            //     select: 'url'
            // }).exec();

            if (adminData.profile_picture) {
              console.log("CHECKING===>", adminData.profile_picture)
              // const profilePic = await getDocument(adminData.profile_picture.url)
              // adminData.profile_picture.url = profilePic
            }
          }


          if (adminData?.isInfoCompleted === false && portalUserData?.role == "INDIVIDUAL") {
            return sendResponse(req, res, 200, {
              status: true,
              body: {
                otp_verified: portalUserData.verified,
                user_details: {
                  portalUserData,
                  adminData
                }
              },
              message: "OTP Matched Successfully!",
              errorCode: 'FILL BASIC INFO!!',
            });
          }


          return sendResponse(req, res, 200, {
            status: true,
            body: {
              id: updateVerified._id,
              uuid: updateVerifiedUUID._id,
              token: generateToken(tokenClaims),
              refreshToken: generateRefreshToken(tokenClaims),
            },
            message: "OTP Matched Successfully!",
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Incorrect OTP",
            errorCode: "INCORRECT_OTP",
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }
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

  async forgotPassword(req, res) {
    try {
      const { email, type } = req.body
      let userData = await PortalUser.findOne({ email, type });
      if (!userData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: null,
        });
      }
      let resetToken = crypto.randomBytes(32).toString("hex");
      const hashResetToken = await generateTenSaltHash(resetToken);

      let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({ user_id: userData._id });
      if (ForgotPasswordTokenData) {
        await ForgotPasswordTokenData.deleteOne()
      }

      let ForgotPasswordData = new ForgotPasswordToken({
        user_id: userData._id,
        token: hashResetToken,
      });
      let savedForgotPasswordData = await ForgotPasswordData.save();

      // let html = htmlForgetPassword(resetToken, userData._id)
      const content = forgotPasswordEmailForIndividualDoctor(email.toLowerCase(), resetToken, userData._id, type)
      let sendEmailStatus = sendEmail(content);
      if (sendEmailStatus) {
        sendResponse(req, res, 200, {
          status: true,
          body: {
            user_id: userData._id,
            resetToken
          },
          message: "Forgot password reset link sent to your email",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 500, {
          status: false,
          message: "Internal server error, can't sent email",
          errorCode: null,
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

  async resetForgotPassword(req, res) {
    const { user_id, resetToken, newPassword, type } = req.body
    try {
      let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({ user_id });
      if (!ForgotPasswordTokenData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Token has expired",
          errorCode: null,
        });
      }
      const isPasswordMatch = await bcryptCompare(resetToken, ForgotPasswordTokenData.token);
      if (!isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Token not match",
          errorCode: null,
        });
      }
      const passCheck = await PortalUser.findOne({ _id: user_id, type });

      const isPasswordCheck = await checkPassword(newPassword, passCheck);

      if (isPasswordCheck) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "This is Previous password. Enter New Password.",
          errorCode: null,
        });
      } else {
        const hashPassword = await generateTenSaltHash(newPassword);

        const updatedUser = await PortalUser.findOneAndUpdate(
          { _id: user_id },
          { password: hashPassword },
          { new: true }
        )
        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "New password set successfully",
          errorCode: null,
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

  async changePassword(req, res) {
    const { id, old_password, new_password, type } = req.body;
    if (old_password === new_password) {
      return sendResponse(req, res, 200, {
        status: false,
        body: null,
        message: "New password shouldn't be same as old password.",
        errorCode: "PASSWORD_MATCHED",
      });
    }
    try {
      const portalUserData = await PortalUser.findOne({ _id: id, type }).lean();
      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }
      const isPasswordOldMatch = await checkPassword(old_password, portalUserData);
      if (!isPasswordOldMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Incorrect Old Password.",
          errorCode: null,
        });
      }
      const passwordHash = await hashPassword(new_password);
      const isPasswordMatch = await checkPassword(new_password, portalUserData);
      if (isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "This is Previous password. Enter New Password.",
          errorCode: "INCORRECT_PASSWORD",
        });
      }
      const result = await PortalUser.findOneAndUpdate({ _id: id, type }, {
        $set: {
          password: passwordHash
        }
      }, { new: true }).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: { id: result._id },
        message: "Successfully changed password.",
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

  async uploadDocumentForPortal(req, res) {
    try {
      const { portal_user_id, docType, portalType } = req.body;
      let result = null;
      if (Array.isArray(req.files.documents)) {
        let tempResult = [];
        req.files.documents.forEach(doc => {
          let s3result = uploadFile(doc.data, {
            Bucket: "healthcare-crm-stage-docs",
            Key: `portals/${portal_user_id}/${docType}/${doc.name}`,
          });
          tempResult.push(s3result);
        });
        result = await Promise.all(tempResult);
      } else {
        result = await uploadFile(req.files.documents.data, {
          Bucket: "healthcare-crm-stage-docs",
          Key: `portals/${portal_user_id}/${docType}/${req.files.documents.name}`,
        });
      }
      const uploadResult = Array.isArray(req.files.documents) ? result : [result]
      let dataArray = []
      for (const data of uploadResult) {
        dataArray.push({
          name: data.Key.split('/')[data.Key.split('/').length - 1],
          e_tag: data.ETag,
          code: docType,
          url: data.Key,
          is_deleted: false,
          for_portal_user: portal_user_id,
          type: portalType
        });
      }
      const uploadDocResult = await DocumentInfo.insertMany(dataArray)
      const objectIDArray = []
      for (const doc of uploadDocResult) {
        objectIDArray.push(doc)
      }
      sendResponse(req, res, 200, {
        status: true,
        data: objectIDArray,
        message: `File uploaded successfully!`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to upload file`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async fourPortalCreateProfile(req, res) {
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

      speciality, services, department, unit, expertise, speciality_name,
      medical_act_performed, lab_test_performed, imaging_performed,
      vaccination_performed, other_test, bank_name, account_holder_name, account_number, ifsc_code, bank_address, mobile_pay_details, appointment_accepted, medicine_request, type } = req.body
    // console.log("req.body__________", req.body)

    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      if (for_hospital != '') {
        console.log("qwrewrew")
        const fourPortalCount = await PortalUser.countDocuments({ created_by_user: for_hospital, isDeleted: false, role: "HOSPITAL", type: type });
        let getplanData = await httpService.getStaging('hospital/get-subscription-purchase-data', { data: for_hospital }, headers, 'hospitalServiceUrl');
        let checkCondition;
        checkCondition = await getData(getplanData);

        if (checkCondition?.statusData === "active") {
          let shouldAddFourPortal = false;
          for (const data12 of checkCondition?.data1?.services) {
            if (data12?.name === type && data12?.is_unlimited === false) {
              if (fourPortalCount < data12?.max_number) {
                shouldAddFourPortal = true;
                break; // Exit the inner loop if conditions are satisfied
              } else {
                return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: `Unable to add Hospital ${type}. As Hospital ${type} Maximum limit has exceeded as per your purchased plan.`,
                  errorCode: null,
                });
              }
            }
          }

          if (shouldAddFourPortal) {
            console.log("run333333")
            //Check email exist

            //Create account for doctor
            let portal_user_id = ''
            if (id) {
              console.log("run12345677", id)
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
              const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), type, created_by_user: for_hospital }

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
              // console.log(portalData,"+++++++++++++++++")
              const content = sendHospitalDoctorCred(email, password, type)
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
              pincode: pincode == '' ? null : pincode,
              type: type

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
            const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address, type }
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
                for_portal_user: portal_user_id,
                type: type
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

              urgent_care_service, about, license_details: license_details_object, team, speciality, speciality_name,

              services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
              vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
              in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted, type, medicine_request
            }
            if (accountType?.role != 'INDIVIDUAL') {
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
                    console.log("alreadyExisttt_______");
                    //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
                  } else {
                    console.log("inside_elsee_____");
                    if (test.isExist === false) {
                      console.log(">>>>>====>>>>>>>>", type)
                      pathologyTestData = await PathologyTestInfoNew.create({
                        for_portal_user: id,
                        typeOfTest: test.typeOfTest,
                        nameOfTest: test.nameOfTest,
                        isExist: true,
                        type
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
              console.log(basicInfoData, "basicInfoData");
              const basicInfoDataResult = new BasicInfo(basicInfoData)
              // console.log("basicInfoDataResult", basicInfoDataResult);
              const result = await basicInfoDataResult.save()
              // console.log(result,"resulttt______");
              await addTestsForMngDoc(pathologyInfo, result.for_portal_user, type)
            }
            sendResponse(req, res, 200, {
              status: true,
              data: { portal_user_id },
              message: `${type} info ${id ? 'updated' : 'added'} successfully`,
              errorCode: null,
            });
          } else {
            console.log("run444444444")
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
              const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), type, created_by_user: for_hospital }

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
              // console.log(portalData,"+++++++++++++++++")
              const content = sendHospitalDoctorCred(email, password, type)
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
              pincode: pincode == '' ? null : pincode,
              type: type

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
            const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address, type }
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
                for_portal_user: portal_user_id,
                type: type
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

              urgent_care_service, about, license_details: license_details_object, team, speciality, speciality_name,

              services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
              vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
              in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted, type, medicine_request
            }
            if (accountType?.role != 'INDIVIDUAL') {
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
                    console.log("alreadyExisttt_______");
                    //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
                  } else {
                    console.log("inside_elsee_____");
                    if (test.isExist === false) {
                      console.log(">>>>>====>>>>>>>>", type)
                      pathologyTestData = await PathologyTestInfoNew.create({
                        for_portal_user: id,
                        typeOfTest: test.typeOfTest,
                        nameOfTest: test.nameOfTest,
                        isExist: true,
                        type
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
              console.log(basicInfoData, "basicInfoData");
              const basicInfoDataResult = new BasicInfo(basicInfoData)
              // console.log("basicInfoDataResult", basicInfoDataResult);
              const result = await basicInfoDataResult.save()
              // console.log(result,"resulttt______");
              await addTestsForMngDoc(pathologyInfo, result.for_portal_user, type)
            }
            sendResponse(req, res, 200, {
              status: true,
              data: { portal_user_id },
              message: `${type} info ${id ? 'updated' : 'added'} successfully`,
              errorCode: null,
            });
          }
        }
      } else {
        console.log("asdsfds")

        //Create account for doctor
        let portal_user_id = ''
        if (id) {
          console.log("tyutuytuy", id)
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
            { $set: { country_code: portaluserdatanew?.country_code, email: portaluserdatanew?.email, mobile, full_name: portaluserdatanew.full_name, profile_picture: portaluserdatanew.profile_picture } },
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
          const accountData = { email, country_code, mobile, password: passwordHash, role: 'HOSPITAL', full_name: formatString(`${first_name} ${middle_name} ${last_name}`), type, created_by_user: for_hospital }

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
          // console.log(portalData,"+++++++++++++++++")
          const content = sendHospitalDoctorCred(email, password, type)
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
          pincode: pincode == '' ? null : pincode,
          type: type

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
        const bankObject = { bank_name, account_holder_name, account_number, ifsc_code, bank_address, type }
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
            for_portal_user: portal_user_id,
            type: type
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

          urgent_care_service, about, license_details: license_details_object, team, speciality, speciality_name,

          services, department, unit, expertise, medical_act_performed, lab_test_performed, imaging_performed,
          vaccination_performed, other_test, in_location: location_object_id, in_bank: bank_object_id,
          in_mobile_pay: mobile_pay_object_id, isInfoCompleted: false, appointment_accepted, type, medicine_request
        }
        if (accountType?.role != 'INDIVIDUAL') {
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
                console.log("alreadyExisttt_______");
                //throw new Error(`Test ${test.nameOfTest} already_exists_for ${id}`);
              } else {
                console.log("inside_elsee_____");
                if (test.isExist === false) {
                  console.log(">>>>>====>>>>>>>>", type)
                  pathologyTestData = await PathologyTestInfoNew.create({
                    for_portal_user: id,
                    typeOfTest: test.typeOfTest,
                    nameOfTest: test.nameOfTest,
                    isExist: true,
                    type
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
          console.log(basicInfoData, "basicInfoData");
          const basicInfoDataResult = new BasicInfo(basicInfoData)
          // console.log("basicInfoDataResult", basicInfoDataResult);
          const result = await basicInfoDataResult.save()
          // console.log(result,"resulttt______");
          await addTestsForMngDoc(pathologyInfo, result.for_portal_user, type)
        }
        sendResponse(req, res, 200, {
          status: true,
          data: { updatedBasicInfoDetails, PortalUserDetails },
          message: `${type} info ${id ? 'updated' : 'added'} successfully`,
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


  async fourPortalViewProfile(req, res) {
    const { portal_user_id, type } = req.query
    // console.log("req.query------------", req.query);
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }

      var filter = {
        for_portal_user: mongoose.Types.ObjectId(portal_user_id),
        type: type
      };
      const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: portal_user_id })
      let aggregate = [
        { $match: filter },
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
            from: "locationinfos",
            localField: "in_location",
            foreignField: "_id",
            as: "in_location",
          }
        },
        { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "bankdetails",
            localField: "in_bank",
            foreignField: "_id",
            as: "in_bank",
          }
        },
        { $unwind: { path: "$in_bank", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "mobilepays",
            localField: "in_mobile_pay",
            foreignField: "_id",
            as: "in_mobile_pay",
          }
        },
        { $unwind: { path: "$in_mobile_pay", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "feemanagements",
            localField: "in_fee_management",
            foreignField: "_id",
            as: "in_fee_management",
          }
        },
        { $unwind: { path: "$in_fee_management", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "educationaldetails",
            localField: "in_education",
            foreignField: "_id",
            as: "in_education",
          }
        },
        { $unwind: { path: "$in_education", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "hospitallocations",
            localField: "in_hospital_location",
            foreignField: "_id",
            as: "in_hospital_location",
          }
        },
        { $unwind: { path: "$in_hospital_location", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "documentmanagements",
            localField: "in_document_management",
            foreignField: "_id",
            as: "in_document_management",
          }
        },
        { $unwind: { path: "$in_document_management", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "documentinfos",
            localField: "profile_picture",
            foreignField: "_id",
            as: "profile_picture",
          }
        },
        { $unwind: { path: "$profile_picture", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "documentinfos",
            localField: "license_details.image",
            foreignField: "_id",
            as: "license_image",
          },
        },
        { $unwind: { path: "$license_image", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            "for_portal_user.password": 0
          }
        }
      ]

      const result = await BasicInfo.aggregate(aggregate);
      // console.log("result---->>>>",result);

      if (result.length > 0) {
        const availability = result[0].in_availability
        let availabilityArray = []
        availabilityArray = await Availability.find({ for_portal_user: portal_user_id });

        let feeMAnagementArray = []
        feeMAnagementArray = await FeeManagement.find({ for_portal_user: portal_user_id });

        let documentManagementList = [];
        documentManagementList = await DocumentManagement.find({ for_portal_user: portal_user_id });

        const servicePromises = result.map(item => httpService.getStaging('hospital/get-service-data', { data: item.services }, headers, 'hospitalServiceUrl'));
        const departmentPromises = result.map(item => httpService.getStaging('hospital/get-department-data', { data: item.department }, headers, 'hospitalServiceUrl'));
        const unitPromises = result.map(item => httpService.getStaging('hospital/get-unit-data', { data: item.unit }, headers, 'hospitalServiceUrl'));
        const specialityPromises = result.map(item => httpService.getStaging('hospital/get-speciality-data', { data: item.speciality }, headers, 'hospitalServiceUrl'));

        const expertisePromises = result.map(item => httpService.getStaging('hospital/get-expertise-data', { data: item.expertise }, headers, 'hospitalServiceUrl'));
        const [serviceData, departmentData, unitData, specialityData, expertiseData] = await Promise.all([
          Promise.all(servicePromises),
          Promise.all(departmentPromises),
          Promise.all(unitPromises),
          Promise.all(specialityPromises),
          Promise.all(expertisePromises)
        ]);

        result.forEach((item, index) => {
          item.service = serviceData[index]?.data;
          item.departments = departmentData[index]?.data;
          item.units = unitData[index]?.data;
          item.specialities = specialityData[index]?.data;
          item.expertise = expertiseData[index]?.data;
        });


        // For Profile Picture
        const profilePicture = await Promise.all(result.map(async (chat) => {
          // For Profile Picture
          if (chat?.profile_picture?.url) {
            // console.log("chat?.profile======>>>>",chat?.profile_picture?.url)
            chat.profile_picture.url = await getDocument(chat?.profile_picture?.url);
          }

          if (chat?.license_image?.url) {
            chat.license_details.image = await getDocument(chat?.license_image?.url);
          }

          // For Document Management
          const documents = chat?.in_document_management;
          const documentsArray = [];
          if (documents) {
            for (const data of documents.document_details) {
              let image = '';
              if (data?.image_url) {
                try {
                  let data1 = await DocumentInfo.findOne({ _id: data?.image_url });
                  if (data1) {
                    image = await getDocument(data1.url);
                    // console.log("image>>>>>>>>", image)
                  }
                } catch (error) {
                  console.error("Error fetching document info:", error);
                }
              }
              data.image_url = image;
              documentsArray.push(data);
            }
            documents.document_details = documentsArray;
          }
        }))
        const portalUser = await PortalUser.findById(portal_user_id).select('average_rating')

        const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: portal_user_id } }).countDocuments()
        const portal_rating = {
          average_rating: portalUser?.average_rating,
          total_review: getRatingCount
        }

        // console.log("result[0]?.assign_staff-----", result[0]?.assign_staff)

        if (result[0]?.assign_staff && result[0]?.assign_staff[0] !== '') {
          const staffData = await httpService.getStaging('hospital/get-all-staff-data', { data: result[0]?.assign_staff }, headers, 'hospitalServiceUrl');
          result[0].assign_staff = staffData?.body;
        }


        sendResponse(req, res, 200, {
          status: true,
          data: { result, availabilityArray, feeMAnagementArray, pathology_tests, portal_rating, documentManagementList },
          message: `${type} details fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          data: null,
          message: `${type} details fetched successfully`,
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

  async deletePathologyTest(req, res) {
    try {
      const { for_portal_user, typeOfTest, nameOfTest } = req.body;
      console.log(req.body, "bodyyyy_______");
      const result = await PathologyTestInfoNew.findOneAndDelete({ for_portal_user, typeOfTest, nameOfTest });

      sendResponse(req, res, 200, {
        status: true,
        body: {
          data: result
        },
        message: "Test Deleted successfully",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to Delete test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async fourPortalAllManagementList(req, res) {
    const { hospital_portal_id, page, limit, searchKey, type } = req.query
    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray['for_portal_user.createdAt'] = -1;
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

      const headers = {
        'Authorization': req.headers['authorization']
      }
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL', 'INDIVIDUAL'] },
        'for_portal_user.isDeleted': false,
        'for_portal_user.type': type,
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
        { $match: filter },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            services: 1,
            department: 1,
            unit: 1,
            expertise: 1,
            speciality: 1,
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
              role: "$for_portal_user.role",
              type: "$for_portal_user.type"
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

      if (result.length > 0) {
        try {
          const servicePromises = result.map(item => httpService.getStaging('hospital/get-service-data', { data: item.services }, headers, 'hospitalServiceUrl'));
          const departmentPromises = result.map(item => httpService.getStaging('hospital/get-department-data', { data: item.department }, headers, 'hospitalServiceUrl'));
          const unitPromises = result.map(item => httpService.getStaging('hospital/get-unit-data', { data: item.unit }, headers, 'hospitalServiceUrl'));
          const specialityPromises = result.map(item => httpService.getStaging('hospital/get-speciality-data', { data: item.speciality }, headers, 'hospitalServiceUrl'));

          const [serviceData, departmentData, unitData, specialityData] = await Promise.all([
            Promise.all(servicePromises),
            Promise.all(departmentPromises),
            Promise.all(unitPromises),
            Promise.all(specialityPromises)
          ]);

          result.forEach((item, index) => {
            item.service = serviceData[index]?.data[0]?.service;
            item.departments = departmentData[index]?.data[0]?.department;
            item.units = unitData[index]?.data[0]?.unit;
            item.specialities = specialityData[index]?.data[0]?.specilization;
          });

          sendResponse(req, res, 200, {
            status: true,
            data: {
              data: result,
              totalCount: totalCount.length,
            },
            message: `hospital ${type} fetched successfully`,
            errorCode: null,
          });
        } catch (error) {
          // Handle errors, e.g., log or send an error response
          sendResponse(req, res, 200, {
            status: true,
            data: {
              data: null,
              totalCount: 0,
            },
            message: `hospital ${type} fetched successfully`,
            errorCode: null,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: true,
          data: {
            data: null,
            totalCount: 0,
          },
          message: `hospital ${type} not fetched successfully`,
          errorCode: null,
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

  async fourportalManagementRequestList(req, res) {
    const { hospital_portal_id, page, limit, searchKey, type } = req.query

    console.log("req.query>>>>>>>>>>>>", req.query)
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['for_portal_user.createdAt'] = -1;
      }
      var filter = {
        'for_portal_user.role': { $in: ['INDIVIDUAL'] },
        'for_portal_user.isDeleted': false,
        'for_portal_user.type': type,
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

        // {
        //   $lookup: {
        //     from: "services",
        //     localField: "services",
        //     foreignField: "_id",
        //     as: "services",
        //   }
        // },
        // { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },
        // {
        //   $lookup: {
        //     from: "specialties",
        //     localField: "speciality",
        //     foreignField: "_id",
        //     as: "speciality",
        //   }
        // },
        // { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            // speciality: "$speciality.specilization",
            // services: "$services.service",
            department: 1,
            speciality: 1,
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

      if (result.length > 0) {

        // Create an array to store all the promises
        const promises = result.map(async (item) => {
          const unitData = httpService.getStaging('hospital/get-unit-data', { data: item.unit }, headers, 'hospitalServiceUrl');
          const specialityData = httpService.getStaging('hospital/get-speciality-data', { data: item.speciality }, headers, 'hospitalServiceUrl');

          // Use Promise.all to await both requests concurrently
          const [unitResponse, specialityResponse] = await Promise.all([unitData, specialityData]);

          // Update the result object with the data
          item.units = unitResponse?.data[0]?.unit;
          item.specialities = specialityResponse?.data[0]?.specilization;
        });

        // Wait for all promises to complete
        await Promise.all(promises);

        sendResponse(req, res, 200, {
          status: true,
          data: {
            data: result,
            totalCount: totalCount.length,
          },
          message: `hospital ${type} fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: true,
          data: {
            data: [],
            totalCount: 0,
          },
          message: `hospital ${type} not fetched successfully`,
          errorCode: null,
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

  async acceptOrRejectFourPortalRequest(req, res) {
    const { action, doctor_portal_id, hospital_id, type } = req.body;

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
          message: `${type} ${action} successfully`,
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

  async fourportalManagementEducationalDetails(req, res) {
    const { portal_user_id, education_details, type } = req.body
    try {
      const checkExist = await EducationalDetail.find({ for_portal_user: portal_user_id }).exec()
      if (checkExist.length > 0) {
        await EducationalDetail.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { education_details }
        }).exec();
      } else {
        const eduData = new EducationalDetail({
          education_details,
          for_portal_user: portal_user_id,
          type
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

  async fourportalManagementHospitalLocation(req, res) {
    const { portal_user_id, hospital_or_clinic_location, type } = req.body
    console.log("body========>", req.body);
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      //   const saveLocationdata= await httpService.postStaging('hospital/save-four-portal-hospital-location', {data:req.body}, headers, 'hospitalServiceUrl');
      // console.log("saveLocationdata==========>", saveLocationdata)

      const checkExist = await HospitalLocation.find({ for_portal_user: portal_user_id }).exec()
      // const checkExist = await httpService.getStaging('hospital/get-hospital-location', {data:portal_user_id}, headers, 'hospitalServiceUrl')

      console.log("CHECK EXIST==========>", checkExist)

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
        // getRole = await PortalUser.findById({ _id: basicInfo?.for_hospital })
        // console.log("getRole-->", getRole);

        getRole = await httpService.getStaging('hospital/get-portal-user-data', { data: basicInfo?.for_hospital }, headers, 'hospitalServiceUrl')
        console.log("getRole-->", getRole);
      }

      let locationArray = []
      for (const value of hospital_or_clinic_location) {
        console.log("value.locationFor>>>>>", value)
        let status = value.locationFor == 'hospital' ? 'PENDING' : 'APPROVED';
        if (getRole != "") {
          if (getRole?.data[0]?.role == 'HOSPITAL_ADMIN') {
            console.log("getRole>>>>>>>", getRole?.data[0]?.role);
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

      }
      else {
        const hlocData = new HospitalLocation({
          hospital_or_clinic_location,
          for_portal_user: portal_user_id,
          type
        })

        const hlocResult = await hlocData.save()

        await BasicInfo.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { in_hospital_location: hlocResult._id, for_hospitalIds_temp: permissionToHospital }
        }).exec();
      }

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `hospital location added successfully`,
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

  async forPortalManagementAvailability(req, res) {
    const { portal_user_id, doctor_availability, location_id, type } = req.body
    try {
      //await DoctorAvailability.deleteMany({ for_portal_user: { $eq: portal_user_id }, location_id })
      const dataArray = []
      for (let data of doctor_availability) {
        data['for_portal_user'] = portal_user_id
        data['type'] = type
        if (data.existingIds === '') {
          dataArray.push(data)
        } else {
          await Availability.findOneAndUpdate({ _id: { $eq: data.existingIds } }, {
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

        const result = await Availability.insertMany(dataArray)
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

  async fourPortalManagementGetLocations(req, res) {
    try {
      const { portal_user_id, type } = req.query
      const results = await HospitalLocation.aggregate([
        { $match: { for_portal_user: mongoose.Types.ObjectId(portal_user_id), type: type } },
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

  async fourPortalManagementFeeManagement(req, res) {
    const { portal_user_id, location_id, online, home_visit, f2f, type } = req.body
    console.log("req.body>>>>>>>>>>", req.body)
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
        objectData['type'] = type
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

  async fourPortalManagementDocumentManagement(req, res) {
    const { portal_user_id, document_details, type } = req.body
    try {
      const checkExist = await DocumentManagement.find({ for_portal_user: portal_user_id }).exec()
      if (checkExist.length > 0) {
        await DocumentManagement.findOneAndUpdate({ for_portal_user: { $eq: portal_user_id } }, {
          $set: { document_details }
        }).exec();
      } else {
        const docData = new DocumentManagement({
          document_details,
          for_portal_user: portal_user_id,
          type
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

  async deleteAvailability(req, res) {
    const { portal_user_id, location_id } = req.body
    console.log("req.body>>>>>>>>>", req.body)
    try {
      await Availability.deleteMany({ for_portal_user: { $eq: portal_user_id }, location_id })

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

  async addAppointmentReason(req, res) {
    try {
      const { appointmentReasonArray, loginPortalId, portalType, selectedlocation, createdBy } = req.body;
      console.log(req.body, "SSbodyyyyyyy____yyyyyyy");

      const list = appointmentReasonArray.map((singleData) => ({
        ...singleData,
        added_by_portal: loginPortalId,
        portal_type: portalType,
        selectedlocation: selectedlocation,
        createdBy: createdBy,

      }));

      for (let data of list) {
        const checkname = data.name;
        console.log(selectedlocation, "list_____________", checkname);

        let CheckData = await ReasonForAppointment.find({ selectedlocation: mongoose.Types.ObjectId(selectedlocation), is_deleted: true });
        console.log(checkname, "CheckData>>>>>>>>")

        for (let ele of CheckData) {
          if (ele.name === checkname) {
            console.log("ele.name>>>>>>>>>", ele.name)
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: `Appointment Reason ${checkname} already exists for the same location.`,
              errorCode: null,
            });
          }
        }
      }

      const result = await ReasonForAppointment.insertMany(list)

      return sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully added appointment reason",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add appointment reason",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async reasonForAppointmentList(req, res) {
    try {
      const { limit, page, searchText, loginPortalId, listFor, selectedlocation } = req.query;
      console.log(": req.query", req.query)
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }

      var filter = { added_by_portal: mongoose.Types.ObjectId(loginPortalId), is_deleted: false };

      if (listFor === undefined) {
        filter = { ...filter, active: true };
      }

      if (searchText !== "") {
        console.log("runnnnnnnnnnn")
        filter.name = { $regex: searchText || '', $options: "i" };
        // filter = {
        //   is_deleted: false,
        //   active: true,
        //   added_by_portal: loginPortalId,
        //   name: { $regex: searchText || '', $options: "i" }
        // };
      }
      // var filter1 = {};

      if (selectedlocation !== 'undefined' && selectedlocation !== '') {
        filter = {
          ...filter,
          selectedlocation: mongoose.Types.ObjectId(selectedlocation)
        }
      }
      let aggregate = [
        {
          $match: filter
        },
        {
          $lookup: {
            from: "hospitallocations",
            let: { selectedlocation: "$selectedlocation" },
            pipeline: [
              {
                $unwind: "$hospital_or_clinic_location"
              },
              {
                $match: {
                  $expr: {
                    $eq: [
                      {
                        $toObjectId: "$hospital_or_clinic_location.hospital_id"
                      },
                      "$$selectedlocation"
                    ]
                  }
                }
              }
            ],
            as: "locationDetails"
          }
        },
        {
          $unwind: "$locationDetails"
        },
        {
          $group: {
            _id: "$_id", // Use the field that uniquely identifies each record
            name: { $first: "$name" },  // Using $first as an accumulator
            active: { $first: "$active" },  // Using $first as an accumulator
            added_by_portal: { $first: "$added_by_portal" },  // Using $first as an accumulator
            locationDetails: { $first: "$locationDetails" } // Choose the document you want to keep
          }
        }

      ]

      const count = await ReasonForAppointment.aggregate(aggregate);
      aggregate.push({
        $sort: sortingarray
      })

      if (limit != '0') {
        aggregate.push(
          { $skip: (page - 1) * limit },
          { $limit: limit * 1 })
      }

      const result = await ReasonForAppointment.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count.length,
          data: result,
        },
        message: "Successfully get reason for appointment list",
        errorCode: null,
      });

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get reason for appointment list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }

  }

  // async reasonForAppointmentList(req, res) {
  //   try {
  //     const { limit, page, searchText, loginPortalId, listFor } = req.query;
  //     console.log(req.query, "checkdataaaaaaa_____");
  //     var sort = req.query.sort
  //     var sortingarray = {};
  //     if (sort != 'undefined' && sort != '' && sort != undefined) {
  //       var keynew = sort.split(":")[0];
  //       var value = sort.split(":")[1];
  //       sortingarray[keynew] = value;
  //     } else {
  //       sortingarray['createdAt'] = -1;
  //     }
  //     var filter = { added_by_portal: loginPortalId, is_deleted: false }
  //     if (listFor === undefined) {
  //       filter = { ...filter, active: true }
  //     }

  //     if (searchText != "") {
  //       filter = {
  //         is_deleted: false,
  //         active: true,
  //         added_by_portal: loginPortalId,
  //         name: { $regex: searchText || '', $options: "i" }
  //       }
  //     }
  //     const result = await ReasonForAppointment.find(filter)
  //       .sort(sortingarray)
  //       .skip((page - 1) * limit)
  //       .limit(limit * 1)
  //       .exec();

  //     const count = await ReasonForAppointment.countDocuments(filter);

  //     sendResponse(req, res, 200, {
  //       status: true,
  //       body: {
  //         totalCount: count,
  //         data: result,
  //       },
  //       message: "Successfully get reason for appointment list",
  //       errorCode: null,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: null,
  //       message: "failed to get reason for appointment list",
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  async updateReasonForAppointment(req, res) {
    try {
      const {
        appointmentReasonId,
        name,
        active,
        loginPortalId,
        selectedlocation
      } = req.body
      console.log(" req.body??????????", req.body)
      const result = await ReasonForAppointment.findOneAndUpdate(
        { _id: appointmentReasonId },
        {
          $set: {
            name,
            active,
            added_by_portal: loginPortalId,
            selectedlocation
          }
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully updated reason for appointment",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update reason for appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnReasonForAppointment(req, res) {
    try {
      const { appointmentReasonId, action_name, action_value } = req.body

      const filter = {}
      if (action_name == "active") filter['active'] = action_value
      if (action_name == "delete") filter['is_deleted'] = action_value

      const result = await ReasonForAppointment.findOneAndUpdate(
        { _id: appointmentReasonId },
        filter,
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully deleted appointment reason",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to action done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async bulkUploadAppointmentReason(req, res) {
    try {
      console.log(req.body, "bodyyy_______");

      const filePath = './uploads/' + req.filename
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(AppointmentReasonColumns, data[0])
      fs.unlinkSync(filePath)
      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return
      }
      const inputArray = []
      for (const singleData of data) {
        inputArray.push({
          name: singleData.ReasonName,
          selectedlocation: req.body.selectedlocation,
          added_by_portal: req.body.loginPortalId,
          portal_type: req.body.portalType,
        })
      }

      for (let data of inputArray) {
        const checkname = data.name;
        // console.log( "list_____________", checkname);

        let CheckData = await ReasonForAppointment.find({ selectedlocation: mongoose.Types.ObjectId(req.body.selectedlocation), is_deleted: false });
        // console.log(checkname, "CheckData>>>>>>>>")

        for (let ele of CheckData) {
          if (ele.name === checkname) {
            // console.log("ele.name>>>>>>>>>",ele.name)
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: `Appointment Reason ${checkname} already exists for the same location in sheet.`,
              errorCode: null,
            });
          }
        }
      }
      const result = await ReasonForAppointment.insertMany(inputArray);

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully added appointment reasons",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "erroeeee_______");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: error.message ? error.message : "failed to add appointment reasons",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  //Questionnaire
  async addQuestionnaire(req, res) {
    try {
      const {
        controller,
        question,
        type,
        options,
        active,
        required,
        loginPortalId,
        portalType,
        createdBy

      } = req.body

      // console.log(req.body, "body________");
      const questionnaire = new Questionnaire({
        controller,
        question,
        type,
        options,
        active,
        required,
        added_by_portal: loginPortalId,
        portal_type: portalType,
        createdBy: createdBy
      })
      const result = await questionnaire.save()
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully added questionnaire",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add questionnaire",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async QuestionnaireList(req, res) {
    try {
      const { limit, page, searchText, loginPortalId } = req.query

      // console.log(req.query, "queryyyyy______");
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray['createdAt'] = -1;
      }
      var filter = {
        is_deleted: false,
        added_by_portal: { $eq: loginPortalId }
      }
      // if (searchText != "") {
      //     filter = {
      //         is_deleted: false,
      //         name: { $regex: searchText || '', $options: "i" }
      //     }
      // }
      const result = await Questionnaire.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await Questionnaire.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: result,
        },
        message: "Successfully get questionnaire list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get questionnaire list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async QuestionnaireDetails(req, res) {
    try {
      const { questionnaireId } = req.query
      const result = await Questionnaire.findOne({ _id: questionnaireId })
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully get questionnaire details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get questionnaire details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateQuestionnaire(req, res) {
    try {
      const {
        questionnaireId,
        controller,
        question,
        type,
        options,
        active,
        required,
      } = req.body
      const result = await Questionnaire.findOneAndUpdate(
        { _id: questionnaireId },
        {
          $set: {
            controller,
            question,
            type,
            options,
            active,
            required
          }
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully updated questionnaire",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update questionnaire`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnQuestionnaire(req, res) {
    try {
      const { questionnaireId, action_name, action_value } = req.body

      const filter = {}
      if (action_name == "active") filter['active'] = action_value
      if (action_name == "delete") filter['is_deleted'] = action_value
      if (action_name == "required") filter['required'] = action_value

      const result = await Questionnaire.findOneAndUpdate(
        { _id: questionnaireId },
        filter,
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully action done",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to action done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async addAcceptedInsurance(req, res) {
    // console.log("inside insurnace");
    try {
      const { main_phone_number, insuracneCompanyId, oldInsuracneCompanyId, oldInsuracneCompanyIdforstatus } = req.body
      // console.log("inside insurnace", req.body);

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

  async listCategoryStaff(req, res) {
    try {
      const { pharmacyId, staffRoleId } = req.query
      // console.log(req.query, "id check");
      const staffList = await StaffInfo.find({ creatorId: pharmacyId, role: staffRoleId })
      // console.log(staffList, "id check");
      sendResponse(req, res, 200, {
        status: true,
        data: staffList,
        message: `Get staff list successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "check erri00");
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to get staff list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getPortalUserData(req, res) {
    try {
      let result = await PortalUser.find({ _id: mongoose.Types.ObjectId(req.query.data) }).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `profile data fetch successfully`,
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

  async getBasicInfoData(req, res) {
    try {
      const result = await BasicInfo.find({ verify_status: "APPROVED" }).select({ first_name: 1, middle_name: 1, last_name: 1, full_name: 1, for_portal_user: 1, _id: 0 }).populate({
        path: "for_portal_user",
        match: { isDeleted: false } // Add this match condition
      })
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `basic data fetch successfully`,
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

  async fourPortalHospitalListforChat(req, res) {
    console.log("req.query==>>>>>>>", req.query)
    try {
      let result = await BasicInfo.find({ for_hospitalIds: mongoose.Types.ObjectId(req.query.data) }).select({ for_portal_user: 1 });
      // console.log("result=====>>>>",result)

      // Extract the for_portal_user values from the result array
      const forPortalUserIds = result.map(item => item.for_portal_user);
      let portalData = await PortalUser.find({ _id: { $in: forPortalUserIds }, isDeleted: false }).select({ _id: 1, full_name: 1, profile_picture: 1, role: 1, type: 1 });
      // console.log("portalData===>>>>>>",portalData)

      if (result?.length > 0) {
        sendResponse(req, res, 200, {
          status: true,
          data: portalData,
          message: `hospital FouPortal fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `hospital FouPortal fetched successfully`,
          errorCode: null,
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

  async totalTestsOfAllAppointmentTypes(req, res) {
    try {
      const {
        four_portal_id,
        portalType,
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


      var fourPortalId = Array.isArray(four_portal_id) ? four_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(four_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'fourPortalDetails'
          }
        },
        { $unwind: "$fourPortalDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
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
            portalId: 1,
            hospital_details: 1,
            paymentType: 1,
            fourPortalDetails: 1,
            portal_type: 1,
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

  async totalTestsOfAllAppntForLineChart(req, res) {
    try {
      const {
        four_portal_id,
        portalType,
        appntStatus,
        dateFilter
      } = req.query;


      let appointmentStatus_filter = {};
      let dateWiseFilter = {};

      if (appntStatus !== 'ALL') {
        appointmentStatus_filter = {
          'status': appntStatus
        }
      }

      if (dateFilter !== '') {
        dateWiseFilter = {
          'consultationDate': {
            $gte: new Date(dateFilter).toISOString()
          }
        };
      }

      var fourPortalId = Array.isArray(four_portal_id) ? four_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(four_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'fourPortalDetails'
          }
        },
        { $unwind: "$fourPortalDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
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
            portalId: 1,
            hospital_details: 1,
            paymentType: 1,
            fourPortalDetails: 1,
            portal_type: 1,
            createdAt: 1,
          }
        },
        {
          $match: {
            $and: [
              appointmentStatus_filter,
              dateWiseFilter
            ]
          }
        }
      ];

      const totalTestsCountInfo = await Appointment.aggregate(aggregate);

      let monthlyTotalTests = {};

      moment.months().forEach((month) => {
        monthlyTotalTests[month] = 0;
      });

      totalTestsCountInfo.forEach((item) => {
        if (item && item.consultationDate) {
          let createDate = moment(item.consultationDate);
          let month = createDate.format('MMMM');

          monthlyTotalTests[month] += 1;
        }
      });

      sendResponse(req, res, 200, {
        status: true,
        data: {
          monthlyTotalTests: monthlyTotalTests
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

  async totalClaimReportedOfAppmnts(req, res) {
    const {
      four_portal_id,
      portalType,
    } = req.query;

    //console.log("reqqqqee______",req.query)
    try {

      const headers = {
        'Authorization': req.headers['authorization']
      }
      const claimsList = await httpService.getStaging('claim/get-claims-fourportal', { for_portal_user: four_portal_id, claimType: portalType }, headers, 'insuranceServiceUrl');

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
        message: `hospital FouPortal fetched successfully`,
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

  async totalAppointmentsCountRevenueOfFourPortal(req, res) {
    try {
      const {
        doctor_portal_id,
        yearFilter,
        dateFilter,
        portalType
      } = req.query;

      console.log(req.query, "queryyyy_______");

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

      var fourPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
            madeBy: { $in: ['patient', "INDIVIDUAL"] },
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
            portalId: 1,
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
            //console.log("insideeee11111___");
            F2FCoPay = F2FCoPay + Number(appointment.paymentDetails.copay) ? Number(appointment.paymentDetails.copay) : F2FCoPay;
            F2FInsuranceToBePaid = F2FInsuranceToBePaid + (appointment.paymentDetails.insuranceTobePaid) ? (appointment.paymentDetails.insuranceTobePaid) : F2FInsuranceToBePaid;
          } else {
            F2FCoPay = F2FCoPay + Number(appointment.paymentDetails.doctorFees) ? Number(appointment.paymentDetails.doctorFees) : F2FCoPay;
          }
        }

        if (appointment.appointmentType === "ONLINE") {
          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            //console.log("insideee222222__");
            OnlineCoPay = OnlineCoPay + Number(appointment.paymentDetails.copay) ? Number(appointment.paymentDetails.copay) : OnlineCoPay;
            OnlineInsuranceToBePaid = OnlineInsuranceToBePaid + (appointment.paymentDetails.insuranceTobePaid) ? (appointment.paymentDetails.insuranceTobePaid) : OnlineInsuranceToBePaid;
          } else {
            OnlineCoPay = OnlineCoPay + Number(appointment.paymentDetails.doctorFees) ? Number(appointment.paymentDetails.doctorFees) : OnlineCoPay;
          }
        }

        if (appointment.appointmentType === "HOME_VISIT") {
          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            //console.log("insideee33333____");
            HomeVisitCoPay = HomeVisitCoPay + Number(appointment?.paymentDetails?.copay) ? Number(appointment?.paymentDetails?.copay) : HomeVisitCoPay;
            HomeVisitInsuranceToBePaid = HomeVisitInsuranceToBePaid + (appointment.paymentDetails.insuranceTobePaid) ? (appointment.paymentDetails.insuranceTobePaid) : HomeVisitInsuranceToBePaid;
          } else {
            HomeVisitCoPay = HomeVisitCoPay + Number(appointment.paymentDetails.doctorFees) ? Number(appointment.paymentDetails.doctorFees) : HomeVisitCoPay;
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
        data: appointmentRevenuesCount,
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

  async getfourPortalTotalRevMonthWiseforOnline(req, res) {
    try {

      const { createdDate, updatedDate, doctor_portal_id, filterDateWise, portalType } = req.query;
      console.log("req.query>>>>>>>>>>>>", req.query)
      let currentYear = moment().year();

      let dateWiseFilter = {};

      if (filterDateWise !== '') {
        if (filterDateWise === 'Yearly') {
          console.log("run11111")
          dateWiseFilter = {
            'consultationDate': {
              $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(),
              $lt: new Date(`${Number(currentYear) + 1}-01-01T00:00:00.000Z`).toISOString()
            }
          };
        } else if (filterDateWise === 'Monthly') {
          console.log("run22222")
          dateWiseFilter = {
            'consultationDate': {
              $gte: moment().startOf('month').toDate().toISOString(),
              $lt: moment().endOf('month').toDate().toISOString()
            }
          };
        } else {
          console.log("run33333")
          dateWiseFilter = {
            'consultationDate': {
              $gte: moment().startOf('week').toDate().toISOString(),
              $lt: moment().endOf('week').toDate().toISOString()
            }
          };
        }
      }

      var fourPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

      var dateFilter = {}
      if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
        console.log("run44444")
        const createdDateObj = new Date(createdDate);
        const updatedDateObj = new Date(updatedDate);

        dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      }
      else if (createdDate && createdDate !== "") {
        console.log("run55555")
        const createdDateObj = new Date(createdDate);
        dateFilter.createdAt = { $gte: createdDateObj };
      }
      else if (updatedDate && updatedDate !== "") {
        console.log("run666666")
        const updatedDateObj = new Date(updatedDate);
        dateFilter.createdAt = { $lte: updatedDateObj };
      }
      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
            madeBy: { $in: ['patient', "INDIVIDUAL"] },
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
            portalId: 1,
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

  async getfourPortalTotalRevMonthWiseforF2F(req, res) {
    try {

      const { createdDate, updatedDate, doctor_portal_id, yearFilter, f2fYearFilter, portalType } = req.query;

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


      var fourPortalId = Array.isArray(doctor_portal_id) ? doctor_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(doctor_portal_id)];

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
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
            madeBy: { $in: ['patient', "INDIVIDUAL"] },
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
            portalId: 1,
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

  async totalRevenuefourPortalAllAppointmentTypes(req, res) {
    try {
      const {
        four_portal_id,
        portalType,
        //  yearFilter,
        //  dateFilter
      } = req.query;

      console.log(req.query, "queryyyyTests_______");

      var fourPortalId = Array.isArray(four_portal_id) ? four_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(four_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'fourPortalDetails'
          }
        },
        { $unwind: "$fourPortalDetails" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            portal_type: portalType,
            madeBy: { $in: ['patient'] },
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
            portalId: 1,
            hospital_details: 1,
            paymentType: 1,
            fourPortalDetails: 1,
            portal_type: 1,
            createdAt: 1,
          }
        }
      ];

      const totalTestsCountInfo = await Appointment.aggregate(aggregate);

      let totalF2FRevenue = 0;
      let totalOnlineRevenue = 0;
      let totalHomeVisitRevenue = 0;

      let f2fAppointments = 0;
      let onlineAppointments = 0;
      let homeVisitAppointments = 0;

      let amountCoPay = 0;
      let amountInsuranceToBePaid = 0;

      for (let appointment of totalTestsCountInfo) {

        if (appointment.appointmentType === "FACE_TO_FACE") {
          f2fAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalF2FRevenue = totalF2FRevenue + Number(appointment.paymentDetails.copay ? appointment.paymentDetails.copay : appointment.paymentDetails.doctorFees) + Number(appointment.paymentDetails.insuranceTobePaid ? appointment.paymentDetails.insuranceTobePaid : amountInsuranceToBePaid)
          } else {
            amountCoPay = Number(appointment.paymentDetails.doctorFees);
            totalF2FRevenue = totalF2FRevenue + amountCoPay;
          }

        }

        if (appointment.appointmentType === "ONLINE") {
          onlineAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalOnlineRevenue = totalOnlineRevenue + Number(appointment.paymentDetails.copay ? appointment.paymentDetails.copay : appointment.paymentDetails.doctorFees) + Number(appointment.paymentDetails.insuranceTobePaid ? appointment.paymentDetails.insuranceTobePaid : amountInsuranceToBePaid)
          } else {
            amountCoPay = Number(appointment.paymentDetails.doctorFees);
            totalOnlineRevenue = totalOnlineRevenue + amountCoPay;
          }
        }

        if (appointment.appointmentType === "HOME_VISIT") {
          homeVisitAppointments++;

          if (appointment.paymentType === "post-payment" && appointment.paymentDetails !== null) {
            totalHomeVisitRevenue = totalHomeVisitRevenue + Number(appointment.paymentDetails.copay ? appointment.paymentDetails.copay : appointment.paymentDetails.doctorFees) + Number(appointment.paymentDetails.insuranceTobePaid ? appointment.paymentDetails.insuranceTobePaid : amountInsuranceToBePaid)
          } else {
            amountCoPay = Number(appointment.paymentDetails.doctorFees);
            totalHomeVisitRevenue = totalHomeVisitRevenue + amountCoPay;
          }

        }

      }

      let appointmentsRevenue = {
        totalF2FRevenue: totalF2FRevenue,
        totalOnlineRevenue: totalOnlineRevenue,
        totalHomeVisitRevenue: totalHomeVisitRevenue,
      }

      sendResponse(req, res, 200, {
        status: true,
        data: appointmentsRevenue,
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

  async notification(req, res) {
    try {
      console.log("notificationbody------------", req.body)
      const userData = await PortalUser.findOne({ _id: req.body.for_portal_user });
      // console.log("userData11111111_____",userData)
      let content = {};
      let notificationData;
      if (userData?.notification) {
        const notificationValue = new Notification(req.body)
        notificationData = await notificationValue.save();

        if (req.body.notitype == "New Appointment" || req.body.notitype == "Booked Appointment" || req.body.notitype == "Appointment" || req.body.notitype == "Cancel Appointment" || req.body.notitype == "Reshedule Appointment" || req.body.notitype == "Appointment Approved" || req.body.notitype == "Appointment Rejected" || req.body.notitype =="Appointment Reminder") {
          content = sendAppointmentInvitation(userData?.email, userData?.full_name, req.body.content, req.body.appointmentId, req.body.notitype, userData?.type);
        } else {
          content = orderInvitation(userData?.email, userData?.full_name, req.body.content, req.body.appointmentId, req.body.title, userData?.type, req.body.notitype);
        }
        // console.log("userData11111111_____",content)

        const mailSent = await sendEmail(content);
        console.log("mailSent______",mailSent)
        const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", {socketuserid:req.body.for_portal_user }, {}, "gatewayServiceUrl");
      }

      sendResponse(req, res, 200, {
        status: true,
        body: notificationData,
        message: `notification save`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get reason for appointment list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async notificationlist(req, res) {
    try {
      const notificationData = await Notification.find({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)

      }).sort({ createdAt: -1 }).limit(10)
      const count = await Notification.countDocuments({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
        new: true
      });
      const isViewcount = await Notification.countDocuments({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
        isView: false
      });
      const headers = {
        'Authorization': req.headers['authorization']
      }
      let newnotificationlist = [];
      if (notificationData.length > 0) {
        for await (const element of notificationData) {
          let object = {
            created_by_type: element.created_by_type,
            appointmentId: element.appointmentId,
            notitype: element.notitype,
            _id: element._id,
            content: element.content,
            url: element.url,
            created_by: element.created_by,
            for_portal_user: element.for_portal_user,
            createdAt: element.createdAt,
            updatedAt: element.updatedAt,
            isView: element.isView
          };
          if (element.created_by_type == 'patient') {
            let ids = [element.created_by];
            let resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: ids }, headers, 'patientServiceUrl');
            object.name = resData.data[element.created_by].full_name
            object.picture = resData.data[element.created_by].profile_pic
            newnotificationlist.push(object)
          } else {
            object.name = ''
            object.picture = ''
            newnotificationlist.push(object)
          }
        }

      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list: newnotificationlist, count: count, isViewcount: isViewcount },

        message: `notification list`,
        errorCode: null,
      });
      //  Promise.all([completepromise]).then(async (values)=>{
      //     console.log(notificationData,"hjgdhfgskjf");

      // });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get reason for appointment list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateNotificationStatus(req, res) {
    try {
      const { id, notification } = req.body;
      const updatedNotification = await PortalUser.findByIdAndUpdate(
        { _id: id },
        { notification: notification }, // Update only the notification field
        { upsert: false, new: true }
      );
      sendResponse(req, res, 200, {
        status: true,
        body: updatedNotification,
        message: "Successfully updated notification status",
        errorCode: null,
      })
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to update notification",
        errorCode: "INTERNAL_SERVER_ERROR",
      })
    }
  }


  async portal_fetchRoomCall(req, res) {
    try {
      const headers = {
        'Authorization': req.body.authtoken
      }
      console.log("req.body======", req.body);

      var appintmentdetails = await httpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { roomname: req.body.roomName, portal_type: req.body.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
      console.log("appintmentdetails--------", appintmentdetails);
      let checkavailableUser = {
        participants: appintmentdetails.data.participantsinfodetails,
      }
      const uniqueId = req.body.uid;
      var completepromise = new Promise(async (resolve, reject) => {
        if (checkavailableUser.participants.length > 0) {
          let count = 0;
          checkavailableUser.participants.forEach(async (el) => {
            console.log("req3", el.userId, req.user._id);
            if (el.userId.toString() == req.user._id || el.userId.toString() == req.user.portalUserId) {
              const headers = {
                'Authorization': req.body.authtoken
              }
              let dataPass = {
                userId: el.userId.toString(),
                userName: el.userName,
                userImage: "",
                userIdentity: uniqueId,
              };
              let appintmentdetails11 = await httpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',
                {
                  appointmentId: req.body.chatId,
                  participants: "",
                  leftparticipantsid: el.userId.toString(),
                  participantstype: "remove",
                }
                , headers, 'labimagingdentalopticalServiceUrl');
              let appintmentdetailsnewwww = await httpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',
                {
                  appointmentId: req.body.chatId,
                  participants: dataPass,
                  participantstype: "add"
                }
                , headers, 'labimagingdentalopticalServiceUrl');
              var token = await agoraTokenGenerator(appintmentdetails.data.roomdetails.roomName, req.body.uid);
              return sendResponse(req, res, 200, {
                status: true,
                body: token,
                message: "Token Generated",
                errorCode: null,
              });
            }
            else {
              count++;
            }
          });
          if (checkavailableUser.participants.length == count) {
            resolve("")
          }
        }
        else {
          resolve("")
        }
      });

      Promise.all([completepromise]).then(async (values) => {
        const roomName = req.body.roomName;
        const uniqueId = req.body.uid;
        if (!roomName) {
          return sendResponse(req, res, 200, {
            status: false,
            body: token,
            message: "Must include roomName argument.",
            errorCode: null,
          });
          // return res.status(200).json("Must include roomName argument.");
        }
        let token = await agoraTokenGenerator(roomName, uniqueId);
        console.log("token=====", token);
        if (req.body.loggedInUserId) {
          let dataPass = {
            userId: req.body.loggedInUserId,
            userName: req.body.loginname,
            userImage: "",
            userIdentity: uniqueId,
          };
          console.log("dataPass=====", dataPass);

          const headers = {
            'Authorization': req.body.authtoken
          }
          let appintmentdetails = await httpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',
            {
              appointmentId: req.body.chatId,
              participants: dataPass,
              participantstype: "add"
            }
            , headers, 'labimagingdentalopticalServiceUrl');
        }

        return sendResponse(req, res, 200, {
          status: true,
          body: token,
          message: "Token Generated",
          errorCode: null,
        });
      })

    } catch (e) {
      console.log("e--------", e);
      return sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Token Generated",
        errorCode: "Some thing went wrong",
      });
    }

  }


  async getIdbyPortalUserName(req, res) {
    try {
      const { portalId } = req.query;

      const matchStage = {
        $match: {
          _id: mongoose.Types.ObjectId(portalId),
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
            as: "portaluserData"
          }
        },
        {
          $unwind: "$portaluserData"
        },
        {
          $project: {
            full_name: "$portaluserData.full_name",
          }
        }

      ];
      const result = await PortalUser.aggregate(pipeline);
      const result1 = await PortalUser.findById(portalId);
      let profilePics
      if (result1?.profile_picture != '' && result1?.profile_picture != null) {
        const profilePic = await getDocument(result1?.profile_picture)
        profilePics = profilePic
      }
      if (result.length > 0) {
        sendResponse(req, res, 200, {
          status: true,
          body: result[0].full_name,
          profilePic: profilePics,
          message: "List getting successfully!",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Failed to fetch list",
          errorCode: "INTERNAL_SERVER_ERROR",
        });

      }

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetch list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllLocationById(req, res) {
    try {
      const { portal_user_id, type } = req.query;
      let alllocation = await HospitalLocation.find({ for_portal_user: portal_user_id, type: type });

      if (alllocation.length > 0) {
        sendResponse(req, res, 200, {
          status: true,
          body: alllocation,
          message: "List getting successfully!",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Failed to fetch list",
          errorCode: "INTERNAL_SERVER_ERROR",
        });

      }

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetch list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllHospitalandClinicListForClaim(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { portalType } = req.query;
      console.log("reqqqqsss", req.query)
      const filter = {
        'isDeleted': false,
        'lock_user': false,
        'isActive': true,
        'for_doctor_info.verify_status': "APPROVED",
        'type': portalType,
        'for_location_info.type': portalType
      };

      const locationData = await PortalUser.aggregate([
        {
          $lookup: {
            from: "basicinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "for_doctor_info",
          }
        },
        {
          $lookup: {
            from: "hospitallocations",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "for_location_info",
          }
        },
        { $unwind: "$for_location_info" },
        {
          $match: filter
        },
        {
          $project: {
            _id: 1,
            for_location_info: {
              $filter: {
                input: {
                  $map: {
                    input: "$for_location_info.hospital_or_clinic_location",
                    as: "location",
                    in: {
                      $cond: {
                        if: { $eq: ["$$location.locationFor", "clinic"] },
                        then: {
                          hospital_id: "$$location.hospital_id",
                          hospital_name: "$$location.hospital_name",
                          location: "$$location.location",
                          locationFor: "$$location.locationFor",
                        },
                        else: null
                      }
                    }
                  }
                },
                as: "location",
                cond: { $ne: ["$$location", null] }
              }
            }
          }
        },
        {
          $unwind: "$for_location_info"
        },
        {
          $match: { "for_location_info": { $ne: null } }
        }
      ]);

      let hospitalDataResponse = await httpService.getStaging('hospital/get-hospital-admin-data', {}, headers, 'hospitalServiceUrl');

      if (!hospitalDataResponse.status || !hospitalDataResponse.body) {
        throw new Error("Failed to fetch hospital data");
      }

      const hospitalData = hospitalDataResponse.body;
      // Extracting the array of hospitals from hospitalData
      const hospitalArray = Array.isArray(hospitalData) ? hospitalData : [];

      const combinedResults = [...locationData, ...hospitalArray];

      sendResponse(req, res, 200, {
        status: true,
        body: combinedResults,
        message: "Successfully fetched all hospital",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "Failed to fetch all hospital",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getFourPortalListforLocation(req, res) {
    try {
      const { clinic_id, type } = req.query;

      let data1 = await HospitalLocation.find({
        'hospital_or_clinic_location': {
          $elemMatch: {
            'hospital_id': clinic_id,
            'type': type
          }
        }
      })

      let doctorDetails = await BasicInfo.find({ for_portal_user: data1[0]?.for_portal_user }).populate({
        path: "for_portal_user"
      })

      sendResponse(req, res, 200, {
        status: true,
        body: doctorDetails,
        message: "Successfully fetched all doctors",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched all hospital`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllFourPortalListForClaim(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const filter = {
        'isDeleted': false,
        'lock_user': false,
        'isActive': true,
        'for_doctor_info.verify_status': "APPROVED",
      };

      const locationData = await PortalUser.aggregate([
        {
          $lookup: {
            from: "basicinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "for_doctor_info",
          }
        },
        {
          $match: filter
        },
        {
          $lookup: {
            from: "hospitallocations",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "for_location_info",
          }
        },
        { $unwind: "$for_location_info" },
        {
          $project: {
            _id: 1,
            type: 1,
            for_location_info: {
              $filter: {
                input: {
                  $map: {
                    input: "$for_location_info.hospital_or_clinic_location",
                    as: "location",
                    in: {
                      $cond: {
                        if: { $eq: ["$$location.locationFor", "clinic"] },
                        then: {
                          hospital_id: "$$location.hospital_id",
                          hospital_name: "$$location.hospital_name",
                          location: "$$location.location",
                          locationFor: "$$location.locationFor",
                        },
                        else: null
                      }
                    }
                  }
                },
                as: "location",
                cond: { $ne: ["$$location", null] }
              }
            }
          }
        },
        {
          $unwind: "$for_location_info"
        },
        {
          $match: { "for_location_info": { $ne: null } }
        }
      ]);
      sendResponse(req, res, 200, {
        status: true,
        body: locationData,
        message: "Successfully fetched all hospital",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "Failed to fetch all hospital",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async fourPortalAllList(req, res) {
    const { hospital_portal_id } = req.query
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL', 'INDIVIDUAL'] },
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
        { $match: filter },
        {
          $project: {
            first_name: 1,
            middle_name: 1,
            last_name: 1,
            full_name: 1,
            license_details: 1,
            services: 1,
            department: 1,
            unit: 1,
            expertise: 1,
            speciality: 1,
            for_portal_user: {
              _id: "$for_portal_user._id",
              email: "$for_portal_user.email",
              country_code: "$for_portal_user.country_code",
              phone_number: "$for_portal_user.mobile",
              lock_user: "$for_portal_user.lock_user",
              isActive: "$for_portal_user.isActive",
              createdAt: "$for_portal_user.createdAt",
              role: "$for_portal_user.role",
              type: "$for_portal_user.type"
            },
          }
        },
      ];

      const result = await BasicInfo.aggregate(aggregate);

      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `list fetched successfully`,
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

  async addManualTest(req, res) {
    try {
      const { entriesArray, added_by, type } = req.body;
      const list = entriesArray.map((singleData) => ({
        ...singleData,
        for_portal_user: added_by,
        isExist: true,
        type: type
      }));
      const typeToFind = list.map((item) => item.typeOfTest);
      const namesToFind = list.map((item) => item.nameOfTest);
      const foundItems = await PathologyTestInfoNew.find({
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
      console.log("req.bod", req.body)
      const existingTest = await PathologyTestInfoNew.findOne({
        typeOfTest: req.body.typeOfTest,
        nameOfTest: req.body.nameOfTest,
        type: req.body.type,
        for_portal_user: req.body.loggedInId
      });
      console.log("existingTest", existingTest)
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
      console.log("updatedtest>>", updatedtest)
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
  async updatelogsData(req, res) {
    const { currentLogID, userAddress } = req.body;
    try {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString();
      if (userAddress) {
        const findData = await Logs.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(currentLogID) },
          {
            $set: {
              userAddress: userAddress,

            },
          },
          { new: true }
        ).exec();
      } else {

        const findData = await Logs.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(currentLogID) },
          {
            $set: {
              logoutDateTime: formattedDate,

            },
          },
          { new: true }
        ).exec();
      }
      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Update Logs Successfully",
        errorCode: null,
      });
    } catch (error) {
      return sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "Failed",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllLogs(req, res) {
    const { userId, limit, page } = req.query
    try {
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray['createdAt'] = -1;
      }
      let filter = {}

      filter = { userId: mongoose.Types.ObjectId(userId) }

      const userData = await Logs.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();

      const count = await Logs.countDocuments(filter)
      if (userData) {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            count,
            userData
          },
          message: "Update Log Successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User Not Found!!",
          errorCode: null,
        });
      }

    } catch (error) {
      console.log("error____________", error);
      return sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "Failed",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addProviderDocuments(req, res) {
    try {
      const {
        for_portal_user_id,
        docType,
        title,
        upload_date,
        type
      } = req.body;
      const existingDocument = await ProviderDocs.findOne({ title, for_portal_user: for_portal_user_id, type: type });
      if (existingDocument) {
        return sendResponse(req, res, 201, {
          status: false,
          body: null,
          message: "Document with the same title already exists for this user",
          errorCode: "DOCUMENT_EXISTS",
        });
      }
      const result = await uploadFile(req.files.document.data, {
        Bucket: "healthcare-crm-stage-docs",
        Key: `hospital/${for_portal_user_id}/${docType}/${req.files.document.name}`,
        ACL: 'public-read'
      });
      if (result) {
        const documentMetadata = new ProviderDocs({
          doc_name: result.key,
          for_portal_user: for_portal_user_id,
          title,
          upload_date,
          type
        });
        const documentDetail = await documentMetadata.save();
        return sendResponse(req, res, 200, {
          status: true,
          body: { documentDetail },
          message: "Successfully added document details",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Failed to add document details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getProviderDocumentsByFilters(req, res) {
    try {
      const { portalUserId, startDate, endDate, type } = req.query;
      const filter = { for_portal_user: portalUserId, isDeleted: false, type: type };
      if (startDate && endDate) {
        const formattedStartDate = startDate.split('-').reverse().join('/');
        const formattedEndDate = endDate.split('-').reverse().join('/');
        filter.upload_date = { $gte: formattedStartDate, $lte: formattedEndDate };
      }
      const documents = await ProviderDocs.find(filter).exec();
      if (!documents || documents.length === 0) {
        return sendResponse(req, res, 201, {
          status: false,
          body: null,
          message: "No documents found",
          errorCode: "DOCUMENT_NOT_FOUND",
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: { documents },
          message: "Documents retrieved successfully",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Failed to retrieve documents",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getProviderDocuments(req, res) {
    try {
      const { url } = req.query;
      const dataurl = await getDocument(url);
      sendResponse(req, res, 200, {
        status: true,
        data: dataurl,
        message: `file fetched successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to get file url`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async inActive_isDeletedProviderDocument(req, res) {
    try {
      const { documentId, action, status } = req.body;
      if (!documentId || !action) {
        return sendResponse(req, res, 201, {
          status: false,
          body: null,
          message: "Both documentId and action fields are required in the request body",
          errorCode: "MISSING_PARAMETER",
        });
      }
      if (action === "inactive") {
        await ProviderDocs.findByIdAndUpdate(documentId, { status: status }).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "Document update successfully",
          errorCode: null,
        });
      } else if (action === "deleted") {
        await ProviderDocs.findByIdAndUpdate(documentId, { isDeleted: status }).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "Document deleted successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "Invalid action provided",
          errorCode: "INVALID_ACTION",
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Failed to update document status",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getFourPortalList(req, res) {
    try {
      const { type } = req.query;
      const result = await PortalUser.find(
        { type: type, verified: true, lock_user: false, isDeleted: false, isActive: true },
        { full_name: 1, _id: 1, profile_picture: 1 }
      );
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Basic data fetched successfully`,
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



  async fourtportalDetails(req, res) {
    try {
      const { pharmacyId } = req.query
      console.log(req.query, "check query id");
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const portalUserData = await PortalUser.findOne({ _id: pharmacyId })
      const adminData = await BasicInfo.findOne({ for_portal_user: pharmacyId }).populate({ path: "for_portal_user" })
      sendResponse(req, res, 200, {
        status: true,
        data: portalUserData,
        message: `pharmacy details fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "dhhjdg____");
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to get all pharmacy details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async getReviewAndRatinByPatient(req, res) {
    try {
      const { patientId } = req.query;
      const sort = req.query.sort;
      let sortingarray = {};

      if (sort !== undefined && sort !== '') {
        const sortParts = sort.split(":");
        const sortByField = sortParts[0];
        const sortOrder = sortParts[1];

        if (sortByField === "full_name") {
          sortingarray['portalusers.full_name'] = sortOrder === "desc" ? -1 : 1;
        } else {
          sortingarray[sortByField] = sortOrder === "desc" ? -1 : 1;
        }
      } else {
        sortingarray['createdAt'] = -1;
      }

      const { type } = req.query;
      const result = await ReviewAndRating.aggregate([
        {
          $match: {
            $and: [
              { patient_login_id: mongoose.Types.ObjectId(patientId) },
              { portal_type: type }
            ]
          }
        },

        {
          $lookup: {
            from: 'portalusers',
            localField: 'portal_user_id',
            foreignField: '_id',
            as: 'portalusers'
          }
        },
        { $unwind: { path: "$portalusers", preserveNullAndEmptyArrays: true } },
        {
          $sort: sortingarray
        },

        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            updatedAt: 1,
            portal_user_id: 1,
            fullname: "$portalusers.full_name",
            profileUrl: "$portalusers.profile_picture"

          }
        }
      ]);

      let objArray = [];
      //arrange data
      for (const element of result) {
        const date = new Date(element.updatedAt);

        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScript months are zero-based
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();

        let filteredDate = `${year}-${month}-${day}`
        let filteredTime = `${hours}:${minutes}:${seconds}`
        objArray.push(
          {
            _id: element?._id,
            rating: element?.rating,
            comment: element?.comment,
            name: element?.fullname,
            for_portal_user: element?.portal_user_id,
            date: filteredDate,
            time: filteredTime,
            profileUrl: element?.profileUrl ? element?.profileUrl : '',
          }
        )

      }

      for (const element of objArray) {
        if (element?.profileUrl != "") {
          const profilePic = await getDocument(element?.profileUrl)
          element.profileUrl = profilePic
        } else {
          element.profileUrl = ""
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        data: objArray,
        message: `successfully fetched review and ratings`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching reviews`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getReviewAndRatingForSupeAdmin(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { page, limit, reviewBy, reviewTo } = req.query;
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }
      let aggregate = [
        {
          $match: { reviewBy, reviewTo },
        },
        {
          $lookup: {
            from: 'portalusers',
            localField: 'patient_login_id',
            foreignField: '_id',
            as: 'basicinfos'
          }
        },
        { $unwind: { path: "$basicinfos", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            rating: 1,
            comment: 1,
            createdAt: 1,
            updatedAt: 1,
            patient_login_id: 1,
            portal_user_id: 1,
            reviewBy: 1,
            doctorName: '$basicinfos.full_name',
            type: '$basicinfos.type',
            profilePic: { $ifNull: ['$basicinfos.profile_picture', null] }
          }
        },
      ];

      const totalCount = await ReviewAndRating.aggregate(aggregate);
      aggregate.push(
        {
          $sort: sortingarray
        }
      )
      if (limit > 0) {
        aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
      }

      const result = await ReviewAndRating.aggregate(aggregate);

      let hospitalId = ''
      for (const value of result) {
        hospitalId = value?.portal_user_id
      }
      let hospitalName = await httpService.getStaging('hospital/get_hospital_by_id', { "for_portal_user": hospitalId }, headers, 'hospitalServiceUrl');

      let ratingArray = [];
      for (const value of result) {
        hospitalId = value?.portal_user_id
        ratingArray.push({
          rating: value?.rating,
          comment: value?.comment,
          createdAt: value?.createdAt,
          updatedAt: value?.updatedAt,
          reviewBy: value?.reviewBy,
          doctorName: value?.doctorName,
          profileUrl: value?.profilePic,
          hospitalName: hospitalName?.data?.hospital_name,
          _id: value?._id

        })
      }

      for (const element of ratingArray) {
        if (element?.profileUrl != "") {
          const profilePic = await getDocument(element?.profileUrl)
          element.profileUrl = profilePic
        } else {
          element.profileUrl = ""
        }
      }
      sendResponse(req, res, 200, {
        status: true,
        body: {
          ratingArray,
          // getAverage,
          // ratingCount,
          totalCount: totalCount?.length,
          currentPage: page,
          totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
        },
        message: `successfully fetched review and ratings`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "fourPortal");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching reviews`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateAppointmentComplete(req, res) {
    try {
      const {
        appointmentId,
      } = req.body
      console.log(req.body, "check log 999");
      const orderDetail = await Appointment.findOneAndUpdate({ _id: appointmentId },
        {
          $set: {
            appointment_complete: true
          }
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: orderDetail,
        message: "successfully verified insurance for this order",
        errorCode: null,
      });
    } catch (error) {
      console.log("errorrrr", error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "failed to verify insurance for this order",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async saveSuperadminNotification(req, res) {
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
          body: saveData,
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
}

export const getData = async (data) => {
  let result = {
    statusData: '', // You can set an appropriate default value here
    data1: null
  };

  for (const data1 of data?.data) {
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
  labimagingdentaloptical: new LabImagingDentalOptical(),
};