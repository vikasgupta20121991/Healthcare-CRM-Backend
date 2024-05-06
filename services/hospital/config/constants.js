import "dotenv/config.js";

export const config = {
    DB: {
        HOST: process.env.MONGO_DB_HOST ,
        PORT: process.env.MONGO_DB_PORT ,
        DATABASE: process.env.HOSPITAL_MONGO_DATABASE || "healthcare-crm4",
        USERNAME: process.env.HOSPITAL_MONGO_USER || "healthcare-crm4",
        PASSWORD: process.env.HOSPITAL_MONGO_PASSWORD || "SDFTg345",
    },
    PORTS: {
        API_PORT: process.env.HOSPITAL_SERVICE_PORT || 8004,
        EMAIL_PORT: 4200,
        APIHOST: "http://localhost",
    },
    API_PORT: process.env.HOSPITAL_SERVICE_PORT || 8004,
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
        host: "smtp.gmail.com",
        user: process.env.ADMIN_EMAIL || "youremail@gmail.com",
        password: process.env.ADMIN_PASSWORD || "password",
    },
    cryptoSecret: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    CRYPTO_SECRET: process.env.CRYPTOSECRET || "healthcare-crm@08$08#2022",
    secret: {
        jwt: process.env.JWT_SECRET || "healthcare-crm#$2312sddVG4",
    },
    JWT_EXPIRATION_IN_MINUTES: process.env.JWT_EXPIRATION_IN_MINUTES || 1440,
    SMS_API_KEY: process.env.SMS_API_KEY ||"",
    insuranceRoutes: ['/insurance/*'],
    NODE_ENV: process.env.NODE_ENV || "local",
    healthcare-crm_Backend_url: process.env.healthcare-crm_Backend_url,
    TIMEZONE: 'Asia/Kolkata',
    stripeKey: process.env.stripeKey
    //TIMEZONE: ' Africa/Ouagadougou'
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

export const LabTestColumns = {
    col1: 'category',
    col2: 'lab_test',
    col3: 'description',
    col4: 'contributing_factors_to_abnormal_values',
    col5: 'normal_value_blood',
    col6: 'normal_value_urine',
    col7: 'possible_interpretation_of_abnormal_blood_value_high_levels',
    col8: 'possible_interpretation_of_abnormal_blood_value_low_levels',
    col9: 'possible_interpretation_of_abnormal_urine_value_high_levels',
    col10: 'possible_interpretation_of_abnormal_urine_value_low_levels',
    col11: 'blood_procedure_before',
    col12: 'blood_procedure_during',
    col13: 'blood_procedure_after',
    col14: 'urine_procedure_before',
    col15: 'urine_procedure_during',
    col16: 'urine_procedure_after',
    col17: 'clinical_warning',
    col18: 'other',
    col19: 'link'
}
export const ImagingTestColumns = {
    col1: 'category',
    col2: 'imaging',
    col3: 'description',
    col4: 'clinical_consideration',
    col5: 'normal_values',
    col6: 'abnormal_values',
    col7: 'contributing_factors_to_abnormal',
    col8: 'procedure_before',
    col9: 'procedure_during',
    col10: 'procedure_after',
    col11: 'clinical_warning',
    col12: 'contraindications',
    col13: 'other',
    col14: 'link'
}
export const OthersTestColumns = {
    col1: 'category',
    col2: 'others',
    col3: 'description',
    col4: 'clinical_consideration',
    col5: 'normal_values',
    col6: 'abnormal_values',
    col7: 'contributing_factors_to_abnormal',
    col8: 'procedure_before',
    col9: 'procedure_during',
    col10: 'procedure_after',
    col11: 'clinical_warning',
    col12: 'contraindications',
    col13: 'other',
    col14: 'link'
}
export const VaccinationColumns = {
    col1: 'name'
}

export const EyeglassColumns = {
    col1: 'eyeglass_name'
}
export const SpecialtyColumns = {
    col1: 'specialization',
}

export const AppointmentReasonColumns = {
    col1: 'ReasonName',
}

export const TimeZone = {
    hours: 0,
    minute: 0
}

export const AddHospitalsColumns = {
    col1: 'healthCenter',
    col2: 'hospital_name',
    col3: 'mobile_phone_number',
    col4: 'email',

    col5: 'address',
    col6: 'lat',
    col7: 'long',
    col8: 'neighborhood',
    col9: 'country',
    col10: 'region',
    col11: 'province',
    col12: 'department',
    col13: 'city',
    col14: 'village',
    col15: 'pincode',
    col16: 'countryCode',

    col17: 'sun_start_time',
    col18: 'sun_end_time',
    col19: 'mon_start_time',
    col20: 'mon_end_time',
    col21: 'tue_start_time',
    col22: 'tue_end_time',
    col23: 'wed_start_time',
    col24: 'wed_end_time',
    col25: 'thu_start_time',
    col26: 'thu_end_time',
    col27: 'fri_start_time',
    col28: 'fri_end_time',
    col29: 'sat_start_time',
    col30: 'sat_end_time',
}


export const MedicineColumns = {
    col1: 'MedicineNumber',
    col2: 'MedicineName',
    col3: 'INN',
    col4: 'Dosage',
    col5: 'PharmaceuticalFormulation',
    col6: 'AdministrationRoute',
    col7: 'TherapeuticClass',
    col8: 'Manufacturer',
    col9: 'ConditionOfPrescription',
    col10: 'Other',
    col11: 'Link',
}
export const CountryColumns = {
    col1: 'name',
    col2: 'country_code',
    col3: 'iso_code'
}

export const VillageColumns = {
    col1: 'country_name',
    col2: 'region_name',
    col3: 'province_name',
    col4: 'department_name',
    col5: 'name',

}
export const CityColumns = {
    col1: 'country_name',
    col2: 'region_name',
    col3: 'province_name',
    col4: 'department_name',
    col5: 'name',

}
export const DepartmentColumns = {
    col1: 'country_name',
    col2: 'region_name',
    col3: 'province_name',
    col4: 'name',

}
export const ProvinceColumns = {
    col1: 'country_name',
    col2: 'region_name',
    col3: 'province_name',


}
export const RegionColumns = {
    col1: 'country_name',
    col2: 'name',


}
export const TeamColumns = {
    col1: 'team',
}
export const TeamColumns1 = {
    col1: 'team',
}

export const DesignationColumns = {
    col1: 'designation',
}
export const TitleColumns = {
    col1: 'title',
}
export const HealthCenterColumns = {
    col1: 'name',
}
export const LanguageColumns = {
    col1: 'language',
}

export const departmentHospital = {
    col1: 'department_name',
    // col2: 'country_code',
    // col3: 'iso_code'
}

export const expertiseHospital = {
    col1: 'expertise_name',
    // col2: 'added_by'
    // col2: 'country_code',
    // col3: 'iso_code'
}

export const serviceHospital = {
    col1: 'service_name',
    col2: 'for_department',
    // col3: 'added_by',

    // col3: 'iso_code'
}

export const unitHospital = {
    col1: 'unit_name',
    col2: 'for_department',
    col3: 'for_service',
    // col4: 'added_by'
}

