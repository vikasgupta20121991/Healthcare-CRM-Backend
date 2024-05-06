
import HttpService from "./httpservice";

export async function joinRoom(roomNamedata, data, type, chatId, callerId,authtoken,portal_type) {
  if (!roomNamedata) {
    // return res.status(200).send("Must include roomName argument.");
  }
  const roomName = roomNamedata;
  findOrCreateRoom(roomName, type, chatId, callerId,authtoken,portal_type);
}

export const findOrCreateRoom = async (roomName, type, chatId, callerId,authtoken,portal_type) => {
  try {
    if (type === "video") {
      const headers = {
        'Authorization': authtoken
      }
      let appintmentdetails= {}
      if(portal_type){
        appintmentdetails = await HttpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment',  { appointmentId: chatId,
          callstatus:"InProgress",
          roomName:roomName,
          callerId:callerId,
          roomDate:new Date() 
        }, headers, 'labimagingdentalopticalServiceUrl');
      }else{   

       appintmentdetails = await HttpService.postStaging('hospital-doctor/update-videocall-appointment', 
      { appointmentId: chatId,
        callstatus:"InProgress",
        roomName:roomName,
        callerId:callerId,
        roomDate:new Date() 
      }
      , headers, 'hospitalServiceUrl');
    }
      // let saveVideo = new VideoRooms({
      //   roomName: roomName,
      //   status: "InProgress",
      //   chatId: chatId,
      //   callerId: callerId,
      //   callType: type,
      // });
      // let save = await saveVideo.save();
    }
  } catch (err) {
    throw err
  }
};

export async function muteAndUnmute(roomName, userId, isAudioMuted, isVideoMuted,authtoken,portal_type) {
  // let updateRoom = await videoRooms.findOne({ roomName: roomName });
  const headers = {
    'Authorization': authtoken
  }
  let appintmentdetails= {}
  if(portal_type){
    appintmentdetails = await HttpService.getStaging('labimagingdentaloptical/four-portal-view-appointment-by-roomname', {  roomname: roomName,  portal_type:portal_type }, headers, 'labimagingdentalopticalServiceUrl');
  
    let identity;
    appintmentdetails.data.participantsinfodetails.forEach(async (el) => {
      if (userId == el.userId.toString()) {
        identity = el.userIdentity;   
  
  
        let check = await HttpService.postStaging('labimagingdentaloptical/four-portal-update-videocall-appointment', 
        { participantuserId: el.userId,
          isAudioMuted:isAudioMuted,
          isVideoMuted:isVideoMuted,
        }
        , headers, 'labimagingdentalopticalServiceUrl');
        // let check = await videoRooms.findOneAndUpdate(
        //   { "participants.userId": el.userId },
        //   {
        //     $set: {
        //       "participants.$.isAudioMuted": isAudioMuted,
        //       "participants.$.isVideoMuted": isVideoMuted,
        //     },
        //   },
        //   { new: true }
        // );
      }
    });
  
    let obj = {
      data: appintmentdetails,
      userIdentity: identity,
    };
    return obj;
  
  }else{
     appintmentdetails = await HttpService.getStaging('hospital-doctor/view-appointment-by-roomname', { roomname: roomName }, headers, 'hospitalServiceUrl');
     let identity;
     appintmentdetails.data.participantsinfodetails.forEach(async (el) => {
       if (userId == el.userId.toString()) {
         identity = el.userIdentity;   
   
   
         let check = await HttpService.postStaging('hospital-doctor/update-videocall-appointment', 
         { participantuserId: el.userId,
           isAudioMuted:isAudioMuted,
           isVideoMuted:isVideoMuted,
         }
         , headers, 'hospitalServiceUrl');
         // let check = await videoRooms.findOneAndUpdate(
         //   { "participants.userId": el.userId },
         //   {
         //     $set: {
         //       "participants.$.isAudioMuted": isAudioMuted,
         //       "participants.$.isVideoMuted": isVideoMuted,
         //     },
         //   },
         //   { new: true }
         // );
       }
     });
   
     let obj = {
       data: appintmentdetails,
       userIdentity: identity,
     };
     return obj;
 
    }
 
}