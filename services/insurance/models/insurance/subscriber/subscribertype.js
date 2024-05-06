import mongoose from "mongoose";

const SubscriberTypeSchema = new mongoose.Schema(
  {
    type_name: {
        type: String,
        required: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("SubscriberType", SubscriberTypeSchema);