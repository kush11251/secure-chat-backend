const { cloudinary } = require('../config/cloudinary');

async function uploadToCloudinary(file, folder = 'secure-chat') {
  const res = await cloudinary.uploader.upload(file, { folder, resource_type: 'auto', overwrite: false });
  return { url: res.secure_url, publicId: res.public_id, bytes: res.bytes, format: res.format, width: res.width, height: res.height, duration: res.duration };
}

module.exports = { uploadToCloudinary };
