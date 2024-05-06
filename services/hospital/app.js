const cron = require('node-cron');
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import InitiateMongoServer from "./config/db.js";
import { hospitalDoctorRoute, individualDoctorRoute, HospitalRoute, roleRoute, menuRoute, paymentRoute, patientRoute, leaveManagementRoute } from "./routes/index";


const hospital = require("./controllers/hospital_controller");
const hospital_patient = require("./controllers/patient_controller.js")
const useragent = require('express-useragent');
const fileUpload = require('express-fileupload');
const app = express();

InitiateMongoServer();
// middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
const _dirname = path.resolve();
app.use(bodyParser.json());
app.use(fileUpload());
app.use(useragent.express());

app.use(express.static(path.join(_dirname, "public")));
/* 
console.log(path.join(_dirname, "public")); */

app.use((err, req, res, next) => {
    console.log("Error @ app ", err);
    next(err);
});

//Run Cron JOB for healthcare-crm Doctor
cron.schedule('0 0 * * *', () => {
    hospital.setDoctorAvailabilityForFilter()
    //console.log('running day at midnight');
});

// Cron job to send reminders before consultation start time
// cron.schedule('*/1 * * * *', () => {
//     hospital_patient.sendReminderNotifications();
// });

// Routes
app.use("/", express.static("public"));
app.use("/esignature-for-e-prescription", express.static("uploadEsignature"));

app.use("/hospital-doctor", hospitalDoctorRoute);
app.use("/individual-doctor", individualDoctorRoute);
app.use("/hospital", HospitalRoute);
app.use("/patient", patientRoute);
app.use("/role", roleRoute);
app.use("/menu", menuRoute);
app.use("/payment", paymentRoute);
app.use("/leave", leaveManagementRoute);

export default app;
