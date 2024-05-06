import mongoose from 'mongoose';
import 'dotenv/config.js';
const NODE_ENV = process.env.NODE_ENV || "local"; //local

const config = require("../config/config.js").get();
const { DB } = config;
console.log(DB,"======================================>123");
var options = {};
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

const MONGOURI = `mongodb://${DB.HOST}:${DB.PORT}/${DB.DATABASE}`;
console.log(MONGOURI, "MONGOURI");
const InitiateMongoServer = async () => {
    try {
        console.log(MONGOURI, "MONGOURI");
        mongoose.set('strictQuery', true);
        await mongoose.connect(MONGOURI, options);
        console.log("Connected to pharmacy DB !!", MONGOURI);
    } catch (e) {
        console.log(e);
        throw e;
    }
};

module.exports = InitiateMongoServer;
