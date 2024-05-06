"use strict";

import mongoose from "mongoose";
import LocationInfo from '../../models/location_info';
import PortalUser from '../../models/portal_user';
import BasicInfo from '../../models/basic_info';
import PathologyTestInfoNew from '../../models/pathologyTestInfoNew';
import PortalAvailability from '../../models/availability';
import PortalFeeManagement from '../../models/fee_management';
import ReviewAndRating from '../../models/reviews';
import { sendResponse } from '../../helpers/transmission';
import { getDocument } from '../../helpers/s3';
import Http from "../../helpers/httpservice";
import { config, TimeZone } from "../../config/constants";
import moment from "moment"
import Appointment from "../../models/appointment";
import { formatDateAndTime, formatDateAndTimeNew } from "../../middleware/utils"
const httpService = new Http();

function filterBookedSlots(array1, array2) {
  array1.forEach((element, index) => {
    var xyz = array2.indexOf(element.slot)
    if (xyz != -1) {
      array1[index].status = 1
    }
  });
  return array1
}

const getPortalOpeningsHours = async (week_days) => {
  var Sunday = []
  var Monday = []
  var Tuesday = []
  var Wednesday = []
  var Thursday = []
  var Friday = []
  var Saturday = []
  if (week_days) {
    week_days.forEach((data) => {
      Sunday.push({
        "start_time": data.sun_start_time.slice(0, 2) + ":" + data.sun_start_time.slice(2, 4),
        "end_time": data.sun_end_time.slice(0, 2) + ":" + data.sun_end_time.slice(2, 4)
      })
      Monday.push({
        "start_time": data.mon_start_time.slice(0, 2) + ":" + data.mon_start_time.slice(2, 4),
        "end_time": data.mon_end_time.slice(0, 2) + ":" + data.mon_end_time.slice(2, 4)
      })
      Tuesday.push({
        "start_time": data.tue_start_time.slice(0, 2) + ":" + data.tue_start_time.slice(2, 4),
        "end_time": data.tue_end_time.slice(0, 2) + ":" + data.tue_end_time.slice(2, 4)
      })
      Wednesday.push({
        "start_time": data.wed_start_time.slice(0, 2) + ":" + data.wed_start_time.slice(2, 4),
        "end_time": data.wed_end_time.slice(0, 2) + ":" + data.wed_end_time.slice(2, 4)
      })
      Thursday.push({
        "start_time": data.thu_start_time.slice(0, 2) + ":" + data.thu_start_time.slice(2, 4),
        "end_time": data.thu_end_time.slice(0, 2) + ":" + data.thu_end_time.slice(2, 4)
      })
      Friday.push({
        "start_time": data.fri_start_time.slice(0, 2) + ":" + data.fri_start_time.slice(2, 4),
        "end_time": data.fri_end_time.slice(0, 2) + ":" + data.fri_end_time.slice(2, 4)
      })
      Saturday.push({
        "start_time": data.sat_start_time.slice(0, 2) + ":" + data.sat_start_time.slice(2, 4),
        "end_time": data.sat_end_time.slice(0, 2) + ":" + data.sat_end_time.slice(2, 4)
      })
    })
  }
  return {
    Sunday,
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday
  }
}

function filterBookedSlotsToday(array1) {

  array1.forEach((element, index) => {
    var xyz = element.slot.split("-")[0].split(":")[0] + element.slot.split("-")[0].split(":")[1]

    const date = new Date();
    date.setHours(date.getHours() + TimeZone.hours, date.getMinutes() + TimeZone.minute);
    var hm = date.getHours().toString() + date.getMinutes().toString()
    // console.log(TimeZone.hours,'TimeZone.hours');
    // console.log(hm,"dshfjghsdgfk",xyz,new Date().getHours().toString(),new Date().getMinutes().toString());
    if (parseInt(hm) > parseInt(xyz)) {
      array1[index].status = 1
    }
  });

  return array1
}

export const updateSlotAvailability = async (hospitalId, notificationReceiver, timeStamp, req,portal_type) => {


  var timeStampString
  var slot = null

  const headers = {
    'Authorization': req.headers['authorization']
  }
  for (let index = 0; index < 3; index++) {
    const resData = await httpService.postStaging('labimagingdentaloptical/four-portal-management-available-slots',
      {
        locationId: hospitalId,
        portal_id: notificationReceiver,
        appointmentType: 'ONLINE',
        timeStamp: timeStamp,
        portal_type:portal_type
      }, headers, 'labimagingdentalopticalServiceUrl');

    // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
    // timeStamp = new Date(timeStampString)
    const slots = resData?.body?.allGeneralSlot

    //console.log("SLOTSssssssss_______", slots)
    let isBreak = false
    if (slots) {
      for (let index = 0; index < slots.length; index++) {
        const element = slots[index];
        if (element.status == 0) {
          slot = element
          isBreak = true
          break
        }
      }
    }

    if (slot != null) {
      isBreak = true
      break
    }

    if (!isBreak) {
      //console.log("isBreakkk_______");
      timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
      timeStamp = new Date(timeStampString)
    }
  }

  if (slot != null) {
    const basicInfo = await BasicInfo.findOneAndUpdate(
      { for_portal_user: { $eq: notificationReceiver } },
      {
        $set: {
          nextAvailableSlot: slot.slot,
          nextAvailableDate: timeStamp
        },
      },

      { upsert: false, new: true }
    ).exec();
    // update data in basic info
  }
}

class advFiltersLabImagingDentalOptical {


