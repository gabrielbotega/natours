// const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const Tour = require("../models/tourModels"); //get from the tourModel
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
// const AppError = require("../utils/appError");

/* Testing Purpuse
// It's better to read the json file in the toplevel code, since I'll read this once and thats it.
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}\\..\\dev-data\\data\\tours-simple.json`)
); //json.parse transform JSON file into an array of JS object
*/

/*  This wont be needed because if there is an ID error, MongoDB will warn us
exports.checkID = (req, res, next, val) => {
  console.log(`This tour id is: ${val}`);
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: "fail",
      message: "invalid ID",
    });
  }
  next();
}; //since this is a middleware and will run before the other functions, if this fails (meaning that there is no id compatible) it wont let run the other functions (because of the return)


Mongoose module will deal with it
exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: "fail",
      message: "Missing Name or Price",
    });
  }
  next();
};
*/
// MANAGING TOUR IMAGES -----------------------------
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

// ROUTE HANDLES  -----------------------------------

exports.uploadTourImages = upload.fields(
  // Names from the Model.
  [
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 3 },
  ]
);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) CoverImage
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // req.body.imageCover = imageCoverFilename; // Needed to be updated in the updateTour (updateOne)

  // 2) Images
  req.body.images = [];
  /* foreach() or Map(). Since foreach() works on the original array, if I use async it'll work only inside of the
  loop which will not stop the code to move directly to the next(). Therefore, it's mandatory to have a solution
  to await the whole process and only then move to the next(). The solution for this is to create a new array and
  await it -> use map() which will create a new array of promises and then use a Promise.all() to await all of them.
  With this solutiom, I'll await all the code to be done to only then move to the next line.  
  */
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  // console.log(req.body);
  next();
});

exports.aliasTopTour = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
}; //I'm setting these fields and then goes to getAllTours

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        // _id: "$ratingsAverage",
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRatings: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 }, // 1 - ascending
    },
    // {
    //   $match: { _id: { $ne: "EASY" } },
    // },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" }, //creates an array with the tour's names
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: {
        _id: 0,
      }, //only shows the fields with the 1 value
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12, //limits the number of documents shown
    },
  ]);

  res.status(200).json({
    status: "success",
    message: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.004017, -118.490286/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng) {
    next(
      new AppError(
        "Please, provide a valid format for lat and long: lat,lng",
        400
      )
    );
  }

  const radius = distance === "mi" ? distance / 3963.2 : distance / 6378.1; //the radius used in the geoquery is the distance divided by the earth's radius.

  //in order to use the geospatial query, we need to specify an 'index' to the startLocation
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] },
    },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please, provide a valid format for lat and long: lat,lng",
        400
      )
    );
  }

  // For geospatial aggregation there's only one pipeline stage -> geoNear. The geoNear requires that one of our fields has a geospatial index ----> in our case is startLocation (2dsphere). Thus, if there is only one field having geospatial index, it will get it automatically (if have multiple fields, have to use key parameter)
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          // point from which I'll start to calculate (near -> startLocation[tour])
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distances",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distances: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: {
      data: distances,
    },
  });
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: "reviews" });
exports.updateTour = factory.updateOne(Tour);
exports.createTour = factory.createOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
