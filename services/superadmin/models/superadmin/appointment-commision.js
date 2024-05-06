import mongoose from "mongoose";

const appointmentCommissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['hospital_doctor', 'individual_doctor']
    },
    online: {
      flat_fee: {
        type: Number
      },
      percentage_fee: {
        type: Number
      },
    },
    home_visit: {
      flat_fee: {
        type: Number
      },
      percentage_fee: {
        type: Number
      },
    },
    face_to_face: {
      flat_fee: {
        type: Number
      },
      percentage_fee: {
        type: Number
      },
    },  
    for_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Superadmin",
    },
    createdBy:{
      type: mongoose.Schema.Types.ObjectId,
      required : false
    }
  },
  { timestamps: true }
);

export default mongoose.model("AppointmentCommission", appointmentCommissionSchema);
