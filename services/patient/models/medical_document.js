import mongoose from "mongoose";

const medicalDocumentSchema = new mongoose.Schema(
    {
        // medical_document: [{
            name: {
                type: String,
                default: null
            },
            issue_date: {
                type: String,
                default: null
            },
            expiration_date: {
                type: String,
                default: null
            },
            image: {
                type: String,
                default: null
            },
            image_signed_url: {
                type: String,
                default: ""
            },
        // }],
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicalDocument", medicalDocumentSchema);
