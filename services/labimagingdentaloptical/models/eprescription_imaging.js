import mongoose from "mongoose";

const eprescriptionImagingSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        imagingId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        portalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        imaging_name: {
            type: String
        },
        reason_for_imaging: {
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

export default mongoose.model("EprescriptionImaging", eprescriptionImagingSchema);
