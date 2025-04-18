import "dotenv/config.js";

export const config = {
    DB: {
    HOST: process.env.MONGO_DB_HOST,
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
    BaseUrl: {
        insuranceServiceUrl: process.env.INSURANCE_SERVICE_URL,
        hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL,
        superadminServiceUrl: process.env.SUPERADMIN_SERVICE_URL,
        patientServiceUrl: process.env.PATIENT_SERVICE_URL,
        pharmacyServiceUrl: process.env.PHARMACY_SERVICE_URL,
        labimagingdentalopticalServiceUrl: process.env.LabImagingDentalOptical_SERVICE_URL,
        gatewayServiceUrl: process.env.GATEWAYSERVICEURL,
    },
    EMAIL: {
        HOST: "smtp.gmail.com",
        USER: "",
        PASSWORD: "pbskkrwtkrtzdagk",
    },
    CRYPTO_SECRET: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    SECRET: {
        JWT: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    NODE_ENV: process.env.NODE_ENV || "local",
    INSURANCE_ROUTES: ['/insurance-subscriber/*'],
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
  SMS_API_KEY: process.env.SMS_API_KEY || "",
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


export const PrimarySubscriberColumn = {
    col1: 'SubscriberUniqueID',
    col2: 'SubscriberType',
    col3: 'GroupName',
    col4: 'SubscriptionFor',
    col5: 'SubscriberFirstName',
    col6: 'SubscriberMiddleName',
    col7: 'SubscriberLastName',
    col8: 'SubscriberMobile',
    col9: 'SubscriberCountryCode',
    col10: 'SubscriberReimbersementRate',
    col11: 'HealthPlan',
    col12: 'DOB',
    col13: 'Gender',
    col14: 'InsuranceID',
    col15: 'PolicyID',
    col16: 'CardID',
    col17: 'EmployeeID',
    col18: 'InsuranceHolderName',
    col19: 'InsuranceValidityFromDate',
    col20: 'InsuranceValidityToDate',
    col21: 'Relationship',
    col22: 'DateofCreation',
    col23: 'DateofJoining',
    col24: 'SubscriberProfile'
}

export const CompanySubscriberColumn = {
    col1: 'SubscriberFirstName',
    col2: 'SubscriberMiddleName',
    col3: 'SubscriberLastName',
    col4: 'DOB',
    col5: 'Age',
    col6: 'Gender',
    col7: 'InsuranceID',
    col8: 'PolicyID',
    col9: 'CardID',
    col10: 'EmployeeID',
    col11: 'InsuranceHolderName',
    col12: 'InsuranceValidityFromDate',
    col13: 'InsuranceValidityToDate'
}


export const HealthcareNetworkColumns = {
    col1: 'insuranceId',
    col2: 'providerType',
    col3: 'providerName',
    col4: 'ceoName',
    col5: 'email',
    col6: 'mobile',
    col7: 'city',
    col8: 'address',
    col9: 'region',
    col10: 'neighborhood'
}

export const IncHealthcareNetworkColumns = {
    col1:'dateofcreation',
    col2: 'providerType',
    col3: 'providerName',
    col4: 'ceoName',
    col5: 'email',
    col6: 'mobile',
    col7: 'city',
    col8: 'address',
    col9: 'region',
    col10: 'neighborhood'
}



export const htmlEmailApproval = () => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dock Nock email Template</title>
        <style>
            @media (max-width: 576px){
                section{
                    width: auto !important;
                }
                .box{
                    max-width: none !important;
                    width: 100% !important;
                }
                .innerBox{
                    max-width: 255px !important;
                }
            }
        </style> 
    </head>
    <body style="background-color: #f9f1e7; width: 100% !important; margin: 0; padding: 0;">
    <div class="box" style="max-width: 500px; margin: 0 auto; background-color: #F9F9F9; text-align:center;">
    <div class="innerBox" style="max-width: 300px; width: 100%; margin: auto; background-color: #fff; border-radius: 10px; padding: 20px; position: absolute; left: 50%; transform: translateX(-50%);">
        <h1 style="font-size: 32px; color: #272727; font-weight: 600; margin-top: 0; margin-bottom: 0;">Welcome</h1>
    </div>
</div>
    </body>
    </html>
    `
}