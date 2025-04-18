import 'dotenv/config.js';
const ROUTES = [
    {
        url: "/healthcare-crm-pharmacy",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.PHARMACY_SERVICE_URL || "http://127.0.0.1:8001",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-pharmacy`]: "",
            },
        },
    },
    {
        url: "/healthcare-crm-insurance",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.INSURANCE_SERVICE_URL || "http://127.0.0.1:8003",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-insurance`]: "",
            },
        },
    },
    {
        url: "/healthcare-crm-superadmin",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.SUPERADMIN_SERVICE_URL || "http://127.0.0.1:8006",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-superadmin`]: "",
            },
        },
    },
    {
        url: "/healthcare-crm-patient",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.PATIENT_SERVICE_URL || "http://127.0.0.1:8007",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-patient`]: "",
            },
        },
    },
    {
    url: "/healthcare-crm-labimagingdentaloptical",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.LabImagingDentalOptical_SERVICE_URL || "http://127.0.0.1:8008",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-labimagingdentaloptical`]: "",
            },
        },
    },
    {
        url: "/healthcare-crm-hospital",
        auth: false,
        creditCheck: false,
        // rateLimit: {
        //     windowMs: 15 * 60 * 1000,
        //     max: 300,
        // },
        proxy: {
            target: process.env.HOSPITAL_SERVICE_URL || "http://127.0.0.1:8004",
            changeOrigin: true,
            pathRewrite: {
                [`^/healthcare-crm-hospital`]: "",
            },
        },
    },
];

export const proxyRoute = ROUTES;
