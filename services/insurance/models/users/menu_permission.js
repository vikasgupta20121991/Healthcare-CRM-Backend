import mongoose from "mongoose";
import menu from "./menu_model";
import permission from "./permission_model";
import role from "../insurance/role_model";

const menuPermissionSchema = new mongoose.Schema({    
    menu_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menus"
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
    },
    permission_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permissions"
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });


export default mongoose.model("menu_permissions", menuPermissionSchema);