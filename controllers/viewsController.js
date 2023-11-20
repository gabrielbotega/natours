const Tour = require("../models/tourModels");
const User = require("../models/userModels");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === "booking")
    res.locals.alert =
      "Your booking was successful. Please check your email for confirmation. \n If your booking doesn't show up immediately, please come back later.";

  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render template (using data from collection)

  res.status(200).render("overview", {
    title: "All Tours",
    tours,
  });
});

/* Need to set some headers here in order to force the authorization to open external sources. */
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({
    slug: req.params.tourSlug,
  }).populate({
    path: "reviews",
    fields: "review rating user",
  });

  if (!tour) {
    return next(
      new AppError(
        `There is no tour with this name: "${req.params.tourSlug.replaceAll(
          "-",
          " "
        )}".`,
        404
      )
    );
  }

  res
    .set({
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Content-Security-Policy":
        "default-src 'self' https://*.mapbox.com ws://127.0.0.1:56312/ https://js.stripe.com/ https://checkout.stripe.com/c/pay/*; base-uri 'self';font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://js.stripe.com/v3/ https://unpkg.com/@turf/turf@6/turf.min.js https://api.mapbox.com 'self' blob: 'unsafe-eval';script-src-attr 'none';style-src 'self' https: 'unsafe-inline' ;upgrade-insecure-requests; ",
    })
    .status(200)
    .render("tour", {
      title: `${tour.name} Tour`,
      tour,
    });
});

exports.getLoginForm = (req, res, next) => {
  res.status(200).render("login", {
    title: "Log into your account",
  });
};

exports.getSignedUpForm = async (req, res, next) => {
  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(req.user, url).sendWelcome();
  res.status(200).render("signedUp", {
    title: "Email Confirmed",
  });
};

exports.getSignupForm = (req, res, next) => {
  res.status(200).render("signup", {
    title: "Sign Up",
  });
};

exports.getAccount = (req, res) => {
  // Dont need to query the user here because we have access due to res.locals in protect middleware function.
  res.status(200).render("account", {
    title: "Your account",
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const tourIDs = bookings.map((el) => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render("overview", {
    title: "My Tours",
    tours,
    bookings,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  // Dont need to query the user here because we have access due to res.locals in protect middleware function.
  //these are the names passed in the form
  // remember that passwords are treated separately because we cannot use findbyidandupdate (this wont run the save middleware and thus will not encrypt). That's why we have separate route in API and separated form in the interface
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true, //want the updated document
      runValidators: true,
    }
  );
  // console.log("UPDATED", updatedUser);
  //need to update the user. If I just render the page it'll get the user from the protected middleware (not updated.)
  res.status(200).render("account", {
    title: "Your account",
    user: updatedUser,
  });
});
