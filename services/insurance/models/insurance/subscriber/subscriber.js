import mongoose from "mongoose";

const SubscriberSchema = new mongoose.Schema(
    {
        subscriber_type: {
            type: String,
            index:true
        },
        subscription_for: {
            type: String,
            index:1
        },
        unique: {
            type: Number,
            index:true
        },
        insurance_type: {
            type: String
        },
        health_plan_for: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
        },
        secondary_subscriber: {
            type: Array,
            default: [],
        },
        relationship_with_insure: {
            type: String,
        },
    company_name: {
            type: String,
        },
        subscriber_full_name: {
            type: String,
        },
        subscriber_first_name: {
            type: String,
        },
        subscriber_middle_name: {
            type: String,
        },
        subscriber_last_name: {
            type: String,
        },
        date_of_birth: {
            type: String,
        },
        mobile: {
            type: String,
        },
        country_code: {
            type: String,
        },
        age: {
            type: String,
        },
        gender: {
            type: String,
        },
        insurance_id: {
            type: String,
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
        insurance_holder_name: {
            type: String,
        },
        insurance_validity_from: {
            type: String,
        },
        insurance_validity_to: {
            type: String,
        },
        reimbersement_rate: {
            type: String
        },
        insurance_card_id_proof: {
            type: String,
            default: ''
        },
        /* subscriberProfile: {
            type: String,
            default: ''
        }, */
        is_deleted: {
            type: Boolean,
            default: false,
            index:true
        },
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
            index:true
        },
        dateofcreation: {
            type: String,
        },
        dateofjoining: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true
        },
        addedBy:{
            type: mongoose.Schema.Types.ObjectId,
            default: false

        }
    },
    { timestamps: true }
);
export default mongoose.model("InsuranceSubscriber", SubscriberSchema);