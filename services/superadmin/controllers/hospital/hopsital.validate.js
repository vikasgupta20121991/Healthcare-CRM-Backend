import { validationResultData } from "../../helpers/transmission";
const { check } = require("express-validator");

exports.approveOrRejectHospital = [
    check("hospital_id")
        .exists()
        .withMessage("Hospital ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide hospital ID"),
    check("action")
        .exists()
        .withMessage("Action missing")
        .not()
        .isEmpty()
        .withMessage("Please provide action"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]
exports.viewHospitalAdminDetails = [
    check("hospital_admin_id")
        .exists()
        .withMessage("Hospital admin ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide hospital admin ID"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]