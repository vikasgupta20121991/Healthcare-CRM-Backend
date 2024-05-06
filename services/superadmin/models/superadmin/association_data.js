import mongoose, { Mongoose, now, Schema } from "mongoose";
const associationData = new mongoose.Schema(
    {
        association_group_type: {
            type: String,
        },
        association_group_data: {
            type: Array,
        },
        createdBy:{
            type: mongoose.Schema.Types.ObjectId,
            required : false
        }
    },
    { timestamps: true }
);
export default mongoose.model("AssociationData", associationData);
