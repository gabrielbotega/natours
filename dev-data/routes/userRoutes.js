const express = require("express");
const userController = require("../../controllers/userController");
const authController = require("../../controllers/authController");

/*
The code in this app.js is quite messy, therefore it has a way to divide the routes in separate files. One for the tours handling other for the user handling. 
In order to do it we first need to set our routing (tourRouting and userRouting)
*/
//creating new routing obj
const route = express.Router();
//creates middleware (responds to every request and start a cycle). We use the 'root url' and the object to be used.

route.post("/signup", authController.signUp); //only make sense to send data to this route
route.get("/confirmemail/:id", authController.emailConfirmation);
route.post("/login", authController.login); //only make sense to send data to this route (send the login credentials through the body)
route.get("/logout", authController.logout); //.get because we're not sending any data. Only getting the cookie.
route.post("/forgotPassword", authController.forgotPassword);
route.patch("/resetPassword/:token", authController.resetPassword); //because we want to modificate the password property.

route.use(authController.protect); // will protect all the routes after this point

route.patch("/updateMyPassword", authController.updatePassword);
route.get("/me", userController.getMe, userController.getUser);
route.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
); //single because we want to upload a single photo and then we pass the name of the field (in the form) that will hold the img to upload
route.delete("/deleteMe", userController.deleteMe);

route.use(authController.restrictedTo("admin"));

route
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

route
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = route;
