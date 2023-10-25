/* eslint-disable*/

import axios from "axios";
import { showAlert } from "./alerts";

// data: all the data I want to update (data object)
//type: either "password" or "data"
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === "data"
        ? "http://127.0.0.1:3000/api/v1/users/updateMe"
        : "http://127.0.0.1:3000/api/v1/users/updateMyPassword";

    const res = await axios({
      method: "PATCH",
      url, // note that here is the API path to update these datas (look app.js, usersController and userRoutes)
      data: data,
    }); // axios returns a promise

    if (res.data.status === "success") {
      showAlert(
        "success",
        `${type.replace(/\b\w/g, (l) => l.toUpperCase())} Updated Successfully`
      );
      window.setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
