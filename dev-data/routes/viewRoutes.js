const express = require("express");
const viewsController = require("../../controllers/viewsController");
const authcontroller = require("../../controllers/authController");
const bookingcontroller = require("../../controllers/bookingController");

const router = express.Router();

/* I do not need this code here because I'm extending the base...
therefore, I'll feed the base's skeleton into the pages.
//creates middleware (responds to every request and start a cycle). We use the 'root url' and the object to be used.
router.get("/", (req, res) => {
  //always use .get when rendering pages
  res.status(200).render("base", {
    //.render will render the template with the name we pass in
    tour: "The Forest Hiker",
    user: "Gabriel",
  });
}); //this is the path to the base in the views folder. This will render the site. Express will look into it automatically. It'll take the base template, render and than sent it as a response to the browser
*/

const isDevelopmentEnvironment = () => {
  if (process.env.NODE_ENV === "development")
    return bookingcontroller.createBookingCheckout;

  // return bookingcontroller.webhookCheckout;
};

router.get("/", authcontroller.isLoggedIn, viewsController.getOverview);
router.get("/overview", authcontroller.isLoggedIn, viewsController.getOverview);
router.get(
  "/tour/:tourSlug",
  authcontroller.isLoggedIn,
  viewsController.getTour
);

router.get(
  "/confirmemail/:id",
  authcontroller.emailConfirmation,
  viewsController.getSignedUpForm
);
router.get("/login", authcontroller.isLoggedIn, viewsController.getLoginForm);
router.get("/signup", viewsController.getSignupForm);
router.get("/me", authcontroller.protect, viewsController.getAccount);
router.get(
  "/my-tours",
  // Ternary operator to conditionally return middleware
  isDevelopmentEnvironment()
    ? bookingcontroller.createBookingCheckout
    : undefined,
  (req, res, next) => {
    next(); // Pass the request to the next middleware
  },
  authcontroller.protect,
  viewsController.getMyTours
);

//route defined to meed the requirements to get the data directly from the HTML
router.post(
  "/submit-user-data",
  authcontroller.protect,
  viewsController.updateUserData
);

module.exports = router;
