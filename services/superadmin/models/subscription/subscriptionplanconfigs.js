import mongoose from "mongoose";

const SubscriptionPlanConfigSchema = new mongoose.Schema(
  {
    plan_type: {
        type: String,
    },
    plan_services: {
        type: Array,
    }
  },
  { timestamps: true }
);
export default mongoose.model("SubscriptionPlanConfig", SubscriptionPlanConfigSchema);