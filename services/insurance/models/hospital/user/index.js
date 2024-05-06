import mongoose, { Mongoose, now, Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2"
const hospitalUserSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique:true
        },
        password: {
            type: String,
            required: true
        },
        userType: {
            type: String,
            default:"admin"
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "hospitalusers"
        },
        isApproved:{
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: {
            type: Date,
            Default: Date.now
        }
    }
);
hospitalUserSchema.plugin(mongoosePaginate);
export default mongoose.model("HospitalUser", hospitalUserSchema);
