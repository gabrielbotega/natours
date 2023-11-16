const Stripe = require("stripe");
const Tour = require("../models/tourModels");
const User = require("../models/userModels");
const catchAsync = require("../utils/catchAsync");
const Booking = require("../models/bookingModel");
const factory = require("./handlerFactory");
// const AppError = require("../utils/appError");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const stripe = Stripe(process.env.STRIPE_SECRETKEY);
  // 1) Get the currently booked tour
  const { tourID, chosenDate } = req.params;
  const tour = await Tour.findById(tourID);

  let bookingDate = chosenDate.replace("-", " ");
  bookingDate = bookingDate.charAt(0).toUpperCase() + bookingDate.slice(1);

  // 2) Create Checkout Session
  const product = await stripe.products.create({
    name: `${tour.name} Tour`,
    description: tour.summary,
    images: [
      `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`,
    ],
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: tour.price * 100,
    currency: "usd",
  });

  let successUrl = `${req.protocol}://${req.get("host")}/my-tours/?tour=${
    tour.id
  }&user=${req.user.id}&price=${tour.price}&tourDate=${bookingDate}`;

  if (process.env.NODE_ENV === "production") {
    successUrl = `${req.protocol}://${req.get("host")}/my-tours`;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],

    success_url: successUrl,
    metadata: {
      bookingDate: bookingDate,
    },
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,

    client_reference_id: req.params.tourID,
    mode: "payment",
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
  });
  // 3) Create Session as response
  // res.redirect(303, session.url);
  res.status(200).json({
    status: "success",
    session,
  });
});

//need to add this middleware function onto the middleware stack of this router handler ("/") -> in viewRoutes.//
//Therefore, there is where we need to add the middleware func//
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  //This is going to be temporary since it's insecure. Everyone can see the pattern and book without pay if they go to the success url
  const { tour, user, price, tourDate } = req.query; // comes from query string

  if (!tour && !user && !price && !tourDate) return next(); // the next middleware goes to viewsController.getOverview. With &&, if we miss some attribute, we gonna have a validation error (which is good)

  await Booking.create({ tour, user, price, tourDate });

  //since we're in backend
  res.redirect(req.originalUrl.split("?")[0]); // originalUrl in this case is the success_url (this solution is going to pass throu the
  //middleware two times)
});

const createBooking = async (session) => {
  try {
    const tour = session.client_reference_id;
    const user = (await User.findOne({ email: session.customer_email })).id;

    if (!user) {
      console.error(`User not found for email: ${session.customer_email}`);
      return;
    }

    const price = session.amount_total / 100;
    const tourDate = session.metadata.bookingDate;

    await Booking.create({ tour, user, price, tourDate });
  } catch (error) {
    console.error("Error creating booking:", error);
  }
};

exports.webhookCheckout = async (req, res, next) => {
  let event;
  try {
    const stripe = Stripe(process.env.STRIPE_SECRETKEY);
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRETKEY
    ); // req.body here is in the raw form.
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`); //It's stripe who will receive this response because it's stripe who calls the URL (thus the function)
  }

  if (event.type === "checkout.session.completed")
    createBooking(event.data.object);

  res.status(200).json({ received: true });
};

exports.goToNext = (req, res, next) => {
  next();
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
