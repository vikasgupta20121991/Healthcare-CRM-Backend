import mongoose from "mongoose";

const ExclusionSchema = new mongoose.Schema(
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
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            //   ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Exclusion", ExclusionSchema);
