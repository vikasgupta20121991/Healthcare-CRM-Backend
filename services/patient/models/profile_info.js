import mongoose from "mongoose";

const profileInfoSchema = new mongoose.Schema(
    {
        full_name: {
            type: String,
        },
        first_name: {
            type: String,
        },
        middle_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        gender: {
            type: String,
        },
        dob: {
            type: String,
        },
        blood_group: {
            type: String,
        },
        marital_status: {
            type: String,
        },
        profile_pic: {
            type: String,
      default: "",
        },
        profile_pic_signed_url: {
            type: String,
            default:''
        },
        isInfoCompleted: {
            type: Boolean,
            default:false
        },
        emergency_contact: {
            name: {
                type: String,
            },
            relationship: {
                type: String,
            },
            phone_number: {
                type: String,
            },
        },
        last_update: {
            type: Date,
            required: false,
            default: Date.now,
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
        in_location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LocationInfo",
        },
        location_details:{
            type:Object
        },
        in_insurance: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InsuranceInfo",
        },
        in_vital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VitalInfo",
        },
        in_medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicalInfo",
        },
        in_immunization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ImmunizationInfo",
        },
        in_history: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HistoryInfo",
        },
        in_medical_document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicalDocument",
        },
        in_family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FamilyInfo",
        },
        added_by_doctor: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        in_mobile_pay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MobilePay",
        }
    },
    { timestamps: true }
);

export default mongoose.model("ProfileInfo", profileInfoSchema);
