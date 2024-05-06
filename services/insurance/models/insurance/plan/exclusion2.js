import mongoose from "mongoose";

const ExclusionNewSchema = new mongoose.Schema(
  {
    for_plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    in_exclusion: {
        category: {
            type: String,
        },
        name: {
            type: String,
        },
        brand: {
            type: String,
        },
        comment: {
            type: String,
        },
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlanExclusionNew", ExclusionNewSchema);
