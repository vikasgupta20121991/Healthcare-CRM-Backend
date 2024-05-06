import mongoose from "mongoose";

const allergiesListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("AllergiesList", allergiesListSchema);
