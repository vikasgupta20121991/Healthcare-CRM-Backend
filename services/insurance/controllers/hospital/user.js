"use strict";

// models
import HospitalUser from "../../models/hospital/user";
import HospitalDetail from "../../models/hospital/hospitalDetail";
import HospitalStaffDetail from "../../models/hospital/hospitalStaffDetail";
import counter from "../../models/counter";

// utils
import { sendResponse } from "../../helpers/transmission";
import bcrypt from "bcrypt";

export class HospitalUserClass {
  async adminSignUp(req, res) {
    try {
      const { fullName, email, password, hospitalName, hospitalType } = req.body;
      let userFind = await HospitalUser.findOne(
            {
                email: email.toLowerCase()
            }
          );
      if (userFind) {
        return sendResponse(req, res, 200, {
          status: true,
          message: "User already exist",
          errorCode: null,
        });
      }
      const salt = await bcrypt.genSalt(10);
      let newPassword = await bcrypt.hash(password, salt);
      // req.body.password = newPassword
      var sequenceDocument = await counter.findOneAndUpdate({_id: "employeeid"},{$inc:{sequence_value:1}},{new: true})
      // req.body.userId = sequenceDocument.sequence_value
      let userData = new HospitalUser(
          {
            fullName,
            email,
            password:newPassword,
            userId:sequenceDocument.sequence_value
          }
      );
      let SavedUserData = await userData.save();

      let hospitalProfileData = new HospitalDetail(
        {
          userId: sequenceDocument.sequence_value,
          hospitalUser: SavedUserData._id,
          hospitalName,
          hospitalType
        }
      );
      let savedHospitalProfileData = await hospitalProfileData.save();
      sendResponse(req, res, 200, {
        status: true,
        body: SavedUserData,
        message: "successfully Sign Up",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to create user",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  async createStaff(req, res) {
    try {
      const { email, password} = req.body;
      let userFind = await HospitalUser.findOne(
            {
                email: email.toLowerCase()
            }
          );
      if (userFind) {
        return sendResponse(req, res, 200, {
          status: true,
          message: "User already exist",
          errorCode: null,
        });
      }
      const salt = await bcrypt.genSalt(10);
      let newPassword = await bcrypt.hash(password, salt)
      req.body.password = newPassword
      var sequenceDocument = await counter.findOneAndUpdate({_id: "employeeid"},{$inc:{sequence_value:1}},{new: true})
      req.body.userId = sequenceDocument.sequence_value
      req.body.userType = "staff"
      req.body.isApproved = true
      let staffData = new HospitalUser(req.body)
      let SavedStaffData = await staffData.save()

      req.body.userObjectID = SavedStaffData._id
      let hospitalStaffData = new HospitalStaffDetail(req.body)
      let savedHospitalStaffData = await hospitalStaffData.save()
      sendResponse(req, res, 200, {
        status: true,
        body: SavedStaffData,
        message: "Staff created successfully",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to create user",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  async craeteHospitalProfile(req, res) {
    try {
      const { userId } = req.body;
      let userFind = await InsuranceUser.findOne({userId});
      if(userFind){
        req.body.userId = userFind.userId
        req.body.objectId = userFind._id
        req.body.companyLogo = req.file.filename
        let userData = new HospitalDetail(
          req.body
        );
        let createdProfile = await userData.save();
    
        sendResponse(req, res, 200, {
          status: true,
          body: createdProfile,
          message: "successfully Create Profile",
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to create user",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  };

  async editHospitalProfile(req, res) {
    try {
      console.log(req.body);
      const { userId } = req.body;
      if(req.file){
        req.body.companyLogo = req.file.filename
      }
      let updatedCompanyDetails = await HospitalDetail.findOneAndUpdate(userId,{categoryPhoneNumber:req.body.categoryPhoneNumber[0]},{new:true});
      sendResponse(req, res, 200, {
        status: true,
        body: updatedCompanyDetails,
        message: "Successfully Updated Company Details",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to create user",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  };
}


