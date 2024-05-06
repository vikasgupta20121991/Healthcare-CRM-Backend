import mongoose from "mongoose";

const portalUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true          
        },
        userId: {
            type: String
        },
        password: {
            type: String,
            required: true,
        },
        user_name: {
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
        country_code: {
            type: String,
            required: true,
            default: "+91"
        },
        phone_number: {
            type: String,
        },
        date_of_creation: {
            type: String,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: String,
            default: "self",
            enum: [
                "self",
                "super-admin"
            ],
        },
        last_update: {
            type: Date,
            required: false,
            default: Date.now,
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
        role: {
            type: String,
            required: true,
            enum: [
                "PHARMACY_ADMIN",
                "PHARMACY_STAFF"
            ],
        },
        permissions: {
            type: Array,
            default: null
        },
        average_rating: {
            type: String,
            default: 0
        },
        staff_createdBy: {
            type: String,
            ref:"PortalUser"
        },
        isOnline:{
            type:Boolean,
            default:false 
        },
        socketId:{
             type:String
        },
        fcmToken: {
            type: String,
            default: null,
        },
        profile_picture:{
            type: String
        },
        notification:{
            type:Boolean,
            default:true
        }
    },
    { timestamps: true }
);

export default mongoose.model("PortalUser", portalUserSchema);
