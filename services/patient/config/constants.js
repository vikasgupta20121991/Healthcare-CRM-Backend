import "dotenv/config.js";

export const config = {
    DB: {
        HOST: process.env.MONGO_DB_HOST ,
        PORT: process.env.MONGO_DB_PORT ,
        DATABASE: process.env.PATIENT_MONGO_DATABASE || "healthcare-crm6",
        USERNAME: process.env.PATIENT_MONGO_USER || "healthcare-crm6",
        PASSWORD: process.env.PATIENT_MONGO_PASSWORD || "PLKJMsd234",
    },
    PORTS: {
        API_PORT: process.env.PATIENT_SERVICE_PORT || 8007,
        EMAIL_PORT: 4200,
        APIHOST: "http://localhost",
    },
    BaseUrl: {
        insuranceServiceUrl: process.env.INSURANCE_SERVICE_URL,
        hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL,
        superadminServiceUrl: process.env.SUPERADMIN_SERVICE_URL,
        patientServiceUrl: process.env.PATIENT_SERVICE_URL,
        pharmacyServiceUrl: process.env.PHARMACY_SERVICE_URL,
        labimagingdentalopticalServiceUrl: process.env.LabImagingDentalOptical_SERVICE_URL,
        gatewayServiceUrl: process.env.GATEWAYSERVICEURL,

      },
    API_PORT: process.env.PATIENT_SERVICE_PORT || 8007,
    EMAIL: {
        HOST: "smtp.gmail.com",
        USER: "",
        PASSWORD: "pbskkrwtkrtzdagk",
    },
    CRYPTO_SECRET: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    secret: {
        jwt: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
    insuranceRoutes: ['/insurance/*'],
    NODE_ENV: process.env.NODE_ENV || "local",
    SMS_API_KEY: process.env.SMS_API_KEY ||"",
};

export const messages = {
    createAccount: "Your account create successfully.",
    failedAccount: "Your account create failed.",
    userExist: "User already exist.",
    userNotFound: "Please Check Your Credential.",
    dataNotFound: "No data found",
    incorrectPassword: "Incorrect Password",
    passwordNotCreated: "Password Not Created",
    loginSuccess: "Login Successfully",
    listSuccess: "Data fetch successfully",
    updateSuccess: "Data update successfully",
    statusUpdate: "Status update successfully",
    internalServerError: "Internal Server Error",
    passwordChangeSuccess: "Password Change Successfully",
    profileUpdate: "Profile Setup Successfully",
    authError: "Auth Error",
    tokenExpire: "Token Expire",
    invalidToken: "Invalid Token",
    internalError: "Internal Server Error",
    emailSend: "Email successfully send.",
    add: "Data Add successfully",
    emailNotVerified: "Email Not Verified",
    emailVerified: "Email Verified",
    emailAlreadyVerified: "Email Alredy Verified",
    emailSend: "Email Send Successfully.",
    userAlredyAdd: "User already add wait for approval.",
    userAdd: "User add success wait for approval.",
    notAuthorized: "Not authorized for this route"

};

export const messageID = {
    //to be used when no new record is inserted but to display success message
    successCode: 200,
    //to be used when new record is inserted
    newResourceCreated: 201,
    //to be used if database query return empty record
    nocontent: 204,
    //to be used if the request is bad e.g. if we pass record id which does not exits
    badRequest: 400,
    //to be used when the user is not authorized to access the API e.g. invalid access token. "jwtTokenExpired": 401
    unAuthorizedUser: 401,
    //to be used when access token is not valid
    forbidden: 403,
    //to be used if something went wrong
    failureCode: 404,
    //to be used when error occured while accessing the API
    internalServerError: 500,
    //to be used if record already axists
    conflictCode: 409,

}

export const ImmunizationColumns = {
    col1: 'name',  
}
