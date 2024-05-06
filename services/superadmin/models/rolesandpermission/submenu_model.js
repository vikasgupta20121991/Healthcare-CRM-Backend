import mongoose from "mongoose";

const submenuSchema = new mongoose.Schema({
    parent_id:{
        type:String,
        required:true
    },
    module_type:{
        type:String,
        required:true,
    },
    submenu: {
        type: Object
    },
    status: {
        type: Boolean,
        default:true
    },
}, { timestamps: true });


export default mongoose.model("Submenu", submenuSchema);