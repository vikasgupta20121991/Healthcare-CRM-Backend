const mongoose = require('mongoose')
import { SocketChat } from "./chat-middleware";
import HttpService from "./httpservice";
import { joinRoom, findOrCreateRoom, muteAndUnmute } from "./chat"

exports = module.exports = function (io) {
  io.sockets.on("connection", (socket) => {
    SocketChat(socket, io)
    socket.on('disconnect', async function () {
      const headers = {
        'Authorization': ''
      }
      let updatedata = await HttpService.postStagingChat('superadmin/update-socket-id', { socketId: socket.id }, headers, 'superadminServiceUrl')
      // console.log("updatedata===", updatedata)
    });
    socket.on("join", (data) => {
      socket.join(data.room);
    });
    socket.on("leave", (data) => {
      socket.leave(data.room);
    });
    socket.on("track-mute", async (data) => {
      let updateMuteAndUmute = await muteAndUnmute(
        data.roomName,
        data.userId,
        data.isAudioMuted,
        data.isVideoMuted,
        data.authtoken,
        data.portal_type
      );
      let newObj = { ...data, identity: updateMuteAndUmute.userIdentity };

      updateMuteAndUmute.data.data.participantsinfodetails.forEach(async (el) => {
        await io.in(el.userId.toString()).emit("track-mute-on", newObj);
      });
    });


    socket.on("call-user", async (data) => {
      // let data1 = await chat.findOne({ _id: data.chatId });
      const headers = {
        'Authorization': data.token
      }
      let authtoken = data.token;
      let appintmentdetails = {}
      if (data.portal_type) {
        appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { appointment_id: data.chatId, portal_type: data.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
      } else {
        appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { appointment_id: data.chatId }, headers, 'hospitalServiceUrl');
      }
      let loggedInUserData = {};
      let data1 = {
        _id: data.chatId,
        users: appintmentdetails.data.userinfodetails
      }
      let uniqueName = (Math.random() + 1).toString(36).substring(7);
      let roomData = uniqueName;

      let findingToken = await joinRoom(
        roomData,
        data1,
        data.type,
        data1._id,
        data.loggedInUserId,
        data.token,
        data.portal_type ? data.portal_type : '',
      );
      // let newTopken = await findRoom(roomData);
      let grpname = '';
      let grpimg = '';

      let senderUserDAta = {
        status: "success",
        messageID: 200,
        message: "Fetched Successfully",
        data: {},
      }
      let receiverUserDAta = {
        status: "success",
        messageID: 200,
        message: "Fetched Successfully",
        data: {},
      }

      if (data1.users.length > 2) {
        data1.users.forEach(element => {
          grpname += element.name + " ,"
        });
        senderUserDAta.data = {
          userData: {
            name: grpname,
            ownname: data.loggedInUserName,
            image: grpimg,
            chatId: data1._id,
            roomName: uniqueName,
            token: findingToken,
            authtoken: authtoken,
            type: data.type,
            isGroup: true,
            portal_type: data.portal_type ? data.portal_type : ''

          },
        }
        await io.in(data.loggedInUserId).emit("caller-info", senderUserDAta);
        data1.users.forEach(async (el) => {
          if (el.user_id.toString() != data.loggedInUserId) {
            receiverUserDAta.data = {
              userData: {
                name: grpname,
                ownname: el.name,
                image: grpimg,
                chatId: data1._id,
                roomName: uniqueName,
                token: findingToken,
                authtoken: authtoken,
                type: data.type,
                isGroup: true,
                portal_type: data.portal_type ? data.portal_type : ''
              },
            }
            await io.in(el.user_id.toString()).emit("notify-call", receiverUserDAta);
          }
        });
      }
      else {
        data1.users.forEach((element, index) => {
          console.log("USERPROFILE_____________",element);
          if (element.user_id == data.loggedInUserId) {
            let ownname = '';
            if (index == 0) {
              ownname = data1.users[1].name;
            }
            if (index == 1) {
              ownname = data1.users[0].name;
            }
            receiverUserDAta.data = {
              userData: {
                name: element.name,
                ownname: ownname,
                image: element.image,
                chatId: data1._id,
                roomName: uniqueName,
                token: findingToken,
                authtoken: authtoken,
                type: data.type,
                isGroup: true,
                portal_type: data.portal_type ? data.portal_type : ''

              },
            }


          }
          else {
            let ownname = '';
            if (index == 0) {
              ownname = data1.users[1].name;
            }
            if (index == 1) {
              ownname = data1.users[0].name;
            }
            senderUserDAta.data = {
              userData: {
                name: element.name,
                ownname: ownname,
                image: element.image,
                chatId: data1._id,
                roomName: uniqueName,
                token: findingToken,
                authtoken: authtoken,
                type: data.type,
                isGroup: true,
                portal_type: data.portal_type ? data.portal_type : ''

              },
            }
          }
        });
        await io.in(data.loggedInUserId).emit("caller-info", senderUserDAta);
        data1.users.forEach(async (el) => {
          if (el.user_id.toString() != data.loggedInUserId) {
            // console.log(receiverUserDAta,"receiverUserDAta");
            await io.in(el.user_id.toString()).emit("notify-call", receiverUserDAta);
          }
        });
      }



      // console.log("calluser1",senderUserDAta);
      //   console.log("calluser1",receiverUserDAta);


    });
    socket.on("ringing-start", async (data) => {
      try {
        //   let informRing = {
        //     users:[
        //        {_id:"63e1f567a825766f5c52b0de"},
        //        {_id:"63e0bc33f15a27adc67cc733"}
        //     ]
        //   };

        const headers = {
          'Authorization': data.authtoken
        }
        let appintmentdetails = {}
        if (data.portal_type != '') {
          appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { appointment_id: data.chatId, portal_type: data.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
        } else {
          appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { appointment_id: data.chatId }, headers, 'hospitalServiceUrl');
        }
        //   let informRing = await chat.findById(data.chatId);

        appintmentdetails.data.userinfodetails.map(async (el) => {
          if (el.user_id != data.senderId) {
            await io.in(el.user_id.toString()).emit("ringing-started", data);
          }
        });
      } catch (e) { }
    });
    socket.on("call-pick-emit", async (data) => {
      // let getting_userData = await chat.findById(data.chatId);
      const headers = {
        'Authorization': data.authtoken
      }

      let appintmentdetails = {}
      if (data.portal_type != '') {
        appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { appointment_id: data.chatId, portal_type: data.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
      } else {
        appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { appointment_id: data.chatId }, headers, 'hospitalServiceUrl');
      }
      if (appintmentdetails.status) {
        let getting_userData = {
          users: appintmentdetails.data.userinfodetails
        };

        getting_userData.users.map(async (el) => {
          let checkdata = await io
            .in(el.user_id.toString())
            .emit("call-picked", "call has been picked");
        });
      }
    });
    socket.on("close-ringer", async (data) => {
      try {
        await io.in(data.loggedInUserId).emit("close-ringer-dialog", data);
      } catch (e) {
        throw err
      }
    });
    socket.on("message", async (data) => {
      console.log("Message_data====",data)
      const headers = {
        'Authorization': data.authtoken
      }
     

      let appintmentdetails = {}
      if (data.portal_type != '') {
        appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { appointment_id: data.chatId, portal_type: data.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
      } else {
        appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { appointment_id: data.chatId }, headers, 'hospitalServiceUrl');
      }
      if (appintmentdetails.data.participantsinfodetails.length > 0) {
        let receiver = [];
        appintmentdetails.data.participantsinfodetails.map((e1)=>{
          if(data.senderId != e1.userId){
            receiver.push({
              id: e1.userId
            })
          }
        })
        let chatmessage = {
          senderId: data.senderId,
          message: data.message,
          receiver: receiver,
          createdAt: data.createdAt
        }
        let appintmentdetails1111 = {}

        if (data.portal_type != '') {
          appintmentdetails1111 = await HttpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-chatmessage',
         
          { appointmentId: data.chatId, chatmessage: chatmessage }, headers, 'labimagingdentalopticalServiceUrl');
      
        }else{
          appintmentdetails1111 = await HttpService.postStaging('hospital-doctor/update-videocall-chatmessage',
         
          { appointmentId: data.chatId, chatmessage: chatmessage }, headers, 'hospitalServiceUrl');
        }

        appintmentdetails.data.participantsinfodetails.forEach((element) => {
          if (element.userId != data.senderId) {
            let count = 0;
             appintmentdetails1111.body.chatmessage.forEach(message => {
              message.receiver.forEach(receiver => {
                if ((receiver.id === element.userId) && receiver.read) {
                  count++;
                }
              });
            });
            io.in(element.userId).emit("new message", {
              message: data.message,
              room: element.userId,
              createdAt: data.createdAt,
              type: data.type,
              chatId: data.chatId,
              unread_count: count
            });

          }
        })

      }

    });
    socket.on("end-call-emit", async (data) => {
      try {
        const headers = {
          'Authorization': data.authtoken
        }
        console.log(data, "datttttttttttttttttttttttttt");
        let appintmentdetails = {}
        if (data.portal_type != '') {
          appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', { roomname: data.roomName, portal_type: data.portal_type }, headers, 'labimagingdentalopticalServiceUrl');
        } else {
          appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { roomname: data.roomName }, headers, 'hospitalServiceUrl');

        }

        let getting_userData = {
          chatId: appintmentdetails.data.roomdetails.appointmentId,
          participants: appintmentdetails.data.participantsinfodetails,
          callerId: appintmentdetails.data.roomdetails.callerId
        }
        let roomData = {
          roomName: data.roomName,
        };
        //   let chatUsers = await chat.findById(getting_userData.chatId);
        let chatUsers = {
          users: appintmentdetails.data.userinfodetails
        };
        let info;

        getting_userData.participants.forEach((element1) => {
          if (element1.userId.toString() == data.loggedInUserId) {
            info = element1.userIdentity;
          }
        });
        getting_userData.participants.forEach(async (element) => {
          if (element.userId.toString() != data.loggedInUserId) {
            await io.in(element.userId.toString()).emit("participant-left", {
              roomName: data.roomName,
              identity: info,
            });

            if (
              // getting_userData.participants.length == 0 &&
              getting_userData.callerId == data.loggedInUserId
            ) {
              let appintmentdetails11 = {}
              if(data.portal_type != ''){
                appintmentdetails11 = await HttpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',
                {
                  appointmentId: appintmentdetails.data.roomdetails.appointmentId,
                  participants: "",
                  leftparticipantsid: element.userId,
                  participantstype: "remove",

                }
                , headers, 'labimagingdentalopticalServiceUrl');
              }else{
                appintmentdetails11 = await HttpService.postStaging('hospital-doctor/update-videocall-appointment',
                {
                  appointmentId: appintmentdetails.data.roomdetails.appointmentId,
                  participants: "",
                  leftparticipantsid: element.userId,
                  participantstype: "remove",

                }
                , headers, 'hospitalServiceUrl');
              }
          
            }
            // let removeLoggedInUserData = await videoRooms.findOneAndUpdate(
            //   { roomName: data.roomName },
            //   {
            //     $pull: {
            //       participants: {
            //         userId: mongoose.Types.ObjectId(data.loggedInUserId),
            //       },
            //     },
            //   },
            //   { new: true }
            // );
          }
        });
        let appintmentdetails11 = {}
        if(data.portal_type != ''){
          appintmentdetails11 = await HttpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',
          {
            appointmentId: appintmentdetails.data.roomdetails.appointmentId,
            participants: "",
            leftparticipantsid: data.loggedInUserId,
            participantstype: "remove",

          }
          , headers, 'labimagingdentalopticalServiceUrl');
        
        }else{

          appintmentdetails11 = await HttpService.postStaging('hospital-doctor/update-videocall-appointment',
          {
            appointmentId: appintmentdetails.data.roomdetails.appointmentId,
            participants: "",
            leftparticipantsid: data.loggedInUserId,
            participantstype: "remove",

          }
          , headers, 'hospitalServiceUrl');
        }
         
        if (
          // getting_userData.participants.length == 0 &&
          getting_userData.callerId == data.loggedInUserId
        ) {
          chatUsers.users.forEach(async (el) => {
            console.log("testttt" + el.user_id);
            await io.in(el.user_id.toString()).emit("end-call", roomData);
          });

        } else {

          await io.in(data.loggedInUserId).emit("end-call", roomData);

        }

      } catch (e) {
        console.log("testttttt", e);
      }
    });


  })
}








