import CardFields from "../../../models/insurance/card/cardFields";
import CardPreview from "../../../models/insurance/card/cardPreviewTemplate";
import PlanServiceNew from "../../../models/insurance/plan/service2";
import { sendResponse } from "../../../helpers/transmission";
import mongoose from "mongoose";
import { getDocument1 } from "../../../helpers/s3";
import AdminInfo from "../../../models/insurance/user/admin_info";
export class InsuranceCard {

    async getCategoryServiceForCard(req, res) {
        try {
            /*  const catServList = await PlanServiceNew.aggregate([
                 {
                     $match: {
                         for_user: mongoose.Types.ObjectId(req.query.companyId)
                     }
                 },
                 {
                     $group: {
                         _id: { has_category: "$has_category", service: "$service" },
                         doc: { $first: "$$ROOT" }
                     }
                 },
                 {
                     $replaceRoot: { newRoot: "$doc" }
                 },
                 {
                     $match: {
                       "for_plan.lookup.is_deleted": { $ne: true }
                     }
                   },
                 {
                     $project: {
                         _id: 0, // Exclude _id field from result
                         has_category: 1,
                         service: 1,
                         for_plan: 1,
                         service_code: 1,
                         for_user: 1
                     }
                 }
             ]); */

            const catServList = await PlanServiceNew.aggregate([
                {
                    $match: {
                        for_user: mongoose.Types.ObjectId(req.query.companyId)
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: "for_plan",
                        foreignField: "_id",
                        as: "planDetails"
                    }
                },
                {
                    $match: {
                        planDetails: { $exists: true, $ne: [] },
                        "planDetails.is_deleted": { $ne: true }
                    }
                },
                {
                    $group: {
                        _id: { has_category: "$has_category", service: "$service" },
                        doc: { $first: "$$ROOT" }
                    }
                },
                {
                    $sort: {
                        "_id.has_category": 1, 
                        "doc.service": 1
                    }
                },
                {
                    $replaceRoot: { newRoot: "$doc" }
                },
                {
                    $project: {
                        _id: 0,
                        has_category: 1,
                        service: 1,
                        for_plan: 1,
                        service_code: 1,
                        for_user: 1
                    }
                }
            ]);


            sendResponse(req, res, 200, {
                status: true,
                body: catServList,
                message: 'Category Service Fetch Successfully!',
                errorCode: null,
            });
        } catch (error) {
            console.error(error, "errorrrrrr");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to Fetch Category Service!",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getCardPreviewTemplates(req, res) {
        try {
            const cardPreviews = await CardPreview.find({});
            // console.log("hitttttt1111",cardPreviews);
let newaa=await getDocument1("insurance/65126e0730db3954375cdcfb/pfofile/Screenshot from 2023-12-11 17-56-11.png");
const base64Data = newaa.toString('base64');
const base64Image = `data:image/jpeg;base64,${base64Data}`;

// Use the base64Image as needed
// console.log(base64Image);
// console.log(newaa,"dfgfffffffffff");
            sendResponse(req, res, 200, {
                status: true,
                body: cardPreviews,
                message: 'Cards Preview Fetch Successfully!',
                errorCode: null,
            });
        } catch (error) {
            console.error(error, "errorrrrrr"); // Log the error for debugging

            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to Fetch Cards Preview",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addCardPreviewTemplate(req, res) {
        try {
            const cardPreview = new CardPreview({
                cardPreviewName: req.body.name
            })

            const cardInfo = await cardPreview.save();
            // console.log(cardInfo, "cardInfoooo");
            sendResponse(req, res, 200, {
                status: true,
                body: cardInfo,
                message: 'Card Preview Added Successfully!',
                errorCode: null,
            });
        } catch (error) {
            console.error(error, "errorrrrrr"); // Log the error for debugging

            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed To Add Cards Preview",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async addCardFilds(req, res) {
        try {
            console.log(req.body, "bodyyyyyyyy__");

            if (!req.body.backSideFields || req.body.backSideFields.length === 0 || !req.body.frontSideFields || req.body.frontSideFields.length === 0 || req.body.primaryInsuredFields.length === 0) {
                return sendResponse(req, res, 400, {
                    status: true,
                    body: [],
                    message: 'Select Atleast One Frontside and Backside field!!',
                    errorCode: null,
                });
            } else {

                const insuranceCompanyId = req.body.insuranceCompanyId;

                const addedBy = req.body.addedBy;

                const frontSideFields = await req.body.frontSideFields.map(field => ({
                    fieldId: field,
                }));
                const primaryInsuredFields = await req.body.primaryInsuredFields.map(field => ({
                    fieldId: field,
                }));

                const backSideFields = req.body.backSideFields; // Get the backSideFields data

                // Find and update the CardFields document if it exists, otherwise create a new one
                const cardFields = await CardFields.findOneAndUpdate(
                    { insuranceCompanyId: insuranceCompanyId },
                    { frontSideFields: frontSideFields, backSideFields: backSideFields, primaryInsuredFields: primaryInsuredFields , addedBy: addedBy}, // Include backSideFields in the update
                    { new: true, upsert: true }
                );
                    console.log("cardFields----------",cardFields);
                sendResponse(req, res, 200, {
                    status: true,
                    body: cardFields,
                    message: 'Card Fields Added/Updated Successfully!',
                    errorCode: null,
                });
            }

        } catch (error) {
            console.log(error, "Errorrrr_Carddd");
            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to add/update Card Fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getCardFieldsBycompany(req, res) {
        try {
            const insuranceCompanyIdd = req.query.companyId;
            // console.log(insuranceCompanyIdd, "companyIdddddss");

            // Use lean() to retrieve plain JavaScript objects
            const cardFieldss = await CardFields.find({ insuranceCompanyId: mongoose.Types.ObjectId(insuranceCompanyIdd) })
                .populate({
                    path: 'frontSideFields.fieldId',
                }).populate({
                    path: 'primaryInsuredFields.fieldId'
                })
                .exec();

            // console.log(cardFieldss,"cardFieldssss"); // Log the retrieved data

            sendResponse(req, res, 200, {
                status: true,
                body: cardFieldss,
                message: 'Card Fields fetch Successfully!',
                errorCode: null,
            });
        } catch (error) {
            console.error(error, "errorrrrrr"); // Log the error for debugging

            sendResponse(req, res, 500, {
                status: false,
                body: error,
                message: "Failed to Fetch Card Fields",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getInusranceAdminDataById(req, res) {
        try {
            const { insuranceId } = req.query;            

            const adminData = await AdminInfo.findOne({ for_portal_user: mongoose.Types.ObjectId(insuranceId) });

            let cardId = adminData?.card_preview_id

            return sendResponse(req, res, 200, {
                status: true,
                cardId: cardId,
                message: "Successfully fetch Data",
                errorCode: null,
            });
        } catch (error) {
            return sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: "failed to fetch data",
                errorCode: "INTERNAL_SERVER_ERROR",
            });
        }
    }


}

