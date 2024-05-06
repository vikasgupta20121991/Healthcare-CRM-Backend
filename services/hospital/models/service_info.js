import mongoose from "mongoose";

const serviceInfoSchema = new mongoose.Schema(
    {
        service: {
            type: String,
            required: true,
        },
        for_department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser"
        },
        active_status: {
            type: Boolean,
            // required: true,
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
export default mongoose.model("Service", serviceInfoSchema);