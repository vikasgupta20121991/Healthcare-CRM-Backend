import mongoose, { Mongoose, now, Schema } from "mongoose";

const superadminSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique:true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        forgotPasswordOTP:{
            type: String
        },
        ipAddress:{
            type: String,
            default:"ip"
        }
    }
);

export default mongoose.model("Superadmin", superadminSchema);
