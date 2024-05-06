import mongoose from "mongoose";

const familyInfoSchema = new mongoose.Schema(
  {
    family_members: [{
      first_name:{
        type:String,
      },
      last_name:{
        type:String,
      },
      ssn_number:{
        type:String,
      },
      gender:{
        type:String,
      },
      dob:{
        type:String,
    },
    relationship: {
        type: String,
    },
      mobile_number:{
        type:String,
      }
    }],
    medical_history: [{
      allergy_type:{
        type:String,
      },
      allergen:{
        type:String,
      },
      note:{
        type:String,
      },
      reaction:{
        type:String,
      },
      status:{
        type:String,
      },
      created_date:{
        type:String,
      }
    }],
    social_history: [{
      alcohol:{
        type:Boolean,
      },
      tobacco:{
        type:Boolean,
      },
      drugs:{
        type:Boolean,
      },
      occupation:{
        type:String,
        },
        travel: {
            type: String,
        },
      start_date:{
        type:String,
      }
    }],
    for_portal_user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PortalUser",
      unique: true
    },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyInfo", familyInfoSchema);
