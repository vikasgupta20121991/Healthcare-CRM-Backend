import mongoose from "mongoose";

const locationInfoSchema = new mongoose.Schema(
    {
        address: {
            type: String,
        },
        neighborhood: {
            type: String,
        },
        country: {
            type: String,
        },
        region: {
            type: String,
        },
        province: {
            type: String,
        },
        department: {
            type: String,
        },
        city: {
            type: String,
        },
        village: {
            type: String,
        },
        pincode: {
            type: String,
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("LocationInfo", locationInfoSchema);
