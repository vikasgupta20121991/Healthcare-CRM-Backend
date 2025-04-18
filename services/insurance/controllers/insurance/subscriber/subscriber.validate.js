import { validationResultData } from "../../../helpers/transmission";
const { check } = require("express-validator");

exports.addPrimarySubscriber = [
    check("subscriber_type")
      .exists()
      .withMessage("Subscriber type missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber type empty"),
    check("subscription_for")
      .exists()
      .withMessage("Subscription for missing")
      .not()
      .isEmpty()
      .withMessage("Subscription for empty"),
    check("health_plan_for")
      .exists()
      .withMessage("InsurancePlanId missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter a Valid InsurancePlanId"),
    check("subscriber_first_name")
      .exists()
      .withMessage("Subscriber first name missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber first name empty"),
    check("subscriber_last_name")
      .exists()
      .withMessage("Subscriber last name missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber last name empty"),
    check("date_of_birth")
      .exists()
      .withMessage("Date of Birth missing")
      .not()
      .isEmpty()
      .withMessage("Date of Birth empty"),
    check("gender")
      .exists()
      .withMessage("Gender missing")
      .not()
      .isEmpty()
      .withMessage("Gender empty"),
    check("insurance_id")
      .exists()
      .withMessage("Insurance ID missing")
      .not()
      .isEmpty()
      .withMessage("Insurance ID empty"),
    check("policy_id")
      .exists()
      .withMessage("Policy ID missing")
      .not()
      .isEmpty()
      .withMessage("Policy ID empty"),
    check("card_id")
      .exists()
      .withMessage("Card ID missing")
      .not()
      .isEmpty()
    .withMessage("Card ID empty"),
  check("employee_id")
      .exists()
      .withMessage("Employee ID missing")
      .not()
      .isEmpty()
      .withMessage("Employee ID empty"),
    check("insurance_holder_name")
      .exists()
      .withMessage("insurance holder name missing")
      .not()
      .isEmpty()
      .withMessage("insurance holder name empty")
      .trim(),
    check("insurance_validity_from")
      .exists()
      .withMessage("insurance validity from date missing")
      .not()
      .isEmpty()
      .withMessage("insurance validity from date empty"),
    check("insurance_validity_to")
      .exists()
      .withMessage("insurance validity to date missing")
      .not()
      .isEmpty()
      .withMessage("insurance validity to date empty"),
    check("reimbersement_rate")
      .exists()
      .withMessage("reimbersement rate missing")
      .not()
      .isEmpty()
      .withMessage("reimbersement rate empty"),
    check("for_user")
      .exists()
      .withMessage("UserId missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter a Valid UserId"),
    (req, res, next) => {
      validationResultData(req, res, next);
    }
];

exports.addSecondarySubscriber = [
  check("subscriber_type")
      .exists()
      .withMessage("Subscriber type missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber type empty"),
    check("subscription_for")
      .exists()
      .withMessage("Subscription for missing")
      .not()
      .isEmpty()
      .withMessage("Subscription for empty"),
    check("health_plan_for")
      .exists()
      .withMessage("InsurancePlanId missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter a Valid InsurancePlanId"),
    check("relationship_with_insure")
      .exists()
      .withMessage("relationship with insure missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter a Valid insure relationship"),
    check("subscriber_first_name")
      .exists()
      .withMessage("Subscriber first name missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber first name empty"),
    check("subscriber_last_name")
      .exists()
      .withMessage("Subscriber last name missing")
      .not()
      .isEmpty()
      .withMessage("Subscriber last name empty"),
    check("date_of_birth")
      .exists()
      .withMessage("Date of Birth missing")
      .not()
      .isEmpty()
      .withMessage("Date of Birth empty"),
    check("gender")
      .exists()
      .withMessage("Gender missing")
      .not()
      .isEmpty()
      .withMessage("Gender empty"),
    check("insurance_id")
      .exists()
      .withMessage("Insurance ID missing")
      .not()
      .isEmpty()
      .withMessage("Insurance ID empty"),
    check("policy_id")
      .exists()
      .withMessage("Policy ID missing")
      .not()
      .isEmpty()
      .withMessage("Policy ID empty"),
    check("card_id")
      .exists()
      .withMessage("Card ID missing")
      .not()
      .isEmpty()
      .withMessage("Card ID empty"),
    check("employee_id")
      .exists()
      .withMessage("Employee ID missing")
      .not()
      .isEmpty()
      .withMessage("Employee ID empty"),
    check("insurance_holder_name")
      .exists()
      .withMessage("insurance holder name missing")
      .not()
      .isEmpty()
      .withMessage("insurance holder name empty")
      .trim(),
    check("insurance_validity_from")
      .exists()
      .withMessage("insurance validity from date missing")
      .not()
      .isEmpty()
      .withMessage("insurance validity from date empty"),
    check("insurance_validity_to")
      .exists()
      .withMessage("insurance validity to date missing")
      .not()
      .isEmpty()
      .withMessage("insurance validity to date empty"),
    check("reimbersement_rate")
      .exists()
      .withMessage("reimbersement rate missing")
      .not()
      .isEmpty()
      .withMessage("reimbersement rate empty"),
    check("for_user")
      .exists()
      .withMessage("UserId missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter a Valid UserId"),
    check("primary_id")
      .exists()
      .withMessage("primary insurance id missing")
      .not()
      .isEmpty()
      .withMessage("Please Enter primary insurance id"),
    (req, res, next) => {
      validationResultData(req, res, next);
    }
];

exports.deleteSubscriber = [
    check("subscriber_id")
        .exists()
        .withMessage("Subscriber ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber ID"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]

exports.updateSubscriber = [
    check("subscriber_id")
        .exists()
        .withMessage("Subscriber ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber ID"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]

exports.viewSubscriber = [
    check("subscriber_id")
        .exists()
        .withMessage("Subscriber ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber ID"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]