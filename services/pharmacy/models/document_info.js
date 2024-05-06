import mongoose from "mongoose";

const documentInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    e_tag: {
      type: String,
    },
    issued_date: {
      type: Date,
    },
    expiry_date: {
      type: Date,
    },
    url: {
      type: String,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DocumentInfo", documentInfoSchema);
