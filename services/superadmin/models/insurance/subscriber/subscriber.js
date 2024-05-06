import mongoose from "mongoose";

const SubscriberSchema = new mongoose.Schema(
  {
    subscriber_type: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriberType",
    },
    subscription_for: {
        type: String,
        required: true,
    },
    health_plan_for: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
    },
    secondary_subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InsuranceSubscriber",
    },
    relationship: {
        type: String,
    },
    subscriber_name: {
      type: String,
      required: true,
    },
    date_of_birth: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    policy_id: {
        type: String,
    },
    card_id: {
        type: String,
    },
    employee_id: {
        type: String,
    },
    phone_no: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
    },
    country: {
        type: String,
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("InsuranceSubscriber", SubscriberSchema);