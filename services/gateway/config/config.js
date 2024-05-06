import 'dotenv/config.js';
const config = {
  PORTS: {
    API_PORT: process.env.API_GATEWAY_PORT || 8005,
  },
  BASEURL: {
    insuranceServiceUrl: process.env.INSURANCE_SERVICE_URL,
    labimagingdentalopticalServiceUrl: process.env.LabImagingDentalOptical_SERVICE_URL,
    hospitalServiceUrl: process.env.HOSPITAL_SERVICE_URL,
    superadminServiceUrl: process.env.SUPERADMIN_SERVICE_URL,
    patientServiceUrl: process.env.PATIENT_SERVICE_URL,
    pharmacyServiceUrl: process.env.PHARMACY_SERVICE_URL,
  },
};

module.exports.get = function get() {
    return config;
};
