import mongoose from "mongoose";

const FAQSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        faqs: [{
            question: {
                type: String,
            },
            answer: {
                type: String,
            },
            language: {
                type: String,
                enum:["en", "fr"]
            },
            active: {
                type: Boolean,
                required: true,
                default: true
            },
            is_deleted: {
                type: Boolean,
                required: true,
                default: false
            },
        }],
        type: {
            type: String,
        },
    },
    { timestamps: true }
);
export default mongoose.model("FAQ", FAQSchema);