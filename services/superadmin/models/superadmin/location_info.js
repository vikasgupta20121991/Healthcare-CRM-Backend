import mongoose from "mongoose";

const locationInfoSchema = new mongoose.Schema(
  {
    address: {
      type: String,
    },
    neighborhood: {
      type: String,
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      default: null
    },
    region: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Region",
     default: null
    },
    province: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Province",
     default: null
    },
    department: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Department",
     default: null
    },
    city: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "City",
     default: null
    },
    village: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Village",
     default: null
    },
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Superadmin",
     },
    pincode: {
      type: String,
    }
  },
  { timestamps: true }
);

export default mongoose.model("LocationInfo", locationInfoSchema);
