import 'dotenv/config.js';
const config = {
    DB: {
      HOST: process.env.MONGO_DB_HOST ,
      PORT: process.env.MONGO_DB_PORT ,
      DATABASE: process.env.PHARMACY_MONGO_DATABASE || "healthcare-crm1",
      USERNAME: process.env.PHARMACY_MONGO_USER || "healthcare-crm1",
      PASSWORD: process.env.PHARMACY_MONGO_PASSWORD || "dTYub456tD",
    },
    PORTS: {
      API_PORT: process.env.PHARMACY_SERVICE_PORT || 8001,
      EMAIL_PORT: 4200,
      APIHOST: "http://localhost",
    },
    EMAIL: {
      host: "smtp.gmail.com",
      user: "healthcare-crmexample@gmail.com",
      password: "weweksogsdlrkhlq",
    },
    cryptoSecret: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    secret: {
      jwt: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
    hospitalRoutes: ['/hospital/subscription-listing', '/hospital/subscription-purchased-plan', '/hospital/view-subscription-purchased-plan'],
    NODE_ENV: process.env.NODE_ENV || "local",
    stripeKey: process.env.stripeKey
  };
  
  module.exports.get = function get() {
    return config;
  };
  