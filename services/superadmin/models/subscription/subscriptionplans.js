import mongoose, { Mongoose, now, Schema } from "mongoose";

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    plan_for: {
      type: String,
      required: true
    },
    plan_name: {
      type: String,
      required: true
    },
    services: [{
      name: {
        type: String,
      },
      is_unlimited: {
        type: Boolean,
      },
      max_number: {
        type: Number,
      },
    }],
    plan_price: {
      type: String,
      required: true
    },
    plan_duration: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PlanPeriodical"    
    },
    is_activated: {
      type: Boolean,
      default:true
    },
    is_deleted: {
      type: Boolean,
      default:false
    },
    createdBy:{
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    }
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);