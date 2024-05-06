import mongoose from "mongoose";

const specialtyInfoSchema = new mongoose.Schema(
    {
        specilization: {
            type: String,
            required: true,
        },
        // category: {
        //     type: Array,
        //     required: true,
        // },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
        },
        active_status: {
            type: Boolean,
            default: true
        },
        delete_status: {
            type: Boolean,
            required: true,
            default: false
        },
    },
    { timestamps: true }
);
export default mongoose.model("Specialty", specialtyInfoSchema);