const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "CanchaYa/perfiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

module.exports = multer({ storage });
