const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

//name, email, photo, password, confirmPassword

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, "An user must have a name."], //validator
  },
  email: {
    type: String,
    required: [true, "An user must have an email."],
    unique: [true, "this email is already in use"],
    lowercasse: true,
    validate: {
      validator: validator.isEmail,
      message: "Invalid Email",
    },
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
  },
  photo: { type: String, default: "default.jpg" },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, //this will never show the password back to the user (which is a good security practice)
  },
  passwordConfirm: {
    type: String,
    minlength: 8,
    validate: {
      // This only works on CREATE and SAVE (therefore, if I wish to update a password, need to use the save method, not update)
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same.",
    },
  },
  passwordChangedAt: Date, //not all the users will have this.
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordUpdate: {
    type: String,
    minlength: 6,
    select: false, //this will never show the password back to the user (which is a good security practice)
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//MUST DO. This is used to save the user in the DB with a secure password.
userSchema.pre("save", async function (next) {
  //Only run this code if the passward was modified
  if (!this.isModified("password")) return next();

  //Hash code with the cost of 13
  this.password = await bcrypt.hash(this.password, 13);

  //Delete passwordConfirm field.
  this.passwordConfirm = undefined; //The only moment I want to have this field is in the creation. This dont need to be persisted in the DB
  next();
});

// Every time the document is saved, we'll check if there was a change in the password (except when the document is new.)
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // We subtract 1sec here because sometimes in practice the JWT will be generated before the password, therefore the user wont be allowed to log in. Therefore we include this delay.

  next();
});

userSchema.pre(/^find/, function (next) {
  // just want to show users that "active" = true
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
}; //since this is an instance Method, this will be available in all user document. This is a creation of an instance method

userSchema.methods.changedPasswordAfter = function (JWTtimestamp) {
  if (this.passwordChangedAt) {
    //if this is true, means that the user changed sometime
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    ); //this will convert the Date format to the JWT time format
    // console.log(changedTimeStamp, JWTtimestamp);
    return JWTtimestamp < changedTimeStamp; //if JWT is smaller (earlier) means that the user changed the password
  }

  return false; //default, meaning that the user has not changed
};

userSchema.methods.createPasswordResetToken = function () {
  //Since there is a tiny chance of a hacker enter in our database and have access to this reset token and reset some users password, we have to add some security here. Not saving it to our DB without cryptography.
  //This token gonna be saved in the DB to compare with the one the user provides
  // Of course it'll be added an expiring time as well.
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); // saving the cryptographic version

  // console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // time is in ms (expires in 10 min)

  return resetToken; //returning the plan version to send by email.
};

const User = mongoose.model("User", userSchema);

module.exports = User; //we gonna use it in the userController or authenticationController
