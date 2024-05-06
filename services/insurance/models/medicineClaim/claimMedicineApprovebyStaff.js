import mongoose from "mongoose";

const claimMedicineApprovebyStaff = new mongoose.Schema(
    {
        medicine_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicineDetailsOnClaim"
        },
        claim_object_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MediClaimCommonInfo"
        },
        staff_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser"
        },
        type: {
            type: String,
            enum: ["approved", "rejected", null]
        },
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        amount: {
            type: Number,
        },
        comment: {
            type: String
        }
    },
    { timestamps: true }
);

export default mongoose.model("claimMedicineApprovebyStaff", claimMedicineApprovebyStaff);
