import mongoose from "mongoose";

const patientHistoryTypeListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("PatientHistoryTypeList", patientHistoryTypeListSchema);
