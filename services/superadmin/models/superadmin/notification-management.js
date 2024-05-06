import mongoose, { Mongoose, now, Schema } from "mongoose";
const notificationManagementSchema = new mongoose.Schema(
    {

        notification_name: {
            type: String,
        },
        time: {
            type: String,
        },
        notification_applies: {
            type: String,
        },
        content: {
            type: String,
        },
        created_by:{
            type: String,
        },
        notification_type:{
            type: String,
        },
        isDeleted: {
            type: Boolean,
            default: false
        }

    },
    { timestamps: true }
);
export default mongoose.model("NotificationManagement", notificationManagementSchema);
