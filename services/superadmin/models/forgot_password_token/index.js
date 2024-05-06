import mongoose, { Mongoose, now, Schema } from "mongoose";

const forgotPasswordTokenSchema = new mongoose.Schema(
    {
        user_id: {
            type: String,
        },
        token: {
            type: String,
        },
        createdAt: { type: Date, expires: '15m', default: Date.now }
    }
);

export default mongoose.model("ForgotPasswordToken", forgotPasswordTokenSchema);
