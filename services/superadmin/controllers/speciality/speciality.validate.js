import { validationResultData } from "../../helpers/transmission";
const { check } = require("express-validator");

exports.specialization = [
    check("specialization")
        .exists()
        .withMessage("specialization missing")
        .not()
        .isEmpty()
        .withMessage("Please provide specialization"),
    check("category")
        .exists()
        .withMessage("category missing")
        .not()
        .isEmpty()
        .withMessage("Please provide category"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]