const express = require("express");
const tourController = require("../../controllers/tourController");
const authController = require("../../controllers/authController");
const reviewRoutes = require("./reviewRoutes");

/*
The code in this app.js is quite messy, therefore it has a way to divide the routes in separate files. One for the tours handling other for the user handling. 
In order to do it we first need to set our routing (tourRouting and userRouting)
*/

//creating new routing obj
const route = express.Router();

/*  MongoDB will deal with it
//Middleware that only runs for certain parameter
route.param("id", tourController.checkID);
*/

// route
//   .route("/:tourId/reviews")
//   .post(
//     authController.protect,
//     authController.restrictedTo("user"),
//     reviewController.createReview
//   );

route.use("/:tourId/reviews", reviewRoutes);

// now we can change the route or the version in one step
route
  .route("/top-5-cheap")
  .get(tourController.aliasTopTour, tourController.getAllTours);

route.route("/tour-stats").get(tourController.getTourStats);
route
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictedTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

// Here I'll implement a Geospatioal Query, in which I can play with distances between my house and the start of a tour, e.g.
route
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);

route.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

route
  .route("/")
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictedTo("admin", "lead-guide"),
    tourController.createTour
  );

// app.use((req, res, next) => {
//   console.log("Hello from the middleware! 🖐");
//   next(); //very important. Otherwise it'ld be stuck in this middleware forever
// }); // This will not print because the middleware (route) was finished (I've already sent a message   res.status().json(...)). The request response cycle was terminated. That's why the order matters. (of course this happens with the requests from the router before this. If I request the other methods, this will print)

route
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictedTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictedTo("admin", "lead-guide"), //to delete a tour, you have to be loged in and have to be an admin or lead-guide
    tourController.deleteTour
  );

module.exports = route;
