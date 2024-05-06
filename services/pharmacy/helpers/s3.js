import "dotenv/config.js";
import { signedUrl } from "./cloudfront";
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

var corsConfiguration = {

  'CORSRules': [{

    'AllowedHeaders': ['*'],

    'AllowedMethods': ['GET', 'PUT', 'POST'],

    'AllowedOrigins': ['*'],

    'ExposeHeaders': [],

    'MaxAgeSeconds': 3000

  }]

}

const params = {

  Bucket: "healthcare-crm-stage-docs",

  CORSConfiguration: corsConfiguration,

};



s3.putBucketCors(params, function (err, data) {

  if (err) {

    console.error('Error configuring CORS:', err);

  } else {

    console.log('CORS configuration added:', data);

  }

});

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


export const uploadBase64 = (fileData, s3Options,userId,docType,fileName) => {
  // Binary data base64

  const fileContent = Buffer.from(fileData.replace(/^data:image\/\w+;base64,/, ""), 'base64');

  const type = fileData.split(';')[0].split('/')[1];



  // Setting up S3 upload parameters
  const params = {
    Body: fileContent,
    ...s3Options,
    Key: `pharmacy/${userId}/${docType}/${fileName}/${type}`,
    ContentEncoding: 'base64', 
    ContentType: `image/${type}`
  };

  console.log("BASE64 PAramas==>",params)

  // Uploading files to the bucket
  return s3.upload(params).promise();
};

export const getFile = async (params) => {
  // return s3.getSignedUrl('getObject', params);
  const result = await signedUrl(params.Key);
  return result;
}

export const getDocument = ( async (url) => {
  try {

      const result = await getFile({
          Bucket: "healthcare-crm-stage-docs",
          Key: url,
          Expires: 60 * 5,
      });
     return result;
  } catch (err) {
      console.log(err);
     return err;
  }
})

export const getDocuments = (async (urls) => {
    try {
        const result = []
        for (const s_url of urls) {
            const resultData = await getFile({
                Bucket: "healthcare-crm-stage-docs",
                Key: s_url,
                Expires: 60 * 5,
            });
            result.push(resultData)
        }
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
})