import User from "../containers/users/user";
import { responseCodes, messageID, messages, emailText, htmlEmailVerify, htmlForgetPassword, forgetPasswordSub } from "../constant";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { decryptionData, encryptData, encryptObjectData } from "../middleware/utils";
import { sendEmail } from "../middleware/sendEmail";
const config = require('../config/config.js').get();
const { secret } = config;
const { PORTS } = config;

export const login = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        let user = await User.findOne(
            {
                username: username,
                status: { $ne: 0 },
                role: role
            }
        );
        if (!user) {
            return res.status(messageID.failureCode).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.failureCode,
                message: messages.userNotFound
            }))
        }

        if (!user.password) {
            return res.status(messageID.unAuthorizedUser).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.unAuthorizedUser,
                message: messages.passwordNotCreated,
            }));
        }
        const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
            return res.status(messageID.unAuthorizedUser).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.unAuthorizedUser,
                message: messages.incorrectPassword,
            }));
        if (user.isEmailVerified === false) {
            let payload = {};

            payload._id = user._id;
            payload.email = (user.role === 2) ? decryptionData(user.email) : user.email;
            payload.name = (user.role === 2) ? decryptionData(user.firstName) : user.email
            payload.role = user.role;

            let token = jwt.sign(payload, secret.jwt, { expiresIn: '24h' })
            return res.status(messageID.conflictCode).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.conflictCode,
                message: messages.emailNotVerified,
                token: token
            }));
        }

        let payload = {};

        payload._id = user._id;
        payload.email = user.email;
        payload.name = user.firstName
        payload.role = user.role;

        jwt.sign(
            payload,
            secret.jwt,
            {
                expiresIn: '24h'
            },
            (err, token) => {
                payload.token = `${token}`;
                if (err) {
                    return res.status(messageID.internalServerError).json(encryptObjectData({
                        status: responseCodes.failedStatus,
                        messageID: messageID.failureCode,
                        message: messages.internalServerError
                    }))
                };
                return res.status(messageID.successCode).json(encryptObjectData({
                    status: responseCodes.successStatus,
                    messageID: messageID.successCode,
                    message: messages.loginSuccess,
                    data: payload,
                }));
            }
        )

    } catch (error) {
        res.status(messageID.internalServerError).json(encryptObjectData({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.internalServerError
        }))
    }
}

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, _id } = req.body;
        let data = await User.findById(_id);
        const isMatch = await bcrypt.compare(oldPassword, data.password);
        if (isMatch) {
            const salt = await bcrypt.genSalt(10);
            let password = await bcrypt.hash(newPassword, salt);

            let payload = { password: password };

            User.findByIdAndUpdate(_id, { $set: payload }, { new: true },
                (err, result) => {
                    if (err) {
                        return res.status(messageID.internalServerError).json(encryptObjectData({
                            status: responseCodes.failedStatus,
                            messageID: messageID.failureCode,
                            message: messages.internalServerError
                        }))
                    }
                    res.status(messageID.successCode).json(encryptObjectData({
                        status: responseCodes.successStatus,
                        messageID: messageID.successCode,
                        message: messages.passwordChangeSuccess
                    }))
                })
        } else {
            return res.status(messageID.internalServerError).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.internalServerError,
                message: messages.internalServerError
            }))
        }
    } catch (error) {
        res.status(messageID.internalServerError).json(encryptObjectData({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.internalServerError
        }))
    }
}

export const updateProfile = async (req, res) => {
    try {
        let payload = req.body;

        if (payload.password) {
            const salt = await bcrypt.genSalt(10);
            let newPassword = await bcrypt.hash(payload.password, salt);
            payload.password = newPassword;
            let token = req.query.token;

            const decode = jwt.verify(token, jwtSecretKey);
            if (decode) {
                req.user = decode;
            } else {
                return res.status(messageID.forbidden).json({
                    status: responseCodes.failedStatus,
                    messageID: messageID.forbidden,
                    message: messages.invalidToken
                })
            }

            let _id = req.user._id;

            User.findByIdAndUpdate(_id, { $set: payload }, { new: true },
                (err, result) => {
                    if (err) return res.status(messageID.internalServerError).json({
                        status: responseCodes.failedStatus,
                        messageID: messageID.internalServerError,
                        message: messages.internalServerError
                    })
                    res.status(messageID.successCode).json({
                        status: responseCodes.successStatus,
                        messageID: messageID.successCode,
                        message: messages.profileUpdate
                    })
                });
        }
    } catch (error) {
        res.status(messageID.internalServerError).json({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.internalServerError
        })
    }
}

