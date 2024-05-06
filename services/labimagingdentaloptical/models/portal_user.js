import mongoose from "mongoose";

const portalUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,

        },
        user_id: {
            type: String,
            // required: true,
        },
        password: {
            type: String,
            required: true,
        },
        country_code: {
            type: String,
            required: true,
        },
        mobile: {
            type: String,
        },
        verified: {
            type: Boolean,
            default: false,
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
                "INDIVIDUAL",
                "HOSPITAL",
                "STAFF",
            ],
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
        createdBy: {
            type: String,
            default: "self"
        },
        permissions: {
            type: Array,
            default: null
        },
        average_rating: {
            type: String,
            default: 0
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        socketId: {
            type: String
        },
        full_name: {
            type: String
        },
        profile_picture: {
            type: String,
        },
        created_by_user: {
            type: mongoose.Schema.Types.ObjectId
        },
        fcmToken: {
            type: String,
            default: null,
        },
        isOnline:{
            type:Boolean,
            default:false 
        },
        socketId:{
             type:String
        },
        notification:{
            type:Boolean,
            default:true
        },
        isFirstTime :{
            type:Number,
            default:0
        }

    },
    { timestamps: true }
);

export default mongoose.model("PortalUser", portalUserSchema);
