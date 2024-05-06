"use strict";

const open = require('open');
import { handleResponse } from "../../helpers/transmission";
import SubscriptionPurchaseStatus from "../../models/subscription/purchasestatus";
import { sendResponse, createSession } from "../../helpers/transmission";
const config = require("../../config/config").get();
const Stripe = require("stripe");
const stripeKey = config.stripeKey;
const stripe = Stripe(stripeKey);
import Http from "../../helpers/httpservice"
import moment from "moment";
import mongoose from "mongoose";
import {sendEmail} from "../../helpers/ses";
import PortalUser from "../../models/portal_user";
import {SubscriptionMail} from "../../helpers/emailTemplate";
const httpService = new Http();
const getDays = (type) => {
    switch (type) {
        case 'monthly':
            return [30, 'Monthly']
            break;

        case 'quatarly':
            return [90, 'Quatarly']
            break;

        case 'half-yearly':
            return [180, 'Half Quaterly']
            break;
        case 'yearly':
            return [360, 'Yearly']
            break;

    }
}
const createExpiryDate = (days) => {
    Date.prototype.addDays = function (days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }
    const date = new Date();
    const newDate = new Date(date.addDays(days))
    const month = `0${newDate.getMonth() + 1}`
    const expiry_date = `${month.length > 2 ? month.slice(1) : month}/${newDate.getDate()}/${newDate.getFullYear()}`
    return expiry_date
}

const handlePaymentIntentSucceeded = async (data) => {
    console.log(data, 'data');
    let statusObject = {
        subscription_plan_name: data.metadata.plan_name,
        invoice_number: data.metadata.invoice_number,
        plan_price: data.metadata.plan_price,
        payment_mode: data.metadata.payment_mode,
        payment_type: data.metadata.payment_type,
        currency_code: 'XOF',
        status: data.status,
        order_id: data.metadata.order_id,
        transaction_id: data.id,
        for_user: data.metadata.for_user,
        order_type: data.metadata.type,
        portal_type: data.metadata.portal_type
    }

    if (data.metadata.type == 'subscription') {
        let dateString = createExpiryDate(getDays(data.metadata.plan_type)[0]);
        let dateObj = new Date(dateString);
        let isoString = dateObj.toISOString();
        statusObject['plan_type'] = getDays(data.metadata.plan_type)[1];
        statusObject['expiry_date'] = isoString;
        statusObject['services'] = JSON.parse(data.metadata.services)
    }
    const purchasestatus = new SubscriptionPurchaseStatus(statusObject);
    await purchasestatus.save()
    // Save PaymentStatus at hospital end also
    if (data.metadata.type === 'appointment') {
        console.log("runnnnnnnn")
        await httpService.postStaging('hospital-doctor/update-appointment-status', { data }, {}, 'hospitalServiceUrl');
    }
    if (data.metadata.type === 'portal_appointment') {
        await httpService.postStaging('labimagingdentaloptical/four-portal-update-Appointment', { data }, {}, 'labimagingdentalopticalServiceUrl');
    }
    if(data.metadata.type === 'subscription'){
        let userData = await PortalUser.findOne({_id: statusObject?.for_user})
        console.log(`userData`, userData);
        const content = SubscriptionMail(userData?.email, userData?.full_name,"Subscription Plan Purchased",statusObject?.plan_price);
        console.log("content_________",content)
        await sendEmail(content);
    }
}
const createCustomer = async (data) => {
    let obj = {
        name: 'Test Customer',
        email: data.email,
        description: `Description`,
        address: {
            line1: "Nagpur",
            line2: "Nagpur",
            city: "Nagpur",
            state: "Maharashtra",
            postal_code: 441111,
            country: 'India',
        },
        phone: "9898548598",
        source: data.token,
    };
    const customer = await stripe.customers.create(obj);
    return customer
}

const createToken = async () => {
    try {
        let obj = {
            number: 4242424242424242,
            exp_month: 12,
            exp_year: 28,
            cvc: 123,
        };
        const tokenData = await stripe.tokens.create({ card: obj });
        return tokenData.id
    } catch (err) {
        res.send({
            isSuccess: false,
            message: err,
        });
    }
};
const appointmentandDoctorDetail = async (ids, headers) => {
    let doctorDetail = await httpService.getStaging('patient/getappointmentdetailDoctorName', { ids }, headers, 'hospitalServiceUrl');
    let detail = doctorDetail?.body;
    return detail;
}

