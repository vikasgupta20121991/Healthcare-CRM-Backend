const {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} = require("agora-access-token");
import "dotenv/config.js";
const appIds=process.env.appIds;
const appcertificatekey=process.env.appCertificates;
  export async function   agoraTokenGenerator(roomName, uniqueId) {
    console.log(uniqueId,appcertificatekey,"rooNAme------------",roomName,appIds,process.env.ADMIN_EMAIL_PASSWORD);
    return new Promise((resolve,reject)=>{
      const appId = appIds;
      const appCertificate = appcertificatekey;
      const channelName = roomName;
      const uid = uniqueId;
      const role = RtcRole.PUBLISHER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      // Build token with uid
    console.log(appId,appcertificatekey,channelName,"AGORA___------------",uid,role,privilegeExpiredTs);

      const tokenA = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs
      );
      console.log("hepler========",tokenA);
      let tokenObj = {
        uid: uid,
        token: tokenA,
      };
       resolve(tokenObj);
    })
  }