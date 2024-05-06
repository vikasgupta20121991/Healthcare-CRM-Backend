import mongoose, { Mongoose, now, Schema } from "mongoose";
const ImagingTestSchema = new mongoose.Schema(
    {
        category: {
            type: String,
        },
        imaging: {
            type: String,
        },
        description: {
            type: String,
        },
        clinical_consideration: {
            type: String,
        },
        normal_values: {
            type: String,
        },
        abnormal_values: {
            type: String,
        },
        contributing_factors_to_abnormal: {
            type: String,
        },
        procedure: {
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
        contraindications: {
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
                default: true
            },
        },
    },
    { timestamps: true }
);
export default mongoose.model("ImagingTest", ImagingTestSchema);
