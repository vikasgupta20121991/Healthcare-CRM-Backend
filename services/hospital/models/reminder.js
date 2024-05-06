import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
    {
        doctorId: {
            type: String,
            default: null
        },
        // doctorId: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     required: true,
        //     ref: "PortalUser",
        // },
        appointment_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Appointment",
        },
        minutes: {
            type: Number,
            default: null
        },
        hours: {
            type: Number,
            default: null
        },
        datetime: {
            type: String,
            default: null
        },
        patientId: {
            type: String,
            default: null
        },
        status: {
            type: Number,
            default: 0
        }

  },
  { timestamps: true }
);

export default mongoose.model("Reminder", reminderSchema);
