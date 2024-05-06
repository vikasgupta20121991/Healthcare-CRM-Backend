import mongoose, { Schema } from "mongoose";

const hospitalStaffDetailSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        dob: {
            type: String,
        },
        language: {
            type: String,
        },
        address: {
            type: String,
        },
        city: {
            type: String,
        },
        zip: {
            type: String,
        },
        country: {
            type: String,
        },
        state: {
            type: String,
        },
        degree: {
            type: String,
        },
        phone: {
            type: Number,
        },
        email: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['Manager', 'Nurse', 'Receptionist'],
            required:true
        },
        userName: {
            type: String,
            required:true
        },
        password: {
            type: String,
            required: true
        },
        // addDoctor: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "hospitalusers"
        // },
        about: {
            type: String
        },
        doj: {
            type: String
        },
        isActive: {
            type: Boolean,
            default:true
        },
        isLockUser: {
            type: Boolean,
            default:false
        },
        userObjectID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "hospitalusers"
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "hospitalusers"
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: {
            type: Date,
            default: Date.now
        }
    }
);

export default mongoose.model("HospitalStaffDetail", hospitalStaffDetailSchema);