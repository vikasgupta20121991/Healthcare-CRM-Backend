import mongoose from "mongoose";
const cardPreviewSchema = new mongoose.Schema(
    {
        cardPreviewName: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);
export default mongoose.model("CardPreview", cardPreviewSchema);
