//====================== app.js============== only used to configure the application. Therefore, everything related to express we'll write here
// Convention to include all the express code (configuration) in app.js
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit"); // limiter
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp"); // http parameter pollution
const cookieParser = require("cookie-parser"); //This will parse (analize) every cookie from the incoming request

const AppError = require("./utils/appError");
const errorControllerHandling = require("./controllers/errorController");
const tourRouter = require("./dev-data/routes/tourRoutes");
const userRouter = require("./dev-data/routes/userRoutes");
const reviewRouter = require("./dev-data/routes/reviewRoutes");
const bookingRouter = require("./dev-data/routes/bookingRoutes");
const viewRouter = require("./dev-data/routes/viewRoutes");

const app = express();

//setting the view (template) engine.A template engine enables you to use static template files in your application. At runtime, the template engine replaces variables in a template file with actual values, and transforms the template into an HTML file sent to the client
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
//---------------------------- 1) GLOBAL MIDDLEWARES -----------------------------
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
OBS: In 'app.use' we always call a function. Therefore, if we use a function call inside it, this function must return a function.
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/
// Serving Static Files
app.use(express.static(path.join(__dirname, "public"))); //used to view static pages (all static assets will be served from the public folder). Therefore, when I enter into the views folder to see my pug template and there, when I referencfe some css or img, they'll be found here, in public folder.

// Set security HTTP Headers
// app.use(helmet()); //it will return a function. Helmet helps you secure your Express apps by setting various HTTP headers
//Need to set some headers in the viewController as well, because it seems that when I render, it automatically sets some headers. Therefore I have to authorize some stuff.
app.use(
  helmet({
    accessControlAllowOrigin: "https://api.mapbox.com",
    crossOriginResourcePolicy: ["same-site", "https://api.mapbox.com"],
    // crossOriginEmbedderPolicy: "credentialless",
    contentSecurityPolicy: {
      directives: {
        //defaultSrc: ["'self'"],
        "script-src-elem": [
          "'self'",
          "https://api.mapbox.com/",
          "https://fonts.googleapis.com/",
          "https://cdnjs.cloudflare.com/ajax/libs/axios/1.4.0/axios.min.js",
          "https://js.stripe.com/v3/",
        ],
        "script-src": [
          "'self'",
          "https://api.mapbox.com/",
          "https://checkout.stripe.com/c/pay/*",
        ],
        "style-src": [
          "'self'",
          "https://api.mapbox.com/",
          "https://fonts.googleapis.com/",
          "'unsafe-inline'",
        ],
        "connect-src": [
          "'self'",
          "ws://127.0.0.1:56312",
          "https://api.mapbox.com",
          "https://checkout.stripe.com/c/pay/*",
        ],
      },
    },
  })
);

// Development login
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); //it will display in console all the info about the request
}

// This limiter here is balanced in accordance with the application. If you're working with an application which requires several requests in this interval, you should increase the value.
// This limiter is quite useful to avoid brute force password break

//Limit requests from same IP
const limiter = rateLimit({
  max: 100, // max 100 req. per IP
  windowMs: 60 * 60 * 1000, // The interval of the 100 req. is 1 hour
  message: "Too many requests from this IP. Please try again in an hour.",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" })); //express.json() is the middleware [function which modifies the incoming data]. it's just a step the request goes through while it's being processed. This proccess allows the data from the body of the request be added to the request object. (express does not contain the body method)
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // used to parse the request body from the form. It's called urlencoded because it's the way the form sends data into the server.
app.use(cookieParser()); //parses data from cookie

// Data Sanitization from NoSQL query injection --- Example: You can login with : "email": {"$gt": ""} -> This will always return true
app.use(mongoSanitize());

// Data Sanitization from XSS (cross side scripting atacks)
app.use(xss());

// Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsAverage",
      "ratingsQuantity",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
); // remove duplicate queries, e.g., sort=duration$sort=price (this should not work.) However, there may have some queries which I want to duplicate (duration=5&duration=9). That's why we specify the whitelist (an array of exceptions) -> in the case of the sort it'll work and considerate the last one

// app.use((req, res, next) => {
//   console.log("Hello from the middleware! 🖐");
//   next(); //very important. Otherwise it'ld be stuck in this middleware forever
// }); //This print to console because it is processed between the request, response cycle. Since I had a request in my API, I'll have a processing (middleware function)

// Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // I'm creating this property for the request
  //console.log(req.cookies); // from each request we will display all the cookies from the requests. (the cookie is important to protect our route -> add this condition in route (authcontroller))
  next();
});

//---------------------------- 2) ROUTES -----------------------------

// app.get("/api/v1/tours", getAllTours);
// app.post("/api/v1/tours", createTour);
// app.get("/api/v1/tours/:id", getTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

//If the code reach this point means that the two middleware above were not executed.
app.use("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
}); // goes directly to the global error handling (parameter in the next -> jump all the other middleware)

// ------------------------------- ERROR HANDLING
app.use(errorControllerHandling); // global error handling (have four parameters with error first) (if the error is different from anything related to route)

// START SERVER ----------------------------------------
module.exports = app;
