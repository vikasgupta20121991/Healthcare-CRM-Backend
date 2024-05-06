import { publicEncrypt, privateDecrypt, generateKeyPairSync } from "crypto";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

function encrypt(toEncrypt, relativeOrAbsolutePathToPublicKey) {
  const absolutePath = resolve(relativeOrAbsolutePathToPublicKey);
  const publicKey = readFileSync(absolutePath, "utf8");
  const buffer = Buffer.from(toEncrypt, "utf8");
  const encrypted = publicEncrypt(publicKey, buffer);
  return encrypted.toString("base64");
}

function decrypt(toDecrypt, relativeOrAbsolutePathtoPrivateKey) {
  const absolutePath = resolve(relativeOrAbsolutePathtoPrivateKey);
  const privateKey = readFileSync(absolutePath, "utf8");
  const buffer = Buffer.from(toDecrypt, "base64");
  const decrypted = privateDecrypt(
    {
      key: privateKey.toString(),
      passphrase: "",
    },
    buffer
  );
  return decrypted.toString("utf8");
}

function generateKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    namedCurve: "secp256k1",
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase: "",
    },
  });

  writeFileSync("private.pem", privateKey);
  writeFileSync("public.pem", publicKey);
}

// generateKeys();

// export const cipher = (val, json = false) => {
//     if (json) {
//         return encrypt(JSON.stringify(val), `../../public_key.pem`);
//     }
//     return encrypt(val, `../../public_key.pem`);
// };

// export const decipher = (val, json = false) => {
//     let decryptedVal = decrypt(val, `../../private_key.pem`);
//     if (json) {
//         return JSON.parse(decryptedVal)
//     }
//     return decryptedVal;
// };
