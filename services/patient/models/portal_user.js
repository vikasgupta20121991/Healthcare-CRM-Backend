import mongoose from "mongoose";

const portalUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
        },
        userId: {
            type: String,
        },
        password: {
            type: String,
        },
        user_name: {
            type: String,
        },
        country_code: {
            type: String,
            default: "+91"
        },
        mobile: {
            type: String,
            
        },
        last_update: {
            type: Date,
            required: false,
            default: Date.now,
        },
        role: {
            type: String,
            default: "PATIENT",
        },
        lock_user: {
            type: Boolean,
            required: false,
            default: false
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false
        },
        isActive: {
            type: Boolean,
            required: false,
            default: true
        },
        verified: {
            type: Boolean,
            default: false,
        },
        ipAddress: {
            type: String,
            default: "ip",
        },
        fcmToken: {
            type: String,
            default: null,
        },
        notification:{
            type:Boolean,
            default:true
        },
        full_name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("PortalUser", portalUserSchema);
