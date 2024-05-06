import mongoose, { Mongoose, now, Schema } from "mongoose";
const vaccinationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        active: {
            type: Boolean,
            default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        is_deleted: {
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
export default mongoose.model("Vaccination", vaccinationSchema);
