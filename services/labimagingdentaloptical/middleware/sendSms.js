import axios from "axios"
import { resolve } from "path"
import {config} from "../config/constants"

export const sendSms = (mobile_number, text) => {
    return new Promise((resolve,reject)=>{
        const smsApiKey = config.SMS_API_KEY
        const smsUrl = `https://api.smsmode.com/http/1.6/sendSMS.do?accessToken=${smsApiKey}&message=${text}&numero=${mobile_number}`
        axios({
            method: "get",
      url: smsUrl,
        })
        .then(function (response) {
                //handle success
            // console.log(response,"sms_done");
            resolve(response.status)
        })
        .catch(function (response) {
                //handle error
                // console.log(response,"sms_fail");
                reject(response.status)
        });
    })
}


// var request = require('request');
// var options = {
//   'method': 'POST',
//   'url': 'https://api.melroselabs.com/sms/message',
//   'headers': {
//     'x-api-key': '[API_KEY]',
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify({"source":"MelroseLabs","destination":"447712345678","message":"Hello World #$£"})
// };
// request(options, function (error, response) { 
//   if (error) throw new Error(error);
//   console.log(response.body);
// });