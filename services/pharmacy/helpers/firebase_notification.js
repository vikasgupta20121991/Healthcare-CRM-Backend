var FCM = require("fcm-node");
var serverKey = process.env.SERVERKEY;
var fcm = new FCM(serverKey)

export const sendNotification =async( message,title,fcmToken,receiverId)=>{
    try{ 
      console.log(message,title,fcmToken,receiverId,"fdrgyuey774ety")
        var message = {
            to: fcmToken,
            notification: {
              title: title,
              body: message,
              sound: "default",
              alert: "alert",
            },
            priority: "high",
            data: {
              title: "notification test",
              body: message
            }
          };

          fcm.send(message, function (err, response) {
            if (err) {
              console.log("Something has gone wrong!", err);
            } else {
              console.log("Successfully sent with response: ", response);
              return response;
            }
          });
   }
   catch(err){
     console.log("error",err)
   }
}