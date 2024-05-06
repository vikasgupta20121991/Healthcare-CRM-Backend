import mongoose from "mongoose";

const insuranceCompanySchema = new mongoose.Schema(
  {
    accepted: {
      type: String,
    },
    company_name: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
      unique: true
    },
  },
  { timestamps: true }
);

export default mongoose.model("InsuranceCompany", insuranceCompanySchema);
