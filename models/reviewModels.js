const mongoose = require("mongoose");
const Tour = require("./tourModels");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      maxLength: 300,
      required: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "The review must come from an User"],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "A review must belong to a Tour"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // this makes these two indexes be unique at the same time

reviewSchema.pre(/^find/, function (next) {
  this.populate([
    {
      path: "user",
      select: "name photo",
    },
    // {
    //   path: "tour",
    //   select: "name",
    // },
  ]);
  next();
}); // We still have one problem with this. If we want to access the reviews through the tours, we cannot. To solve this problems we have two methods: 1) Query for the reviews each time we query for a tour (too much work -> time spending); 2) populate tour with reviews (The number of reviews can grow indefinitely, consuming all the space of our DB) => new solution: Virtual Populate

// Virtual Populate: We get all the review's ID in the tour without persist it to the DB.

// Here we also gonna write a function which get the tour ID and calculate the ratingsAverage and Quantity and update the tourSchema everytime we have a new review, or update or a delete. This is a good method because we dont "over crowd" the queries and do not need to calculate everytime we query a tour data.
//This function will be a "static method" of mongoDB, meaning that I can call this function directly in the model associated (Review.function). A static method is defined on the schema using the statics object.
// Schema X Static Method: Schema method is associated with the document instance (e.g., a specific user) while static schema is related to the MODEL. Therefore, it'll operate through all the instances (all collections)

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRatings: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRatings,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 0,
      ratingsQuantity: 4.5,
    });
  }
};

// we use .post here because the calculation must be done after the data is in the DB. Therefore, post middleware has no access to 'next'
reviewSchema.post("save", function () {
  // "this" keyword points to the document being saved (review, in this case)
  this.constructor.calcAverageRatings(this.tour); // Review.calcAverageRatings. However, I cannot use "Review" here because it was not already declared and i cannot put below its declaration because when it call "reviewSchema" this middleware will not have been declarated. Therefore, the solution is to use "this.constructor"
}); //In Mongoose, this.constructor refers to the model associated with the schema. It can be useful in certain scenarios, particularly when you want to reference the model within a schema method or static method.

/*
Query middleware differs from document middleware in a subtle but important way: in document middleware, this refers to the document being updated. In query middleware, mongoose doesn't necessarily have a reference to the document being updated, so this refers to the query object rather than the document being updated.
*/
//findByIdAndUpdate
//findByIdAndDelete
//This middleware will find and save in a variable the document that is being "found"
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.model.findOne(this.getQuery()); // Retrieve the document using `this.getQuery()`. 'this.model' refers to "Review" and using ".findOne" with 'this.getQuery', we ensure that we're retrieving the same document. The findOne() method is intended to execute a query to find a document, and using it within a middleware that is triggered before the query can lead to unexpected behavior.
  // console.log(this.r);
  next();
});

//Now we have to really calculate
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
}); //must call on the specific document which I'm updating

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
