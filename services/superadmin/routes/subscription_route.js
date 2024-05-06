"use strict";

import express from "express";
import Subscription from "../controllers/subscription/subscriptionController";
import validate from "../controllers/subscription/subscription.validate";
import { verifyToken } from "../helpers/verifyToken";
const subscriptionRoute = express.Router();

// subscriptionRoute.use(verifyToken);

subscriptionRoute.get("/subscription-plan-listing", validate.subscriptionPlanListing, Subscription.subscriptionPlanListing);
subscriptionRoute.get("/all-subscription-plans-config", Subscription.allSubscriptionPlansConfig);

export default subscriptionRoute;