import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    default: {
      type: Boolean,
      required: true,
      default: false,
    },
    total_care_limit: {
      primary_care_limit: {
        type: Number,
        required: true,
        default: 0,
      },
      secondary_care_limit: {
        type: Number,
        required: true,
        default: 0,
      },
      grand_total: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Plan", PlanSchema);
