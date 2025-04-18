import mongoose from "mongoose";

const insuranceInfoSchema = new mongoose.Schema(
    {
        // primary_insured: {
        //     first_name: {
        //         type: String,
        //     },
        //     middle_name: {
        //         type: String,
        //     },
        //     last_name: {
        //         type: String,
        //     },
        //     gender: {
        //         type: String,
        //     },
        //     dob: {
        //         type: String,
        //     },
        //     insurance_id: {
        //         type: String,
        //     },
        //     policy_id: {
        //         type: String,
        //     },
        //     employee_id: {
        //         type: String,
        //     },
        //     card_id: {
        //         type: String,
        //     },
        //     insurance_holder_name: {
        //         type: String,
        //     },
        //     insurance_validity_from: {
        //         type: String,
        //     },
        //     insurance_validity_to: {
        //         type: String,
        //     },
    //     reimbursement_rate: {
        //         type: String,
        //     },
        //     insurance_card_and_id_image: {
        //         type: String,
        //     }
        // },
        // is_primary_is_secondary: {
        //     type: Boolean,
        // },
        // secondary_insured: {
        //     relationship: {
        //         type: String,
        //     },
        //     first_name: {
        //         type: String,
        //     },
        //     middle_name: {
        //         type: String,
        //     },
        //     last_name: {
        //         type: String,
        //     },
        //     gender: {
        //         type: String,
        //     },
        //     dob: {
        //         type: String,
        //     },
        //     insurance_id: {
        //         type: String,
        //     },
        //     policy_id: {
        //         type: String,
        //     },
        //     employee_id: {
        //         type: String,
        //     },
        //     card_id: {
        //         type: String,
        //     },
        //     insurance_holder_name: {
        //         type: String,
        //     },
        //     insurance_validity_from: {
        //         type: String,
        //     },
        //     insurance_validity_to: {
        //         type: String,
        //     },
        //     reimbursement_rate: {
        //         type: String,
        //     },
        //     insurance_card_and_id_image: {
        //         type: String,
        //     }
        // },
        primary_subscriber_id: {
      type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        secondary_subscriber_ids: [
            {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            }
        ],
        all_subscriber_ids: [
            {
                subscriber_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null
                },
                name: {
                    type: String,
                    default: null
                },
                subscription_for: {
                    type: String,
                    default: null
                },
            }
        ],
        subscriber_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        insurance_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
            unique: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("InsuranceInfo", insuranceInfoSchema);