const getOrderDetailsById = async (ids, headers) => {
    let medicineOrderDetail = await httpService.getStaging('pharmacy/get-medicine-orderdetails-byid', { ids }, headers, 'pharmacyServiceUrl');
    let detail = medicineOrderDetail?.data;
    return detail;
}
class PaymentController {

    async getPaymentHistoryForPatient(req, res) {
        try {
            const { page, limit, order_type, searchText, patient_id, createdDate, updatedDate } = req.query;
            // var {searchText}=req.query;
            const headers = {
                'Authorization': req.headers['authorization']
            }

            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = Number(value);
            } else {
                sortingarray['createdAt'] = -1;
            }

            var myFilter = {}
            if (order_type !== undefined) {
                if (order_type == "subscription") {
                    myFilter.order_type = "subscription"
                } else if (order_type == "appointment") {
                    myFilter.order_type = "appointment"
                } else if (order_type == "medicine_order") {
                    myFilter.order_type = "medicine_order"
                }
            }
            if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);
                myFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            let condition = {}
            let mytext = req.query.searchText || "";
            var regexValue = new RegExp(mytext);
            if (mytext) {
                condition = {
                    $or: [
                        { Amount: new RegExp(mytext) },
                    ]
                };
            }

            const query = [
                {
                    $match: {
                        for_user: mongoose.Types.ObjectId(patient_id),
                        ...myFilter,
                    }
                },

                {
                    $project: {
                        transaction_id: "$transaction_id",
                        createdAt: "$createdAt",
                        Amount: "$plan_price",
                        payment_mode: "$payment_mode",
                        paymentType: "$order_type",
                        order_id: "$order_id"

                    },
                },
                { $match: condition },
                {
                    $match: {
                        $or: [
                            { Amount: { $regex: regexValue } },
                        ],
                    }
                },
                { $sort: sortingarray },

            ]
            const records = await SubscriptionPurchaseStatus.aggregate(query)

            if (limit) {
                query.push({ $skip: (page - 1) * limit },
                    { $limit: limit * 1 },)
            }

            const alltransactionlimit = await SubscriptionPurchaseStatus.aggregate(query)
            let orderIDArray = []
            let orderid = []
            let appointmentId;
            let medicineOrderId;
            let detail_order = {}

            const getPromise = alltransactionlimit.map(async (ele) => {
                if (ele.paymentType == 'appointment') {
                    appointmentId = ele.order_id
                    orderIDArray.push(appointmentId)
                } else if (ele.paymentType == 'medicine_order') {
                    medicineOrderId = ele.order_id
                    orderid.push(medicineOrderId)
                }
            });


            if (orderid.length > 0) {
                detail_order = await getOrderDetailsById(orderid, headers)
            }

            let resultData = []
            for (let index = 0; index < alltransactionlimit.length; index++) {
                let element = alltransactionlimit[index];

                if (detail_order.length > 0) {
                    var foundObject = detail_order.find(obj => obj._id == element.order_id);
                    if (foundObject != undefined) {
                        element.order_id = foundObject.order_id
                    }
                }
                resultData.push(element)
            }

            const allResults = await Promise.all(getPromise);

            allResults.forEach((detail, i) => {
                alltransactionlimit[i].detail = detail;
            });

            let count = records.length;
            let totalAmount = 0;
            for (const transaction of records) {
                totalAmount += parseInt(transaction.Amount);
            }

            handleResponse(req, res, 200, {
                status: true,
                body: {
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalRecords: count,
                    result: { alltransactionlimit: resultData, totalAmount: totalAmount }
                },
                message: "Successfully fetched payment history",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error)
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch payment history",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getPaymentHistory(req, res) {
        try {
            const { createdDate, updatedDate, order_type, portal, searchText } = req.query;
            var myFilter = {}
            if (order_type !== undefined) {
                if (order_type == "subscription") {
                    myFilter.order_type = "subscription"
                } else if (order_type == "appointment") {
                    myFilter.order_type = "appointment"
                } else if (order_type == "medicine_order") {
                    myFilter.order_type = "medicine_order"
                }
            }

            if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);
                myFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            let condition = {}
            let mytext = req.query.searchText || "";
            var regexValue = new RegExp(mytext);
            if (mytext) {
                condition = {
                    $or: [
                        { Name: new RegExp(mytext) },
                    ]
                };
            }


            const query = [
                {
                    $match: {
                        ...myFilter,
                    }
                },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_user",
                        foreignField: "_id",
                        as: "portalusersData",
                    }
                },
                { $unwind: "$portalusersData" },

