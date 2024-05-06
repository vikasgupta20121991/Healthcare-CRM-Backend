import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
    
    menu_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "menus"
    },
    perm_name: {
        type: String,
        required:true
    },
    status: {
        type: Boolean,
        required:true,
        default:true
    }
}, { timestamps: true });


export default mongoose.model("Permissions", permissionSchema);