import mongoose from "mongoose";

const cardFieldSchema = new mongoose.Schema(
    {
        frontSideFields: [
            {
                fieldId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ClaimField",
                }
            }
        ],
        primaryInsuredFields:[ {
            fieldId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ClaimField",
            }
        }],
        backSideFields: [
            {
                category: {
                    type: String,
                    required: true
                },
                service: {
                    type: String,
                    required: true
                }
            }
        ],
        insuranceCompanyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminInfo",
            required: true,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false
           
        },
    },
    { timestamps: true }
);

export default mongoose.model("cardFields", cardFieldSchema);
