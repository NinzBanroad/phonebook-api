const mongoose = require('mongoose');
const config = require('config');
require('dotenv').config();

const db = process.env.mongoURI;

const connectDB = async () => {
  try {
    await mongoose.connect(db);

    console.log('Successfully Connected to MongoDB Database');
  } catch (err) {
    console.error(err.message);
    //exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
