import mongoose from "mongoose";

const AboutUsSchema = new mongoose.Schema(
  {
        _id: {
            type: String,
        },
        text: {
            type: String,
        },
        type:{
            type:String
        }
    },
    { timestamps: true }
);
export default mongoose.model("AboutUs", AboutUsSchema);