import mongoose from "mongoose";

const staffInfoSchema = new mongoose.Schema(
  {
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
      ref: "LocationInfo",
    },
    degree: {
      type: String,
    },
    role: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    about: {
      type: String,
    },
    doj: {
      type: Date,
      required: false,
      default: Date.now,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_locked: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalUser",
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
    },
    staff_profile: {
      type: String
    },
    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    }
   
  },
  { timestamps: true }
);

export default mongoose.model("StaffInfo", staffInfoSchema);
