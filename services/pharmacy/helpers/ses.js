import "dotenv/config.js";
const AWS = require('aws-sdk');
const config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "", // Access key ID
    secretAccesskey:
      process.env.AWS_SECRET_ACCESS_KEY ||
      "", // Secret access key
    region: "us-east-1", // Region
    correctClockSkew: true
}
AWS.config.update(config);

const AWS_SES = new AWS.SES(config);

let sendEmail = (params) => {
    return AWS_SES.sendEmail(params).promise();
};

let sendTemplateEmail = (recipientEmail) => {
    let params = {
      Source: '<email address you verified>',
      Template: '<name of your template>',
      Destination: {
        ToAddresse: [ 
          recipientEmail
        ]
      },
      TemplateData: '{ "name\':\'John Doe\'}'
    };
    return AWS_SES.sendTemplatedEmail(params).promise();
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
};