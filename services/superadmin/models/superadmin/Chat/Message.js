import mongoose from "mongoose";

const messageModel = mongoose.Schema(
  {
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Superadmin"
    },
    receiverID: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Superadmin"
      }
    ],
    message: {
      type: String
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat"
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: Object,
        path: String
      }
    ],
    deletedBy: [
      {
        user_Id: {
          type: mongoose.Schema.Types.ObjectId,
          default: null
        }
      }
    ]
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageModel);

module.exports = Message;
