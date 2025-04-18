import express from "express";
import { stripeSubscriptionPaymentWebhook, createPaymentIntent, subscriptionPurchasedPlans, viewSubscriptionPurchasedPlans } from "../controller/paymentWebhookController";
const paymentRoute = express.Router()

//Patient Subscription Routes
paymentRoute.post("/stripe-payment-webhook", stripeSubscriptionPaymentWebhook)
paymentRoute.post("/create-payment-intent", createPaymentIntent);
paymentRoute.get("/subscription-purchased-plan", subscriptionPurchasedPlans);
paymentRoute.get("/view-subscription-purchased-plan", viewSubscriptionPurchasedPlans);

export default paymentRoute;