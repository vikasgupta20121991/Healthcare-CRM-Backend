import mongoose from "mongoose";

const claimProcessSchema = new mongoose.Schema({
    insurance_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    roleId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    isFirst: {
        type: String,
        default: false,//0-This role is not a 1st role to get claim,1 --This role is  a 1st role to get claim
        // required: true
    },
    isLast: {
        type: String,
        default: false,  //0-This role is not a 1st role to get claim,1 --This role is  a 1st role to get claim
        // required: true
    },
    sequence: {
        type: Number,
        required: true
    },
    added_by: {
        type: String,
        enum: ["SuperAdmin", "Insurance"]

    },
    for_portal_user: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        required: false
    }
}, { timestamps: true });

export default mongoose.model("ClaimProcessRole", claimProcessSchema);