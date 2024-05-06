import mongoose from "mongoose";

const ExclusionDataSchema = new mongoose.Schema(
  {
    brand_name: {
      type: String,
      required: true,
    },
    exclusion_inn: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      default: "",
    },
    in_exclusion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exclusion",
      required: true,
    },
    status: {
      type: Boolean,
      required: true,
      default: false,
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExclusionData", ExclusionDataSchema);
