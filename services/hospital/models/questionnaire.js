import mongoose from "mongoose";

const questionnaireSchema = new mongoose.Schema(
    {
        controller: {
            type: String,
        },
        question: {
            type: String,
        },
        type: {
            type: String,
        },
        options: {
            type: Array,
        },
        active: {
            type: Boolean,
            default: true
        },
        required: {
            type: Boolean,
            default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            require: true
        },
    },
    { timestamps: true }
);

export default mongoose.model("Questionnaire", questionnaireSchema);
