import mongoose from "mongoose";

const notificationModel = new mongoose.Schema(
    {
        content: {
            type: String,
            default: null
        },
        url: {
            type: String,
            default: null
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        notitype: {
            type:String,
            default: null
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Superadmin"
        },
        created_by_type: {
            type: String,
            required: true,
        },
        for_portal_user: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Superadmin"
        }],
        isView:{
            type:Boolean,
            default:false
        },
        new:{
            type:Boolean,
            default:true
        },
        chatId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat"
        },
        notification_name: {
            type: String
        },
    },
    { timestamps: true }
);

export default mongoose.model("Notification", notificationModel);
