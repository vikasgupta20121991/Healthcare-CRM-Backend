import express from "express";
import { dataValidation } from "../helpers/transmission";
const medicineClaim = require("../controllers/medicine_claim_controller");
const medicineClaimRoute = express.Router();

medicineClaimRoute.get("/medicine-claim-count-by-status-insurance", medicineClaim.medicineClaimCountByStatusInsurance);
medicineClaimRoute.get("/medicine-claim-count-by-status-pharmacy", medicineClaim.medicineClaimCountByStatusPharmacy);

//Medicine Claims Step Form
medicineClaimRoute.post("/common-information-step1", medicineClaim.commonInformationStep1);
medicineClaimRoute.post("/common-information-step2", medicineClaim.commonInformationStep2);
medicineClaimRoute.post("/common-information-step3", medicineClaim.commonInformationStep3);
medicineClaimRoute.post("/common-information-step4", medicineClaim.commonInformationStep4);
medicineClaimRoute.post("/common-information-step5", medicineClaim.commonInformationStep5);
medicineClaimRoute.post("/service-type", medicineClaim.serviceType);
medicineClaimRoute.post("/document-upload", medicineClaim.documentUpload);
medicineClaimRoute.post("/delete-document", medicineClaim.deleteDocument);
medicineClaimRoute.post("/e-signature", medicineClaim.eSignature);


//Medicine claim for pharmacy
medicineClaimRoute.get("/medicine-claim-list", medicineClaim.medicineClaimList);
medicineClaimRoute.get("/medicine-claim-details-pharmacy", medicineClaim.medicineClaimDetailsPharmacy);
medicineClaimRoute.post("/final-submit-claim", medicineClaim.finalSubmitClaim);

/* prashant accepted api */
medicineClaimRoute.get("/getInsuranceAcceptedList", medicineClaim.getInsuranceAcceptedList);
medicineClaimRoute.get("/getPharamacyAcceptedListPatient", medicineClaim.getPharamacyAcceptedListPatient);


////Medicine claim for insurance
medicineClaimRoute.get("/medicine-claim-list-for-insurance", medicineClaim.medicineClaimListInsurance);
medicineClaimRoute.get("/medicine-claim-details-insurance", medicineClaim.medicineClaimDetailsInsurance);
medicineClaimRoute.post("/medicine-approve-or-reject-by-insurance-staff", medicineClaim.medicineApproveOrRejectByInsuranceStaff);
medicineClaimRoute.post("/comment-on-medicine-by-insurance-staff", medicineClaim.medicineCommentByInsuranceStaff);
medicineClaimRoute.post("/add-insurance-staff", medicineClaim.addInsuranceStaff);
medicineClaimRoute.post("/approval-by-insurance-staff", medicineClaim.approvalByInsuranceStaff);
medicineClaimRoute.post("/leave-medicine-claim-by-insurance-staff", medicineClaim.leaveMedicineClaimByInsuranceStaff);
medicineClaimRoute.post("/claim-resubmit-by-insurance-staff", medicineClaim.claimResubmitByInsuranceStaff);


//Medicine claim for Association Group
medicineClaimRoute.post("/medicine-claim-list-for-association-group", medicineClaim.medicineClaimListForAssociationGroup);

medicineClaimRoute.get("/claim-history", medicineClaim.claimHistory);




export default medicineClaimRoute;
