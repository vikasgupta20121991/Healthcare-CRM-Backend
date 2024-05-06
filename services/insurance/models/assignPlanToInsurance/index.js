import mongoose, { Mongoose, now, Schema } from "mongoose";

const insuranceAssignPlanSchema = new mongoose.Schema(
    {
        insuranceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "PortalUser"
        },
        categories: [
            {
                categoryId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "Category"
                },
                categoryServiceId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "CategoryService"
                }
            }
        ],
        exclusions: [
            {
                exclusionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "Exclusion"
                },
                exclusionDataId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "ExclusionData"
                }
            }
        ]
    },
    { timestamps: true }
);

export default mongoose.model("InsuranceAssignPlan", insuranceAssignPlanSchema);
