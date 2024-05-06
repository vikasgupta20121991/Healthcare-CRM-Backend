import mongoose from "mongoose";

const doctorInfoSchema = new mongoose.Schema(
  {
    in_profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfileInfo",
    },
    title: {
      type: String,
    },
    exp_years: {
      type: Number,
      required: true,
    },
    unite: {
      type: String,
    },
    licence_number: {
      type: String
    },
    as_staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PortalUser",
      },
    ],
    specilaization: {
      specility: {
        type: String,
      },
      services: {
        type: String,
      },
      department: {
        type: String,
      },
      unit: {
        type: String,
      },
      expertise: {
        type: String,
      },
    },
    act: {
      paramedical_performed: [
        {
          type: String,
        },
      ],
      medical_performed: [
        {
          type: String,
        },
      ],
    },
    consultation_fee: [
      {
        type: {
          type: String,
        },
        fee: {
          type: String,
        },
        additional_info: {
          type: String,
        },
      },
    ],
    in_hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalAdminInfo",
    },
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
      unique: true
    },
  },
  { timestamps: true }
);

export default mongoose.model("DoctorInfo", doctorInfoSchema);
