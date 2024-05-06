import mongoose from "mongoose";

const allergyReactionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("AllergyReaction", allergyReactionSchema);
