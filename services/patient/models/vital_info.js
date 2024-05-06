import mongoose from "mongoose";

const vitalInfoSchema = new mongoose.Schema(
  {
    height: {
      type: String,
    },
    weight: {
      type: String,
    },
    h_rate: {
      type: String,
    },
    bmi: {
      type: String,
    },
    bp: {
      type: String,
    },
    pulse: {
      type: String,
    },
    resp: {
      type: String,
    },
    temp: {
      type: String,
    },
    blood_group: {
      type: String,
    },
    clearance: {
      type: String,
    },
    hepatics_summary: {
      type: String,
        },
        added_by: {
            type: String,
            enum: ["patient", "doctor"]
        },
        added_by_doctor: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("VitalInfo", vitalInfoSchema);
