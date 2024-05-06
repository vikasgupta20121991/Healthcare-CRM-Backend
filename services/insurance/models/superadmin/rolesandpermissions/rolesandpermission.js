import mongoose from "mongoose";
import { superadminrole } from "./role";

const AssignPermissionToRoleSchema = new mongoose.Schema(
  {
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SuperAdminRole",
        required: true,
    },
    permission: {
        type: Object,
        required: true
    },
    staff_id: {
      type: String,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SuperAdminAssignPermissionToRole", AssignPermissionToRoleSchema);
