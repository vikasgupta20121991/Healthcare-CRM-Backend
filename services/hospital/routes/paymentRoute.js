"use strict";

import express from "express";
import Payment from "../controllers/payment/paymentController";
import validate from "../controllers/payment/payment.validate";
import { verifyToken } from "../helpers/verifyToken";
const paymentRoute = express.Router();

paymentRoute.post("/stripe-payment-webhook", express.json({type: 'application/json'}), Payment.stripePaymentWebhook);
paymentRoute.post('/hospital-mobile-pay-data', Payment.getMobilePayData);

paymentRoute.use(verifyToken);
paymentRoute.post("/create-payment-intent", Payment.createPaymentIntent);
paymentRoute.get("/subscription-purchased-plan", Payment.subscriptionPurchasedPlans);
paymentRoute.get("/view-subscription-purchased-plan", validate.viewSubscriptionPurchasedPlans, Payment.viewSubscriptionPurchasedPlans);
paymentRoute.get("/hospital-is-plan-purchased", Payment.isPlanPurchased);
paymentRoute.get("/hospital-getallplanPrice", Payment.getallplanPrice);
paymentRoute.get("/hospital-getplanPriceMonthWise", Payment.getplanPriceMonthWise);
paymentRoute.get("/hospital-getPaymentHistory", Payment.getPaymentHistory);
paymentRoute.get("/hospital-getPaymentHistory_Hospital", Payment.getPaymentHistory_Hospital);

export default paymentRoute;