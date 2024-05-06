import mongoose from "mongoose";

const staffInfoSchema = new mongoose.Schema(
    {
        in_profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProfileInfo",
        },
        degree: {
            type: String,
        },
        name: {
            type: String,
        },
        profile_picture: {
            type: String,
          },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
        },
        for_doctor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PortalUser",
            },
        ],
        for_staff: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "PortalUser",
            },
        ],
        // specialty: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Specialty",
        //     default: null
        // },
        specialty:{
            type:Array
        },
        department: [
            {
            type: mongoose.Schema.Types.ObjectId,
                default: null
            }
        ],
        services:[
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            }
        ],
        unit: [
            {
            type: mongoose.Schema.Types.ObjectId,
                default: null
            }
        ],
        expertise: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        verify_status: {
            type: String,
            default: "APPROVED",
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
        in_hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
        doj: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model("StaffInfo", staffInfoSchema);
