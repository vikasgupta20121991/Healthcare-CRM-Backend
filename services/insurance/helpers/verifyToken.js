import jwt from "jsonwebtoken";
import { messageID, messages, config } from "../config/constants";
import { sendResponse } from "../helpers/transmission"
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
        // console.log(decode, 'decode', role);
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
        console.log("error===========",error);
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