"use strict";
import bcrypt from "bcrypt";

// models
import PortalUser from "../models/portal_user";
import ProfileInfo from "../models/profile_info";
import Counter from "../models/counter";
import Profile_info from "../models/profile_info";
import Location_info from "../models/location_info";
import Notification from "../models/notification";
import Otp2fa from "../models/otp2fa";
import ForgotPasswordToken from "../models/forgot_password_token";
import ProfilePermission from "../models/profile_permission";
// utils
import { sendResponse, createSession } from "../helpers/transmission";
const Http = require("../helpers/httpservice");
import { hashPassword } from "../helpers/string";
import { htmlEmailFor2FAOTP, htmlForgetPassword } from "../constant";
import { sendEmail } from "../helpers/ses";
import Insurance_info from "../models/insurance_info";
import Vital_info from "../models/vital_info";
import Medicine_info from "../models/medicine_info";
import Immunization_info from "../models/immunization_info";
import Immunization_list from "../models/immunization_list";
import Allergy_reaction from "../models/allergy_reaction";
import Allergies_list from "../models/allergies_list";
import PatientHistoryTypeList from "../models/patient_history_type_list";
import LifestyleTypeList from "../models/lifestyle_type_list";
import FamilyHistoryTypeList from "../models/family_history_type_list";
import History_info from "../models/history_info";
import Medical_document from "../models/medical_document";
import Family_info from "../models/family_info";
import {sendNotification} from "../helpers/firebase_notification";
import { notification } from "../helpers/notification";
import {
  bcryptCompare,
  generate6DigitOTP,
  generateRefreshToken,
  generateTenSaltHash,
  generateToken,
  handleRejectionError,
  processExcel,
  smsTemplateOTP,
} from "../middleware/utils";
import { sendSms } from "../middleware/sendSms";
import {
  verifyEmail2fa,
  forgotPasswordEmail,
  sendMailInvitations,
} from "../helpers/emailTemplate";
import crypto from "crypto";
import { sendSmtpEmail } from "../middleware/sendSmtpEmail";
import PaymentHistory from "../models/subscription/purchasestatus";
import { decryptionData } from "../helpers/crypto";
import { ImmunizationColumns, config } from "../config/constants";
import { getFile, uploadFile, getDocument } from "../helpers/s3";
import mongoose, { Mongoose } from "mongoose";
import purchasestatus from "../models/subscription/purchasestatus";
import vital_info from "../models/vital_info";
import Invitation from "../models/email_invitation";
import ImmunizationList from "../models/immunization_list";
import MobilePayInfo from "../models/mobile_pay";
import { AppointmentInvitation, orderInvitation } from "../helpers/emailTemplate";
const httpService = new Http();
const fs = require("fs");

const checkIp = async (currentIP, userIP) => {
  if (currentIP === userIP) {
    return true;
  }
  return false;
};
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
const checkPassword = async (password, user) => {
  const isMatch = await bcrypt.compare(password, user.password);
  return isMatch;
};
const permissionBasedResult = async (permissionIdArray, totalResultArray) => {
  var final_result = [];
  if (permissionIdArray?.length > 0) {
    for (let index = 0; index < permissionIdArray.length; index++) {
      const permission_id = permissionIdArray[index];
      for (let index = 0; index < totalResultArray.length; index++) {
        const element = totalResultArray[index]._id;
        if (permission_id == element) {
          final_result.push(totalResultArray[index]);
        }
      }
    }
  }
  return final_result;
};

class Patient {
  async signup(req, res) {
    try {
      const {
        full_name,
        first_name,
        middle_name,
        last_name,
        email,
        country_code,
        mobile,
        gender,
        dob,
        blood_group,
        marital_status,
        password,
      } = req.body;
      let userFind = await PortalUser.findOne({ mobile, isDeleted: false });
      if (userFind) {
        return sendResponse(req, res, 200, {
          status: false,
          body: userFind,
          message: "Mobile Number is already exist.Please try Sign In.",
          errorCode: null,
        });
      }
      const salt = await bcrypt.genSalt(10);
      let passwordHash = await bcrypt.hash(password, salt);
      var sequenceDocument = await Counter.findOneAndUpdate(
        { _id: "countid" },
        { $inc: { sequence_value: 1 } },
        { new: true }
      );
      let portalUserDetails = new PortalUser({
        email,
        userId: sequenceDocument.sequence_value,
        password: passwordHash,
        country_code,
        mobile,
      });
      let portalUserData = await portalUserDetails.save();
      let profile = new Profile_info({
        full_name: first_name + " " + middle_name + " " + last_name,
        first_name,
        middle_name,
        last_name,
        gender,
        dob,
        blood_group,
        marital_status,
        for_portal_user: portalUserData._id,
      });
      let profileData = await profile.save();

      let superadminData = await httpService.getStaging(
        "superadmin/get-super-admin-data",
        {},
        {},
        "superadminServiceUrl"
      );

      var requestData = {
        created_by_type: "patient",
        created_by: portalUserData?._id,
        content: "New Registration From Patient",
        url: '',
        for_portal_user: superadminData?.body?._id,
        notitype: "New Registration",
        appointmentId:  portalUserData?._id, 
    }
    var result = await notification('', '', "superadminServiceUrl", '', '', '','', requestData)
      sendResponse(req, res, 200, {
        status: true,
        body: {
          portalUserData,
          profileData,
        },
        message: "successfully signup",
        errorCode: null,
      });
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to create patient",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async login(req, res) {
    try {
      const { mobile, password, fcmToken } = req.body;
      const { uuid } = req.headers;
      const portalUserData = await PortalUser.findOne({ mobile }).lean();
      // const headers = {
      //   Authorization: req.headers["authorization"],
      // };
      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }

      if (req.body.fcmToken != "" || req.body.fcmToken != undefined) {
        let pushNotification = await PortalUser.findByIdAndUpdate(
          portalUserData._id,
          { $set: { fcmToken: req.body.fcmToken } }
        );
      }

      const isPasswordMatch = await checkPassword(password, portalUserData);
      console.log(isPasswordMatch, "testtttt==================");
      if (!isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Credential not matched",
          errorCode: "INCORRECT_PASSWORD",
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

      const profileData1 = await Profile_info.aggregate([{
        $match: { for_portal_user: portalUserData._id }
      }, {
        $lookup: {
          from: "locationinfos",
          localField: "in_location",
          foreignField: "_id",
          as: "locationinfos",
        }
      }])
      var profileData = {}
      if (profileData1.length > 0) {
        profileData = profileData1[0]
      }
      if (profileData?.locationinfos.length > 0) {
        try {
          var locationids = {
            country_id: profileData?.locationinfos[0].country,
            region_id: profileData?.locationinfos[0].region,
            province_id: profileData?.locationinfos[0].province,
            village_id: profileData?.locationinfos[0].village,
            city_id: profileData?.locationinfos[0].city,
            department_id: profileData?.locationinfos[0].department,
          }
          console.log(locationids, "profileData1111111111111");

          const locationdata = await httpService.postStaging(
            "common-api/get-location-name",
            { locationids: locationids },
            {},
            "superadminServiceUrl"
          );
          console.log(locationdata, "profileData1111d");
          if (locationdata.status) {
            profileData.locationinfos[0].country = { countryname: locationdata.body.country_name, country_iso_code: locationdata.body.country_iso_code };
            profileData.locationinfos[0].region = locationdata.body.region_name;
            profileData.locationinfos[0].province = locationdata.body.province_name;
            profileData.locationinfos[0].village = locationdata.body.village_name;
            profileData.locationinfos[0].city = locationdata.body.city_name;
            profileData.locationinfos[0].department = locationdata.body.department_name;

          }
        } catch (err) {
          console.log(err, "erraaaa");

        }
      }

      // findOne({
      //   for_portal_user: portalUserData._id,
      // }).lean();

      const deviceExist = await Otp2fa.findOne({
        uuid,
        for_portal_user: portalUserData._id,
        verified: true,
      }).lean();
      if (!deviceExist || portalUserData.verified !== true) {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            otp_verified: false,
            token: null,
            refreshToken: null,
            user_details: {
              portalUserData,
              profileData,
            },
          },
          message: "OTP verification pending 2fa",
          errorCode: "VERIFICATION_PENDING",
        });
      }
      const tokenClaims = {
        portalUserId: portalUserData._id,
        uuid,
      };
      // createSession(req, portalUserData);

      // const checkForPersonalDetails = await Profile_info.findOne({for_portal_user:portalUserData._id})
      console.log(profileData, "profileData1", portalUserData._id);

      if (profileData?.profile_pic && profileData?.profile_pic != null) {
        let element = profileData?.profile_pic;
        const resData = await getDocument(element);
        profileData.profile_pic = resData;
      } else {
        profileData.profile_pic = "";
      }

