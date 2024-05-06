import 'dotenv/config.js';
const config = {
  DB: {
    HOST: process.env.MONGO_DB_HOST ,
    PORT: process.env.MONGO_DB_PORT ,
    DATABASE: process.env.SUPERADMIN_MONGO_DATABASE || "healthcare-crm5",
    USERNAME: process.env.SUPERADMIN_MONGO_USER || "healthcare-crm5",
    PASSWORD: process.env.SUPERADMIN_MONGO_PASSWORD || "TYUHNg3456",
  },
  PORTS: {
    API_PORT: process.env.SUPERADMIN_SERVICE_PORT || 8006,
    EMAIL_PORT: 4200,
    APIHOST: "http://localhost",
  },
  EMAIL: {
    host: "smtp.gmail.com",
    user: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD || "",
  },
  cryptoSecret: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
  secret: {
    jwt: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
  },
  JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
  stripeKey: process.env.stripeKey

  // insuranceRoutes: ['/insurance/*']
};

module.exports.get = function get() {
  return config;
};