                {
                    $lookup: {
                        from: "profileinfos",
                        localField: "for_user",
                        foreignField: "for_portal_user",
                        as: "profileinfos",
                    }
                },
                { $unwind: "$profileinfos" },


                {
                    $project: {
                        transaction_id: "$transaction_id",
                        createdAt: "$createdAt",
                        Amount: "$plan_price",
                        payment_mode: "$payment_mode",
                        paymentType: "$order_type",
                        paymentBy: "$portalusersData.role",
                        Name: "$profileinfos.full_name"

                    },
                },
                { $match: condition },
                {
                    $match: {
                        $or: [
                            { Name: { $regex: regexValue } },
                        ],
                    }
                },
                { $sort: { createdAt: -1 } },

            ]

            const transactions = await SubscriptionPurchaseStatus.aggregate(query)
            let count = transactions.length;
            let totalAmount = 0;
            for (const transaction of transactions) {
                totalAmount += parseInt(transaction.Amount);
            }

            console.log("result====>", transactions)

            handleResponse(req, res, 200, {
                status: true,
                body: { paytransactions: transactions, totalCount: count, totalAmount: totalAmount },
                message: "Successfully fetched payment history",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error)
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch payment history",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getallplanPrice(req, res) {
        try {
            const { createdDate, updatedDate, order_type, patientId } = req.query;

            var dateFilter = {}
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);

                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj };
            }
            else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }


            if (order_type === undefined) {
                console.log("order_type", order_type)
                dateFilter.order_type = "subscription"
            }

            if (patientId !== undefined) {
                console.log("patientId", patientId)
                dateFilter.for_user = mongoose.Types.ObjectId(patientId)
                console.log("dateFilter.for_user", dateFilter.for_user)
            }


            const result = await SubscriptionPurchaseStatus.find(
                { ...dateFilter },
                { plan_price: 1 },
            );

            console.log("result====>", result.length)
            // Calculate the total plan price
            let totalPlanPrice = 0;
            for (let i = 0; i < result.length; i++) {
                totalPlanPrice += parseInt(result[i].plan_price)
            }

            handleResponse(req, res, 200, {
                status: true,
                body: { totalPlanPrice: totalPlanPrice, commission: 0, totalnumber: result.length },
                message: "Successfully fetched all plan prices",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error)
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch all plan prices",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getplanPriceMonthWise(req, res) {
        try {
            //   const {year}=req.query
            const { createdDate, updatedDate } = req.query;
            //console.log(req.query,"queryyyy_______");

            var dateFilter = {}
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);

                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
            }
            else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                // dateFilter.createdAt = createdDateObj.toISOString();
                dateFilter.createdAt = { $gte: createdDateObj };
            }
            else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }
            const result = await SubscriptionPurchaseStatus.find(
                { order_type: "subscription", ...dateFilter },
                { plan_price: 1, createdAt: 1 },

            );
            let monthlyCount = {};
            let currentYear = moment().year();
            moment.months().forEach((month) => {
                monthlyCount[month] = 0;
            });

            result.forEach((item) => {
                if (item) {

                    let createDate = moment(item.createdAt);

                    let year = createDate.year();

                    if (year === currentYear) {
                        let month = createDate.format("MMMM");
                        if (!monthlyCount[month]) {
                            monthlyCount[month] = 1;
                        } else {
                            monthlyCount[month]++;
                        }
                    }

                }
            });
            const commission = await SubscriptionPurchaseStatus.find(
                { order_type: "commission", ...dateFilter },
                { plan_price: 1, createdAt: 1 },

            );
            let monthlyCount1 = {};
            let currentYear1 = moment().year();
            moment.months().forEach((month) => {
                monthlyCount1[month] = 0;
            });

            commission.forEach((item) => {
                if (item) {

                    let createDate = moment(item.createdAt);

                    let year = createDate.year();

                    if (year === currentYear1) {
                        let month = createDate.format("MMMM");
                        if (!monthlyCount1[month]) {
                            monthlyCount1[month] = 1;
                        } else {
                            monthlyCount1[month]++;
                        }
                    }

                }
            });
            let combinedArray = {};

            for (const month in monthlyCount) {
                combinedArray[month] = monthlyCount[month] + monthlyCount1[month];
            }

            console.log(combinedArray);

            handleResponse(req, res, 200, {
                status: true,
                body: { subscriptionArray: monthlyCount, commissionArray: monthlyCount1, totalTransaction: combinedArray },
                message: "Successfully fetched all plan prices",
                errorCode: null,
            });
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch all plan prices",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async stripePaymentWebhook(req, res) {

        const event = req.body;
        try {
            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    // Call a method to handle the successful payment intent.
                    handlePaymentIntentSucceeded(paymentIntent);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }
            res.json({ received: true });
        } catch (error) {
            res.json({ received: false });
        }
    }
    async subscriptionPurchasedPlans(req, res) {
        try {
            const { page, limit } = req.query
            const result = await SubscriptionPurchaseStatus.find({
                for_user: { $eq: req.user._id }
            })
                .sort([["createdAt", -1]])
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await SubscriptionPurchaseStatus.countDocuments({
                for_user: { $eq: req.user._id },
            });

            handleResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                    totalCount: count
                },
                message: "successfully fetched  subscription purchased plan",
                errorCode: null,
            });
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription purchased plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async viewSubscriptionPurchasedPlans(req, res) {
        try {
            const result = await SubscriptionPurchaseStatus.find({ _id: { $eq: req.query.purchased_plan_id } })

            handleResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched  subscription purchased plan",
                errorCode: null,
            });
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription purchased plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async createPaymentIntent(req, res) {
        try {
            const {
                payment_method_types,
                description,
                plan_name,
                services,
                plan_price,
                plan_type,
                for_user,
                payment_mode,
                order_type,
                payment_type } = req.body;

            let name, address, postal_code, city, state, country, type, order_id
            if (order_type == "medicine_order") {
                name = req.body.patient_name
                address = req.body.patient_address
                postal_code = req.body.patient_postal_code
                city = req.body.patient_city
                state = req.body.patient_state
                country = req.body.patient_country
                type = 'medicine_order',
                    order_id = req.body.order_id
            } if (order_type == "subscription") {
                name = req.body.subscriber_name
                address = req.body.subscriber_address
                postal_code = req.body.subscriber_postal_code
                city = req.body.subscriber_city
                state = req.body.subscriber_state
                country = req.body.subscriber_country
                type = 'subscription'
                order_id = ''
            }
            if (order_type == "appointment") {
                name = req.body.patient_name
                address = req.body.patient_address
                postal_code = req.body.patient_postal_code
                city = req.body.patient_city
                state = req.body.patient_state
                country = req.body.patient_country
                type = 'appointment'
                order_id = req.body.order_id
            }
            if (order_type == "test_order") {
                name = req.body.patient_name
                address = req.body.patient_address
                postal_code = req.body.patient_postal_code
                city = req.body.patient_city
                state = req.body.patient_state
                country = req.body.patient_country
                type = 'test_order',
                    order_id = req.body.order_id
            }
            if (order_type == "portal_appointment") {
                name = req.body.patient_name
                address = req.body.patient_address
                postal_code = req.body.patient_postal_code
                city = req.body.patient_city
                state = req.body.patient_state
                country = req.body.patient_country
                type = 'portal_appointment'
                order_id = req.body.order_id
            }

            stripe.paymentIntents.create(
                {
                    amount: parseInt(plan_price * 100),
                    currency: "XOF",
                    payment_method_types: [payment_method_types],
                    description,
                    metadata: {
                        plan_name,
                        invoice_number: `healthcare-crmINS${new Date().getTime()}`,
                        plan_price,
                        plan_type,
                        services: JSON.stringify(services),
                        for_user,
                        type,
                        order_id,
                        payment_mode,
                        payment_type,
                        role: req.header('role')
                    },
                    shipping: {
                        name: name,
                        address: {
                            line1: address,
                            postal_code: postal_code,
                            city: city,
                            state: state,
                            country: country,
                        },
                    },
                },
                function (err, paymentIntent) {
                    if (err) {
                        console.log(err, 'err');
                        handleResponse(req, res, 500, {
                            status: false,
                            body: null,
                            message: err.message,
                            errorCode: "INTERNAL_SERVER_ERROR",
                        })
                    } else {
                        handleResponse(req, res, 200, {
                            status: true,
                            body: paymentIntent,
                            message: "successfully created payment intent",
                            errorCode: null,
                        });
                    }
                }
            );

        } catch (error) {
            console.log(error, 'error');
            handleResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to create payment intent",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async makePayment(req, res) {
        try {
            const { token } = req.body
            // const cardToken = await createToken()
            // console.log(cardToken, 'cardToken');
            // const customer = await createCustomer({email: 'test@example.com', token: cardToken})
            // console.log(customer, 'customer');

            const charge = await stripe.paymentIntents.create({
                amount: 2000,
                currency: "USD",
                customer: "cus_NHCOjJHHzf63Z8",
                description: `Paid for Plan No:1`,
                confirm: true,
                capture_method: "automatic",
                confirmation_method: "automatic",
            });
            // open('https://hooks.stripe.com/redirect/authenticate/src_1MgiBeSJ597y6PdtC1MOMRIW?client_secret=src_client_secret_EQ2xPzllwKypBKf9RgAZgbfh&source_redirect_slug=test_YWNjdF8xTTZwQzRTSjU5N3k2UGR0LF9OUmJPODNOdGVIU2RlUmNyV2xhNngydk5TYXV5NFEw0100teFcH8aW')
            // window.location.href = 'https://hooks.stripe.com/redirect/authenticate/src_1MgiBeSJ597y6PdtC1MOMRIW?client_secret=src_client_secret_EQ2xPzllwKypBKf9RgAZgbfh&source_redirect_slug=test_YWNjdF8xTTZwQzRTSjU5N3k2UGR0LF9OUmJPODNOdGVIU2RlUmNyV2xhNngydk5TYXV5NFEw0100teFcH8aW'
            // const paymentIntent = await stripe.paymentIntents.confirm(
            //     'pi_3MgiS5SJ597y6Pdt0t7DO6r8',
            //     {
            //         return_url: 'https://example.com/return_url',
            //         shipping: {
            //             name: "Pranay",
            //             address: {
            //               line1: "Nagpur",
            //               postal_code: 441111,
            //               city: "Nagpur",
            //               state: "Maharashtra",
            //               country: "India",
            //             },
            //         },
            //     }    
            // );
            // const charge = await stripe.charges.create({
            //     amount: 2000,
            //     currency: 'inr',
            //     source: customer.default_source,
            //     description: 'My First Test Charge',
            //     customer: customer.id,
            //     shipping: {
            //         name: "Pranay",
            //         address: {
            //             line1: "Nagpur",
            //             postal_code: 441111,
            //             city: "Nagpur",
            //             state: "Maharashtra",
            //             country: "India",
            //         },
            //     },
            //   });
            handleResponse(req, res, 200, {
                status: true,
                body: charge,
                message: "successfully created payment",
                errorCode: null,
            });
        } catch (error) {

            handleResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message,
                errorCode: error.code,
            })
        }
    }

    async isPlanPurchased(req, res) {
        try {
            const { user_id } = req.query;
            var isPlanPurchased = false
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            const query = { for_user: user_id, expiry_date: { $gte: currentDate } };

            const count = await SubscriptionPurchaseStatus.countDocuments(query);

            if (count > 0) {
                isPlanPurchased = true
            }

            handleResponse(req, res, 200, {
                status: true,
                isPlanPurchased,
                count,
                message: isPlanPurchased ? 'Plan Purchased' : 'No plan purchased',
                errorCode: null,
            });
        } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription purchased plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async getMobilePayData(req, res) {
        console.log("runnnnnnn")
        try {
            console.log("cpm_currency>>>>>>>",req.body.cpm_currency)
            console.log(req.body.cpm_site_id,"reqqqqqqqqqqqqq=======>>>>>>", req.body)
            // if (!'cpm_error_message' in req.body) {
                console.log("runnnnnn2222222")
                const data = JSON.parse(req.body.cpm_custom)
                console.log("data>>>>>>>>>>", data)
                let obj = {
                    order_type: data?.order_type,
                    subscription_plan_name: data?.subscription_plan_name,
                    invoice_number: data?.invoice_number,
                    plan_price: data?.plan_price,
                    payment_mode: data?.payment_mode,
                    payment_type: data?.payment_type,
                    currency_code: data?.currency_code,
                    status: 'succeeded',
                    order_id: data?.order_id,
                    for_user: data?.for_user,
                    transaction_id: req.body.cpm_trans_id,
                    portal_type: data?.portal_type ? data?.portal_type : "",
                    mobile_pay_number:data?.mobile_pay_number
                }

                console.log("obj>>>>>>>>>>>>>", obj)

                if (data?.order_type == 'subscription') {
                    console.log("run1111111")
                    let dateString = createExpiryDate(getDays(data?.plan_type)[0]);
                    let dateObj = new Date(dateString);
                    let isoString = dateObj.toISOString();
                    obj['plan_type'] = getDays(data?.plan_type)[1];
                    obj['expiry_date'] = isoString;
                    obj['services'] = JSON.parse(data?.services)
                }

                const purchasestatus = new SubscriptionPurchaseStatus(obj)

                console.log("purchasestatus>>>>>>>", purchasestatus)

                await purchasestatus.save();

                if ( data?.order_type === 'appointment') {
                    console.log("runnnnnnnn11111")
                    await httpService.postStaging('hospital-doctor/update-appointment-status', { data }, {}, 'hospitalServiceUrl');
                }
                if ( data?.order_type === 'portal_appointment') {
                    console.log("runnnnnnnn2222")
                    await httpService.postStaging('labimagingdentaloptical/four-portal-update-Appointment', { data }, {}, 'labimagingdentalopticalServiceUrl');
                }

                if ( data?.order_type === 'medicine_order') {
                    console.log("runnnnnnnn3333")
                    await httpService.postStaging('order/confirm-order', { data }, {}, 'pharmacyServiceUrl');
                }

                if ( data?.order_type === 'test_order') {
                    console.log("runnnnnnnn44444")
                    await httpService.postStaging('labimagingdentaloptical/four-portal-confirm-order', { data }, {}, 'labimagingdentalopticalServiceUrl');
                }
            // }

            return sendResponse(req, res, 200, {
                status: true,
                body: null,
                message: "Data Fetched",
                errorCode: null,
            });
        } catch (e) {
            console.log("errrrrrrrrr", e)
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch data",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }

    async getPharmacyPaymentHistory(req,res){
        try {
            let {orderId,createdDate, updatedDate,searchKey} = req.query;
            const dateFilter = {};
            if (createdDate && createdDate !== "" && updatedDate && updatedDate !== "") {
                const createdDateObj = new Date(createdDate);
                const updatedDateObj = new Date(updatedDate);
 
                dateFilter.$and = [
                    { createdAt: { $gte: createdDateObj } },
                    { createdAt: { $lte: updatedDateObj } },
                ];
            } else if (createdDate && createdDate !== "") {
                const createdDateObj = new Date(createdDate);
                dateFilter.createdAt = { $gte: createdDateObj };
            } else if (updatedDate && updatedDate !== "") {
                const updatedDateObj = new Date(updatedDate);
                dateFilter.createdAt = { $lte: updatedDateObj };
            }
            // let paymentDetails = await SubscriptionPurchaseStatus.find({order_id: orderId ,...dateFilter});

            let searchFilter;
            if (searchKey) {
                searchFilter = { 'portalusersData.full_name': { $regex: searchKey || "", $options: "i" } }
            }

            let paymentDetails = await SubscriptionPurchaseStatus.aggregate([
                {
                    $match: { 
                        order_id: { $in: orderId },
                        ...dateFilter
                    }
                },
                {
                    $lookup: {
                        from: "portalusers",
                        localField: "for_user",
                        foreignField: "_id",
                        as: "portalusersData",
                    }
                },
                { $unwind: "$portalusersData" },
                {
                    $match: searchFilter || {}
                },
                {
                    $project: {
                        plan_price: 1,
                        payment_mode:1,
                        transaction_id:1,
                        _id: 0 ,
                        createdAt:1,
                        patientName: "$portalusersData.full_name"
                    }
                }
            ]);

            sendResponse(req, res, 200, {
                status: true,
                data: paymentDetails,
                message: `All data fetched successfully`,
                errorCode: null,
            });
 
        } catch (error) {
            console.log(error, "__________error");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: error.message ? error.message : "Something went wrong",
                errorCode: error.code ? error.code : "Internal server error",
            });
        }
    }
}

module.exports = new PaymentController();