import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    parent_id:{
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
    module_type: {
        type: String,
        default: ''
    },
    menu_order: {
        type: Number,
        required: true
    },
    menu_status: {
        type: Boolean,
        required: true,
        default: true
    },
    route_path: {
        type: String,
        default: '/'
    },
    menu_icon: {
        type: String,
        default: ''
    },
    menu_icon_hover: {
        type: String,
        default: ''
    },
}, { timestamps: true });


export default mongoose.model("Menus", menuSchema);