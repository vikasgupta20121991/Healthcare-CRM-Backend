import Chat from "../../models/Chat/ChatModel";
import mongoose from "mongoose";
import { sendResponse } from "../../helpers/transmission";
import Message from '../../models/Chat/Message';
import { getDocument, uploadFile } from '../../helpers/s3';
import Notification from "../../models/notification"
import PortalUser from "../../models/portal_user";
import Http from "../../helpers/httpservice";
const httpService = new Http();

export const createdChat = async (req, res) => {
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    let newData = await Chat.findOne({
      $or: [
        {
          senderID: mongoose.Types.ObjectId(req.body.data.sender),
          receiverID: { $in: [mongoose.Types.ObjectId(req.body.data.receiver)] },
        },
        {
          senderID: { $in: [mongoose.Types.ObjectId(req.body.data.receiver)] },
          receiverID: mongoose.Types.ObjectId(req.body.data.sender),
        },
      ],
      isGroupChat:false
    });

    // console.log("newData==>",newData)

    if (newData) {
      // return newData;
      return sendResponse(req, res, 200, {
        status: false,
        body: null,
        message: "Already exist",
      });
    } else {
      let saveData = new Chat({
        senderID: req.body.data.sender,
        receiverID: req.body.data.receiver,
        type: req?.body?.data?.type
      });

      let saveChat = await saveData.save();

      if (saveChat) {
        let saveData = new Message({
          chatId: saveChat._id,
          senderID: saveChat.senderID,
          receiverID: saveChat.receiverID,
          message: "Hi",
          attachments: []
        });

        let saveMessage = await saveData.save();

        const jsondata = {
          latestMessage: mongoose.Types.ObjectId(saveMessage._id)
        }

        const newUpdate = await Chat.updateOne(
          { _id: mongoose.Types.ObjectId(saveChat._id) },
          { $set: jsondata },
          { new: true }
        )

        return sendResponse(req, res, 200, {
          status: true,
          body: saveChat,
          message: "Room Created successfully",
        });
      } else {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Failed to send message",
        });
      }
    }
  } catch (err) {
    console.log(err, 'error');
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Failed ",
    });
  }
};

