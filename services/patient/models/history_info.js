import mongoose from "mongoose";

const historyInfoSchema = new mongoose.Schema(
    {
        patient_history: [{
            type: {
                type: String,
            },
            name: {
                type: String,
            },
            start_date: {
                type: String,
            }
        }],
        allergies: [{
            type: {
                type: String,
            },
            start_date: {
                type: String,
            }
        }],
        lifestyle: [{
            type: {
                type: String,
            },
            type_name: {
                type: String,
            },
            start_date: {
                type: String,
            }
        }],
        familial_history: [{
            relationship: {
                type: String,
            },
            family_history_type: {
                type: String,
            },
            history_name: {
                type: String,
            },
            start_date: {
                type: String,
            },
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

export default mongoose.model("HistoryInfo", historyInfoSchema);
