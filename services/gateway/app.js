import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { userRoute, readFile, paymentRoute, superAdminRoute, roleRoute, menuRoute, patientRoute, individualDoctorRoute, pharmacyRoute, doctorRoute, hospitalRoute } from "./routes/index";

const { proxyRoute } = require("./routes/proxy-route");

const { setupLogging } = require("./middleware/logging");
const { setupRateLimit } = require("./middleware/ratelimit");
const { setupCreditCheck } = require("./middleware/creditcheck");
const { setupProxies } = require("./middleware/proxy");

const app = express();
const fileUpload = require('express-fileupload');

//middleware
app.use(cors({ origin: "*" }));
setupLogging(app);
setupRateLimit(app, proxyRoute);
setupCreditCheck(app, proxyRoute);
setupProxies(app, proxyRoute);
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
const _dirname = path.resolve();
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(path.join(_dirname, "public")));

app.use((err, req, res, next) => {
    console.log("Error @ app ", err);
    next(err);
});

// Routes
// app.use("/", express.static("public"));


app.use('/insurance', userRoute);
app.use('/read-file', readFile);
app.use("/superadmin", superAdminRoute);
app.use("/individual-doctor", individualDoctorRoute);
app.use("/payment", paymentRoute);
app.use("/patient", patientRoute);
app.use("/pharmacy", pharmacyRoute);
app.use("/doctor", doctorRoute);
app.use("/role", roleRoute);
app.use("/menu", menuRoute);
app.use("/patient", patientRoute);
app.use("/hospital", hospitalRoute);
app.use("/", (req, res) => {
    res.send("connected to gatewaay")
});


export default app;