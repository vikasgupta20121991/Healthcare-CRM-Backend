"use strict";

// utils
import { sendResponse } from "../helpers/transmission";
// models
import Template from "../models/template";




class TemplateBuilderController {

  //Template Builder
  async addTemplate(req, res) {
    try {
      const {
        templateId,
        templateName,
        templateCategory,
        templateJSON,
        userId, 
        type,
        createdBy
      } = req.body;

      const templateNameExist = await Template.findOne({ template_name: templateName, isDeleted: false, for_portal_user: userId, type })
console.log("templateNameExist====",templateNameExist);


      if (templateNameExist) {
        if (templateId != "") {
          const checkForEdit = await Template.findOne({ _id: templateId, type });

          if (checkForEdit?.template_name != templateName) {
            return sendResponse(req, res, 200, {
              status: false,
              body: null,
              message: "Template name already taken.",
              errorCode: null,
            });
          }
        } else {
          return sendResponse(req, res, 200, {
            status: false,
            body: null,
            message: "Template name should be unique.",
            errorCode: null,
          });
        }
      }

      var result
      var message = "Successfully created template.";

      if (templateId == "") {
        const templateInfo = new Template({
          template_name: templateName,
          template_category: templateCategory,
          template_json: templateJSON,
          for_portal_user: userId,
          type: type,
          createdBy:createdBy
        });
        result = await templateInfo.save();
      } else {
        result = await Template.findOneAndUpdate(
          { _id: templateId, type },
          {
            $set: {
              template_name: templateName,
              template_category: templateCategory,
              template_json: templateJSON,
            }
          },
          { new: true }
        )

        message = "Successfully updated template."
      }
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      if (error.code = 11000) {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Template name is unique.",
          errorCode: "UNIQUE_KEY",
        });
      }
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to create template",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateList(req, res) {
    try {
      const {
        userId,
        page,
        limit,
        searchText,
        type
      } = req.query;
      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined)  {
          var keynew = sort.split(":")[0];
          var value = sort.split(":")[1];
          sortingarray[keynew] = value;
      }else{
          sortingarray['createdAt'] = -1;
      }
      var filter
      if (searchText == "") {
        filter = {
          for_portal_user: userId,
          isDeleted: false,
          type
        }
      } else {
        filter = {
          for_portal_user: userId,
          isDeleted: false,
          type,
          $or: [
            { template_name: { $regex: searchText || '', $options: "i" } },
            { template_category: { $regex: searchText || '', $options: "i" } }
          ]
        }
      }
      var result;
      if (limit == 0) {
        result = await Template.find(filter)
          .sort(sortingarray)
          .exec();
      }
      else {
        result = await Template.find(filter)
          .sort(sortingarray)
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      const count = await Template.countDocuments(filter)
      sendResponse(req, res, 200, {
        status: true,
        body: {
          result,
          count
        },
        message: "Successfully get template list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to get template list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateDetails(req, res) {
    try {
      const {
        templateId , type
      } = req.query;
      const result = await Template.findOne({ _id: templateId, type })
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully get template details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to get template details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async templateDelete(req, res) {
    try {
      const {
        templateId , type
      } = req.body;
      var result
      result = await Template.findOneAndUpdate(
        { _id: templateId, type },
        {
          $set: {
            isDeleted: true,
          }
        },
        { new: true }
      )
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully deleted template details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to deleted template details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
}

module.exports = new TemplateBuilderController();