  async advanceFourPortalFilters(req, res) {

    try {
      const {
          long,
          lat,
        searchText,
        province,
        department,
        city,
        neighborhood,
        insuranceAccepted,
        consultationFeeSort,
        ratingSort,
        portalYearOfExperienceSort,
        portalGender,
        spokenLanguage,
        appointmentType,
        onDutyPortal,
        openNow,
        portalAvailability,
        consultationFeeStart,
        consultationFeeEnd,
        currentTimeStamp,
        page,
        limit,
        type
      } = req.body;

      const headers = {
        'Authorization': req.headers['authorization']
      }
      // console.log("page===", req.body,);

      var maxDistance = req.body.maxDistance
      // console.log(maxDistance, "maxDistance")
      if (maxDistance == undefined || maxDistance == 0) {
        maxDistance = 5
      }

      let formattedTimestamp = new Date();

      let timeZone = config.TIMEZONE; // Change this to the appropriate time zone
      //console.log(timeZone, "timeZoneeeeeee____");
      let current_timestamp1 = formattedTimestamp.toLocaleString('en-US', { timeZone: timeZone });
      let current_timestamp = new Date(current_timestamp1);
      //console.log(current_timestamp, "current_timestamppp_________");

      let current_timestamp_UTC = new Date();

      var day = current_timestamp.getDay()
      //console.log(day, "dayyyyyyyyy____");
      var hour = current_timestamp.getHours().toString()
      var minute = current_timestamp.getMinutes().toString()
      if (hour.toString().length == 1) {
        hour = "0" + hour;
      }
      if (minute.toString().length == 1) {
        minute = "0" + minute;
      }
      const hourAndMin = hour + minute
      //console.log(hourAndMin, "hourAndMin_____");


      // console.log(type, "typeeeeee__________");

      var searchText_filter = [{}]
      var province_filter = {}
      var department_filter = {}
      var city_filter = {}
      var neighborhood_filter = {}
      var insuranceAccepted_filter = {}
      var portalGender_filter = {}
      var spokenLanguage_filter = {}
      var appointmentType_filter = {}

      var geoNear_filter = {}
      var consultationFeeFilter_filter = {}
      var portalAvailability_filter = {}
      var onDutyPortal_filter = {}
      var openNow_filter = {}

      if (long != "" && lat != "") {
        geoNear_filter = {
          $geoNear:
          {
            near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
            distanceField: "distance",
            minDistance: 0, //0 KM
            maxDistance: maxDistance * 1000,
            includeLocs: "locations",
            spherical: true,
            distanceMultiplier: 0.001
          }
        }
      } else {
        geoNear_filter = {
          $geoNear:
          {
            near: { type: "Point", coordinates: [0, 0] },
            distanceField: "distance",
            //  minDistance: 0, //0 KM
            //  maxDistance: 500, //5 KM         
            includeLocs: "loc",
            spherical: true,
            distanceMultiplier: 0.001
          }
        }
      }

      if (searchText != "") {
        searchText_filter = [
          { locations: {
            $elemMatch: {
              hospital_name: {
                $regex: searchText,
                $options: "i"
              }
            }
          }},
          { portal_full_name: { $regex: searchText || '', $options: "i" } },
          { pathologyTestsName: { $regex: searchText || '', $options: "i" } },
          {
            speciality_name: {
              $regex: searchText.split('').map(letter => `${letter}.*`).join(''),
              $options: "i"
            }
          } 
          //{ speciality: { $regex: searchText || '', $options: "i" } },
        ]
      }
      console.log("searchText_filter________",searchText_filter)
      if (province != "") {
        province_filter = {
          province: mongoose.Types.ObjectId(province)
        }
      }

      if (department != "") {
        department_filter = {
          department: mongoose.Types.ObjectId(department),
        }
      }

      if (city != "") {
        city_filter = {
          city: mongoose.Types.ObjectId(city)
        }
      }

      if (neighborhood != "") {
        neighborhood_filter = {
          neighborhood: { $regex: neighborhood || '', $options: "i" }
        }
      }

      if (insuranceAccepted.length > 0) {
        console.log(insuranceAccepted, "insuranceAccepteddd__");
        insuranceAccepted_filter = {
          ['portals.insurance_accepted']: { $in: [insuranceAccepted] }
        }
      }

      if (portalAvailability) {
        let dateArray = []
        let unavailability_day_array = []
        const cdate = new Date()
        if (portalAvailability == 'TODAY') {
          const tdate = formatDateAndTimeNew(cdate)
          dateArray.push(tdate.split(' ')[0])
          //console.log(dateArray,"dateArray11111");
        } else if (portalAvailability == 'TOMORROW') {
          cdate.setDate(cdate.getDate() + 1)
          const tomorrowDate = formatDateAndTime(cdate)
          dateArray.push(tomorrowDate.split(' ')[0])
        }
        else if (portalAvailability == 'NEXT7DAYS') {
          for (let index = 1; index <= 7; index++) {
            const cudate = new Date()
            cudate.setDate(cudate.getDate() + index)
            const nextDate = formatDateAndTime(cudate)
            dateArray.push(nextDate.split(' ')[0])
          }
        } else {
          const anyDate = formatDateAndTime(new Date(portalAvailability))
          dateArray.push(anyDate.split(' ')[0])
          console.log(dateArray, "dateArray2222");
        }
        const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        console.log(dateArray, "dateArrayyy_____",);

        for (const sdate of dateArray) {
          const gdate = new Date(sdate)
          unavailability_day_array.push(day[gdate.getDay()])
        }
        //console.log(dateArray, 'dateArray');
        //console.log(unavailability_day_array, 'unavailability_day_array___');
        portalAvailability_filter = {
          ['portals.unavailability_date_array']: { $nin: dateArray },
          ['portals.unavailability_day_array']: { $nin: unavailability_day_array }
        }
      }

      let allSort
      if (!consultationFeeSort && !ratingSort && !portalYearOfExperienceSort) {
        allSort = { distance: 1 }
      } else {
        allSort = {}
      }
      if (consultationFeeSort) {
        allSort.doctorOnlineBasicFee = consultationFeeSort == "LOW_TO_HIGH" ? 1 : -1
      }
      if (ratingSort) {
        allSort.rating = ratingSort == "LOW_TO_HIGH" ? 1 : -1
      }
      if (portalYearOfExperienceSort) {
        console.log(portalYearOfExperienceSort, "doctorYearOfExperienceSortttt____");
        allSort.portalYearOfExperience = portalYearOfExperienceSort == "LOW_TO_HIGH" ? 1 : -1
      }

      if (portalGender.length > 0) {
        if (portalGender.length === 1) {
          portalGender_filter = {
            'portals.gender': portalGender[0]
          };
        } else {
          portalGender_filter = {};
        }
      }

      if (spokenLanguage) {
        spokenLanguage_filter = {
          ['portals.spoken_language']: spokenLanguage
        }
      }

      if (consultationFeeStart >= 0 && consultationFeeEnd) {
        //console.log(consultationFeeStart,"consultationFeeStart___",consultationFeeEnd);

        consultationFeeFilter_filter = {
          ['feemanagements.online.basic_fee']: {
            $gte: consultationFeeStart == 0 ? 1 : parseFloat(consultationFeeStart),
            $lte: parseFloat(consultationFeeEnd)
          }
        }
      }

      if (appointmentType.length > 0) {
        console.log(appointmentType, "appointmentTypeeee_____");
        appointmentType_filter = {
          ['portals.accepted_appointment']: { $in: appointmentType }
        }
      }

      if (onDutyPortal.toString() != "") {
        if (onDutyPortal.toString() == "true") {
          onDutyPortal_filter = {
            $or: [
              { unavailability_slot_status1: true },
              { availability_slot_status1: true },
              { week_days_status1: true }
            ]
          }
        } else {
          onDutyPortal_filter = {
            unavailability_slot_status1: { $size: 0 },
            availability_slot_status1: { $size: 0 },
            week_days_status1: { $size: 0 },
          }
        }
      }

      if (openNow.toString() != "") {
        if (openNow.toString() == "true") {
          openNow_filter = {
            $or: [
              { week_days_status1: true }
            ]
          }
        } else {
          openNow_filter = {
            week_days_status1: { $size: 0 },
          }
        }
      }



      if (day == 0) {

        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.sun_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.sun_start_time", hourAndMin] },
                { $gt: ["$week_days.sun_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 1) {

        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.mon_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.mon_start_time", hourAndMin] },
                { $gt: ["$week_days.mon_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 2) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.tue_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.tue_start_time", hourAndMin] },
                { $gt: ["$week_days.tue_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 3) {
        console.log(hourAndMin, "hourAndMinnn___________");
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.wed_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.wed_start_time", hourAndMin] },
                { $gt: ["$week_days.wed_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
        //console.log(day_filter, "day_filter_Wed_____");

      }
      if (day == 4) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.thu_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.thu_start_time", hourAndMin] },
                { $gt: ["$week_days.thu_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }
      if (day == 5) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.fri_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.fri_start_time", hourAndMin] },
                { $gt: ["$week_days.fri_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }

      }
      if (day == 6) {
        var day_filter =
        {
          $cond: {
            if: { $ne: ["$week_days.sat_start_time", "0000"] }, // Check if date is not empty
            then: {
              $and: [
                { $lte: ["$week_days.sat_start_time", hourAndMin] },
                { $gt: ["$week_days.sat_end_time", hourAndMin] }
              ]
            },
            else: false // Set isSlotWithinTimestamp to false for empty dates
          }
        }
      }


      /*   let formattedTimestamp = new Date();
   
         let timeZone = config.TIMEZONE; // Change this to the appropriate time zone
         //console.log(timeZone, "timeZoneeeeeee____");
         let current_timestamp1 = formattedTimestamp.toLocaleString('en-US', { timeZone: timeZone });
         let current_timestamp = new Date(current_timestamp1);
         //console.log(current_timestamp, "current_timestamppp_________");
   
         let current_timestamp_UTC = new Date();
   
         var day = current_timestamp.getDay()
         //console.log(day, "dayyyyyyyyy____");
         var hour = current_timestamp.getHours().toString()
         var minute = current_timestamp.getMinutes().toString()
         if (hour.toString().length == 1) {
           hour = "0" + hour;
         }
         if (minute.toString().length == 1) {
           minute = "0" + minute;
         }
         const hourAndMin = hour + minute
         //console.log(hourAndMin, "hourAndMin_____");
   
         if (long != "" && lat != "") {
           geoNear_filter = {
             $geoNear:
             {
               near: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
               distanceField: "distance",
               //  minDistance: 0, //0 KM
               //  maxDistance: 500, //5 KM         
               includeLocs: "loc",
               spherical: true,
               distanceMultiplier: 0.001
             }
           }
         } else {
           geoNear_filter = {
             $geoNear:
             {
               near: { type: "Point", coordinates: [0, 0] },
               distanceField: "distance",
               //  minDistance: 0, //0 KM
               //  maxDistance: 500, //5 KM         
               includeLocs: "loc",
               spherical: true,
               distanceMultiplier: 0.001
             }
           }
         }
         if (consultationFeeStart >= 0 && consultationFeeEnd) {
           //console.log(consultationFeeStart,"consultationFeeStart___",consultationFeeEnd);
   
           consultationFeeFilter_filter = {
             ['feemanagements.online.basic_fee']: {
               $gte: consultationFeeStart == 0 ? 1 : parseFloat(consultationFeeStart),
               $lte: parseFloat(consultationFeeEnd)
             }
           }
         }
   
         if (appointmentType.length > 0) {
           appointmentType_filter = {
             ['doctors.accepted_appointment']: { $in: appointmentType }
           }
         }
         //const resData1 = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: data.portal_user_data.mobile }, {}, 'insuranceServiceUrl');
   
         //console.log(onDutyDoctor, "onDutyDoctor_______");
   
         if (onDutyDoctor.toString() != "") {
           if (onDutyDoctor.toString() == "true") {
             onDutyDoctor_filter = {
               $or: [
                 { unavailability_slot_status1: true },
                 { availability_slot_status1: true },
                 { week_days_status1: true }
               ]
             }
           } else {
             onDutyDoctor_filter = {
               unavailability_slot_status1: { $size: 0 },
               availability_slot_status1: { $size: 0 },
               week_days_status1: { $size: 0 },
             }
           }
         }
         //console.log(onDutyDoctor_filter, "onDutyDoctor_filter____");
   
         if (openNow.toString() != "") {
           if (openNow.toString() == "true") {
             openNow_filter = {
               $or: [
                 { week_days_status1: true }
               ]
             }
           } else {
             openNow_filter = {
               week_days_status1: { $size: 0 },
             }
           }
         }
   
         
         // All Sorting Filters
         let allSort
         if (!consultationFeeSort && !ratingSort && !doctorYearOfExperienceSort) {
           allSort = { distance: 1 }
         } else {
           allSort = {}
         }
         if (consultationFeeSort) {
           allSort.doctorOnlineBasicFee = consultationFeeSort == "LOW_TO_HIGH" ? 1 : -1
         }
         if (ratingSort) {
           allSort.rating = ratingSort == "LOW_TO_HIGH" ? 1 : -1
         }
         if (doctorYearOfExperienceSort) {
           console.log(doctorYearOfExperienceSort, "doctorYearOfExperienceSortttt____");
           allSort.doctorYearOfExperience = doctorYearOfExperienceSort == "LOW_TO_HIGH" ? 1 : -1
         } 
   
   
   
         console.log(insuranceAccepted_filter, 'insuranceAccepted_filter'); */
         let query = {};

         if (type === '') {
           query = {
             type: { $in: ['Dental', 'Optical', 'Laboratory-Imaging', 'Paramedical-Professions'] }
           };
         } else {
           query = { type };
         }
         
      const result = await LocationInfo.aggregate([
        geoNear_filter,
        {
          $match: query,
        },
        {
          $lookup: {
            from: "basicinfos",
            localField: "_id",
            foreignField: "in_location",
            as: "portals",
          }
        },
        { $unwind: { path: "$portals", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "availabilities",
            localField: "portals.in_availability",
            foreignField: "_id",
            as: "portals.onduty"
          }
        },
        {
          $unwind: "$portals.onduty"
        },
        {
          $addFields: {
            availability_slot: "$portals.onduty.availability_slot",
            unavailability_slot: "$portals.onduty.unavailability_slot",
            week_days: "$portals.onduty.week_days"
          }
        },
        { $unwind: "$unavailability_slot" },
        { $unwind: "$availability_slot" },
        { $unwind: "$week_days" },
        {
          $addFields: {
            unavailability_slot_status: {
              $cond: {
                if: { $ne: ["$unavailability_slot.date", ""] }, // Check if date is not empty
                then: {
                  $eq: [
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $toDate: "$$NOW" }
                      }
                    },
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $dateFromString: { dateString: "$unavailability_slot.date" } }
                      }
                    }
                  ]
                },
                else: false // Set isSlotWithinTimestamp to false for empty dates
              }
            }
          }
        },
        {
          $addFields: {
            availability_slot_status: {
              $cond: {
                if: { $ne: ["$availability_slot.date", ""] }, // Check if date is not empty
                then: {
                  $eq: [
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $toDate: "$$NOW" }
                      }
                    },
                    {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $dateFromString: { dateString: "$availability_slot.date" } }
                      }
                    }
                  ]
                },
                else: false // Set isSlotWithinTimestamp to false for empty dates
              }
            }
          }
        },
        {
          $addFields: {
            week_days_status: day_filter
          }
        },

        {
          $lookup: {
            from: "pathologytestinfonews",
            let: { userId: "$portals.for_portal_user" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$for_portal_user", "$$userId"]
                  }
                }
              }
            ],
            as: "pathologyTests"
          }
        },

        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "portal_user",
          }
        },
        { $unwind: { path: "$portal_user", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            portal_full_name: "$portals.full_name",

            pathologyTestsName: { $ifNull: ["$pathologyTests.nameOfTest", ""] },

            doctor_verify_status: "$portals.verify_status",
            speciality: "$portals.speciality",
            speciality_name: "$portals.speciality_name",
            portalYearOfExperience: "$portals.years_of_experience",
            nextAvailableSlot: "$portals.nextAvailableSlot",
            nextAvailableDate: "$portals.nextAvailableDate",
            is_deleted: "$portal_user.isDeleted",
            is_active: "$portal_user.isActive",
            is_lock: "$portal_user.lock_user",
            average_rating: "$portal_user.average_rating",
            portal_type:"$portal_user.type"

          }
        },

        {
          $match: {
            doctor_verify_status: "APPROVED",
            is_deleted: false,
            is_active: true,
            is_lock: false
          }
        },
        {
          $lookup: {
            from: "documentinfos",
            localField: "portals.profile_picture",
            foreignField: "_id",
            as: "documentinfos",
          }
        },
        { $unwind: { path: "$documentinfos", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            portalProfilePic: { $ifNull: ["$documentinfos.url", "NA"] }
          }
        },
        {
          $lookup: {
            from: "feemanagements",
            localField: "portals.in_fee_management",
            foreignField: "_id",
            as: "feemanagements",
          }
        },
        { $unwind: { path: "$feemanagements", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            doctorOnlineBasicFee: "$feemanagements.online.basic_fee",
            doctorHomeVisitBasicFee: "$feemanagements.home_visit.basic_fee",
            doctorHomeVisitTravelFee: "$feemanagements.home_visit.travel_fee",
            doctorF2FBasicFee: "$feemanagements.f2f.basic_fee",
          }
        },
        {
          $lookup: {
            from: "hospitallocations",
            localField: "portals.in_hospital_location",
            foreignField: "_id",
            as: "hospitallocations",
          }
        },
        { $unwind: { path: "$hospitallocations", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            hospital_or_clinic_location: "$hospitallocations.hospital_or_clinic_location",
          }
        },
        { $unwind: { path: "$hospital_or_clinic_location", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            "hospital_or_clinic_location.status": "APPROVED",
          }
        },
        {
          $match: {
            $and: [
              city_filter,
              neighborhood_filter,
              insuranceAccepted_filter,
              province_filter,
              department_filter,
              consultationFeeFilter_filter,
              appointmentType_filter,
              portalGender_filter,
              spokenLanguage_filter,
              portalAvailability_filter,
            ],
            // $or: searchText_filter
          }
        },

        {
          $group: {
            _id: "$portals.for_portal_user",
            portal_type :{ $addToSet: "$portal_type" },
            portal_full_name: { $addToSet: "$portal_full_name" },
            pathologyTestsName: { $addToSet: "$pathologyTestsName" },

            speciality: { $addToSet: "$speciality" },
            speciality_name: { $addToSet: "$speciality_name" },
            locations: { $addToSet: "$hospital_or_clinic_location" },
            portalYearOfExperience: { $addToSet: "$portalYearOfExperience" },

            unavailability_slot_status: { $addToSet: "$unavailability_slot_status" },
            availability_slot_status: { $addToSet: "$availability_slot_status" },
            week_days_status: { $addToSet: "$week_days_status" },

            availability_slot: { $addToSet: "$portals.onduty.availability_slot" },
            unavailability_slot: { $addToSet: "$portals.onduty.unavailability_slot" },
            week_days: { $addToSet: "$portals.onduty.week_days" },
            rating: { $addToSet: "$average_rating" },
            portalProfilePic: { $addToSet: "$portalProfilePic" },

            doctorOnlineBasicFee: { $addToSet: "$doctorOnlineBasicFee" },
            doctorHomeVisitBasicFee: { $addToSet: "$doctorHomeVisitBasicFee" },
            doctorHomeVisitTravelFee: { $addToSet: "$doctorHomeVisitTravelFee" },
            doctorF2FBasicFee: { $addToSet: "$doctorF2FBasicFee" },
            nextAvailableSlot: { $addToSet: "$nextAvailableSlot" },
            nextAvailableDate: { $addToSet: "$nextAvailableDate" },
            distance: { $addToSet: "$distance" },
            medicine_request: { $addToSet: "$portals.medicine_request" },
            appointment_accepted: { $addToSet: "$portals.appointment_accepted" },
            /*  doctorSpecialty: { $addToSet: "$doctors.speciality.specilization" }, */
            /*  //onDutyDoctor1: { $addToSet: "$onDutyDoctor" },
              
              // hospitalName: { $addToSet: "$hospital_name" },
              // address: { $addToSet: "$address" },
              distance: { $addToSet: "$distance" },
              // rating: { $addToSet: "4.5" },
              // reviews: { $addToSet: "$numberOfReviews" },
              // onDutyStatus: { $addToSet: true },
              // nextAppointmentAvailable: { $addToSet: "2023-01-24T08:27:51.857Z" }, */
          }
        },
        { $addFields: { unavailability_slot_status1: { $filter: { input: "$unavailability_slot_status", as: "item", cond: { $eq: ["$$item", true] } } } } },
        { $addFields: { availability_slot_status1: { $filter: { input: "$availability_slot_status", as: "item", cond: { $eq: ["$$item", true] } } } } },
        { $addFields: { week_days_status1: { $filter: { input: "$week_days_status", as: "item", cond: { $eq: ["$$item", true] } } } } },
        { $unwind: "$portal_type" },

        { $unwind: "$portal_full_name" },
        { $unwind: "$speciality" },
        { $unwind: "$speciality_name" },
        { $unwind: "$portalYearOfExperience" },
        { $unwind: "$rating" },

        { $unwind: "$pathologyTestsName" },
        { $unwind: "$portalProfilePic" },

        { $unwind: "$doctorOnlineBasicFee" },
        { $unwind: "$doctorHomeVisitBasicFee" },
        { $unwind: "$doctorHomeVisitTravelFee" },
        { $unwind: "$doctorF2FBasicFee" },
        { $unwind: "$nextAvailableSlot" },
        { $unwind: "$nextAvailableDate" },
        { $unwind: "$distance" },
        { $unwind: "$appointment_accepted"},
        { $unwind: "$medicine_request"},

        /* 
         // { $unwind: "$hospitalName" },
         // { $unwind: "$address" },
         { $unwind: "$distance" },
         // { $unwind: "$reviews" },
         // { $unwind: "$onDutyStatus" },
         
          */

        {
          $match: {
            $and: [onDutyPortal_filter, openNow_filter],
            $or: searchText_filter
          }
        },
        { $sort: allSort },
        {
          $facet: {
            totalCount: [
              {
                $count: 'count'
              }
            ],
            paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }],
          }
        },
      ]);

      console.log(result[0].paginatedResults, "resultttt_______________", result.length);

      
      for (let index = 0; index < result[0].paginatedResults.length; index++) {
        const profilePicKey = result[0].paginatedResults[index].portalProfilePic;
        const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: result[0].paginatedResults[index]._id } }).countDocuments()
        //console.log(result[0].paginatedResults[index], 'paginatedResults[index]____');
        // console.log(result[0].paginatedResults[index].portalProfilePic, "imagesssss______");
        result[0].paginatedResults[index].portalProfilePic = ""

        result[0].paginatedResults[index].reviews = getRatingCount
        //result[0].paginatedResults[index].onDutyToday = true

        // const speciality = await httpService.getStaging('hospital/get-speciality-data', { data: result[0].paginatedResults[index].speciality }, headers, 'hospitalServiceUrl')
        // const specializations = speciality.data.map(item => item.specilization);
        // result[0].paginatedResults[index].speciality = specializations;

        //result[0].paginatedResults[index].nextAvailableDate = "January 1, 2023"

        if (profilePicKey !== 'NA') {
          result[0].paginatedResults[index].portalProfilePic = await getDocument(profilePicKey)
        }
        // console.log(searchText,"specializations_____",specializations)
        // if(searchText){
        //   let isFound = specializations.some(item => item.includes(searchText));
        //   console.log("isFound________",isFound)
        //   if(isFound){
        //     allResult.push(result[0].paginatedResults[index])
        //   }
        // }else{
        //   allResult.push(result[0].paginatedResults[index]);
        // }
        let hospital = result[0].paginatedResults[index].locations;
        var timeStamp = new Date()
        let hospitalId = hospital[result[0].paginatedResults[index].locations.length - 1].hospital_id;
        let for_portal_user = result[0].paginatedResults[index]._id;
        var portal_type=result[0].paginatedResults[index].portal_type;
        console.log(hospitalId, "hospitalIddd______");
        await updateSlotAvailability(hospitalId, for_portal_user, timeStamp, req,portal_type);
      }

      let totalCount = 0
      if (result[0].totalCount.length > 0) {
        totalCount = result[0].totalCount[0].count
      }

      /*
      let totalDocsList = result[0].paginatedResults;
      //console.log(totalDocsList,"totalDocsListttttt_______");
 
      for (let i = 0; i < totalDocsList.length; i++) {
        //console.log(totalDocsList[0].locations,"paginatedResultsss_______");
        let hospital = totalDocsList[i].locations;
        var timeStamp = new Date()
        let hospitalId = hospital[totalDocsList[i].locations.length - 1].hospital_id;
        let for_portal_user = totalDocsList[i]._id;
        console.log(hospitalId, "hospitalIddd______");
        await updateSlotAvailability(hospitalId, for_portal_user, timeStamp, req);
      } */


      sendResponse(req, res, 200, {
        status: true,
        data: {
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          totalRecords: totalCount,
          result: result[0].paginatedResults,
        },
        message: `Successfully get doctor list`,
        errorCode: null,
      });

    } catch (error) {
      console.log(error, "error______");
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: error.message ? error.message : `Failed to get doctor list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async viewFourPortalDetailsForPatient(req, res) {
    try {
      const { portal_id } = req.query

      const headers = {
        'Authorization': req.headers['authorization']
      }

      const pathology_tests = await PathologyTestInfoNew.find({ for_portal_user: portal_id })

      const getRole = await PortalUser.findById(portal_id).select('role')
      const filter = {
        for_portal_user: mongoose.Types.ObjectId(portal_id),
        'for_portal_user_d.isDeleted': false,
        'for_portal_user_d.lock_user': false,
        'for_portal_user_d.isActive': true
      }
      const project = {
        full_name: 1,
        years_of_experience: 1,
        profile_picture: "$profile_picture.url",
        fee_management: {
          online: "$in_fee_management.online",
          home_visit: "$in_fee_management.home_visit",
          f2f: "$in_fee_management.f2f",
        },
        about: 1,
        portal_user_data: {
          mobile: "$for_portal_user_d.mobile",
          email: "$for_portal_user_d.email",
          country_code: "$for_portal_user_d.country_code",
        },
        address: "$in_location.address",
        loc: '$in_location.loc',
        education_details: "$in_education.education_details",
        services: "$services.service",
        speciality: 1,
        in_availability: 1,
        nextAvailableDate: 1,
        nextAvailableSlot: 1,
        hospital_location: "$in_hospital_location.hospital_or_clinic_location",
      }
      if (getRole.role === 'INDIVIDUAL') delete project.services;
      let aggregate = [
        {
          $lookup: {
            from: 'portalusers',
            localField: 'for_portal_user',
            foreignField: '_id',
            as: 'for_portal_user_d'
          }
        },
        { $unwind: { path: "$for_portal_user_d", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'documentinfos',
            localField: 'profile_picture',
            foreignField: '_id',
            as: 'profile_picture'
          }
        },
        { $unwind: { path: "$profile_picture", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'feemanagements',
            localField: 'in_fee_management',
            foreignField: '_id',
            as: 'in_fee_management'
          }
        },
        { $unwind: { path: "$in_fee_management", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'locationinfos',
            localField: 'in_location',
            foreignField: '_id',
            as: 'in_location'
          }
        },
        { $unwind: { path: "$in_location", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'educationaldetails',
            localField: 'in_education',
            foreignField: '_id',
            as: 'in_education'
          }
        },
        { $unwind: { path: "$in_education", preserveNullAndEmptyArrays: true } },
        /* {
            $lookup: {
                from: 'specialties',
                localField: 'speciality',
                foreignField: '_id',
                as: 'speciality'
            }
        },
        { $unwind: { path: "$speciality", preserveNullAndEmptyArrays: true } }, */
        {
          $lookup: {
            from: 'hospitallocations',
            localField: 'in_hospital_location',
            foreignField: '_id',
            as: 'in_hospital_location'
          }
        },
        { $unwind: { path: "$in_hospital_location", preserveNullAndEmptyArrays: true } },
      ]
      if (getRole.role === 'HOSPITAL') {
        aggregate.push({
          $lookup: {
            from: 'services',
            localField: 'services',
            foreignField: '_id',
            as: 'services'
          }
        },
          { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },)
      }
      aggregate.push({ $match: filter }, { $project: project })
      let resultData = await BasicInfo.aggregate(aggregate)
      /* console.log(resultData, "resultData_________");
      console.log(resultData[0].speciality, "_iddddddddddd___"); */

      let data = {}


      if (resultData[0].speciality) {
        console.log("insideeee_______");
        const speciality = await httpService.getStaging('hospital/get-speciality-data', { data: resultData[0].speciality }, headers, 'hospitalServiceUrl')
        data.specialityName = speciality.data[0].specilization
        data.speciality_id = speciality.data[0]._id
        console.log(speciality, "specialityyyyyy_____", speciality.data[0].specilization);
      }


      for (const key in resultData[0]) {
        data[key] = resultData[0][key]
      }
      if (resultData[0].profile_picture) {
        data.profile_picture = await getDocument(resultData[0].profile_picture)
      }
      let availabilityObjectIDArray = []
      for (const id of data.in_availability) {
        availabilityObjectIDArray.push(mongoose.Types.ObjectId(id))
      }
      let availResult = await PortalAvailability.find({ _id: { $in: availabilityObjectIDArray } })
      data.in_availability = availResult

      data.nextAppointmentAvailable = resultData[0].nextAvailableDate;
      data.nextAvailableSlot = resultData[0].nextAvailableSlot;
      data.onDutyToday = true
      data.portal_id = portal_id

      const portalUser = await PortalUser.findById(portal_id).select('average_rating')
      const getRatingCount = await ReviewAndRating.find({ portal_user_id: { $eq: portal_id } }).countDocuments()
      const doctor_rating = {
        average_rating: portalUser.average_rating,
        total_review: getRatingCount
      }
      //Get Accepted Insurance company
      //const resData1 = await httpService.getStaging('insurance/accepted-insurance-companies', { mobile: data.portal_user_data.mobile }, {}, 'insuranceServiceUrl');


      const resData1 = await httpService.getStaging('labimagingdentaloptical/getInsuranceAcceptedListForFourPortal', { portal_id: data.portal_id }, {}, 'labimagingdentalopticalServiceUrl');

      console.log(resData1, "resData1aaaa______");

      //Get Opening hours
      let hospital_location = []
      for (const location of data.hospital_location) {
        if (location.status == 'APPROVED') {
          if (location.hospital_id) {
            const getWeekDaysValue = await PortalAvailability.find({ location_id: location.hospital_id, for_portal_user: { $eq: portal_id } }).select({ week_days: 1, appointment_type: 1 })
            let openingHoursObject = {}
            for (const week_days_value of getWeekDaysValue) {
              const getData = await getPortalOpeningsHours(week_days_value.week_days)
              openingHoursObject[week_days_value.appointment_type] = getData
            }
            location.openingHours = openingHoursObject
          } else {
            let openingHoursObject = {
              "ONLINE": await getPortalOpeningsHours([]),
              "HOME_VISIT": await getPortalOpeningsHours([]),
              "FACE_TO_FACE": await getPortalOpeningsHours([])
            }
            location.openingHours = openingHoursObject
          }
          hospital_location.push(location)
        }
      }
      data.hospital_location = hospital_location
      sendResponse(req, res, 200, {
        status: true,
        //body: { data, doctor_rating, accepted_insurance_company: resData1.body,pathology_tests },
        body: { data, doctor_rating, accepted_insurance_company: resData1.body, pathology_tests },
        message: `doctor details`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrr_________");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `failed to fetched hospital doctor details`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portalAvailableSlot(req, res) {
    try {
      const {
        locationId,
        appointmentType,
        timeStamp,
        portal_id,
        portal_type
      } = req.body

      console.log("req.body====", req.body);
      const current_timestamp = new Date(timeStamp)
      const onlyDate = timeStamp.split("T")[0]
      var day = current_timestamp.getDay()
      var hour = current_timestamp.getHours().toString()
      var minute = current_timestamp.getMinutes().toString()
      if (hour.toString().length == 1) {
        hour = "0" + hour;
      }
      if (minute.toString().length == 1) {
        minute = "0" + minute;
      }
      const hourAndMin = hour + minute
      var startTime
      var startTimeH
      var startTimeM
      var startTimeHM
      var endTime
      var endTimeH
      var endTimeM
      var endTimeHM
      var currentTimeH
      var currentTimeM
      var currentTimeHM

      var allGeneralSlot = []
      var allGeneralSlot2 = []
      var afterUnavailable = []
      var x = ""
      const result = await PortalAvailability.findOne({ for_portal_user: portal_id, location_id: locationId, appointment_type: appointmentType, type: portal_type })
      console.log("result====", result);
      const allFee = await PortalFeeManagement.findOne({ for_portal_user: portal_id, location_id: locationId, type: portal_type })
      console.log("allFee====", allFee);

      var fee
      if (appointmentType == "ONLINE") {
        fee = allFee?.online.basic_fee
      }
      if (appointmentType == "FACE_TO_FACE") {
        fee = allFee?.f2f.basic_fee
      }
      if (appointmentType == "HOME_VISIT") {
        fee = allFee?.home_visit.basic_fee + allFee?.home_visit.travel_fee
      }
      if (!result) {
        return sendResponse(req, res, 200, {
          status: true,
          body: {
            allGeneralSlot,
            fee
          },
          message: `No Slots Available For This Location`,
          errorCode: null,
        });
      }
      const doctorAvailability = result.availability_slot
      var availabilityArray = []
      var availabilitySlot = []
      for (let index = 0; index < doctorAvailability.length; index++) {
        const element = doctorAvailability[index];
        const availabilityDate = element.date.split("T")[0]
        const d1 = new Date(onlyDate)
        const d2 = new Date(availabilityDate)
        if (d1.getTime() === d2.getTime()) {
          if (element.start_time != '0000' && element.end_time != '0000') {
            availabilityArray.push({
              startTime: element.start_time,
              endTime: element.end_time
            })
          }

        }
      }


      if (availabilityArray.length > 0) {
        availabilityArray.forEach((element, index) => {
          var totalH = 0
          var totalM = 0
          startTimeH = element.startTime.slice(0, 2)
          startTimeM = element.startTime.slice(2)
          startTimeHM = startTimeH + ":" + startTimeM
          endTimeH = element.endTime.slice(0, 2)
          endTimeM = element.endTime.slice(2)
          endTimeHM = endTimeH + ":" + endTimeM
          let valueStart = moment.duration(startTimeHM, "HH:mm");
          let valueStop = moment.duration(endTimeHM, "HH:mm");
          let difference = valueStop.subtract(valueStart);
          totalH = totalH + difference.hours()
          totalM = totalM + difference.minutes()
          totalH = totalH + totalM / 60
          var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
          startTime = element.startTime
          startTimeH = startTime.slice(0, 2)
          startTimeM = startTime.slice(2)
          startTimeHM = startTimeH + ":" + startTimeM
          var piece = startTimeHM
          var piece = startTimeHM.split(':')
          var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
          var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
          if (nextStartTimeH.toString().length == 1) {
            nextStartTimeH = "0" + startTimeH;
          }
          var nextStartTimeM = (mins % 60)
          if (nextStartTimeM.toString().length == 1) {
            nextStartTimeM = nextStartTimeM + "0";
          }
          var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

          availabilitySlot.push({
            slot: startTimeHM + "-" + nextStartTimeHM,
            status: 0
          })
          // allGeneralSlot2.push(startTimeH + startTimeM)
          for (let index = 0; index < totalNumbersSlots - 1; index++) {
            var piece = startTimeHM
            var piece = startTimeHM.split(':')
            var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
            startTimeH = (mins % (24 * 60) / 60 | 0)
            if (startTimeH.toString().length == 1) {
              startTimeH = "0" + startTimeH;
            }
            startTimeM = (mins % 60)
            if (startTimeM.toString().length == 1) {
              startTimeM = startTimeM + "0";
            }
            startTimeHM = startTimeH + ":" + startTimeM

            var piece = startTimeHM
            var piece = startTimeHM.split(':')
            var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
            var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
            if (nextStartTimeH.toString().length == 1) {
              nextStartTimeH = "0" + startTimeH;
            }
            var nextStartTimeM = (mins % 60)
            if (nextStartTimeM.toString().length == 1) {
              nextStartTimeM = nextStartTimeM + "0";
            }
            var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

            availabilitySlot.push({
              slot: startTimeHM + "-" + nextStartTimeHM,
              status: 0
            })

            // const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
            // allGeneralSlot2.push(startTimeHM2)
          }

        });
      }

      if (availabilitySlot.length > 0) {
        allGeneralSlot = availabilitySlot
      } else {
        var daysArray = []
        for (let index = 0; index < result.week_days.length; index++) {
          if (day == 0) {
            startTime = result.week_days[index].sun_start_time
            endTime = result.week_days[index].sun_end_time
          }
          if (day == 1) {
            startTime = result.week_days[index].mon_start_time
            endTime = result.week_days[index].mon_end_time
          }
          if (day == 2) {
            startTime = result.week_days[index].tue_start_time
            endTime = result.week_days[index].tue_end_time
          }
          if (day == 3) {
            startTime = result.week_days[index].wed_start_time
            endTime = result.week_days[index].wed_end_time
          }
          if (day == 4) {
            startTime = result.week_days[index].thu_start_time
            endTime = result.week_days[index].thu_end_time
          }
          if (day == 5) {
            startTime = result.week_days[index].fri_start_time
            endTime = result.week_days[index].fri_end_time
          }
          if (day == 6) {
            startTime = result.week_days[index].sat_start_time
            endTime = result.week_days[index].sat_end_time
          }
          if (startTime != "0000" && endTime != "0000") {
            daysArray.push({
              startTime: startTime,
              endTime: endTime
            })
          }
        }


        if (daysArray.length > 0) {
          daysArray.forEach((element, index) => {
            var totalH = 0
            var totalM = 0
            startTimeH = element.startTime.slice(0, 2)
            startTimeM = element.startTime.slice(2)
            startTimeHM = startTimeH + ":" + startTimeM
            endTimeH = element.endTime.slice(0, 2)
            endTimeM = element.endTime.slice(2)
            endTimeHM = endTimeH + ":" + endTimeM
            let valueStart = moment.duration(startTimeHM, "HH:mm");
            let valueStop = moment.duration(endTimeHM, "HH:mm");
            let difference = valueStop.subtract(valueStart);
            totalH = totalH + difference.hours()
            totalM = totalM + difference.minutes()
            totalH = totalH + totalM / 60
            var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
            startTime = element.startTime
            startTimeH = startTime.slice(0, 2)
            startTimeM = startTime.slice(2)
            startTimeHM = startTimeH + ":" + startTimeM
            var piece = startTimeHM
            var piece = startTimeHM.split(':')
            var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
            var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
            if (nextStartTimeH.toString().length == 1) {
              nextStartTimeH = "0" + startTimeH;
            }
            var nextStartTimeM = (mins % 60)
            if (nextStartTimeM.toString().length == 1) {
              nextStartTimeM = nextStartTimeM + "0";
            }
            var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

            allGeneralSlot.push({
              slot: startTimeHM + "-" + nextStartTimeHM,
              status: 0
            })
            allGeneralSlot2.push(startTimeH + startTimeM)
            for (let index = 0; index < totalNumbersSlots - 1; index++) {
              var piece = startTimeHM
              var piece = startTimeHM.split(':')
              var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
              startTimeH = (mins % (24 * 60) / 60 | 0)
              if (startTimeH.toString().length == 1) {
                startTimeH = "0" + startTimeH;
              }
              startTimeM = (mins % 60)
              if (startTimeM.toString().length == 1) {
                startTimeM = startTimeM + "0";
              }
              startTimeHM = startTimeH + ":" + startTimeM

              var piece = startTimeHM
              var piece = startTimeHM.split(':')
              var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
              var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
              if (nextStartTimeH.toString().length == 1) {
                nextStartTimeH = "0" + startTimeH;
              }
              var nextStartTimeM = (mins % 60)
              if (nextStartTimeM.toString().length == 1) {
                nextStartTimeM = nextStartTimeM + "0";
              }
              var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

              allGeneralSlot.push({
                slot: startTimeHM + "-" + nextStartTimeHM,
                status: 0
              })
              const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
              allGeneralSlot2.push(startTimeHM2)
            }

          });
        } else {
          allGeneralSlot = []
          allGeneralSlot2 = []
        }
        const doctorUnavailability = result.unavailability_slot
        var unavailabilityArray = []
        var unavailabilitySlot = []

        if (allGeneralSlot.length > 0) {
          for (let index = 0; index < doctorUnavailability.length; index++) {
            const element = doctorUnavailability[index];
            const unavailabilityDate = element.date.split("T")[0]
            const d1 = new Date(onlyDate)
            const d2 = new Date(unavailabilityDate)
            if (d1.getTime() === d2.getTime()) {
              if (element.start_time != '0000' && element.end_time != '0000') {
                unavailabilityArray.push({
                  startTime: element.start_time,
                  endTime: element.end_time
                })

              }


              // const unAvailableStartTime = element.start_time
              // const unAvailableEndTime = element.end_time
              // console.log(allGeneralSlot2);
              // for (let index = 0; index < allGeneralSlot2.length; index++) {
              //     const element = allGeneralSlot2[index];
              //     if (unAvailableStartTime <= element && element < unAvailableEndTime) {
              //         var indexId = allGeneralSlot2.indexOf(element);
              //         if (indexId !== -1) {
              //             allGeneralSlot2.splice(indexId, 1);
              //         }
              //     }
              // }
              // console.log(allGeneralSlot2);
            }
          }
          if (unavailabilityArray.length > 0) {
            unavailabilityArray.forEach((element, index) => {
              var totalH = 0
              var totalM = 0
              startTimeH = element.startTime.slice(0, 2)
              startTimeM = element.startTime.slice(2)
              startTimeHM = startTimeH + ":" + startTimeM
              endTimeH = element.endTime.slice(0, 2)
              endTimeM = element.endTime.slice(2)
              endTimeHM = endTimeH + ":" + endTimeM
              let valueStart = moment.duration(startTimeHM, "HH:mm");
              let valueStop = moment.duration(endTimeHM, "HH:mm");
              let difference = valueStop.subtract(valueStart);
              totalH = totalH + difference.hours()
              totalM = totalM + difference.minutes()
              totalH = totalH + totalM / 60
              var totalNumbersSlots = totalH * 60 / result.slot_interval.slice(0, 2)
              startTime = element.startTime
              startTimeH = startTime.slice(0, 2)
              startTimeM = startTime.slice(2)
              startTimeHM = startTimeH + ":" + startTimeM
              var piece = startTimeHM
              var piece = startTimeHM.split(':')
              var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
              var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
              if (nextStartTimeH.toString().length == 1) {
                nextStartTimeH = "0" + startTimeH;
              }
              var nextStartTimeM = (mins % 60)
              if (nextStartTimeM.toString().length == 1) {
                nextStartTimeM = nextStartTimeM + "0";
              }
              var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

              unavailabilitySlot.push({
                slot: startTimeHM + "-" + nextStartTimeHM,
                status: 0
              })
              // allGeneralSlot2.push(startTimeH + startTimeM)
              for (let index = 0; index < totalNumbersSlots - 1; index++) {
                var piece = startTimeHM
                var piece = startTimeHM.split(':')
                var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                startTimeH = (mins % (24 * 60) / 60 | 0)
                if (startTimeH.toString().length == 1) {
                  startTimeH = "0" + startTimeH;
                }
                startTimeM = (mins % 60)
                if (startTimeM.toString().length == 1) {
                  startTimeM = startTimeM + "0";
                }
                startTimeHM = startTimeH + ":" + startTimeM

                var piece = startTimeHM
                var piece = startTimeHM.split(':')
                var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
                var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
                if (nextStartTimeH.toString().length == 1) {
                  nextStartTimeH = "0" + startTimeH;
                }
                var nextStartTimeM = (mins % 60)
                if (nextStartTimeM.toString().length == 1) {
                  nextStartTimeM = nextStartTimeM + "0";
                }
                var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM

                unavailabilitySlot.push({
                  slot: startTimeHM + "-" + nextStartTimeHM,
                  status: 0
                })
                // const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
                // allGeneralSlot2.push(startTimeHM2)
              }

            });
            console.log(unavailabilitySlot, "unavailabilitySlot");
            var filterUnavailableSlot = filterUnavailableSlotFunction(unavailabilitySlot, allGeneralSlot[0].slot, allGeneralSlot[allGeneralSlot.length - 1].slot)
            console.log(filterUnavailableSlot, "filterUnavailableSlot");
            allGeneralSlot = uniqueArray(allGeneralSlot, filterUnavailableSlot)
          }
        }
      }

      var todayDate = new Date().toISOString().split('T')[0]
      if (new Date(onlyDate).getTime() === new Date(todayDate).getTime()) {
        allGeneralSlot = filterBookedSlotsToday(allGeneralSlot)
      }
      const appointment = await Appointment.find({ portal_id, 'hospital_details.hospital_id': locationId, appointmentType, consultationDate: onlyDate, portal_type })
      if (appointment.length > 0) {
        const appointmentTimeArray = []
        appointment.forEach((element) => {
          appointmentTimeArray.push(element.consultationTime)
        })
        allGeneralSlot = filterBookedSlots(allGeneralSlot, appointmentTimeArray)
      }


      // allGeneralSlot = allGeneralSlot.filter((data) => {
      //     return data.status == 0;
      // })
      sendResponse(req, res, 200, {
        status: true,
        body: {
          allGeneralSlot,
          fee
        },
        message: `Successfully get time slot`,
        errorCode: null,
      });
    } catch (error) {
      console.log("Error______________", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get time slot`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getInsuranceAcceptedListForFourPortal(req, res) {
    try {
      const { portal_id } = req.query
      let insuranceAccepted = await BasicInfo.findOne(
        { for_portal_user: portal_id },
        { insurance_accepted: 1 }
      );
      if (insuranceAccepted) {
        const insuranceAcceptedIds = insuranceAccepted.insurance_accepted;
        const insuranceDetailsArray = [];

        for (const id of insuranceAcceptedIds) {

          const insuranceStaffDetails = await httpService.getStaging('insurance/get-Insurance-By-Id', { for_portal_user: id }, {}, 'insuranceServiceUrl');
          if (insuranceStaffDetails.body) {
            insuranceDetailsArray.push({
              _id: id,
              company_name: insuranceStaffDetails.body.company_name,
              for_portal_user: insuranceStaffDetails.body.for_portal_user
            });
          }

        }
     
        sendResponse(req, res, 200, {
          status: true,
          body: insuranceDetailsArray,
          message: "successfully get insurance list",
          errorCode: null,
        });
      }
      else {
        sendResponse(req, res, 200, {
          status: false,
          body: [],
          message: "No Insurance Found",
          errorCode: null,
        });
      }

    } catch (error) {
      console.log(error, "eorrorororororor123");
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "failed to get insurance accepted list",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async postReviewAndRating(req, res) {
    try {
      const { for_portal_user, patient_login_id, portal_type, rating, comment, reviewBy, reviewTo } = req.body
      console.log("req.body>>>>>>>>>>", req.body)
      //Store Location details
      let reviewObject = { rating, comment, reviewBy, reviewTo }
      const getReview = await ReviewAndRating.find({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }).select('rating');
      if (getReview.length > 0) {
        await ReviewAndRating.findOneAndUpdate({ patient_login_id: { $eq: patient_login_id }, portal_user_id: { $eq: for_portal_user } }, {
          $set: reviewObject
        }, { new: true }).exec();
      } else {
        console.log("insideee_____");
        reviewObject.portal_user_id = for_portal_user
        reviewObject.patient_login_id = patient_login_id
        //reviewObject.portal_user_id = for_portal_user
        reviewObject.reviewBy = reviewBy ? reviewBy : ''
        reviewObject.reviewTo = reviewTo ? reviewTo : ''
        reviewObject.portal_type = portal_type ? portal_type : ''
        const reviewData = new ReviewAndRating(reviewObject);
        console.log(reviewObject, "reviewObjectttt_____");
        await reviewData.save()
      }
      const getAllRatings = await ReviewAndRating.find({ portal_id: mongoose.Types.ObjectId(for_portal_user) }).select('rating')
      console.log(getAllRatings, 'getAllRatingsss____');
      const totalCount = getAllRatings.length
      let count = 0
      for (const rating of getAllRatings) {
        count += rating.rating
      }
      console.log(count, 'countttt_____');
      const average_rating = (count / totalCount).toFixed(1);
      console.log(average_rating, 'average_ratinggg________');
      await PortalUser.findOneAndUpdate({ _id: { $eq: for_portal_user } }, {
        $set: { average_rating }
      }, { new: true }).exec();
      sendResponse(req, res, 200, {
        status: true,
        body: null,
        message: `Review added successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errrrrrr")
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong to post review`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async getReviewAndRating(req, res) {
    try {
      const { portal_user_id, page, limit, reviewBy, requestFrom } = req.query;

      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = value;
      } else {
        sortingarray['createdAt'] = -1;
      }

      var result;
      var filter;
      if (requestFrom == 'hospital') {
        let doctorIDs = [];
        const hospitalDoctors = await BasicInfo.find({ for_hospitalIds: { $in: portal_user_id } }, { for_portal_user: 1 });

        for (const doctor of hospitalDoctors) {
          doctorIDs.push(doctor?.for_portal_user)
        }

        filter = { patient_login_id: { $in: doctorIDs }, reviewBy: reviewBy }
      } else if (reviewBy == ' doctor') {
        filter = { patient_login_id: { $in: portal_user_id }, reviewBy: reviewBy }
      }
      else {
        filter = { portal_user_id: { $in: portal_user_id }, reviewBy: reviewBy }

      }
      result = await ReviewAndRating.find(filter)
        .sort(sortingarray)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
      let patientIDArray = []
      for (const id of result) {
        patientIDArray.push(id.patient_login_id)
      }

      var patientDetails;

      if (reviewBy == 'patient') {
        const resData = await httpService.postStaging('patient/get-patient-details-by-id', { ids: patientIDArray }, {}, 'patientServiceUrl');
        patientDetails = resData.data
        console.log("resData", resData);
      } else {
        const basic_info = await BasicInfo.find(
          { for_portal_user: { $in: patientIDArray } }
        ).select(
          {
            for_portal_user: 1, full_name: 1
          }
        ).populate(
          { path: 'profile_picture', select: 'url' }
        )


        let profileObject = {}
        for (const doctorData of basic_info) {
          var image_url;

          if (doctorData != null && doctorData?.profile_picture != null && doctorData?.profile_picture?.url != "") {
            image_url = await getDocument(doctorData?.profile_picture?.url)
          }
          profileObject[doctorData.for_portal_user] = { full_name: doctorData?.full_name, profile_pic: image_url }
        }

        patientDetails = profileObject
      }

      let ratingArray = [];
      for (const value of result) {
        ratingArray.push({
          rating: value.rating,
          comment: value.comment,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
          patientName: patientDetails[value.patient_login_id],
          _id: value?._id
        })
      }
      const getAverage = await PortalUser.findById(portal_user_id).select('average_rating')

      const getAllRatings = await ReviewAndRating.find({ portal_user_id: { $in: portal_user_id } }).select('rating')
      let fiveStart = 0
      let fourStart = 0
      let threeStart = 0
      let twoStart = 0
      let oneStart = 0
      for (const rating of getAllRatings) {
        if (rating.rating === 5) fiveStart += 1
        if (rating.rating === 4) fourStart += 1
        if (rating.rating === 3) threeStart += 1
        if (rating.rating === 2) twoStart += 1
        if (rating.rating === 1) oneStart += 1
      }
      const ratingCount = { fiveStart, fourStart, threeStart, twoStart, oneStart }
      const totalCount = await ReviewAndRating.find({ portal_user_id: { $in: portal_user_id }, reviewBy }).countDocuments()
      sendResponse(req, res, 200, {
        status: true,
        body: {
          ratingArray,
          getAverage,
          ratingCount,
          totalCount,
          currentPage: page,
          totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
        },
        message: `successfully fetched review and ratings`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error------>", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching reviews`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async deleteReviewAndRating(req, res) {
    try {
      const { _id } = req.body;

      const result = await ReviewAndRating.deleteOne({ _id });

      if (result) {
        sendResponse(req, res, 200, {
          status: true,
          data: null,
          message: `Rating & Review Deleted Successfully`,
          errorCode: null,
        });
      }

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
}

module.exports = {
  advFilterslabimagingdentaloptical: new advFiltersLabImagingDentalOptical(),
};