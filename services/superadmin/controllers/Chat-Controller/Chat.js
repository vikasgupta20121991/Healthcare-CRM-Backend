import Chat from "../../models/superadmin/Chat/ChatModel";
import mongoose from "mongoose";
import { sendResponse } from "../../helpers/transmission";
import Message from '../../models/superadmin/Chat/Message';
import { getDocument, uploadFile } from '../../helpers/s3';
import Superadmin from "../../models/superadmin/superadmin";
import Notification from "../../models/superadmin/Chat/Notification"
import PortalUser from "../../models/superadmin/portal_user";

export const createdChat = async (req, res) => {
  // console.log("dhanshreeeeeeee", req.body);
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
        receiverID: req.body.data.receiver
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

const approveOrRejectMedicine = (deata) => {
  return new Promise(async (resolve) => {
    if (deata.portaluserReceiverDetails.length > 0) {
      // console.log("portaluserReceiverDetails in");
      if (deata.portaluserReceiverDetails[0].documentInfoReceiverDetails.length > 0) {
        resolve(await getDocument(deata.portaluserReceiverDetails[0].documentInfoReceiverDetails[0].url))
      }
      else {
        // console.log("documentInfoReceiverDetails else");
        resolve("")
      }
    }
    else {
      console.log("portaluserReceiverDetails else");
      resolve("")
    }
  })
}

export const getCreatedChats = async (req, res) => {
  // const id = req.query['0'];
  // const searchQuery = req.query.searchQuery; // Assuming the search query parameter is 'search'
  const {id,searchQuery} =req.query;
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
          "receiverDetails.fullName": { $regex: searchQuery, $options: "i" },
        },
      ];
    }

    // const matchQuery = {
    //   $or: [
    //     { senderID: mongoose.Types.ObjectId(id) },
    //     { receiverID: mongoose.Types.ObjectId(id) }
    //   ]
    // };

    const result = await Chat.aggregate([
      // { $match: matchQuery },
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
          from: "superadmins",
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
      {
        $lookup: {
          from: 'superadmins',
          let: { receiverIDnew: '$receiverID' },//claimObject id aggreate document key
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$_id', '$$receiverIDnew'] }
              }
            },
            {
              $lookup: {
                from: "portalusers",
                localField: "_id",
                foreignField: "superadmin_id",
                as: "portaluserReceiverDetailsnew",
              }
            },
            {
              $addFields: {
                portaluserReceiverDetails: '$portaluserReceiverDetailsnew'
              }
            },
            {
              $lookup: {
                from: "documentinfos",
                localField: "portaluserReceiverDetails.staff_profile",
                foreignField: "_id",
                as: "documentInfoReceiverDetailsnew",
              },
            },
            {

              $addFields: {
                'portaluserReceiverDetails': {
                  $map: {
                    input: '$portaluserReceiverDetails',
                    as: 'portaluserReceiverDetailsItem',
                    in: {
                      $mergeObjects: [
                        '$$portaluserReceiverDetailsItem',
                        {
                          documentInfoReceiverDetails: {
                            $filter: {
                              input: '$documentInfoReceiverDetailsnew',
                              as: 'documentInfoReceiverDetailsnewItem',
                              cond: {
                                $eq: ['$$documentInfoReceiverDetailsnewItem._id', '$$portaluserReceiverDetailsItem.staff_profile']
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            {
              $project: {
                portaluserReceiverDetailsnew: 0,
                documentInfoReceiverDetailsnew: 0
              }
            },
          ],
          as: "receiverDetails",

        }
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


    if (result.length > 0) {
      let i = 0;
      for (const doc of result) {
        // console.log(result, "inmdex");
        if (doc.isGroupChat) {
          let imagesObject = {};
          if (doc.profile_pic) {
            imagesObject[doc._id] = await getDocument(doc.profile_pic);
          } else {
            imagesObject[doc._id] = '';
          }

          // Add profile_pic to the document
          doc.profile_pic = imagesObject[doc._id];
        }
        else {
          let j = 0;
          for await (const item of doc.receiverDetails) {
            let recieveimage = await approveOrRejectMedicine(item);
            if (recieveimage != '') {
              result[i].receiverDetails[j].portaluserReceiverDetails[0].documentInfoReceiverDetails[0].receiverImage = recieveimage;
              console.log("result[i].receiverDetails[j].portaluserReceiverDetails[0].documentInfoReceiverDetails[0].receiverImage", result[i].receiverDetails[j].portaluserReceiverDetails[0].documentInfoReceiverDetails[0].receiverImage)
            }
            j++;
          }

        }
        i++;
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: result, // Use the modified dataArray instead of the original result
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
    console.log(error, 'error');
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

    // console.log("receivers", receivers)
    let saveData = new Message({
      chatId: req.body.data.chatId,
      senderID: req.body.data.senderID,
      receiverID: receivers,
      message: req.body.data.message,
      attachments: req.body.data.attachments
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
            from: "superadmins",
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
            getData[i].attachments[0].signedurl = profile;
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

    // if(req.query.messageId!= undefined){
    //   condition._id=req.query.messageId
    // }
    // console.log("conditionfgdsdxs", condition);

    const count = await Message.countDocuments(condition);

    const getData = await Message.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "superadmins",
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
          getData[i].attachments[0].signedurl = profile;
        }
        i++;
      }
    }

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
  // console.log(req.body.data, "------------------------------")
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
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    let getsenderInfo = await Superadmin.findOne({ _id: req.body.for_portal_user });
    const chatData = await Chat.findOne({ _id: mongoose.Types.ObjectId(req.body.chatId) });

    const receiverData = req.body?.for_portal_user == req.body?.created_by ? chatData?.senderID : req.body?.for_portal_user;

    let saveNotify = await new Notification({
      chatId: req.body.chatId,
      created_by: req.body.created_by,
      for_portal_user: receiverData,
      content: req.body.content,
      notitype: req.body.notitype,
      created_by_type: req.body.created_by_type
    })
    let saveData = await saveNotify.save();

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
}

export const getNotification = async (req, res) => {
  try {
    // const getData = await Notification.find({
    //   for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)
    // }).sort({ createdAt: -1 });

    var matchFilter={
      for_portal_user: mongoose.Types.ObjectId(req.query.for_portal_user)
    }

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
          from: "superadmins",
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
      },
      {
        $sort:{
          createdAt:-1
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
}

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

}

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
}

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
}

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
}

export const clearSinglemessages = async (req, res) => {
  try {
    const { chatId, deletedBy,messageId } = req.body;
    // console.log("req.body>>>>>>",req.body)
    const deleteData = await Message.updateMany(
      { _id: mongoose.Types.ObjectId(messageId) },
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
}

export const updateOnlineStatus = async (req, res) => {
  const { id, isOnline,socketId } = req.body;
  // console.log(req.body,"aaaaaaaaaaaaaaaaaaaaaaaa")
  try {
    const userExist = await PortalUser.find({ superadmin_id: { $eq: id } });
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
    const updateSuperadmin = await Superadmin.findOneAndUpdate({ _id: userExist[0].superadmin_id }, { $set: { isOnline ,socketId} }, { new: true })
    //  console.log("updateSuperadmin==",)
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
      message: `failed to update Status`,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
}

export const updateSocketId = async (req, res) => {
  const { socketId } = req.body;
  // console.log(req.body, "updateSocketIdupdateSocketId")
  try {
    // const userExist = await PortalUser.find({ superadmin_id: { $eq: id } });
    // if (userExist.length <= 0) {
    //   sendResponse(req, res, 500, {
    //     status: false,
    //     data: null,
    //     message: `staff not exists`,
    //     errorCode: "INTERNAL_SERVER_ERROR",
    //   });
    //   return
    // }
    // console.log("userExist========", userExist)
    const updateSuperadmin = await Superadmin.findOneAndUpdate({ socketId: socketId }, { $set: { isOnline: false} },{ new: true })
    // console.log("updateSuperadmin==", updateSuperadmin)
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

