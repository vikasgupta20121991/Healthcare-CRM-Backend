"use strict";

import express from "express";
import Payment from "../controllers/payment/paymentController";
import validate from "../controllers/payment/payment.validate";
import { verifyToken } from "../helpers/verifyToken";
const paymentRoute = express.Router();

paymentRoute.post("/stripe-payment-webhook", express.json({type: 'application/json'}), Payment.stripePaymentWebhook);
paymentRoute.post('/patient-mobile-pay-data', Payment.getMobilePayData);

// paymentRoute.use(verifyToken);
paymentRoute.post("/create-payment-intent", Payment.createPaymentIntent);
paymentRoute.get("/subscription-purchased-plan", Payment.subscriptionPurchasedPlans);
paymentRoute.get("/view-subscription-purchased-plan", validate.viewSubscriptionPurchasedPlans, Payment.viewSubscriptionPurchasedPlans);
paymentRoute.get("/patient-is-plan-purchased",  Payment.isPlanPurchased);
paymentRoute.get("/patient-getallplanPrice",  Payment.getallplanPrice);
paymentRoute.get("/patient-getplanPriceMonthWise",  Payment.getplanPriceMonthWise);

paymentRoute.get("/patient-getPaymentHistory",  Payment.getPaymentHistory);
paymentRoute.get("/getPaymentHistoryForPatient",  Payment.getPaymentHistoryForPatient);
//For Mobile App
paymentRoute.post("/make-payment", Payment.makePayment);

paymentRoute.get("/get-pharmacy-order-payment-history",  Payment.getPharmacyPaymentHistory);

export default paymentRoute;