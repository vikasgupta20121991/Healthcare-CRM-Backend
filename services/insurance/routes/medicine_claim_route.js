import express from "express";
import { dataValidation } from "../helpers/transmission";
const medicineClaim = require("../controllers/medicine_claim_controller");
const medicineClaimRoute = express.Router();
import { verifyToken } from "../helpers/verifyToken";



medicineClaimRoute.get("/medicine-claim-count-by-status-insurance", medicineClaim.medicineClaimCountByStatusInsurance);
medicineClaimRoute.get("/medicine-claim-count-by-status-pharmacy", medicineClaim.medicineClaimCountByStatusPharmacy);
medicineClaimRoute.get("/medicine-claim-count-by-status-patient", medicineClaim.medicineClaimCountByStatusPatient);
medicineClaimRoute.get("/medicineClaimCountByStatusLabImagin", medicineClaim.medicineClaimCountByStatusLabImagin);
medicineClaimRoute.get("/medicineClaimCountByStatusLabImaginAppointment", medicineClaim.medicineClaimCountByStatusLabImaginAppointment);
medicineClaimRoute.get("/medicineClaimCountByStatusLabImaginAppointmentPatient", medicineClaim.medicineClaimCountByStatusLabImaginAppointmentPatient);


medicineClaimRoute.get("/medicineClaimCountByStatusPharmacyDoctorHospital", medicineClaim.medicineClaimCountByStatusPharmacyDoctorHospital);
medicineClaimRoute.get("/medicineClaimCountByStatusPharmacyDoctor", medicineClaim.medicineClaimCountByStatusPharmacyDoctor);
medicineClaimRoute.get("/medicineClaimCountByStatusInsuranceDoctor", medicineClaim.medicineClaimCountByStatusInsuranceDoctor);
medicineClaimRoute.get("/appointmentClaimStatusInsuranceAllView", medicineClaim.appointmentClaimStatusInsuranceAllView);

medicineClaimRoute.get("/medicineClaimCountByStatusHospitalClaim", medicineClaim.medicineClaimCountByStatusHospitalClaim);
medicineClaimRoute.get("/medicineClaimCountByStatusInsuranceAdmin", medicineClaim.medicineClaimCountByStatusInsuranceAdmin);
medicineClaimRoute.get("/medicineClaimCountByStatusInsuranceAdminMedicine", medicineClaim.medicineClaimCountByStatusInsuranceAdminMedicine);
medicineClaimRoute.get("/medicineClaimCountByStatusHospitalClaimExtensionFinal", medicineClaim.medicineClaimCountByStatusHospitalClaimExtensionFinal);
medicineClaimRoute.get("/appointmentclaimInsuranceAdmin", medicineClaim.appointmentclaimInsuranceAdmin);


medicineClaimRoute.get("/hospitalizationCountByStatusInsuranceAdmin", medicineClaim.hospitalizationCountByStatusInsuranceAdmin);


//Medicine Claims Step Form
medicineClaimRoute.post("/checkInsuranceStaff", medicineClaim.checkInsuranceStaff);

medicineClaimRoute.post("/common-information-step1", medicineClaim.commonInformationStep1);
medicineClaimRoute.post("/common-information-step2", medicineClaim.commonInformationStep2);
medicineClaimRoute.post("/common-information-step3", medicineClaim.commonInformationStep3);
medicineClaimRoute.post("/common-information-step4", medicineClaim.commonInformationStep4);
medicineClaimRoute.post("/common-information-step5", medicineClaim.commonInformationStep5);
medicineClaimRoute.post("/hospitalServiceData", medicineClaim.hospitalServiceData);


medicineClaimRoute.post("/commonInformationStep1Doctor", medicineClaim.commonInformationStep1Doctor);
medicineClaimRoute.post("/commonInformationStep2Doctor", medicineClaim.commonInformationStep2Doctor);
medicineClaimRoute.post("/commonInformationStep3Doctor", medicineClaim.commonInformationStep3Doctor);
medicineClaimRoute.post("/commonInformationStep4Doctor", medicineClaim.commonInformationStep4Doctor);
medicineClaimRoute.post("/commonInformationStep5Doctor", medicineClaim.commonInformationStep5Doctor);



medicineClaimRoute.post("/commonInformationStep1FourPortal", medicineClaim.commonInformationStep1FourPortal);
medicineClaimRoute.post("/commonInformationStep2FourPortal", medicineClaim.commonInformationStep2FourPortal);
medicineClaimRoute.post("/commonInformationStep3FourPortal", medicineClaim.commonInformationStep3FourPortal);
medicineClaimRoute.post("/commonInformationStep4FourPortal", medicineClaim.commonInformationStep4FourPortal);
medicineClaimRoute.post("/commonInformationStep5FourPortal", medicineClaim.commonInformationStep5FourPortal);
medicineClaimRoute.post("/finalSubmitClaimFourPortal", medicineClaim.finalSubmitClaimFourPortal);

