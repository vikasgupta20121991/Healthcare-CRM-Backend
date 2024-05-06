import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
    {
        in_profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StaffProfile",
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
        specialty: {
            type: Array
        },
        department: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            }
        ],
        services: [
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
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
        profile_pic_url: {
            type: String,
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
        doj: {
            type: Date,
            required: true,
            default: Date.now,
        }
    },
    { timestamps: true }
);

export default mongoose.model("StaffInfo", staffSchema);
