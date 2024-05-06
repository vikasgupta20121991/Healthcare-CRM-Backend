import mongoose from "mongoose";

const medicineClaimDocSchema = new mongoose.Schema(
    {
        // documentData: [
        //     {
        //         documentType: {
        //             type: String,
        //         },
        //         documents: [
        //             {
        //                 document: {
        //                     type: String
        //                 }
        //             },
        //             {
        //                 document_signed_url: {
        //                     type: String
        //                 }
        //             },
        //         ],
        //     }
        // ],
        // eSignature: {
        //     fullName: {
        //         type: String
        //     },
        //     date: {
        //         type: String
        //     },
        //     time: {
        //         type: String
        //     },
        //     signature: {
        //         type: String
        //     },
        //     signature_signed_url: {
        //         type: String,
        //         default:""
        //     }
        // },
        documentType: {
            type: String
        },
        document_url: {
            type: String
        },
        document_signed_url: {
                type: String,
                default:""
        },
        for_medicine_claim: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "MediClaimCommonInfo",
        },
        for_portal_user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser",
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicineClaimDoc", medicineClaimDocSchema);
