import mongoose from "mongoose";

const expertiseInfoSchema = new mongoose.Schema(
    {
        expertise: {
            type: String,
            required: true,
            // unique: true
        },
        // category: {
        //     type: Array,
        //     required: true,
        // },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser"
        },
        active_status: {
            type: Boolean,
            required: true,
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
export default mongoose.model("Expertise", expertiseInfoSchema);