import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
    {
        template_name: {
            type: String,
        },
        template_category: {
            type: String,
        },
        template_json: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        }
    },
    { timestamps: true }
);

export default mongoose.model("Template", templateSchema);
