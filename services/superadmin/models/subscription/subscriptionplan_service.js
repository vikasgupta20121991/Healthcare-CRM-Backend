import mongoose, { Mongoose, now, Schema } from "mongoose";

const SubscriptionPlanServiceSchema = new mongoose.Schema(
  {
    plan_for: {
      type: String,
    },
    service: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlanService", SubscriptionPlanServiceSchema);