const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/userModels"); //get from the tourModel
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users");
//   },
//   filename: (req, file, cb) => {
//     // format will be: user-userId-timestamp
//     const ext = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// }); //how we want to store our file (name and destination)
const multerStorage = multer.memoryStorage(); //will be storage as a buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(
      new AppError("Not an image. Please, only upload images here", 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
}); // Remember that the images are not stored in the database. It's stored in our file system and we reference it
//with a link in DB.

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // If there is no req.file (meaning there is no uploaded file) there is no need to do anything
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; //when we decided to store the image in the disk, there is no req.file.filename, however it is used in other middleware. The extension is not needed because of the .toFormat used.

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); //more efficient. read the image in memory buffer.

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// ROUTE HANDLES  -----------------------------------

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);

  // 1) Get error if POSTs a password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This is not the place for it. To proceed updating password, please go to /updateMyPassword",
        400
      )
    ); // 400 - Bad Request
  }

  // 2) Filter out unwanted field names that are not allowed to update
  const filteredBody = filterObj(req.body, "name", "email"); // we dont want to allow that the user can update everything (like role). Therefore we need to filter the info that he can actually pass.
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update user document.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }); //we can use update here because we're already connected and we're dealing with non sensitive data. no need to validate or run the middleware in module.

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  res.status(204).json({
    status: "success",
    data: null,
  }); // 204 - No Content
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This path is not implemented yet. Please, use /signup instead",
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
// Do not update password with this (do not run the safe middlewares here -> only with save)
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
