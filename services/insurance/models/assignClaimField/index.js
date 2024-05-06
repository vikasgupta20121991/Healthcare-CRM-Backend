import mongoose, { Mongoose, now, Schema } from "mongoose";

const assignClaimFieldSchema = new mongoose.Schema(
    {
        primaryClaimField: [
            {
                fieldId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ClaimField",
                }
            }
        ],
        secondaryClaimField: [
            {
                fieldId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ClaimField",
                }
            }
        ],
        accidentRelatedField: [
            {
                fieldId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ClaimField",
                }
            }
        ],
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("AssignClaimField", assignClaimFieldSchema);
