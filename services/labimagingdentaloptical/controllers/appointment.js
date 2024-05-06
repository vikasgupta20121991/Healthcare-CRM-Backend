"use strict";

// utils
import { sendResponse } from "../helpers/transmission";
import Http from "../helpers/httpservice"
const httpService = new Http()
import mongoose from "mongoose";
import PortalUser from "../models/portal_user";
import ReviewAndRating from "../models/reviews";
import StaffProfile from "../models/staffProfile";
import Reminder from "../models/reminder";
import { getDocument } from "../helpers/s3";
import BasicInfo from "../models/basic_info";
import Appointment from "../models/appointment";
import { getNextSequenceValue } from "../middleware/utils";
import DocumentInfo from '../models/document_info';
import hospital_location from '../models/hospital_location'
import moment from "moment"
import FourPortalAvailability from '../models/availability';
import FeeManagement from "../models/fee_management";
import { TimeZone } from "../config/constants";
import { notification } from "../helpers/notification";
import Assessment from "../models/assessment";
import OrderTestDetails from "../models/order/order_test_detail";


export const formatDateToYYYYMMDD = async (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Add 1 to month because it's zero-based
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export const formatDateAndTime = (date) => {
  const cdate = new Date(date)
  const currentdate = `0${cdate.getDate()}`
  const month = `0${cdate.getMonth() + 1}`
  const year = `${cdate.getFullYear()}`

  // const newDate = `${currentdate.length > 2 ? currentdate.slice(1) : currentdate}-${month.length > 2 ? month.slice(2) : month}-${year} ${cdate.getUTCHours()}:${cdate.getUTCMinutes()}`
  const newDate = `${year}-${month.length > 2 ? month.slice(2) : month}-${currentdate.length > 2 ? currentdate.slice(1) : currentdate} ${cdate.getUTCHours()}:${cdate.getUTCMinutes()}`
  return newDate
}

function filterBookedSlots(array1, array2) {
  array1.forEach((element, index) => {
    var xyz = array2.indexOf(element.slot)
    if (xyz != -1) {
      array1[index].status = 1
    }
  });
  return array1
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

export const updatePaymentStatusAndSlot = async (appointmentId, req) => {

  // console.log(appointmentId, "appointmentIddddd_______");


  //const appointmentDetails = Appointment.findById(appointmentId);
  const appointmentDetails = await Appointment.findById(mongoose.Types.ObjectId(appointmentId));

  var notificationCreator = null
  var notificationReceiver = null
  if (appointmentDetails.madeBy == "patient") {
    notificationCreator = appointmentDetails.patientId
    notificationReceiver = appointmentDetails.portalId
  } else {
    notificationCreator = appointmentDetails.portalId
    notificationReceiver = appointmentDetails.patientId
  }

  // return;
  var appointType = appointmentDetails.appointmentType.replace("_", " ");

  var message = `You have recevied one new appoitment for ${appointType} consulation at ${appointmentDetails.hospital_details.hospital_name} on ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} from ${appointmentDetails.patientDetails.patientFullName}`
  var requestData = {
    created_by_type: appointmentDetails.madeBy,
    created_by: notificationCreator,
    content: message,
    url: '',
    for_portal_user: notificationReceiver,
    notitype: 'New Appointment',
    appointmentId: appointmentId
  }
  //var result = await notification(appointmentDetails.madeBy, notificationCreator, "hospitalServiceUrl", req.body.portalId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)

  /*  
  to insert next available appointment date of doctor
  */


  var timeStamp = new Date()
  var timeStampString
  var slot = null

  const locationResult = await hospital_location.find(
    {
      for_portal_user: notificationReceiver,
      "hospital_or_clinic_location.status": "APPROVED"
    }).exec();

  const hospitalObject = (locationResult[0].hospital_or_clinic_location);
  //console.log(hospitalObject[hospitalObject.length - 1], 'hospitalObject');

  const hospitalId = hospitalObject[hospitalObject.length - 1].hospital_id;
  // console.log(hospitalId, 'hospitalIdd____d');
  //return;
  const headers = {
    'Authorization': req.headers['authorization']
  }

  for (let index = 0; index < 3; index++) {
    const resData = await httpService.postStaging('labimagingdentaloptical/four-portal-available-slots',
      {
        locationId: hospitalId,
        portalId: notificationReceiver,
        appointmentType: 'ONLINE',
        timeStamp: timeStamp
      }, headers, 'labimagingdentalopticalServiceUrl');

    // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
    // timeStamp = new Date(timeStampString)
    const slots = resData?.body?.allGeneralSlot

    // console.log(resData, "SLOTSssssssss_______", slots)
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
      // console.log("isBreakkk_______");
      timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
      timeStamp = new Date(timeStampString)
    }
  }

  if (slot != null) {

    // console.log(slot, 'slot available');
    // console.log(timeStamp, 'timeStamp')


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


export default class appointmentController {
  async portalAppointment(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const {
        appointmentId,
        loginId,
        portalId,
        hospital_details,
        madeBy,
        consultationFee,
        appointmentType,
        reasonForAppointment,
        consultationDate,
        consultationTime,
        consultationUserType,
        consultationFor,
        patientId,
        patientDetails,
        portal_Details,
        paymentType,
        paymentMode,
        portal_type,
        status
      } = req.body
      console.log("req.body------", req.body);
      const consultationDate1 = new Date(consultationDate); // Your date object
      const consultation_date = await formatDateToYYYYMMDD(consultationDate1);


      var appointmentDetails
      if (appointmentId != "") {
        if (paymentType != "" && paymentType != undefined && paymentMode != "") {

          appointmentDetails = await Appointment.findOneAndUpdate(
            { _id: appointmentId, portal_type },
            {
              $set: {
                paymentType,
                paymentMode,
                status: "NEW"
              },
            },

            { upsert: false, new: true }
          ).exec();

          if (paymentType == 'post-payment') {
            updatePaymentStatusAndSlot(appointmentId, req)
          }


        } else {
          // console.log('in else');
          // return;
          appointmentDetails = await Appointment.findOneAndUpdate(
            { _id: appointmentId, portal_type },
            {
              $set: {

                portalId,
                hospital_details,
                consultationFee,
                appointmentType,
                reasonForAppointment,
                consultationDate: consultation_date,
                consultationTime,
                consultationUserType,
                patientDetails,
                portal_Details,
                consultationFor
              },
            },
            { upsert: false, new: true }
          ).exec();

        }
        let portalfullName = await PortalUser.findOne({_id:portalId})
        let receiverId;
        let serviceurl;
        let message;
        if(madeBy === 'patient'){
            receiverId = portalId
            serviceurl="labimagingdentalopticalServiceUrl"
            message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
        }else{
            receiverId = patientId
            serviceurl="patientServiceUrl"
            message = `New Appointement from ${portalfullName?.full_name}`
        }
        // var message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
        var requestData = {
          created_by_type: portal_type,
          created_by: loginId,
          content: message,
          url: '',
          for_portal_user: receiverId,
          notitype: "Booked Appointment",
          appointmentId: appointmentDetails?._id,
          title: "New Appointment"
        }
        var result = await notification('', '', serviceurl, '', '', '', headers, requestData)
        sendResponse(req, res, 200, {
          status: true,
          body: appointmentDetails,
          message: `Appointment updated successfully`,
          errorCode: null,
        });
      } else {

        var portal_details = await BasicInfo.findOne({ for_portal_user: portalId, portal_type });
        let protal_image = '';
        if (portal_details?.profile_picture !== null) {
          const documentInfo = await DocumentInfo.findOne({ _id: portal_details?.profile_picture });
          console.log("documentInfo------", documentInfo);

          if (documentInfo) {
            const image_url = await getDocument(documentInfo.url)
            console.log("image_url------", image_url);
            protal_image = image_url
          }

        }
        // console.log("protal_image------",protal_image);
        var userarray = [
          {
            "user_id": patientId,
            "name": patientDetails.patientFullName,
            "image": patientDetails.patientImage
          },
          {
            "user_id": portalId,
            "name": portal_details?.full_name,
            "image": protal_image ? protal_image : ""
          }
        ]
        var appointment_id = await getNextSequenceValue("appointment");
        const appointmentData = new Appointment({
          loginId,
          portalId,
          hospital_details,
          madeBy,
          consultationFee,
          appointmentType,
          reasonForAppointment,
          consultationDate: consultation_date,
          consultationTime,
          consultationUserType,
          paymentType,
          paymentMode,
          patientId,
          patientDetails,
          portal_Details,
          order_id: "APPOINTMENT-" + appointment_id,
          users: userarray,
          consultationFor,
          status,
          portal_type

        });
        appointmentDetails = await appointmentData.save();

        let portalfullName = await PortalUser.findOne({_id:portalId})
        let receiverId;
        let serviceurl;
        let message;
        if(madeBy === 'patient'){
          // console.log("runnnnnnnnnnnn1111111111")
            receiverId = portalId
            serviceurl="labimagingdentalopticalServiceUrl"
            message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
        }else{
          // console.log("runnnnnnnnnnnn2222222222")
            receiverId = patientId
            serviceurl="patientServiceUrl"
            message = `New Appointement from ${portalfullName?.full_name}`
        }

        // var message = `New Appointement from ${appointmentDetails?.patientDetails?.patientFullName}`
        var requestData = {
          created_by_type: portal_type,
          created_by: loginId,
          content: message,
          url: '',
          for_portal_user: receiverId,
          notitype: "Booked Appointment",
          appointmentId: appointmentDetails?._id,
          title: "New Appointment"
        }
        var result = await notification('', '', serviceurl, '', '', '', headers, requestData)
        // console.log("result==>", result);

        sendResponse(req, res, 200, {
          status: true,
          body: appointmentDetails,
          message: `Appointment added successfully`,
          errorCode: null,
        });
      }
    } catch (error) {
      console.log(error, "errorrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to add appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async fourPortalAvailableSlot(req, res) {
    try {
      const {
        locationId,
        appointmentType,
        timeStamp,
        portalId,
      } = req.body

      console.log(req.body, "bodyye_____");

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
      const result = await FourPortalAvailability.findOne({ for_portal_user: portalId, location_id: locationId, appointment_type: appointmentType })
      const allFee = await FeeManagement.findOne({ for_portal_user: portalId, location_id: locationId, })
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
            // var mins = piece[0] * 60 + +piece[1] + +result.slot_interval.slice(0, 2)
           
            var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)
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
            for (let index = 0; index <  parseInt(totalNumbersSlots) - 1; index++) {
              var piece = startTimeHM
              var piece = startTimeHM.split(':')
              var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)
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
               var mins = parseInt(parseInt(piece[0]) * 60) + +parseInt(piece[1]) + +result.slot_interval.slice(0, 2)
              var nextStartTimeH = (mins % (24 * 60) / 60 | 0)
              if (nextStartTimeH.toString().length == 1) {
                nextStartTimeH = "0" + startTimeH;
              }
              var nextStartTimeM = (mins % 60)
              if (nextStartTimeM.toString().length == 1) {
                nextStartTimeM = nextStartTimeM + "0";
              }
              var nextStartTimeHM = nextStartTimeH + ":" + nextStartTimeM
              if (startTimeHM <= endTimeHM && nextStartTimeHM <= endTimeHM) {

              allGeneralSlot.push({
                slot: startTimeHM + "-" + nextStartTimeHM,
                status: 0
              })
              const startTimeHM2 = startTimeH.toString() + startTimeM.toString()
              allGeneralSlot2.push(startTimeHM2)
            }
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
      const appointment = await Appointment.find({ portalId, 'hospital_details.hospital_id': locationId, appointmentType, consultationDate: onlyDate })
      if (appointment.length > 0) {
        console.log("insideee_______");
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
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get time slot`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_viewAppointment(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { appointment_id, portal_type } = req.query
      const result = await Appointment.findById(appointment_id)
        .populate({
          path: 'portalId',
          select: {
            email: 1,
            mobile: 1,
            country_code: 1
          }
        })
        .populate({
          path: 'reasonForAppointment',
          select: {
            name: 1,
          }
        })
      const basic_info = await BasicInfo.find(
        { for_portal_user: { $eq: result.portalId._id }, portal_type }
      ).select(
        {
          for_portal_user: 1, full_name: 1, speciality: 1,
          years_of_experience: 1
        }
      ).populate(
        { path: 'profile_picture', select: 'url' }
      ).populate(
        { path: 'in_fee_management' }
      ).populate(
        { path: 'in_location', }
      )

      let basic_info_data = [
        {
          ...basic_info[0]?._doc
        }
      ]

      if (basic_info[0].profile_picture) {
        const image_url = await getDocument(basic_info[0].profile_picture.url)
        basic_info_data[0].profile_picture.url = image_url
      }

      if (basic_info[0].speciality) {

        const specialityData = await httpService.getStaging('hospital/get-speciality-data', { data: basic_info[0].speciality }, {}, 'hospitalServiceUrl');

        if (specialityData) {
          basic_info_data[0].speciality = specialityData.data[0].specilization;
        } else {
          basic_info_data[0].speciality = "";
        }
      }



      const portalUser = await PortalUser.findById(basic_info[0].for_portal_user, portal_type).select('average_rating')
      const getRatingCount = await ReviewAndRating.find({ portal_id: { $eq: result.portalId._id } }).countDocuments()
      const doctor_rating = {
        average_rating: portalUser.average_rating,
        total_review: getRatingCount
      }
      let docArray = []
      if (result.portal_Details.length > 0) {
        const resData = await httpService.postStaging('patient/get-patient-documents-by-ids', { ids: result.portal_Details }, headers, 'patientServiceUrl');
        const patientDoc = resData.data
        for (const doc of patientDoc) {
          docArray.push({
            doc_name: doc.name,
            issue_date: doc.issue_date,
            expiration_date: doc.expiration_date,
            image_url: doc.image_signed_url
          })
        }
      }

      var patient_profile = ""
      let patient_profile_response = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: result.patientId }, headers, 'patientServiceUrl');
      patient_profile = patient_profile_response?.body ? patient_profile_response?.body?.profile_signed_url : ''
      let otherinfo = {
        ANSJSON: result?.ANSJSON,
        consultationData: result?.consultationData,
        templateJSON: result?.templateJSON
      }

      if (result.cancelledOrAcceptedBy != null) {
        if (result.cancel_by == 'patient') {
          console.log("if");
          result.cancel_by = 'patient'

        } else {
          console.log("else");
          const findDoc = await PortalUser.findOne({ _id: result.cancelledOrAcceptedBy })

          if (findDoc.role == 'INDIVIDUAL' || findDoc.role == 'HOSPITAL') {
            // console.log("else if");
            const docName = await BasicInfo.findOne({ for_portal_user: findDoc._id, type: portal_type })
            result.cancel_by = docName.full_name
          } else {
            // console.log("else if else");
            const staffName = await StaffProfile.findOne({ for_portal_user: findDoc._id, type: portal_type })
            result.cancel_by = staffName.name
          }
        }

      }

      sendResponse(req, res, 200, {
        status: true,
        data: { patient_profile: patient_profile, result, doctor_basic_info: basic_info_data, doctor_rating, patient_document: docArray, otherinfo },
        message: `Appointment fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error_______YYYYYYYYYYY", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching appointment`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_listAppointment(req, res) {

    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const { portal_id, portal_type, page, limit, consultation_type, status, date, to_date, filterByDocLocname, filterByPatientname } = req.query;

      console.log(req.query, "queryyyyList___");

      var sort = req.query.sort
      var sortingarray = {};
      if (sort != 'undefined' && sort != '' && sort != undefined) {
        var keynew = sort.split(":")[0];
        var value = sort.split(":")[1];
        sortingarray[keynew] = Number(value);
      } else {
        sortingarray['createdAt'] = -1;
      }

      var fourPortalId = Array.isArray(portal_id) ? portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(portal_id)];


      // //For UPDATING MISSED APPOINTMENT
      const missedAppointments = await Appointment.find({ portalId: { $in: portal_id }, status: ["NEW", "APPROVED",], portal_type });
      var dateToday = new Date().toISOString().split('T')[0] //string

      const today = new Date(dateToday); //Today date
      let appointmentsToBeMissed = [] //appointment id array

      for (const appointment of missedAppointments) {
        let consultedDate = new Date(appointment?.consultationDate);

        if (consultedDate < today) {
          appointmentsToBeMissed.push(appointment?._id.toString())
        } else if (consultedDate > today) {

        } else {
          const now = new Date(); //current time

          const endTime = appointment?.consultationTime?.split("-")[1]?.split(":"); //apointment end time

          const givenTime = new Date();
          givenTime.setHours(endTime[0]);
          givenTime.setMinutes(endTime[1]);
          givenTime.setSeconds(0);

          // Compare the two times
          if (now.getTime() > givenTime.getTime()) {
            appointmentsToBeMissed.push(appointment?._id.toString())
          }
        }
      }

      var afterUpdateResult;
      if (appointmentsToBeMissed.length != 0) {
        afterUpdateResult = await Appointment.updateMany({ _id: { $in: appointmentsToBeMissed } },
          { $set: { status: 'MISSED' } },
          { multi: true });
      }


      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {

        statusFilter = {
          status: { $ne: 'NA' }
        }
        if (status == 'NEW') {
          statusFilter = {
            status: 'NEW'
          }
        }
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }
        if (status == 'TODAY') {
          statusFilter = {
            consultationDate: { $eq: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'UPCOMING') {
          statusFilter = {
            consultationDate: { $gt: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'REJECTED') {
          statusFilter = {
            status: "REJECTED"
          }
        }
        if (status == 'PAST') {
          statusFilter = {
            consultationDate: { $lt: new Date().toISOString().split('T')[0] },
            status: "PAST"
          }
        }

        if (status == 'MISSED') {
          statusFilter = {
            status: "MISSED"
          }
        }

      }

      var dateFilter = {}
      if (date && date != "" && to_date && to_date != "") {
        dateFilter = {
          consultationDate: { $gte: date, $lte: to_date },
        }
      }
      if (date && date != "" && to_date == "") {
        dateFilter = {
          consultationDate: { $gte: date },
        }
      }



      var filterName = {};
      if (filterByDocLocname) {
        if (typeof filterByDocLocname === 'string') {
          filterName["hospital_details.hospital_id"] = mongoose.Types.ObjectId(filterByDocLocname)
        } else if (Array.isArray(filterByDocLocname) && filterByDocLocname.length >= 1) {
          const objectIdArray = filterByDocLocname.map(name => mongoose.Types.ObjectId(name));
          filterName["hospital_details.hospital_id"] = { $in: objectIdArray };
        }
      }

      var filterPetName = {};
      if (filterByPatientname) {
        if (typeof filterByPatientname === 'string') {
          filterPetName["patientDetails.patientFullName"] = { $regex: filterByPatientname || '', $options: 'i' };
        } else if (Array.isArray(filterByPatientname) && filterByPatientname.length >= 1) {
          const regexArray = filterByPatientname.map(name => new RegExp(name, 'i'));
          filterPetName["patientDetails.patientFullName"] = { $in: regexArray };
        }
      }

      let aggregate = [
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $set: {
            reasonForAppointment: "$reasonForAppointment.name"
          }
        },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'portal_Details'
          }
        },
        { $unwind: "$portal_Details" },
        {
          $match: {
            portalId: { $in: fourPortalId },
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter,
              filterName,
              filterPetName
            ]
          }
        },

        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            portalId: 1,
            hospital_details: 1,
            portal_Details: 1,
            createdAt: 1,
            isPrescriptionValidate: 1,
            cancel_by: 1,
            paymentType: 1,
            appointment_complete: 1
          }
        },
      ];
      const totalCount = await Appointment.aggregate(aggregate);


      aggregate.push({
        $sort: sortingarray
      })
      if (limit > 0) {
        aggregate.push({ $skip: (page - 1) * limit }, { $limit: limit * 1 })
      }
      const result = await Appointment.aggregate(aggregate);


      let listArray = []
      for (const appointment of result) {
        const todayDate = new Date().toISOString().split('T')[0]
        // const portal_Details = await BasicInfo.find({for_portal_user: {$eq: appointment.portalId}})
        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {
          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
        if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

        //call signed url api here
        let patient_profile = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: appointment.patientId }, headers, 'patientServiceUrl');
        listArray.push({
          appointment_id: appointment._id,
          patient_name: appointment.patientDetails.patientFullName,
          patient_id: appointment.patientId,
          portal_name: appointment.portal_Details.full_name,
          portalId: appointment.portalId,
          hospital_details: appointment.hospital_details,
          hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          made_by: appointment.madeBy,
          consultation_date: appointment.consultationDate,
          consultation_time: appointment.consultationTime,
          consultation_type: consultationType,
          reason_for_appointment: appointment.reasonForAppointment,
          fee: appointment.consultationFee,
          order_id: appointment.order_id ? appointment.order_id : '',
          status,
          patient_profile: patient_profile?.body,
          createdAt: appointment.createdAt,
          isPrescriptionValidate: appointment.isPrescriptionValidate,
          cancel_by: appointment.cancel_by,
          paymentType: appointment.paymentType,
          patieintDetailpatientId: appointment.patientDetails.patientId,
          appointment_complete: appointment.appointment_complete

        })
        console.log("doctordata----->", result);

      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          data: listArray,
          totalCount: totalCount.length,
          currentPage: page,
          totalPages: limit > 0 ? Math.ceil(totalCount.length / limit) : 1,
        },
        message: `Appointment list fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error==========", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : `something went wrong while fetching list`,
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }

  }

  async portal_updateAppointmentPaymentStatus(req, res) {
    try {
      const { data } = req.body
      console.log("data>>>>>>>>>>>>>", data)
      if (data?.metadata) {
        let appointmentDetails = await Appointment.updateOne(
          { order_id: data?.metadata?.order_id },
          {
            $set: {
              isPaymentDone: true,
              paymentDetails: {
                doctorFees: data.metadata.plan_price,
                transactionID: data.id,
              }
            },
          }
        )
        console.log("appointmentDetails>>>>>>>>", appointmentDetails)
        updatePaymentStatusAndSlot(data?.metadata?.order_id);

        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: 'data updated succesfully',
          errorCode: null,
        });
      } else {
        let appointmentDetails = await Appointment.updateOne(
          { order_id: data?.order_id },
          {
            $set: {
              isPaymentDone: true,
              paymentDetails: {
                doctorFees: data?.plan_price,
                transactionID: data?.transaction_id
              }
            },
          }
        )
        console.log("appointmentDetails>>>>>>>>", appointmentDetails)
        updatePaymentStatusAndSlot(data?.order_id);

        sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: 'data updated succesfully',
          errorCode: null,
        });
      }
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message ? error.message : "Failed to update appointment payment status",
        errorCode: error.code ? error.code : "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_cancelAppointment(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }

      const { appointment_id, loginId, cancelReason, status, cancelledOrAcceptedBy, fromDate, toDate, consultationType, cancel_by } = req.body
      if (fromDate && toDate) {
        var cancelIddoctor = (cancelledOrAcceptedBy);

        let filter = {
          consultationDate: { $gte: fromDate, $lte: toDate },
          portalId: cancelIddoctor,
          status: { $in: ['NEW', 'APPROVED'] }

        }

        if (!consultationType || consultationType == 'all') {
          filter.appointmentType = { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
        } else {
          filter.appointmentType = { $in: consultationType }
        }

        await Appointment.updateMany(filter, {
          $set: {
            loginId,
            cancelReason,
            status,
            cancelledOrAcceptedBy,
            cancel_by
          }
        }, { new: false }).exec();

      } else {

        var appointmentDetails = await Appointment.findOneAndUpdate({ _id: { $eq: appointment_id } }, {
          $set: {
            loginId,
            cancelReason,
            status,
            cancelledOrAcceptedBy,
            cancel_by
          }
        }, { new: true }).exec();
        // return;
        var notificationCreator = null
        var notificationReceiver = null
        let serviceurl='';
        
        if (appointmentDetails.cancel_by == 'INDIVIDUAL' || appointmentDetails.cancel_by == 'HOSPITAL') {
          notificationCreator = appointmentDetails.portalId
          notificationReceiver = appointmentDetails.patientId
          serviceurl = "patientServiceUrl"
        } else {
          console.log("runnnnnnnnnnnn")
          notificationCreator = appointmentDetails.patientId 
          notificationReceiver = appointmentDetails.portalId
          serviceurl= "labimagingdentalopticalServiceUrl"
        }
        var appointType = appointmentDetails.appointmentType.replace("_", " ");

        var noti_messaged = ''
        var noti_type = ''
        switch (status) {
          case ('REJECTED'):
            noti_type = "Appointment Rejected"
            noti_messaged = `Your ${appointType} appointment
               which is scheduled at ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} 
               has been rejected due to ${cancelReason}`;
            break;
          case ('APPROVED'):
            noti_type = "Appointment Approved"
            noti_messaged = `Your ${appointType} appointment
               which is scheduled at ${appointmentDetails.consultationDate} | ${appointmentDetails.consultationTime} 
               has been approved`;
            break;
        }

        var requestData = {
          created_by_type: appointmentDetails?.portal_type,
          created_by: notificationCreator,
          content: noti_messaged,
          url: '',
          for_portal_user: notificationReceiver,
          notitype: noti_type,
          appointmentId: appointment_id
        }
        var result = await notification(appointmentDetails?.portal_type, notificationCreator, serviceurl, req.body.portalId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
        // console.log("result--->", result);
      }


      const message = status == 'REJECTED' ? 'cancelled' : 'Approved';

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Patient appointment ${message} successfully!`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `Something went wrong while cancelling appointment.`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_appointmentDetails(req, res) {
    try {
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const { appointment_id, portal_type } = req.query;
      const result = await Appointment.findById(appointment_id)
        .populate({
          path: 'portalId',
          select: {
            email: 1,
            mobile: 1,
            country_code: 1,
          }
        })
        .populate({
          path: 'assigned_staff',
          select: {
            email: 1,
            mobile: 1,
            country_code: 1
          }
        })
        .populate({
          path: 'reasonForAppointment',
          select: {
            name: 1,
          }
        })

      //   console.log("result=====",result);
      let patinetDetails = {
        // patient_name: result.patientDetails.patientFullName,
        patientId:result.patientDetails.patientId,
        patient_name: `${result.patientDetails.patientFirstName} ${result.patientDetails.patientMiddleName} ${result.patientDetails.patientLastName}`,
        patient_mobile: result.patientDetails.patientMobile,
        patient_email: result.patientDetails.patientEmail,
        patient_dob: result.patientDetails.patientDob,
        patient_gender: result.patientDetails.gender,
        patient_ssn_number: '',
        patient_matital_status: '',
        patient_insuranceNumber: result.patientDetails.insuranceNumber,
        address: result.patientDetails.address,
        loc: result.patientDetails.loc,
        postal_code: '',
        country: '',
        emergency_contact: {
          name: '',
          relationship: '',
          mobile: '',
          address: '',
        },
        patient_profle: ''
      }
      if (result.patientDetails.patientId != null) {
        const resData = await httpService.getStaging('insurance-subscriber/view-subscriber', { subscriber_id: result.patientDetails.patientId }, headers, 'insuranceServiceUrl');
        if (resData.body) {
          const subscriberDetails = resData.body.subscriber_details
          patinetDetails.patient_dob = subscriberDetails.date_of_birth
          patinetDetails.patient_gender = subscriberDetails.gender
        }
      }
      let assignedStaff = []
      if (result.assigned_staff.length > 0) {
        const getStaff = await StaffProfile.find({ for_portal_user: { $in: result.assigned_staff }, type: portal_type }).populate({ path: 'for_portal_user', select: { email: 1, mobile: 1, country_code: 1 } })

        for (const staff of getStaff) {

          let image = ''

          if(staff.profile_picture){
            const documentInfo = await DocumentInfo.findOne({ _id: staff.profile_picture });  
  
            if (documentInfo.url) {
              image = await getDocument(documentInfo.url)
            }
          }

          assignedStaff.push({
            name: staff.name,
            staff_portal_id: staff.for_portal_user._id,
            profile_picture: image,
            email: staff.for_portal_user.email,
            mobile: staff.for_portal_user.mobile,
            country_code: staff.for_portal_user.country_code
          })
        }
      }
      const date = formatDateAndTime(new Date())
      let status = ''
      if (result.status === 'NEW') status = 'New'
      if (result.status === 'REJECTED') status = 'Rejected'
      if (result.status == 'PAST') status = 'Past'
      if (result.status == 'MISSED') status = 'Missed'
      if (result.status === 'APPROVED') {
        status = date == result.consultationDate ? 'Today' : 'Upcoming'
      }
      const appointmentDetails = {
        appointment_id: result._id,
        date: result.consultationDate,
        time: result.consultationTime,
        consultationType: result.appointmentType,
        consultationFee: result.consultationFee,
        reasonForAppointment: result.reasonForAppointment,
        cancelReason: result.cancelReason,
        cancel_by: result.cancel_by,
        order_id: result.order_id ? result.order_id : '',
        status,
        consultationData: result.consultationData ? result.consultationData : '',
        portalId: result?.portalId?._id,
        hospital_details: result?.hospital_details,
        paymentStatus: result.isPaymentDone,
        subscriberId: result.consultationUserType,
        paymentType: result.paymentType,
        paymentdetails: result?.paymentDetails,
      }
      let patientAllDetails = "";
      if (result.patientId != null) {
        const getPatientDetails = await httpService.getStaging('patient/patient-details', { patient_id: result.patientId }, headers, 'patientServiceUrl');
        patientAllDetails = getPatientDetails.body

        if (patientAllDetails.personalDetails.in_location) {
          let getLocationDetails = await httpService.postStaging('superadmin/get-locations-name', { location: patientAllDetails.locationDetails }, headers, 'superadminServiceUrl');
          const locationDetails = getLocationDetails.body
          patinetDetails.postal_code = locationDetails.pincode
          patinetDetails.country = locationDetails.countryName.name
          patinetDetails.emergency_contact.address = locationDetails.address
        }
        patinetDetails.emergency_contact = patientAllDetails.personalDetails.emergency_contact
        let patient_profile_response = await httpService.getStaging('patient/get-patient-profile-signed-url', { patientId: result.patientId }, headers, 'patientServiceUrl');
        patinetDetails.patient_profle = patient_profile_response?.body ? patient_profile_response?.body?.profile_signed_url : ''

      }


      //getting doctor profile signed url
      const basic_info = await BasicInfo.findOne(
        { for_portal_user: result?.portalId?._id, type: portal_type }
      ).select(
        { for_portal_user: 1, full_name: 1, speciality: { $slice: 1 }, title: 1 }
      ).populate(
        { path: 'profile_picture', select: 'url' }
      ).populate(
        { path: 'in_fee_management' }
      ).populate(
        { path: 'in_location', }
      )

      let doctor_basic_info = {
        profile_picture: '',
        full_name: basic_info ? basic_info?.full_name : '',
        email: result?.portalId?.email,
        mobile: result?.portalId?.mobile,
        basic_info

      }

      let specialityPromises = await httpService.getStaging('hospital/get-speciality-data', { data: doctor_basic_info.basic_info.speciality[0] }, headers, 'hospitalServiceUrl');
      console.log(specialityPromises, "specialityPromises");
      doctor_basic_info.specialityPromises = specialityPromises?.data[0]?.specilization

      if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
        const image_url = await getDocument(basic_info?.profile_picture?.url)
        doctor_basic_info.profile_picture = image_url ? image_url : ''
      }
      let otherinfo = {
        ANSJSON: result?.ANSJSON,
        consultationData: result?.consultationData,
        templateJSON: result?.templateJSON
      }

      sendResponse(req, res, 200, {
        status: true,
        data: { patinetDetails, appointmentDetails, patientAllDetails, assignedStaff, doctor_basic_info, otherinfo },
        message: `patient appointment fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "check error234");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: error.message,
        errorCode: error.code,
      });
    }
  }



  async appointmentList_for_patient(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      var { patient_portal_id, consultation_type, status, date, to_date } = req.query;
      //For UPDATING MISSED APPOINTMENT
      const missedAppointments = await Appointment.find({ patientId: patient_portal_id, status: ["NEW", "APPROVED",] });

      var dateToday = new Date().toISOString().split('T')[0] //string

      const today = new Date(dateToday); //Today date
      let appointmentsToBeMissed = [] //appointment id array

      for (const appointment of missedAppointments) {
        let consultedDate = new Date(appointment?.consultationDate);

        if (consultedDate < today) {
          appointmentsToBeMissed.push(appointment?._id.toString())
        } else if (consultedDate > today) {

        } else {
          const now = new Date(); //current time
          const endTime = appointment?.consultationTime?.split("-")[1]?.split(":"); //apointment end time

          const givenTime = new Date();
          givenTime.setHours(endTime[0]);
          givenTime.setMinutes(endTime[1]);
          givenTime.setSeconds(0);

          // Compare the two times
          if (now.getTime() > givenTime.getTime()) {
            appointmentsToBeMissed.push(appointment?._id.toString())
          }
        }
      }

      var afterUpdateResult;
      if (appointmentsToBeMissed.length != 0) {
        afterUpdateResult = await Appointment.updateMany({ _id: { $in: appointmentsToBeMissed } },
          { $set: { status: 'MISSED' } },
          { multi: true });
      }



      var appointmentTypeFilter = {}
      if (consultation_type && consultation_type != "") {
        if (consultation_type == 'ALL') {
          appointmentTypeFilter = {
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] }
          }
        } else {
          appointmentTypeFilter = {
            appointmentType: consultation_type
          }
        }
      }

      var statusFilter = {}
      if (status && status != "") {
        statusFilter = {
          status: { $ne: 'NA' }
        }
        if (status == 'ALL') {
          statusFilter = {
            status: { $ne: 'NA' }
          }
        }
        if (status == 'NEW') {
          statusFilter = {
            status: "NEW"
          }
        }
        if (status == 'MISSED') {
          statusFilter = {
            status: "MISSED"
          }
        }
        if (status == 'TODAY') {
          statusFilter = {
            consultationDate: { $eq: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'UPCOMING') {
          statusFilter = {
            consultationDate: { $gt: new Date().toISOString().split('T')[0] },
            status: "APPROVED"
          }
        }
        if (status == 'PAST') {
          statusFilter = {
            consultationDate: { $lt: new Date().toISOString().split('T')[0] },
            status: "PAST"
          }
        }
        if (status == 'REJECTED') {
          statusFilter = {
            status: "REJECTED"
          }
        }

        if (status == 'APPROVED') {
          statusFilter = {
            status: "APPROVED"
          }
        }


      } else {
        statusFilter = {
          status: { $ne: 'NA' }
        }
      }

      var dateFilter = {}

      if (date && date != "" && to_date && to_date != "") {
        dateFilter = {
          consultationDate: { $gte: date, $lte: to_date },
        }
      }
      if (date && date != "" && to_date == "") {
        dateFilter = {
          consultationDate: { $gte: date },
        }
      }

      let aggregate = [
        {
          $match: {
            patientId: mongoose.Types.ObjectId(patient_portal_id),
            $and: [
              appointmentTypeFilter,
              statusFilter,
              dateFilter
            ]
          }
        },
        {
          $lookup: {
            from: 'reasonforappointments',
            localField: 'reasonForAppointment',
            foreignField: '_id',
            as: 'reasonForAppointment'
          }
        },
        { $unwind: "$reasonForAppointment" },
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'portalId'
          }
        },
        { $unwind: "$portalId" },
        {
          $project: {
            patientDetails: 1,
            portalId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            reasonForAppointment: 1,
            status: 1,
            hospital_details: 1,
            createdAt: -1,
            order_id: 1,
            portal_type: -1,
            paymentType: 1,
            appointment_complete: 1
          }
        },
      ];

      const result = await Appointment.aggregate(aggregate);
      let listArray = []
      for (const appointment of result) {

        const todayDate = new Date().toISOString().split('T')[0]

        let status = ''
        if (appointment.status === 'NEW') status = 'New'
        if (appointment.status === 'REJECTED') status = 'Rejected'
        if (appointment.status == 'PAST') status = 'Past'
        if (appointment.status == 'MISSED') status = 'Missed'
        if (appointment.status === 'APPROVED') {

          status = todayDate == appointment.consultationDate ? 'Today' : 'Upcoming'
        }
        let consultationType = ''
        if (appointment.appointmentType == 'HOME_VISIT') consultationType = 'Home Visit'
        if (appointment.appointmentType == 'ONLINE') consultationType = 'Online'
        if (appointment.appointmentType == 'FACE_TO_FACE') consultationType = 'Face to Face'

        //getting doctor profile signed url
        const basic_info = await BasicInfo.findOne(
          { for_portal_user: appointment.portalId.for_portal_user }
        ).select(
          {
            for_portal_user: 1, full_name: 1, speciality: 1,
            years_of_experience: 1
          }
        ).populate(
          { path: 'profile_picture', select: 'url' }
        ).populate(
          { path: 'in_fee_management' }
        )

        if (basic_info != null && basic_info?.profile_picture != null && basic_info?.profile_picture?.url != "") {
          const image_url = await getDocument(basic_info?.profile_picture?.url)
          basic_info.profile_picture.url = image_url ? image_url : ''
        }


        var speciality = ""

        if (basic_info?.speciality) {
          const res = await httpService.getStaging('hospital/get-speciality-data', { data: basic_info?.speciality }, {}, 'hospitalServiceUrl');
          if (res) {
            speciality = res.data[0].specilization;
          } else {
            speciality = "";
          }
        }
        listArray.push({
          appointment_id: appointment._id,
          patient_name: appointment.patientDetails.patientFullName,
          doctor_name: appointment.portalId.full_name,
          doctor_id: appointment.portalId.for_portal_user,
          hospital_name: appointment.hospital_details ? appointment.hospital_details.hospital_name : 'N/A',
          made_by: appointment.madeBy,
          consultation_date: appointment.consultationDate,
          consultation_time: appointment.consultationTime,
          consultation_type: consultationType,
          hospital_details: appointment.hospital_details,
          reason_for_appointment: appointment.reasonForAppointment.name,
          fee: appointment.consultationFee,
          order_id: appointment.order_id ? appointment.order_id : '',
          status,
          doctor_profile_url: basic_info?.profile_picture?.url ? basic_info?.profile_picture?.url : '',
          years_of_experience: basic_info?.years_of_experience,
          speciality: speciality,
          in_fee_management: basic_info?.in_fee_management,
          portal_type: appointment.portal_type,
          createdAt: appointment.createdAt,
          paymentType: appointment.paymentType,
          patieintDetailpatientId1: appointment.patientDetails.patientId,
          appointment_complete: appointment.appointment_complete
        })

      }
      sendResponse(req, res, 200, {
        status: true,
        data: listArray,
        message: `List fetched successfully.`,
        errorCode: null,
      });

    } catch (error) {
      console.log("____________________________Error", error.message);
      sendResponse(req, res, 500, {
        status: false,
        body: error.message ? error.message : error,
        message: `something went wrong while fetching list`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async portal_assignHealthcareProvider(req, res) {
    try {
      const { appointment_id, staff_id } = req.body
      await Appointment.updateOne(
        { _id: { $eq: appointment_id } },
        {
          $set: {
            assigned_staff: staff_id,
          },
        },
        { new: true }
      ).exec();
      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Healthcare provider assigned successfully.`,
        errorCode: null,
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong while assig healthcare provider`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_post_updateConsulatation(req, res) {
    try {
      const { appointment_id, columnData } = req.body

      await Appointment.findOneAndUpdate({ _id: { $eq: appointment_id } }, {
        $set: columnData
      }, { new: true }).exec();

      sendResponse(req, res, 200, {
        status: true,
        data: null,
        message: `Payment Recieved Successfully!`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error, 'error');
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong while updating appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async portal_nextAvailableSlot(req, res) {
    try {
      const {
        appointmentId
      } = req.query
      const headers = {
        'Authorization': req.headers['authorization']
      }
      var appointment = await Appointment.findOne({ _id: appointmentId })
      const portalId = appointment.portalId
      const hospitalId = appointment.hospital_details.hospital_id
      const appointmentType = appointment.appointmentType
      const portal_type = appointment.portal_type
      var timeStamp = new Date()
      var timeStampString
      var slot = null
      console.log("timeStamp-before", timeStamp);

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log("TODAY===>", timeStamp)
      console.log("TOMMORROW===>", tomorrow)

      for (let index = 0; index < 3; index++) {
        const resData = await httpService.postStaging('labimagingdentaloptical/four-portal-management-available-slots', { locationId: hospitalId, portal_id: portalId, appointmentType: appointmentType, timeStamp: timeStamp, portal_type: portal_type }, headers, 'labimagingdentalopticalServiceUrl');
        console.log("IN LOOP===>", resData)

        // timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');                          
        // timeStamp = new Date(timeStampString)
        const slots = resData?.body?.allGeneralSlot

        console.log("SLOTS===>", slots)
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
          timeStampString = moment(timeStamp, "DD-MM-YYYY").add(1, 'days');
          timeStamp = new Date(timeStampString)
        }
      }
      if (slot == null) {
        return sendResponse(req, res, 200, {
          status: true,
          body: null,
          message: `Choose appointment from calender`,
          errorCode: null,
        });
      }

      sendResponse(req, res, 200, {
        status: true,
        body: {
          slot,
          timeStamp
        },
        message: `Nearest available slot`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to get nearest available slot`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }


  }

  async portal_rescheduleAppointment(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    try {
      const {
        appointmentId,
        rescheduleConsultationDate,
        rescheduleConsultationTime,
        rescheduled_by,
        rescheduled_by_id,
      } = req.body
      var appointment = await Appointment.findOne({ _id: appointmentId })

      var newAppointmentDetails = await Appointment.findOneAndUpdate(
        { _id: appointmentId },
        {
          $set: {
            consultationDate: rescheduleConsultationDate,
            consultationTime: rescheduleConsultationTime,
            rescheduled_by,
            rescheduled_by_id
          },
        },
        { upsert: false, new: true }
      ).exec();

      var notificationCreator;
      var notificationReceiver;
      var serviceurl;
      var message;
      var portalDetails;
      if (rescheduled_by == "patient") {
        notificationCreator = appointment.patientId;
        notificationReceiver = appointment.portalId;
        serviceurl = "labimagingdentalopticalServiceUrl"
        message = `${newAppointmentDetails.patientDetails.patientFullName} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
      } else {
          notificationCreator = appointment.portalId;
          portalDetails = await PortalUser.findOne({_id: appointment.portalId})
          notificationReceiver = appointment.patientId;
          serviceurl = "patientServiceUrl"
          message = `${portalDetails?.full_name} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
      }

      // var message = `${newAppointmentDetails?.patientDetails?.patientFullName} has been reschedule the appointment from ${appointment.consultationDate, appointment.consultationTime} to  ${newAppointmentDetails.consultationDate} | ${newAppointmentDetails.consultationTime}`
      var requestData = {
          created_by_type: rescheduled_by,
          created_by: notificationCreator,
          content: message,
          url: '',
          for_portal_user: notificationReceiver,
          notitype: 'Reshedule Appointment',
          appointmentId: appointmentId
      }

      var result = await notification(newAppointmentDetails?.madeBy, notificationCreator, serviceurl, req.body.portalId, "one new appointment", "https://mean.stagingsdei.com:451", headers, requestData)
      sendResponse(req, res, 200, {
        status: true,
        body: newAppointmentDetails,
        message: `Appointment rescheduled successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to rescheduled appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_setReminder(req, res) {
    try {
      const { portalId, appointment_id, time_reminder_data, datetime_reminder_data, patientId, portal_type } = req.body
      if (portalId) {
        const checkExist = await Reminder.find({ appointment_id, portalId: portalId })
        if (checkExist.length > 0) {
          await Reminder.deleteMany({ appointment_id, portalId: portalId });
        }
      } else {
        const checkExist = await Reminder.find({ appointment_id, patientId: patientId })
        if (checkExist.length > 0) {
          await Reminder.deleteMany({ appointment_id, patientId: patientId });
        }
      }
      // const checkExist = await Reminder.find({ appointment_id })
      // if (checkExist.length > 0) {
      //   await Reminder.deleteMany({ appointment_id })
      // }
      let dataArray = [];
      for (const value of time_reminder_data) {
        if (value?.hours !== '' || value?.minutes !== '') {
        let dataObject = {
          portalId,
          appointment_id,
          patientId,
          minutes: value?.minutes,
          hours: value?.hours,
          portal_type
        }

        dataArray.push(dataObject)
        }
      }

      for (const value of datetime_reminder_data) {
        if (value.datetime !== '') {
        let dataObject = {
          portalId,
          appointment_id,
          patientId,
          datetime: value.datetime,
          portal_type
        }

        dataArray.push(dataObject)
      }
      }
      await Reminder.insertMany(dataArray)
      sendResponse(req, res, 200, {
        status: true,
        data: dataArray,
        message: `reminder set successfully`,
        errorCode: null,

      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async portal_getReminder(req, res) {
    try {
      const { appointment_id ,portalId,patientId} = req.query
      // const result = await Reminder.find({ appointment_id })
      let result;
      if(portalId){
          result = await Reminder.find({ appointment_id,portalId:portalId })
      }else{
          result = await Reminder.find({ appointment_id,patientId:patientId })
      }
      let dataArray = {}
      let time_reminder_data = []
      let datetime_reminder_data = []

      for (const data of result) {
        if (data.minutes) {
          time_reminder_data.push({
            minutes: data.minutes,
            hours: data.hours
          })
        }
        if (data.datetime) {
          datetime_reminder_data.push({
            datetime: data.datetime
          })
        }
      }
      if (result.length > 0) {
        dataArray.appointment_id = result[0].appointment_id
        dataArray.portalId = result[0].portalId
        dataArray.patientId = result[0].patientId
        dataArray.time_reminder_data = time_reminder_data
        dataArray.datetime_reminder_data = datetime_reminder_data
        // dataArray.portal_type = portal_type

      }
      sendResponse(req, res, 200, {
        status: true,
        data: { data: dataArray },
        message: `reminder get successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("error====", error);
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `something went wrong`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async fourportal_sendReminderNotifications(req, res) {
    try {
      const reminders = await Reminder.find({ status: 0 });

      for (let reminder of reminders) {
        let appointmentDetails = await Appointment.findOne({ _id: reminder?.appointment_id });
        if (appointmentDetails) {
          var consultationDate = new Date(appointmentDetails?.consultationDate);
          var consultationTime = appointmentDetails?.consultationTime;
          var startTime = consultationTime.split('-')[0].trim();

          if (!reminder?.datetime) {
            var notificationMinutesBefore = reminder?.minutes || 0;
            if (reminder?.hours) {
              notificationMinutesBefore += reminder?.hours * 60;
            }
            var formattedDateTime = moment(consultationDate).format("YYYY-MM-DD") + " " + startTime;
            console.log("formattedDateTime", formattedDateTime);

            // var notificationTime = moment(formattedDateTime).subtract(notificationMinutesBefore, 'minutes');
            var notificationTime = new Date(moment(formattedDateTime).subtract(notificationMinutesBefore, 'minutes'));
            console.log("notificationTime", notificationTime)
          } else {
            var formattedDateTime = moment(consultationDate).format("YYYY-MM-DD") + " " + startTime;
            console.log("formattedDateTime", formattedDateTime);

            // var notificationTime = moment(reminder?.datetime)
            var notificationTime = new Date(moment(reminder?.datetime))
            console.log("notificationTime", notificationTime)

            if (!isNaN(notificationTime.getTime())) {
              var formattedDateTimeTimestamp = new Date(formattedDateTime).getTime();
              var notificationTimeTimestamp = notificationTime.getTime();

              var differenceInMilliseconds = notificationTimeTimestamp - formattedDateTimeTimestamp;
              var notificationMinutesBefore = Math.abs(differenceInMilliseconds / (1000 * 60));
            }
          }

          // Compare notification time with current time
          // var currentTime = new Date(moment().utcOffset("+05:30").format())
          var currentTime = new Date(moment());
          console.log("currentTime_________", currentTime)

          if (notificationTime <= currentTime) {
            var message = `Your Appointment Scheduled on ${appointmentDetails?.consultationDate}|${appointmentDetails?.consultationTime} is starting in ${notificationMinutesBefore} minutes`
            if (reminder?.portalId) {
              var requestData = {
                created_by_type: appointmentDetails?.portal_type,
                created_by: reminder?.portalId,
                content: message,
                url: '',
                for_portal_user: reminder?.portalId,
                notitype: 'Appointment Reminder',
                appointmentId: reminder?.appointment_id
              }
              var result = await notification(appointmentDetails?.madeBy, reminder?.portalId, "labimagingdentalopticalServiceUrl", appointmentDetails?.portalId, "reminder for appointment", "https://mean.stagingsdei.com:451", {}, requestData)

              var modifiedresult = await Reminder.updateOne(
                { _id: reminder?._id },
                { status: 1 },
                { new: true }
              ).exec();
            } else {
              var requestData = {
                created_by_type: "patient",
                created_by: reminder?.patientId,
                content: message,
                url: '',
                for_portal_user: reminder?.patientId,
                notitype: 'Appointment Reminder',
                appointmentId: reminder?.appointment_id
              }
              var result = await notification('patient', reminder?.patientId, "patientServiceUrl", reminder?.patientId, "reminder for appointment", "https://mean.stagingsdei.com:451", {}, requestData)

              var modifiedresult = await Reminder.updateOne(
                { _id: reminder?._id },
                { status: 1 },
                { new: true }
              ).exec();
            }
          } else {
            console.log("No need to send notification");
          }
        }
      }
    } catch (error) {
      console.error('Error sending reminder notifications:', error);
    }
  }

  //Assessment
  async portal_addAssessment(req, res) {
    try {
      const {
        assessments,
        appointmentId
      } = req.body
      var result
      const assessmentDetails = await Assessment.findOne({ appointmentId })
      if (assessmentDetails) {
        result = await Assessment.findOneAndUpdate(
          { _id: assessmentDetails._id },
          {
            $set: {
              assessments
            }
          },
          { new: true }
        )
      } else {
        const assessment = new Assessment({
          assessments,
          appointmentId
        })
        result = await assessment.save()
      }
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully add assessment",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to add assessment",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  async portal_assessmentList(req, res) {
    try {
      const {
        appointmentId
      } = req.query
      const result = await Assessment.findOne({ appointmentId })
      console.log("result====", result)
      sendResponse(req, res, 200, {
        status: true,
        body: result,
        message: "Successfully get assessment",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: "failed to get assessment",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }




  async portal_UpdateVideocallAppointment(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const {
        appointmentId,
        callstatus,
        roomName,
        callerId,
        roomDate,
        participants,
        participantstype,
        leftparticipantsid,
        participantuserId,
        isAudioMuted,
        isVideoMuted
      } = req.body
      var appointmentDetails
      // console.log(participants);
      if (participantuserId != undefined) {
        appointmentDetails = await Appointment.findOneAndUpdate(
          { "participants.userId": participantuserId },
          {
            $set: {
              "participants.$.isAudioMuted": isAudioMuted,
              "participants.$.isVideoMuted": isVideoMuted,
            },
          },
          { new: true }
        );
      }
      else {
        if (participants != undefined) {
          console.log(participants);
          console.log(participantstype);
          console.log(appointmentId);

          if (participantstype == 'add') {
            appointmentDetails = await Appointment.findOneAndUpdate(
              { _id: appointmentId },
              { $push: { participants: participants } },
              { new: true }
            );
          }
          else {
            appointmentDetails = await Appointment.findOneAndUpdate(
              { _id: appointmentId },
              {
                $pull: {
                  participants: {
                    userId: mongoose.Types.ObjectId(leftparticipantsid),
                  },
                },
              },
              { new: true }
            );
          }
        }
        else {
          appointmentDetails = await Appointment.findOneAndUpdate(
            { _id: appointmentId },
            {
              $set: {
                callstatus,
                roomName,
                callerId,
                roomDate
              },
            },

            { upsert: false, new: true }
          ).exec();
        }
      }

      sendResponse(req, res, 200, {
        status: true,
        body: appointmentDetails,
        message: `Appointment updated successfully`,
        errorCode: null,
      });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to add appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async portal_updateVideocallchatmessage(req, res) {
    const headers = {
      'Authorization': req.headers['authorization']
    }

    try {
      const {
        appointmentId,
        chatmessage,
      } = req.body
      var appointmentDetails
      if (chatmessage != undefined) {
        appointmentDetails = await Appointment.findOneAndUpdate(
          { _id: appointmentId },
          { $push: { chatmessage: chatmessage } },
          { new: true }
        );

      }
      sendResponse(req, res, 200, {
        status: true,
        body: appointmentDetails,
        message: `Appointment updated successfully`,
        errorCode: null,
      });

    } catch (error) {
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: `failed to add appointment`,
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }


  async portal_participantInfo(req, res) {
    try {
      let getData = await Appointment.findOne({
        roomName: req.query.roomName,
        participants: {
          $elemMatch: { userIdentity: req.query.identity },
        },
      })
      if (getData.participants) {
        getData.participants.forEach(async (ele) => {
          let audioFlag;
          let videoFlag;
          if (ele.userIdentity == req.query.identity) {

            return sendResponse(req, res, 200, {
              status: true,
              body: ele,
              message: "Data Done",
              errorCode: null,
            });

          }
        });
      }
      else {
        return sendResponse(req, res, 200, {
          status: false,
          body: null,
          message: "Data Failed",
          errorCode: "Something went wrong",
        });
      }
    } catch (e) {
      console.log("e--------", e);
      return sendResponse(req, res, 500, {
        status: false,
        body: null,
        message: e.errorCode,
        errorCode: "Something went wrong",
      });
    }
  }

  async fetchAppointmentDetails(req, res) {
    try {
      const { for_order_id, for_portal_user } = req.body;
      const headers = {
        'Authorization': req.headers['authorization']
      }
      const orderData = await Appointment.findOne({ _id: for_order_id, for_portal_user }).lean();
      const patientId = orderData.patient_details.user_id

      const patientDetails = await httpService.getStaging('patient/patient-common-details', { patientId: patientId }, headers, 'patientServiceUrl');
      console.log("patientDetails", patientDetails);
      const pharmacyDetails = await BasicInfo.findOne({ for_portal_user }, { pharmacy_name: 1, address: 1, mobile_phone_number: 1, profile_picture: 1 })
        .populate({
          path: "for_portal_user",
          select: ("email")
        })
      var pharmacyProfile
      if (pharmacyDetails.profile_picture != "" && pharmacyDetails.profile_picture != undefined) {
        const headers = {
          Authorization: req.headers["authorization"],
        };
        const profilePictureArray = [pharmacyDetails.profile_picture];
        const profile_picdata = await httpService.postStaging(
          "pharmacy/get-signed-url",
          { url: profilePictureArray },
          headers,
          "pharmacyServiceUrl"
        );
        pharmacyProfile = profile_picdata.data[0]
        console.log("profile_picdata", profile_picdata);
        pharmacyDetails.profile_picture = profile_picdata;
      }

      const medicineDetails = await MedicineDetail.find({ for_order_id, for_portal_user }).lean();
      const medicineIDArray = []
      var getMedicines = {
        body: null
      }
      if (medicineDetails.length > 0) {
        for (const medicine of medicineDetails) {
          medicineIDArray.push(medicine.medicine_id)
        }
        getMedicines = await httpService.postStaging('superadmin/get-all-medicine-byits-id', { medicineIds: medicineIDArray }, headers, 'superadminServiceUrl');
      }

      const medicineBill = await MedicineBill.findOne({ for_order_id, for_portal_user }).lean();
      if (medicineBill != null) {
        const urlArray = await DocumentInfo.find({ _id: { $in: medicineBill.prescription_url } }).select('url').exec();
        let prescriptionUrlArray = [];
        for (const data of urlArray) {
          let signedUrl = await getDocument(data.url)
          prescriptionUrlArray.push(signedUrl)
        }
        medicineBill.prescription_url = prescriptionUrlArray
      }
      sendResponse(req, res, 200, {
        status: true,
        data: {
          orderData,
          medicineDetails,
          medicineBill,
          medicineNameObject: getMedicines.body,
          patientDetails: patientDetails.body,
          pharmacyDetails,
          pharmacyProfile
        },
        message: "successfully fetched order details",
        errorCode: null,
      });
    } catch (error) {
      console.log(error);
      sendResponse(req, res, 500, {
        status: false,
        data: error,
        message: "failed to fetch order details",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async totalCountforAppointmentHospitalDashboard(req, res) {
    var { hospital_id, dateFilter, filterDateWise , yearFilter} = req.query;
    try {
 
      let dateWiseFilter = {};
      // if (dateFilter !== '') {
      //   dateWiseFilter = {
      //     'appointments.createdAt': {
      //       $lte: new Date(dateFilter).toISOString()
      //     }
      //   };
      // }
      if (dateFilter && !isNaN(Date.parse(dateFilter))) {
        let chooseDate = new Date(dateFilter).toISOString()
                dateWiseFilter = {
                    "appointments.createdAt": {
                        $lte: new Date(`${chooseDate}`)
                    }
                };
 
                console.log(dateWiseFilter, "lllllllllllllllllllllll");
      }
      else if (yearFilter && !isNaN(yearFilter)) {
        let chosenYear = parseInt(yearFilter);
 
        // Construct the start and end dates of the chosen year
        let startDate = new Date(`${chosenYear}-01-01T00:00:00.000Z`).toISOString();
        let endDate = new Date(`${chosenYear + 1}-01-01T00:00:00.000Z`).toISOString();
 
        // Assign the dateWiseFilter to filter appointments within the chosen year
        dateWiseFilter = {
            "appointments.createdAt": {
                $gte: startDate,
                $lt: endDate
            }
        };
    }
      else {
        console.log("Invalid date format or empty dateFilter.");
      }
 
      let currentYear = moment().year();
      if (filterDateWise !== '' && filterDateWise != undefined) {
        if (filterDateWise === 'yearly') {
          dateWiseFilter = {
            'appointments.consultationDate': {
              $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString(),
              $lt: new Date(`${Number(currentYear) + 1}-01-01T00:00:00.000Z`).toISOString()
            }
          };
        } else if (filterDateWise === 'monthly') {
          dateWiseFilter = {
            'appointments.consultationDate': {
              $gte: moment().startOf('month').toDate().toISOString(),
              $lt: moment().endOf('month').toDate().toISOString()
            }
          };
        } else {
          dateWiseFilter = {
            'appointments.consultationDate': {
              $gte: moment().startOf('week').toDate().toISOString(),
              $lt: moment().endOf('week').toDate().toISOString()
            }
          };
        }
      }
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL', 'INDIVIDUAL'] },
        'for_portal_user.isDeleted': false,
        // for_hospital: mongoose.Types.ObjectId(hospital_portal_id),
        for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
      };
      let aggregate = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $lookup: {
            from: "appointments",
            localField: "for_portal_user._id",
            foreignField: "portalId",
            as: "appointments",
          }
        },
        { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            appointments: "$appointments"
          }
        }
      ];
 
      if (Object.keys(dateWiseFilter).length !== 0) {
        aggregate.push({
            $match: dateWiseFilter
        });
    }
      const totalCount = await BasicInfo.aggregate(aggregate);
      const result = await BasicInfo.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: { data: result, totalFourPortalCount: totalCount.length },
        message: `hospital doctor fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("ygyerror________", error)
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }

  async patientPaymentHistoryToFourPortal(req, res) {
    try {
      const {
        four_portal_id,
        searchTextP,
        searchTextD,
        appointmentStatus,
        appointmentStartDate,
        appointmentEndDate,
        limit,
        page,
        type
      } = req.query;
      const headers = {
        'Authorization': req.headers['authorization']
      }
      console.log(req.query, "queryyyy_______");

      let filter = [{}]
      let appointmentStatus_filter = {}
      let appointment_filter = {}

      if (searchTextD !== "") {
        filter =
          [
            { 'doctorDetails.full_name': { $regex: searchTextD || '', $options: 'i' } },
          ]
      }
      if (searchTextP !== "") {
        filter =
          [
            { 'patientDetails.patientFullName': { $regex: searchTextP || '', $options: 'i' } },
          ]
      }

      if (appointmentStatus !== '') {
        appointmentStatus_filter = {
          'status': appointmentStatus
        }
      }

      if (appointmentStartDate !== '' && appointmentEndDate !== '') {
        appointment_filter = {
          'consultationDate': {
            $gte: new Date(appointmentStartDate).toISOString(),
            $lte: new Date(appointmentEndDate).toISOString()
          }
        };
      }

      var FourPortalId = Array.isArray(four_portal_id) ? four_portal_id.map(s => mongoose.Types.ObjectId(s)) : [mongoose.Types.ObjectId(four_portal_id)];

      let aggregate = [
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            portalId: { $in: FourPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL"] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
            portal_type: type
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            portalId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
            type: 1,
            order_id: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 },
        {
          $match: {
            $and: [
              appointmentStatus_filter,
              { $or: filter },
              appointment_filter
            ]
          }
        }
      ];

      const totalResult = await Appointment.aggregate([
        {
          $lookup: {
            from: 'basicinfos',
            localField: 'portalId',
            foreignField: 'for_portal_user',
            as: 'doctorDetails'
          }
        },
        { $unwind: "$doctorDetails" },
        {
          $match: {
            portalId: { $in: FourPortalId },
            madeBy: { $in: ['patient', "INDIVIDUAL"] },
            appointmentType: { $in: ['ONLINE', 'FACE_TO_FACE', 'HOME_VISIT'] },
            isPaymentDone: true,
            portal_type: type
          }
        },
        {
          $project: {
            patientDetails: 1,
            patientId: 1,
            madeBy: 1,
            consultationDate: 1,
            consultationTime: 1,
            appointmentType: 1,
            consultationFee: 1,
            paymentDetails: 1,
            reasonForAppointment: 1,
            status: 1,
            paymentMode: 1,
            portalId: 1,
            hospital_details: 1,
            doctorDetails: 1,
            createdAt: 1,
            type: 1,
            order_id: 1
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $match: {
            $and: [
              appointmentStatus_filter,
              { $or: filter },
              appointment_filter
            ]
          }
        }
      ]);
      let totalCount = totalResult.length;
      let totalAmount = 0;

      for (let totalRevenue of totalResult) {
        totalAmount = totalAmount + Number(totalRevenue.paymentDetails.doctorFees)
      }
      // console.log(totalResult.length, "totalResultstoryyy______");

      const paymentHistory = await Appointment.aggregate(aggregate);
      // console.log("paymentHistory____________", paymentHistory)

      sendResponse(req, res, 200, {
        status: true,
        data: {
          paymentHistory: paymentHistory,
          totalCount: totalCount, totalAmount: totalAmount
        },
        message: "Payment History Fetched successfully!",
        errorCode: null,
      });
    } catch (error) {
      console.log(error, "errorrrrrrr______");
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Failed to Fetch Payment History.",
        errorCode: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async hospitalPaymentHistory(req, res) {
    var { hospital_id, searchTextP, searchTextD, appointmentStatus, appointmentStartDate, appointmentEndDate } = req.query;
    try {
      var filter = {
        'for_portal_user.role': { $in: ['HOSPITAL', 'INDIVIDUAL'] },
        'for_portal_user.isDeleted': false,
        for_hospitalIds: { $in: [mongoose.Types.ObjectId(hospital_id)] }
      };

      let searchFilter;
      if (searchTextD !== "") {
        searchFilter = { full_name: { $regex: searchTextD || "", $options: "i" } }
      }

      let searchFilterPatient;
      if (searchTextP !== "") {
        searchFilterPatient = { 'appointments.patientDetails.patientFullName': { $regex: searchTextP || "", $options: "i" } }
      }

      let appointmentStatus_filter = {}
      if (appointmentStatus !== '') {
        appointmentStatus_filter = {
          'appointments.status': appointmentStatus
        }
      }

      let appointment_filter = {}
      if (appointmentStartDate !== '' && appointmentEndDate !== '') {
        appointment_filter = {
          'appointments.consultationDate': {
            $gte: new Date(appointmentStartDate).toISOString(),
            $lte: new Date(appointmentEndDate).toISOString()
          }
        };
      }

      let aggregate = [
        {
          $lookup: {
            from: "portalusers",
            localField: "for_portal_user",
            foreignField: "_id",
            as: "for_portal_user",
          }
        },
        { $unwind: { path: "$for_portal_user", preserveNullAndEmptyArrays: true } },
        { $match: filter },
        {
          $lookup: {
            from: "appointments",
            localField: "for_portal_user._id",
            foreignField: "portalId",
            as: "appointments",
          }
        },
        { $unwind: { path: "$appointments", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            appointments: { $exists: true, $ne: [] } // Filter out records without appointments
          }
        },
        // {
        //   $match: appointment_filter
        // },
        // {
        //   $match: appointmentStatus_filter
        // },
        // {
        //   $match: searchFilterPatient || {}
        // },
        {
          $match: {
            $and: [
              appointment_filter,
              appointmentStatus_filter,
              searchFilterPatient || {}      // Filter based on searchFilterPatient
            ]
          }
        },
        {
          $project: {
            full_name: 1,
            // appointments: "$appointments",
            patientDetails: "$appointments.patientDetails",
            patientId: "$appointments.patientId",
            madeBy: "$appointments.madeBy",
            consultationDate: "$appointments.consultationDate",
            consultationTime: "$appointments.consultationTime",
            appointmentType: "$appointments.appointmentType",
            consultationFee: "$appointments.consultationFee",
            paymentDetails: "$appointments.paymentDetails",
            status: "$appointments.status",
            paymentMode: "$appointments.paymentMode",
            portalId: "$appointments.portalId",
            hospital_details: "$appointments.hospital_details",
            portal_type: "$appointments.portal_type",
            createdAt: "$appointments.createdAt",
          }
        },
        {
          $match: {
            paymentDetails: { $ne: null }
          }
        },
        {
          $match: searchFilter || {}
        }
      ];

      const totalCount = await BasicInfo.aggregate(aggregate);
      const result = await BasicInfo.aggregate(aggregate);
      sendResponse(req, res, 200, {
        status: true,
        data: { data: result, totalFourPortalCount: totalCount.length },
        message: `hospital doctor fetched successfully`,
        errorCode: null,
      });
    } catch (error) {
      console.log("ygyerror________", error)
      sendResponse(req, res, 500, {
        status: false,
        body: error,
        message: "Internal server error",
        errorCode: null,
      });
    }
  }
}
export const portal_viewAppointmentByRoomName = async (req, res) => {
  try {
    const { roomname, appointment_id, portal_type } = req.query
    var result = {}
    if (appointment_id == undefined) {
      result = await Appointment.findOne({ roomName: roomname, portal_type })

    }
    else {
      result = await Appointment.findOne({ _id: appointment_id, portal_type })

    }
    console.log("APPPP RESSSSS___________", result);
    let userinfodetails = []
    if (result?.users) {
      userinfodetails = result.users;
    }
    let participantsinfodetails = []
    if (result?.participants) {
      participantsinfodetails = result.participants;
    }
    let roomdetails = {
      roomName: result.roomName,
      callstatus: result.callstatus,
      callerId: result.callerId,
      roomDate: result.roomDate,
      appointmentId: result._id,
    }
    sendResponse(req, res, 200, {
      status: true,
      data: { roomdetails, userinfodetails, participantsinfodetails },
      message: `Appointment details Fetched!`,
      errorCode: null,
    });
  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: error.message,
      errorCode: error.code,
    });
  }

}

export const viewAppointmentByRoomName = async (req, res) =>{
  try {
    const headers = {
      'Authorization': req.headers['authorization']
    }
    const { roomname, appointment_id } = req.query
    var result = {}
    if (appointment_id == undefined) {
      result = await Appointment.findOne({ roomName: roomname })

    }
    else {
      result = await Appointment.findOne({ _id: appointment_id })

    }


    let userinfodetails = []
    if (result?.users) {
      userinfodetails = result.users;
    }
    let participantsinfodetails = []
    if (result?.participants) {
      participantsinfodetails = result.participants;
    }
    let roomdetails = {
      roomName: result.roomName,
      callstatus: result.callstatus,
      callerId: result.callerId,
      roomDate: result.roomDate,
      appointmentId: result._id
    }

    sendResponse(req, res, 200, {
      status: true,
      data: { roomdetails, userinfodetails, participantsinfodetails },
      message: `patient appointment fetched successfully`,
      errorCode: null,
    });
  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: error.message,
      errorCode: error.code,
    });
  }
}

export const viewAppointmentCheck = async (req, res)=> {
  try {
    const { appointment_id } = req.query
    var result = {}
   
    result = await Appointment.findOne({ _id: appointment_id,status: "APPROVED" })
    if(result){
      sendResponse(req, res, 200, {
        status: true,
        data: { appointment_id:appointment_id  },
        message: `patient appointment fetched successfully`,
        errorCode: null,
      });
    }
    else{
      sendResponse(req, res, 500, {
        status: false,
        body: "Appointment not found.",
        message: "Appointment not found."
      });
    }
    
  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: error.message,
      errorCode: error.code,
    });
  }
}

export const updateUnreadMessage = async (req, res)=> {
  try {
    const user_id = req.query.id;
    const headers = {
      'Authorization': req.headers['authorization']
    }

    const result = await Appointment.findOneAndUpdate(
      { 
        _id: chatId,
        'chatmessage.receiver.id': user_id,
        'chatmessage.receiver.read': true
    },
    { $set: { 'chatmessage.$[elem].receiver.$[innerElem].read': false } },
    { 
        new: true,
        arrayFilters: [
            { 'elem.receiver.id': user_id },
            { 'innerElem.read': true }
        ]
    }
    );

    sendResponse(req, res, 200, {
      status: true,
      data: { result : result},
      message: `Message field updated fetched successfully`,
      errorCode: null,
    });
  } catch (error) {
    sendResponse(req, res, 500, {
      status: false,
      body: error,
      message: error.message,
      errorCode: error.code,
    });
  }
}