import mongoose from "mongoose";
import DoctorInfoSchema from "./doctor_info";

const extend = (Schema, obj) =>
  new mongoose.Schema(Object.assign({}, Schema.obj, obj));

const individualDoctorInfoSchema = extend(
  DoctorInfoSchema,
  {
    office_phone_number: {
        type: String,
    },
    category_phone_number: [{
        type: String,
    }],
    as_insurance_details: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceCompany",
    },
    as_bank_detail: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "BankDetail",
    },
    as_mobile_pay: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "MobilePay",
    },
    in_hospital: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalAdminInfo",
    }]
  },
  { timestamps: true }
);

export default mongoose.model(
  "IndividualDoctorInfo",
  individualDoctorInfoSchema
);
