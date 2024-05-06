import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import InitiateMongoServer from "./config/db.js";
import { subscriberRoute, insuranceRoute, userRoute, roleRoute, staffRoute, menuRoute, hospitalRoute, superadmin, hospital, paymentRoute, medicineClaimRoute } from "./routes/index"

const useragent = require('express-useragent');
const app = express();
const fileUpload = require('express-fileupload');

InitiateMongoServer();
// middleware

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
const _dirname = path.resolve();
app.use(bodyParser.json());
app.use(useragent.express());
app.use(fileUpload());
// app.use(express.static(path.join(_dirname, "public")));
app.use("/", express.static("public"));
app.use("/esignature", express.static("uploadEsignature"));
app.use("/subscriberProfile", express.static("uploads/subscriberProfile"));
/* 
// console.log(path.join(_dirname, "public")); */
console.log("log app .js");
app.use((err, req, res, next) => {
    console.log("Error @ app ", err);
    next(err);
});

// Routes
app.use("/", express.static("public"));
// app.use("/superadmin", superadmin);
app.use("/hospital", hospital);
app.use("/payment", paymentRoute);
app.use("/user", userRoute);
app.use("/role", roleRoute);
app.use("/staff", staffRoute);
app.use("/menu", menuRoute);
app.use("/insurance", insuranceRoute);
app.use("/insurance-subscriber", subscriberRoute);
app.use("/hospital", hospitalRoute);
app.use("/claim", medicineClaimRoute);

export default app;
