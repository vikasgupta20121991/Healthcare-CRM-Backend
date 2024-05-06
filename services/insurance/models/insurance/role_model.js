import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        status: {
            type: Boolean,
            required: true,
            default: false,
        },
        is_delete: {
            type: String,
            enum: ['Yes', 'No'],
            default: 'No'
        },
        role_id:{
            type:Number
            // required:true
        },
        for_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PortalUser",
            required: true,
        },
        dateofcreation:{
            type: String,
        }
    },
    { timestamps: true }
);

export default mongoose.model("Role", roleSchema);