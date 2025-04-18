import mongoose from "mongoose";

const SubscriberPlanHistorySchema = new mongoose.Schema(
    {
        health_plan_for: {
            type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
        },
        plan_validity_from: {
            type: String,
        },
        plan_validity_to: {
            type: String,
        },
        subscriberId: {
            type: mongoose.Schema.Types.ObjectId,
        },
    },
    { timestamps: true }
);
export default mongoose.model("SubscriberPlanHistory", SubscriberPlanHistorySchema);