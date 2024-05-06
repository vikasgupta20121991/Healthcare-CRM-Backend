"use strict";

// models
import Superadmin from "../../models/superadmin/superadmin";
import PortalUser from "../../models/superadmin/portal_user";
import LocationDetails from "../../models/superadmin/location_info";
import BankPaymentDetails from "../../models/superadmin/bank_details";
import AssociationData from "../../models/superadmin/association_data";
import DocumentInfo from "../../models/superadmin/document_info";
import MenuPermission from "../../models/rolesandpermission/menu_permission";
const Http = require('../../helpers/httpservice');


// utils
import { sendResponse } from "../../helpers/transmission";
import { decryptionData } from "../../helpers/crypto";
import { hashPassword } from "../../helpers/string";
import { uploadFile, getFile, getDocument } from "../../helpers/s3";
const { config } = require("../../config/constants");
const { healthcare-crm_FRONTEND_URL } = config;
import { sendEmail } from "../../helpers/ses";
import { sendAssociationDetails } from "../../helpers/emailTemplate";
import mongoose from "mongoose";

const httpService = new Http()

const getDocumentObject = async (req, userId) => {
  let association_group_icon_object = {}
  let license_card_id_proof_object = {}
  if (req.files) {
    if ('association_group_icon' in req.files) {
      const s3result = await uploadFile(req.files.association_group_icon.data, {
        Bucket: 'healthcare-crm-stage-docs',
        Key: `superadmin/${userId}/group-icon/${req.files.association_group_icon.name}`,
      })
      association_group_icon_object['name'] = req.files.association_group_icon.name
      association_group_icon_object['code'] = 'group-icon'
      association_group_icon_object['e_tag'] = s3result.ETag
      association_group_icon_object['url'] = s3result.Key
    } else {
      association_group_icon_object = {}
    }
    if ('license_card_id_proof' in req.files) {
      console.log(req.files, 'req.files');
      console.log(req.files.license_card_id_proof.name, 'req.files.license_card_id_proof.name');
      const s3result = await uploadFile(req.files.license_card_id_proof.data, {
        Bucket: 'healthcare-crm-stage-docs',
        Key: `superadmin/${userId}/license/${req.files.license_card_id_proof.name}`,
      })
      license_card_id_proof_object['name'] = req.files.license_card_id_proof.name
      license_card_id_proof_object['code'] = 'group-icon'
      license_card_id_proof_object['e_tag'] = s3result.ETag
      license_card_id_proof_object['url'] = s3result.Key
    } else {
      license_card_id_proof_object = {}
    }
  }
  return {
    association_group_icon_object,
    license_card_id_proof_object
  }
}
class AssociationGroupController {

