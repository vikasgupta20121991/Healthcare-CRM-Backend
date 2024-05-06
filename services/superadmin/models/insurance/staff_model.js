import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    language: {
        type: String,
        required:true
    },
    address: {
        type: String,
        required:true
    },
    city: {
        type: String
    },
    zip: {
        type: String,
        required:true
    },
    country: {
        type: String,
        required:true
    },
    state: {
        type: String,
        required:true
    },
    degree: {
        type: String,
        required: true
    },
    phone_no: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    for_role: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'role'
    },
    username: {
        type: String,
        required: true,
        unique:true
    },
    user_status:{
        type:String,
        default:'Pending',
        enum:["Pending","Approve","Declined","Deleted"]
    },
    password: {
        type: String,
        required: true
    },
    created_by: {
        type: String,
        default:"Admin",
        enum:['Admin','Self']
    },
    about_staff: {
        type: String
    }
}, { timestamps: true });


export default mongoose.model("Staff", staffSchema);