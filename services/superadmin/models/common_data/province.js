import mongoose from "mongoose";

const ProvinceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        region_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Region",
        },
        is_deleted:{
            type: Boolean, default: false
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            required :false
        }
    },
    { timestamps: true }
);
export default mongoose.model("Province", ProvinceSchema);