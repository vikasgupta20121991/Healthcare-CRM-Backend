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

export const getFile = (params) => {
  return s3.getSignedUrl('getObject', params);
}

export const getDocument = (async (url) => {
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
export const getDocument1 = (async (url) => {
  try {
    const params = {
      Bucket: "healthcare-crm-stage-docs",
      Key: url
  };
    const { Body } = await s3.getObject(params).promise();
      return Body;
  } catch (err) {
      return err;
  }
})