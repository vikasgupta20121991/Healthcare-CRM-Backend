import mongoose from "mongoose";

const ArticleSchema = new mongoose.Schema(
    {
        text: {
            type: String,
        },
        language: {
            type: String,
            enum: ["en", "fr"]
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
        image:{
            type:String
        }
    },
    { timestamps: true }
);
export default mongoose.model("Article", ArticleSchema);