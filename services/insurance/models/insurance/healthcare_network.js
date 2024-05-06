import mongoose from "mongoose";

const HealthcareNetworkSchema = new mongoose.Schema(
    {
        added_by: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            user_type: {
                type: String,
                required: true,
            },
        },
        provider_type: {
            type: String,
            required: true,
        },
        provider_name: {
            type: String,
            required: true,
        },
        ceo_name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        mobile: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        region: {
            type: String,
            required: true,
        },
        neighborhood: {
            type: String,
            required: true,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminInfo",
            required: true,
        },
        active: {
            type: Boolean,
            default: true
        },
        dateofcreation:{
            type: String,
        }
    },
    { timestamps: true }
);

export default mongoose.model("HealthcareNetwork", HealthcareNetworkSchema);
