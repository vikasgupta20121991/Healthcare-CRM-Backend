import jwt from "jsonwebtoken";
import { messageID, messages, config } from "../config/constants";
import { sendResponse } from "./transmission"
const { SECRET, INSURANCE_ROUTES } = config;

export const verifyToken = async (req, res, next) => {
    try {
        let token = req.header("Authorization");
        if(!token) return sendResponse(req, res, messageID.unAuthorizedUser, {
            status: false,
            body: null,
            message: messages.authError,
            errorCode: null,
        });
        const role = req.header("role");
        token = token.split('Bearer ')[1];
        let jwtSecretKey = SECRET.JWT;
        const decode = jwt.verify(token, jwtSecretKey);
        // if(decode.data.role !== role) return sendResponse(req, res, messageID.unAuthorizedUser, {
        //     status: false,
        //     body: null,
        //     message: messages.invalidToken,
        //     errorCode: null,
        // });
        // if (decode.data.role === 'insurance' && (!config.insuranceRoutes.includes(req.originalUrl.split('?')[0]) && !config.insuranceRoutes.includes(`${req.baseUrl}/*`))) {
        //     return sendResponse(req, res, messageID.unAuthorizedUser, {
        //         status: false,
        //         body: null,
        //         message: messages.notAuthorized,
        //         errorCode: null,
        //     });
        // } else if (decode.data.role === 'hospital' && (!config.hospitalRoutes.includes(req.originalUrl.split('?')[0]) && !config.hospitalRoutes.includes(`${req.baseUrl}/*`))) {
        //     return sendResponse(req, res, messageID.unAuthorizedUser, {
        //         status: true,
        //         body: null,
        //         message: messages.notAuthorized,
        //         errorCode: null,
        //     });
        // }
        req.user = decode.data
        next();
    } catch (error) {
        if (error.name == "TokenExpiredError") {
            sendResponse(req, res, messageID.unAuthorizedUser, {
                status: false,
                body: null,
                message: messages.tokenExpire,
                errorCode: null,
            });
        }
        sendResponse(req, res, messageID.unAuthorizedUser, {
            status: false,
            body: null,
            message: messages.invalidToken,
            errorCode: null,
        });
    }
}