import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
const cron = require('node-cron');
import path from "path";
import InitiateMongoServer from "./config/db.js";
import {labimagingdentalopticalRoute, paymentRoute} from "../labimagingdentaloptical/routes/index.js"
import menuRoute from "./routes/menu_route.js";
import leaveManagementsRoute from "./routes/leave_route.js";
import {fourportal_sendReminderNotifications}  from "../labimagingdentaloptical/controllers/appointment.js"
const fileUpload = require('express-fileupload');

const useragent = require('express-useragent');
const app = express();

InitiateMongoServer();
// middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(fileUpload())
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
const _dirname = path.resolve();
app.use(bodyParser.json());
app.use(useragent.express());

app.use("/four-portal-esignature-for-e-prescription", express.static("uploadEsignature"));

app.use(express.static(path.join(_dirname, "public")));
/* 
console.log(path.join(_dirname, "public")); */

app.use((err, req, res, next) => {
    console.log("Error @ app ", err);
    next(err);
});

cron.schedule('*/1 * * * *', () => {
    fourportal_sendReminderNotifications();
});

// Routes
app.use("/", express.static("public"));

app.use("/labimagingdentaloptical", labimagingdentalopticalRoute);
app.use("/menu", menuRoute);
app.use("/payment", paymentRoute);
app.use("/leave", leaveManagementsRoute);
export default app;
