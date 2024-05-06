import mongoose from "mongoose";

const geoJsonSchema = new mongoose.Schema(
  {
      type: {
          type: String,
          default: "Point"
      },
      coordinates: {
          type: [Number],
          index: "2dsphere",
          default: [0, 0]
      }
  }
)

const hospitalLocationSchema = new mongoose.Schema(
  {
    hospital_or_clinic_location: [
      {
        loc: geoJsonSchema,
        hospital_id: {
          type: String,
        },
        hospital_name: {
          type: String,
        },
        location: {
          type: String,
        },
        loc: {
         type:Object
        },
        country: {
          type: String,
        },
        region: {
          type: String,
        },
        province: {
          type: String,
        },
        department: {
          type: String,
        },
        city: {
          type: String,
        },
        locationFor: {
          type: String,
          enum: ['hospital', 'clinic']
        },
        isPermited: {
          type: Boolean,
          default:false
        },
        status: {
          type: String,
          enum: ['PENDING', 'APPROVED', 'REJECTED']
        },
      }
    ],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser"
    },
    type: {
      type: String,
      enum: [
          "Paramedical-Professions",
          "Dental",
          "Laboratory-Imaging",
          "Optical"
      ],
  },
  },
  { timestamps: true }
);

export default mongoose.model("HospitalLocation", hospitalLocationSchema);
