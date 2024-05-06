import mongoose from "mongoose";

const claimStaffDetails = new mongoose.Schema(
    {
        claim_object_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        staff_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        staff_role_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        isView: {
            type: Boolean,
            default: false
        },
        amount: {
            type: Number
        },
        level: {
            type: Number,
        }
    },
    { timestamps: true }
);

export default mongoose.model("claimStaffDetails", claimStaffDetails);