export const getCreatedChats = async (req, res) => {
  const { id, searchQuery } = req.query;
  // console.log("req.query->>>>",req.query)
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    var filter = {}

    if (searchQuery && searchQuery !== "") {
      filter["$or"] = [
        {
          groupName: { $regex: searchQuery, $options: "i" },
        },
       {
          "receiverDetails.full_name": { $regex: searchQuery, $options: "i" },
        },
        {
          "senderDetails.full_name": { $regex: searchQuery, $options: "i" },
        },
      ];
    }

    const result = await Chat.aggregate([
      { $sort: { updatedAt: -1 } },
      {
        $match: {
           $or: [
              {
                senderID: mongoose.Types.ObjectId(id)
              },
              {
                receiverID: mongoose.Types.ObjectId(id)
              }
          ]
        }
      },
      {
        $lookup: {
          from: "portalusers",
          localField: "senderID",
          foreignField: "_id",
          as: "senderDetails",
        },
      },
      {
        $unwind: {
          path: "$senderDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "portalusers",
          localField: "receiverID",
          foreignField: "_id",
          as: "receiverDetails",
        },
      },
      { $match: filter },
      {
        $lookup: {
          from: "messages",
          localField: "latestMessage",
          foreignField: "_id",
          as: "latestMessage",
        },
      },
      {
        $unwind: {
          path: "$latestMessage",
          preserveNullAndEmptyArrays: true
        }
      },
    ]);

    // console.log("====result>====>>>>>>>",result)

    const receiverData = await httpService.getStaging('labimagingdentaloptical/get-portaluser-data', { data: result[0]?.receiverID[0] }, headers, 'labimagingdentalopticalServiceUrl');
    // console.log("receiverData>>>>>>",receiverData)
    const senderData = await httpService.getStaging('labimagingdentaloptical/get-portaluser-data', { data: result[0]?.senderID }, headers, 'labimagingdentalopticalServiceUrl');
    // console.log("senderData>>>>>>>>>",senderData)

    const modifiedResult = await Promise.all(result.map(async (chat) => {
      const receiverData = await httpService.getStaging('labimagingdentaloptical/get-portaluser-data', { data: result[0]?.receiverID[0] }, headers, 'labimagingdentalopticalServiceUrl');
      // console.log("receiverData>>>>>>",receiverData)
      const senderData = await httpService.getStaging('labimagingdentaloptical/get-portaluser-data', { data: result[0]?.senderID }, headers, 'labimagingdentalopticalServiceUrl');
      // console.log("senderData>>>>>>>>>",senderData)
      
      const receiver = receiverData?.data.find(user => user?._id === chat?.receiverID[0].toString());
      const sender = senderData?.data.find(user => user?._id === chat?.senderID.toString());
      // console.log(receiver,"==================",sender)
      if (receiver?.role === 'HOSPITAL' || receiver?.role === 'INDIVIDUAL') {
        chat.receiverDetails = [receiver];
      }
      
      if (sender?.role === 'HOSPITAL' || sender?.role === 'INDIVIDUAL') {
        chat.senderDetails = sender;
      }
      
      if(chat?.senderDetails?.profile_picture){
        chat.senderDetails.profile_picture = await getDocument(chat?.senderDetails?.profile_picture);
      }

      if(chat?.receiverDetails[0]?.profile_picture){
        chat.receiverDetails[0].profile_picture = await getDocument(chat?.receiverDetails[0]?.profile_picture);
      }
    
      if(chat?.profile_pic && chat?.profile_pic?.length > 0) {
        const GroupProfilePic = await getDocument(chat?.profile_pic);
        chat.profile_pic = GroupProfilePic;
      }

      return chat;
    }));

    if (modifiedResult?.length > 0) {
      return sendResponse(req, res, 200, {
        status: true,
        body: modifiedResult, // Use the modified dataArray instead of the original result
        message: "Fetched data successfully",
        errorCode: null,
      });
    } else {
      return sendResponse(req, res, 200, {
        status: false,
        body: [], // Use the modified dataArray instead of the original result
        message: "No room list found",
        errorCode: null,
      });
    }
  } catch (error) {
    console.log(error, "error");
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: "Internal server error",
      errorCode: null,
    });
  }
};

