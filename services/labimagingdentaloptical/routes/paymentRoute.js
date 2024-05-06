"use strict";

import express from "express";
import Payment from "../controllers/payment/paymentController";
import validate from "../controllers/payment/payment.validate";
import { verifyToken } from "../helpers/verifyToken";
const paymentRoute = express.Router();

paymentRoute.post("/stripe-payment-webhook", express.json({type: 'application/json'}), Payment.stripePaymentWebhook);
paymentRoute.post('/fourPortal-mobile-pay-data', Payment.getMobilePayData);

paymentRoute.use(verifyToken);
paymentRoute.post("/create-payment-intent", Payment.createPaymentIntent);
paymentRoute.get("/subscription-purchased-plan", Payment.subscriptionPurchasedPlans);
paymentRoute.get("/view-subscription-purchased-plan", validate.viewSubscriptionPurchasedPlans, Payment.viewSubscriptionPurchasedPlans);
paymentRoute.get("/four-portal-is-plan-purchased", Payment.isPlanPurchased);
paymentRoute.get("/four-portal-getallplanPrice", Payment.getallplanPrice);
paymentRoute.get("/four-portal-getplanPriceMonthWise", Payment.getplanPriceMonthWise);
paymentRoute.get("/four-portal-getPaymentHistory", Payment.getPaymentHistory);
paymentRoute.get("/four-portal-getPaymentHistory_four-portal", Payment.getPaymentHistory_fourportal);

export default paymentRoute;