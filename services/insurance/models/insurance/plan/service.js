import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema(
  {
    reimbursment_rate: {
      type: Number,
      required: true,
      default: 0,
    },
    in_limit: {
      service_limit: {
        type: Number,
        required: true,
        default: 0,
      },
      category_limit: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    has_conditions: {
      repayment_condition: {
        type: String,
        required: true,
      },
      category_condition: {
        type: String,
        required: true,
      },
    },
    pre_authorization: {
      type: Boolean,
      required: true,
      default: false,
    },
    waiting_period: {
      duration: {
        type: String,
        required: true,
      },
      redeemed: {
        type: String,
        required: true,
      },
    },
    has_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryService",
      required: true,
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    for_plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlanService", ServiceSchema);
