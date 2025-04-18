import { handleResponse } from "../../helpers/transmission";
import HospitalSubscriptionModal from "../../models/subscription/subscriptionplans";
import SubscriptionPlanConfig from "../../models/subscription/subscriptionplanconfigs";

class HospitalSubscription {
    async subscriptionPlanListing(req, res) {
        try {
            const { page, limit, subscription_plan_for } = req.query
            const pageNo = page ? page : 1
            const totalLimit = limit ? limit : 10
            const result = await HospitalSubscriptionModal.find({ 
                plan_for: subscription_plan_for
            })
            .populate({
                path: "plan_periodic",
            })
            .sort([["createdAt", -1]])
            .limit(totalLimit * 1)   
            .skip((pageNo - 1) * totalLimit)
            .exec();
            const count = await HospitalSubscriptionModal.countDocuments({
                plan_for: subscription_plan_for
      });
    
            handleResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                    totalCount: count
                },
                message: "successfully fetched  subscription plan",
                errorCode: null,
            });
           } catch (error) {
            console.log(error);
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription plan",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
           }
    }
    async allSubscriptionPlansConfig(req, res) {
        try {
            const result = await SubscriptionPlanConfig.find({})
          
            handleResponse(req, res, 200, {
                status: true,
                body: {
                    data: result,
                },
                message: "successfully fetched  subscription plan config",
                errorCode: null,
            });
           } catch (error) {
            handleResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetched subscription plan config",
                errorCode: "INTERNAL_SERVER_ERROR",
            })
           }
    }
}

module.exports = new HospitalSubscription()