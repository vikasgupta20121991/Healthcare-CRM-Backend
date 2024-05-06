import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        province_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Province",
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
export default mongoose.model("Department", DepartmentSchema);