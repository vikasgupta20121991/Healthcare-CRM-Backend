import mongoose, { Mongoose, now, Schema } from "mongoose";

const claimFieldSchema = new mongoose.Schema(
    {
        fieldType: {
            type: String
        },
        fieldName: {
            type: String
        }
    },
    { timestamps: true }
);

export default mongoose.model("ClaimField", claimFieldSchema);
