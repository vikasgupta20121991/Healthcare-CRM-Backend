import mongoose from "mongoose";

const chatModel = mongoose.Schema(
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

    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    groupName:{
      type:String
    },

    isGroupChat:{
      type :Boolean,
      default:false
    },

    profile_pic: {
      type: String,
      default:''
  },
    isDeleted: { type: Boolean, default: false }

  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatModel);

module.exports = Chat;
