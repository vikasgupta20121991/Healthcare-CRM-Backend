import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
            default: null
        },
        middle_name: {
            type: String,
            default: null
        },
        last_name: {
            type: String,
            default: null
        },
        email: {
            type:String,
            default: null
        },
        phone: {
            type:String,
        },
        address: {
            type: String,
            required: true,
        },
        created_By: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser"
        },
        verify_status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "SEND"],
        },
        type:{
            type: String,
            enum: [
                "Paramedical-Professions",
                "Dental",
                "Laboratory-Imaging",
                "Optical"
            ]
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    { timestamps: true }
);

export default mongoose.model("Invitation", invitationSchema);
