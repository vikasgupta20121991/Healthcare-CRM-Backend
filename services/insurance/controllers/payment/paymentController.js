"use strict";

import mongoose from "mongoose";
import { sendResponse } from "../../helpers/transmission";
import SubscriptionPurchaseStatus from "../../models/subscription/purchasestatus";
const config = require("../../config/config").get();
const Stripe = require("stripe");
const stripeKey = config.stripeKey;
const stripe = Stripe(stripeKey);
import PortalUser from "../../../insurance/models/insurance/user/portal_user";
import StaffInfo from "../../../insurance/models/insurance/user/staff_info";
import {sendEmail} from "../../helpers/ses";
import {SubscriptionMail} from "../../helpers/emailTemplate";
const NodeCache = require("node-cache");
const myCache = new NodeCache();

import moment from "moment";
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
    console.log(data.metadata, 'INSURANCE METADATA===>');

    let obj = {
        order_type: data.metadata?.type,

        subscription_plan_name: data.metadata?.plan_name,

        invoice_number: data.metadata?.invoice_number,

        plan_price: data.metadata?.plan_price,

        payment_mode: data.metadata?.payment_mode,

        payment_type: data.metadata?.payment_type,

        currency_code: 'XOF',

        status: data.status,

        order_id: data.metadata?.order_id,

        for_user: data.metadata?.for_user,

        transaction_id: data.id,

    }
    if (data.metadata?.type == 'subscription') {

        let dateString = createExpiryDate(getDays(data.metadata.plan_type)[0]);

        let dateObj = new Date(dateString);

        let isoString = dateObj.toISOString();

        obj['plan_type'] = getDays(data.metadata.plan_type)[1];

        obj['expiry_date'] = isoString;

        obj['services'] = JSON.parse(data.metadata.services)

    }

    const purchasestatus = new SubscriptionPurchaseStatus(obj)

    await purchasestatus.save()

    if(data.metadata.type === 'subscription'){
        let userData = await PortalUser.findOne({_id: data.metadata?.for_user})
        console.log(`userData`, userData);
        const content = SubscriptionMail(userData?.email, userData?.user_name,"Subscription Plan Purchased", data?.metadata?.plan_price);
        console.log("content_________",content)
        await sendEmail(content);
    }
}

class PaymentController {

    async getPaymentHistory(req, res) {
        try {
            const { createdDate, updatedDate, order_type, portal, } = req.query;
            var myFilter = {}
            console.log("order_type", order_type)
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
                        from: "admininfos",
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
            let count = transactions.length
            let totalAmount = 0;
            for (const transaction of transactions) {
                totalAmount += parseInt(transaction.Amount);
            }
            sendResponse(req, res, 200, {
                status: true,
                body: { paytransactions: transactions, totalCount: count, totalAmount: totalAmount },
                message: "Successfully fetched payment history",
                errorCode: null,
            });
        } catch (error) {
            console.log("error", error)
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch payment history",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getallplanPrice(req, res) {
        try {
            const { createdDate, updatedDate } = req.query;

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
                { plan_price: 1 },

            );

            // Calculate the total plan price
            let totalPlanPrice = 0;
            for (let i = 0; i < result.length; i++) {
                totalPlanPrice += parseInt(result[i].plan_price)
            }
            console.log(totalPlanPrice, "totalPlanPrice");
            sendResponse(req, res, 200, {
                status: true,
                body: { totalPlanPrice: totalPlanPrice, commission: 0, totalnumber: result.length },
                message: "Successfully fetched all plan prices",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "Failed to fetch all plan prices",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getplanPriceMonthWise(req, res) {
        try {
            const { createdDate, updatedDate } = req.query;

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
                { order_type: "commission" },
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

            sendResponse(req, res, 200, {
                status: true,
                body: { subscriptionArray: monthlyCount, commissionArray: monthlyCount1, totalTransaction: combinedArray },
                message: "Successfully fetched all plan prices",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
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
            var { page, limit, user_id } = req.query
            var sort = req.query.sort
            var sortingarray = {};
            if (sort != 'undefined' && sort != '' && sort != undefined) {
                var keynew = sort.split(":")[0];
                var value = sort.split(":")[1];
                sortingarray[keynew] = value;
            } else {
                sortingarray['createdAt'] = -1;
            }

            let checkUser = await PortalUser.findOne({ _id: mongoose.Types.ObjectId(user_id) })

            if (checkUser.role === "INSURANCE_STAFF") {
                let staffData = await StaffInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(user_id) })
                user_id = staffData?.for_user;
            }
            const result = await SubscriptionPurchaseStatus.find({
                for_user: user_id
            })
                .sort(sortingarray)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
            const count = await SubscriptionPurchaseStatus.countDocuments({
                for_user: user_id,
            });

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                    totalCount: count
                },
                message: "successfully fetched  subscription purchased plan",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
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

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: "successfully fetched  subscription purchased plan",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription purchased plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }
    async createPaymentIntent(req, res) {
        try {
            const { payment_method_types, description, plan_name, plan_price, plan_type, for_user, payment_mode, payment_type, services } = req.body;
            let name, address, postal_code, city, state, country, type, order_id
            if (req.body.order_type === 'medicine_order') {
                name = req.body.patient_name
                address = req.body.patient_address
                postal_code = req.body.patient_postal_code
                city = req.body.patient_city
                state = req.body.patient_state
                country = req.body.patient_country
                type = 'medicine_order'
                order_id = req.body.order_id
            } if (req.body.order_type === 'subscription') {
                name = req.body.subscriber_name
                address = req.body.subscriber_address
                postal_code = req.body.subscriber_postal_code
                city = req.body.subscriber_city
                state = req.body.subscriber_state
                country = req.body.subscriber_country
                type = 'subscription'
                order_id = ''
            }

            console.log("SERVICES===>", services)
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
                        sendResponse(req, res, 500, {
                            status: false,
                            body: null,
                            message: err.message,
                            errorCode: "INTERNAL_SERVER_ERROR",
                        })
                    } else {
                        sendResponse(req, res, 200, {
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
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "failed to create payment intent",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
        }
    }


    async isPlanPurchased(req, res) {
        try {
            const { user_id } = req.query;
            var isPlanPurchased = false
            var count = 0;
            // var value = myCache.get(req.query.user_id + "insurancesubscriptionplan");
            // if (value == undefined) {
                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                // const formattedDate = currentDate.toISOString().split('T')[0];
                // console.log(formattedDate, "check date formate");

                const query = { for_user: user_id, expiry_date: { $gte: currentDate } };
                console.log(query, "query check");

                count = await SubscriptionPurchaseStatus.countDocuments(query);
                console.log(count, "count check");
                // var success = myCache.set(req.query.user_id + "insurancesubscriptionplan", count, 1000);
            // } else {
            //     count = value
            // }

            if (count > 0) {
                isPlanPurchased = true
            }

            sendResponse(req, res, 200, {
                status: true,
                isPlanPurchased,
                count,
                message: isPlanPurchased ? 'Plan Purchased' : 'No plan purchased',
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
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
            console.log("cpm_currency>>>>>>>", req.body.cpm_currency)
            console.log(req.body.cpm_site_id, "reqqqqqqqqqqqqq=======>>>>>>", req.body)
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
                mobile_pay_number: data?.mobile_pay_number
                // portal_type: data?.portal_type
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
}

module.exports = new PaymentController();