  async createAssociationGroup(req, res) {
    const { group_name, email, language, mobile_phone, additional_phone, address, neighborhood, country, region, province, department, city, village, pincode, password, association_group_type, association_group_data, about_group, group_slogan, license_number, license_expiry, bank_name, bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_address, mobilepay_provider_name, mobilepay_number, country_code, userId, createdBy } = req.body;
    try {
      console.log("req.body----------", req.body);

      const selectedLanguagesArray = JSON.parse(language);
      const userExist = await Superadmin.find({ email, isDeleted: false });
      console.log("userExist----------", userExist);
      if (userExist.length > 0) {
        sendResponse(req, res, 500, {
          status: false,
          data: null,
          message: `user email already exists`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
        return
      }
      const passwordHash = await hashPassword(password);
      const userDetails = new Superadmin({
        email,
        fullName: group_name,
        password: passwordHash,
        mobile: mobile_phone,
        country_code,
        role: "ASSOCIATION_USER",
        createdBy: createdBy
      });
      const userData = await userDetails.save();

      //Add menu permission for association user
      let childMenuArray;
      let menuID;
      let menuID2;
      let childMenuArray2;
      if (association_group_type == 'pharmacy') {
        childMenuArray = ['63dca1d5d5e9ec0f272ce140', '63dca207d5e9ec0f272ce142']
        menuID = "63dca12fd5e9ec0f272ce13e"
        childMenuArray2 = ['64a4f823a2a1bba707d4896a', '64a4f87fa2a1bba707d4896b']
        menuID2 = "64a4f6a4a2a1bba707d48969"

      } else {
        childMenuArray = ['640b143dbabf55275f02b109', '640b1495babf55275f02b10a']
        menuID = "640b13a4babf55275f02b105"
      }
      let menusArray = []
      menusArray.push({
        menu_id: menuID,
        role_id: null,
        permission_id: null,
        user_id: userData._id,
        menu_order: 23
      })
      for (const childMenu of childMenuArray) {
        menusArray.push({
          menu_id: childMenu,
          role_id: null,
          permission_id: null,
          user_id: userData._id,
          menu_order: 23,
          parent_id: menuID
        })
      }

      if (menuID2 && childMenuArray2) {
        menusArray.push({
          menu_id: menuID2,
          role_id: null,
          permission_id: null,
          user_id: userData._id,
          menu_order: 23
        })

        for (const childMenu of childMenuArray2) {
          menusArray.push({
            menu_id: childMenu,
            role_id: null,
            permission_id: null,
            user_id: userData._id,
            menu_order: 23,
            parent_id: menuID2
          })
        }
      }


      const menuResult = await MenuPermission.insertMany(menusArray)

      //Location details
      const locationDetails = new LocationDetails({
        address: address == '' ? null : address,
        neighborhood: neighborhood == '' ? null : neighborhood,
        country: country == '' ? null : country,
        region: region == '' ? null : region,
        province: province == '' ? null : province,
        department: department == '' ? null : department,
        city: city == '' ? null : city,
        village: village == '' ? null : village,
        pincode: pincode == '' ? null : pincode
      })
      const locationData = await locationDetails.save();

      // Association bank details related to payment
      const bankPaymentDetails = new BankPaymentDetails({
        bank_name, bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_address, mobilepay_provider_name, mobilepay_number
      })
      const bankData = await bankPaymentDetails.save();

      //Association data including pharmacy and hospitals ID grouped
      const associationDetails = new AssociationData({
        association_group_type, association_group_data: req.body.association_group_data.split(','), createdBy
      })
      const associationData = await associationDetails.save();

      //Handle Image Upload
      const result = await getDocumentObject(req, userId)
      let association_group_icon
      let license_card_id_proof
      if (Object.values(result.association_group_icon_object).length > 0) {
        const saveDoc = new DocumentInfo({
          name: result.association_group_icon_object.name,
          code: result.association_group_icon_object.code,
          e_tag: result.association_group_icon_object.e_tag,
          url: result.association_group_icon_object.url,
        })
        const ass_doc = await saveDoc.save()
        association_group_icon = ass_doc._id
      }
      if (Object.values(result.license_card_id_proof_object).length > 0) {
        const saveDoc = new DocumentInfo({
          name: result.license_card_id_proof_object.name,
          code: result.license_card_id_proof_object.code,
          e_tag: result.license_card_id_proof_object.e_tag,
          url: result.license_card_id_proof_object.url,
        })
        const ass_doc = await saveDoc.save()
        license_card_id_proof = ass_doc._id
      }
      // Portal user details
      const portalUserDetails = new PortalUser({
        role: "ASSOCIATION_USER", language: selectedLanguagesArray, additional_phone, about_group, group_slogan, license_number, license_expiry, association_group_icon, license_card_id_proof, superadmin_id: userData._id, location_id: locationData._id, association_id: associationData._id, bank_details_id: bankData._id
      })
      await portalUserDetails.save();
      const content = sendAssociationDetails(email, password, association_group_type, `${healthcare-crm_FRONTEND_URL}/super-admin`);
      await sendEmail(content);
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `association group created successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to create association group`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async editAssociationGroup(req, res) {
    const { group_name, language, additional_phone, address, neighborhood, country, region, province, department, city, village, pincode, association_group_type, association_group_data, about_group, group_slogan, license_number, license_expiry, bank_name, bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_address, mobilepay_provider_name, mobilepay_number, userId, id, old_association_group_icon, old_license_card_id_proof } = req.body;
    try {
      const userExist = await PortalUser.find({ _id: { $eq: id } });
      const selectedLanguagesArray = JSON.parse(language);
      if (userExist.length <= 0) {
        sendResponse(req, res, 500, {
          status: false,
          data: null,
          message: `user not exists`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
        return
      }
      const updateSuperadmin = await Superadmin.findOneAndUpdate({ _id: userExist[0].superadmin_id }, { $set: { fullName: group_name } }, { new: true })

      //Location details
      const updateLocationDetails = await LocationDetails.findOneAndUpdate(
        { _id: userExist[0].location_id },
        {
          $set: {
            address: address == '' ? null : address,
            neighborhood: neighborhood == '' ? null : neighborhood,
            country: country == '' ? null : country,
            region: region == '' ? null : region,
            province: province == '' ? null : province,
            department: department == '' ? null : department,
            city: city == '' ? null : city,
            village: village == '' ? null : village,
            pincode: pincode == '' ? null : pincode
          }
        },
        { new: true }
      )

      // Association bank details related to payment
      const updateBankPaymentDetails = await BankPaymentDetails.findOneAndUpdate(
        { _id: userExist[0].bank_details_id },
        {
          $set: { bank_name, bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_address, mobilepay_provider_name, mobilepay_number }
        },
        { new: true }
      )

      //Association data including pharmacy and hospitals ID grouped
      const associationDetails = await AssociationData.findOneAndUpdate(
        { _id: userExist[0].association_id },
        {
          $set: { association_group_type, association_group_data: req.body.association_group_data.split(',') }
        },
        { new: true }
      )

      //Handle Image Upload
      const result = await getDocumentObject(req, userId)
      let association_group_icon
      let license_card_id_proof
      if (Object.values(result.association_group_icon_object).length > 0) {
        const saveDoc = new DocumentInfo({
          name: result.association_group_icon_object.name,
          code: result.association_group_icon_object.code,
          e_tag: result.association_group_icon_object.e_tag,
          url: result.association_group_icon_object.url,
        })
        const ass_doc = await saveDoc.save()
        association_group_icon = ass_doc._id
      } else {
        if (old_association_group_icon) {
          association_group_icon = old_association_group_icon
        }
      }
      if (Object.values(result.license_card_id_proof_object).length > 0) {
        const saveDoc = new DocumentInfo({
          name: result.license_card_id_proof_object.name,
          code: result.license_card_id_proof_object.code,
          e_tag: result.license_card_id_proof_object.e_tag,
          url: result.license_card_id_proof_object.url,
        })
        const ass_doc = await saveDoc.save()
        license_card_id_proof = ass_doc._id
      } else {
        if (old_license_card_id_proof) {
          license_card_id_proof = old_license_card_id_proof
        }
      }

      // Portal user details
      const portalUserDetails = await PortalUser.findOneAndUpdate(
        { _id: { $eq: id } },
        {
          $set: {
            language: selectedLanguagesArray, additional_phone, about_group, group_slogan, license_number, license_expiry, association_group_icon, license_card_id_proof
          }
        },
        { new: true }
      )

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `association group updated successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update association group`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async editPharmacyAssociationGroup(req, res) {
    console.log(req.body);
    const { association_group_data, id } = req.body;
    try {
      const userExist = await PortalUser.find({ _id: { $eq: id } });
      if (userExist.length <= 0) {
        sendResponse(req, res, 500, {
          status: false,
          data: null,
          message: `user not exists`,
          errorCode: "INTERNAL_SERVER_ERROR",
        });
        return
      }
      //Association data including pharmacy and hospitals ID grouped
      const associationDetails = await AssociationData.findOneAndUpdate(
        { _id: userExist[0].association_id },
        {
          $set: { association_group_data: req.body.association_group_data.split(',') }
        },
        { new: true }
      )
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `association group updated successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update association group`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async listAssociationGroup(req, res) {
    try {
      const { page, limit, userId, searchKey } = req.query;

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
        role: 'ASSOCIATION_USER',
        isDeleted: false,
      };
      if (searchKey != '' && searchKey) {
        filter['superadmin_id.fullName'] = { $regex: searchKey || "", $options: "i" }
      }
      const return1 = await PortalUser.aggregate([
        {
          $lookup: {
            from: "associationdatas",
            localField: "association_id",
            foreignField: "_id",
            as: "association_id",
          }
        },
        { $unwind: "$association_id" },
        {
          $lookup: {
            from: "locationinfos",
            localField: "location_id",
            foreignField: "_id",
            as: "location_id",
          }
        },
        { $unwind: "$location_id" },
        {
          $lookup: {
            from: "superadmins",
            localField: "superadmin_id",
            foreignField: "_id",
            as: "superadmin_id",
          }
        },
        { $unwind: "$superadmin_id" },
        { $match: filter },
        {
          $sort: sortingarray
        },
        {
          $limit: limit * 1
        },
        { $skip: (page - 1) * limit }
      ]);

      const newcount = await PortalUser.aggregate([
        {
          $lookup: {
            from: "associationdatas",
            localField: "association_id",
            foreignField: "_id",
            as: "association_id",
          }
        },
        { $unwind: "$association_id" },
        {
          $lookup: {
            from: "locationinfos",
            localField: "location_id",
            foreignField: "_id",
            as: "location_id",
          }
        },
        { $unwind: "$location_id" },
        {
          $lookup: {
            from: "superadmins",
            localField: "superadmin_id",
            foreignField: "_id",
            as: "superadmin_id",
          }
        },
        { $unwind: "$superadmin_id" },
        { $match: filter },
      ]);
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: return1,
          totalCount: newcount.length
        },
        message: `association list fetched successfully`,
        errorCode: null,
      });
      // const result = await PortalUser.find(filter)
      // .populate({
      //     path: "association_id",
      // })
      // .populate({
      //   path: "location_id",
      // })
      // .populate({
      //   path: "superadmin_id",
      //   match: { fullName:  { $regex: searchKey || "", $options: "i" }},
      //   select: {fullName: 1, mobile: true, country_code: true},
      //   options:{
      //     retainNullValues: false,
      //   }
      // })
      // .sort([["createdAt", -1]])
      // .limit(limit * 1)   
      // .skip((page - 1) * limit)
      // .exec();

      // console.log(result);
      // sendResponse(req, res, 200, {
      //   status: true,
      //   data: {
      //     data: result,
      //     totalCount: count
      //   },
      //   message: `association list fetched successfully`,
      //   errorCode: null,
      // });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched association list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getAllAssociationGroup(req, res) {
    try {
      let filter = {
        role: 'ASSOCIATION_USER'
      }
      if (req.query.group_type) {
        filter['association_id.association_group_type'] = req.query.group_type
      }
      const aggregate = [
        {
          $lookup: {
            from: "associationdatas",
            localField: "association_id",
            foreignField: "_id",
            as: "association_id",
          }
        },
        { $unwind: "$association_id" },
        {
          $lookup: {
            from: "superadmins",
            localField: "superadmin_id",
            foreignField: "_id",
            as: "superadmin_id",
          }
        },
        { $unwind: "$superadmin_id" },
        { $match: filter },
        {
          $project: {
            group_name: "$superadmin_id.fullName",
            group_data: "$association_id",

          }
        },
      ]
      const result = await PortalUser.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `successfully fetched association list`,
        errorCode: null
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched association list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async viewAssociationGroup(req, res) {
    try {
      const { groupID } = req.query;
      const headers = {
        'Authorization': req.headers['authorization']
      }
      let result = await PortalUser.find({
        _id: { $eq: groupID }
      })
        .populate({
          path: "association_id",
        })
        .populate({
          path: "location_id",
          populate: [{
            path: 'country',
            model: 'Country'
          }, {
            path: 'region',
            model: 'Region'
          }, {
            path: 'province',
            model: 'Province'
          }
            , {
            path: 'department',
            model: 'Department'
          }
            , {
            path: 'city',
            model: 'City'
          }, {
            path: 'village',
            model: 'Village'
          }]
        })
        .populate({
          path: "bank_details_id",
        })
        .populate({
          path: "association_group_icon",
          select: { url: 1, _id: 0 }
        })
        .populate({
          path: "superadmin_id",
          // select: { fullName: 1, mobile: 1, country_code: 1 }
        })
        .exec();
      if (result[0].association_group_icon) {
        var signedurl = await getDocument(result[0].association_group_icon.url);
        result[0].association_group_icon.url = signedurl;
      }
      if (result[0].association_id) {
        const groupIDs = result[0].association_id.association_group_data
        console.log(groupIDs,"groupIDs");
        let getResult
        if (result[0].association_id.association_group_type == 'hospital') {
          getResult = await httpService.getStaging('hospital/get-all-hospital-details-by-id', { hospitalIDs: groupIDs.join(",") }, headers, 'hospitalServiceUrl');
        } else {
          getResult = await httpService.getStaging('pharmacy/get-all-pharmacy-admin-details', { pharmacyIDs: groupIDs.join(",") }, headers, 'pharmacyServiceUrl');
        }
        let pharmacyData = [];
        if (getResult.status) {
          pharmacyData = getResult.body
        }
        result.push({
          pharmacy_details: pharmacyData
        })
      }
      else {
        result.push({
          pharmacy_details: []
        })
      }
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `association group fetched successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err, "error check ");
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: err.message ? err.message : `failed to fetched association group`,
        errorCode: err.code ? err.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async deleteActiveLockAssociationGroup(req, res) {
    try {
      const { action, actionValue, id } = req.body
      let key;
      key = action === "delete" ? 'isDeleted' : action === "lock" ? "isLocked" : action === "active" ? "isActive" : ''
      if (key) {
        const portalData = await PortalUser.findOneAndUpdate(
          { _id: { $eq: id } },
          {
            $set: {
              [key]: actionValue
            }
          },
          { new: true },
        )
        await Superadmin.findOneAndUpdate(
          { _id: { $eq: portalData.superadmin_id } },
          {
            $set: {
              [key]: actionValue
            }
          },
          { new: true },
        )
        let actionMessage;
        if (action === "active" && actionValue) {
          actionMessage = "actived"
        } else if (action === "active" && !actionValue) {
          actionMessage = "deactived"
        }
        if (action === "delete" && actionValue) {
          actionMessage = "deleted"
        }
        if (action === "lock" && actionValue) {
          actionMessage = "locked"
        } else if (action === "lock" && !actionValue) {
          actionMessage = "unlocked"
        }
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `association group ${actionMessage} successfully`,
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
        message: `failed to ${actionMessage} association group`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async getAllAssociationGroupByID(req, res) {
    try {
      console.log(req.query.associationIds, "associationIdssss")
      let associationGroupID = []
      for (const id of req.query.associationIds) {
        associationGroupID.push(mongoose.Types.ObjectId(id))
      }
      let filter = {
        role: 'ASSOCIATION_USER',
        _id: { $in: associationGroupID }
      }
      if (req.query.group_type) {
        filter['association_id.association_group_type'] = req.query.group_type
      }
      const aggregate = [
        {
          $lookup: {
            from: "superadmins",
            localField: "superadmin_id",
            foreignField: "_id",
            as: "superadmin_id",
          }
        },
        { $unwind: "$superadmin_id" },
        { $match: filter },
        {
          $project: {
            group_name: "$superadmin_id.fullName",
          }
        },
      ]
      const result = await PortalUser.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `successfully fetched association list`,
        errorCode: null
      });
    } catch (error) {
      console.log(error, "errorrr")
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched association list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async addAssociationData(req, res) {
    try {
      const { newassociationid, oldAssociationid, pharmacyId } = req.body
      console.log(req.body, "chekc id ");


      const oldresult = await PortalUser.find({ _id: { $in: oldAssociationid } });
      oldresult.forEach(async (element) => {



        let dataAssociationId = element.association_id;
        console.log(dataAssociationId, "emenent data portal user")
        const updatedAssociationData = await AssociationData.findOneAndUpdate(
          {
            _id: dataAssociationId,
            association_group_data: { $eq: pharmacyId }
          },
          {
            $pull: { association_group_data: pharmacyId }
          },
          { new: true }
        );

      });

      // return;
      const result = await PortalUser.find({ _id: { $in: newassociationid } });


      let portaData = result.forEach(async (element) => {

        let dataAssociationId = element.association_id;
        console.log(dataAssociationId, "emenent data portal user")
        const updatedAssociationData = await AssociationData.findOneAndUpdate(
          {
            _id: dataAssociationId,
            association_group_data: { $ne: pharmacyId }
          },
          {
            $push: { association_group_data: pharmacyId }
          },
          { new: true }
        );

        if (!updatedAssociationData) {
          console.log(`Association data not found for ID: ${dataAssociationId}`);
          return;
        }

        console.log(`Added pharmacyId ${pharmacyId} to associationData.`);
        console.log(updatedAssociationData, "Updated associationData");

      });


      sendResponse(req, res, 200, {
        status: true,
        data: result,
        message: `successfully fetched association list`,
        errorCode: null
      });
    } catch (error) {
      console.log(error, "errorrr")
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: `failed to fetched association list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
}
module.exports = new AssociationGroupController();
