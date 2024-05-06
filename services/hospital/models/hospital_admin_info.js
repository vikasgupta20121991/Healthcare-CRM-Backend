import mongoose from "mongoose";

const hospitalAdminInfoSchema = new mongoose.Schema(
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
        hospital_name: {
            type: String,
        },
        type_of_health_center: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalType",
        },
        category_of_health_center: {
            type: String,
        },
        main_phone_number: {
            type: String,
        },
        mobile_phone_number: {
            type: String,
        },
        category_phone_number: [{
            type: String
        }],
        fax_number: {
            type: String,
        },
        about_hospital: {
            type: String,
        },
        association: {
            is_true: {
                type: Boolean,
            },
            name: [{
                type: String,
            }],
        },
        profile_picture: {
            type: String,
            default: null
        },
        hospitalPictures: [
            {
                type: String
            }
        ],
        patient_portal: {
            type: Boolean,
        },
        ifu_number: {
            type: String,
        },
        rccm_number: {
            type: String,
        },
        opening_hours_status: {
            type: Boolean,
            default: true,
        },
        license: {
            image: {
                type: String,
                default: null
            },
            number: {
                type: String,
                default: null
            },
            expiry_date: {
                type: String,
                default: null
            }
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
            //   ref: "User",
            default: null
        },
        in_location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LocationInfo",
        },
        in_pathology_test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PathologyTestInfo",
        },
        in_bank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankDetail",
        },
        in_mobile_pay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MobilePay",
            default: null
        },
        insurance_accepted: {
            type: Array,
            default: []
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("HospitalAdminInfo", hospitalAdminInfoSchema);
