import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    location_id: {
      type: String,
    },
    week_days: [{
      sun_start_time: {
        type: String,
      },
      sun_end_time: {
        type: String,
      },
      mon_start_time: {
        type: String,
      },
      mon_end_time: {
        type: String,
      },
      tue_start_time: {
        type: String,
      },
      tue_end_time: {
        type: String,
      },
      wed_start_time: {
        type: String,
      },
      wed_end_time: {
        type: String,
      },
      thu_start_time: {
        type: String,
      },
      thu_end_time: {
        type: String,
      },
      fri_start_time: {
        type: String,
      },
      fri_end_time: {
        type: String,
      },
      sat_start_time: {
        type: String,
      },
      sat_end_time: {
        type: String,
      },
    }],
    slot_interval: {
      type: String,
    },
    appointment_type: {
      type: String,
      enum: ["ONLINE", "FACE_TO_FACE", "HOME_VISIT"],
    },
    availability_slot: [
      {
        date: {
          type: String,
        },
        start_time: {
          type: String,
        },
        end_time: {
          type: String,
        },
      },
    ],
    unavailability_slot: [
      {
        date: {
          type: String,
        },
        start_time: {
          type: String,
        },
        end_time: {
          type: String,
        },
      },
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
    type: {
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

export default mongoose.model("Availability", availabilitySchema);
