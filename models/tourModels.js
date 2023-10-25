const mongoose = require("mongoose");
const slugify = require("slugify");
// const User = require("./userModels"); // Just used in the case of Embed schema

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "A tour must have a name."], //validator
      maxlength: [40, "A tour must have a maximum of 40 characters."], //validator
      minlength: [10, "A tour must have a minimum of 10 characters."], //validator
      // validate: [
      //   validator.isAlpha,
      //   "There mustn't have other characters than letters in the name.",
      // ],//doesn not accept whitespace
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration."],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must be a max group size."],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty."],
      enum: {
        values: ["easy", "medium", "difficult"], //validator
        message: "The difficulty is either: easy, medium or difficult",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "The ratings average must be at least 1."], //validator
      max: [5, "The ratings average must be at most 5."], //validator
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price."],
    },
    priceDiscount: {
      type: Number,
      validate: {
        //'this' keyword here just work in creating NEW documents, not updating
        validator: function (pricediscout) {
          return pricediscout < this.price; //return true if the discout < price
        },
        message: "The discount must be lower than the price.",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a summary"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, //name of the image that we'll read and put the image. Store just the name in the DB is good practice
      required: [true, "A tour must have a cover."],
    },
    images: [String],
    createdAt: {
      // timestamp that the user adds a new tour
      type: Date,
      default: Date.now(), //mongoose automatically converts to a more readable format
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON - Can be points, lines, poligons etc.
      //This object here is not for the schema type, but this is going to be a EMBEDDED object.
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number], // We're expecting an array of numbers (LONG - LAT)
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number], // We're expecting an array of numbers (LONG - LAT)
        address: String,
        description: String,
        day: Number,
      },
    ], // This array creates embedded documents -> Specifying an array of documents will create documents inside of the parent document
    // guides: Array, This would embed the guides
    guides: [{ type: mongoose.Schema.ObjectId, ref: "User" }], //can use the "populate" technique in the query
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});
// Indexes - they're important to optimize the query I'm intereste in. Therefore, if there is a query that I know always happens, it might be useful to create a new index. The index is a "ordered list stored outside the colection". It consumes some space however it's more efficient.
tourSchema.index({ price: 1, ratingsAverage: -1 }); // Here I'm creating a price ascending list. If I query for price, mongoDb will search in the index. (-1 is descending order)
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" }); //'2dsphere' means that I'm using real points in the earth

// Virtual Populate
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
}); // foreignField: The name of the field which references this model (where in the review model we reference the tour model). localField: what do we store in the foreign field?? (ID)

// --------------------- DOCUMENTS MIDDLEWARE: runs before .save() and .create() (do not work in .insertMany())
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// ---------------------------------- Code to embed the guides in the tour module
// tourSchema.pre("save", async function (next) {
//   const guidePromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidePromises); // Since the "guidePromises" will be an array of promises, there we must run all the promises to have the object. Therefore, use Promise.all.
//   next();
// });

// tourSchema.post("save", function (doc, next) {
//   console.log(doc);
//   next();
// })

//---------------------QUERY MIDDLEWARE
// tourSchema.pre("find", function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
}); //hides the secret tour //this will exclude just from the query 'find'. in the aggregation it still appear.

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -emailConfirmed",
  });
  next();
}); // Using populate means that it'll fill the referenceId with the guides info when I query the 'getTour'. This creates a new (secondary) query, therefore it might diminish the performance. So, if you have a large application with several populate you should take this into account. This way, every "find" method will be populated

tourSchema.post(/^find/, function (docs, next) {
  // console.log(docs);
  console.log(`This query took ${Date.now() - this.start} milliseconds.`);
  next();
});

//--------------------- AGGREGATION MIDDLEWARE
// tourSchema.pre("aggregate", function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });
tourSchema.pre("aggregate", function (next) {
  const pipeline = this.pipeline();

  // Check if the pipeline already contains a $geoNear stage
  const hasGeoNearStage = pipeline.some((stage) =>
    stage.hasOwnProperty("$geoNear")
  );

  if (hasGeoNearStage) {
    // If $geoNear stage exists, skip the middleware
    next();
  } else {
    // Prepend $match stage to the pipeline
    pipeline.unshift({
      $match: { secretTour: { $ne: true } },
    });

    // Log the modified pipeline (optional)
    console.log(pipeline);
    next();
  }
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour; //we gonna use it in the tourController
