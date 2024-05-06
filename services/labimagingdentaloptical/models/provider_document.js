import mongoose from "mongoose";

const providerDocumentsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    doc_name: {
      type: String,
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
    upload_date: {
      type: String,
    },
    type: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProviderDocs", providerDocumentsSchema);