      if (profileData?.isInfoCompleted === false) {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            otp_verified: true,
            profileData: profileData,
            portalUserData: portalUserData,
          },
          message: "FILL PERSONAL DETAILS",
          errorCode: "FILL PERSONAL DETAILS",
        });
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: {
          otp_verified: true,
          token: generateToken(tokenClaims),
          refreshToken: generateRefreshToken(tokenClaims),
          user_details: {
            portalUserData,
            profileData,
          },
        },
        message: "patient login done",
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

  async sendEmailOtpFor2fa(req, res) {
    try {
      const { email, userId } = req.body;
      const { uuid } = req.headers;

      const portalUserData = await PortalUser.findOne({ _id: userId, email, }).lean();

      const deviceExist = await Otp2fa.findOne({ uuid, email, for_portal_user: userId, }).lean();
      console.log("deviceExistdeviceExist", deviceExist);
      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "User not found",
          errorCode: "USER_NOT_FOUND",
        });
      }
      console.log("deviceExistdeviceExist", deviceExist && deviceExist.send_attempts >= 500000);

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
        result = await Otp2fa.findOneAndUpdate(
          { uuid, email },
          {
            $set: {
              otp,
              send_attempts: deviceExist.send_attempts + 1,
            },
          }
        ).exec();
      } else {
        const otpData = new Otp2fa({
          email,
          otp,
          uuid,
          for_portal_user: portalUserData._id,
          send_attempts: 1,
        });
        result = await otpData.save();
      }
      return sendResponse(req, res, 200, {
        status: true,
        body: {
          id: result._id,
        },
        message: "Email Sent successfully",
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

    // try {
    //     const { email } = req.body;
    //     let otp = generate6DigitOTP()
    //     let newOtp2fa = new Otp2fa({
    //         email,
    //         otp
    //     });
    //     let html = htmlEmailFor2FAOTP(otp);
    //     let sendEmailStatus = sendEmail(email.toLowerCase(), '2FA OTP', html);
    //     if (sendEmailStatus) {
    //         let savedOtp = await newOtp2fa.save();
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: {
    //                 email,
    //                 otp
    //             },
    //             message: "OTP sent to your email",
    //             errorCode: null,
    //         });
    //     } else {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: "can't sent email",
    //             errorCode: null,
    //         });
    //     }
    // } catch (error) {
    //     sendResponse(req, res, 500, {
    //         status: false,
    //         body: error,
    //         message: "Internal server error",
    //         errorCode: null,
    //     });
    // }
  }

  async sendSmsOtpFor2fa(req, res) {
    try {
      const { mobile, country_code } = req.body;
      const { uuid } = req.headers;
      const portalUserData = await PortalUser.findOne({
        mobile,
        country_code,
      }).lean();
      if (!portalUserData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "user not exist",
          errorCode: "USER_NOT_EXIST",
        });
      }
      const deviceExist = await Otp2fa.findOne({
        mobile,
        country_code,
        uuid,
      }).lean();
      if (deviceExist && deviceExist.send_attempts >= 500000) {
        return sendResponse(req, res, 200, {
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
          result = await Otp2fa.findOneAndUpdate(
            { mobile, country_code, uuid },
            {
              $set: {
                otp,
                send_attempts: deviceExist.send_attempts + 1,
              },
            }
          ).exec();
        } else {
          const otpData = new Otp2fa({
            mobile,
            otp,
            country_code,
            uuid,
            for_portal_user: portalUserData._id,
            send_attempts: 1,
          });
          result = await otpData.save();
        }
        sendResponse(req, res, 200, {
          status: true,
          body: {
            id: result._id,
          },
          message: "otp send successfully",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 500, {
          status: false,
          body: null,
          message: "can't sent sms",
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

  async matchEmailOtpFor2fa(req, res) {
    try {
      const { email, otp, userId } = req.body;


      var ip = req.ip;
      const { uuid, role } = req.headers;

      const data = await Otp2fa.findOne({ uuid, email, for_portal_user: userId, verified: false });

      if (data) {
        const portalUserData = await PortalUser.findOne({
          email: email, _id: userId
        }).lean();
        if (!portalUserData) {
          return sendResponse(req, res, 422, {
            status: false,
            body: null,
            message: "user not exist",
            errorCode: null,
          });
        }
        if (data.otp == otp) {

          const updateVerified = await PortalUser.findOneAndUpdate(
            { _id: portalUserData._id },
            {
              $set: {
                verified: true,
              },
            },
            { new: true }
          ).exec();

          const updateVerifiedUUID = await Otp2fa.findOneAndUpdate(
            { uuid, email, for_portal_user: userId },
            {
              $set: {
                verified: true,
              },
            },
            { new: true }
          ).exec();

          const checkForPersonalDetails = await Profile_info.findOne({
            for_portal_user: portalUserData._id,
          });
          if (checkForPersonalDetails?.profile_pic && checkForPersonalDetails?.profile_pic != null) {
            let element = checkForPersonalDetails?.profile_pic;
            const resData = await getDocument(element);
            checkForPersonalDetails.profile_pic = resData;
          } else {
            checkForPersonalDetails.profile_pic = "";
          }

          if (checkForPersonalDetails?.isInfoCompleted === false) {
            return sendResponse(req, res, 200, {
              status: true,
              body: {
                profileData: checkForPersonalDetails,
                portalUserData: portalUserData,
              },
              message: "OTP matched",
              errorCode: "FILL PERSONAL DETAILS",
            });
          }

          return sendResponse(req, res, 200, {
            status: true,
            body: {
              id: updateVerified._id,
              uuid: updateVerifiedUUID._id,
            },
            message: "OTP matched",
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            message: "OTP not matched",
            errorCode: null,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "OTP expired",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async matchSmsOtpFor2fa(req, res) {
    try {
      const { otp, mobile } = req.body;
      const { uuid } = req.headers;
      const portalUserData = await PortalUser.findOne({
        mobile: mobile,
      }).lean();
      if (!portalUserData) {
        return sendResponse(req, res, 422, {
          status: false,
          body: null,
          message: "user not exist",
          errorCode: null,
        });
      }
      const otpResult = await Otp2fa.findOne({ uuid, mobile, for_portal_user: portalUserData._id, verified: false });
      if (otpResult) {


        if (otpResult.otp == otp) {
          // req.session.ph_verified = true;
          const updateVerified = await PortalUser.findOneAndUpdate(
            { _id: portalUserData._id },
            {
              $set: {
                verified: true,
              },
            },
            { new: true }
          ).exec();
          const updateVerifiedUUID = await Otp2fa.findOneAndUpdate(
            { uuid, mobile },
            {
              $set: {
                verified: true,
              },
            },
            { new: true }
          ).exec();

          const checkForPersonalDetails = await Profile_info.findOne({
            for_portal_user: portalUserData._id,
          });

          if (checkForPersonalDetails?.profile_pic && checkForPersonalDetails?.profile_pic != null) {
            let element = checkForPersonalDetails?.profile_pic;
            const resData = await getDocument(element);
            checkForPersonalDetails.profile_pic = resData;
          } else {
            checkForPersonalDetails.profile_pic = "";
          }

          if (checkForPersonalDetails?.isInfoCompleted === false) {
            return sendResponse(req, res, 200, {
              status: true,
              body: {
                profileData: checkForPersonalDetails,
                portalUserData: portalUserData,
              },
              message: "OTP matched",
              errorCode: "FILL PERSONAL DETAILS",
            });
          }

          return sendResponse(req, res, 200, {
            status: true,
            body: {
              id: updateVerified._id,
              uuid: updateVerifiedUUID._id,
            },
            message: "OTP matched",
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

  async personalDetails(req, res) {
    try {
      const {
        profile_pic,
        patient_id,
        email,
        first_name,
        middle_name,
        last_name,
        gender,
        dob,
        blood_group,
        marital_status,
        emergency_contact,
        address,
        neighborhood,
        country,
        region,
        province,
        department,
        city,
        village,
        pincode,
        country_code,
        mobile,
        mobile_pay_details
      } = req.body;
      console.log("mobile_pay_details>>>>>>>", mobile_pay_details)
      const portalUserData = await PortalUser.findOne({ mobile: mobile }).lean();
      let portal_user_id = "";
      if (patient_id) {
        portal_user_id = patient_id;

        const isExist = await PortalUser.findOne({ mobile: mobile, _id: { $ne: patient_id } });
        if (isExist) {
          return sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Mobile Number Already Exist",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        }

        var checkUpdate = await PortalUser.findOneAndUpdate(
          { _id: { $eq: patient_id } },
          {
            $set: { country_code, mobile, email, full_name: `${first_name} ${last_name}` },
          }
        ).exec();
      }

      // Mobile Pay 
      let dataArray = []
      for (const data of mobile_pay_details) {
        dataArray.push({
          provider: data.provider,
          pay_number: data.pay_number,
          mobile_country_code: data?.mobile_country_code
        })
      }
      let mobilePayResult
      const getMobilePayInfo = await MobilePayInfo.find({ for_portal_user: { $eq: patient_id } }).select('_id').exec();
      if (patient_id && getMobilePayInfo.length > 0) {
        mobilePayResult = await MobilePayInfo.findOneAndUpdate({ for_portal_user: { $eq: patient_id } }, {
          $set: { mobilePay: dataArray }
        }).exec();
      } else {
        const mobilePayData = new MobilePayInfo({
          mobilePay: dataArray,
          for_portal_user: patient_id
        })
        mobilePayResult = await mobilePayData.save()
      }
      const mobile_pay_object_id = mobilePayResult._id

      const findLocation = await Location_info.findOne({
        for_portal_user: patient_id,
      });
      if (!findLocation) {
        const locationDetails = new Location_info({
          address,
          neighborhood,
          country,
          region,
          province,
          department,
          city,
          village,
          pincode,
          for_portal_user: patient_id,
        });
        const locationData = await locationDetails.save();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              full_name: first_name + " " + middle_name + " " + last_name,
              profile_pic,
              isInfoCompleted: true,
              first_name,
              middle_name,
              last_name,
              gender,
              dob,
              blood_group,
              marital_status,
              emergency_contact,
              in_location: locationData._id,
              in_mobile_pay: mobile_pay_object_id
            },
          },
          { new: true }
        ).exec();
      } else {
        const locationData = await Location_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              address,
              neighborhood,
              country,
              region,
              province,
              department,
              city,
              village,
              pincode,
            },
          },
          { new: true }
        ).exec();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              full_name: first_name + " " + middle_name + " " + last_name,
              profile_pic,
              isInfoCompleted: true,
              first_name,
              middle_name,
              last_name,
              gender,
              dob,
              blood_group,
              marital_status,
              emergency_contact,
              in_mobile_pay: mobile_pay_object_id
            },
          },
          { new: true }
        ).exec();
      }

      // const personalDetails = await Profile_info.findOne({
      //   for_portal_user: patient_id,
      // });
      const profileData1 = await Profile_info.aggregate([{
        $match: { for_portal_user: mongoose.Types.ObjectId(patient_id) }
      }, {
        $lookup: {
          from: "locationinfos",
          localField: "in_location",
          foreignField: "_id",
          as: "locationinfos",
        }
      }])

      var profileData = {}
      if (profileData1.length > 0) {
        profileData = profileData1[0]
      }
      if (profileData?.locationinfos.length > 0) {
        try {
          var locationids = {
            country_id: profileData?.locationinfos[0].country,
            region_id: profileData?.locationinfos[0].region,
            province_id: profileData?.locationinfos[0].province,
            village_id: profileData?.locationinfos[0].village,
            city_id: profileData?.locationinfos[0].city,
            department_id: profileData?.locationinfos[0].department,
          }

          const locationdata = await httpService.postStaging(
            "common-api/get-location-name",
            { locationids: locationids },
            {},
            "superadminServiceUrl"
          );
          if (locationdata.status) {
            profileData.locationinfos[0].country = { countryname: locationdata.body.country_name, country_iso_code: locationdata.body.country_iso_code };
            profileData.locationinfos[0].region = locationdata.body.region_name;
            profileData.locationinfos[0].province = locationdata.body.province_name;
            profileData.locationinfos[0].village = locationdata.body.village_name;
            profileData.locationinfos[0].city = locationdata.body.city_name;
            profileData.locationinfos[0].department = locationdata.body.department_name;
          }
        } catch (err) {
          console.log(err, "erraaaa");
        }
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { checkUpdate, profileData },
        message: "successfully created personal details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: { error },
        message: "failed to create  personal details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async insuranceDetails(req, res) {
    try {
      const {
        patient_id,
        primary_subscriber_id,
        secondary_subscriber_ids,
        insurance_id,
        all_subscriber_ids,
        subscriber_id,
      } = req.body;
      const insurance = await Insurance_info.findOne({
        for_portal_user: patient_id,
      });

      if (insurance) {
        const insuranceData = await Insurance_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              primary_subscriber_id,
              secondary_subscriber_ids,
              insurance_id,
              all_subscriber_ids,
              subscriber_id,
            },
          },
          { new: true }
        ).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: { insuranceData },
          message: "insurance details updated successfully",
          errorCode: null,
        });
      } else {
        const insuranceDetails = new Insurance_info({
          primary_subscriber_id,
          secondary_subscriber_ids,
          insurance_id,
          all_subscriber_ids,
          for_portal_user: patient_id,
          subscriber_id,
        });
        const insuranceData = await insuranceDetails.save();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              in_insurance: insuranceData._id,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: { insuranceData },
          message: "insurance details added successfully",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: { error },
        message: "failed to saved insurance details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  // async addVitals(req, res) {
  //   try {
  //     const {
  //       patient_id,
  //       height,
  //       weight,
  //       h_rate,
  //       bmi,
  //       bp,
  //       pulse,
  //       resp,
  //       temp,
  //       blood_group,
  //       clearance,
  //       hepatics_summary,
  //       doctor_id,
  //     } = req.body;
  //     if (doctor_id === undefined) {
  //       if (patient_id) {
  //         // If patient_id is present, update the existing record
  //         const filter = { for_portal_user: patient_id };
  //         const update = {
  //           height,
  //           weight,
  //           h_rate,
  //           bmi,
  //           bp,
  //           pulse,
  //           resp,
  //           temp,
  //           blood_group,
  //           clearance,
  //           hepatics_summary,
  //           added_by: "patient",
  //         };

  //         const vitalData = await Vital_info.findOneAndUpdate(filter, update, {
  //           new: true,
  //           upsert: true,
  //         });

  //         sendResponse(req, res, 200, {
  //           status: true,
  //           body: vitalData,
  //           message: "Vital details updated successfully",
  //           errorCode: null,
  //         });
  //       } else {
  //         const vitalDetails = new Vital_info({
  //           height,
  //           weight,
  //           h_rate,
  //           bmi,
  //           bp,
  //           pulse,
  //           resp,
  //           temp,
  //           blood_group,
  //           clearance,
  //           hepatics_summary,
  //           added_by: "patient",
  //           for_portal_user: patient_id,
  //         });

  //         const vitalData = await vitalDetails.save();

  //         sendResponse(req, res, 200, {
  //           status: true,
  //           body: vitalData,
  //           message: "Vital details added successfully saved",
  //           errorCode: null,
  //         });
  //       }
  //     } else {
  //       const vitalDetails = new Vital_info({
  //         height,
  //         weight,
  //         h_rate,
  //         bmi,
  //         bp,
  //         pulse,
  //         resp,
  //         temp,
  //         blood_group,
  //         clearance,
  //         hepatics_summary,
  //         added_by: "doctor",
  //         added_by_doctor: doctor_id,
  //         for_portal_user: patient_id,
  //       });
  //       const vitalData = await vitalDetails.save();
  //       sendResponse(req, res, 200, {
  //         status: true,
  //         body: vitalData,
  //         message: "vital details added successfully saved",
  //         errorCode: null,
  //       });
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: null,
  //       message: "failed to saved vital details",
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }
  async addVitals(req, res) {
    try {
      const {
        patient_id,
        height,
        weight,
        h_rate,
        bmi,
        bp,
        pulse,
        resp,
        temp,
        blood_group,
        clearance,
        hepatics_summary,
        doctor_id,
      } = req.body;
      if (doctor_id === undefined) {
        const vitalDetails = new Vital_info({
          height,
          weight,
          h_rate,
          bmi,
          bp,
          pulse,
          resp,
          temp,
          blood_group,
          clearance,
          hepatics_summary,
          added_by: "patient",
          for_portal_user: patient_id,
        });
        const vitalData = await vitalDetails.save();
        sendResponse(req, res, 200, {
          status: true,
          body: vitalData,
          message: "vital details added successfully saved",
          errorCode: null,
        });
      } else {
        const vitalDetails = new Vital_info({
          height,
          weight,
          h_rate,
          bmi,
          bp,
          pulse,
          resp,
          temp,
          blood_group,
          clearance,
          hepatics_summary,
          added_by: "doctor",
          added_by_doctor: doctor_id,
          for_portal_user: patient_id,
        });
        const vitalData = await vitalDetails.save();
        sendResponse(req, res, 200, {
          status: true,
          body: vitalData,
          message: "vital details added successfully saved",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to saved vital details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async medicineDetails(req, res) {
    try {
      const { patient_id, current_medicines, past_medicines } = req.body;
      const medicine = await Medicine_info.findOne({
        for_portal_user: patient_id,
      });
      if (medicine) {
        const medicineData = await Medicine_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              current_medicines,
              past_medicines,
            },
          },
          { new: true }
        ).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            medicineData,
          },
          message: "medicine details updated successfully",
          errorCode: null,
        });
      } else {
        const medicineDetails = new Medicine_info({
          current_medicines,
          past_medicines,
          for_portal_user: patient_id,
        });
        const medicineData = await medicineDetails.save();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              in_medicine: medicineData._id,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: {
            medicineData,
          },
          message: "medicine details added successfully",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: { error },
        message: "failed to added medicine details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async immunizationDetails(req, res) {
    try {
      const { patient_id, immunization, doctor_id } = req.body;
      if (patient_id || !patient_id) {
        if (doctor_id === undefined) {
          let insert_List = [];
          const list = immunization.map(async (singleData) => {
            if (!singleData._id && singleData._id == "") {
              delete singleData._id;
              insert_List.push({
                ...singleData,
                added_by: "patient",
                added_by_id: patient_id,
                for_portal_user: patient_id,
              });
            } else {
              let existingData = singleData._id;
              delete singleData._id;
              await Immunization_info.findOneAndUpdate(
                { _id: existingData },
                {
                  $set: {
                    ...singleData,
                  },
                }
              );
            }
          });

          const result = await Immunization_info.insertMany(insert_List);

          const resultAll = await Immunization_info.find({
            for_portal_user: mongoose.Types.ObjectId(patient_id),
          });

          return sendResponse(req, res, 200, {
            status: true,
            body: resultAll,
            message: "immunization details added successfully",
            errorCode: null,
          });
        }
        else {
          let reqData = [];
          const list = immunization.map(async (singleData) => {
            if (!singleData._id && singleData._id == "") {
              delete singleData._id;
              reqData.push({
                ...singleData,
                added_by: "doctor",
                added_by_id: doctor_id,
                for_portal_user: patient_id,
              });
            }
          })
          const result = await Immunization_info.insertMany(reqData);
          return sendResponse(req, res, 200, {
            status: true,
            body: result,
            message: "immunization details added successfully",
            errorCode: null,
          });
        }
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: { error },
        message: "failed to add immunization details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async editImmunization(req, res) {
    try {
      const { patient_id, immunization, doctor_id } = req.body;
      if (patient_id || !patient_id) {
        if (doctor_id === undefined) {
          // if doctor_id not exist
          console.log("immunization._id", immunization._id);
          const immunizationDetails = await Immunization_info.findOne({
            added_by: "patient",
            added_by_id: patient_id,
            for_portal_user: patient_id,
            _id: immunization._id

          });
          const result = await Immunization_info.findOneAndUpdate(
            { _id: immunizationDetails._id },
            {
              $set: {
                name: immunization.name,
                manufactured_name: immunization.manufactured_name,
                medical_centre: immunization.medical_centre,
                batch_number: immunization.batch_number,
                next_immunization_appointment: immunization.next_immunization_appointment,
                administered_date: immunization.administered_date,
                route_of_administered: immunization.route_of_administered,
                hcp_provided_immunization: immunization.hcp_provided_immunization,
                allow_to_export: immunization.allow_to_export
              },
            },
            { new: true }
          ).exec();
          sendResponse(req, res, 200, {
            status: true,
            body: result,
            message: "Immunization details updated successfully.",
            errorCode: null,
          });
        } else {
          // if doctor_id exist
          const immunizationDetails = await Immunization_info.findOne({
            added_by: "doctor",
            added_by_id: doctor_id,
            for_portal_user: patient_id,
            _id: immunization._id
          });
          const result = await Immunization_info.updateOne(
            { _id: immunizationDetails._id },
            {
              $set: {
                name: immunization.name,
                manufactured_name: immunization.manufactured_name,
                medical_centre: immunization.medical_centre,
                batch_number: immunization.batch_number,
                next_immunization_appointment: immunization.next_immunization_appointment,
                administered_date: immunization.administered_date,
                route_of_administered: immunization.route_of_administered,
                hcp_provided_immunization: immunization.hcp_provided_immunization,
                allow_to_export: immunization.allow_to_export
              },
            },
            { new: true }
          );
          sendResponse(req, res, 200, {
            status: true,
            body: result,
            message: "Immunization details updated successfully.",
            errorCode: null,
          });
        }
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: { error },
        message: "failed to update immunization details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteImmunization(req, res) {
    try {
      const { immunization_id, paitent_id } = req.body;
      const patientIdIsExist = await Immunization_info.findOne({
        for_portal_user: paitent_id,
      });

      if (patientIdIsExist) {
        const result = await Immunization_info.deleteOne({
          _id: mongoose.Types.ObjectId(immunization_id),
        });

        if (result.deletedCount > 0) {
          sendResponse(req, res, 200, {
            status: true,
            message: "Immunization successfully deleted",
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            message: "Immunization not found for deletion",
            errorCode: "NOT_FOUND",
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Patient not exist, Immunization not found for deletion",
          errorCode: "NOT_FOUND",
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to delete immunization",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async historyDetails(req, res) {
    try {
      const {
        patient_id,
        patient_history,
        allergies,
        lifestyle,
        familial_history,
      } = req.body;
      const history = await History_info.findOne({
        for_portal_user: patient_id,
      });
      if (history) {
        const historyData = await History_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              patient_history,
              allergies,
              lifestyle,
              familial_history,
            },
          },
          { new: true }
        ).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: historyData,
          message: "History details updated successfully",
          errorCode: null,
        });
      } else {
        const history_info_Details = new History_info({
          patient_history,
          allergies,
          lifestyle,
          familial_history,
          for_portal_user: patient_id,
        });
        const historyData = await history_info_Details.save();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              in_history: historyData._id,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: historyData,
          message: "history details added successfully",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to add history details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async medicalDocument(req, res) {
    try {
      const { patient_id, doctor_id, medical_document } = req.body;
      const list = medical_document.map((singleData) => ({
        ...singleData,
        for_portal_user: patient_id,
      }));
      var savedDocs = await Medical_document.insertMany(list);
      if (doctor_id !== undefined) {
        const data = await ProfilePermission.find({
          doctor_id: { $eq: doctor_id },
          patient_id: { $eq: patient_id },
        }).select({ permission: 1, _id: 0 });
        let medical_documents = [];
        if (data.length > 0) {
          medical_document = data[0].permission.medical_documents;
        }

        if (savedDocs.length > 0) {
          var newDocsIds = savedDocs.map((singleDoc) => {
            let docId = singleDoc._id.toString();
            medical_documents.push(docId);
          });
        }
        let personalDetails;
        const checkExist = await ProfilePermission.find({
          doctor_id: { $eq: doctor_id },
          patient_id: { $eq: patient_id },
        });
        if (checkExist.length > 0) {
          await ProfilePermission.findOneAndUpdate(
            { patient_id, doctor_id },
            {
              $set: {
                "permission.medical_documents": medical_documents,
              },
            },
            { new: true }
          ).exec();
        } else {
          let permission = {
            "medical_documents": medical_documents,
            "appointment": [],
            "vital": false,
            "history": {

              "patient_history": [],
              "alergy": [],
              "lifestyle": [],
              "family_history": []

            },
            "immunization": false,
            "medicine": {
              "current_medicine": false,
              "past_medicine": false
            }
          }
          const data = new ProfilePermission({
            doctor_id,
            patient_id,
            permission,
          });
          personalDetails = await data.save();
        }

      }
      if (savedDocs.length > 0) {
        for (let index = 0; index < savedDocs.length; index++) {
          const element = savedDocs[index];
          if (element.image != null) {
            const resData = await getDocument(element.image);
            element.image_signed_url = resData;
          } else {
            element.image_signed_url = "";
          }
        }
      }
      sendResponse(req, res, 200, {
        status: true,
        body: savedDocs,
        message: "medical document  details added successfully ",
        errorCode: null,
      });
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: error.message
          ? error.message
          : "failed to add Medical document details ",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async familyDetails(req, res) {
    try {
      const { patient_id, family_members, medical_history, social_history } =
        req.body;
      console.log("req.body;", req.body);
      const family = await Family_info.findOne({ for_portal_user: patient_id });
      if (family) {
        const familyData = await Family_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              family_members,
              medical_history,
              social_history,
            },
          },
          { new: true }
        ).exec();
        return sendResponse(req, res, 200, {
          status: true,
          body: familyData,
          message: "Family details updated successfully",
          errorCode: null,
        });
      } else {
        const familyDetails = new Family_info({
          family_members,
          medical_history,
          social_history,
          for_portal_user: patient_id,
        });
        const familyData = await familyDetails.save();
        const personalDetails = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              in_family: familyData._id,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: familyData,
          message: "Family details added successfully",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("WWWW", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to create patient profile",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async profileDetails(req, res) {
    try {
      const { patient_id, insurance_no, subscriber_id } = req.query;
      console.log(req.query, "req.query");
      var profileData = await Profile_info.findOne({
        for_portal_user: patient_id,
      })
        .populate({
          path: "for_portal_user",
          select: { password: 0 },
        })
        .populate({
          path: "in_location",
        })
        .populate({
          path: "in_insurance",
        })
        .populate({
          path: "in_vital",
        })
        .populate({
          path: "in_medicine",
        })
        .populate({
          path: "in_immunization",
        })
        .populate({
          path: "in_history",
        })
        .populate({
          path: "in_medical_document",
        })
        .populate({
          path: "in_family",
        })
        .exec();

      //Get all details related to insurance health plan
      console.log("profileData------", profileData);
      var decryptData = "";
      if (subscriber_id != null && subscriber_id != "null") {
        console.log("Iffffff");
        console.log(subscriber_id, "dsfsdf");
        const verifyInsurance = await httpService.get(
          "insurance-subscriber/get-plan-service-by-subscriber",
          { subscriber_id: subscriber_id },
          {},
          "insuranceServiceUrl"
        );
        if (verifyInsurance) {
          decryptData = JSON.parse(decryptionData(verifyInsurance)).body;
        }
        // decryptData = verifyInsurance.body;

        console.log("verifyInsuranceverifyInsurance", verifyInsurance);
        console.log(decryptData, "decryptData");

      }
      var profilePicKey = profileData.profile_pic;
      console.log(profilePicKey);
      if (profilePicKey != "" && profilePicKey != undefined) {
        const headers = {
          Authorization: req.headers["authorization"],
        };
        const profilePictureArray = [profilePicKey];
        const profile_picdata = await httpService.postStaging(
          "pharmacy/get-signed-url",
          { url: profilePictureArray },
          headers,
          "pharmacyServiceUrl"
        );
        profileData.profile_pic = profile_picdata.data[0];
      }
      sendResponse(req, res, 200, {
        status: true,
        body: {
          profileData,
          health_plan_details: decryptData,
        },
        message: "Patient profile details",
        errorCode: null,
      });
    } catch (error) {
      console.log("error===", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to get patient profile details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadDocument(req, res) {
    try {
      const { userId, docType, multiple } = req.body;
      let result = null;
      if (multiple == "true") {
        let tempResult = [];
        req.files.docName.forEach((doc) => {
          let s3result = uploadFile(doc.data, {
            Bucket: "healthcare-crm-stage-docs",
            Key: `pharmacy/${userId}/${docType}/${doc.name}`,
          });
          tempResult.push(s3result);
        });
        result = await Promise.all(tempResult);
      } else {
        // console.log(req.files.docName.name);
        // return
        result = await uploadFile(req.files.docName.data, {
          Bucket: "healthcare-crm-stage-docs",
          Key: `pharmacy/${userId}/${docType}/${req.files.docName.name}`,
        });
      }
      sendResponse(req, res, 200, {
        status: true,
        data: multiple == "true" ? result : [result],
        message: `file uploaded successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to upload file`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async commonAPI(req, res) {
    try {
      const headers = {
        Authorization: req.headers["authorization"],
      };
      const gender = [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
      ];
      const martialStatus = [
        { label: "Married", value: "Married" },
        { label: "Single", value: "Single" },
        { label: "Divorced", value: "Divorced" },
        { label: "widow/widower", value: "widow/widower" },
      ];
      const bloodGroup = [
        { label: "A+", value: "A+" },
        { label: "A-", value: "A-" },
        { label: "B+", value: "B+" },
        { label: "B-", value: "B-" },
        { label: "AB+", value: "AB+" },
        { label: "AB-", value: "AB-" },
        { label: "O+", value: "O+" },
        { label: "O-", value: "O-" },
      ];
      const country = [
        { label: "France", value: "+33" },
        { label: "India", value: "+91" },
      ];
      const relationship = [
        { label: "Father", value: "Father" },
        { label: "Mother", value: "Mother" },
        { label: "Brother", value: "Brother" },
        { label: "Sister", value: "Sister" },
        { label: "Wife", value: "Wife" },
        { label: "Husband", value: "Husband" },
        { label: "Friend", value: "Friend" },
        { label: "Son", value: "Son" },
        { label: "Daughter", value: "Daughter" },
      ];

      const languageList = await httpService.getStaging(
        "common-api/common-language",
        {},
        headers,
        "superadminServiceUrl"
      );
      const spokenLanguage = [
        ...languageList.body.list.map((item) => ({
          label: item.language,
          value: item.language,
        })),
      ];
      sendResponse(req, res, 200, {
        status: true,
        body: {
          gender,
          martialStatus,
          bloodGroup,
          country,
          relationship,
          spokenLanguage,
        },
        message: `Static API`,
        errorCode: null,
      });
    } catch (err) {
      console.log("Suyesh", err);
      sendResponse(req, res, 500, {
        status: false,
        body: err,
        message: `failed to upload file`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async changePassword(req, res) {
    const { id, old_password, new_password } = req.body;
    if (old_password === new_password) {
      return sendResponse(req, res, 200, {
        status: false,
        body: null,
        message: "New password shouldn't be same as old password.",
        errorCode: "PASSWORD_MATCHED",
      });
    }
    try {
      const findUser = await PortalUser.findOne({ _id: id });
      const isPasswordOldMatch = await checkPassword(old_password, findUser);
      if (!isPasswordOldMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Incorrect Old Password.",
          errorCode: null,
        });
      }
      const isPasswordMatch = await checkPassword(new_password, findUser);
      if (isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "This is Previous password. Enter New Password.",
          errorCode: null,
        });
      }

      const salt = await bcrypt.genSalt(10);
      let hashPassword = await bcrypt.hash(new_password, salt);
      let changedPassword = await PortalUser.findOneAndUpdate(
        { _id: id },
        { password: hashPassword },
        { new: true }
      );
      sendResponse(req, res, 200, {
        status: true,
        body: changedPassword,
        message: "Successfully change password.",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "Failed to change password.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      let userData = await PortalUser.findOne({ email });
      if (!userData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "user not found",
          errorCode: null,
        });
      }
      let resetToken = crypto.randomBytes(32).toString("hex");
      const hashResetToken = await generateTenSaltHash(resetToken);

      let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({
        user_id: userData._id,
      });
      if (ForgotPasswordTokenData) {
        await ForgotPasswordTokenData.deleteOne();
      }

      let ForgotPasswordData = new ForgotPasswordToken({
        user_id: userData._id,
        token: hashResetToken,
      });
      let savedForgotPasswordData = await ForgotPasswordData.save();
      // let html = htmlForgetPassword(resetToken, userData._id)
      const content = forgotPasswordEmail(
        email.toLowerCase(),
        resetToken,
        userData._id
      );
      // let sendEmailStatus = sendSmtpEmail(email.toLowerCase(), 'Forgot password reset link', html);
      let sendEmailStatus = await sendEmail(content);
      console.log("sendEmailStatus", sendEmailStatus);
      if (sendEmailStatus) {
        sendResponse(req, res, 200, {
          status: true,
          body: {
            user_id: userData._id,
            resetToken,
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
    try {
      const { user_id, resetToken, newPassword } = req.body;

      let ForgotPasswordTokenData = await ForgotPasswordToken.findOne({
        user_id,
      });

      if (!ForgotPasswordTokenData) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Token has expired",
          errorCode: null,
        });
      }
      const isPasswordMatch = await bcryptCompare(
        resetToken,
        ForgotPasswordTokenData.token
      );
      if (!isPasswordMatch) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Token not match",
          errorCode: null,
        });
      }

      const passCheck = await PortalUser.findOne({ _id: user_id });

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
        );
        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "New password set successfully",
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error, "err==============");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async getPaymentDetails(req, res) {
    try {
      const { patient_id, order_id } = req.query;

      const result = await PaymentHistory.find({
        order_id,
        for_user: { $eq: patient_id },
      });

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully retrieved payment details",
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

  async getAllPatient(req, res) {
    try {
      const allPatient1 = await PortalUser.find({ lock_user: false, isDeleted: false, isActive: true, verified: true })

      const portalUserIds = allPatient1.map(user => user._id);


      const allPatient = await Profile_info.find(
        { for_portal_user: { $in: portalUserIds } },
        {
          full_name: 1,
          first_name: 1,
          middle_name: 1,
          last_name: 1,
          gender: 1,
          dob: 1,
          for_portal_user: 1,
          _id: 0,
        }
      ).populate({
        path: "for_portal_user",
      });

      sendResponse(req, res, 200, {
        status: true,
        body: allPatient,
        message: "All patient list",
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

  async staticImmunizationList(req, res) {
    try {
      const allImmunization = await Immunization_list.find({ delete_status: false, active_status: true });
      sendResponse(req, res, 200, {
        status: true,
        body: allImmunization,
        message: "All immunization",
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

  async staticAllergiesList(req, res) {
    try {
      const allAllergies = await Allergies_list.find({});
      sendResponse(req, res, 200, {
        status: true,
        body: allAllergies,
        message: "All allergies",
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

  async staticPatientHistoryTypeList(req, res) {
    try {
      const list = await PatientHistoryTypeList.find({});
      sendResponse(req, res, 200, {
        status: true,
        body: list,
        message: "All patient history type list",
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

  async staticPatientLifestyleTypeList(req, res) {
    try {
      const list = await LifestyleTypeList.find({});
      sendResponse(req, res, 200, {
        status: true,
        body: list,
        message: "All patient lifestyle type list",
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
  async staticFamilyHistoryTypeList(req, res) {
    try {
      const list = await FamilyHistoryTypeList.find({});
      sendResponse(req, res, 200, {
        status: true,
        body: list,
        message: "All family history type list",
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
  async patientFullDetails(req, res) {
    const { patient_id, doctor_id } = req.query;
    console.log("req.", req.query);
    try {
      if (doctor_id === undefined) {
        //if doctor_id key not exit
        const result = await PortalUser.aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId(patient_id),
            },
          },
          {
            $lookup: {
              from: "profileinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "profileinfos",
            },
          },
          { $unwind: "$profileinfos" },
          {
            $lookup: {
              from: "locationinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "locationinfos",
            },
          },
          // { $unwind: "$locationinfos" },
          {
            $unwind: {
              path: "$locationinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "insuranceinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "insuranceinfos",
            },
          },
          // { $unwind: "$insuranceinfos" },
          {
            $unwind: {
              path: "$insuranceinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "vitalinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "vitalinfos",
            },
          },
          {
            $lookup: {
              from: "medicalinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "medicalinfos",
            },
          },
          // { $unwind: "$medicalinfos" },
          {
            $unwind: {
              path: "$medicalinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "immunizationinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "immunizationinfos",
            },
          },
          // { $unwind: "$immunizationinfos" },
          // { $unwind: { path: "$immunizationinfos", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "historyinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "historyinfos",
            },
          },
          // { $unwind: "$historyinfos" },
          {
            $unwind: {
              path: "$historyinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "mobilepays",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "mobilepayinfos",
            },
          },
          {
            $unwind: {
              path: "$mobilepayinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "familyinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "familyinfos",
            },
          },
          // { $unwind: "$familyinfos" },
          {
            $unwind: { path: "$familyinfos", preserveNullAndEmptyArrays: true },
          },
          {
            $lookup: {
              from: "medicaldocuments",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "medicaldocuments",
            },
          },
          // { $unwind: { path: "$medicaldocuments", preserveNullAndEmptyArrays: true } },
          // { $unwind: "$medicaldocuments" },
          {
            $addFields: {
              "portalUserDetails._id": "$_id",
              "portalUserDetails.email": "$email",
              "portalUserDetails.userId": "$userId",
              "portalUserDetails.country_code": "$country_code",
              "portalUserDetails.mobile": "$mobile",
              "portalUserDetails.role": "$role",
              "portalUserDetails.lock_user": "$lock_user",
              "portalUserDetails.verified": "$verified",
              "portalUserDetails.ipAddress": "$ipAddress",
              "portalUserDetails.last_update": "$last_update",
              "portalUserDetails.createdAt": "$createdAt",
              "portalUserDetails.updatedAt": "$updatedAt",
              "portalUserDetails.notification": "$notification",
              personalDetails: "$profileinfos",
              locationDetails: "$locationinfos",
              insuranceDetails: "$insuranceinfos",
              vitalsDetails: "$vitalinfos",
              medicineDetails: "$medicalinfos",
              immunizationDetails: "$immunizationinfos",
              historyDetails: "$historyinfos",
              familyDetails: "$familyinfos",
              medicalDocument: "$medicaldocuments",
              mobilePayDetails: "$mobilepayinfos"
            },
          },
          {
            $unset: [
              "_id",
              "email",
              "userId",
              "country_code",
              "mobile",
              "role",
              "lock_user",
              "verified",
              "ipAddress",
              "last_update",
              "createdAt",
              "updatedAt",
              "password",
              "notification",
              "__v",
              "profileinfos",
              "locationinfos",
              "insuranceinfos",
              "vitalinfos",
              "medicalinfos",
              "immunizationinfos",
              "historyinfos",
              "familyinfos",
              "medicaldocuments",
              "mobilepayinfos"
            ],
          },
        ]);
        // console.log(result[0], "check reult 00000");
        if (result[0]?.medicalDocument) {
          if (result[0].medicalDocument.length > 0) {
            for (
              let index = 0;
              index < result[0].medicalDocument.length;
              index++
            ) {
              const element = result[0].medicalDocument[index];
              if (element.image != null) {
                const resData = await getDocument(element.image);
                element.image_signed_url = resData;
              } else {
                element.image_signed_url = "";
              }
            }
          }
        }

        if (result[0]?.personalDetails?.profile_pic != null && result[0]?.personalDetails?.profile_pic != "") {
          let element = result[0]?.personalDetails?.profile_pic;
          const resData = await getDocument(element);
          result[0].personalDetails.profile_pic_signed_url = resData;
        } else {
          const resData = "";
          result[0].personalDetails.profile_pic_signed_url = resData;
        }

        sendResponse(req, res, 200, {
          status: true,
          body: result[0],
          message: "Successfully get patient profile",
          errorCode: null,
        });
      } else {
        //if doctor_id key exit
        const patientPermission = await ProfilePermission.findOne({
          patient_id,
          doctor_id,
        });
        // if (!patientPermission) {
        //     return sendResponse(req, res, 200, {
        //         status: true,
        //         body: null,
        //         message: "No permission",
        //         errorCode: null,
        //     });
        // }
        if (patientPermission?.permission?.vital == false) {
          var vitalPermission = {
            $set: {
              vitalinfos: [],
            },
          };
        } else {
          vitalPermission = {
            $lookup: {
              from: "vitalinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "vitalinfos",
            },
          };
        }
        if (patientPermission?.permission?.immunization == false) {
          var immunizationPermission = {
            $set: {
              immunizationinfos: [],
            },
          };
        } else {
          immunizationPermission = {
            $lookup: {
              from: "immunizationinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "immunizationinfos",
            },
          };
        }

        console.log("patientPermission?.permission____________", patientPermission);
        if (patientPermission?.permission?.immunization == false) {
          var immunizationPermission = {
            $set: {
              immunizationinfos: [],
            },
          };
        } else {
          immunizationPermission = {
            $lookup: {
              from: "immunizationinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "immunizationinfos",
            },
          };
        }

        const result = await PortalUser.aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId(patient_id),
            },
          },
          {
            $lookup: {
              from: "profileinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "profileinfos",
            },
          },
          { $unwind: "$profileinfos" },
          {
            $lookup: {
              from: "locationinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "locationinfos",
            },
          },

          {
            $unwind: {
              path: "$locationinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "insuranceinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "insuranceinfos",
            },
          },
          {
            $unwind: {
              path: "$insuranceinfos",
              preserveNullAndEmptyArrays: true,
            },
          },

          vitalPermission,
          {
            $lookup: {
              from: "medicalinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "medicalinfos",
            },
          },
          {
            $unwind: {
              path: "$medicalinfos",
              preserveNullAndEmptyArrays: true,
            },
          },

          immunizationPermission,

          {
            $lookup: {
              from: "historyinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "historyinfos",
            },
          },

          {
            $unwind: {
              path: "$historyinfos",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "familyinfos",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "familyinfos",
            },
          },

          {
            $unwind: { path: "$familyinfos", preserveNullAndEmptyArrays: true },
          },
          {
            $lookup: {
              from: "medicaldocuments",
              localField: "_id",
              foreignField: "for_portal_user",
              as: "medicaldocuments",
            },
          },

          {
            $addFields: {
              "portalUserDetails._id": "$_id",
              "portalUserDetails.email": "$email",
              "portalUserDetails.userId": "$userId",
              "portalUserDetails.country_code": "$country_code",
              "portalUserDetails.mobile": "$mobile",
              "portalUserDetails.role": "$role",
              "portalUserDetails.lock_user": "$lock_user",
              "portalUserDetails.verified": "$verified",
              "portalUserDetails.ipAddress": "$ipAddress",
              "portalUserDetails.last_update": "$last_update",
              "portalUserDetails.createdAt": "$createdAt",
              "portalUserDetails.updatedAt": "$updatedAt",
              personalDetails: "$profileinfos",
              locationDetails: "$locationinfos",
              insuranceDetails: "$insuranceinfos",
              vitalsDetails: "$vitalinfos",
              medicineDetails: "$medicalinfos",
              immunizationDetails: "$immunizationinfos",
              historyDetails: "$historyinfos",
              familyDetails: "$familyinfos",
              medicalDocument: "$medicaldocuments",
              currentMedicinePermission: false,
              pastMedicinePermission: false,
              vitalPermission: false,
              immunizationPermission: false,
            },
          },
          {
            $unset: [
              "_id",
              "email",
              "userId",
              "country_code",
              "mobile",
              "role",
              "lock_user",
              "verified",
              "ipAddress",
              "last_update",
              "createdAt",
              "updatedAt",
              "password",
              "__v",
              "profileinfos",
              "locationinfos",
              "insuranceinfos",
              "vitalinfos",
              "medicalinfos",
              "immunizationinfos",
              "historyinfos",
              "familyinfos",
              "medicaldocuments",
            ],
          },
        ]);

        if (patientPermission?.permission?.medicine?.current_medicine == true) {

          result[0].currentMedicinePermission = true;
          // result[0].medicineDetails.current_medicines;
        }
        if (patientPermission?.permission?.medicine?.past_medicine == true) {
          result[0].pastMedicinePermission = true;
          // result[0].medicineDetails.past_medicines;
        }
        if (patientPermission?.permission?.vital == true) {
          result[0].vitalPermission = true;
        }
        if (patientPermission?.permission?.immunization == true) {
          result[0].immunizationPermission = true;
        }

        if (result[0]?.historyDetails?.allergies) {
          result[0].historyDetails.allergies = await permissionBasedResult(
            patientPermission?.permission?.history?.alergy,
            result[0]?.historyDetails?.allergies
          );
        }
        if (result[0]?.historyDetails?.patient_history) {
          result[0].historyDetails.patient_history =
            await permissionBasedResult(
              patientPermission?.permission?.history?.patient_history,
              result[0]?.historyDetails?.patient_history
            );
        }
        if (result[0]?.historyDetails?.familial_history) {
          result[0].historyDetails.familial_history =
            await permissionBasedResult(
              patientPermission?.permission?.history?.family_history,
              result[0]?.historyDetails?.familial_history
            );
        }
        if (result[0]?.historyDetails?.lifestyle) {
          result[0].historyDetails.lifestyle = await permissionBasedResult(
            patientPermission?.permission?.history?.lifestyle,
            result[0]?.historyDetails?.lifestyle
          );
        }
        console.log("MEDICINE___________", result[0]?.medicalDocument);

        if (result[0]?.medicalDocument) {
          result[0].medicalDocument = await permissionBasedResult(
            patientPermission?.permission?.medical_documents,
            result[0]?.medicalDocument
          );
        }

        if (result[0]?.medicalDocument) {
          if (result[0]?.medicalDocument.length > 0) {
            for (
              let index = 0;
              index < result[0].medicalDocument.length;
              index++
            ) {
              const element = result[0].medicalDocument[index];
              if (element?.image != null) {
                const resData = await getDocument(element.image);
                element.image_signed_url = resData;
              } else {
                element.image_signed_url = "";
              }
            }
          }
        }
        sendResponse(req, res, 200, {
          status: true,
          body: result[0],
          message: "Successfully get patient profile",
          errorCode: null,
        });
      }
      return;
    } catch (error) {
      console.log("NARUTO--->", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async patientPersonalDetails(req, res) {
    const { patient_id } = req.query;
    try {
      const result = await PortalUser.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(patient_id),
          },
        },
        {
          $lookup: {
            from: "profileinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "profileinfos",
          },
        },
        { $unwind: "$profileinfos" },
        {
          $lookup: {
            from: "locationinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "locationinfos",
          },
        },
        {
          $unwind: { path: "$locationinfos", preserveNullAndEmptyArrays: true },
        },
        {
          $addFields: {
            "portalUserDetails._id": "$_id",
            "portalUserDetails.email": "$email",
            "portalUserDetails.userId": "$userId",
            "portalUserDetails.country_code": "$country_code",
            "portalUserDetails.mobile": "$mobile",
            "portalUserDetails.role": "$role",
            "portalUserDetails.lock_user": "$lock_user",
            "portalUserDetails.verified": "$verified",
            "portalUserDetails.ipAddress": "$ipAddress",
            "portalUserDetails.last_update": "$last_update",
            "portalUserDetails.createdAt": "$createdAt",
            "portalUserDetails.updatedAt": "$updatedAt",
            personalDetails: "$profileinfos",
          },
        },
        {
          $unset: [
            "_id",
            "email",
            "userId",
            "country_code",
            "mobile",
            "role",
            "lock_user",
            "verified",
            "ipAddress",
            "last_update",
            "createdAt",
            "updatedAt",
            "password",
            "__v",
            "profileinfos",
          ],
        },
      ]);

      if (result[0]?.personalDetails?.profile_pic != null && result[0]?.personalDetails?.profile_pic != '') {
        let element = result[0]?.personalDetails?.profile_pic;
        const resData = await getDocument(element);
        result[0].personalDetails.profile_pic_signed_url = resData;
      } else {
        result[0].personalDetails.profile_pic_signed_url = "";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result[0],
        message: "Successfully get patient personal details",
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

  async patientCommonDetails(req, res) {
    const { patientId } = req.query;
    try {
      const result = await PortalUser.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(patientId),
          },
        },
        {
          $lookup: {
            from: "profileinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "profileinfos",
          },
        },
        { $unwind: "$profileinfos" },
        {
          $lookup: {
            from: "insuranceinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "insuranceinfos",
          },
        },
        { $unwind: { path: "$insuranceinfos", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "locationinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "locationinfos",
          },
        },
        { $unwind: "$locationinfos" },
        {
          $addFields: {
            image: "$profileinfos.profile_pic",
            fullName: "$profileinfos.full_name",
            dob: "$profileinfos.dob",
            gender: "$profileinfos.gender",
            address: "$locationinfos.address",
            insuranceNumber: "$insuranceinfos.primary_insured.insurance_id",
          },
        },
        {
          $project: {
            _id: 1,
            email: 1,
            mobile: 1,
            fullName: 1,
            dob: 1,
            gender: 1,
            address: 1,
            insuranceNumber: 1,
            image: 1
          },
        },
      ]);
      if (result[0]?.image != "" && result[0]?.image != undefined) {
        const headers = {
          Authorization: req.headers["authorization"],
        };
        const profilePictureArray = [result[0].image];
        const profile_picdata = await httpService.postStaging(
          "pharmacy/get-signed-url",
          { url: profilePictureArray },
          headers,
          "pharmacyServiceUrl"
        );
        result[0].image = profile_picdata.data[0];
      }
      sendResponse(req, res, 200, {
        status: true,
        body: result[0],
        message: "Successfully get patient profile",
        errorCode: null,
      });
    } catch (error) {
      console.log("error-------------", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async getDependentFamilyMembers(req, res) {
    const { patientId } = req.query;
    try {
      const result = await PortalUser.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(patientId),
          },
        },
        {
          $lookup: {
            from: "familyinfos",
            localField: "_id",
            foreignField: "for_portal_user",
            as: "familyinfos",
          },
        },
        { $unwind: { path: "$familyinfos", preserveNullAndEmptyArrays: true } },
      ]);

      // console.log("RESULT===>", result);

      sendResponse(req, res, 200, {
        status: true,
        body: result[0],
        message: "Successfully get patient dependent family members",
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

  async getDocument(req, res) {
    try {
      const { url } = req.body;
      const result = [];
      for (const s_url of url) {
        const resultData = await getFile({
          Bucket: "healthcare-crm-stage-docs",
          Key: s_url,
          Expires: 60 * 5,
        });
        result.push(resultData);
      }
      sendResponse(req, res, 200, {
        status: true,
        data: result,
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
  async getPatientDetailsById(req, res) {
    try {
      const { ids } = req.body;
      let idArray = [];
      for (const id of ids) {
        idArray.push(mongoose.Types.ObjectId(id));
      }
      const data = await Profile_info.find({
        for_portal_user: { $in: idArray },
      }).select({
        first_name: 1,
        last_name: 1,
        for_portal_user: 1,
        profile_pic: 1,
        _id: 0,
      });
      let profileObject = {};
      for (const patientData of data) {

        if (
          patientData.profile_pic != "" &&
          patientData.profile_pic != undefined || null
        ) {
          const profilePictureArray = [patientData.profile_pic];
          const headers = {
            Authorization: req.headers["authorization"],
          };
          const profile_picdata = await httpService.postStaging(
            "pharmacy/get-signed-url",
            { url: profilePictureArray },
            headers,
            "pharmacyServiceUrl"
          );
          //console.log("PROFILE PIC----", profile_picdata);
          patientData.profile_pic = profile_picdata.data[0];
        }
        profileObject[patientData.for_portal_user] = {
          full_name: `${patientData.first_name} ${patientData.last_name} `,

          profile_pic: patientData.profile_pic,
        };
      }
      sendResponse(req, res, 200, {
        status: true,
        data: profileObject,
        message: `fetched details successfullsssy`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allergyReactionList(req, res) {
    try {
      const result = await Allergy_reaction.find({});
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `fetched details successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async patientExistingDocs(req, res) {
    const { patientId } = req.query;
    try {
      const result = await Medical_document.find({
        for_portal_user: patientId,
      });
      for (let index = 0; index < result.length; index++) {
        const element = result[index];
        let signedUrl = await getDocument(element.image);
        element.image_signed_url = signedUrl;
      }
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Successfully fetched all documents`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched documents`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async subscribersListForPatient(req, res) {
    const { patientId } = req.query;
    try {
      const result = await Insurance_info.findOne(
        { for_portal_user: patientId },
        { all_subscriber_ids: 1 }
      );
      // for (let index = 0; index < result.medical_document.length; index++) {
      //     const element = result.medical_document[index];
      //     let signedUrl = await getDocument(element.image)
      //     element.image_signed_url = signedUrl
      // }
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Successfully fetched all subscribers`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched subscribers`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async patientAddByDoctor(req, res) {
    const {
      patient_id,
      email,
      country_code,
      mobile,
      password,
      first_name,
      middle_name,
      last_name,
      gender,
      dob,
      blood_group,
      marital_status,
      emergency_contact,
      address,
      neighborhood,
      country,
      region,
      province,
      department,
      city,
      village,
      pincode,
      added_by_doctor,
    } = req.body;
    console.log("patientAddByDoctor", req.body);
    try {
      let passwordHash;
      if (password != null) {
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
        console.log("passwordHash", passwordHash);
      }

      if (patient_id == "") {
        const portalUser = await PortalUser.findOne({ mobile, country_code });
        if (portalUser) {
          return sendResponse(req, res, 200, {
            status: false,
            data: null,
            message: `Patient already exist`,
            errorCode: null,
          });
        }
        var sequenceDocument = await Counter.findOneAndUpdate(
          { _id: "countid" },
          { $inc: { sequence_value: 1 } },
          { new: true }
        );
        let portalUserDetails = new PortalUser({
          email,
          userId: sequenceDocument.sequence_value,
          password: passwordHash,
          country_code,
          mobile,
        });
        let portalUserData = await portalUserDetails.save();
        const locationDetails = new Location_info({
          address,
          neighborhood,
          country,
          region,
          province,
          department,
          city,
          village,
          pincode,
          for_portal_user: portalUserData._id,
        });
        const locationData = await locationDetails.save();
        let profile = new Profile_info({
          full_name: first_name + " " + middle_name + " " + last_name,
          first_name,
          middle_name,
          last_name,
          gender,
          dob,
          blood_group,
          marital_status,
          emergency_contact,
          for_portal_user: portalUserData._id,
          added_by_doctor,
          in_location: locationData._id,
        });
        console.log("64f6f9ffb3b3627dfb1749e2", profile);
        let profileData = await profile.save();
        sendResponse(req, res, 200, {
          status: true,
          data: {
            portalUserData,
            locationData,
            profileData,
          },
          message: `Successfully added patient`,
          errorCode: null,
        });
      } else {
        const portalUserData = await PortalUser.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              email,
              password: passwordHash,
            },
          },
          { new: true }
        );
        const locationData = await Location_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              address,
              neighborhood,
              country,
              region,
              province,
              department,
              city,
              village,
              pincode,
            },
          },
          { new: true }
        ).exec();
        const profileData = await Profile_info.findOneAndUpdate(
          { for_portal_user: patient_id },
          {
            $set: {
              full_name: first_name + " " + middle_name + " " + last_name,
              first_name,
              middle_name,
              last_name,
              gender,
              dob,
              blood_group,
              marital_status,
              emergency_contact,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          data: {
            portalUserData,
            locationData,
            profileData,
          },
          message: `Successfully updated patient`,
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `Failed to fetched.`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getPatientDetailsBasedOnRequest(req, res) {
    try {
      const { ids } = req.body;
      let idArray = [];
      for (const id of ids) {
        idArray.push(mongoose.Types.ObjectId(id));
      }
      const data = await Profile_info.find({
        for_portal_user: { $in: idArray },
      }).select({
        full_name: 1,
        for_portal_user: 1,
        _id: 0,
      });

      let profileObject = {};
      for (const patientData of data) {
        profileObject[patientData.for_portal_user] = patientData.full_name;
      }
      sendResponse(req, res, 200, {
        status: true,
        data: profileObject,
        message: `fetched details successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getPatientDocumentsById(req, res) {
    try {
      const { ids } = req.body;
      console.log("req.body___________", req.body);
      const idArray = ids.map((val) => mongoose.Types.ObjectId(val.doc_id));
      console.log(idArray, "idArray");
      let dataArray = [];
      if (idArray.length > 0) {
        const getDocuments = await Medical_document.find({
          _id: { $in: idArray },
        });
        for (const doc of getDocuments) {
          let image = await getDocument(doc.image);
          doc.image_signed_url = image;
          dataArray.push(doc);
        }
      }
      sendResponse(req, res, 200, {
        status: true,
        data: dataArray,
        message: `fetched details successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async patientProfileSignedUrl(req, res) {
    const { patientId } = req.query;
    try {
      var result;
      var profile_signed_url;

      result = await Profile_info.findOne(
        { for_portal_user: patientId },
        { profile_pic: 1 }
      );

      if (result?.profile_pic != "") {
        let image = await getDocument(result?.profile_pic);
        profile_signed_url = image;
      }

      let obj = {
        ...result?._doc,
        profile_signed_url,
      };

      sendResponse(req, res, 200, {
        status: true,
        body: obj,
        message: `fetched profile signed url`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to fetched details`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllPatientAddedByDoctor(req, res) {
    const { doctorId, limit, page, searchText } = req.query;   
    const headers = {
      Authorization: req.headers["authorization"],
    };

    var sort = req.query.sort
    var sortingarray = {};
    if (sort != 'undefined' && sort != '' && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray['createdAt'] = -1;
    }

    var filter = {
      added_by_doctor: Array.isArray(doctorId) ?
        { $in: doctorId.map(id => mongoose.Types.ObjectId(id)) } :
        mongoose.Types.ObjectId(doctorId),

      isDeleted: false,
    };
    if (searchText != "") {
      filter = {
        added_by_doctor: Array.isArray(doctorId) ?
        { $in: doctorId.map(id => mongoose.Types.ObjectId(id)) } :
        mongoose.Types.ObjectId(doctorId),
        isDeleted: false,
        full_name: { $regex: searchText || "", $options: "i" },
      };
    }


    const query = [
      {
        $lookup: {
          from: "portalusers",
          localField: "for_portal_user",
          foreignField: "_id",
          as: "portalusers",
        },
      },
      { $unwind: "$portalusers" },
      {
        $addFields: {
          isDeleted: "$portalusers.isDeleted",
        },
      },
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "locationinfos",
          localField: "for_portal_user",
          foreignField: "for_portal_user",
          as: "locationinfos",
        },
      },
      { $unwind: "$locationinfos" },
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }

    ];
   
    try {
      const allPatient = await Profile_info.aggregate(query);

      const count = await Profile_info.aggregate([
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "portalusers",
          },
        },
        { $unwind: "$portalusers" },
        {
          $addFields: {
            isDeleted: "$portalusers.isDeleted",
          },
        },
        {
          $match: {
            added_by_doctor: Array.isArray(doctorId) ?
              { $in: doctorId.map(id => mongoose.Types.ObjectId(id)) } :
              mongoose.Types.ObjectId(doctorId)
            ,
            isDeleted: false,
          }
        },
      ]);
      const listAppointment = await httpService.getStaging(
        "hospital-doctor/list-appointment",
        {
          doctor_portal_id: doctorId,
          page: 1,
          limit: 100,
          consultation_type: "ALL",
          status: "TODAY",
          date: new Date(),
        },
        headers,
        "hospitalServiceUrl"
      );
      const allAppointment = listAppointment.data.data;
      var formatArray = [];
      if (allAppointment.length > 0) {
        const allAppointmentPatientIdArray = [];
        allAppointment.map((singleData) => {
          allAppointmentPatientIdArray.push(singleData.patient_id);
        });
        let uniquePatientId = [...new Set(allAppointmentPatientIdArray)];
        var appointmentPatientDetails = await Profile_info.find({
          for_portal_user: { $in: uniquePatientId },
        })
          .populate({
            path: "for_portal_user",
          })
          .populate({
            path: "in_location",
          });
        appointmentPatientDetails.map((singleData) => {
          var formatObj = {
            ...singleData._doc,
            portalusers: singleData.for_portal_user,
            locationinfos: singleData.in_location,
          };
          delete formatObj.for_portal_user;
          delete formatObj.in_location;
          formatArray.push(formatObj);
        });
      }
      console.log("formatArray.length", formatArray);
      Array.prototype.push.apply(allPatient, formatArray);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          count: count.length,
          allPatient,
        },
        message: "All patient list",
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

  async getAllPatientForSuperAdmin(req, res) {
    try {
      const {
        limit,
        page,
        searchText,
        createdDate,
        updatedDate,
        insuranceStatus,
      } = req.query;
      console.log("eq.query>>>>>>", req.query)
      const headers = {
        Authorization: req.headers["authorization"],
      };

      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;

      }

      var filter = {
        isDeleted: false,
      };
      var filterhasInsurance = {};
      if (insuranceStatus != "") {
        filterhasInsurance.hasInsurance = insuranceStatus;
      }

      if (searchText != "") {
        filter = {
          isDeleted: false,
          $or: [
            { first_name: { $regex: searchText || "", $options: "i" } },
            { last_name: { $regex: searchText || "", $options: "i" } },
            { email: { $regex: searchText || "", $options: "i" } },
          ],
        };
      }
      var dateFilter = {};
      if (
        createdDate &&
        createdDate !== "" &&
        updatedDate &&
        updatedDate !== ""
      ) {
        const createdDateObj = new Date(createdDate);
        const updatedDateObj = new Date(updatedDate);

        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      } else if (createdDate && createdDate !== "") {
        const createdDateObj = new Date(createdDate);
        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj };
      } else if (updatedDate && updatedDate !== "") {
        const updatedDateObj = new Date(updatedDate);
        dateFilter.createdAt = { $lte: updatedDateObj };
      }
      let condition = {};
      if (req.query.status != "all") {
        condition = {
          ...(req.query.status === "true" && {
            isActive: true,
          }),
          ...(req.query.status === "false" && {
            isActive: false,
          }),
        };
      }
      console.log(condition, "condition");
      const query = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "portalusers",
          },
        },
        { $unwind: "$portalusers" },
        {
          $addFields: {
            isDeleted: "$portalusers.isDeleted",
            email: "$portalusers.email",
            isActive: "$portalusers.isActive",
          },
        },
        {
          $match: {
            ...filter,
            ...dateFilter,
            ...condition,
          },
        },
        {
          $lookup: {
            from: "locationinfos",
            localField: "for_portal_user",
            foreignField: "for_portal_user",
            as: "locationinfos",
          },
        },

        {
          $unwind: {
            path: "$locationinfos",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "insuranceinfos",
            localField: "for_portal_user",
            foreignField: "for_portal_user",
            as: "insuranceInfo",
          },
        },

        // {
        //     $unwind: {
        //         path: "$insuranceInfo",
        //         preserveNullAndEmptyArrays: true
        //     }
        // },
        // {
        //     $project: {
        //       _id: 0,
        //     //   insuranceInfo: { $ifNull: [ { $arrayElemAt: ["$insuranceInfo", 0] }, {} ] }
        //     }
        //   },
        {
          $addFields: {
            hasInsurance: {
              $cond: {
                if: {
                  $or: [
                    // { insuranceInfo: { $exists: true } }
                    { $eq: ["$insuranceInfo", ""] },
                    { $not: { $gt: [{ $size: "$insuranceInfo" }, 0] } },
                  ],
                },
                then: "true",
                else: "false",
              },
            },

            // { insuranceInfo: { $exists: true } }
          },
        },
        {
          $match: filterhasInsurance,
        },

        {
          $unwind: {
            path: "$insuranceInfo",
            preserveNullAndEmptyArrays: true,
          },
        },

        // {
        //     $addFields: {
        //         insuranceInfo: {
        //             $cond: {
        //                 if: { $eq: ["$insuranceInfo", null] },
        //                 then: { $cond: { if: { $eq: [{ $type: "$insuranceInfo" }, "array"] }, then: [], else: {} } },
        //                 else: "$insuranceInfo"
        //             }
        //         }
        //     }
        // },
        // {
        //     $addFields: {
        //         hasInsurance: { $ne: ["$insuranceInfo", null] }
        //     }
        // },
        // {
        //     $match: filter
        // },

        { $sort: sortingarray },
      ];

      const allPatient = await Profile_info.aggregate(query);
      // console.log(allPatient,"allPatient11111111111111");
      if (limit != 0) {
        query.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 });
      }

      const allPatientwithLimit = await Profile_info.aggregate(query);

      const insurancePromises = allPatientwithLimit.map(async (ele) => {
        let insurance_id = ele?.insuranceInfo?.insurance_id;
        if (insurance_id !== "" && insurance_id) {
          let insuranceDetail = await httpService.getStaging(
            "insurance/get-insurance-details",
            { id: insurance_id },
            headers,
            "insuranceServiceUrl"
          );

          let companyName = insuranceDetail?.body?.company_name;
          return companyName;
        }
        return "";
      });

      const insuranceResults = await Promise.all(insurancePromises);

      insuranceResults.forEach((companyName, i) => {
        allPatientwithLimit[i].companyName = companyName;
      });

      const count = allPatient.length;

      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,

          totalRecords: count,
          result: allPatientwithLimit,
        },
        message: "All patient list",
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

  async patientAction(req, res) {
    try {
      const { patientId, action_name, action_value } = req.body;
      console.log("req body->", req.body);
      let filter = {};
      let updateOtpData = {};
      if (action_name == "active") filter["isActive"] = action_value;
      if (action_name == "lock") filter["lock_user"] = action_value;
      if (action_name == "delete") filter["isDeleted"] = action_value;
      const random15DigitNumber = await generateRandom15DigitNumber();
      if (filter.isDeleted === true) {
        filter = {
          ...filter,
          mobile: random15DigitNumber,
          email: random15DigitNumber,
        }
        console.log("filter", filter);

        var updatedPatientDetails = await PortalUser.updateOne(
          { _id: new mongoose.Types.ObjectId(patientId) },
          filter,
          { new: true }
        );
        console.log("updatedPatientDetails-->", updatedPatientDetails);

        updateOtpData = {
          mobile: random15DigitNumber,
          email: random15DigitNumber,
          uuid: random15DigitNumber
        }
        console.log("updateOtpData", updateOtpData);

        var updatedOtp = await Otp2fa.updateMany(
          { for_portal_user: new mongoose.Types.ObjectId(patientId) },
          updateOtpData,
          { new: true }
        );
        console.log("updatedOtp-->", updatedOtp);


        if (updatedPatientDetails && updatedOtp) {
          sendResponse(req, res, 200, {
            status: true,
            body: updatedPatientDetails,
            message: `Update Successfully.`,
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Failed to delete.",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: `Update Successfully.`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal Server Error.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deletePatientDocs(req, res) {
    try {
      const { patientId, documentId } = req.body;
      var deleteDoc = await Medical_document.deleteOne({
        for_portal_user: patientId,
        _id: documentId,
      });
      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: `successfully deleted`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to fetch hospital staff list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async notification(req, res) {
    try {
      // const notificationValue = new Notification(req.body);
      // const notificationData = await notificationValue.save();
      console.log("ressssssssssssss", req.body)
      const userData = await PortalUser.findOne({ _id: req.body.for_portal_user });

      console.log("userData---------", userData)
      let notificationData;
      let navigationlink;
      if (userData?.notification) {
        const notificationValue = new Notification(req.body);
        notificationData = await notificationValue.save();

        if (req.body.notitype == "New Appointment" || req.body.notitype == "Appointment" || req.body.notitype == "Cancel Appointment" || req.body.notitype == "Reshedule Appointment" || req.body.notitype == "Appointment Approved" || req.body.notitype == "Appointment Rejected" || req.body.notitype =="Appointment Reminder") {
          if (req.body.created_by_type == 'doctor') {
            navigationlink = `patient/myappointment/newappointment?appointmentId=${req.body.appointmentId}`
          } else {
            navigationlink = `patient/myappointment/newappointment?appointmentId=${req.body.appointmentId}&portal_type${userData?.type}`
          }
        } else if (req.body.notitype == "Insurance Verified" || req.body.notitype == "Amount Send") {
          if (req.body.created_by_type === 'pharmacy') {
            navigationlink = `patient/presciptionorder/neworder?orderId=${req.body.appointmentId}&pharmacyId${req.body.created_by}`
          } else {
            navigationlink = `patient/details-order-request?orderId=${req.body.appointmentId}&portal_id${req.body.created_by}&portal_type=${userData?.type}`
          }
        } else if (req.body.notitype == "New Result Uploaded") {
          navigationlink = `patient/complete-order-request?orderId=${req.body.appointmentId}&portal_id${req.body.created_by}&portal_type=${userData?.type}`
        } else if (req.body.notitype == "Appointment Reminder") {
          navigationlink = `patient/waitingroom/calender?appointmentId=${req.body.appointmentId}`
        }

        const content = AppointmentInvitation(userData?.email, userData?.full_name, req.body.content, req.body.appointmentId, req.body.notitype, req.body.notitype, navigationlink);
        const mailSent = await sendEmail(content);
        console.log("mailSent_____________", mailSent)
        const checkEprescriptionNumberExist11 = await httpService.getStaging("pharmacy/sendnoti", { socketuserid: req.body.for_portal_user }, {}, "gatewayServiceUrl");

        if (userData?.fcmToken) {
          await sendNotification(
            req.body.content,
            req.body.notitype,
            userData?.fcmToken,
            userData?._id
          );
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: notificationData,
        message: `notification save`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get reason for appointment list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async setProfilePermission(req, res) {
    try {
      const { doctor_id, patient_id, permission } = req.body;

      const checkExist = await ProfilePermission.find({
        doctor_id: { $eq: doctor_id },
        patient_id: { $eq: patient_id },
      });
      let personalDetails;
      if (checkExist.length > 0) {
        personalDetails = await ProfilePermission.findOneAndUpdate(
          { doctor_id: { $eq: doctor_id }, patient_id: { $eq: patient_id } },
          {
            $set: {
              permission,
            },
          },
          { new: true }
        ).exec();
      } else {
        const data = new ProfilePermission({
          doctor_id,
          patient_id,
          permission,
        });
        personalDetails = await data.save();
      }

      sendResponse(req, res, 200, {
        status: true,
        body: personalDetails,
        message: `permissions saved successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `failed to set permissions`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getProfilePermission(req, res) {
    try {
      const { doctor_id, patient_id } = req.query;

      const data = await ProfilePermission.find({
        doctor_id: { $eq: doctor_id },
        patient_id: { $eq: patient_id },
      }).select({ permission: 1, _id: 0 });
      sendResponse(req, res, 200, {
        status: true,
        body: data,
        message: `permissions fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `failed to get permissions`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addMedicineOnWaitingRoom(req, res) {
    const { patient_id, current_medicines } = req.body;
    try {
      const medicineData = await Medicine_info.findOneAndUpdate(
        { for_portal_user: patient_id },
        {
          $set: {
            current_medicines,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: {
          medicineData,
        },
        message: "medicine details updated successfully",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message
          ? error.message
          : `failed to update medicine details `,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editMedicineOnWaitingRoom(req, res) {
    const { patient_id, medicine, medicine_id } = req.body;
    try {
      const medicineData = await Medicine_info.findOneAndUpdate(
        { for_portal_user: patient_id, "current_medicines._id": medicine_id },
        {
          $set: {
            "current_medicines.$": medicine,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: {
          medicineData,
        },
        message: "medicine details updated successfully",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message
          ? error.message
          : `failed to update medicine details `,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async patientMedicalDetailsBySubscriberIdForClaimDetails(req, res) {
    const { subscriber_id } = req.query;
    try {
      const allSubscribers = await Insurance_info.find({
        all_subscriber_ids: { $elemMatch: { subscriber_id } },
      });
      console.log(allSubscribers, "allSubscribers");
      var current_medicines;
      // if (patientExist) {
      //     current_medicines = await Medicine_info.findOne({ for_portal_user: patientExist.for_portal_user }, { current_medicines :1})
      // } else {
      //     current_medicines = null
      // }
      sendResponse(req, res, 200, {
        status: true,
        body: {
          current_medicines,
        },
        message: "medicine details get successfully",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message
          ? error.message
          : `failed to get medicine details `,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getAllRatingReviewByGivenByPatient(req, res) {
    const { patientId } = req.query;
    const headers = {
      Authorization: req.headers["authorization"],
    };
    try {
      var sort = req.query.sort
      var keynew = '';
      var value = '';
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        keynew = sort.split(":")[0];
        value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray['createdAt'] = -1;

      }
      const hospitalData = await httpService.getStaging(
        "patient/get-rating-review-by-patient",
        { patientId },
        headers,
        "hospitalServiceUrl"
      );

      const pharmacyData = await httpService.getStaging(
        "pharmacy/get-review-and-rating-by-patient",
        { patientId },
        headers,
        "pharmacyServiceUrl"
      );

      let finalArray = [...hospitalData?.data, ...pharmacyData?.data];

      if (keynew == 'date') {
        if (value == 'asc') {
          finalArray.sort((a, b) => new Date(a.date) - new Date(b.date));

        } else {
          finalArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        }
      }

      if (keynew == 'name') {
        if (value == 'asc') {
          finalArray.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
          });

        } else {
          finalArray.sort((a, b) => {
            if (a.name > b.name) return -1;
            if (a.name < b.name) return 1;
            return 0;
          });
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: finalArray,
        message: "rating & reviews fetched successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log("error====", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message
          ? error.message
          : `failed to fetched rating & reviews `,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getPurchasedPlanByPatient(req, res) {
    const { patientId, page, limit, } = req.query;


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

      const totalCount = await purchasestatus.countDocuments({ for_user: patientId });
      const purchasedPlan = await purchasestatus.find({ for_user: patientId , order_type:'subscription' }).sort(sortingarray)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      sendResponse(req, res, 200, {
        status: true,
        body: {
          currentPage: page,
          totalRecords: totalCount,
          purchasedPlan,
        },
        // body: purchasedPlan,
        message: "Fetched purchased Plans by patient",
        errorCode: null,
      });
    } catch (error) {
      // console.log("errorerrorerror", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message
          ? error.message
          : `failed to fetched purchased plan`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async SearchAnyPortaluserBySearchKeyword(req, res) {
    const { searchKey, lat, long } = req.query;
    console.log("req.query__________--", req.query);
    try {
      const headers = {
        Authorization: req.headers["authorization"],
      };
      const pharmacydata = await httpService.postStaging(
        "pharmacy/advance-search-pharmacy-list",
        {
          pharmacy_name: searchKey,
          city: "",
          province: "",
          department: "",
          neighborhood: "",
          onDutyStatus: "",
          openingHoursStatus: "",
          long: long,
          lat: lat,
          limit: 10,
          page: 1,
          rating: "",
          medicinesOrder: "",
          medicinePrice: "",
          medicineAvailability: "",
          spokenLang: "",
          healthcare-crmPartner: "",
          insuranceAccpted: "",
          currentTimeStamp: "2023-04-11T05:07:34.645Z",
        },
        headers,
        "pharmacyServiceUrl"
      );
      console.log(pharmacydata);

      const searchlist = pharmacydata.data.result.map((singleData) => ({
        _id: singleData._id,
        name: singleData.pharmacy_name,
        portal_type: "Pharmacy",
        type: "pharmacy",
      }));

      pharmacydata.data.result = searchlist;

      const doctordata = await httpService.postStaging(
        "hospital-doctor/advance-doctor-filter",
        {

          searchText: searchKey,
          city: "",
          neighborhood: "",
          insuranceAccepted: "",
          long: long,
          lat: lat,
          province: "",
          department: "",
          consultationFeeStart: 0,
          consultationFeeEnd: "",
          consultationFeeSort: "",
          appointmentType: [],
          doctorAvailability: "",
          ratingSort: "",
          doctorYearOfExperienceSort: "",
          doctorGender: [],
          onDutyDoctor: "",
          openNow: "",
          spokenLanguage: "",
          page: 1,
          limit: 10,
          currentTimeStamp: ""
        },
        headers,
        "hospitalServiceUrl"
      );
      console.log(doctordata);

      doctordata.data.result.map((singleData) =>
        pharmacydata.data.result.push({
          _id: singleData._id,
          name: singleData.doctorFullName,
          portal_type: "Doctor",
          type: "doctor",
        })
      );

      const hospitaldata = await httpService.postStaging(
        "hospital/advance-hospital-filter",
        {
          searchText: searchKey,
          city: "",
          neighborhood: "",
          long: long,
          lat: lat,
          province: "",
          department: "",
          currentTimeStamp: "",
          consultationFeeStart: 0,
          consultationFeeEnd: "",
          consultationFee: "",
          appointmentType: [],
          rating: "",
          experience: "",
          Opne24Hour: "",
          hospitalType: [],
          doctorGender: [],
          spokenLanguage: "",
          healthcare-crmPartner: "",
          insuranceAccpted: "",
          openNow: "",
          onDutyHospital: "",
          isAvailableDate: "",
          page: 1,
          limit: 10
        },
        headers,
        "hospitalServiceUrl"
      );
      console.log(hospitaldata);

      hospitaldata.data.result.map((singleData) =>
        pharmacydata.data.result.push({
          _id: singleData._id,
          name: singleData.hospitalName,
          portal_type: "Hospital",
          type: "hospital",
        })
      );


      const fourPortalData = await httpService.postStaging(
        "labimagingdentaloptical/four-portal-management-advFilters",
        {
          long: long,
          lat: lat,
          searchText: searchKey,
          province: "",
          department: "",
          city: "",
          neighborhood: "",
          insuranceAccepted: "",
          consultationFeeSort: "",
          ratingSort: "",
          portalYearOfExperienceSort: "",
          portalGender: [],
          spokenLanguage: "",
          appointmentType: [],
          onDutyPortal: "",
          openNow: "",
          portalAvailability: "",
          consultationFeeStart: 0,
          consultationFeeEnd: "",
          currentTimeStamp: "",
          page: 1,
          limit: 10,
          type: "",


        },
        headers,
        "labimagingdentalopticalServiceUrl"
      );

      fourPortalData.data.result.map((singleData) =>
        pharmacydata.data.result.push({
          _id: singleData._id,
          name: singleData.portal_full_name,
          portal_type: singleData.portal_type,
          type: "fourPortal",
        })
      );

      sendResponse(req, res, 200, {
        status: true,
        data: pharmacydata,
        message: `Successfully fetched user list`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error____________", error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async vitalsList(req, res) {
    const { patientId } = req.query;
    console.log("req.query===>", req.query);
    try {
      const listdata = await Vital_info.find({
        for_portal_user: patientId,
      }).sort({ createdAt: -1 });
      // console.log("listdata==>",listdata)

      sendResponse(req, res, 200, {
        status: true,
        data: listdata,
        message: `Successfully fetched user list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async sendInvitation(req, res) {
    try {
      const {
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        address,
        created_By,
        verify_status,
        portalmessage,
        portalname,
        invitationId,
        dateofcreation
      } = req.body;
      console.log(req.body.invitationId, "invitationIddddddd")
      if (invitationId) {
        console.log("run1")
        const updatedUserData = await Invitation.findOneAndUpdate(
          { _id: invitationId },
          {
            $set: {
              first_name,
              middle_name,
              last_name,
              email,
              phone,
              address,
              created_By,
              verify_status: "PENDING"
            }
          },
          { new: true }
        );

        if (updatedUserData) {
          console.log("run2")
          const loggedInData = await ProfileInfo.find({
            for_portal_user: created_By,
          });
          const loggeInname = loggedInData[0].full_name;
          const content = sendMailInvitations(
            email,
            first_name,
            last_name,
            loggeInname,
            portalmessage,
            portalname
          );

          const mailSent = await sendEmail(content);

          if (mailSent) {
            console.log("run3")
            updatedUserData.verify_status = "SEND";
            const result = await updatedUserData.save();
          }
          sendResponse(req, res, 200, {
            status: true,
            data: updatedUserData,
            message: `Invitation Send successfully`,
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 404, {
            status: false,
            data: null,
            message: `Invitation with ID ${invitationId} not found`,
            errorCode: "NOT_FOUND",
          });
        }
      } else {
        console.log("run4")
        let userData = await Invitation.findOne({
          email,
          verify_status: "PENDING",
        });

        if (!userData) {
          console.log("run5")
          userData = new Invitation({
            first_name,
            middle_name,
            last_name,
            email,
            phone,
            address,
            created_By,
            dateofcreation,
            verify_status: "PENDING",
          });
          userData = await userData.save();
        }

        const loggedInData = await ProfileInfo.find({
          for_portal_user: created_By,
        });
        const loggeInname = loggedInData[0].full_name;
        const content = sendMailInvitations(
          email,
          first_name,
          last_name,
          loggeInname,
          portalmessage,
          portalname
        );

        const mailSent = await sendEmail(content);

        if (mailSent) {
          console.log("run6")
          userData.verify_status = "SEND";
          const result = await userData.save();
        }

        if (userData) {
          console.log("run7")
          sendResponse(req, res, 200, {
            status: true,
            data: userData,
            message: `Invitation Send successfully`,
            errorCode: null,
          });
        } else {
          sendResponse(req, res, 200, {
            status: false,
            data: null,
            message: `Invitation Not Sent`,
            errorCode: null,
          });
        }
      }
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  // async sendInvitation(req, res) {
  //   try {
  //     const {
  //       first_name,
  //       middle_name,
  //       last_name,
  //       email,
  //       phone,
  //       address,
  //       created_By,
  //       verify_status,
  //       portalmessage,
  //       portalname
  //     } = req.body;

  //     let userData = await Invitation.findOne({
  //       email,
  //       verify_status: "PENDING",
  //     });

  //     if (!userData) {
  //       userData = new Invitation({
  //         first_name,
  //         middle_name,
  //         last_name,
  //         email,
  //         phone,
  //         address,
  //         created_By,
  //         verify_status: "PENDING",
  //       });
  //       userData = await userData.save();
  //     }

  //     const loggedInData = await ProfileInfo.find({
  //       for_portal_user: req.body.created_By,
  //     });
  //     const loggeInname = loggedInData[0].full_name;
  //     const content = sendMailInvitations(
  //       email,
  //       first_name,
  //       last_name,
  //       loggeInname,
  //       portalmessage,
  //       portalname
  //     );

  //     const mailSent = await sendEmail(content);

  //     if (mailSent) {
  //       userData.verify_status = "SEND";
  //       const result = await userData.save();
  //     }

  //     if (userData) {
  //       console.log("run");
  //       sendResponse(req, res, 200, {
  //         status: true,
  //         data: userData,
  //         message: `Invitation Send successfully`,
  //         errorCode: null,
  //       });
  //     } else {
  //       sendResponse(req, res, 200, {
  //         status: false,
  //         data: null,
  //         message: `Invitation Send successfully`,
  //         errorCode: null,
  //       });
  //     }
  //   } catch (err) {
  //     console.log(err);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       data: err,
  //       message: `failed to fetched list`,
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  async getAllInvitation(req, res) {
    try {
      const {
        for_portal_user,
        page,
        limit,
        searchKey,
        createdDate,
        updatedDate,
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


      const filter = {};
      // const filterDate = {};

      if (searchKey && searchKey !== "") {
        filter.$or = [{ first_name: { $regex: searchKey } }];
      }

      var dateFilter = {};
      if (
        createdDate &&
        createdDate !== "" &&
        updatedDate &&
        updatedDate !== ""
      ) {
        const createdDateObj = new Date(createdDate);
        const updatedDateObj = new Date(updatedDate);
        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      } else if (createdDate && createdDate !== "") {
        const createdDateObj = new Date(createdDate);
        // dateFilter.createdAt = createdDateObj.toISOString();
        dateFilter.createdAt = { $gte: createdDateObj };
      } else if (updatedDate && updatedDate !== "") {
        const updatedDateObj = new Date(updatedDate);
        dateFilter.createdAt = { $lte: updatedDateObj };
      }

      const listdata = await Invitation.find({
        created_By: for_portal_user,
        ...filter,
        ...dateFilter,
      })
        .sort(sortingarray)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Invitation.countDocuments({});

      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalRecords: count,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteInvitation(req, res) {
    try {
      const { id } = req.body;
      const result = await Invitation.deleteOne({ _id: mongoose.Types.ObjectId(id) })

      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Invitation Deleted successfully`,
        errorCode: null,
      })

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getInvitationById(req, res) {
    try {
      const { id } = req.query;
      const result = await Invitation.findOne({
        _id: mongoose.Types.ObjectId(id),
      });

      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `Invitation Send successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addImmunization_SuperAdmin(req, res) {
    try {
      const { immunizationArray, added_by } = req.body;
      const list = immunizationArray.map((singleData) => ({
        ...singleData,
        added_by,
      }));
      const namesToFind = list.map((item) => item.name);
      const foundItems = await ImmunizationList.find({
        name: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.name);
      if (foundItems.length == 0) {
        const savedImmunization = await ImmunizationList.insertMany(list);
        sendResponse(req, res, 200, {
          status: true,
          body: savedImmunization,
          message: "Successfully add ImmunizationList",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: `${CheckData} Already Exist`,
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add ImmunizationList",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allImmunizationList(req, res) {
    try {
      const { limit, page, searchText } = req.query;
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray["createdAt"] = -1;

      }
      var filter = { delete_status: false };
      if (searchText != "") {
        filter = {
          delete_status: false,
          name: { $regex: searchText || "", $options: "i" },
        };
      }
      const immunizationlist = await ImmunizationList.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await ImmunizationList.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: immunizationlist,
        },
        message: "Successfully get ImmunizationList list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get ImmunizationList list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateImmunization(req, res) {
    try {
      const { immunizationId, name, active_status, delete_status } = req.body;
      const list = await ImmunizationList.find({ name: name, active_status: active_status, _id: { $ne: mongoose.Types.ObjectId(immunizationId) }, is_deleted: false });
      if (list.length == 0) {
        const updateImmunization = await ImmunizationList.updateOne(
          { _id: immunizationId },
          {
            $set: {
              name,
              active_status,
              delete_status,
            },
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: updateImmunization,
          message: "Successfully updated Immunization",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Immunization already exist",
          errorCode: null,
        });
      }

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update Immunization`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnImmunization(req, res) {
    try {
      const { immunizationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active_status"] = action_value;
      if (action_name == "delete") filter["delete_status"] = action_value;

      if (action_name == "active") {
        var result = await ImmunizationList.updateOne(
          { _id: immunizationId },
          filter,
          { new: true }
        ).exec();

        message =
          action_value == true
            ? "Successfully Active Immunization"
            : "Successfully In-active Immunization";
      }

      if (action_name == "delete") {
        if (immunizationId == "") {
          await ImmunizationList.updateMany(
            { delete_status: { $eq: false } },
            {
              $set: { delete_status: true },
            },
            { new: true }
          );
        } else {
          await ImmunizationList.updateMany(
            { _id: { $in: immunizationId } },
            {
              $set: { delete_status: true },
            },
            { new: true }
          );
        }
        message = "Successfully Immunization deleted";
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
        message: `failed to Immunization done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allImmunizationListforexport(req, res) {
    const { searchText, limit, page } = req.query;
    var filter;
    if (searchText == "") {
      filter = {
        delete_status: false,
      };
    } else {
      filter = {
        delete_status: false,
        name: { $regex: searchText || "", $options: "i" },
      };
    }
    try {
      var result = "";
      if (limit > 0) {
        result = await ImmunizationList.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      } else {
        result = await ImmunizationList.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              _id: 0,
              name: "$name",
            },
          },
        ]);
      }
      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: `Immunization added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add Immunization`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForImmunization(req, res) {
    try {
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(ImmunizationColumns, data[0]);
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

      const existingimmunizations = await ImmunizationList.find({}, "name");
      const existingImmunizationNames = existingimmunizations.map(
        (center) => center.name
      );

      const inputArray = [];
      const duplicateImmunization = [];

      for (const singleData of data) {
        const trimmedImmunization = singleData.name.trim();
        if (existingImmunizationNames.includes(trimmedImmunization)) {
          duplicateImmunization.push(trimmedImmunization);
        } else {
          inputArray.push({
            name: trimmedImmunization,
            added_by: req.body.added_by,
          });
        }
      }

      if (duplicateImmunization.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Health centers already exist: ${duplicateImmunization.join(
            ", "
          )}`,
          errorCode: null,
        });
      }

      if (inputArray.length > 0) {
        const result = await ImmunizationList.insertMany(inputArray);
        return sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All immunization records added successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "No new immunization added",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, "error");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async getPatienthavingFCMtoken(req, res) {
    try {
      const headers = {
        Authorization: req.headers["authorization"],
      };
      const usersWithFCMToken = await PortalUser.find({ fcmToken: { $exists: true, $ne: null } });

      if (usersWithFCMToken.length === 0) {
        return sendResponse(req, res, 404, {
          status: false,
          body: [],
          message: "No users with FCM tokens found",
          errorCode: null,
        });
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: usersWithFCMToken,
        message: "Users with FCM tokens retrieved successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async saveSuperadminNotification(req, res) {
    // console.log("sddfr>>>>>>",req.body)
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

  async getNotification(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { page, limit } = req.query;
      const getData = await Notification.find({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)
      }).sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();

      const count = await Notification.countDocuments({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
        new: true
      });

      const isViewcount = await Notification.countDocuments({
        for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
        isView: false
      });

      const totalCount = await Notification.countDocuments({ for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user) })

      let newnotificationlist = [];
      if (getData.length > 0) {
        for await (const element of getData) {
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
          if (element.created_by_type == 'doctor') {
            let ids = element.created_by;
            let resData = await httpService.getStaging('hospital/get-portal-user-data', { data: ids }, headers, 'hospitalServiceUrl');
            object.name = resData?.data[0]?.full_name
            if (resData?.data[0]?.profile_picture != null) {
              let signedUrl = await getDocument(resData?.data[0]?.profile_picture);
              object.picture = signedUrl;
            } else {
              object.picture = "";
            }
            newnotificationlist.push(object)
          } else {
            object.name = ''
            object.picture = ''
            newnotificationlist.push(object)
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: { list: newnotificationlist, count: count, isViewcount: isViewcount, totalCount: totalCount },
        message: "List fetched successfully",
      });

    } catch (err) {
      console.log("err", err);
      return sendResponse(req, res, 500, {
        status: false,
        body: err,
        message: "Internal server error",
      });
    }
  }

  async updateNotification(req, res) {
    try {
      const {
        receiverId,
        isnew
      } = req.body;

      console.log(req.body, 'request body');
      if (!isnew) {
        var notificationDetails = await Notification.updateMany(
          { for_portal_user: { $eq: receiverId } },
          {
            $set: {
              new: false,
            },
          },
          { upsert: false, new: true }
        ).exec();
      }
      sendResponse(req, res, 200, {
        status: true,
        body: notificationDetails,
        message: `Notification updated successfully`,
        errorCode: null,
      });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to update notification list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }

  }

  async markAllReadNotification(req, res) {
    try {
      const { sender } = req.body;
      const update = await Notification.updateMany(
        { for_portal_user: { $in: [mongoose.Types.ObjectId(sender)] } },
        { $set: { isView: true } },
        { new: true }
      );

      return sendResponse(req, res, 200, {
        status: true,
        body: update,
        message: "Mark All Read successfully",
      });

    } catch (err) {
      console.log("err", err);
      return sendResponse(req, res, 500, {
        status: false,
        body: err,
        message: "Internal server error",
      });

    }
  }

  async markReadNotificationByID(req, res) {
    try {
      const { _id } = req.body;
      let updateNotification = await Notification.updateOne(
        { _id: mongoose.Types.ObjectId(_id) },
        { $set: { isView: true } },
        { new: true });

      return sendResponse(req, res, 200, {
        status: true,
        body: updateNotification,
        message: "Mark All Read successfully",
      });
    } catch (err) {
      console.log("err", err);
      return sendResponse(req, res, 500, {
        status: false,
        body: err,
        message: "Internal server error",
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

  async getPortalData(req, res) {
    try {
      let result = await PortalUser.find({ _id: mongoose.Types.ObjectId(req.query.data), isDeleted: false }).exec();

      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `portal data fetch successfully`,
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

  async getProfileInfoData(req, res) {
    try {
      let result = await ProfileInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(req.query.data) }).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `portal data fetch successfully`,
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


  async getIDbyImmunization(req, res) {

    try {
      let getData = await Immunization_info.findOne({ _id: mongoose.Types.ObjectId(req.query._id) })

      sendResponse(req, res, 200, {
        status: true,
        data: getData,
        message: `Immunization details.`,
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

  async getQRcodeScanData(req, res) {
    const { _id } = req.query
    try {
      var result;
      result = await Immunization_info.findOne({ _id: mongoose.Types.ObjectId(_id) })

      let environvent = process.env.NODE_ENV;
      let url = process.env.healthcare-crm_FRONTEND_URL;

      if (result) {
        if (environvent == 'local') {
          res.redirect(`http://localhost:4200/patient/vaccination-card/${_id}`);

        } else {
          res.redirect(`${url}/patient/vaccination-card/${_id}`);

        }

      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: 'Not Found!!',
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
}

export const generateRandom15DigitNumber = async () => {
  const min = 1e14; // Minimum 15-digit number (10^14)
  const max = 1e15 - 1; // Maximum 15-digit number (10^15 - 1)

  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  return randomNumber.toString();
}

module.exports = {
  patient: new Patient(),
};
