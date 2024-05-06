import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
    {
        id: {
            type: String,
        },
        seq: {
           type:Number
        }

    },
);

export default mongoose.model("roleCounter", counterSchema);