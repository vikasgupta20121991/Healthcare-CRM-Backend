import { sendResponse } from "../../helpers/transmission";
import FAQ from "../../models/contentManagement/faq";
import ContactUs from "../../models/contentManagement/contactUs";
import AboutUs from "../../models/contentManagement/aboutUs";
import PrivacyAndCondition from "../../models/contentManagement/privacyAndCondition";
import TermsAndCondition from "../../models/contentManagement/termsAndCondition";
import Blog from "../../models/contentManagement/blog";
import Article from "../../models/contentManagement/article";
import Video from "../../models/contentManagement/video";
import { getDocument, uploadFile } from '../../helpers/s3';
import mongoose from "mongoose";

class ContentManagementController {
    async allFAQ(req, res) {
        const { language } = req.query
        // if (language == "en") {
        //     var id = "faqEn"
        // } else {
        //     id = "faqFr"
        // }
        try {
            // const result = await FAQ.find({_id:id})
            const result = await FAQ.find({ type: language })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `All FAQ list`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to get FAQ list",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async addFAQ(req, res) {
        const { faqs, language } = req.body
        console.log("req.body__________",req.body)
        try {
            const list = faqs.map((faq) => ({
                ...faq,
                language
            }));
            // if (language == "en") {
            //     var id = "faqEn"
            // } else {
            //     id = "faqFr"
            // }
            // const result = await FAQ.findOneAndUpdate({ type: language }, { faqs: list }, { new: true })
            let result = await FAQ.findOne({ type: language });

            if (!result) {
                console.log("result______1")
                // If no record found, create a new one
                result = await FAQ.create({ _id: mongoose.Types.ObjectId(), type: language, faqs: list });
                console.log("result______1111111111",result)
            } else {
                console.log("result______2")
                // Update existing record
                result = await FAQ.findOneAndUpdate({ type: language }, { faqs: list }, { new: true });
                console.log("result______2222222222",result)
            }

            // const result = await FAQ.insertMany(list)
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `All FAQ Saved`,
                errorCode: null,
            });
        } catch (error) {
            console.log("errorrrrrrr",error)
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add FAQ ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Contact Us
    // async editContactUs(req, res) {
    //     const {
    //         phone,
    //         email,
    //         address
    //     } = req.body
    //     try {
    //         const result = await ContactUs.findOneAndUpdate({ _id:"contactUs"},{ phone, email, address },{new :true})
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `added contact us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to add contact us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }
    // async getContactUs(req, res) {
    //     try {
    //         const result = await ContactUs.findOne({ _id: "contactUs" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get contact us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get contact us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }


    async editContactUsEn(req, res) {
        const {
            phone,
            email,
            address,
            langtype
        } = req.body;
        console.log("req.body===========", req.body)

        try {
            // Check if the document with the given langtype exists in the database
            let result = await ContactUs.findOne({ type: langtype });

            if (result) {
                // If the document exists, update it
                result = await ContactUs.findOneAndUpdate({ type: langtype }, { phone, email, address }, { new: true });
            } else {
                // If the document does not exist, create a new record
                result = await ContactUs.create({ type: langtype, phone, email, address });
            }

            console.log("resultFrrrrrrrrrrrr", result);
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: result ? "Contact us updated successfully" : "Contact us added successfully",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to update/add contact us",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editContactUsFr(req, res) {
        const {
            phone,
            email,
            address,
            langtype
        } = req.body;

        try {
            // Check if the document with the given langtype exists in the database
            let result = await ContactUs.findOne({ type: langtype });

            if (result) {
                // If the document exists, update it
                result = await ContactUs.findOneAndUpdate({ type: langtype }, { phone, email, address }, { new: true });
            } else {
                // If the document does not exist, create a new record
                result = await ContactUs.create({ type: langtype, phone, email, address });
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: result ? "Contact us updated successfully" : "Contact us added successfully",
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to update/add contact us",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    // async editContactUsFr(req, res) {
    //     const {
    //         phone,
    //         email,
    //         address,
    //         langtype
    //     } = req.body;
    //     console.log("req.body===========", req.body)

    //     try {
    //         const result = await ContactUs.findOneAndUpdate({ type:langtype},{ phone, email, address },{new :true})
    //         console.log("resultFrrrrrrrrrrrr",result)
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `added contact us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to add contact us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async getContactUs(req, res) {
        const { langType } = req.query; // Assuming the langType is sent in the request body
        // console.log("abc=", langType)
        try {
            const result = await ContactUs.findOne({ type: langType });
            // console.log("result._conditionsresult=====", result)
            if (!result) {
                return sendResponse(req, res, 404, {
                    status: false,
                    body: null,
                    message: `No data found for language type: ${langType}`,
                    errorCode: "DATA_NOT_FOUND",
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Get about us`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get about us",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //About Us
    async editAboutUsEn(req, res) {
        const {
            text,
        } = req.body
        try {
            const result = await AboutUs.findOneAndUpdate({ type: "en" }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added about us`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add about us ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getAboutUsEn(req, res) {
    //     try {
    //         const result = await AboutUs.findOne({ _id: "aboutUsEn" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get about us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get about us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }
    async editAboutUsFr(req, res) {
        const {
            text,
        } = req.body
        try {
            const result = await AboutUs.findOneAndUpdate({ type: "fr" }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added about us`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add about us ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getAboutUsFr(req, res) {
    //     try {
    //         const result = await AboutUs.findOne({ _id: "aboutUsFr" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get about us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get about us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async getAboutUsByLang(req, res) {
        const { langType } = req.query; // Assuming the langType is sent in the request body

        try {
            const result = await AboutUs.findOne({ type: langType });
            // console.log("result._conditionsresult=====", result)
            if (!result) {
                return sendResponse(req, res, 404, {
                    status: false,
                    body: null,
                    message: `No data found for language type: ${langType}`,
                    errorCode: "DATA_NOT_FOUND",
                });
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Get about us`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get about us",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Privacy conditions
    async editPrivacyConditionEn(req, res) {
        const {
            text,
            langType
        } = req.body
        try {
            const result = await PrivacyAndCondition.findOneAndUpdate({ type: langType }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added privacy and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add privacy and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getPrivacyConditionEn(req, res) {
    //     try {
    //         const result = await PrivacyAndCondition.findOne({ _id: "privacyAndConditionEn" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get privacy and condition us`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get privacy and condition us ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }
    async editPrivacyConditionFr(req, res) {
        const {
            text,
            langType
        } = req.body
        try {
            const result = await PrivacyAndCondition.findOneAndUpdate({ type: langType }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added privacy and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add privacy and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getPrivacyConditionFr(req, res) {
    //     try {
    //         const result = await PrivacyAndCondition.findOne({ _id: "privacyAndConditionFr" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get privacy and condition`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get privacy and condition ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async getPrivacyCondition(req, res) {
        const { langType } = req.query;
        try {
            const result = await PrivacyAndCondition.findOne({ type: langType })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `get privacy and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to get privacy and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Terms and conditions
    async editTermsConditionEn(req, res) {
        const {
            text,
            langType
        } = req.body
        try {
            const result = await TermsAndCondition.findOneAndUpdate({ type: langType }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added terms and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add terms and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getTermsConditionEn(req, res) {
    //     try {
    //         const result = await TermsAndCondition.findOne({ _id: "termsAndConditionEn" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get terms and condition`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get terms and condition",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }
    async editTermsConditionFr(req, res) {
        const {
            text,
            langType
        } = req.body
        try {
            const result = await TermsAndCondition.findOneAndUpdate({ type: langType }, { text }, { new: true })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `added terms and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add terms and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    // async getTermsConditionFr(req, res) {
    //     try {
    //         const result = await TermsAndCondition.findOne({ _id: "termsAndConditionFr" })
    //         sendResponse(req, res, 200, {
    //             status: true,
    //             body: result,
    //             message: `get terms and condition`,
    //             errorCode: null,
    //         });
    //     } catch (error) {
    //         sendResponse(req, res, 500, {
    //             status: false,
    //             body: null,
    //             message: error.message ? error.message : "failed to get terms and condition ",
    //             errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
    //         });
    //     }
    // }

    async getTermsCondition(req, res) {
        const { langType } = req.query;
        try {
            const result = await TermsAndCondition.findOne({ type: langType })
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `get terms and condition`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to get terms and condition ",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Blog
    async addBlog(req, res) {
        const { text, language, attachments } = req.body;
        try {
            const blogData = new Blog({
                text,
                language,
                attachments
            });
            const result = await blogData.save();

            if (result) {
                sendResponse(req, res, 200, {
                    status: true,
                    body: result,
                    message: `Successfully added blog`,
                    errorCode: null,
                });
            } else {
                sendResponse(req, res, 200, {
                    status: false,
                    body: null,
                    message: "Failed to add blog",
                    errorCode: "INTERNAL_SERVER_ERROR",
                });
            }
        } catch (error) {
            console.log(error, "errorrrrr")
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to add blog",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async editBlog(req, res) {
        const {
            text,
            language,
            blogId, attachments
        } = req.body
        try {
            const result = await Blog.findOneAndUpdate(
                { _id: blogId },
                { text, language, attachments },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully edited blog`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to edit blog",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getBlog(req, res) {
        const { language, page, limit } = req.query;

        try {
            const aggregate = [
                {
                    $match: {
                        language,
                        is_deleted: false,
                    },
                },
            ];

            const totalCount = await Blog.aggregate(aggregate);

            aggregate.push(
                { $sort: { createdAt: -1 } },
                { $limit: parseInt(limit) },
                { $skip: (parseInt(page) - 1) * parseInt(limit) }
            );

            const result = await Blog.aggregate(aggregate);

            if (result.length > 0) {
                for (const doc of result) {
                    if (doc.attachments) {
                        for (const attachment of doc.attachments) { // Iterate over attachments
                            if (attachment) {
                                attachment.signedurl = await getDocument(attachment.path);
                                // console.log("attachment.signedurl =>", attachment.signedurl);
                            }
                        }
                    }
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    result,
                    totalCount: totalCount.length,
                },
                message: `Successfully get blogs`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get blogs",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async deleteBlog(req, res) {
        const {
            blogId
        } = req.body
        try {
            const result = await Blog.findOneAndUpdate(
                { _id: blogId },
                {
                    is_deleted: true
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully deleted blog`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to delete blog",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    async getBlogbyId(req, res) {
        const { language, data_id } = req.query;
        console.log(data_id , "jjjj");
        try {
 
            const result = await Blog.findOne({ _id: data_id, language: language });
 
            if (result.image) {
                result.image = await getDocument(result?.image);
            } else {
                result.image = '';
            }
 
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully Getting Article`,
                errorCode: null,
            });
        } catch (error) {
            console.error('Error:', error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get Article",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Article
    async addArticle(req, res) {
        const {
            text,
            language, image
        } = req.body
        try {
            const data = new Article({
                text,
                language, image
            });
            const result = await data.save();
            console.log(">>>>result>>>>", result)
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully added article`,
                errorCode: null,
            });
        } catch (error) {
            console.log("errorerrorerror", error);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add article",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async editArticle(req, res) {
        const {
            text,
            language,
            articleId, image
        } = req.body
        try {
            const result = await Article.findOneAndUpdate(
                { _id: articleId },
                { text, language, image },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully edited article`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to edit article",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getArticle(req, res) {
        const {
            language,
            page,
            limit
        } = req.query;
        try {
            const aggregate = [
                {
                    $match: {
                        language,
                        is_deleted: false
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: limit * 1 },
                { $skip: (page - 1) * limit }
            ];
            const result = await Article.aggregate(aggregate);

            if (result.length > 0) {
                for (const doc of result) {
                    if (doc.image) {
                        // console.log("doc.image",doc.image)
                        doc.image = await getDocument(doc.image);
                        // console.log("=>>>>doc.image>>>>>>>",doc.image)
                    } else {
                        doc.image = '';
                    }
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    result,
                    totalCount: result.length
                },
                message: `Successfully get videos`,
                errorCode: null,
            });
        } catch (error) {
            console.error('Error:', error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get videos",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }


    async getArticlebyId(req, res) {
        const { language, data_id } = req.query;
        try {

            const result = await Article.findOne({ _id: data_id, language: language });

            if (result.image) {
                result.image = await getDocument(result.image);
            } else {
                result.image = '';
            }

            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully Getting Article`,
                errorCode: null,
            });
        } catch (error) {
            console.error('Error:', error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get Article",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteArticle(req, res) {
        const {
            articleId
        } = req.body
        try {
            const result = await Article.findOneAndUpdate(
                { _id: articleId },
                {
                    is_deleted: true
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully deleted article`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to delete article",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }

    //Video
    async addVideo(req, res) {
        const {
            text,
            language, videos
        } = req.body
        try {
            const data = new Video({
                text,
                language, videos
            });
            const result = await data.save();
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully added video`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to add video",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async editVideo(req, res) {
        const {
            text,
            language,
            videoId, videos
        } = req.body
        try {
            const result = await Video.findOneAndUpdate(
                { _id: videoId },
                { text, language, videos },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully edited video`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to edit video",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async getVideo(req, res) {
        const {
            language,
            page,
            limit
        } = req.query;
        try {
            const aggregate = [
                {
                    $match: {
                        language,
                        is_deleted: false
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: limit * 1 },
                { $skip: (page - 1) * limit }
            ];
            const result = await Video.aggregate(aggregate);

            if (result.length > 0) {
                for (const doc of result) {
                    if (doc.videos) {
                        // console.log("doc.videos",doc.videos)
                        doc.videos = await getDocument(doc.videos);
                        // console.log("=>>>>doc.videos>>>>>>>",doc.videos)
                    } else {
                        doc.videos = '';
                    }
                }
            }

            sendResponse(req, res, 200, {
                status: true,
                body: {
                    result,
                    totalCount: result.length
                },
                message: `Successfully get videos`,
                errorCode: null,
            });
        } catch (error) {
            console.error('Error:', error.message);
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "Failed to get videos",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
    async deleteVideo(req, res) {
        const {
            videoId
        } = req.body
        try {
            const result = await Video.findOneAndUpdate(
                { _id: videoId },
                {
                    is_deleted: true
                },
                { new: true }
            )
            sendResponse(req, res, 200, {
                status: true,
                body: result,
                message: `Successfully deleted video`,
                errorCode: null,
            });
        } catch (error) {
            sendResponse(req, res, 500, {
                status: false,
                body: null,
                message: error.message ? error.message : "failed to delete video",
                errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
            });
        }
    }
}

module.exports = new ContentManagementController()