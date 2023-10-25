====================================================================================================================================
MAPBOX

First: The mapbox librery runs in the frontend, that's why we created a .js file -> write a JS code in the client side
and integrate that into the templates.

Second: A good place to integrate our JS file is the base.pug template. However, we just want to use the mapbox in the
tour.pug file. A solution is to create a block inside the base template (block head) and use it (extends) in the tour.pug file.

Third: gonna extend the base.pug head block into the tour.pug file adding a file to the end of the block. (block append head).

Fourth: Using script(src="/js/mapbox.js") I'm appending this script to the base.pug head block.


In order to create the mapbox, obviously we need to have access to the location of the tour we're seeing. There are some ways to get this information
on our JS file.
1 - Can do an Ajax request (call to API and get the data from there) --- That is not necessary in this case (2)
2 - We can expose the location in our HTML using our tour.pug template. Therefore, we need to stringfy our data in order to access it from our JS file.
OBS: The JS file has no access to ordinary requests and queries like in the backend.
2.1 - In order to do it, we use the '#map' (id map) and specify a data attribute in HTML and read this attribute using JS
2.1.1 - #map(data-WhateverIWantToCallIt=STRING)
2.1.2 - HTML only allows strings
2.1.3 - Everytime we write a data attribute like this, it'll be stored into the dataset property (dataset.locations) in this case.

In the mapbox.js we've included the mapbox code (found on the website). Therefore, it's just follow the steps and you are good to go.
Another point is that the container uses the 'map' as an id. that's why in the tour.pug we use #map

SUPER IMPORTANT NOTE: 
This code generates several errors concerning security. One thing to note is, set the header in the app.js to accept content from mapbox and also in 
the viewController, since there you expect some headers using the res.status.render. There are some expectations there, some default headers expected,
and you must configure it in order to work.

====================================================================================================================================
DataBase and frontend

It's obvious that in our application there are times we need to interact with our data base. If we want to update some settings there are 
two major paths that could be followed. 
The first one is by the "form" in the .pug file. There we must name our input to make them accessible by the request and set a urlencoded.
---app.use(express.urlencoded({ extended: true, limit: "10kb" })); // used to parse the request body from the form. It's called urlencoded because it's the way the form sends data into the server.
There might be some issues using this method because handling errors could be a pain since it routes you to another route.

Therefore, since we already have an API to be used, we can use it to interact with frontend and update.
To accomplish this, we need to create another JS file (see udatingSettings.js OR login.js) 

========================================================
Uploading Photos

To upload photos in the frontend, we will use a middleware called 'multer'. It's a very popular express middleware that handles
multipart on data ("Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files")
"Multer adds a body object and a file or files object to the request object. The body object contains the values of the text
fields of the form, the file or files object contains the files uploaded via the form."

Basically we can upload files form a form.

We will include the possibility of uploading user photos in the user uploadMe route, therefore, we can use multer in
userRoutes.js or in userController.js (better - we need to control the upload files. Just admit img, for example.)

The multer package is required because our body parser is not able to handle files. Therefore, if we upload a file
and then read the req.body we wont see the file.

If we just specify the destination file in the multer({dest: path}), we gonna save the file with a strange name and
with no extention, therefore we can not see the file. Thus, further configuration is needed.
Therefore, a good practice is to create a multerStorage and a multerFilter to configure it

multerStorage = multer.diskStorage({
    destination: -> receive a callback function. It's similar to the express callbacks (req, file, cb (similar to next - callback func which
    we can pass errors and other stuff.))
    To define the destination we first need to call the cb(callback function) and the first arg is an error (if there is one) and
    if not, just pass "null". The second is the destination.

    cb(null, "public/img/users"); //for this case

    filename: -> here we configure the name we want. the pattern will be "user-userID-timestamp". This way we 
    can have the same user uploading several photos without overwriting the previous one. and different users uploading
    photos without overwriting other user's images (different users uploading images at the same time)

    obs: the "file" in the callback function is the req.file object of the uploaded file. Being an object it has several
    fields we can use.
})

multerFilter: The goal is to verify if the uploaded file is an image.
Since we're testing for image (of course we can test for any type of file we want. However, in this application we are
testing for image.) the mimetype will always start with "image/'extention'"

Another point that we should pay attention is that if the uploaded file is in another format, then we need to 
resize the image. In order to accomplish this, we need to add another middleware before the updateMe.
We gonna use the "sharp" package to resize the image.

OBS: When doing image processing is always best to save it to the memory instead of disk (right after upload it) ->
-> multer.memoryStorage(): will store as a buffer.
OBS2: There are some ways to upload the image.
a - if it is a single file: upload.single("name") -> give: req.file
b - multiple files with the same name: upload.array("name", number) -> give: req.files
c - multiple files with different name: upload.files([{name:, maxCount:}]) -> give: req.files

========================================================
Handling Emails

Instead of having a single email configuration and route, is better to have an Email class and then use it as I want.
Having an specific email being send for a specific action.

Differente of the other usages in this aplication of res.render() which creates the HTML based on a pug template and then
send it to the client. However here we want to send the html as the email. Therefore we need to set this on mailOption.
Therefore, we need to use pug.renderFile() which will take a pug template and render it into HTML file.

It is also important to include a text version of our email (important for email delivery rate and span folders).
To convert the HTML into text we need a package called html-to-text.

========================================================
REAL EMAILS - Sendgrid

Since we're using Nodemailer, we need to integrate sendgrid using SMTP relay.

The API key is not relevant. But what we're going to use in our config file is the "username" and "password" that was generated.

Remember that with Nodemailer we can specify some services (gmail and sendgrid, e.g.). Therefore we do not need to worry with the port or server.

========================================================
Accept Payments

One of the most popular and easy to use software platform to integrate with our website.

There we can configure several different payment methods, billing and branding. 
To configure the payment methods here we need the API keys in Developers area.

There are two keys there: Public (Front End) and Private (Back end)

Important to note that stripe never shows us the Credit Car data, e.g., therefore they deal with all the security issues from the clients.

To add it on the frontend, first we need to change our tour.pug file. Add a condition that the Book Tour button only appears if the user is
logged in. Also, we need to specify an ID (#) to the button in order to select it in our JavaScript and also insert the tour info (id) to allow
the JS to grab it (data-).
Then, need to create the script to do the request and process the payment in the frontend. Of course this happens in public/js

OBS: We need access to stripe library in the frontend. However, the npm installed only works on the backend. Therefore, we need to include the script
like when we've included mapbox.

It's also good to create a booking model to persist it in our database.
Therefore, to create a new booking and store in DB we'll use the "success_url" function. Whenever goes to this specific URL we need to save it 
to our database.
In the test version we'll create only a temporary solution (which is not that safe). However, when the server is live we'll have access to the 
Stripe WebHooks and that'll be perfectly safe. 

Therefore, the work around is to put the data that we need to create a new booking right into this URL as a query string. Create this string
knowing that Stripe will only make a get request to this URL (we cannot sent body or data except for the query string)
OBS: query string:  success_url: /?query_string=""
It's not secure because anyone who knows the structure could go through the checkout process without pay (book without payment)