import mongoose from "mongoose";

const medicineClaimDocSchema = new mongoose.Schema(
    {
        documentType: {
            type: String
        },
        document_url: {
            type: String
        },
        document_signed_url: {
            type: String,
            default: ""
        },
        fileName: {
            type: String,
            default: ""
        },
        for_medicine_claim: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "MediClaimCommonInfo",
        },

        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicineClaimDoc", medicineClaimDocSchema);
