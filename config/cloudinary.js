const cloudinary = require('cloudinary').v2;
const config = require('config');

const cloud_name = config.has('CLOUDINARY_CLOUD_NAME')
  ? config.get('CLOUDINARY_CLOUD_NAME')
  : process.env.CLOUDINARY_CLOUD_NAME;
const api_key = config.has('CLOUDINARY_API_KEY')
  ? config.get('CLOUDINARY_API_KEY')
  : process.env.CLOUDINARY_API_KEY;
const api_secret = config.has('CLOUDINARY_API_SECRET')
  ? config.get('CLOUDINARY_API_SECRET')
  : process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloud_name,
  api_key: api_key,
  api_secret: api_secret,
});

module.exports = cloudinary;
