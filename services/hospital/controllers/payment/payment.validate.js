import { validationResultData } from "../../helpers/transmission";
const { check } = require("express-validator");

exports.viewSubscriptionPurchasedPlans = [
    check("subscription_plan_id")
        .exists()
        .withMessage("Subscription payment ID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscription payment ID"),

  (req, res, next) => {
        validationResultData(req, res, next);
    }
]
exports.createPaymentIntent = [
    check("payment_method_types")
        .exists()
        .withMessage("Payment method type missing")
        .not()
        .isEmpty()
        .withMessage("Please provide payment method type"),
    check("description")
        .exists()
        .withMessage("Description missing")
        .not()
        .isEmpty()
        .withMessage("Please provide description"),
    check("plan_name")
        .exists()
        .withMessage("Plan name missing")
        .not()
        .isEmpty()
        .withMessage("Please provide plan name"),
    check("plan_price")
        .exists()
        .withMessage("Plan price missing")
        .not()
        .isEmpty()
        .withMessage("Please provide plan price"),
    check("plan_type")
        .exists()
        .withMessage("Plan type missing")
        .not()
        .isEmpty()
        .withMessage("Please provide plan type"),
    check("for_user")
        .exists()
        .withMessage("Login userID missing")
        .not()
        .isEmpty()
        .withMessage("Please provide login userID"),
    check("subscriber_name")
        .exists()
        .withMessage("Subscriber name missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber name"),
    check("subscriber_postal_code")
        .exists()
        .withMessage("Subscriber postal code missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber postal code"),
    check("subscriber_city")
        .exists()
        .withMessage("Subscriber city missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber city"),
    check("subscriber_state")
        .exists()
        .withMessage("Subscriber state missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber state"),
    check("subscriber_country")
        .exists()
        .withMessage("Subscriber country missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber country"),
    check("subscriber_address")
        .exists()
        .withMessage("Subscriber address missing")
        .not()
        .isEmpty()
        .withMessage("Please provide subscriber address"),

    (req, res, next) => {
        validationResultData(req, res, next);
    }
]