"use strict";

import HttpService from "../middleware/httpservice";

const folderRoutesObject = {
    labimagingdentaloptical: 'labimagingdentalopticalServiceUrl',
    patient: 'patientServiceUrl',
    pharmacy: 'pharmacyServiceUrl',
    insurance: 'insuranceServiceUrl',
    hospital: 'hospitalServiceUrl',
}
export const stripeSubscriptionPaymentWebhook = async (req, res) => {
    console.log("stripeSubscriptionPaymentWebhook");
    const event = req.body;
    const role = event.data.object.metadata.role;
    const serviceURL = folderRoutesObject[role]
    console.log(serviceURL,'serviceURL');
    HttpService.postWithoutAuth(req, res, 'payment/stripe-payment-webhook', serviceURL);
}

export const createPaymentIntent = async (req, res) => {
    const role = req.header('role');
    const serviceURL = folderRoutesObject[role]
    HttpService.postWithAuth(req, res, 'payment/create-payment-intent', serviceURL);
    // if (role === 'patient') {
    // } else {
    //     HttpService.postWithAuth(req, res, 'subscription/create-payment-intent', serviceURL);
    // }
}

export const subscriptionPurchasedPlans = async (req, res) => {
    const role = req.header('role');
    const serviceURL = folderRoutesObject[role]
    HttpService.getWithAuth(req, res, 'subscription/subscription-purchased-plan', serviceURL);
}
export const viewSubscriptionPurchasedPlans = async (req, res) => {
    const role = req.header('role');
    const serviceURL = folderRoutesObject[role]
    HttpService.getWithAuth(req, res, 'subscription/view-subscription-purchased-plan', serviceURL);
}