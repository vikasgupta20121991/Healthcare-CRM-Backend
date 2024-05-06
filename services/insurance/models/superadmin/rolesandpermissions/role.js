import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      required: true,
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

export default mongoose.model("SuperAdminRole", RoleSchema);
