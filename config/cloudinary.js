const cloudinary = require('cloudinary').v2;
const config = require('config');
const name = config.get('CLOUDINARY_CLOUD_NAME');
const key = config.get('CLOUDINARY_API_KEY');
const secret = config.get('CLOUDINARY_API_SECRET');

cloudinary.config({
  cloud_name: name,
  api_key: key,
  api_secret: secret,
});

module.exports = cloudinary;
