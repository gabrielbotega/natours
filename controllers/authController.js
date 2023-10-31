const crypto = require("crypto");
const { promisify } = require("util"); //Using here the 'promisefy' method
const jwt = require("jsonwebtoken");
const User = require("../models/userModels");
const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModels");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
// const sendEmail = require("../utils/email");
const Email = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  /*Therefore, in order to logout the user, knowing that we can not manipulate the cookie, what we can do is to create another cookie, with
  the same name and send it as response. It'll override the original cookie, however without the actual token. Then, not recognizing the user
  we'll logout.*/

  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true; The problem here is that not every timne we go to 'production' we gonna gave a https connection.

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 60 * 1000
    ), // needs to be in miliseconds
    // secure: true, // meaning that the cookie will only be sent in a secure connection (https)
    httpOnly: true, // The cookie cant be accessed or modified in anyway by the browser. (the browser will receive the cookie, store it and send it back in every request)
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = undefined;
  return token;

  // res.status(statusCode).json({
  //   status: "success",
  //   token,
  //   data: {
  //     user,
  //   },
  // });
};

exports.signUp = catchAsync(async (req, res, next) => {
  // const message = `Please, confirm your email by clicking in:\n${confirmEmailURL}\n `;
  //The need to specify this is to avoid anyone create its user with the admin credential. Therefore we select what we will accept as entrance.
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    // passwordChangedAt: req.body.passwordChangedAt,
    // role: req.body.role,
    // passwordUpdate: req.body.passwordUpdate,
  });

  const confirmEmailURL = `${req.protocol}://${req.get("host")}/confirmemail/${
    newUser.id
  }
`;

  try {
    await new Email(newUser, confirmEmailURL).signupEmail();

    res.status(200).json({
      message: "Confirmation sent to email.",
      status: "success",
    });
  } catch (err) {
    // await newUser.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new AppError(
        "There was an error sending the email, please, try again later.",
        500
      ) // 500 - error
    );
  }

  // createSendToken(newUser, 201, res);
});

exports.emailConfirmation = catchAsync(async (req, res, next) => {
  // Verifies if there is an user and change its emailConfirmation to True
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("There is no such user.", 403)); // 403 - forbidden
  }

  user.emailConfirmed = true;
  await user.save({ validateBeforeSave: true });

  createSendToken(user, 201, req, res);

  req.user = user;
  res.locals.user = user;
  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) verify if the email and password exist (were passed)
  if (!email || !password) {
    return next(new AppError("Please provide an email and password", 400));
  }

  // 2) verify if the user exists and password is correct
  const user = await User.findOne({ email }).select("+password"); //since the document (findOne({email})) does not have password (we've incremented the select: false (model)), we have to explicitly add it ("+ ...")

  if (
    !user ||
    !(await user.correctPassword(password, user.password)) ||
    !user.emailConfirmed
  ) {
    next(new AppError("Incorrect email or password", 401));
  } //interesting to check together is to give no info to a racker what is incorrect
  // 3) if everything is OK, JWT to client
  const token = createSendToken(user, 200, req, res);

  res.status(200).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 1000 * 10),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and chack if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    //this will see if there is a authorization header. However, we can verify if there is jwt in cookie as well.
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError("You're not logged in", 401)); // 401 - Unauthorized
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // will return the decoded payload --- I'll control the error in the errorController file
  // console.log(decoded);

  // 3) Check if the user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(new AppError("The user no longer exist.", 401));
  }

  // 4) Check if user changed password after JWT issued
  //to check this here is quite a lot of code. Therefore it makes sense to be an user verification code (seen through the doc., not only here)
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "User recently changed the password. Please, log in again.",
        401
      )
    );
  }

  // GRANT ACCESS TO THE PROTECTED ROUTE
  req.user = freshUser;
  res.locals.user = freshUser; //to have access in pug.
  next();
});

exports.verifyBooking = catchAsync(async (req, res, next) => {
  /*     ------------- Used before the nesting routes  (nested routes in tourRoute)
  const userID = req.user.id;
  const reviewData = { ...req.body, user: userID };
  const newReview = await Review.create(reviewData);
  */

  const bookings = await Booking.find({ user: req.user.id });

  const tour = await Tour.findById(req.body.tour);

  const myBookings = bookings.map((el) => el.tour.id);

  if (!myBookings.includes(tour.id))
    return next(
      new AppError("You have never done this trip. Can't make the review", 401)
    );

  res.locals.bookings = bookings;
  req.bookings = bookings;
  next();
});

/////////// This will work to render the page due to whether or not the user is logged in.
//Therefore, there'll be no errors here.
//I want this middleware to be applied in every view route. Therefore I need to insert this there.This will run in every request
exports.isLoggedIn = async (req, res, next) => {
  //For rendered pages we wont have the toking comming from the header.
  // OBS: In the entire rendered website the token will always be sent via cookie. The Auth header only serves the API.
  //This cookie is an HTTP only cookie. Meaning that I cannot manipulate it in our browser
  // Since this run to loggout as well, I need to put the try/catch block and do not return the error (malformed cookies). Otherwise it wont work.
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      ); // will return the decoded payload --- I'll control the error in the errorController file

      // 2) Check if the user still exists
      const freshUser = await User.findById(decoded.id);
      if (!freshUser) {
        return next();
      }
      // 3) Check if user changed password after JWT issued
      //to check this here is quite a lot of code. Therefore it makes sense to be an user verification code (seen through the doc., not only here)
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // If the middleware reach here, there's a logged in user.
      //We want to make this /user/ is accessible in our templates (pug) --- res.locals.any_variable - This way our pug will have access to them.
      // every pug has access to res.locals. therefore, if i use res.locals.users,eg, we'll have access to users inside our pug templates.
      res.locals.user = freshUser;

      return next();
    } catch (err) {
      return next();
    }
  }
  next(); //in case there is no cookie.
};

//We can not pass arguments other them req, res, next to a middleware function, therefore we have to wrap it into other function
// using (...roles), i'll create an array of the passed arguments. Therefore I can use all the array methods.

exports.restrictedTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      // Since the .protect is running first and we passed the user document to req.user, we use this
      return next(
        new AppError("You do not have permition to perform this action", 403)
      ); //403 - forbidden
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) {
    return next(new AppError("There is no user with this email address", 404)); //404 - Not found
  }

  // 2) Generate a random tokem ---- Since this item has more to do with the user data itself, we gonna create a instance method (go to user model)
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //this save is necessary to update the time (when we just call the function, we just modify the doc, not save it.). If we do not use the "Validate False", it'll ask for all the validations (confirm password, e.g.)

  // 3) Send the token to the user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}
    `;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email.",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email, please, try again later.",
        500
      ) // 500 - error
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token --- Since we've sent the token within the URL, we just need to take this token, encrypt and than compare with the one in the DB. (Since we use a weak library to encrypt this token, we can do it straightforward.)
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }); //The only data we have from the user is its token. Need to check both conditions

  // 2) If token has not expired and there is a user, set new password
  if (!user) {
    return next(new AppError("Wrong token or it has expired.", 400)); //400 - bad request.
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // Not turning off the validators because we want to validate.

  // 3) Update the changedPasswordAt property for the user --- It's a property running behind the scenes always when we have a change in the password and the document is not new. ------Go to user model
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.password, user.password))) {
    next(new AppError("Incorrect email or password", 401)); // 401 - Unauthorized
  }

  // 3) If so, update password
  user.password = req.body.passwordUpdate;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordUpdate = undefined;
  await user.save(); // Not turning off the validators because we want to validate.

  // 4) Send new JWT
  createSendToken(user, 200, req, res);
});
