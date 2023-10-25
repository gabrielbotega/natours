/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
I'll not transport through the Gmail because in the case of a production app is not a good Idea - We can only send 500 daily mails otherwise you'll be marked as a spamer. However, I'll show the code.

Good service providers to send emails are SendGrid and MailGun

To test this functionality is better to use a development service called Mailtrap, which fakes to send email to real addresses, but in reality the emails end up trapped in a development inbox, so we can take a look at how they gonna look like 
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/
const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.from = `Natours <${process.env.SENDGRID_FROM}>`;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      //sendGrid
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // send actual email
    // 1) Render HTMLbased on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject: subject,
      }
    );
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: htmlToText(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours Family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your reset password token (valid only for 10 min)."
    );
  }

  async signupEmail() {
    await this.send(
      "signupEmail",
      "Welcome to the Natours Family! - Email Confirmation"
    );
  }
};

// const sendEmail = async (options) => {
//   // -------------   1) create a transporter
//   // const transporter = nodemailer.createTransport({
//   //   service: "Gmail",
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   //   //activate in gmail "less secure app" option
//   // });

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // -------------   2) Defining Email options
//   const mailOptions = {
//     from: "Natours <confirmpassword@natours.io>",
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     // html:
//   };

//   // -------------   3) Sending the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
