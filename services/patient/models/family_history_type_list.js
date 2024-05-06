import mongoose from "mongoose";

const familyHistoryTypeListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("FamilyHistoryTypeList", familyHistoryTypeListSchema);
