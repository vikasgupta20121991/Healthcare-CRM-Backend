import mongoose from "mongoose";

const reasonForAppointmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        active: {
            type: Boolean,
            default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            require: true
        },
        selectedlocation:{
            type: mongoose.Schema.Types.ObjectId,
        }
    },
    { timestamps: true }
);

export default mongoose.model("ReasonForAppointment", reasonForAppointmentSchema);
