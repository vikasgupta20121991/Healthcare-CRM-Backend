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
            default: "+91"
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
                "HOSPITAL_ADMIN",
                "HOSPITAL_DOCTOR",
                "HOSPITAL_STAFF",
                "INDIVIDUAL_DOCTOR",
                "INDIVIDUAL_DOCTOR_STAFF",
            ],
        },
        createdBy: {
            type: String,
            default: "self",
            enum: [
                "self",
                "super-admin"
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
        isOnline:{
            type:Boolean,
            default:false 
        },
        socketId:{
             type:String
        },
        full_name:{
            type:String
        },
        profile_picture: {
            type: String,
        },
        created_by_user:{
            type: mongoose.Schema.Types.ObjectId   
        },
        fcmToken: {
            type: String,
            default: null,
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
