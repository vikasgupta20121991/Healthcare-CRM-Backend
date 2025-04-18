import { validationResultData } from "../../helpers/transmission";
const { check } = require("express-validator");

exports.assignStaff = [
    check("parent_id")
        .exists()
    .withMessage("Parent ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide Parent ID"),
    check("assign_to_id")
        .exists()
        .withMessage("ID to whom to assign missing")
        .not()
        .isEmpty()
        .withMessage("Please provide ID to whom to assign"),
    check("assign_to_name")
        .exists()
        .withMessage("To Assign type missing")
        .not()
        .isEmpty()
        .withMessage("Please provide To Assign type"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]