medicineClaimRoute.post("/commoninformationStep1HospitalClaim", medicineClaim.commoninformationStep1HospitalClaim);
medicineClaimRoute.post("/commoninformationStep2HospitalClaim", medicineClaim.commoninformationStep2HospitalClaim);
medicineClaimRoute.post("/commoninformationStep3HospitalClaim", medicineClaim.commoninformationStep3HospitalClaim);
medicineClaimRoute.post("/commoninformationStep4HospitalClaim", medicineClaim.commoninformationStep4HospitalClaim);
medicineClaimRoute.post("/commoninformationStep5HospitalClaim", medicineClaim.commoninformationStep5HospitalClaim);


medicineClaimRoute.get("/getAllDetailsPlanCalculate", medicineClaim.getAllDetailsPlanCalculate);
medicineClaimRoute.get("/getServiceClaimCount", medicineClaim.getServiceClaimCount);
medicineClaimRoute.get("/getWaitingTime", medicineClaim.getWaitingTime);


medicineClaimRoute.post("/service-type", medicineClaim.serviceType);
medicineClaimRoute.post("/document-upload", medicineClaim.documentUpload);
medicineClaimRoute.post("/delete-document", medicineClaim.deleteDocument);
medicineClaimRoute.post("/e-signature", medicineClaim.eSignature);
medicineClaimRoute.post("/deleteMedicineExisting", medicineClaim.deleteMedicineExisting);

medicineClaimRoute.post("/serviceTypeDoctor", medicineClaim.serviceTypeDoctor);
medicineClaimRoute.post("/documentUploadDoctor", medicineClaim.documentUploadDoctor);


medicineClaimRoute.post("/serviceTypeFourPortal", medicineClaim.serviceTypeFourPortal);



//Medicine claim for pharmacy
medicineClaimRoute.get("/medicine-claim-list", medicineClaim.medicineClaimList);
medicineClaimRoute.get("/medicine-claim-listPatient", medicineClaim.medicineClaimListpatient);
medicineClaimRoute.get("/medicine-claim-details-pharmacy", medicineClaim.medicineClaimDetailsPharmacy);
medicineClaimRoute.get("/medicineClaimDetailsPharmacyByClaimObjectId", medicineClaim.medicineClaimDetailsPharmacyByClaimObjectId);
medicineClaimRoute.get("/medicineClaimDetailsPharmacyByClaimObjectIdHopitalization", medicineClaim.medicineClaimDetailsPharmacyByClaimObjectIdHopitalization);
medicineClaimRoute.get("/medicineClaimDetailsPharmacyClaimObjectIdHopitalization", medicineClaim.medicineClaimDetailsPharmacyClaimObjectIdHopitalization);
medicineClaimRoute.get("/medicineClaimDetailswithHospitalData", medicineClaim.medicineClaimDetailswithHospitalData);



medicineClaimRoute.post("/final-submit-claim", medicineClaim.finalSubmitClaim);
medicineClaimRoute.get("/medicineClaimListLabImaging", medicineClaim.medicineClaimListLabImaging);
medicineClaimRoute.get("/medicineClaimListLabImagingAppointment", medicineClaim.medicineClaimListLabImagingAppointment)

medicineClaimRoute.get("/medicineClaimListDoctor", medicineClaim.medicineClaimListDoctor);
medicineClaimRoute.get("/medicineClaimListDoctorHospitalization", medicineClaim.medicineClaimListDoctorHospitalization);

medicineClaimRoute.post("/finalSubmitClaimDoctor", medicineClaim.finalSubmitClaimDoctor);
medicineClaimRoute.get("/medicineClaimListHospitalclaim", medicineClaim.medicineClaimListHospitalclaim);
medicineClaimRoute.get("/medicineClaimListHospitalclaimExtensionFinal", medicineClaim.medicineClaimListHospitalclaimExtensionFinal);



medicineClaimRoute.get("/medicineConsultationListInsuranceAdmin", medicineClaim.medicineConsultationListInsuranceAdmin);
medicineClaimRoute.get("/appointmentClaimListInsuranceAdmin", medicineClaim.appointmentClaimListInsuranceAdmin);

