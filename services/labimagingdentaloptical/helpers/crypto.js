import { validationResult } from "express-validator";
import * as CryptoJS from "crypto-js";
import { STATUS_CODE } from "../config/http";
const { config } = require("../config/constants");
const { CRYPTO_SECRET } = config;

export const validationResponse = (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.json(
      encryptObjectData({
        status: "failed",
        code: STATUS_CODE.badRequest,
        message: error.array(),
      })
    );
  } else {
    next();
  }
};

export const encryptObjectData = (data) => {
  const dataToEncrypt = JSON.stringify(data);
  const encPassword = CRYPTO_SECRET;
  const encryptedData = CryptoJS.AES.encrypt(
    dataToEncrypt.trim(),
    encPassword.trim()
  ).toString();
  return encryptedData;
};

export const encryptData = (data) => {
  const encPassword = CRYPTO_SECRET;
  const encryptedData = CryptoJS.AES.encrypt(
    data.trim(),
    encPassword.trim()
  ).toString();
  return encryptedData;
};

export const decryptObjectData = (response) => {
  if (!response.data) return false;
  const decPassword = CRYPTO_SECRET;
  const decryptedOutput = CryptoJS.AES.decrypt(
    response.data.trim(),
    decPassword.trim()
  ).toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedOutput);
};

export const decryptionData = (data) => {
  if (data) {
    const decPassword = CRYPTO_SECRET;
    const conversionDecryptOutput = CryptoJS.AES.decrypt(
      data.trim(),
      decPassword.trim()
    ).toString(CryptoJS.enc.Utf8);
    return conversionDecryptOutput;
  }
};

export const decryptMiddleware = async (req, res, next) => {
  let dc = await decryptObjectData(req.body);
  req.body = dc;
  next();
};
