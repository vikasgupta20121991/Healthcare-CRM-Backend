"use strict";

import HttpService from "../../middleware/httpservice";

export const subscriptionPlanListing = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/subscription-plan-listing', 'superadminServiceUrl');
}
export const allSubscriptionPlansConfig = async (req, res) => {
    HttpService.getWithAuth(req, res, 'subscription/all-subscription-plans-config', 'superadminServiceUrl');
}