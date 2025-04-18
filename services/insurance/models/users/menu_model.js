import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    parent_id: {
        type:String,
        required:true,
        default:0
    },
    description: {
        type: String
    },
    slug: {
        type: String,
        required: true
    },
    url: {
        type: String
    },
    menu_order: {
        type: Number,
        required: true
    },
    menu_status: {
        type: Boolean,
        required: true,
        default: true
    }
}, { timestamps: true });


export default mongoose.model("Menus", menuSchema);