export const sendMessage = async (req, res) => {
  // console.log("messageData--", req.body.data);
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    let chcekRoom = await Chat.findOne({ _id: mongoose.Types.ObjectId(req.body.data.chatId) });
    const receivers = req.body.data.receiverID == req.body.data.senderID ? chcekRoom?.senderID : chcekRoom?.receiverID;

    // console.log(chcekRoom,"======receivers=======", receivers)
    let saveData = new Message({
      chatId: req.body.data.chatId,
      senderID: req.body.data.senderID,
      receiverID: receivers,
      message: req.body.data.message,
      attachments: req.body.data.attachments,
      type: req.body.data.type
    });

    let saveChat = await saveData.save();

    const jsondata = {
      latestMessage: mongoose.Types.ObjectId(saveChat._id)
    }

    const newUpdate = await Chat.updateOne(
      { _id: mongoose.Types.ObjectId(saveChat.chatId) },
      { $set: jsondata },
      { new: true }
    )

    // console.log(saveChat, "+++++++++++++++++", newUpdate)

    if (saveChat) {

      let condition = {
        _id: saveChat._id
      };

      // console.log("condition+++++", condition)

      const getData = await Message.aggregate([
        { $match: condition },
        {
          $lookup: {
            from: "portalusers",
            localField: "senderID",
            foreignField: "_id",
            as: "senderDetails",
          },
        },
        {
          $unwind: {
            path: "$senderDetails",
            preserveNullAndEmptyArrays: true
          }
        }
      ]);

      if (getData.length > 0) {
        let i = 0;
        for await (const item of getData) {
          const profile = await getimage(item);
          if (profile !== '') {
            // getData[i].attachments[0].signedurl = profile;
            getData[i].attachments[0].path = profile;

          }
          i++;
        }
      }
      // console.log("getData===========>", getData)
      return sendResponse(req, res, 200, {
        status: true,
        body: getData[0],
        message: "Message send successfully",
      });
    } else {
      return sendResponse(req, res, 200, {
        status: false,
        body: null,
        message: "Failed to send message",
      });
    }
  } catch (err) {
    console.log("error", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const allMessage = async (req, res) => {
  try {
    const chatId = mongoose.Types.ObjectId(req.query.chatId);
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 500000;
    const loggedINId = mongoose.Types.ObjectId(req.query.loggedINId);

    let condition = {
      chatId: chatId,
      "deletedBy.user_Id": { $ne: loggedINId }
    };


    const count = await Message.countDocuments(condition);

    const getData = await Message.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "profileinfos",
          let: { senderId: "$senderID", receiverIds: "$receiverID" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$for_portal_user", "$$senderId"] },
                    { $in: ["$for_portal_user", "$$receiverIds"] },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                profile_picture: 1,
              },
            },
          ],
          as: "userDetails",
        },
      },
      {
        $lookup: {
          from: "hospitaladmininfos",
          let: { senderId: "$senderID", receiverId: "$receiverID" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$for_portal_user", "$$senderId"] },
                    { $eq: ["$for_portal_user", "$$receiverId"] },
                  ],
                },
              },
            },
            {
              $project: {
                full_name: 1,
                profile_picture: 1,
              },
            },
          ],
          as: "hospitaladmin",
        },
      },
      {
        $lookup: {
          from: "portalusers",
          localField: "senderID",
          foreignField: "_id",
          as: "senderDetails",
        },
      },
      {
        $unwind: {
          path: "$senderDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { createdAt: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    if (getData.length > 0) {
      let i = 0;
      for await (const item of getData) {
        const profile = await getimage(item);
        if (profile !== '') {
          // getData[i].attachments[0].signedurl = profile;
          getData[i].attachments[0].path = profile;
        }
        i++;
      }
    }

    // if (getData.length > 0) {
    //   for (let i = 0; i < getData.length; i++) {
    //     const item = getData[i];
    //     const profile = await getimage(item);
    
    //     if (profile !== '') {
    //       if (!getData[i].attachments) {
    //         getData[i].attachments = [{}];
    //       } else if (!Array.isArray(getData[i].attachments)) {
    //         // Handle case where attachments is not an array
    //         getData[i].attachments = [{ path: profile }];
    //         continue; // Skip to the next iteration
    //       }
    
    //       if (!getData[i].attachments[0]) {
    //         getData[i].attachments[0] = {};
    //       }
    
    //       getData[i].attachments[0].path = profile;
    //     }
    //   }
    // }
    

    if (getData && getData.length > 0) {
      return sendResponse(req, res, 200, {
        status: true,
        body: getData,
        message: "Fetched data successfully",
        totalMessages: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } else {
      return sendResponse(req, res, 200, {
        status: false,
        body: [],
        message: "No data found",
      });
    }
  } catch (error) {
    console.log("error", error);
    sendResponse(req, res, 500, {
      status: false,
      data: error,
      message: "failed to update staff",
      errorCode: "INTERNAL_SERVER_ERROR"
    });
  }
};

const getimage = (data) => {
  return new Promise(async (resolve) => {
    if (data.attachments!= null && data.attachments.length > 0) {
      // console.log("data.attachments[0]", data.attachments[0].path)
      resolve(await getDocument(data.attachments[0].path));
    } else {
      resolve("");
    }
  });
};

export const createGroupChat = async (req, res) => {
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    let saveData = new Chat({
      senderID: req.body.data.sender,
      receiverID: req.body.data.receiver,
      groupName: req.body.data.groupName,
      profile_pic: req.body.data.profile_pic,
      isGroupChat: req.body.data.isGroupChat
    });

    let saveChat = await saveData.save();

    if (saveChat) {
      let saveData = new Message({
        chatId: saveChat._id,
        senderID: saveChat.senderID,
        receiverID: saveChat.receiverID,
        message: "Hi",
        attachments: []
      });

      let saveMessage = await saveData.save();

      const jsondata = {
        latestMessage: mongoose.Types.ObjectId(saveMessage._id)
      }

      const newUpdate = await Chat.updateOne(
        { _id: mongoose.Types.ObjectId(saveChat._id) },
        { $set: jsondata },
        { new: true }
      )

      return sendResponse(req, res, 200, {
        status: true,
        body: saveChat,
        message: "Group Room Created successfully",
      });
    } else {
      return sendResponse(req, res, 200, {
        status: false,
        body: null,
        message: "Failed to create room",
      });
    }

  } catch (err) {
    console.log(err, 'error');
    return sendResponse(req, res, 500, {
      status: true,
      body: err,
      message: "Internal server error",
    });
  }
};

