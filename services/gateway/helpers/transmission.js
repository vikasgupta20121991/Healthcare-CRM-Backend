// import { cipher, decipher } from "../middleware/crypto";
import { config } from "../config/constants";
import { encryptObjectData } from "../middleware/utils";

const sendResponse = (req, res, statusCode, result) => {
    if (
        config.NODE_ENV === "local"
    ) {
        return res.status(statusCode).send(result)
    }
    return res.status(statusCode).json(encryptObjectData(result));
};

module.exports = {
    sendResponse,
};
