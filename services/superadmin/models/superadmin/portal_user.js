import mongoose, { Mongoose, now, Schema } from "mongoose";
const portalUserSchema = new mongoose.Schema(
    {
        role: {
            type: String,
        },
        language: {
            type: Array,
        },
        additional_phone: {
            type: String,
        },
        association_group_icon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DocumentInfo",
        },
        about_group: {
            type: String,
        },
        group_slogan: {
            type: String,
        },
        license_number: {
            type: String,
        },
        license_expiry: {
            type: String,
        },
        license_card_id_proof: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DocumentInfo",
        },
        staff_profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DocumentInfo",
        },
        about_staff: {
            type: String,
        },
        staff_role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
        },
    dob: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        superadmin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Superadmin",
        },
        location_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LocationInfo",
        },
        association_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AssociationData",
        },
        bank_details_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankPaymentDetails",
        },
        permissions: {
            type: Array,
            default: null
        },
        for_staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Superadmin",
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            required: false
        }
    },
    { timestamps: true }
);
export default mongoose.model("PortalUser", portalUserSchema);
