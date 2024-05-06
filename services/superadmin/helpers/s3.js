import "dotenv/config.js";
const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "", // Access key ID
  secretAccesskey:
    process.env.AWS_SECRET_ACCESS_KEY ||
    "", // Secret access key
  region: "eu-west-3", // Region
  correctClockSkew: true
});

const s3 = new AWS.S3();

export const uploadFile = (fileData, s3Options) => {
  // Binary data base64
  const fileContent = Buffer.from(fileData, "binary");

  // Setting up S3 upload parameters
  const params = {
    Body: fileContent,
    ...s3Options,
  };

  // Uploading files to the bucket
  return s3.upload(params).promise();
};

export const getFile = (params) => {
  return s3.getSignedUrl('getObject', params);
}


export const getDocument = ( async (url) => {
  try {
return new Promise(async (resolve)=>{
  const result = await getFile({
    Bucket: "healthcare-crm-stage-docs",
    Key: url,
    Expires: 60 * 5,
});
resolve(result);
})
     
  } catch (err) {
      console.log(err);
     return err;
  }
})
