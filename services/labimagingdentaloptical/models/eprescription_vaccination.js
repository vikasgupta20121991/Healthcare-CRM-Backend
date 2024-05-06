import mongoose from "mongoose";

const eprescriptionVaccinationSchema = new mongoose.Schema(
    {
        ePrescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Eprescription",
        },
        vaccinationId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        portalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        vaccination_name: {
            type: String
        },
        dosage: {
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

export default mongoose.model("EprescriptionVaccination", eprescriptionVaccinationSchema);
