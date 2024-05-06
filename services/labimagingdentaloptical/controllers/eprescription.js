"use strict";

// utils
import { sendResponse } from "../helpers/transmission";
import Http from "../helpers/httpservice"
const httpService = new Http()
import mongoose from "mongoose";
import { getNextSequenceValue } from "../middleware/utils";
import Location_info from '../models/location_info';
import Eprescription from "../models/eprescription";
import EprescriptionMedicineDosage from "../models/eprescription_medicine_dosage";
import EprescriptionLab from "../models/eprescription_lab";
import EprescriptionImaging from "../models/eprescription_imaging";
import EprescriptionVaccination from "../models/eprescription_vaccination";
import EprescriptionEyeglass from "../models/eprescription_eyeglass";
import EprescriptionOther from "../models/eprescription_other";
import { downloadSignedUrl, getBys3UrlDocument } from "../helpers/s3";
import { sendEmail } from "../helpers/ses";
import { sendEprescriptionEmail } from "../helpers/emailTemplate";
import { config } from "../config/constants";
import Appointment from "../models/appointment";
import ReasonForAppointment from "../models/reason_of_appointment";

class ePrescriptionController {
  async createEprescription(req, res) {
    const {
      appointmentId,
      portalId,
      ePrescriptionNumber,
      patientBiometric,
      liverFailure,
      renalFailure,
      allergies,
      medicalHistory,
      accidentRelated,
      occupationalDesease,
      freeOfCharge,
      portal_type
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
          portalId,
          ePrescriptionNumber: "PRESC-" + ePrescNumber,
          patientBiometric,
          liverFailure,
          renalFailure,
          allergies,
          medicalHistory,
          accidentRelated,
          occupationalDesease,
          freeOfCharge,
          portal_type
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
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to create eprescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async addEprescriptionMedicineDosage(req, res) {
    const { dosages, portal_type } = req.body;
    try {
      let data = {}
      dosages.forEach(async (element) => {
        data = await EprescriptionMedicineDosage.findOneAndUpdate(
          { ePrescriptionId: element.ePrescriptionId, dose_no: element.dose_no, medicineId: element.medicineId, portal_type },
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
      portalId,
      labId, lab_name,
      reason_for_lab,
      relevant_clinical_information,
      specific_instruction,
      comment,
      portal_type
    } = req.body;

    try {

      var result;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionLab({
          ePrescriptionId,
          portalId,
          labId, lab_name,
          reason_for_lab,
          relevant_clinical_information,
          specific_instruction,
          comment,
          portal_type
        })

        result = await labData.save()

      } else {
        var obj = {
          reason_for_lab,
          relevant_clinical_information,
          specific_instruction,
          comment
        }

        result = await EprescriptionLab.findOneAndUpdate({ _id: _id, portal_type }, { $set: obj }, { new: true })

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
      portalId,
      imagingId,
      imaging_name,
      reason_for_imaging,
      relevant_clinical_information,
      specific_instruction,
      comment,
      portal_type
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionImaging({
          ePrescriptionId,
          imagingId,
          portalId,
          imaging_name,
          reason_for_imaging,
          relevant_clinical_information,
          specific_instruction,
          comment,
          portal_type
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

        result = await EprescriptionImaging.findOneAndUpdate({ _id: _id, portal_type }, { $set: obj }, { new: true })
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
      portalId,
      vaccinationId,
      vaccination_name,
      dosage,
      comment,
      portal_type
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionVaccination({
          ePrescriptionId,
          vaccinationId,
          portalId,
          vaccination_name,
          dosage,
          comment,
          portal_type
        })

        result = await labData.save()
        message = "Vaccination Test added successfully"

      } else {
        var obj = {
          dosage,
          comment
        }

        result = await EprescriptionVaccination.findOneAndUpdate({ _id: _id, portal_type }, { $set: obj }, { new: true })
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
      portalId,
      eyeglass_name,
      left_eye,
      right_eye,
      treatments,
      visual_acuity,
      comment,
      portal_type
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionEyeglass({
          ePrescriptionId,
          eyeglassId,
          portalId,
          eyeglass_name,
          left_eye,
          right_eye,
          treatments,
          visual_acuity,
          comment,
          portal_type
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

        result = await EprescriptionEyeglass.findOneAndUpdate({ _id: _id, portal_type }, { $set: obj }, { new: true })
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
      portalId,
      otherId, other_name,
      reason_for_other,
      relevant_clinical_information,
      specific_instruction,
      comment,
      portal_type
    } = req.body;

    try {

      var result;
      var message;

      if (_id == "" || _id == null) {
        const labData = new EprescriptionOther({
          ePrescriptionId,
          otherId,
          portalId,
          other_name,
          reason_for_other,
          relevant_clinical_information,
          specific_instruction,
          comment,
          portal_type
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

        result = await EprescriptionOther.findOneAndUpdate({ _id: _id, portal_type }, { $set: obj }, { new: true })
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
      appointmentId, portal_type
    } = req.query;

    try {

      var result;

      result = await Eprescription.findOne({ appointmentId, portal_type })
      // console.log("result-----", result);
      if (result) {

        let environvent = process.env.NODE_ENV;

        if (environvent == 'local') {
          result.eSignature = `http://localhost:8005/healthcare-crm-labimagingdentaloptical/four-portal-esignature-for-e-prescription/${result.eSignature}`

        } else {
          result.eSignature = `${config.healthcare-crm_Backend_url}/healthcare-crm-labimagingdentaloptical/four-portal-esignature-for-e-prescription/${result.eSignature}`
        }

        if (result?.previewTemplate != null) {
          var template = result?.previewTemplate;
          result.previewTemplateSigendUrl = await getBys3UrlDocument(template);
        }


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
      // console.log("error-----", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get E-prescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async listRecentMedicinesPrescribed(req, res) {
    const {
      portalId, portal_type,
      recentItemsFor
    } = req.query;

    try {
      var result;

      if (recentItemsFor == 'Medicines') {
        result = await EprescriptionMedicineDosage.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Labs') {
        result = await EprescriptionLab.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Imaging') {
        result = await EprescriptionImaging.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Vaccination') {
        result = await EprescriptionVaccination.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
      } else if (recentItemsFor == 'Eyeglass') {
        result = await EprescriptionEyeglass.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
      } else {
        result = await EprescriptionOther.find({ portalId, portal_type }).sort({ "createdAt": -1 }).limit(10);
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

      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to recent prescribes",
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

      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get medicine dosage",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getEprescriptionMedicineDosage(req, res) {
    const {
      ePrescriptionId,
      portal_type,
      medicineId
    } = req.query;
    try {
      var result;

      if (medicineId) {
        result = await EprescriptionMedicineDosage.find({ ePrescriptionId, medicineId, portal_type })
      } else {
        result = await EprescriptionMedicineDosage.find({ ePrescriptionId, portal_type })
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: 'Medicine Dosage fetched successfully',
        errorCode: null,
      });

    } catch (error) {

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
      portal_type,
      labId
    } = req.query;

    try {
      var result;

      if (labId) {
        result = await EprescriptionLab.findOne({ ePrescriptionId, labId, portal_type })
      } else {
        result = await EprescriptionLab.find({ ePrescriptionId, portal_type })
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
      portal_type,
      imagingId
    } = req.query;

    try {
      var result;

      if (imagingId) {
        result = await EprescriptionImaging.findOne({ ePrescriptionId, imagingId, portal_type })
      } else {
        result = await EprescriptionImaging.find({ ePrescriptionId, portal_type })
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
      portal_type,
      vaccinationId
    } = req.query;

    try {
      var result;

      if (vaccinationId) {
        result = await EprescriptionVaccination.findOne({ ePrescriptionId, vaccinationId, portal_type })
      } else {
        result = await EprescriptionVaccination.find({ ePrescriptionId, portal_type })
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
      portal_type,
      otherId
    } = req.query;

    try {
      var result;

      if (otherId) {
        result = await EprescriptionOther.findOne({ ePrescriptionId, otherId, portal_type })
      } else {
        result = await EprescriptionOther.find({ ePrescriptionId, portal_type })
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
      portal_type,
      eyeglassId
    } = req.query;

    try {
      var result;

      if (eyeglassId) {
        result = await EprescriptionEyeglass.findOne({ ePrescriptionId, eyeglassId, portal_type })
      } else {
        result = await EprescriptionEyeglass.find({ ePrescriptionId, portal_type })
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
      appointmentId, portal_type
    } = req.query;

    try {
      var result;

      result = await Eprescription.aggregate([
        {
          $match: { appointmentId: mongoose.Types.ObjectId(appointmentId), portal_type }
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

      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to get eyeglass test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async getLocationInfoById(req, res) {
    const {
      portalId
    } = req.query;

    try {
      var result;

      result = await Location_info.findOne({ for_portal_user: portalId })


      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: 'Location info fetched succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetched lacation info ",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async getEprescriptionTemplateUrl(req, res) {
    const {
      appointmentId,
      portal_type
    } = req.query;
    try {
      var result;
      result = await Eprescription.findOne({ appointmentId, portal_type })
      let previewTemplate = '';

      let environvent = process.env.NODE_ENV;
      let url = process.env.healthcare-crm_FRONTEND_URL;

      if (result?.previewTemplate != null) {
        var template = result?.previewTemplate;
        previewTemplate = await downloadSignedUrl(template);

      } else {
        res.send('There is no eSignature. Please add eSignature!!')
      }
      if (result) {
        if (previewTemplate != '') {
          if (environvent == 'local') {
            res.redirect(`http://localhost:4200/portals/eprescription-viewpdf?id=${appointmentId}&portal_type=${portal_type}`);

          } else {
            res.redirect(`${url}/portals/eprescription-viewpdf?id=${appointmentId}&portal_type=${portal_type}`);

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

  async addEprescriptionEsignature(req, res) {
    const {
      ePrescriptionId,
      previewTemplate,
      portal_type,
      appointmentId
    } = req.body;
    try {


      const fileName = req.filename;

      var result;


      result = await Eprescription.findOneAndUpdate(
        { _id: ePrescriptionId, portal_type },
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
      portalId,
      page,
      limit,
      appointmentType,
      portal_type
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
          $match: { portalId: mongoose.Types.ObjectId(portalId), portal_type }
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
          $match: { portalId: mongoose.Types.ObjectId(portalId), isValidate: true }
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
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to fetched eprescription",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async sendMailTOPatient(req, res) {
    try {
      const { patient_data, portal_email, portal_name, appointment_Id, portal_type } = req.body;
      let patient_email = patient_data?.patient_email
      let patient_name = patient_data?.patient_name

      const content = sendEprescriptionEmail(patient_email, portal_email, appointment_Id, patient_name, portal_name, portal_type)
      await sendEmail(content)
      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Email Send successfully!",
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Send Email.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async getAllEprescriptionDetailsForFourPortal(req, res) {
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
            localField: 'appointment.portalId',
            foreignField: 'for_portal_user',
            as: 'basicinfos'
          }
        },
        { $unwind: { path: "$basicinfos", preserveNullAndEmptyArrays: true } },

        // {
        //   $lookup: {
        //     from: 'specialties',
        //     localField: 'basicinfos.speciality',
        //     foreignField: '_id',
        //     as: 'specialties'
        //   }
        // },
        // { $unwind: { path: "$specialties", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            ePrescriptionNumber: 1,
            appointmentId: 1,
            medicines: "$dosages",
            subscriberId: "$appointment.consultationUserType",
            reasonForAppointment: "$appointment.reasonForAppointment",
            consultationFee: "$appointment.consultationFee",
            portalId: "$appointment.portalId",
            prescriberCenterDetails: {
              prescriberCenter: '$appointment.hospital_details.hospital_name',
              prescriberCenterId: '$appointment.hospital_details.hospital_id',
              prescriberFirstName: '$basicinfos.first_name',
              prescriberMiddleName: '$basicinfos.middle_name',
              prescriberLastName: '$basicinfos.last_name',
              prescriberTitle: '$basicinfos.title',
              prescriberSpeciality: '$basicinfos.speciality'
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
      console.log("tedhghg", result[0]?.prescriberCenterDetails?.prescriberSpeciality);
      let appointmentReasonId = result[0]?.reasonForAppointment
      const reasondata = await ReasonForAppointment.findOne({ _id: mongoose.Types.ObjectId(appointmentReasonId) })
      if (reasondata) {
        wrapResult = { ...wrapResult, reasonData: reasondata.name }
      }

      console.log(reasondata, "reasondata");
      if (result[0]?.prescriberCenterDetails?.prescriberSpeciality) {
        console.log("tedhghg");
        let specialityPromises = await httpService.getStaging('hospital/get-speciality-data', { data: result[0]?.prescriberCenterDetails?.prescriberSpeciality[0] }, headers, 'hospitalServiceUrl');
        console.log(specialityPromises, "specialityPromises");
        if (specialityPromises) {
          wrapResult = { ...wrapResult, specialityname: specialityPromises?.data[0]?.specilization }
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
      console.log("req_____________",req.query)
      const getData = await Eprescription.find({ ePrescriptionNumber: req.query.eprescription_number })
      console.log("getData_____________",getData)
      let checkEprescriptionNumberExist ={};
      if (getData.length > 0) {
        const eprescriptionID = getData[0]._id;
        if (req.query.portal_type === "Laboratory-Imaging") {
          checkEprescriptionNumberExist = await EprescriptionImaging.find({ ePrescriptionId: { $eq: eprescriptionID } });
        } 
        else if (req.query.portal_type === "Paramedical-Professions") {
            checkEprescriptionNumberExist = await EprescriptionLab.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }
        else if (req.query.portal_type === "Dental") {
            checkEprescriptionNumberExist = await EprescriptionOther.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }
        else if (req.query.portal_type === "Optical") {
            checkEprescriptionNumberExist= await EprescriptionEyeglass.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }
        else{
          checkEprescriptionNumberExist= await EprescriptionMedicineDosage.find({ ePrescriptionId: { $eq: eprescriptionID } });
        }
        console.log("checkEprescriptionNumberExist___________",checkEprescriptionNumberExist);

        sendResponse(req, res, 200, {
          status: true,
          body: {
            medicineDosageData: checkEprescriptionNumberExist
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
      console.log("error----->>>>>>",error)
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: error.message ? error.message : "Something went wrong",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }


}
module.exports = new ePrescriptionController();