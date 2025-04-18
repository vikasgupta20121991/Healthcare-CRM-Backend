import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
    {
        portalId: {
      type: String,
            default: null
        },
        // portalId: {
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
        },
        portal_type: {
            type: String,
            enum: [
                "Paramedical-Professions",
                "Dental",
                "Laboratory-Imaging",
                "Optical"
            ],
        },

  },
  { timestamps: true }
);

export default mongoose.model("Reminder", reminderSchema);
