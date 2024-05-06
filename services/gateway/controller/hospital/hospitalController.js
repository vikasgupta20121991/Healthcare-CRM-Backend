"use strict";

import HttpService from "../../middleware/httpservice";

export const subscriptionListing = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/subscription-listing', 'paymentServiceUrl');
}
export const subscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/subscription-purchased-plan', 'paymentServiceUrl');
}
export const viewSubscriptionPurchasedPlans = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/view-subscription-purchased-plan', 'paymentServiceUrl');
}
export const assignStaff = async (req, res) => {
    HttpService.postWithAuth(req, res, 'hospital/assign-staff', 'insuranceServiceUrl');
}
export const listAssignedStaff = async (req, res) => {
    HttpService.getWithAuth(req, res, 'hospital/list-assigned-staff', 'insuranceServiceUrl');
}


