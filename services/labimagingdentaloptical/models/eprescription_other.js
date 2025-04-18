import mongoose from "mongoose";

const eprescriptionOtherSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        otherId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        portalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        other_name: {
            type: String
        },
    reason_for_other: {
            type: String
        },
        relevant_clinical_information: {
            type: String
        },
        specific_instruction: {
            type: String
        },
        comment: {
            type: String
        },
        portal_type: {
            type: String,
            enum: [
                "Paramedical-Professions",
                "Dental",
                "Laboratory-Imaging",
                "Optical"
            ],
        },

    },
    { timestamps: true }
);

export default mongoose.model("EprescriptionOther", eprescriptionOtherSchema);
