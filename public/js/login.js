/* eslint-disable */

import axios from "axios";
import { showAlert } from "./alerts";

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login",
      data: {
        email: email,
        password: password,
      },
    }); // Axios returns a promise

    if (res.data.status === "success") {
      showAlert("success", "Login successful");
      window.setTimeout(() => {
        location.assign("/");
      }, 1000); //This will allert that the login was successful and then redirect to the main page after a second and a half.
    }
    // This is the data is the data sent as our json response
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
}; //in order to do the HTTP request from the login form, we're going to use the library called Axios. It automatically throws an error when we get an error from our endpoint

export const logout = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/logout",
    });

    if (res.data.status === "success") location.replace("/overview"); //forces a reload from the server, not the browser cache. Mandatory to get the new invalid cookie
  } catch (err) {
    showAlert("error", "Error Logging out. Try again.");
  }
};
