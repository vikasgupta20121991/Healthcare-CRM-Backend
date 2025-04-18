import mongoose from "mongoose";

const leaves_managementSchema = new mongoose.Schema(
  {
    leave_type: {
      type: String,
    },
    subject: {
      type: String,
    },
    reason: {
      type: String,
    },
    from_date: {
      type: String,
    },
    // role_type: {
    //   type: String,
    // },
    to_date: {
      type: String,
    },
    sent_to:{
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
      ref: "portalusers",
    },
    created_by:{
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "PortalUser",
    },
    for_user:{
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "PortalUser",
    },
    role:{
        type: String,
    },
    type:{
      type: String,
  },
    status:{
        enum: ["0", "1","2"], 
        type: String,
        default:0
    }, // 0=pending , 1= approved ,2= rejected
  },
  { timestamps: true }
);

export default mongoose.model("LeaveManagements", leaves_managementSchema);
