const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" }); // this reading only needs to happen once. then I can use 'process.env' in any file

process.on("uncaughtException", (err) => {
  console.log("Uncaught Error! 😱");
  console.log(err.name, err.message);
  process.exit(1);
}); //get error from sync code. It needs to be placed before any code

const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {}).then(() => console.log("DB connection success")); //are some options to deal with deprecation wornigs. mongoose.connect returns a promise

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on the port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled rejection. Shutting Down... 🤷‍♂️");
  server.close(() => {
    process.exit(1);
  });
}); // this will handle all the rejected promisses (imagine if the db goes down, it's outside of express. Now this will handle it)

// If we receive a SIGTERM signal (signal to make the program stop running) - the server may shut down abruptly and this is not ideal
process.on("SIGTERM", () => {
  console.log("SIGTERM RECEIVED, SHUTTING DOWN");
  server.close(() => {
    console.log("Process Terminated");
  });
}); // Do not need the 'process.exit' because the SIGTERM itself will make the server shutdown
