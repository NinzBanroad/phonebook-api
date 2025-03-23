const mongoose = require('mongoose');
const config = require('config');
const db = config.has('mongoURI')
  ? config.get('mongoURI')
  : process.env.mongoURI;

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
