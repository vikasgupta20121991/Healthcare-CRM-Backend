import mongoose, { Mongoose, now, Schema } from "mongoose";
const portalUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
        },
        user_name: {
            type: String,
        },
        email: {
            type: String,
        },
        country_code: {
            type: String,
            
        },
        mobile: {
            type: String,
        },
        password: {
            type: String,
        },
        // verify_status: {
        //     type: String,
        //     default: "PENDING",
        //     enum: ["PENDING", "APPROVED", "DECLINED", "DELETED"],
        // },
        verified: {
            type: Boolean,
            default: false,
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
        last_update: {
            type: Date,
            required: false,
            default: Date.now,
        },
        ip_address: {
            type: String,
            default: "ip"
        },
        role: {
            type: String,
            enum: [
                "INSURANCE_ADMIN",
                "INSURANCE_STAFF"
            ],
            default: "INSURANCE_ADMIN"
        },
        permissions: {
            type: Array,
            default: null
        },
        isOnline:{
            type:Boolean,
            default:false 
        },
        socketId:{
             type:String
        },
        profile_picture: {
            type: String,
        },
        staff_createdBy: {
            type: String,
            ref:"PortalUser"
        },
        notification:{
            type:Boolean,
            default:true
        }
    },
    { timestamps: true }
);
export default mongoose.model("PortalUser", portalUserSchema);
