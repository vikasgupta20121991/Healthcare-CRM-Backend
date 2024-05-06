import mongoose from "mongoose";

const lifestyleTypeListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("LifestyleTypeList", lifestyleTypeListSchema);
