import mongoose, { Schema } from "mongoose";

const adminInfoSchema = new mongoose.Schema(
    {
        profile_pic: {
            type: String,
        },
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

        role: {
            type: String,
            default: "INSURANCE_ADMIN",
        },
        dob: {
            type: String,
        },
        language: {
            type: Array,
        },
        in_location: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: "LocationInfo",
        },
        company_logo: {
            type: String
        },
        company_name: {
            type: String,
        },
        company_slogan: {
            type: String
        },
        company_type: {
            type: String,
            default: "",
        },
        other_company_type_name: {
            type: String,
            default: "",
        },
        company_address: {
            type: String
        },
        head_Office_address: {
            type: String
        },
        capital: {
            type: String
        },
        fax: [{
            fax_number: {
                type: String
            },
        }],
        laws_governing: {
            type: String
        },
        office_phone: [{
            office_phone_number: {
                type: String
            },
        }],
        ifu_number: {
            type: String,
            default: "",
        },
        rccm_number: {
            type: String,
            default: "",
        },
        other_company_number: {
            type: String
        },
        banking_reference: {
            type: String
        },
        template_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Template"
        },
        card_preview_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CardPreview"
        },
        verify_status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "APPROVED", "DECLINED", "DELETED"],
        },
        approved_at: {
            type: String,
            default: null
        },
        approved_or_rejected_by: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
        
        isInfoCompleted: {
            type: Boolean,
            default:false
        },
        allowHealthPlan:{
            type: Boolean,
            default:false
        },
        allowSubscription:{
            type: Boolean,
            default:false 
        },
        bank_name: {
            type: String,
        },
        bank_accName: {
            type: String,
        },
        accountNumber: {
            type: String,
        },
        bank_ifsc: {
            type: String,
        },
        bank_address: {
            type: String,
        },
        in_mobile_pay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MobilePay",
        }
    },
    { timestamps: true }
);

export default mongoose.model("AdminInfo", adminInfoSchema);