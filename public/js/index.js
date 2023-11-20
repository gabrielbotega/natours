/* eslint-disable */

import "core-js/stable";
import { displayMap } from "./mapbox";
import { login, logout } from "./login";
import { updateSettings } from "./updateSettings";
import { signUp } from "./signUp";
import { showAlert } from "./alerts";
// import { bookTour } from "./stripe";

//Create DOM element.
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form--login");
const logOutBtn = document.querySelector(".nav__el--logout");
const userDataForm = document.querySelector(".form-user-data");
const userPasswordForm = document.querySelector(".form-user-password");
const bookBtn = document.getElementById("book-tour");
const signUpForm = document.querySelector(".signup-form");

// Delegation
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations); // This only appears in the page that has the map. In other page it'll display an error. To solve this problem I gonna create a If statement. Using 'dataset' here is possibile due to the 'data-' used in tour.pug
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault(); // cancels the event if it is cancelable, meaning that the default action that belongs to the event will not occur.

    // Values
    const email = document.getElementById("email").value; //in the login.pug we can see that (input#email) input element with email ID
    const password = document.getElementById("password").value;

    login(email, password);
  }); //querySelector: used to select based on a class. I'll listen to the event whenever the browser fires the submit
}

if (logOutBtn) logOutBtn.addEventListener("click", logout);

if (signUpForm) {
  signUpForm.addEventListener("submit", (e) => {
    e.preventDefault();

    document.querySelector(".btn.btn--green").textContent = "Processing...";
    //values
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;

    signUp({ name, email, password, passwordConfirm });

    document.querySelector(".btn.btn--green").textContent =
      "Email Confirmation Sent";

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("passwordConfirm").value = "";
  });
}

if (userDataForm)
  userDataForm.addEventListener("submit", (e) => {
    e.preventDefault(); //cancels the event if it is cancelable, meaning that the default action that belongs to the event will not occur.

    //values
    const form = new FormData(); //creates a new dataform object in which we can fatch data. (need multer package)
    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);
    form.append("photo", document.getElementById("photo").files[0]); //only one file

    updateSettings(form, "data");
  });

if (userPasswordForm)
  userPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault(); //cancels the event if it is cancelable, meaning that the default action that belongs to the event will not occur.

    document.querySelector(".btn--save--password").textContent = "Updating...";

    //values -- Variable names that my API expects.
    const password = document.getElementById("password-current").value;
    const passwordUpdate = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;

    await updateSettings(
      { password, passwordUpdate, passwordConfirm },
      "password"
    );

    document.querySelector(".btn--save--password").textContent =
      "Save password";

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });

// if (bookBtn) {
//   bookBtn.addEventListener("click", (e) => {
//     e.target.textContent = "Processing..."; //e.target means the element which was clicked.
//     const tourId = e.target.dataset.tourId; // whenever there is a Id with dash (data-tour-id), in JS is transformed into cammelCase
//     bookTour(tourId);
//   });
// }
if (bookBtn) {
  // const stripeModule = require("./stripe");
  const { bookTour } = require("./stripe");
  const selector = document.getElementById("date-selection");

  bookBtn.textContent = "Choose a tour date";
  selector.addEventListener("change", (e) => {
    bookBtn.textContent = "Book the tour";
    bookBtn.addEventListener("click", (e) => {
      e.target.textContent = "Processing...";
      const tourId = e.target.dataset.tourId; //Using 'dataset' here is possibile due to the 'data-' used in tour.pug. Nothe that we've changed tour-id to cammelCase notation.
      const date = document.getElementById("date-selection").value;

      bookTour(tourId, date);
    });
  });

  // } else {

  // }
}

const alertMessage = document.querySelector("body").dataset.alert;
if (alertMessage) showAlert("success", alertMessage, 10);

/* ===========================================================
This index.js is our entry file. Therefore we get data from the user interface and then we delegate actions to some functions
comming from the other modules (js files). We can export data from these modules like in Node.js. 

In ES6, we just use "export" infront of the function, e.g., we want to export.


I also gonna instal a polyfill which makes the new javascript features work in older browsers (@babel/polyfill)
===========================================================*/
