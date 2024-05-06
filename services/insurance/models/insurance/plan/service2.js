import mongoose from "mongoose";

const ServiceNewSchema = new mongoose.Schema(
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
            max_no: {
                type: Number,
            },
            unit_no: {
                type: Number,
            },
            unit: {
                type: String,
                enum: [
                    "Year",
                    "Month",
                    "Day"
                ],
                default:"Year"
            },
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
            min_no: {
                type: Number,
            },
            unit: {
                type: String,
                enum: [
                    "Year",
                    "Month",
                    "Day"
                ],
                default: "Year"
            },
      },
      redeemed: {
        type: String,
        required: true,
      },
    },
    has_category: {
      type: String,
      required: true,
    },
    primary_and_secondary_category_limit:{
      type: Number,
      required: true,
    },
    service: {
        type: String,
        required: true,
    },
    primary_and_secondary_service_limit:{
      type: Number,
      required: true,
    },
    service_code: {
      type: String,
      required: true,
  },
  total_max_duration_in_days:{
    type: Number,
    required: true,
  },
  max_extend_duration_in_days:{
    type: Number,
    required: true,
  },
    comment: {
        type: String,
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
    addedBy:{
      type: mongoose.Schema.Types.ObjectId,
    }
  },
  { timestamps: true }
);

export default mongoose.model("PlanServiceNew", ServiceNewSchema);
