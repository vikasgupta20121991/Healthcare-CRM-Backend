import "dotenv/config.js";
import path from "path"
const AWS = require("aws-sdk");
const fs = require("fs");

const accessKeyID = process.env.AWS_ACCESS_KEY_ID || "";

AWS.config.update({
    accessKeyId: accessKeyID, // Access key ID
    secretAccesskey:
        process.env.AWS_SECRET_ACCESS_KEY ||
        "", // Secret access key
    region: "eu-west-3", // Region
    correctClockSkew: true
});
const privateKeyFilePath = "../private_key.pem";
const key_path = path.resolve(__dirname, privateKeyFilePath)
const privateKeyContents = fs.readFileSync(key_path, "utf8");

const cfDomainName = "";

function signedUrl(s3ContentPath) {

    const cfFullPath = `${cfDomainName}/${s3ContentPath}`;
    let signer = new AWS.CloudFront.Signer(accessKeyID, privateKeyContents);

    const option = {
        url: cfFullPath,
        expires: Math.floor(new Date().getTime()) + 60 * 60 * 1, // 1 hour from now
    };

    return new Promise((res, rej) => {
        signer.getSignedUrl(option, (err, url) => {
            if (err) {
                console.error(err);
                rej(err);
            } else {
                // console.log(url);
                res(url);
            }
        });
    });
}

module.exports = {
    signedUrl
}
