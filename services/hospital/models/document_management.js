import mongoose from "mongoose";

const docManagementSchema = new mongoose.Schema(
  {
    document_details: [
      {
        doc_name: {
          type: String,
        },
        issue_date: {
          type: Date
        },
        expiration_date: {
          type: Date
        },
        image_url: {
          type: String
        }
      }
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DocumentManagement", docManagementSchema);
