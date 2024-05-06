import mongoose from "mongoose";

const chatModel = mongoose.Schema(
  {
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalUser"
    },

    receiverID: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PortalUser"
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
    isDeleted: { type: Boolean, default: false },
    type:{
      type :String
    },

  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatModel);

module.exports = Chat;