medicineClaimRoute.get("/hospitalizationClaimListHospitalclaimAllList", medicineClaim.hospitalizationClaimListHospitalclaimAllList);
medicineClaimRoute.get("/hospitalizationClaimListHospitalclaimAllListFinalExtension", medicineClaim.hospitalizationClaimListHospitalclaimAllListFinalExtension);

// medicineClaimRoute.get("/previewPdfDownload", medicineClaim.previewPdfDownload)

////Medicine claim for insurance
medicineClaimRoute.get("/medicine-claim-list-for-insurance", medicineClaim.medicineClaimListInsurance);
medicineClaimRoute.get("/medicine-claim-details-insurance", medicineClaim.medicineClaimDetailsInsurance);
medicineClaimRoute.post("/medicine-approve-or-reject-by-insurance-staff", medicineClaim.medicineApproveOrRejectByInsuranceStaff);
medicineClaimRoute.post("/comment-on-medicine-by-insurance-staff", medicineClaim.medicineCommentByInsuranceStaff);
medicineClaimRoute.post("/add-insurance-staff", medicineClaim.addInsuranceStaff);
medicineClaimRoute.post("/approval-by-insurance-staff", medicineClaim.approvalByInsuranceStaff);
medicineClaimRoute.post("/leave-medicine-claim-by-insurance-staff", medicineClaim.leaveMedicineClaimByInsuranceStaff);
medicineClaimRoute.post("/claim-resubmit-by-insurance-staff", medicineClaim.claimResubmitByInsuranceStaff);

medicineClaimRoute.get("/medicineConsultationListInsurance", medicineClaim.medicineConsultationListInsurance);
medicineClaimRoute.get("/appointmentClaimListInsuranceAdminAll", medicineClaim.appointmentClaimListInsuranceAdminAll);

medicineClaimRoute.get("/medicineConsultationListInsuranceAdmin", medicineClaim.medicineConsultationListInsuranceAdmin);

medicineClaimRoute.get("/medicineListInsuranceAdmin", medicineClaim.medicineListInsuranceAdmin);
medicineClaimRoute.get("/MakeInsuranceAdminFourPortalList", medicineClaim.MakeInsuranceAdminFourPortalList);


//Medicine claim for Association Group
medicineClaimRoute.post("/medicine-claim-list-for-association-group", medicineClaim.medicineClaimListForAssociationGroup);
medicineClaimRoute.get("/claim-history", medicineClaim.claimHistory);

medicineClaimRoute.use(verifyToken);
medicineClaimRoute.post("/claim-claimprocessRole", medicineClaim.claimprocessRole);
medicineClaimRoute.get("/list-claim-claimprocessRole", medicineClaim.fetchClaimProcessBy_insuranceId);
medicineClaimRoute.get("/get-claim-process-byId", medicineClaim.getClaimProcessById);
medicineClaimRoute.post("/delete-claim-claimprocessRole", medicineClaim.deleteClaimprocessRole);
medicineClaimRoute.put("/edit-claim-claimprocessRole", medicineClaim.editclaimprocessRole);
medicineClaimRoute.get("/get-last-claim-process-role", medicineClaim.getLastClaimProcessRole);

medicineClaimRoute.get("/get-claims-fourportal", medicineClaim.getClaimsReportedForLabImgOtpDntl);
medicineClaimRoute.get("/get-claims-doctor", medicineClaim.getClaimsReportedForDoctor);



// dashboard
medicineClaimRoute.get("/policy_dashboard-count-insurance", medicineClaim.policyDashboardCountInsurance);
medicineClaimRoute.get("/medicine-claim-count", medicineClaim.geteClaimCount);
medicineClaimRoute.get("/get-eClaim-Count-By-Month", medicineClaim.geteClaimCountByMonth);
medicineClaimRoute.get("/get-data-For-Bar-chart", medicineClaim.getdataForBarchart);
medicineClaimRoute.get("/get-list-by-claim-Type", medicineClaim.getlistbyclaimType);
medicineClaimRoute.get("/get-total-Month-Wise-for-Claim", medicineClaim.gettotalMonthWiseforClaim);

medicineClaimRoute.get("/get-medicineclaim-category-graph",medicineClaim.getMedicineclaimCategoryGraph);


// medicineClaimRoute.get("/get-revenue-hospital-dashboard",medicineClaim.getAllrequestedAmountForHospitalDashboard);
medicineClaimRoute.get("/get-all-claim-hospital-dashboard",medicineClaim.getAllClaimsForGraph);

medicineClaimRoute.get("/get-pharmacy-claim-revenue",medicineClaim.getAmountForPharmacy);
medicineClaimRoute.get("/get-pharmacy-claim-payment-history",medicineClaim.getClaimAmountForPharmacyHistory);


export default medicineClaimRoute;
