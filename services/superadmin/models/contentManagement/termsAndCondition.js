import mongoose from "mongoose";

const TermsAndConditionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        text: {
            type: String,
        },
        type: {
            type: String,
        },
    },
    { timestamps: true }
);
export default mongoose.model("TermsAndCondition", TermsAndConditionSchema);