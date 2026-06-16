const path = require("path");
require("dotenv").config({ path: path.resolve(".env") });
require("dotenv").config({ path: path.resolve("utils/.env") });
const cloudinary = require("./config/cloudinary");

console.log("CONFIG", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: Boolean(cloudinary.config().api_key),
  api_secret: Boolean(cloudinary.config().api_secret),
});

cloudinary.uploader
  .upload(path.resolve("uploads/profiles/1781385085443-791898822.jpg"), {
    folder: "CanchaYa/perfiles",
  })
  .then((result) => {
    console.log("UPLOAD_OK", result.secure_url);
  })
  .catch((err) => {
    console.error("UPLOAD_ERR", err && err.message ? err.message : err);
    console.error("UPLOAD_ERR_FULL", err);
    process.exitCode = 1;
  });
