import mongoose, { Mongoose, now, Schema } from "mongoose";

const superadminSchema = new mongoose.Schema(
    {
        fullName: {
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
        mobile: {
            type: String,
        },
        country_code: {
            type: String,
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        verified: {
            type: Boolean,
            default: false,
        },
        ipAddress: {
            type: String,
            default: "ip"
        },
        isOnline: {
            type: Boolean,
            default: false
        },
        socketId: {
            type: String
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false
        }
    }
);

export default mongoose.model("Superadmin", superadminSchema);
