import mongoose from "mongoose";

const ContactUsSchema = new mongoose.Schema(
    {
        // _id: {
        //     type: String,
        // },
        phone: {
            type: String,
        },
        email: {
            type: String,
        },
        address: {
            type: String,
        },
        type: {
            type: String,
        }
    },
    { timestamps: true }
);
export default mongoose.model("ContactUs", ContactUsSchema);