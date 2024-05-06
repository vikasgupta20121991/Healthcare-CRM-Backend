import mongoose from "mongoose";

const complaintManagementInfoSchema = new mongoose.Schema(
    {
        complaint_id: {
            type: String,
        },
        complaint_subject: {
            type: String
        },
        provider_type_to: {
            type: String
        },
        provider_type_from: {
            type: String
        },
        complaint_body: {
            type: String
        },
        provider_response: {
            type: String,
            default: "",
        },
        super_admin_response: {
            type: String,
            default: "",
        },
        complaint_to_user_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        complaint_to_user_name: {
            type: String
        },
        complaint_from_user_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        complaint_from_user_name: {
            type: String
        },
        status: {
            type: String,
            default: "PENDING",
            enum: ["PENDING", "RESOLVED", "REJECT"],

        },
        complain_date: {
            type: String,
        },
        complain_time: {
            type: String,
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
           
        },
        dateofcreation:{
            type: String
        }
    },
    { timestamps: true }
);
export default mongoose.model("ComplaintManagement", complaintManagementInfoSchema);