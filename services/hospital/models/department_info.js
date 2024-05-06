import mongoose from "mongoose";

const departmentInfoSchema = new mongoose.Schema(
    {
        department: {
            type: String,
            required: true,
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
export default mongoose.model("Department", departmentInfoSchema);