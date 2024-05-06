import { validationResult } from "express-validator";
import * as CryptoJS from 'crypto-js';
import { messageID } from "../constant.js";
import { config } from "../config/constants"
const cryptoSecret = config.CRYPTO_SECRET;
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import counter from "../models/counter/index.js"
const xlsx = require("xlsx");
import moment from "moment"
export const validationResponse = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.json(encryptObjectData({
            status: "failed",
            messageID: messageID.badRequest,
            message: error.array()
        }));
    } else {
        next();
    }
}


export const encryptObjectData = (data) => {
    const dataToEncrypt = JSON.stringify(data);
    const encPassword = cryptoSecret;
    const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt.trim(), encPassword.trim()).toString();
    return encryptedData;
}

export const encryptData = (data) => {
    const encPassword = cryptoSecret;
    const encryptedData = CryptoJS.AES.encrypt(data.trim(), encPassword.trim()).toString();
    return encryptedData;
}


export const decryptObjectData = (response) => {
    if (!response.data) return false;
    const decPassword = cryptoSecret;
    const decryptedOutput = CryptoJS.AES.decrypt(response.data.trim(), decPassword.trim()).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedOutput);
}

export const decryptionData = (data) => {
    if (data) {
        const decPassword = cryptoSecret;
        const conversionDecryptOutput = CryptoJS.AES.decrypt(data.trim(), decPassword.trim()).toString(CryptoJS.enc.Utf8);
        return conversionDecryptOutput;
    }
}

export const decryptMiddleware = async (req, res, next) => {
    let dc = await decryptObjectData(req.body)
    req.body = dc
    next()
}

export const handleRejectionError = async (res, error, code) => {
    res.status(code).json({
        errors: {
            message: error.message
        }
    });
}

export const handleResponse = async (req, res, code, result) => {
    if (config.NODE_ENV === "local") {
        return res.status(code).json(result);
    }
    return res.status(code).json(encryptObjectData(result));
}

/**
 * Item not found
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
export const itemNotFound = (err, item, reject, message) => {
    if (err) {
        reject(exports.buildErrObject(422, err.message));
    }
    if (!item) {
        reject(exports.buildErrObject(404, message));
    }
};

/**
 * Handles error by printing to console in development env and builds and sends an error response
 * @param {Object} res - response object
 * @param {Object} err - error object
 */
exports.handleError = (res, err) => {
    // Sends error to user
    res.status(err.code).json({
        errors: {
            msg: err.message
        }
    });
};

/**
 * Builds error object
 * @param {number} code - error code
 * @param {string} message - error text
 */
export const buildErrObject = (code, message) => {
    return {
        code,
        message
    };
};

/**
 * Builds error for validation files
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - next object
 */
exports.validationResult = (req, res, next) => {
    try {
        validationResult(req).throw();
        if (req.body.email) {
            req.body.email = req.body.email.toLowerCase();
        }
        return next();
    } catch (err) {
        return exports.handleError(res, exports.buildErrObject(422, err.array()));
    }
};

export const generateToken = payload => {
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * config.JWT_EXPIRATION_IN_MINUTES;

        console.log(expiration,"expirationnn____");

    // returns signed token
    return jwt.sign(
        {
            data: payload,
            exp: expiration
        },
        config.SECRET.JWT
    );
}

export const generateRefreshToken = payload => {
    // Gets expiration time
    const expiration =
        Math.floor(Date.now() / 1000) + 60 * config.JWT_EXPIRATION_IN_MINUTES + 120;
        console.log(expiration,"expirationnn____1", Math.floor(Date.now() / 1000));

    // returns signed token
    return jwt.sign(
        {
            data: payload,
            exp: expiration
        },
        config.SECRET.JWT
    );
};

export const smsTemplateOTP = (otp2fa) => {
    return `Your verification OTP is: ${otp2fa}. Please don't share with anyone else.
    Website link- https://www.healthcare-crm.com`
}

export const generate6DigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

export const bcryptCompare = async (normalData, bcryptedData) => {
    const isMatch = await bcrypt.compare(normalData, bcryptedData);
    return isMatch
}

export const generateTenSaltHash = async (data) => {
    const salt = await bcrypt.genSalt(10);
    const hashedData = await bcrypt.hash(data.toString(), salt);
    return hashedData
}
function parseAndFormatDate(dateString) {
    // Define an array of possible date formats
        // console.log(dateString,"testttaaaaaaaaaaaaaaaaaaaaa");

    const dateFormats = ['DD MMMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
    var i=0;

    // Try to parse the date using each format until successful
    for (const format of dateFormats) {
        // console.log(dateString,"testttaaaaaaaaaaaaaaaaaaaaa");
        const parsedDate = moment(dateString, format, true); // Using true to strict parsing
        if (parsedDate.isValid()) {
        // console.log(parsedDate.format('YYYY-MM-DD'),"testtt");
        i=1;
            // If parsing is successful, format the date to the common format
            return {date:parsedDate.format('YYYY-MM-DD'),no:i};
        }
        else{
        // console.log(dateString,"testttaaaaaaaaaaaaaaaaaaaaa");
        }
    }

    // If none of the formats match, return the original date string
    return  {date:dateString,no:i};
}
export const processExcel = (filepath) => {
    const workbook = xlsx.readFile(filepath);
    let workbook_sheet = workbook.SheetNames;
    console.log();
    let workbook_response = xlsx.utils.sheet_to_json(
        workbook.Sheets[workbook_sheet[0]], {
        header: 0,
        defval: "",
        raw: false,
    });
return workbook_response;
}
export const processExcelsubscriber = (filepath) => {
    const workbook = xlsx.readFile(filepath);
    let workbook_sheet = workbook.SheetNames;
    let workbook_response = xlsx.utils.sheet_to_json(
        workbook.Sheets[workbook_sheet[0]], {
        header: 0,
        defval: "",
        raw: false,
    });

    var k=0;

// Convert all date fields in the workbook_response to the common format
// console.log("workbook_response-----",workbook_response);
for (const row of workbook_response) {

    for (const key in row) {
        // console.log("key=====",key);
        if (row.hasOwnProperty(key) && typeof row[key] === 'string') {
            // console.log(parseAndFormatDate(row[key]),"testt",key);
            if((key!='DOB' && key!='InsuranceValidityFromDate' && key!='InsuranceValidityToDate' && key!='DateofCreation' && key!='DateofJoining'))
            {
            row[key] = parseAndFormatDate(row[key]).date;
            }
            else 
            {
                // console.log(parseAndFormatDate(row[key]),"sadfsfsdf");
            if(parseAndFormatDate(row[key]).no==1)
            {
            row[key] = parseAndFormatDate(row[key]).date;
            }
            else{
                console.log("BREAK_________");
                k=1;
                break;
            }
        }
           
        }
    }
}
    if(k==1)
{
    console.log("RETURN_________");

return false;
}
else{
    console.log("LAST_RETURN_________");

    return workbook_response

}
}

export async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await counter.findOneAndUpdate({ _id: sequenceName }, { $inc: { sequence_value: 1 } }, { new: true }).exec();
    return sequenceDocument.sequence_value;
}