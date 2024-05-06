import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: Boolean,
            required: true,
            default: false,
        },
        in_category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            //   ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("CategoryService", ServiceSchema);
