import mongoose from "mongoose";

const staffInfoSchema = new mongoose.Schema(
  {
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    staff_name: {
      type: String,
    },
    first_name: {
      type: String,
    },
    middle_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    dob: {
      type: String,
    },
    language: {
      type: Array,
    },
    in_location: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "LocationInfo",
    },
    staff_profile: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "DocumentInfo",
    },
    degree: {
      type: String,
    },
    user_name: {
      type: String,
    },
    as_assign_to_staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffInfo",
    },
    about: {
      type: String,
    },
    doj: {
      type: Date,
      required: true,
      default: Date.now,
    },
    is_active: {
      type: Boolean,
      required: true,
      default: true,
    },
    is_locked: {
      type: Boolean,
      required: true,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    for_staff: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "AdminInfo",
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
      unique: true
    },
    last_update: {
      type: Date,
      required: false,
      default: Date.now,
    }
  },
  { timestamps: true }
);

export default mongoose.model("StaffInfo", staffInfoSchema);
