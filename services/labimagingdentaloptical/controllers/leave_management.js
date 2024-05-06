import { sendResponse } from "../helpers/transmission";
import mongoose from "mongoose";
import LeaveManagements from "../models/leave_management";

// Add leave
export const addLeaves = async (req, res) => {
  const {
    role,
    type,
    leave_type,
    subject,
    reason,
    from_date,
    to_date,
    created_by,
    for_user,
    status,
    sent_to,
  } = req.body;

  try {
    let result = new LeaveManagements({
      role,
      type,
      leave_type,
      subject,
      reason,
      from_date,
      to_date,
      created_by,
      for_user,
      status,
      sent_to,
    });
    const resObject = await result.save();

    sendResponse(req, res, 200, {
      status: true,
      message: "Add leave successfully",
      errorCode: null,
      result: resObject,
    });
  } catch (error) {
    console.log("error", error);
    sendResponse(req, res, 500, {
      status: false,
      body: null,
      message: "failed to add leave",
      errorCode: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const getAllStaffLeave_instaffPortal = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = value;
    } else {
      sortingarray["createdAt"] = -1;
    }
    const filter = {};
    // const filterDate = {};

    // if (searchKey && searchKey !== "") {
    //   filter.$or = [{ leave_type: { $regex: searchKey } }];
    // }
    if (searchKey && typeof searchKey === "string" && searchKey.trim() !== "") {
      filter["$or"] = [
        {
          leave_type: { $regex: searchKey, $options: "i" },
        },
        {
          subject: { $regex: searchKey, $options: "i" },
        },
        {
          reason: { $regex: searchKey, $options: "i" },
        },
      ];
    }

    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }

    const listdata = await LeaveManagements.find({
      created_by: mongoose.Types.ObjectId(req.query.created_by),
      ...filter,
      ...dateFilter,
    })
      .sort(sortingarray)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await LeaveManagements.countDocuments({created_by: mongoose.Types.ObjectId(req.query.created_by),
      ...filter,
      ...dateFilter,});
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
};

export const getallStaffLeavesInfourPortal = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray["createdAt"] = -1; // Sort by createdAt in descending order
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role: "STAFF",
      ...dateFilter,
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "staffprofiles",
          localField: "created_by",
          foreignField: "for_portal_user",
          as: "StaffData",
        },
      },
      { $unwind: "$StaffData" },
    ];
    
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "StaffData.full_name": { $regex: searchKey || "", $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagements.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagements.aggregate(aggregate);
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
};

export const FourPortalStaffLeaveAccept = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagements.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Updated",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Accepted",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    console.log("e", e);
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const FourPortalStaffLeaveReject = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagements.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const getAllMyLeaveFourPortal = async (req, res) => {
  try {
    const {
      for_portal_user,
      page,
      limit,
      searchKey,
      createdDate,
      updatedDate,
    } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = value;
    } else {
      sortingarray["createdAt"] = -1;
    }
    const filter = {};

    if (searchKey != "") {
      filter["$or"] = [
        {
          leave_type: { $regex: searchKey, $options: "i" },
        },
        {
          subject: { $regex: searchKey || "", $options: "i" } ,
        },
        {
          reason: { $regex: searchKey || "", $options: "i" } 
        }
      ];
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }

    const listdata = await LeaveManagements.find({
      created_by: for_portal_user,
      ...filter,
      ...dateFilter,
    })
      .sort(sortingarray)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await LeaveManagements.countDocuments({
      created_by: for_portal_user,
      ...filter,
      ...dateFilter,
    });

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
};

export const getAllLaboratoryLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray["for_portal_user.createdAt"] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role: "INDIVIDUAL",
      type: "Laboratory-Imaging",
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "portalusers",
          localField: "created_by",
          foreignField: "_id",
          as: "DoctorData",
        },
      },
      { $unwind: "$DoctorData" },
      {
        $addFields: {
          full_name: "$DoctorData.full_name",
        },
      },
    ];
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "DoctorData.full_name": { $regex: searchKey || "", $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagements.aggregate(aggregate);
    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagements.aggregate(aggregate);
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
};

export const getAllDentalLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray["for_portal_user.createdAt"] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role: "INDIVIDUAL",
      type: "Dental",
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "portalusers",
          localField: "created_by",
          foreignField: "_id",
          as: "DoctorData",
        },
      },
      { $unwind: "$DoctorData" },
    ];
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "DoctorData.full_name": { $regex: searchKey || "", $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }
    const totalCount = await LeaveManagements.aggregate(aggregate);
    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagements.aggregate(aggregate);
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
};

export const getAllOpticalLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray["for_portal_user.createdAt"] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role: "INDIVIDUAL",
      type: "Optical",
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "portalusers",
          localField: "created_by",
          foreignField: "_id",
          as: "DoctorData",
        },
      },
      { $unwind: "$DoctorData" },
    ];
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "DoctorData.full_name": { $regex: searchKey || "", $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagements.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagements.aggregate(aggregate);

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
};

export const getAllParaMedicalLeave = async (req, res) => {
  try {
    const { page, limit, searchKey, createdDate, updatedDate } = req.query;
    var sort = req.query.sort;
    var sortingarray = {};
    if (sort != "undefined" && sort != "" && sort != undefined) {
      var keynew = sort.split(":")[0];
      var value = sort.split(":")[1];
      sortingarray[keynew] = Number(value);
    } else {
      sortingarray["for_portal_user.createdAt"] = -1;
    }
    var dateFilter = {};
    if (createdDate && createdDate !== "") {
      const createdDateObj = new Date(createdDate);
      const updatedDateObj = new Date(updatedDate);
      dateFilter.createdAt = { $gte: createdDateObj, $lte: updatedDateObj };
      // myFilter.createdAt = { $lte: updatedDateObj };
    }
    const filter = {
      sent_to: mongoose.Types.ObjectId(req.query.sent_to),
      role: "INDIVIDUAL",
      type: "Paramedical-Professions",
      ...dateFilter,
      // status:"0"
    };

    let aggregate = [
      { $match: filter },
      {
        $lookup: {
          from: "portalusers",
          localField: "created_by",
          foreignField: "_id",
          as: "DoctorData",
        },
      },
      { $unwind: "$DoctorData" },
    ];
    if (searchKey && searchKey !== "") {
      filter["$or"] = [
        { leave_type: { $regex: searchKey || "", $options: "i" } },
        { "DoctorData.full_name": { $regex: searchKey || "", $options: "i" } },
        { subject: { $regex: searchKey || "", $options: "i" } },
        { reason: { $regex: searchKey || "", $options: "i" } }
      ];
    }

    const totalCount = await LeaveManagements.aggregate(aggregate);

    aggregate.push(
      { $sort: sortingarray },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 }
    );
    const listdata = await LeaveManagements.aggregate(aggregate);

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
};

export const fourPortalLeaveAcceptInDoctor = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagements.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Updated",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Accepted",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    console.log("e", e);
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};

export const fourPortalLeaveRejectInDoctor = async (req, res) => {
  try {
    let jsondata = {
      status: req.body.status,
    };
    const result = await LeaveManagements.updateOne(
      { _id: mongoose.Types.ObjectId(req.body._id) },
      { $set: jsondata },
      { new: true }
    );
    if (!result) {
      sendResponse(req, res, 400, {
        status: false,
        message: "Do not Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    } else {
      sendResponse(req, res, 200, {
        status: true,
        message: "Successfully Leave Reject",
        errorCode: null,
        result: result,
      });
    }
  } catch (e) {
    res.send({
      status: false,
      messgae: "Oops!! something went wrong",
    });
  }
};
