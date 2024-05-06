import mongoose, { now, Schema } from "mongoose";
const GuestUserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },       
        token:{
            type:String
        }
    },
    { timestamps: true }
);
 
 
export default mongoose.model("GuestUser", GuestUserSchema);