const express = require("express");
const reviewController = require("../../controllers/reviewController");
const authController = require("../../controllers/authController");

const route = express.Router({ mergeParams: true }); // enables to get the params from where i've routed here (tour route, in this case)

route.get("/", reviewController.getAllReviews);

route.use(authController.protect);

// This was the original route
// route.post(
//   "/",
//   authController.restrictedTo("user"),
//   reviewController.verifyBooking,
//   reviewController.createReview
// );

route.post(
  "/",
  authController.restrictedTo("user"),
  authController.verifyBooking,
  reviewController.createReview
);

route
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    authController.restrictedTo("user", "admin"),
    reviewController.updateReview
  )
  .delete(
    authController.restrictedTo("user", "admin"),
    reviewController.deleteReview
  );

module.exports = route;
