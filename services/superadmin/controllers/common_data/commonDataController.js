import { sendResponse } from "../../helpers/transmission";
import Country from "../../models/common_data/country";
import mongoose from "mongoose";
import Region from "../../models/common_data/region";
import Province from "../../models/common_data/province";
import Department from "../../models/common_data/department";
import City from "../../models/common_data/city";
import Village from "../../models/common_data/village";
import { CityColumns, CountryColumns, DepartmentColumns, DesignationColumns, HealthCenterColumns, LanguageColumns, ProvinceColumns, RegionColumns, TeamColumns, TitleColumns, VillageColumns } from "../../config/constants";
import { processExcel } from "../../middleware/utils";
import Designation from "../../models/designation";
import Title from "../../models/title";
import Language from "../../models/language";

const fs = require("fs");

const validateColumnWithExcel = (toValidate, excelColumn) => {
  const requestBodyCount = Object.keys(toValidate).length;
  const fileColumnCount = Object.keys(excelColumn).length;
  if (requestBodyCount !== fileColumnCount) {
    return false;
  }

  let index = 1;
  for (const iterator of Object.keys(excelColumn)) {
    if (iterator !== toValidate[`col${index}`]) {
      return false;
    }
    index++;
  }
  return true;
};
class CommonDataController {
  async countryList(req, res) {
    try {
     
      const list = await Country.find({ is_deleted: false });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All country list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get country list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async regionList(req, res) {
    try {
      const { country_id } = req.query;
      var list;
      if (country_id != "") {
        list = await Region.find({ country_id: country_id, is_deleted: false });
      } else {
        list = await Region.find({is_deleted: false});
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All region list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get region list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async provinceList(req, res) {
    try {
      const { region_id } = req.query;
      var list;
      if (region_id != "") {
        list = await Province.find({ region_id: region_id, is_deleted: false });
      } else {
        list = await Province.find({is_deleted: false});
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `Get all province list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error,"check error555");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get province list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async departmentList(req, res) {
    try {
      const { province_id } = req.query;
      var list;
      if (province_id != "") {
        list = await Department.find({
          province_id: province_id,
          is_deleted: false,
        });
      } else {
        list = await Department.find({is_deleted: false});
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All department list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get department list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async cityList(req, res) {
    try {
      const { department_id } = req.query;
      var list;
      if (department_id != "") {
        list = await City.find({
          department_id: department_id,
          is_deleted: false,
        });
      } else {
        list = await City.find({is_deleted: false});
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All city list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get city list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async villageList(req, res) {
    try {
      const { department_id } = req.query;
      var list;
      if (department_id != "") {
        list = await Village.find({
          department_id: department_id,
          is_deleted: false,
        });
      } else {
        list = await Village.find({is_deleted: false});
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All village list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get village list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getCitynameById(req, res) {
    try {
      const { city_id } = req.query;
      var list;
      if (city_id != "") {
        list = await City.findOne({ _id: city_id });
      } else {
        list = [];
      }
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All City list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get city list",
        errorCode: error.message,
      });
    }
  }

  async getCountryByItsName(req, res) {
    try {
      const { name } = req.query;
      var country_data = null;

      if (name != "") {
        country_data = await Country.findOne({
          name: { $regex: name, $options: "i" },
        });
      }

      if (country_data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: country_data,
          message: `Country Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: country_data,
          message: `No Country Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get city by its name",
        errorCode: error.message,
      });
    }
  }

  async getRegionByItsName(req, res) {
    try {
      const { name, country_id } = req.query;
      var data = null;

      if (name != "") {
        data = await Region.findOne({
          name: { $regex: name, $options: "i" },
          country_id: country_id,
        });
      }

      if (data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: data,
          message: `Region Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: data,
          message: `No Region Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get region by its name",
        errorCode: error.message,
      });
    }
  }

  async getProvinceByItsName(req, res) {
    try {
      const { name, region_id } = req.query;
      var data = null;

      if (name != "") {
        data = await Province.findOne({
          name: { $regex: name, $options: "i" },
          region_id: region_id,
        });
      }

      if (data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: data,
          message: `Province Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: data,
          message: `No Province Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get province by its name",
        errorCode: error.message,
      });
    }
  }

  async getDepartmentByItsName(req, res) {
    try {
      const { name, province_id } = req.query;
      var data = null;

      if (name != "") {
        data = await Department.findOne({
          name: { $regex: name, $options: "i" },
          province_id: province_id,
        });
      }

      if (data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: data,
          message: `Department Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: data,
          message: `No Department Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get department by its name",
        errorCode: error.message,
      });
    }
  }

  async getCityByItsName(req, res) {
    try {
      const { name, department_id } = req.query;
      var city_data = null;

      if (department_id) {
        if (name != "") {
          city_data = await City.findOne({
            name: { $regex: name, $options: "i" },
            department_id: department_id,
          });
        }
      } else {
        if (name != "") {
          city_data = await City.findOne({
            name: { $regex: name, $options: "i" },
          });
        }
      }

      if (city_data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: city_data,
          message: `City Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: city_data,
          message: `No city Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get city by its name",
        errorCode: error.message,
      });
    }
  }

  async getVillageByItsName(req, res) {
    try {
      const { name, department_id } = req.query;
      var data = null;

      if (name != "") {
        data = await Village.findOne({
          name: { $regex: name, $options: "i" },
          department_id: department_id,
        });
      }

      if (data != null) {
        sendResponse(req, res, 200, {
          status: true,
          body: data,
          message: `Village Fetched successfully`,
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          body: data,
          message: `No Village Found!!`,
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get village by its name",
        errorCode: error.message,
      });
    }
  }

  //   Country Api
  async addCountries(req, res) {
    try {
      const { name, country_code, iso_code, createdBy } = req.body;
      console.log(req.body, "check body");
      const coutryname = req.body.name;
      const lowercaseName = coutryname.toLowerCase();
      console.log(lowercaseName, "check lowercase");
      const list = await Country.find({ name: lowercaseName, is_deleted: false });
      console.log("list-----------", list);
      if (list.length === 0) {
        let result = new Country({
          name: lowercaseName,
          country_code,
          iso_code,
          createdBy
        });
        console.log("result==>", result);
        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add Country successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Country already exist",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async countryLists(req, res) {
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
        sortingarray[keynew] = value;
      }else{
        sortingarray['createdAt'] = -1;

      }
      const filter = {};
      if (searchKey != "") {
        filter["$or"] = [
          {
            name: { $regex: searchKey, $options: "i" },
          },
        ];
      }

      const listdata = await Country.find({
        is_deleted: "false",
        ...filter,
      })
        .sort(sortingarray)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const count = await Country.countDocuments({ is_deleted: "false",
      ...filter});

      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          totalRecords: count,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editCountry(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        country_code: req.body.country_code,
        iso_code: req.body.iso_code,
      };
      const list = await Country.find({ name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)}, is_deleted: false });
      if (list) {
        const result = await Country.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to add country",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update Country successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Country already exist",
          errorCode: null,
        });
      }

    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }
 
  

  async deleteCountry(req, res) {
    console.log("reqbodyyyy---", req.body);
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          
          let checkisDeleted = await Country.find({ is_deleted: false }, { _id: 1 });
          const _idValues = checkisDeleted.map(item => item._id);
          let regiondetails = await Region.find({ country_id: { $in: _idValues } ,is_deleted:false})
          if (regiondetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Country is assigned to region. If you want to delete, please assign another Country to region or delete region and try",
                  errorCode: null,
              });
          }

          var result = await Country.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          let regiondetails = await Region.find({ country_id: { $in: vaccinationId } ,is_deleted:false})
          if (regiondetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Country is assigned to region. If you want to delete, please assign another Country to region or delete region and try",
                  errorCode: null,
              });
          }
          var result = await Country.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted.";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async countryListforexport(req, res) {
    const { searchText, limit, page } = req.query;
    var filter;
    if (searchText == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchText || "", $options: "i" },
      };
    }
    try {
      var result = "";
      if (limit > 0) {
        result = await Country.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      } else {
        result = await Country.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              _id: 0,
              name: "$name",
              country_code: "$country_code",
              iso_code: "$iso_code",
              // clinical_consideration: "$clinical_consideration",
              // normal_values: "$normal_values",
              // abnormal_values: "$abnormal_values",
              // contributing_factors_to_abnormal: "$contributing_factors_to_abnormal",
              // clinical_warning: "$clinical_warning",
              // contraindications: "$contraindications",
              // other: "$other",
              // link: "$link",
            },
          },
        ]);
      }
      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: `Imaging added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add lab test`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  // async uploadCSVForCountryList(req, res) {
  //   try {
  //     console.log("check console.");
  //     const filePath = "./uploads/" + req.filename;
  //     const data = await processExcel(filePath);
  //     const isValidFile = validateColumnWithExcel(CountryColumns, data[0]);
  //     fs.unlinkSync(filePath);
  //     if (!isValidFile) {
  //       sendResponse(req, res, 500, {
  //         status: false,
  //         body: isValidFile,
  //         message: "Invalid excel sheet! column not matched.",
  //         errorCode: null,
  //       });
  //       return;
  //     }
  //     if (data.length === 0) {
  //       return sendResponse(req, res, 400, {
  //         status: false,
  //         body: null,
  //         message: "CSV data is empty",
  //         errorCode: null,
  //       });
  //     }

  //     for (const element of data) {
  //       const country = await Country.findOne({
  //         name: element.name.trim(),
  //         is_deleted: false,
  //       });
  // if (!country) {
  //   for (const country of data) {
  //     countryData.push({
  //       name: country.name,
  //       country_code: country.country_code,
  //       iso_code: country.iso_code,
  //     });
  //   }

  //   const result = await Country.insertMany(countryData);
  //       } else {
  //         const regionName = element.name.trim();

  //         // Check if the combination of country name and region name already exists
  //         const existingRegion = await Country.findOne({
  //           name: regionName,
  //           country_id: country._id,
  //           is_deleted: false,

  //         });
  //         console.log("..................existingRegion", existingRegion);
  //         if (existingRegion) {
  //           return sendResponse(req, res, 500, {
  //             status: false,
  //             body: null,
  //             message: `'${regionName}' country  already exists`,
  //             errorCode: null,
  //           });
  //         } else {
  //           const payload = {
  //             name: regionName,
  //             country_id: country._id,
  //           };
  //           const region = new Region(payload);
  //           await region.save();
  //           console.log(`Region '${regionName}' added successfully.`);
  //         }
  //       }



  //     }
  //     const countryData = [];

  //     for (const country of data) {
  //       countryData.push({
  //         name: country.name,
  //         country_code: country.country_code,
  //         iso_code: country.iso_code,
  //       });
  //     }

  //     const result = await Country.insertMany(countryData);
  //     sendResponse(req, res, 200, {
  //       status: true,
  //       body: result,
  //       message: "All countryData records added successfully",
  //       errorCode: null,
  //     });
  //   } catch (error) {
  //     console.log(error, "error check");
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: error,
  //       message: "Internal server error 1",
  //       errorCode: null,
  //     });
  //   }
  // }


  async uploadCSVForCountryList(req, res) {
    try {
      console.log("check console.");
      const filePath = './uploads/' + req.filename
      const data = await processExcel(filePath);
      let isValidFile = ''
      if (data.length > 0) {
        isValidFile = validateColumnWithExcel(CountryColumns, data[0])

      }
      fs.unlinkSync(filePath)
      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return
      }

      const existingCountry = await Country.find({ is_deleted: false }, 'name');
      const existingCountrynames = existingCountry.map(lang => lang.name);
      const countryData = []
      const duplicateCountry = [];

      for (const country of data) {
        const trimmedCountry = country.name.trim();
        if (existingCountrynames.includes(trimmedCountry)) {
          duplicateCountry.push(trimmedCountry);
        } else {
          countryData.push({
            name: country.name,
            country_code: country.country_code,
            iso_code: country.iso_code,
          })
        }

      }
      if (duplicateCountry.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Country already exist: ${duplicateCountry.join(', ')}`,
          errorCode: null,
        });
      }
      if (countryData.length > 0) {
        const result = await Country.insertMany(countryData);
        sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All country records added successfully",
          errorCode: null,
        });
      }
      else {
        sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "No record found in excel sheet",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error check');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error 1",
        errorCode: null,
      });
    }
  }


























