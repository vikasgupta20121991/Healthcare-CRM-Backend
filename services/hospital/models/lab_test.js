import mongoose, { Mongoose, now, Schema } from "mongoose";
const LabTestSchema = new mongoose.Schema(
    {
        category: {
            type: String,
        },
        lab_test: {
            type: String,
        },
        description: {
            type: String,
        },
        contributing_factors_to_abnormal_values: {
            type: String,
        },
        normal_value: {
            blood: {
                type: String,
            },
            urine: {
                type: String,
            },
        },
        possible_interpretation_of_abnormal_blood_value: {
            high_levels: {
                type: String,
            },
            low_levels: {
                type: String,
            },
        },
        possible_interpretation_of_abnormal_urine_value: {
            high_levels: {
                type: String,
            },
            low_levels: {
                type: String,
            },
        },
        blood_procedure: {
            before: {
                type: String,
            },
            during: {
                type: String,
            },
            after: {
                type: String,
            },
        },
        urine_procedure: {
            before: {
                type: String,
            },
            during: {
                type: String,
            },
            after: {
                type: String,
            },
        },
        clinical_warning: {
            type: String,
        },
        other: {
            type: String,
        },
        link: {
            type: String,
        },
        active: {
            type: Boolean,
            default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        is_new: {
            type: Boolean,
            default: false
        },
        added_by: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                require: true
            },
            user_type: {
                type: String,
                default: null
            },
        }
    },
    { timestamps: true }
);
export default mongoose.model("LabTest", LabTestSchema);
