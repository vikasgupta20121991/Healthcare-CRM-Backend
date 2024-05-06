import mongoose from "mongoose";

const ExclusionSchema = new mongoose.Schema(
  {
    for_plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    in_exclusion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExclusionData",
      required: true,
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlanExclusion", ExclusionSchema);
