// Since we've added the stripe script, we can call for the library
// Stripe("Public Key")

/*eslint-disable*/
import axios from "axios";
import { showAlert } from "./alerts";

export const bookTour = async (tourId, date) => {
  const stripe = Stripe(
    "pk_test_51Ns97NFMc4GdRjnLjhcyIAYxpXKqverU6zETTYKV4VACrfd52TYOQckKlSJPAYwSRlVBpXdviV9nlxFUkVKJ1o4R00jduopysV"
  );
  try {
    // 1) Get checkout session from API
    const session = await axios({
      method: "GET",
      url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/tour/${tourId}/date/${date}`,
    });

    // console.log(session);
    // 2) Create checkout form + charge from credit card}
    // await stripe.redirectToCheckout({
    //   sessionId: session.data.session.id,
    // });
    window.location.replace(session.data.session.url);
  } catch (err) {
    console.log(err);
    showAlert("error", err);
  }
};
