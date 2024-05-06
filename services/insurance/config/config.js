import 'dotenv/config.js';
const config = {
    DB: {
        HOST: process.env.MONGO_DB_HOST ,
        PORT: process.env.MONGO_DB_PORT ,
        DATABASE: process.env.INSURANCE_MONGO_DATABASE || "healthcare-crm3",
        USERNAME: process.env.INSURANCE_MONGO_USER || "healthcare-crm3",
        PASSWORD: process.env.INSURANCE_MONGO_PASSWORD || "SDFerf346y",
    },
    PORTS: {
        API_PORT: process.env.INSURANCE_SERVICE_PORT || 8003,
        EMAIL_PORT: 4200,
        APIHOST: "http://localhost",
    },
    EMAIL: {
        host: "smtp.gmail.com",
        user: process.env.ADMIN_EMAIL || "youremail@gmail.com",
        password: process.env.ADMIN_PASSWORD || "password",
    },
    cryptoSecret: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    secret: {
        jwt: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
    // insuranceRoutes: ['/insurance/*']
    healthcare-crm_FRONTEND_URL: process.env.healthcare-crm_FRONTEND_URL || "",
    stripeKey: process.env.stripeKey

};

module.exports.get = function get() {
    return config;
};
