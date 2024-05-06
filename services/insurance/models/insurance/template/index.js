import mongoose, { Mongoose, now, Schema } from "mongoose";
const templateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        }
    },
    {timestamps: true}
);
export default mongoose.model("Template", templateSchema);
