import mongoose from "mongoose";

const medicalInfoSchema = new mongoose.Schema(
    {
        current_medicines: [{
            medicine: {
                type: String,
            },
            dose: {
                type: String,
            },
            frequency: {
                type: String,
            },
            strength: {
                type: String,
            },
            start_date: {
                type: String,
            },
            end_date: {
                type: String,
            }
        }],
        past_medicines: [{
            medicine: {
                type: String,
            },
            dose: {
                type: String,
            },
            frequency: {
                type: String,
            },
            strength: {
                type: String,
            },
            start_date: {
                type: String,
            },
            end_date: {
                type: String,
            }
        }],

        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicalInfo", medicalInfoSchema);
