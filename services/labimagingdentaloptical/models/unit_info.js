import mongoose from "mongoose";

const unitInfoSchema = new mongoose.Schema(
    {
        unit: {
            type: String,
            required: true,
        },
        for_service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service"
        },
        for_department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser"
        },
        active_status: {
            type: Boolean,
            required: true,
            default: true
        },
        delete_status: {
            type: Boolean,
            required: true,
            default: false
        },
        type: {
            type: String,
            required: true,
            enum: [
                "Paramedical-Professions",
                "Dental",
                "Laboratory-Imaging",
                "Optical"
            ],
        },
    },
    { timestamps: true }
);
export default mongoose.model("Unit", unitInfoSchema);