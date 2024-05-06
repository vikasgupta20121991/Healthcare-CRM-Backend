"use strict";

import express from "express";
import Payment from "../controllers/payment/paymentController";
import validate from "../controllers/payment/payment.validate";
import { verifyToken } from "../helpers/verifyToken";
const paymentRoute = express.Router();

paymentRoute.post("/stripe-payment-webhook", express.json({type: 'application/json'}), Payment.stripePaymentWebhook);
paymentRoute.post('/insurance-mobile-pay-data', Payment.getMobilePayData);

paymentRoute.use(verifyToken);
paymentRoute.post("/create-payment-intent", Payment.createPaymentIntent);
paymentRoute.get("/subscription-purchased-plan", Payment.subscriptionPurchasedPlans);
paymentRoute.get("/view-subscription-purchased-plan", validate.viewSubscriptionPurchasedPlans, Payment.viewSubscriptionPurchasedPlans);
paymentRoute.get("/insurance-is-plan-purchased", Payment.isPlanPurchased);
paymentRoute.get("/insurance-getallplanPrice", Payment.getallplanPrice);
paymentRoute.get("/insurance-getplanPriceMonthWise", Payment.getplanPriceMonthWise);
paymentRoute.get("/insurance-getPaymentHistory", Payment.getPaymentHistory);
export default paymentRoute;