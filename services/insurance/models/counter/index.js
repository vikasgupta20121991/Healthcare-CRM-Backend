import mongoose, { now, Schema } from "mongoose";
const counterSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
        },
        sequence_value: {
            type: Number,
        }
    }
);


export default mongoose.model("Counter", counterSchema);