export const addMembersToGroupChat = async (req, res) => {
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    };

    const chatroomId = req.body.data.chatroomId;
    const newMembers = req.body.data.newMembers;

    const existingChat = await Chat.findOne({ _id: chatroomId });

    if (!existingChat) {
      return sendResponse(req, res, 404, {
        status: false,
        body: null,
        message: "Group chat not found",
      });
    }

    // Convert newMembers to Mongoose ObjectIds
    const memberObjectIds = newMembers.map(id => mongoose.Types.ObjectId(id));

    // Filter out existing IDs from memberObjectIds
    const uniqueMemberObjectIds = memberObjectIds.filter(id => !existingChat.receiverID.includes(id));

    // Push uniqueMemberObjectIds into existingChat.receiverID
    existingChat.receiverID.push(...uniqueMemberObjectIds);

    console.log(existingChat.receiverID, "member--iii->");

    // Update existingChat.receiverID in the database
    const updateResult = await Chat.updateOne(
      { _id: chatroomId },
      { $push: { receiverID: { $each: uniqueMemberObjectIds } } }
    );

    // console.log("updateResult---->", updateResult)
    return sendResponse(req, res, 200, {
      status: true,
      body: existingChat,
      message: "Members added successfully to the group chat",
    });
  } catch (err) {
    console.log(err, 'error');
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const saveNotification = async (req, res) => {
  // console.log("req.body=======>>>>",req.body)
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    let getsenderInfo = await PortalUser.findOne({ _id: req.body.for_portal_user });
    const chatData = await Chat.findOne({ _id: mongoose.Types.ObjectId(req.body.chatId) });
    // console.log("chatData===>",chatData)

    const receiverData = req.body?.for_portal_user == req.body?.created_by ? chatData?.senderID : req.body?.for_portal_user;
    // console.log("receiverData=======>>>>",receiverData)

    let saveNotify = await new Notification({
      chatId: req.body.chatId,
      created_by: req.body.created_by,
      for_portal_user: receiverData,
      content: req.body.content,
      notitype: req.body.notitype,
      created_by_type: req.body.created_by_type
    })
    let saveData = await saveNotify.save();
    // console.log("saveData=======>>>>",saveData)
    if (saveData) {
      return sendResponse(req, res, 200, {
        status: true,
        body: saveNotify,
        message: "Notification Saved Successfully",
      });
    } else {
      return sendResponse(req, res, 400, {
        status: true,
        body: saveChat,
        message: "Notification not Saved",
      });
    }

  } catch (err) {
    console.log("err", err)
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const getNotification = async (req, res) => {
  try {
    var matchFilter={
      for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)
    }
    // const getData = await Notification.find({
    //   for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)
    // }).sort({ createdAt: -1 });

    const count = await Notification.countDocuments({
      for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
      new: true
    });

    const isViewcount = await Notification.countDocuments({
      for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user),
      isView: false
    });

    const notificationData = await Notification.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "portalusers",
          localField: "created_by",
          foreignField: "_id",
          as: "receiverDetails",
        },
      },
      {
        $unwind: {
          path: "$receiverDetails",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    return sendResponse(req, res, 200, {
      status: true,
      body: { list: notificationData, count: count, isViewcount: isViewcount },
      message: "List fetched successfully",
    });

  } catch (err) {
    console.log("err", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const updateNotification = async (req, res) => {
  try {
    const {
      receiverId,
      isnew
    } = req.body;

    console.log(req.body, 'request body');
    if (!isnew) {
      var notificationDetails = await Notification.updateMany(
        { for_portal_user: { $eq: receiverId } },
        {
          $set: {
            new: false,
          },
        },
        { upsert: false, new: true }
      ).exec();
    }
    sendResponse(req, res, 200, {
      status: true,
      body: notificationDetails,
      message: `Notification updated successfully`,
      errorCode: null,
    });

  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: `failed to update notification list`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }

};

export const markAllReadNotification = async (req, res) => {
  try {
    const { sender } = req.body;
    const update = await Notification.updateMany(
      { for_portal_user: { $in: [mongoose.Types.ObjectId(sender)] } },
      { $set: { isView: true } },
      { new: true }
    );

    return sendResponse(req, res, 200, {
      status: true,
      body: update,
      message: "Mark All Read successfully",
    });

  } catch (err) {
    console.log("err", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });

  }
};

export const markReadNotificationByID = async (req, res) => {
  try {
    const { _id } = req.body;
    let updateNotification = await Notification.updateOne(
      { _id: mongoose.Types.ObjectId(_id) },
      { $set: { isView: true } },
      { new: true });

    return sendResponse(req, res, 200, {
      status: true,
      body: updateNotification,
      message: "Mark All Read successfully",
    });
  } catch (err) {
    console.log("err", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const clearAllmessages = async (req, res) => {
  try {
    const { chatId, deletedBy } = req.body;
    const deleteData = await Message.updateMany(
      { chatId: mongoose.Types.ObjectId(chatId) },
      { $push: { deletedBy: { user_Id: mongoose.Types.ObjectId(deletedBy) } } },
      { new: true }
    );

    return sendResponse(req, res, 200, {
      status: true,
      body: deleteData,
      message: "Delete messages successfully",
    });
  } catch (err) {
    console.log("err", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
};

export const clearSinglemessages = async (req, res) => {
  try {
    const { chatId, deletedBy,messageId } = req.body;
    // console.log("req.body>>>>>>",req.body)
    const deleteData = await Message.updateOne(
      { _id: mongoose.Types.ObjectId(messageId) },
      { $push: { deletedBy: { user_Id: mongoose.Types.ObjectId(deletedBy) } } },
      { new: true }
    );

    // console.log("deleteData>>>>>>>>>",deleteData)
    return sendResponse(req, res, 200, {
      status: true,
      body: deleteData,
      message: "Delete messages successfully",
    });
  } catch (err) {
    console.log("err", err);
    return sendResponse(req, res, 500, {
      status: false,
      body: err,
      message: "Internal server error",
    });
  }
}

export const updateOnlineStatus = async (req, res) => {
  const { id, isOnline,socketId } = req.body;
  try {
    const userExist = await PortalUser.find({ _id: { $eq: id } });
    if (userExist.length <= 0) {
      sendResponse(req, res, 500, {
        status: false,
        data: null,
        message: `User not exists`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
      return
    }
    // console.log("userExist========",userExist)
    const updateSuperadmin = await PortalUser.findOneAndUpdate({ _id:userExist[0]._id }, { $set: { isOnline ,socketId} }, { new: true })
    //  console.log("updateSuperadmin==",updateSuperadmin)
    if (updateSuperadmin) {
      return sendResponse(req, res, 200, {
        status: true,
        data: updateSuperadmin,
        message: `Status updated successfully`,
        errorCode: null,
      })
    } else {
      return sendResponse(req, res, 400, {
        status: false,
        data: null,
        message: `Status not updated successfully`,
        errorCode: null,
      })
    }

  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to update Status`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
}


export const updateSocketId = async (req, res) => {
  const { socketId } = req.body;
  try {
    const updateSuperadmin = await PortalUser.findOneAndUpdate({ socketId: socketId }, { $set: { isOnline: false} },{ new: true })
    if (updateSuperadmin) {
      return sendResponse(req, res, 200, {
        status: true,
        data: updateSuperadmin,
        message: `Status updated successfully`,
        errorCode: null,
      })
    } else {
      return sendResponse(req, res, 200, {
        status: false,
        data: null,
        message: `Status not updated successfully`,
        errorCode: null,
      })
    }

  } catch (err) {
    console.log(err);
    sendResponse(req, res, 500, {
      status: false,
      data: err,
      message: `failed to update staff`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
}

