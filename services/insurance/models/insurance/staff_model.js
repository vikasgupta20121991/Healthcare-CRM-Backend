import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dob: {
        type: Date,
            },
    language: {
        type: String,
        
    },
    address: {
        type: String,
        
    },
    city: {
        type: String
    },
    zip: {
        type: String,
        
    },
    country: {
        type: String,
        
    },
    state: {
        type: String,
        
    },
    degree: {
        type: String,
            },
    phone_no: {
        type: String,
            },
    email: {
        type: String,
        
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