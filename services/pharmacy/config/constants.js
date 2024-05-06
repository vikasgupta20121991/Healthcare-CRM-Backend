import "dotenv/config.js";

export const config = {
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
    BaseUrl: {
        insuranceServiceUrl: process.env.INSURANCE_SERVICE_URL,
        labimagingdentalopticalServiceUrl: process.env.LabImagingDentalOptical_SERVICE_URL,
        superadminServiceUrl: process.env.SUPERADMIN_SERVICE_URL,
        patientServiceUrl: process.env.PATIENT_SERVICE_URL,
        pharmacyServiceUrl: process.env.PHARMACY_SERVICE_URL,
        hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL,
        gatewayServiceUrl: process.env.GATEWAYSERVICEURL,
    },
    EMAIL: {
        HOST: "smtp.gmail.com",
        USER: process.env.ADMIN_EMAIL || "",
        PASSWORD: process.env.ADMIN_EMAIL_PASSWORD || "pbskkrwtkrtzdagk",
    },
    CRYPTO_SECRET: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    SECRET: {
        JWT: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    API_PORT: process.env.PHARMACY_SERVICE_PORT || 8001,
    NODE_ENV: process.env.NODE_ENV || "local",
    INSURANCE_ROUTES: ['/insurance-subscriber/*'],
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
    SMS_API_KEY: process.env.SMS_API_KEY ||"",
    BACKEND_SERVER_URL: "http://54.190.192.105:9168",
    TIMEZONE: 'Asia/Kolkata',
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

export const OnDutyGroupColumns = {
    col1: 'onDutyGroupNumber',
    col2: 'city',
    col3: 'startDate',
    col4: 'startTime',
    col5: 'endDate',
    col6: 'endTime',
    col7:'date_of_creation'

}

export const OnDutyPharmacyGroupColumns = {
    col1: 'groupNumber',
    col2:'groupCity',
    col3: 'address',
    col4: 'lat',
    col5: 'long',
    col6: 'neighborhood',
    col7: 'country',
    col8: 'region',
    col9: 'province',
    col10: 'department',
    col11: 'city',
    col12: 'village',
    col13: 'pincode',


    col14: 'pharmacyName',
    col15: 'countryCode',
    col16: 'phoneNumber',
    col17: 'email',

    col18: 'sun_start_time',
    col19: 'sun_end_time',
    col20: 'mon_start_time',
    col21: 'mon_end_time',
    col22: 'tue_start_time',
    col23: 'tue_end_time',
    col24: 'wed_start_time',
    col25: 'wed_end_time',
    col26: 'thus_start_time',
    col27: 'thus_end_time',
    col28: 'fri_start_time',
    col29: 'fri_end_time',
    col30: 'sat_start_time',
    col31: 'sat_end_time',

    col32: 'non_opening_date',
    col33: 'non_opening_start_time',
    col34: 'non_opening_end_time',
    col35:'date_of_creation'

}
