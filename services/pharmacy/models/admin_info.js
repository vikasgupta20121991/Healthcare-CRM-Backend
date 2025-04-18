import mongoose from "mongoose";

const adminInfoSchema = new mongoose.Schema(
    {
        address: {
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
        pharmacy_name: {
            type: String,
        },
        slogan: {
            type: String,
        },
        main_phone_number: {
            type: String,
        },
        insurance_accepted: [{
            type: mongoose.Schema.Types.ObjectId,default:null
        }],
        mobile_phone_number: {
            type: String,
        },
        additional_phone_number: [
            {
                type: String,
            },
        ],
        about_pharmacy: {
            type: String,
        },
        medicine_request: {
            prescription_order: {
                type: Boolean,
                default: true
            },
            medicine_price_request: {
                type: Boolean,
                default: true
            },
            request_medicine_available: {
                type: Boolean,
                default: true
            },
        },
        association: {
            enabled: {
                type: Boolean,
            },
            name: [
                {
          type: mongoose.Schema.Types.ObjectId,
                },
            ],
        },
        profile_picture: {
            type: String,
            default:""
        },
        profile_picture_signed_url: {
            type: String,
            default: ""
        },
        pharmacy_picture: [{
            type: String,
        }],
        pharmacy_picture_signed_urls: {
            type: Array,
            default: null
        },
        licence_details: {
            id_number: {
                type: String,
            },
            expiry_date: {
                type: String,
            },
            licence_picture: {
                type: String,
            },
        },
        duty_group: {
            enabled: {
                type: Boolean,
            },
            id_number: {
                type: String,
            },
        },
        show_to_patient: {
            type: Boolean,
        },
        verify_status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "APPROVED", "DECLINED", "DELETED"],
        },
        in_on_duty_group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OnDutyGroup",
            default: null
        },
        in_location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LocationInfo",
        },
        in_bank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankDetail",
        },
        in_mobile_pay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MobilePay",
        },
        approved_at: {
            type: String,
            default: null,
        },
        hoursset: {
            type: String,
            default: false,
        },
        approved_or_rejected_by: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("AdminInfo", adminInfoSchema);
