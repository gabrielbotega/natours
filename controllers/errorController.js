const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const pattern = Object.keys(err.keyPattern);
  const value = Object.values(err.keyValue);
  const message = `Duplicate field ${pattern}: ${value} . Please choose another ${pattern}.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Unvalid Token. Please, log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError("Expired Token. Please, Login again!", 401);

/*
To render the web page, we need to know if we're in the Prod or Dev mode. Therefore, if the page starts with /api it means that we're in Dev mode
*/
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    // API
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // RENDERED Website
  // Operational, trusted errors:send message to client
  console.error("ERROR: ", err);

  return res.status(err.statusCode).render("error", {
    title: "Something went wrong.",
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    // API
    if (err.isOperational) {
      //Operationa, trusted error: Send a message to the client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      }); // just send the error if they're operational, not a bug
    }
    // Programming or other unkown error: Dont want to leak the details to the clients
    // 1) Log the error:
    console.error("ERROR: ", err);

    // 2)Send generic message
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
  // RENDERED WEBSITE

  if (err.isOperational) {
    //Operationa, trusted error: Send a message to the client
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong.",
      msg: err.message,
    });
  }
  // Programming or other unkown error: Dont want to leak the details to the clients
  // 1) Log the error:
  console.error("ERROR: ", err);

  // 2)Send generic message
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong.",
    msg: "Please, try again later",
  });
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message; //for some reason the object is not being copied correctly

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error._message === "Validation failed")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
