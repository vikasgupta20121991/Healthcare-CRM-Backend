import mongoose from "mongoose";

const AssignStaffSchema = new mongoose.Schema(
  {
    parent_id: {
        type: String,
        required: true,
    },
    assign_to_id: {
        type: Array,
        required: true,
    },
    assign_to_name: {
        type: String,
        required: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("AssignStaff", AssignStaffSchema);