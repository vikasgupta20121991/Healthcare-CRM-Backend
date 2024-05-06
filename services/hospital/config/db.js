import "dotenv/config.js";
import mongoose from "mongoose";
import { config } from "./constants";

const NODE_ENV = process.env.NODE_ENV || "local";
const { DB } = config;
var options = {};
console.log(NODE_ENV, "check node env");
if (NODE_ENV == "local") {
  options = {
    user: '',
    pass: '',
  };
} else {
  options = {
    user: DB.USERNAME,
    pass: DB.PASSWORD,
  };
}
// const options = {
//   user: DB.USERNAME,
//   pass: DB.PASSWORD,
// };
const MONGOURI = `mongodb://${DB.HOST}:${DB.PORT}/${DB.DATABASE}`;
console.log(MONGOURI, "MONGOURI");
const InitiateMongoServer = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGOURI, options);
    console.log("Connected to hospital DB !!", MONGOURI);
  } catch (e) {
    console.log(e);
    throw e;
  }
};

module.exports = InitiateMongoServer;
