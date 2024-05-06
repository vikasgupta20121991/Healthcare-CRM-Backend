import mongoose from "mongoose";

const otp2faSchema = new mongoose.Schema(
    {
        country_code: {
            type: String
        },
        mobile: {
            type: String
        },
        uuid: {
            type: String,
            required: true
        },
        otp: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        send_attempts: {
            type: Number,
            default: 1
        },
        verified: {
            type: Boolean,
            default: false
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser"
        },
    },
    { timestamps: true }
);

export default mongoose.model("Otp2fa", otp2faSchema);