  // Region Api

  async addRegion(req, res) {
    try {
      const { name, country_id,createdBy } = req.body;
      // const list = await Region.findOne({ country_id: mongoose.Types.ObjectId(req.body.country_id) });
      const getlist = await Region.findOne({ country_id: mongoose.Types.ObjectId(req.body.country_id), name: name  });
console.log("getlist------",getlist);
      if (getlist === null || getlist === undefined) {
        let result = new Region({
          name,
          country_id,
          createdBy
        });
        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add Region successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Region already for this country exist",
          errorCode: null,
        });
      }


    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async regionLists(req, res) {
    // console.log("req.query", req.query);
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = Number(value);
      }else{
        sortingarray['createdAt'] = -1;

      }
      const filter = {
        is_deleted: false,
      };

      let aggregate = [
        {
          $lookup: {
            from: "countries",
            localField: "country_id",
            foreignField: "_id",
            as: "countryData",
          },
        },
        { $unwind: "$countryData" },
        { $match: filter },
      ];

      if (searchKey && searchKey !== "") {
        const regex = new RegExp(searchKey, "i");
        aggregate.push({ $match: { name: regex } });
      }

      const totalCount = await Region.aggregate(aggregate);
      // console.log("totalCount-------------", totalCount);

      aggregate.push(
        { $sort: sortingarray },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      );
      const listdata = await Region.aggregate(aggregate);
      // console.log("listdata-------------", listdata);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(totalCount.length / limit),
          currentPage: page,
          totalRecords: totalCount.length,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async countrydropdownList(req, res) {
    try {
      const countrylist = await Country.find({ is_deleted: false });
      console.log("countrylist", countrylist);
      sendResponse(req, res, 200, {
        status: true,
        body: { countrylist },
        message: `All country list`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get region list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteRegion(req, res) {
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          let checkisDeleted = await Region.find({ is_deleted: false }, { _id: 1 });
          const _idValues = checkisDeleted.map(item => item._id);
          let Provincedetails = await Province.find({ region_id: { $in: _idValues },is_deleted:false })
          if (Provincedetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Region is assigned to province. If you want to delete, please assign another Region to province or delete province and try",
                  errorCode: null,
              });
          }
          var result = await Region.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          let Provincedetails = await Province.find({ region_id: { $in: vaccinationId },is_deleted:false })
          if (Provincedetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Region is assigned to province. If you want to delete, please assign another Region to province or delete province and try",
                  errorCode: null,
              });
          }
          var result = await Region.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted Regions";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async regionListforexport(req, res) {
    const { searchKey, limit, page } = req.query;
    var filter;

    if (searchKey == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchKey || "", $options: "i" },
      };
    }

    try {
      var result = "";
      if (limit > 0) {
        result = await Region.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .populate("country_id", "name")
          .exec();
      } else {
        result = await Region.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "country",
            },
          },
          {
            $unwind: {
              path: "$country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,

              country_name: "$country.name",
              country_name: { $ifNull: ["$country.name", "Unknown"] },
              name: "$name",
            },
          },
        ]);
      }

      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: "Imaging added successfully",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: "failed to add lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForRegionList(req, res) {
    try {
      console.log("check console.");
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);
      const isValidFile = validateColumnWithExcel(RegionColumns, data[0]);
      fs.unlinkSync(filePath);
      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }
      if (data.length === 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "CSV data is empty",
          errorCode: null,
        });
      }

      for (const element of data) {
        const country = await Country.findOne({
          name: element.country_name.trim(),
          is_deleted: false,
        });

        if (!country) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: `Country '${element.country_name}' does not exist`,
            errorCode: null,
          });
        } else {
          const regionName = element.name.trim();

          // Check if the combination of country name and region name already exists
          const existingRegion = await Region.findOne({
            name: regionName,
            country_id: country._id,
            is_deleted: false,

          });
          console.log("..................existingRegion", existingRegion);
          if (existingRegion) {
            return sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: `'${regionName}' for country '${country.name}' already exists`,
              errorCode: null,
            });
          } else {
            const payload = {
              name: regionName,
              country_id: country._id,
            };
            const region = new Region(payload);
            await region.save();
            console.log(`Region '${regionName}' added successfully.`);
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Regions added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error check");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async editRegion(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        country_id: req.body.country_id,
      };
      const list = await Region.findOne({ country_id: mongoose.Types.ObjectId(req.body.country_id), name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)}, is_deleted: false });
     console.log("list-------",list);
      if (list == null || list == undefined) {
        const result = await Region.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit country",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Region already for this country exist",
          errorCode: null,
        });
      }
    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }

  // Provice api
  async addProvince(req, res) {
    try {
      const { name, region_id, createdBy } = req.body;
      const list = await Province.find({ region_id: mongoose.Types.ObjectId(req.body.region_id), name: name });
      if (list.length == 0) {
        let result = new Province({
          name,
          region_id,
          createdBy
        });
        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add Province successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Province already exist",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async provincemasterList(req, res) {
    console.log("req.query", req.query);
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = Number(value);
      }else{
        sortingarray['createdAt'] = -1;
        
      }
      const filter = {
        is_deleted: false,
      };

      let aggregate = [
        // {
        //   $lookup: {
        //     from: "countries",
        //     localField: "country_id",
        //     foreignField: "_id",
        //     as: "countryData",
        //   },
        // },
        // { $unwind: "$countryData" },
        {
          $lookup: {
            from: "regions",
            localField: "region_id",
            foreignField: "_id",
            as: "regionData",
          },
        },
        { $unwind: "$regionData" },
        {
          $lookup: {
            from: "countries",
            localField: "regionData.country_id",
            foreignField: "_id",
            as: "countryData",
          },
        },
        { $unwind: "$countryData" },
        { $match: filter },
      ];

      if (searchKey && searchKey !== "") {
        const regex = new RegExp(searchKey, "i");
        aggregate.push({ $match: { name: regex } });
      }

      const totalCount = await Province.aggregate(aggregate);

      aggregate.push(
        { $sort: sortingarray },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      );
      const listdata = await Province.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(totalCount.length / limit),
          currentPage: page,
          totalRecords: totalCount.length,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteProvince(req, res) {
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          let checkisDeleted = await Province.find({ is_deleted: false }, { _id: 1 });
          const _idValues = checkisDeleted.map(item => item._id);
          let departmentdetails = await Department.find({ province_id: { $in: _idValues },is_deleted:false })
          if (departmentdetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Province is assigned to Department. If you want to delete, please assign another Province to Department or delete Department and try",
                  errorCode: null,
              });
          }
          var result = await Province.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          let departmentdetails = await Department.find({ province_id: { $in: vaccinationId } ,is_deleted:false})
          if (departmentdetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Province is assigned to Department. If you want to delete, please assign another Province to Department or delete Department and try",
                  errorCode: null,
              });
          }
          var result = await Province.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted Province";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editProvince(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        region_id: req.body.region_id,
      };
      const list = await Province.find({ region_id: mongoose.Types.ObjectId(req.body.region_id), name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)} });
      if (list.length == 0) {
        const result = await Province.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit country",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Province already exist for this region",
          errorCode: null,
        });
      }
    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }

  async provinceListforexport(req, res) {
    const { searchKey, limit, page } = req.query;
    var filter;
    if (searchKey == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchKey || "", $options: "i" },
      };
    }

    try {
      var result = "";
      if (limit > 0) {
        result = await Province.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .populate("country_id", "name")
          .populate("region_id", "name")
          .exec();
      } else {
        result = await Province.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },
          // Stage to lookup the country name based on country_id

          // Stage to lookup the region name based on region_id
          {
            $lookup: {
              from: "regions", // Replace with the actual collection name of the "Region" model
              localField: "region_id",
              foreignField: "_id",
              as: "region",
            },
          },
          {
            $unwind: {
              path: "$region",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "countries", // Replace with the actual collection name of the "Country" model
              localField: "region.country_id",
              foreignField: "_id",
              as: "country",
            },
          },
          {
            $unwind: {
              path: "$country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              country_name: { $ifNull: ["$country.name", "Unknown"] },
              region_name: { $ifNull: ["$region.name", "Unknown"] },
              name: "$name",
            },
          },
        ]);
      }

      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: "Province added successfully",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: "failed to add lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async uploadCSVForProvinceList(req, res) {
    try {
      console.log("check console.");
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);
      console.log("data--EXCEL----------", data);
      // const isValidFile = validateColumnWithExcel(ProvinceColumns, data[0]);
      // fs.unlinkSync(filePath);

      // if (!isValidFile) {
      //   sendResponse(req, res, 500, {
      //     status: false,
      //     body: isValidFile,
      //     message: "Invalid excel sheet! column not matched.",
      //     errorCode: null,
      //   });
      //   return;
      // }
      if (data.length === 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "Excel data is empty",
          errorCode: null,
        });
      }

      for (const element of data) {
        console.log("element", element);
        if (!element.region_name) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: "Missing 'region_name' in the Excel data",
            errorCode: null,
          });
        }

        const region = await Region.findOne({
          name: element.region_name.trim(),
          is_deleted: false,
        });

        if (!region) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: `Region '${element.region_name}' does not exist`,
            errorCode: null,
          });
        } else {
          const existingProvince = await Province.findOne({
            name: element.name ? element.name.trim() : "",
            region_id: region._id,
          });

          if (existingProvince) {

            return sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: `Province '${element.name}' for region '${region.name}' already exists`,
              errorCode: null,
            });
          } else {
            const payload = {
              name: element.name ? element.name.trim() : "", // Trim to remove leading/trailing spaces
              region_id: region._id,
            };
            const province = new Province(payload);
            await province.save();
            console.log(`Province '${element.name}' added successfully.`);
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Provinces added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error check");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  // Department api

  async addDepartment(req, res) {
    try {
      const { name, province_id, createdBy } = req.body;
      const list = await Department.find({ province_id: mongoose.Types.ObjectId(req.body.province_id), name: name });
      if (list.length == 0) {
        let result = new Department({
          name,
          province_id,
          createdBy
        });

        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add Department successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Department already exist",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async provincedepartmentList(req, res) {
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = Number(value);
      }else{
        sortingarray['createdAt'] = -1;

      }
      const filter = {
        is_deleted: false,
      };

      let aggregate = [
        {
          $lookup: {
            from: "provinces",
            localField: "province_id",
            foreignField: "_id",
            as: "provinceData",
          },
        },
        { $unwind: "$provinceData" },
        {
          $lookup: {
            from: "regions",
            localField: "provinceData.region_id",
            foreignField: "_id",
            as: "regionData",
          },
        },
        { $unwind: "$regionData" },
        {
          $lookup: {
            from: "countries",
            localField: "regionData.country_id",
            foreignField: "_id",
            as: "countryData",
          },
        },
        { $unwind: "$countryData" },
        { $match: filter },
      ];

      if (searchKey && searchKey !== "") {
        const regex = new RegExp(searchKey, "i");
        aggregate.push({ $match: { name: regex } });
      }

      const totalCount = await Department.aggregate(aggregate);
      aggregate.push(
        { $sort: sortingarray },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      );
      const listdata = await Department.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(totalCount.length / limit),
          currentPage: page,
          totalRecords: totalCount.length,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteDepartment(req, res) {
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          let checkisDeleted = await Department.find({ is_deleted: false }, { _id: 1 });
          const _idValues = checkisDeleted.map(item => item._id);
          let citydetails = await City.find({ department_id: { $in: _idValues } ,is_deleted:false})
          if (citydetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Department is assigned to City. If you want to delete, please assign another Department to those City or delete City and try",
                  errorCode: null,
              });
          }
          let villagedetails = await Village.find({ department_id: { $in: _idValues } ,is_deleted:false})
          if (villagedetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Department is assigned to Village. If you want to delete, please assign another Department to those Village or delete Village and try",
                  errorCode: null,
              });
          }
          var result = await Department.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          let citydetails = await City.find({ department_id: { $in: vaccinationId },is_deleted:false })
          if (citydetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Department is assigned to City. If you want to delete, please assign another Department to those City or delete City and try",
                  errorCode: null,
              });
          }
          let villagedetails = await Village.find({ department_id: { $in: vaccinationId },is_deleted:false })
          if (villagedetails.length > 0) {
              return sendResponse(req, res, 200, {
                  status: false,
                  body: null,
                  message: "This Department is assigned to Village. If you want to delete, please assign another Department to those Village or delete Village and try",
                  errorCode: null,
              });
          }
          var result = await Department.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted Department";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editDepartment(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        province_id: req.body.province_id,
      };
      const list = await Department.find({ province_id: mongoose.Types.ObjectId(req.body.province_id), name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)} });
      if (list.length == 0) {
        const result = await Department.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit Department",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Department already exist for this province",
          errorCode: null,
        });
      }
    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }

  async departmentListforexport(req, res) {
    const { searchKey, limit, page } = req.query;
    var filter;
    if (searchKey == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchKey || "", $options: "i" },
      };
    }

    try {
      var result = "";
      if (limit > 0) {
        result = await Department.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .populate("country_id", "name")
          .populate("region_id", "name")
          .populate("province_id", "name")
          .exec();
      } else {
        result = await Department.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },

          // Stage to lookup the region name based on region_id
          {
            $lookup: {
              from: "provinces",
              localField: "province_id",
              foreignField: "_id",
              as: "provinceData",
            },
          },
          {
            $unwind: {
              path: "$provinceData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the province name based on province_id
          {
            $lookup: {
              from: "regions",
              localField: "provinceData.region_id",
              foreignField: "_id",
              as: "regionData",
            },
          },
          {
            $unwind: {
              path: "$regionData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the country name based on country_id
          {
            $lookup: {
              from: "countries",
              localField: "regionData.country_id",
              foreignField: "_id",
              as: "countryData",
            },
          },
          { $unwind: "$countryData" },
          {
            $unwind: {
              path: "$countryData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              country_name: { $ifNull: ["$countryData.name", "Unknown"] },
              region_name: { $ifNull: ["$regionData.name", "Unknown"] },
              province_name: { $ifNull: ["$provinceData.name", "Unknown"] },
              name: "$name",
            },
          },
        ]);
      }

      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: "Department added successfully",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: "failed to add lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async uploadCSVForDepartmentList(req, res) {
    try {
      console.log("check console.");
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);
      const isValidFile = validateColumnWithExcel(DepartmentColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }
      if (data.length === 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "CSV data is empty",
          errorCode: null,
        });
      }

      for (const element of data) {
        console.log("element", element);
        if (!element.province_name) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: "Missing 'province_name' in the Excel data",
            errorCode: null,
          });
        }

        const province = await Province.findOne({
          name: element.province_name.trim(),
          is_deleted: false,
        });

        if (!province) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: `Province '${element.province_name}' does not exist `,
            errorCode: null,
          });
        } else {
          const existingDepartment = await Department.findOne({
            name: element.name ? element.name.trim() : "",
            province_id: province._id,
          });

          if (existingDepartment) {

            return sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: `Department '${element.name}' for province '${province.name}'already exists`,
              errorCode: null,
            });
          } else {
            const payload = {
              name: element.name ? element.name.trim() : "", // Trim to remove leading/trailing spaces
              province_id: province._id,
            };
            const department = new Department(payload);
            await department.save();
            console.log(`Department '${element.name}' added successfully.`);
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Departments added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error check");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  // City Api
  async addCity(req, res) {
    try {
      const { name, department_id, createdBy } = req.body;
      const list = await City.find({ department_id: mongoose.Types.ObjectId(req.body.department_id), name: name });
      if (list.length == 0) {
        let result = new City({
          name,
          department_id,
          createdBy
        });
        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add City successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "City already exist",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async mastercityList(req, res) {
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = Number(value);
      }else{
        sortingarray["createdAt"] = -1;

      }
      const filter = {
        is_deleted: false,
      };

      let aggregate = [
        {
          $lookup: {
            from: "departments",
            localField: "department_id",
            foreignField: "_id",
            as: "departmentData",
          },
        },
        { $unwind: "$departmentData" },
        {
          $lookup: {
            from: "provinces",
            localField: "departmentData.province_id",
            foreignField: "_id",
            as: "provinceData",
          },
        },
        { $unwind: "$provinceData" },
        {
          $lookup: {
            from: "regions",
            localField: "provinceData.region_id",
            foreignField: "_id",
            as: "regionData",
          },
        },
        { $unwind: "$regionData" },
        {
          $lookup: {
            from: "countries",
            localField: "regionData.country_id",
            foreignField: "_id",
            as: "countryData",
          },
        },
        { $unwind: "$countryData" },
        { $match: filter },
      ];

      if (searchKey && searchKey !== "") {
        const regex = new RegExp(searchKey, "i");
        aggregate.push({ $match: { name: regex } });
      }

      const totalCount = await City.aggregate(aggregate);
      aggregate.push(
        { $sort: sortingarray},
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      );
      const listdata = await City.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(totalCount.length / limit),
          currentPage: page,
          totalRecords: totalCount.length,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteCity(req, res) {
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          var result = await City.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          var result = await City.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted City";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async editCity(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        department_id: req.body.department_id,
      };
      
      const list = await City.find({ department_id: mongoose.Types.ObjectId(req.body.department_id), name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)} });
      if (list.length == 0) {
        const result = await City.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit City",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "City already exist",
          errorCode: null,
        });
      }
    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }
  async cityListforexport(req, res) {
    const { searchKey, limit, page } = req.query;
    var filter;
    if (searchKey == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchKey || "", $options: "i" },
      };
    }

    try {
      var result = "";
      if (limit > 0) {
        result = await City.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .populate("country_id", "name")
          .populate("region_id", "name")
          .populate("province_id", "name")
          .populate("department_id", "name")
          .exec();
      } else {
        result = await City.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },

          // Stage to lookup the region name based on region_id
          {
            $lookup: {
              from: "departments",
              localField: "department_id",
              foreignField: "_id",
              as: "departmentData",
            },
          },
          {
            $unwind: {
              path: "$departmentData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the province name based on province_id
          {
            $lookup: {
              from: "provinces",
              localField: "departmentData.province_id",
              foreignField: "_id",
              as: "provinceData",
            },
          },
          {
            $unwind: {
              path: "$provinceData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the country name based on country_id
          {
            $lookup: {
              from: "regions",
              localField: "provinceData.region_id",
              foreignField: "_id",
              as: "regionData",
            },
          },

          {
            $unwind: {
              path: "$regionData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "regionData.country_id",
              foreignField: "_id",
              as: "countryData",
            },
          },
          {
            $unwind: {
              path: "$countryData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              country_name: { $ifNull: ["$countryData.name", "Unknown"] },
              region_name: { $ifNull: ["$regionData.name", "Unknown"] },
              province_name: { $ifNull: ["$provinceData.name", "Unknown"] },
              department_name: { $ifNull: ["$departmentData.name", "Unknown"] },
              name: "$name",
            },
          },
        ]);
      }

      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: "City added successfully",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: "failed to add lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForCityList(req, res) {
    try {
      console.log("check console.");
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);
      const isValidFile = validateColumnWithExcel(CityColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }
      if (data.length === 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "CSV data is empty",
          errorCode: null,
        });
      }

      for (const element of data) {
        console.log("element", element);
        if (!element.department_name) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: "Missing 'department_name' in the Excel data",
            errorCode: null,
          });
        }

        const department = await Department.findOne({
          name: element.department_name.trim(),
          is_deleted: false,
        });

        if (!department) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: `Department '${element.department_name}' does not exist`,
            errorCode: null,
          });
        } else {
          const existingCity = await City.findOne({
            name: element.name ? element.name.trim() : "",
            department_id: department._id,
          });

          if (existingCity) {
            return sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: `City '${element.name}' for department '${department.name}' already exists`,
              errorCode: null,
            });
          } else {
            const payload = {
              name: element.name ? element.name.trim() : "", // Trim to remove leading/trailing spaces
              department_id: department._id,
            };
            const city = new City(payload);
            await city.save();
            console.log(`City '${element.name}' added successfully.`);
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Cities added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error check");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }
  // Village api
  async addVillage(req, res) {
    try {
      const { name, department_id, createdBy } = req.body;
      const list = await Village.find({ department_id: mongoose.Types.ObjectId(req.body.department_id), name: name });
      if (list.length == 0) {
        let result = new Village({
          name,
          department_id,
          createdBy
        });
        const resObject = await result.save();
        sendResponse(req, res, 200, {
          status: true,
          message: "Add Village successfully",
          errorCode: null,
          result: resObject,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Village already exist",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log("error", error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add country",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async mastervillageList(req, res) {
    try {
      const { page, limit, searchKey, createdDate, updatedDate } = req.query;
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = Number(value);
      }else{
        sortingarray['createdAt'] = -1;

      }
      const filter = {
        is_deleted: false,
      };

      let aggregate = [
        {
          $lookup: {
            from: "departments",
            localField: "department_id",
            foreignField: "_id",
            as: "departmentData",
          },
        },
        { $unwind: "$departmentData" },
        {
          $lookup: {
            from: "provinces",
            localField: "departmentData.province_id",
            foreignField: "_id",
            as: "provinceData",
          },
        },
        { $unwind: "$provinceData" },
        {
          $lookup: {
            from: "regions",
            localField: "provinceData.region_id",
            foreignField: "_id",
            as: "regionData",
          },
        },
        { $unwind: "$regionData" },
        {
          $lookup: {
            from: "countries",
            localField: "regionData.country_id",
            foreignField: "_id",
            as: "countryData",
          },
        },
        { $unwind: "$countryData" },
        { $match: filter },
      ];

      if (searchKey && searchKey !== "") {
        const regex = new RegExp(searchKey, "i");
        aggregate.push({ $match: { name: regex } });
      }

      const totalCount = await Village.aggregate(aggregate);
      aggregate.push(
        { $sort: sortingarray },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
      );
      const listdata = await Village.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalPages: Math.ceil(totalCount.length / limit),
          currentPage: page,
          totalRecords: totalCount.length,
          listdata,
        },
        message: `List Fetch successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to fetched list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteVillage(req, res) {
    try {
      const { vaccinationId, action_name, action_value } = req.body;
      var message = "";

      const filter = {};
      if (action_name == "active") filter["active"] = action_value;
      if (action_name == "delete") filter["is_deleted"] = action_value;

      // if (action_name == "active") {
      //     var result = await Vaccination.findOneAndUpdate(
      //         { _id: vaccinationId },
      //         filter,
      //         { new: true }
      //     );

      //     message = action_value == true ? 'Successfully Active Vaccination' : 'Successfully In-active Vaccination'
      // }

      if (action_name == "delete") {
        if (vaccinationId == "") {
          var result = await Village.updateMany(
            { is_deleted: { $eq: false } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        } else {
          var result = await Village.updateMany(
            { _id: { $in: vaccinationId } },
            {
              $set: { is_deleted: true },
            },
            { new: true }
          );
        }
        message = "Successfully Deleted Village";
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "failed to performed action",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async editVillage(req, res) {
    try {
      let jsondata = {
        name: req.body.name,
        department_id: req.body.department_id,
      };
      const list = await Village.find({ department_id: mongoose.Types.ObjectId(req.body.department_id), name: req.body.name, _id:{$ne: mongoose.Types.ObjectId(req.body._id)}, is_deleted:false });
      if (list.length == 0) {
        const result = await Village.updateOne(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          { $set: jsondata },
          { new: true }
        );
        if (!result) {
          sendResponse(req, res, 500, {
            status: false,
            body: null,
            message: "failed to edit Village",
            errorCode: "INTERNAL_SERVER_ERROR",
          });
        } else {
          sendResponse(req, res, 200, {
            status: true,
            message: "Update successfully",
            errorCode: null,
            result: result,
          });
        }
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Village already exist for this department",
          errorCode: null,
        });
      }
    } catch (e) {
      console.log(e);
      res.send({
        status: false,
        messgae: "Oops!! something went wrong",
      });
    }
  }
  async villageListforexport(req, res) {
    const { searchKey, limit, page } = req.query;
    var filter;
    if (searchKey == "") {
      filter = {
        is_deleted: false,
      };
    } else {
      filter = {
        is_deleted: false,
        name: { $regex: searchKey || "", $options: "i" },
      };
    }

    try {
      var result = "";
      if (limit > 0) {
        result = await Village.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .populate("country_id", "name")
          .populate("region_id", "name")
          .populate("province_id", "name")
          .populate("department_id", "name")
          .exec();
      } else {
        result = await Village.aggregate([
          {
            $match: filter,
          },
          { $sort: { createdAt: -1 } },

          // Stage to lookup the region name based on region_id
          {
            $lookup: {
              from: "departments",
              localField: "department_id",
              foreignField: "_id",
              as: "departmentData",
            },
          },
          {
            $unwind: {
              path: "$departmentData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the province name based on province_id
          {
            $lookup: {
              from: "provinces",
              localField: "departmentData.province_id",
              foreignField: "_id",
              as: "provinceData",
            },
          },
          {
            $unwind: {
              path: "$provinceData",
              preserveNullAndEmptyArrays: true,
            },
          },

          // Stage to lookup the country name based on country_id
          {
            $lookup: {
              from: "regions",
              localField: "provinceData.region_id",
              foreignField: "_id",
              as: "regionData",
            },
          },

          {
            $unwind: {
              path: "$regionData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "regionData.country_id",
              foreignField: "_id",
              as: "countryData",
            },
          },
          {
            $unwind: {
              path: "$countryData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              country_name: { $ifNull: ["$countryData.name", "Unknown"] },
              region_name: { $ifNull: ["$regionData.name", "Unknown"] },
              province_name: { $ifNull: ["$provinceData.name", "Unknown"] },
              department_name: { $ifNull: ["$departmentData.name", "Unknown"] },
              name: "$name",
            },
          },
        ]);
      }

      console.log(result, "result check");
      let array = result.map((obj) => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array,
        },
        message: "Village added successfully",
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: "failed to add lab test",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForVillageList(req, res) {
    try {
      console.log("check console.");
      const filePath = "./uploads/" + req.filename;
      const data = await processExcel(filePath);
      const isValidFile = validateColumnWithExcel(VillageColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }
      if (data.length === 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: "CSV data is empty",
          errorCode: null,
        });
      }

      for (const element of data) {
        console.log("element", element);
        if (!element.department_name) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: "Missing 'department_name' in the Excel data",
            errorCode: null,
          });
        }

        const department = await Department.findOne({
          name: element.department_name.trim(),
          is_deleted: false,
        });

        if (!department) {
          return sendResponse(req, res, 400, {
            status: false,
            body: null,
            message: `Department '${element.department_name}' does not exist`,
            errorCode: null,
          });
        } else {
          const existingVillage = await Village.findOne({
            name: element.name ? element.name.trim() : "",
            department_id: department._id,
          });

          if (existingVillage) {
            return sendResponse(req, res, 500, {
              status: false,
              body: null,
              message: `Village '${element.name}' for department '${department.name}' already exists`,
              errorCode: null,
            });
          } else {
            const payload = {
              name: element.name ? element.name.trim() : "", // Trim to remove leading/trailing spaces
              department_id: department._id,
            };
            const village = new Village(payload);
            await village.save();
            console.log(`Village '${element.name}' added successfully.`);
          }
        }
      }

      return sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: "Villages added successfully",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error check");
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }




  // //Team By Super-admin
  // async addTeam_SuperAdmin(req, res) {
  //   try {
  //     const { teamArray, added_by } = req.body
  //     const list = teamArray.map((singleData) => ({
  //       ...singleData,
  //       added_by
  //     }));
  //     const namesToFind = list.map((item) => item.team);
  //     const foundItems = await Team.find({
  //       team: { $in: namesToFind },
  //     });
  //     const CheckData = foundItems.map((item) => item.team);
  //     if (foundItems.length == 0) {
  //       const savedTeam = await Team.insertMany(list)
  //       sendResponse(req, res, 200, {
  //         status: true,
  //         body: savedTeam,
  //         message: "Successfully add team",
  //         errorCode: null,
  //       });
  //     } else {
  //       sendResponse(req, res, 200, {
  //         status: false,

  //         message: `${CheckData} is already exist`,
  //         errorCode: null,
  //       });
  //     }

  //   } catch (error) {
  //     console.log(error);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: null,
  //       message: "failed to add team",
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  // async allTeamList(req, res) {
  //   try {
  //     const { limit, page, searchText } = req.query
  //     var filter = { delete_status: false }
  //     if (searchText != "") {
  //       filter = {
  //         delete_status: false,
  //         team: { $regex: searchText || '', $options: "i" }
  //       }
  //     }
  //     const teamList = await Team.find(filter)
  //       .sort([["createdAt", -1]])
  //       .skip((page - 1) * limit)
  //       .limit(limit * 1)
  //       .exec();
  //     const count = await Team.countDocuments(filter);
  //     sendResponse(req, res, 200, {
  //       status: true,
  //       body: {
  //         totalCount: count,
  //         data: teamList,
  //       },
  //       message: "Successfully get Team list",
  //       errorCode: null,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: null,
  //       message: "failed to get team list",
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  // async updateTeam(req, res) {
  //   try {
  //     const {
  //       teamId,
  //       team,
  //       active_status,
  //       delete_status
  //     } = req.body
  //     const list = await Team.find({ team: team, active_status: active_status });
  //     if (list.length == 0) {
  //       const updateTeam = await Team.updateOne(
  //         { _id: teamId },
  //         {
  //           $set: {
  //             team,
  //             active_status,
  //             delete_status
  //           }
  //         },
  //         { new: true }
  //       ).exec();
  //       sendResponse(req, res, 200, {
  //         status: true,
  //         body: updateTeam,
  //         message: "Successfully updated Team",
  //         errorCode: null,
  //       });
  //     } else {
  //       sendResponse(req, res, 200, {
  //         status: false,

  //         message: "Team Already Exist",
  //         errorCode: null,
  //       });
  //     }

  //   } catch (err) {
  //     console.log(err);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       data: err,
  //       message: `failed to update Team`,
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  // async actionOnTeam(req, res) {
  //   try {
  //     const { teamId, action_name, action_value } = req.body
  //     var message = ''

  //     const filter = {}
  //     if (action_name == "active") filter['active_status'] = action_value
  //     if (action_name == "delete") filter['delete_status'] = action_value

  //     if (action_name == "active") {
  //       var result = await Team.updateOne(
  //         { _id: teamId },
  //         filter,
  //         { new: true }
  //       ).exec();

  //       message = action_value == true ? 'Successfully Active Team' : 'Successfully In-active Team'
  //     }

  //     if (action_name == "delete") {
  //       if (teamId == '') {
  //         await Team.updateMany(
  //           { delete_status: { $eq: false } },
  //           {
  //             $set: { delete_status: true }
  //           },
  //           { new: true }
  //         )
  //       }
  //       else {
  //         await Team.updateMany(
  //           { _id: { $in: teamId } },
  //           {
  //             $set: { delete_status: true }
  //           },
  //           { new: true }
  //         )
  //       }
  //       message = 'Successfully Team deleted'
  //     }

  //     sendResponse(req, res, 200, {
  //       status: true,
  //       body: result,
  //       message: message,
  //       errorCode: null,
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       data: err,
  //       message: `failed to action done`,
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  // async allTeamListforexport(req, res) {
  //   const { searchText, limit, page } = req.query
  //   var filter
  //   if (searchText == "") {
  //     filter = {
  //       delete_status: false
  //     }
  //   } else {
  //     filter = {
  //       delete_status: false,
  //       team: { $regex: searchText || '', $options: "i" },
  //     }
  //   }
  //   try {
  //     var result = '';
  //     if (limit > 0) {
  //       result = await Team.find(filter)
  //         .sort([["createdAt", -1]])
  //         .skip((page - 1) * limit)
  //         .limit(limit * 1)
  //         .exec();
  //     }
  //     else {
  //       result = await Team.aggregate([{
  //         $match: filter
  //       },
  //       { $sort: { "createdAt": -1 } },
  //       {
  //         $project: {
  //           _id: 0,
  //           team: "$team"
  //         }
  //       }
  //       ])
  //     }
  //     console.log(result, "result check")
  //     let array = result.map(obj => Object.values(obj));
  //     sendResponse(req, res, 200, {
  //       status: true,
  //       data: {
  //         result,
  //         array
  //       },
  //       message: `Team added successfully`,
  //       errorCode: null,
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       data: err,
  //       message: `failed to add team`,
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  // async uploadCSVForTeam(req, res) {
  //   try {
  //     const filePath = './uploads/' + req.filename;
  //     const data = await processExcel(filePath);

  //     const isValidFile = validateColumnWithExcel(TeamColumns, data[0]);
  //     fs.unlinkSync(filePath);

  //     if (!isValidFile) {
  //       sendResponse(req, res, 500, {
  //         status: false,
  //         body: isValidFile,
  //         message: "Invalid excel sheet! column not matched.",
  //         errorCode: null,
  //       });
  //       return;
  //     }

  //     const existingTeams = await Team.find({}, 'team');
  //     const existingTeamNames = existingTeams.map(team => team.team);

  //     const inputArray = [];
  //     const duplicateTeams = [];

  //     for (const singleData of data) {
  //       const trimmedTeam = singleData.team.trim();
  //       if (existingTeamNames.includes(trimmedTeam)) {
  //         duplicateTeams.push(trimmedTeam);
  //       } else {
  //         inputArray.push({
  //           team: trimmedTeam,
  //           added_by: req.body.added_by,
  //         });
  //       }
  //     }

  //     if (duplicateTeams.length > 0) {
  //       return sendResponse(req, res, 400, {
  //         status: false,
  //         body: null,
  //         message: `Teams already exist: ${duplicateTeams.join(', ')}`,
  //         errorCode: null,
  //       });
  //     }

  //     if (inputArray.length > 0) {
  //       const result = await Team.insertMany(inputArray);
  //       return sendResponse(req, res, 200, {
  //         status: true,
  //         body: result,
  //         message: "All team records added successfully",
  //         errorCode: null,
  //       });
  //     } else {
  //       return sendResponse(req, res, 200, {
  //         status: true,
  //         body: null,
  //         message: "No new teams added",
  //         errorCode: null,
  //       });
  //     }
  //   } catch (error) {
  //     console.log(error, 'error');
  //     return sendResponse(req, res, 500, {
  //       status: false,
  //       body: error,
  //       message: "Internal server error",
  //       errorCode: null,
  //     });
  //   }
  // }
  // async TeamById(req, res) {
  //   try {
  //     const { _id } = req.query;

  //     const list = await Team.find({ _id: _id });
  //     sendResponse(req, res, 200, {
  //       status: true,
  //       body: { list },
  //       message: `All Team list`,
  //       errorCode: null,
  //     });
  //   } catch (error) {
  //     console.log(error, "error--->");
  //     sendResponse(req, res, 500, {
  //       status: false,
  //       body: null,
  //       message: "failed to get Team list",
  //       errorCode: "INTERNAL_SERVER_ERROR",
  //     });
  //   }
  // }

  
  // Designation by Super-admin
  async addDesignation_SuperAdmin(req, res) {
    try {
      const { designationArray, added_by } = req.body
      const list = designationArray.map((singleData) => ({
        ...singleData,
        added_by
      }));
      const namesToFind = list.map((item) => item.designation);
      const foundItems = await Designation.find({
        designation: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.designation);
      if (foundItems.length == 0) {
        const savedDesignation = await Designation.insertMany(list)
        sendResponse(req, res, 200, {
          status: true,
          body: savedDesignation,
          message: "Successfully add designation",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: `${CheckData} Already Exist`,
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add designation",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allDesignationList(req, res) {
    try {
      const { limit, page, searchText } = req.query
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = value;
      }else{
        sortingarray["createdAt"] = -1;

      }
      var filter = { delete_status: false }
      if (searchText != "") {
        filter = {
          delete_status: false,
          designation: { $regex: searchText || '', $options: "i" }
        }
      }
      const designationList = await Designation.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await Designation.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: designationList,
        },
        message: "Successfully get Designation list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get designation list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateDesignation(req, res) {
    try {
      const {
        designationId,
        designation,
        active_status,
        delete_status
      } = req.body
      const list = await Designation.find({ designation: designation, active_status: active_status,  _id:{$ne: mongoose.Types.ObjectId(designationId)} });
      if (list.length == 0) {
        const updateDesignation = await Designation.updateOne(
          { _id: designationId },
          {
            $set: {
              designation,
              active_status,
              delete_status
            }
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: updateDesignation,
          message: "Successfully updated Designation",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: "Designation Already Exist",
          errorCode: null,
        });
      }

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update Designation`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnDesignation(req, res) {
    try {
      const { designationId, action_name, action_value } = req.body
      var message = ''

      const filter = {}
      if (action_name == "active") filter['active_status'] = action_value
      if (action_name == "delete") filter['delete_status'] = action_value

      if (action_name == "active") {
        var result = await Designation.updateOne(
          { _id: designationId },
          filter,
          { new: true }
        ).exec();

        message = action_value == true ? 'Successfully Active Designation' : 'Successfully In-active Designation'
      }

      if (action_name == "delete") {
        if (designationId == '') {
          await Designation.updateMany(
            { delete_status: { $eq: false } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        else {
          await Designation.updateMany(
            { _id: { $in: designationId } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        message = 'Successfully Designation deleted'
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to action done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allDesignatonListforexport(req, res) {
    const { searchText, limit, page } = req.query
    var filter
    if (searchText == "") {
      filter = {
        delete_status: false
      }
    } else {
      filter = {
        delete_status: false,
        team: { $regex: searchText || '', $options: "i" },
      }
    }
    try {
      var result = '';
      if (limit > 0) {
        result = await Designation.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      else {
        result = await Designation.aggregate([{
          $match: filter
        },
        { $sort: { "createdAt": -1 } },
        {
          $project: {
            _id: 0,
            designation: "$designation"
          }
        }
        ])
      }
      console.log(result, "result check")
      let array = result.map(obj => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array
        },
        message: `Designation added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add Designation`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForDesignation(req, res) {
    try {
      const filePath = './uploads/' + req.filename;
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(DesignationColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }

      const existingDesignations = await Designation.find({}, 'designation');
      const existingDesignationNames = existingDesignations.map(designation => designation.designation);

      const inputArray = [];
      const duplicateDesignations = [];

      for (const singleData of data) {
        const trimmedDesignation = singleData.designation.trim();
        if (existingDesignationNames.includes(trimmedDesignation)) {
          duplicateDesignations.push(trimmedDesignation);
        } else {
          inputArray.push({
            designation: trimmedDesignation,
            added_by: req.body.added_by,
          });
        }
      }

      if (duplicateDesignations.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Designations already exist: ${duplicateDesignations.join(', ')}`,
          errorCode: null,
        });
      }

      if (inputArray.length > 0) {
        const result = await Designation.insertMany(inputArray);
        return sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All designation records added successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "No new designations added",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error');
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async designationById(req, res) {
    const { _id } = req.query;

    try {
      const list = await Designation.find({ _id: _id });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All Designation list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get Language list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  // Title by Super-admin
  async addTitle_SuperAdmin(req, res) {
    try {
      const { titleArray, added_by } = req.body
      const list = titleArray.map((singleData) => ({
        ...singleData,
        added_by
      }));
      const namesToFind = list.map((item) => item.title);
      const foundItems = await Title.find({
        title: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.title);
      if (foundItems.length == 0) {
        const savedTitle = await Title.insertMany(list)
        sendResponse(req, res, 200, {
          status: true,
          body: savedTitle,
          message: "Successfully add Title",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: `${CheckData} already exist`,
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add Title",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allTitleList(req, res) {
    try {
      const { limit, page, searchText } = req.query
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = value;
      }else{
        sortingarray["createdAt"] = -1;

      }
      var filter = { delete_status: false }
      if (searchText != "") {
        filter = {
          delete_status: false,
          title: { $regex: searchText || '', $options: "i" }
        }
      }
      const titleList = await Title.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await Title.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: titleList,
        },
        message: "Successfully get Title list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error,"88888");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get title list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateTitle(req, res) {
    try {
      const {
        titleId,
        title,
        active_status,
        delete_status
      } = req.body
      const list = await Title.find({ title: title, active_status: active_status,_id:{$ne: mongoose.Types.ObjectId(titleId)}, is_deleted:false  });
      if (list.length == 0) {
        const updateTitle = await Title.updateOne(
          { _id: titleId },
          {
            $set: {
              title,
              active_status,
              delete_status
            }
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: updateTitle,
          message: "Successfully updated Title",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,
          message: "Title Already Exist",
          errorCode: null,
        });
      }

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update Title`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnTitle(req, res) {
    try {
      const { titleId, action_name, action_value } = req.body
      var message = ''

      const filter = {}
      if (action_name == "active") filter['active_status'] = action_value
      if (action_name == "delete") filter['delete_status'] = action_value

      if (action_name == "active") {
        var result = await Title.updateOne(
          { _id: titleId },
          filter,
          { new: true }
        ).exec();

        message = action_value == true ? 'Successfully Active Title' : 'Successfully In-active Title'
      }

      if (action_name == "delete") {
        if (titleId == '') {
          await Title.updateMany(
            { delete_status: { $eq: false } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        else {
          await Title.updateMany(
            { _id: { $in: titleId } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        message = 'Successfully Title deleted'
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to title done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allTitleListforexport(req, res) {
    const { searchText, limit, page } = req.query
    var filter
    if (searchText == "") {
      filter = {
        delete_status: false
      }
    } else {
      filter = {
        delete_status: false,
        title: { $regex: searchText || '', $options: "i" },
      }
    }
    try {
      var result = '';
      if (limit > 0) {
        result = await Title.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      else {
        result = await Title.aggregate([{
          $match: filter
        },
        { $sort: { "createdAt": -1 } },
        {
          $project: {
            _id: 0,
            title: "$title"
          }
        }
        ])
      }
      let array = result.map(obj => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array
        },
        message: `Title added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add Title`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForTitle(req, res) {
    try {
      const filePath = './uploads/' + req.filename;
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(TitleColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }

      const existingTitles = await Title.find({}, 'title');
      const existingTitleNames = existingTitles.map(title => title.title);

      const inputArray = [];
      const duplicateTitles = [];

      for (const singleData of data) {
        const trimmedTitle = singleData.title.trim();
        if (existingTitleNames.includes(trimmedTitle)) {
          duplicateTitles.push(trimmedTitle);
        } else {
          inputArray.push({
            title: trimmedTitle,
            added_by: req.body.added_by,
          });
        }
      }

      if (duplicateTitles.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Titles already exist: ${duplicateTitles.join(', ')}`,
          errorCode: null,
        });
      }

      if (inputArray.length > 0) {
        const result = await Title.insertMany(inputArray);
        return sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All title records added successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "No new titles added",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error');
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async TitleById(req, res) {
    try {
      const { _id } = req.query;

      const list = await Title.find({ _id: _id });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All Title list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get Title list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }




  // Type of language by superadmin
  async addLanguage_SuperAdmin(req, res) {
    try {
      const { languageArray, added_by } = req.body
      const list = languageArray.map((singleData) => ({
        ...singleData,
        added_by
      }));
      const namesToFind = list.map((item) => item.language);
      const foundItems = await Language.find({
        language: { $in: namesToFind },
      });
      const CheckData = foundItems.map((item) => item.language);
      if (foundItems.length == 0) {
        const savedLanguage = await Language.insertMany(list)
        sendResponse(req, res, 200, {
          status: true,
          body: savedLanguage,
          message: "Successfully add Language",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: `${CheckData} is already exist`,
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add Language",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allLanguageList(req, res) {
    try {
      const { limit, page, searchText } = req.query
      var sort=req.query.sort
      var sortingarray={};
      if (sort != 'undefined' && sort != '' && sort != undefined)
      {
          var keynew=sort.split(":")[0];
          var value=sort.split(":")[1];
          sortingarray[keynew] = value;
      }else{
        sortingarray["createdAt"] = -1;

      }
      var filter = { delete_status: false }
      if (searchText != "") {
        filter = {
          delete_status: false,
          language: { $regex: searchText || '', $options: "i" }
        }
      }
      const languageList = await Language.find(filter)
        .sort(sortingarray)
        .skip((page - 1) * limit)
        .limit(limit * 1)
        .exec();
      const count = await Language.countDocuments(filter);
      sendResponse(req, res, 200, {
        status: true,
        body: {
          totalCount: count,
          data: languageList,
        },
        message: "Successfully get Language list",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get HealthCentre list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async updateLanguage(req, res) {
    try {
      const {
        languageId,
        language,
        active_status,
        delete_status
      } = req.body
      const list = await Language.find({ language: language, active_status: active_status,_id:{$ne: mongoose.Types.ObjectId(languageId)}, is_deleted:false });
      if (list.length == 0) {
        const updateLanguage = await Language.updateOne(
          { _id: languageId },
          {
            $set: {
              language,
              active_status,
              delete_status
            }
          },
          { new: true }
        ).exec();
        sendResponse(req, res, 200, {
          status: true,
          body: updateLanguage,
          message: "Successfully updated Language",
          errorCode: null,
        });
      } else {
        sendResponse(req, res, 200, {
          status: false,

          message: "Language already exist",
          errorCode: null,
        });
      }

    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to update Language`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async actionOnLanguage(req, res) {
    try {
      const { languageId, action_name, action_value } = req.body
      var message = ''

      const filter = {}
      if (action_name == "active") filter['active_status'] = action_value
      if (action_name == "delete") filter['delete_status'] = action_value

      if (action_name == "active") {
        var result = await Language.updateOne(
          { _id: languageId },
          filter,
          { new: true }
        ).exec();

        message = action_value == true ? 'Successfully Active Language' : 'Successfully In-active Language'
      }

      if (action_name == "delete") {
        if (languageId == '') {
          await Language.updateMany(
            { delete_status: { $eq: false } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        else {
          await Language.updateMany(
            { _id: { $in: languageId } },
            {
              $set: { delete_status: true }
            },
            { new: true }
          )
        }
        message = 'Successfully Language deleted'
      }

      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: message,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to Language done`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async allLanguageListforexport(req, res) {
    const { searchText, limit, page } = req.query
    var filter
    if (searchText == "") {
      filter = {
        delete_status: false
      }
    } else {
      filter = {
        delete_status: false,
        language: { $regex: searchText || '', $options: "i" },
      }
    }
    try {
      var result = '';
      if (limit > 0) {
        result = await Language.find(filter)
          .sort([["createdAt", -1]])
          .skip((page - 1) * limit)
          .limit(limit * 1)
          .exec();
      }
      else {
        result = await Language.aggregate([{
          $match: filter
        },
        { $sort: { "createdAt": -1 } },
        {
          $project: {
            _id: 0,
            language: "$language"
          }
        }
        ])
      }
      console.log(result, "result check")
      let array = result.map(obj => Object.values(obj));
      sendResponse(req, res, 200, {
        status: true,
        data: {
          result,
          array
        },
        message: `Language added successfully`,
        errorCode: null,
      });
    } catch (err) {
      console.log(err);
      sendResponse(req, res, 500, {
        status: false,
        data: err,
        message: `failed to add Language`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async uploadCSVForLanguage(req, res) {
    try {
      const filePath = './uploads/' + req.filename;
      const data = await processExcel(filePath);

      const isValidFile = validateColumnWithExcel(LanguageColumns, data[0]);
      fs.unlinkSync(filePath);

      if (!isValidFile) {
        sendResponse(req, res, 500, {
          status: false,
          body: isValidFile,
          message: "Invalid excel sheet! column not matched.",
          errorCode: null,
        });
        return;
      }

      const existingLanguages = await Language.find({}, 'language');
      const existingLanguageNames = existingLanguages.map(lang => lang.language);

      const inputArray = [];
      const duplicateLanguages = [];

      for (const singleData of data) {
        const trimmedLanguage = singleData.language.trim();
        if (existingLanguageNames.includes(trimmedLanguage)) {
          duplicateLanguages.push(trimmedLanguage);
        } else {
          inputArray.push({
            language: trimmedLanguage,
            added_by: req.body.added_by,
          });
        }
      }

      if (duplicateLanguages.length > 0) {
        return sendResponse(req, res, 400, {
          status: false,
          body: null,
          message: `Languages already exist: ${duplicateLanguages.join(', ')}`,
          errorCode: null,
        });
      }

      if (inputArray.length > 0) {
        const result = await Language.insertMany(inputArray);
        return sendResponse(req, res, 200, {
          status: true,
          body: result,
          message: "All language records added successfully",
          errorCode: null,
        });
      } else {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: "No new languages added",
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, 'error');
      return sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }


  async commmonDesignationList(req, res) {
    try {
      const list = await Designation.find({ delete_status: false, active_status: true });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All Designation list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get Designation list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  // 
  async commmonTitleList(req, res) {
    try {
      const list = await Title.find({ delete_status: false, active_status: true });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All Title list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get Title list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }



  async commmonLanguageList(req, res) {
    try {
      const list = await Language.find({ delete_status: false, active_status: true });
      sendResponse(req, res, 200, {
        status: true,
        body: { list },
        message: `All Language list`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "error--->");
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get Language list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  // 

  async getLocationName(req,res)
{
  try{
    const { locationids } = req.body
    var countrydata={}
    var regiondata={}
    var provincedata={}
    var departmentdata={}
    var citydata={}
    var villagedata={}
  
 
    if(locationids?.country_id)
    {
      countrydata= await Country.findOne({_id:locationids.country_id},{name:1,iso_code:1}).lean()
    }
    if(locationids?.region_id)
    {
      regiondata= await Region.findOne({_id:locationids.region_id},{name:1}).lean()
    }
    if(locationids?.province_id)
    {
     provincedata= await Province.findOne({_id:locationids.province_id},{name:1}).lean()
    }
    if(locationids?.department_id)
    {
      departmentdata= await Department.findOne({_id:locationids.department_id},{name:1}).lean()
    }
    if(locationids?.city_id)
    {
      citydata= await City.findOne({_id:locationids.city_id},{name:1}).lean()
    }
    if(locationids?.village_id)
    {
      villagedata= await Village.findOne({_id:locationids.village_id},{name:1}).lean()
    }
console.log(countrydata,"countrydata",locationids);
    var locationName={
      country_name:countrydata?.name?countrydata?.name:"",
      country_iso_code:countrydata?.iso_code?countrydata?.iso_code:"",
      region_name:regiondata?.name?regiondata?.name:"",
      province_name:provincedata?.name?provincedata?.name:"",
      department_name:departmentdata?.name?departmentdata?.name:"",
      village_name:villagedata?.name?villagedata?.name:"",
      city_name:citydata?.name?citydata?.name:"",
 
    }
    sendResponse(req, res, 200, {
      status: true,
      body: locationName,
      message: `All location Name`,
      errorCode: null,
    });
  }
catch(err)
{
  sendResponse(req, res, 200, {
    status: false,
    body: {},
    message: `Something went wrong`,
    errorCode: null,
  });
}
}
}

module.exports = new CommonDataController();
