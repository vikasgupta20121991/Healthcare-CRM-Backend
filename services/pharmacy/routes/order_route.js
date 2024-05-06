import express from "express";
import { dataValidation } from "../helpers/transmission";
import { verifyToken } from "../helpers/verifyToken";
const order = require("../controllers/order_controller");
const orderRoute = express.Router();

orderRoute.use(verifyToken);

orderRoute.post("/new-order", order.newOrder);
orderRoute.post("/new-order-from-eprescription", order.newOrderForEPrescription);
orderRoute.post("/list-order", order.listOrder);
orderRoute.get("/order-count", order.totalOrderCount);
orderRoute.post("/verify-insurance-for-order", order.verifyInsuranceForOrder);
orderRoute.post("/updateOrderComplete", order.updateOrderComplete);

orderRoute.post("/order-details", order.fetchOrderDetails);
orderRoute.put("/order-details", order.updateOrderDetails);
orderRoute.post("/confirm-order", order.confirmOrder);
orderRoute.post("/cancel-order", order.cancelOrder);
orderRoute.post("/update-schedule-order", order.updateConfirmScheduleorder);

orderRoute.get("/totalorder", order.totalOrderDashboardCount);
orderRoute.get("/totalorder", order.totalOrderDashboardCount);
orderRoute.get("/total-copayment-for-revenue", order.getTotalCoPayment);
orderRoute.get("/dashboardLineGraph-montlyCount", order.dashboardLineGraph);

orderRoute.get("/order-payment-history", order.getOrderPaymentHistory);


export default orderRoute;