export const verifyEmail = (req, res) => {
    try {
        const token = req.query.token;
        let jwtSecretKey = secret.jwt;
        const decode = jwt.verify(token, jwtSecretKey);

        User.findById(decode._id, (err, result) => {
            if (err) {
                return res.status(messageID.internalServerError).json(encryptObjectData({
                    status: responseCodes.failedStatus,
                    messageID: messageID.internalServerError,
                    message: messages.failedAccount
                }))
            } else {
                if (result.isEmailVerified === true) {
                    return res.status(messageID.successCode).json(encryptObjectData({
                        status: responseCodes.successStatus,
                        messageID: messageID.successCode,
                        message: messages.emailAlreadyVerified
                    }))
                }
                result.isEmailVerified = true;
                result.save();
                res.status(messageID.successCode).json(encryptObjectData({
                    status: responseCodes.successStatus,
                    messageID: messageID.successCode,
                    message: messages.emailVerified
                }))
            }
        }
        )

    } catch (error) {
        res.status(messageID.internalServerError).json(encryptObjectData({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.failedAccount
        }))
    }
}

export const resendEmail = (req, res) => {
    try {
        const token = req.query.token;
        let jwtSecretKey = secret.jwt;
        const decode = jwt.verify(token, jwtSecretKey);
        let html = htmlEmailVerify(token, decode.name);
        sendEmail(decode.email.toLowerCase(), emailText.subjectEmail, html);
        res.status(messageID.successCode).json(encryptObjectData({
            status: responseCodes.successStatus,
            messageID: messageID.successCode,
            message: messages.emailSend
        }))
    } catch (error) {
        res.status(messageID.internalServerError).json(encryptObjectData({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.failedAccount
        }))
    }
}

export const forgotPassword = async function (req, res) {
    try {
        const { username } = req.body;
        let user;
        user = await User.findOne(
            {
                username
            },

        );
        if (!user) {
            return res.status(messageID.failureCode).json(encryptObjectData({
                status: responseCodes.failedStatus,
                messageID: messageID.failureCode,
                message: messages.userNotFound
            }))
        }
        let payload = { type: user.role, id: user._id };
        const token = jwt.sign(payload, secret.jwt);
        let html = htmlForgetPassword(token);
        sendEmail(user.email.toLowerCase(), forgetPasswordSub.subjectEmail, html);
        return res.status(messageID.successCode).json(encryptObjectData({
            status: responseCodes.successStatus,
            messageID: messageID.successCode,
            message: messages.emailSend
        }))
    } catch (e) {
        res.status(messageID.internalServerError).json(encryptObjectData({
            status: responseCodes.failedStatus,
            messageID: messageID.internalServerError,
            message: messages.failedAccount
        }))

    }
};

export const createPassword = async function (req, res) {
    try {
        const { password } = req.body;

        let token = req.query.token;

        var jwtSecretKey = secret.jwt;
        const decoded = jwt.verify(token, jwtSecretKey);

        let id = decoded.id;
        const type = decoded.type;
        const salt = await bcrypt.genSalt(10);
        let newPassword = await bcrypt.hash(password, salt);

        User.findByIdAndUpdate(id, { $set: { password: newPassword } }, { new: true },
            (err, result) => {
                if (err) {
                    return res.status(messageID.successCode).json(encryptObjectData({
                        status: responseCodes.successStatus,
                        messageID: messageID.successCode,
                        message: messages.passwordNotCreated
                    }))
                }
                return res.status(messageID.successCode).json(encryptObjectData({
                    status: responseCodes.successStatus,
                    messageID: messageID.successCode,
                    message: messages.passwordChangeSuccess
                }))
            });


    } catch (e) {
        return res.jsonp({
            status: "failure",
            messageID: responseCodes.failureCode,
            message: "Password Creation Failed",
        });
    }
}