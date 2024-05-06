import { validationResponse } from "../middleware/utils.js";
import { check } from "express-validator";

export const isValidLogin = [
    check("username")
        .exists()
        .withMessage("USERNAME MISSING")
        .not()
        .isEmpty()
        .withMessage("USERNAME IS_EMPTY"),
    check("password")
        .exists()
        .withMessage("PASSWORD MISSING")
        .not()
        .isEmpty()
        .withMessage("PASSWORD IS_EMPTY")
        .isLength({
            min: 6
        })
        .withMessage("PASSWORD_TOO_SHORT_MIN_6"),

    (req, res, next) => {
        validationResponse(req, res, next);
    }
];

export const isValidChangePassword = [
    check("oldPassword")
        .exists()
        .withMessage("Old Password MISSING")
        .not()
        .isEmpty()
        .withMessage("Old Password IS_EMPTY"),
    check("newPassword")
        .exists()
        .withMessage("New Password MISSING")
        .not()
        .isEmpty()
        .withMessage("New Password IS_EMPTY"),
    (req, res, next) => {
        validationResponse(req, res, next);
    }
];


// export const isValidForgetPassword = [
//     check("email")
//         .exists()
//         .withMessage("email MISSING")
//         .not()
//         .isEmpty()
//         .withMessage("email IS_EMPTY"),
//     (req, res, next) => {
//         validationResponse(req, res, next);
//     }
// ];