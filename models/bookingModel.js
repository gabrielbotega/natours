const mongoose = require("mongoose");

// Here we gonna have a reference to the tour and the user who booked it.
const bookingScheme = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    require: [true, "A booking must belong to a Tour"],
  },
  tourDate: {
    type: String,
    required: [true, "Must book a tour in a certain date"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    require: [true, "A booking must belong to a User"],
  },
  price: {
    type: Number,
    require: [true, "A tour must have a price"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true, // The client could go into the store and pay with cash.
  },
});

// Want to populate automatically whenever I search for a booking
// wont have many problems because only guides and admin can search for bookings
bookingScheme.pre(/^find/, function (next) {
  this.populate("user").populate({
    path: "tour",
    select: "name",
  });
  return next();
});

const Booking = mongoose.model("Booking", bookingScheme);

module.exports = Booking;
