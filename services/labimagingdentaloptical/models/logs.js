import mongoose, { now, Schema } from "mongoose";
const counterSchema = new mongoose.Schema(
    {
        userName: {
            type: String,
        },
        userId: {
            type: String,
        },  
        adminData : {
            adminId: {
                type: String,
            },
            adminName:  {
                type: String,
            },
            hospitalName: {
                type: String,
            }
        }, 
        userAddress : {
            type: String,
        },     
        ipAddress :{
            type: String,
        },
        loginDateTime :{
            type: String,
        },
        logoutDateTime :{
            type: String,
        }   
    },  { timestamps: true }
);



export default mongoose.model("Logs", counterSchema);