import mongoose from "mongoose";

const VillageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        department_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
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
export default mongoose.model("Village", VillageSchema);