import mongoose from "mongoose";


const RegionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        country_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
        },
        is_deleted: {
            type: Boolean, default: false
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            required :false
        }
    },
    { timestamps: true }
);
RegionSchema.index({ name: 1, country_id: 1 }, { unique: true });
export default mongoose.model("Region", RegionSchema);