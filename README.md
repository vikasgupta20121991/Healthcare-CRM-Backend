# healthcare-crm Backend

## Project Description

healthcare-crm is an product in which Insurance, Pharmacy, Hospital, Individual doctor and patient can interact with each other by making claim online, doctor consultation online or offline, Hospitalization claim and many more.

The main objective is to help the patient to take the consultation from different doctors (individual or hospital), the consultation will be in two ways either video or f2f/home visit patient can also be order the prescription from the pharmacy if full payment given by patient at the time order then he can claim for the payment to the insurance company, otherwise pharmacy can claim for the payment to the insurance company. The whole application works on roles and the permission.

## Live App URL

Access the live application: NA

## Prerequisites

Before you start, ensure you have Node.js installed. You can download and install it from the official Node.js website: [Download Node.js](https://nodejs.org/en/) and also install the docker & docker compose from the official website.


install MongoDB compass(UI tool)

install npm version @8.19.4

install node version @16.20.0

docker install @24.0.2

docker-compose install@1.29.2

install mongoDB in system db version v6.0.6

Please change the bind ip (0.0.0.0) in mongodb configuration file in your local system.

## Getting Started

Follow these steps to clone, install dependencies, and run the healthcare-crm Backend application locally:

```bash
# Clone the project repository into your local machine
git clone https://github.com/sdeitech/healthcare-crm-Backend.git

# Navigate to the project folder
cd healthcare-crmBackend

# Create Docker Network by using below command
docker network create healthcare-crmnetwork

# Start the application locally
docker-compose up --build



## Environment Variable Setup

Make sure to set up the following environment variables before running the application:

NODE_ENV
API_GATEWAY_PORT
API_GATEWAY_INSPECTOR_PORT
MONGO_DB_HOST
MONGO_DB_PORT
healthcare-crm_FRONTEND_URL
JWT_EXPIRATION_IN_MINUTES
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
PHARMACY_SERVICE_PORT
PHARMACY_SERVICE_HOST
PHARMACY_MONGO_DATABASE
PHARMACY_MONGO_USER
PHARMACY_MONGO_ROOT_USER
PHARMACY_MONGO_PASSWORD
PHARMACY_MONGO_ROOT_PASSWORD
PHARMACY_INSPECTOR_PORT
PHARMACY_SERVICE_URL
INSURANCE_SERVICE_PORT
INSURANCE_SERVICE_HOST
INSURANCE_MONGO_DATABASE
INSURANCE_MONGO_USER
INSURANCE_MONGO_ROOT_USER
INSURANCE_MONGO_PASSWORD
INSURANCE_MONGO_ROOT_PASSWORD
INSURANCE_INSPECTOR_PORT
INSURANCE_SERVICE_URL
HOSPITAL_SERVICE_PORT
HOSPITAL_SERVICE_HOST
HOSPITAL_MONGO_DATABASE
HOSPITAL_MONGO_USER
HOSPITAL_MONGO_ROOT_USER
HOSPITAL_MONGO_PASSWORD
HOSPITAL_MONGO_ROOT_PASSWORD
HOSPITAL_INSPECTOR_PORT
HOSPITAL_SERVICE_URL
SUPERADMIN_SERVICE_PORT
SUPERADMIN_SERVICE_HOST
SUPERADMIN_MONGO_DATABASE
SUPERADMIN_MONGO_USER
SUPERADMIN_MONGO_ROOT_USER
SUPERADMIN_MONGO_PASSWORD
SUPERADMIN_MONGO_ROOT_PASSWORD
SUPERADMIN_INSPECTOR_PORT
SUPERADMIN_SERVICE_URL
PATIENT_SERVICE_PORT
PATIENT_SERVICE_HOST
PATIENT_MONGO_DATABASE
PATIENT_MONGO_USER
PATIENT_MONGO_ROOT_USER
PATIENT_MONGO_PASSWORD
PATIENT_MONGO_ROOT_PASSWORD
PATIENT_INSPECTOR_PORT
PATIENT_SERVICE_URL
LabImagingDentalOptical_SERVICE_PORT
LabImagingDentalOptical_SERVICE_HOST
LabImagingDentalOptical_MONGO_DATABASE
LabImagingDentalOptical_MONGO_USER
LabImagingDentalOptical_MONGO_ROOT_USER
LabImagingDentalOptical_MONGO_PASSWORD
LabImagingDentalOptical_MONGO_ROOT_PASSWORD
LabImagingDentalOptical_INSPECTOR_PORT
LabImagingDentalOptical_SERVICE_URL
appIds
appCertificates