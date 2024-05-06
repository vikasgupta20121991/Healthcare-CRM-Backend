import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
        },
        middle_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        email: {
            type:String,
            default: null
        },
        phone: {
            type:String,
        },
        address: {
            type: String,
            required: true,
        },
        created_By: {
            type: mongoose.Schema.Types.ObjectId,
        },
        verify_status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "SEND"],
        }

    },
    { timestamps: true }
);

export default mongoose.model("Invitation", invitationSchema);
