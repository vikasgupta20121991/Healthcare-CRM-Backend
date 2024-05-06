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
        doctorId: {
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
        }
    },
    { timestamps: true }
);

export default mongoose.model("EprescriptionVaccination", eprescriptionVaccinationSchema);
