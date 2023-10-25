class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    this.isOperational = true; //this property shows that the error is operational and not a bug

    Error.captureStackTrace(this, this.constructor); //stackTrace is the log of where the error is, basically
  }
}

module.exports = AppError;
