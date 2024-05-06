import mongoose from "mongoose";
const EyeGlassSchema = new mongoose.Schema(
    {
        eyeglass_name: {
            type: String,
        },
        status: {
            type: Boolean,
            default: true,
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        is_new: {
            type: Boolean,
            default: false
        },
        added_by: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                require: true
            },
            user_type: {
                type: String,
                default: true
            },
        },
    },
    { timestamps: true }
);
export default mongoose.model("Eyeglass", EyeGlassSchema);
