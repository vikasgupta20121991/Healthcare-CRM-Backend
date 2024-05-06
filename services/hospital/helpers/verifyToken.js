import jwt from "jsonwebtoken";
import { messageID, messages, config } from "../config/constants";
import { sendResponse } from "../helpers/transmission"
const { secret, INSURANCE_ROUTES } = config;
export const verifyToken = async (req, res, next) => {
    try {
        let token = req.header("Authorization");
        // console.log(token,"token123");
        if(!token) return sendResponse(req, res, messageID.unAuthorizedUser, {
            status: false,
            body: null,
            message: messages.authError,
            errorCode: null,
        });
        const role = req.header("role");
        token = token.split('Bearer ')[1];
        let jwtSecretKey = secret.jwt;
        const decode = jwt.verify(token, jwtSecretKey);
        // if(decode.data.role !== role) return sendResponse(req, res, messageID.unAuthorizedUser, {
        //     status: false,
        //     body: null,
        //     message: messages.invalidToken,
        //     errorCode: null,
        // });
        // if (decode.data.role === 'insurance' && (!INSURANCE_ROUTES.includes(req.originalUrl) && !INSURANCE_ROUTES.includes(`${req.baseUrl}/*`))) {
        //     return sendResponse(req, res, messageID.unAuthorizedUser, {
        //         status: false,
        //         body: null,
        //         message: messages.notAuthorized,
        //         errorCode: null,
        //     });
        // }
        req.user = decode.data
        next();
    } catch (error) {
        console.log(error,"check log error123");
        if (error.name == "TokenExpiredError") {
            return sendResponse(req, res, messageID.unAuthorizedUser, {
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

export const verifyRole = (validRoles) => {
    return (req, res, next) => {
        const role = req.user.role
        if (validRoles.includes(role)) {
            next()
        } else {
            sendResponse(req, res, 200, {
                status: false,
                body: null,
                message: messages.notAuthorized,
                errorCode: null,
            });
        }
    }
}