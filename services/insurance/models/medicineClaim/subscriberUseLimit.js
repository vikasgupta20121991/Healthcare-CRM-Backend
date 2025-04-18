import mongoose from "mongoose";

const subscriberUseLimit = new mongoose.Schema(
    {
        subscriber_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        service_name: {
            type: String
        },
        category_name: {
            type: String,
        },
        category_limit: {
            type: Number
        },
        family_service_limit: {
            type: Number
        },
        family_category_limit: {
            type: Number
        },
        number_of_service_count: {
            type: Number
        },
        family_total_limit: {
            type: Number
        },
        own_limit: {
      type: Number,
        },
        plan_validity: {
            type: String
        },
        service_limit: {
            type: Number
        }

    },
    { timestamps: true }
);

export default mongoose.model("subscriberUseLimit", subscriberUseLimit);
