import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import InitiateMongoServer from "./config/db.js";

const useragent = require("express-useragent");
const app = express();
const fileUpload = require('express-fileupload');

InitiateMongoServer();
// middleware
import { patientRoute, paymentRoute } from "./routes/index"

//middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
const _dirname = path.resolve();
app.use(bodyParser.json());
app.use(useragent.express());
app.use(fileUpload());
app.use(express.static(path.join(_dirname, "public")));
/* 
console.log(path.join(_dirname, "public")); */

app.use((err, req, res, next) => {
    console.log("Error @ app ", err);
    next(err);
});

// Routes
app.use("/", express.static("public"));

app.use("/patient", patientRoute);
app.use("/payment", paymentRoute);



export default app;
