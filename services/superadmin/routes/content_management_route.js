"use strict";

import express from "express";
import contentManagementController from "../controllers/contentManagement/contentManagementController";
const contentManagementRoute = express.Router();
//FAQ
contentManagementRoute.get('/all-faq', contentManagementController.allFAQ)
contentManagementRoute.post('/add-faq', contentManagementController.addFAQ)

//Contact Us
contentManagementRoute.post('/edit-contact-us-en', contentManagementController.editContactUsEn)
contentManagementRoute.post('/edit-contact-us-fr', contentManagementController.editContactUsFr)
contentManagementRoute.get('/get-contact-us', contentManagementController.getContactUs)

//About Us
contentManagementRoute.post('/edit-about-us-en', contentManagementController.editAboutUsEn)
contentManagementRoute.post('/edit-about-us-fr', contentManagementController.editAboutUsFr)
// contentManagementRoute.get('/get-about-us-en', contentManagementController.getAboutUsEn)
// contentManagementRoute.get('/get-about-us-fr', contentManagementController.getAboutUsFr)

contentManagementRoute.get('/get-about-us', contentManagementController.getAboutUsByLang)


//Privacy and Condition
contentManagementRoute.post('/edit-privacy-condition-en', contentManagementController.editPrivacyConditionEn)
// contentManagementRoute.get('/get-privacy-condition-en', contentManagementController.getPrivacyConditionEn)
contentManagementRoute.post('/edit-privacy-condition-fr', contentManagementController.editPrivacyConditionFr)
// contentManagementRoute.get('/get-privacy-condition-fr', contentManagementController.getPrivacyConditionFr)

contentManagementRoute.get('/get-privacy-condition', contentManagementController.getPrivacyCondition)


//Terms and Condition
contentManagementRoute.post('/edit-terms-condition-en', contentManagementController.editTermsConditionEn)
// contentManagementRoute.get('/get-terms-condition-en', contentManagementController.getTermsConditionEn)
contentManagementRoute.post('/edit-terms-condition-fr', contentManagementController.editTermsConditionFr)
// contentManagementRoute.get('/get-terms-condition-fr', contentManagementController.getTermsConditionFr)

contentManagementRoute.get('/get-terms-condition', contentManagementController.getTermsCondition)


//Blog
contentManagementRoute.post('/add-blog', contentManagementController.addBlog)
contentManagementRoute.post('/edit-blog', contentManagementController.editBlog)
contentManagementRoute.get('/get-blog', contentManagementController.getBlog)
contentManagementRoute.post('/delete-blog', contentManagementController.deleteBlog)
contentManagementRoute.get('/get-Blog-by-Id', contentManagementController.getBlogbyId)

//Article
contentManagementRoute.post('/add-article', contentManagementController.addArticle)
contentManagementRoute.post('/edit-article', contentManagementController.editArticle)
contentManagementRoute.get('/get-article', contentManagementController.getArticle)
contentManagementRoute.get('/get-Article-by-Id', contentManagementController.getArticlebyId)

contentManagementRoute.post('/delete-article', contentManagementController.deleteArticle)

//Video
contentManagementRoute.post('/add-video', contentManagementController.addVideo)
contentManagementRoute.post('/edit-video', contentManagementController.editVideo)
contentManagementRoute.get('/get-video', contentManagementController.getVideo)
contentManagementRoute.post('/delete-video', contentManagementController.deleteVideo)

export default contentManagementRoute;