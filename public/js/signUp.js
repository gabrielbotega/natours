/*eslint-disable*/

import axios from "axios";
import { showAlert } from "./alerts";

export const signUp = async (data) => {
  try {
    let url = "http://127.0.0.1:3000/api/v1/users/signup";

    const res = await axios({
      method: "POST",
      url,
      data: data,
    });

    if (res.data.status === "success") {
      showAlert("success", "Email confirmation sucessfully sent");
      window.setTimeout(() => location.reload(), 1000);
    }
  } catch (err) {
    console.error(err);
    showAlert("error", err);
  }
};
