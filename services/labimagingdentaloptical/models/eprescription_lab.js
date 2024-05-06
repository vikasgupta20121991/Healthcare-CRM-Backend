import mongoose from "mongoose";

const eprescriptionLabSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        labId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        lab_name: {
            type: String
        },
        portalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        reason_for_lab: {
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

export default mongoose.model("EprescriptionLab", eprescriptionLabSchema);
