"use strict";

import express from "express";
import commonDataController from "../controllers/common_data/commonDataController";
import { handleResponse } from "../middleware/utils";
const fs = require('fs');

const commonRoute = express.Router();
const uploadFileToLocalStorage = async (req, res, next) => {
    if (!req.files) {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "No files found",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    
    console.log(req.files.file, "fileData");
    const file = req.files.file;
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        return handleResponse(req, res, 500, {
            status: false,
            body: null,
            message: "Only excel file allowed!",
            errorCode: "INTERNAL_SERVER_ERROR",
        })
    }
    const filename = file.name.split('.')[0] + '-' + Date.now() + '.xlsx';
    req.filename = filename;
    const newPath = `${__dirname.replace('routes', 'uploads')}/${filename}`
    console.log(newPath, 'newPath');
    console.log(file.data, 'file.data');
    fs.writeFile(newPath, file.data, (err, data) => {
        if (err) {
            console.log(err, 'err');
            return handleResponse(req, res, 500, {
                status: false,
                body: err,
                message: "Something went wrong while uploading file",
                errorCode: "INTERNAL_SERVER_ERROR ",
            })
        }
        next()
    })
}
commonRoute.get('/country-list', commonDataController.countryList)
commonRoute.get('/region-list', commonDataController.regionList)
commonRoute.get('/province-list', commonDataController.provinceList)
commonRoute.get('/department-list', commonDataController.departmentList)
commonRoute.get('/city-list', commonDataController.cityList)
commonRoute.get('/village-list', commonDataController.villageList)
commonRoute.get('/get-Cityname-ById', commonDataController.getCitynameById)

// Country
commonRoute.post('/add-country', commonDataController.addCountries)
commonRoute.get('/list-country', commonDataController.countryLists)
commonRoute.put('/edit-country', commonDataController.editCountry)
commonRoute.post('/delete-country', commonDataController.deleteCountry)
commonRoute.get('/exportsheetlist-country', commonDataController.countryListforexport)
commonRoute.post('/upload-csv-for-country-list', uploadFileToLocalStorage, commonDataController.uploadCSVForCountryList)

// Region
commonRoute.post('/add-region', commonDataController.addRegion)
commonRoute.get('/list-region', commonDataController.regionLists)
commonRoute.get('/list-dropdowncountries', commonDataController.countrydropdownList)
commonRoute.post('/delete-region', commonDataController.deleteRegion)
commonRoute.get('/exportsheetlist-region', commonDataController.regionListforexport)
commonRoute.post('/upload-csv-for-region-list', uploadFileToLocalStorage, commonDataController.uploadCSVForRegionList)
commonRoute.put('/edit-region', commonDataController.editRegion)

// Province
commonRoute.post('/add-province', commonDataController.addProvince)
commonRoute.get('/list-province', commonDataController.provincemasterList)
commonRoute.post('/delete-province', commonDataController.deleteProvince)
commonRoute.put('/edit-province', commonDataController.editProvince)
commonRoute.get('/exportsheetlist-province', commonDataController.provinceListforexport)
commonRoute.post('/upload-csv-for-province-list', uploadFileToLocalStorage, commonDataController.uploadCSVForProvinceList)

// Department
commonRoute.post('/add-department', commonDataController.addDepartment)
commonRoute.get('/list-department', commonDataController.provincedepartmentList)
commonRoute.post('/delete-department', commonDataController.deleteDepartment)
commonRoute.put('/edit-department', commonDataController.editDepartment)
commonRoute.get('/exportsheetlist-department', commonDataController.departmentListforexport)
commonRoute.post('/upload-csv-for-department-list', uploadFileToLocalStorage, commonDataController.uploadCSVForDepartmentList)

// City
commonRoute.post('/add-city', commonDataController.addCity)
commonRoute.get('/list-city', commonDataController.mastercityList)
commonRoute.post('/delete-city', commonDataController.deleteCity)
commonRoute.put('/edit-city', commonDataController.editCity)
commonRoute.get('/exportsheetlist-city', commonDataController.cityListforexport)
commonRoute.post('/upload-csv-for-city-list', uploadFileToLocalStorage, commonDataController.uploadCSVForCityList)

// Village
commonRoute.post('/add-village', commonDataController.addVillage)
commonRoute.get('/list-village', commonDataController.mastervillageList)
commonRoute.post('/delete-village', commonDataController.deleteVillage)
commonRoute.put('/edit-village', commonDataController.editVillage)
commonRoute.get('/exportsheetlist-village', commonDataController.villageListforexport)
commonRoute.post('/upload-csv-for-village-list', uploadFileToLocalStorage, commonDataController.uploadCSVForVillageList)


//By Name & ParentId
commonRoute.get('/get-country-by-name', commonDataController.getCountryByItsName)
commonRoute.get('/get-region-by-name', commonDataController.getRegionByItsName)
commonRoute.get('/get-province-by-name', commonDataController.getProvinceByItsName)
commonRoute.get('/get-department-by-name', commonDataController.getDepartmentByItsName)
commonRoute.get('/get-city-by-name', commonDataController.getCityByItsName)
commonRoute.get('/get-village-by-name', commonDataController.getVillageByItsName)


// Designation
commonRoute.post('/add-designation', commonDataController.addDesignation_SuperAdmin)
commonRoute.get('/list-designation', commonDataController.allDesignationList)
commonRoute.put('/update-designation', commonDataController.updateDesignation)
commonRoute.post('/delete-designation', commonDataController.actionOnDesignation)
commonRoute.get('/exportsheetlist-designation', commonDataController.allDesignatonListforexport)
commonRoute.post('/upload-csv-for-designation-list', uploadFileToLocalStorage, commonDataController.uploadCSVForDesignation)
commonRoute.get('/getById-designation', commonDataController.designationById)

// Title
commonRoute.post('/add-title', commonDataController.addTitle_SuperAdmin)
commonRoute.get('/list-title', commonDataController.allTitleList)
commonRoute.put('/update-title', commonDataController.updateTitle)
commonRoute.post('/delete-title', commonDataController.actionOnTitle)
commonRoute.get('/exportsheetlist-title', commonDataController.allTitleListforexport)
commonRoute.post('/upload-csv-for-title-list', uploadFileToLocalStorage, commonDataController.uploadCSVForTitle)
commonRoute.get('/getById-title', commonDataController.TitleById)



// Language
commonRoute.post('/add-language', commonDataController.addLanguage_SuperAdmin)
commonRoute.get('/list-language', commonDataController.allLanguageList)
commonRoute.put('/update-language', commonDataController.updateLanguage)
commonRoute.post('/delete-language', commonDataController.actionOnLanguage)
commonRoute.get('/exportsheetlist-language', commonDataController.allLanguageListforexport)
commonRoute.post('/upload-csv-for-language-list', uploadFileToLocalStorage, commonDataController.uploadCSVForLanguage)

// Common list api's
commonRoute.get('/common-designationlist', commonDataController.commmonDesignationList)
commonRoute.get('/common-titlelist', commonDataController.commmonTitleList)
commonRoute.get('/common-language', commonDataController.commmonLanguageList)

commonRoute.post('/get-location-name', commonDataController.getLocationName)
export default commonRoute;