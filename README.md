# ITSECWB-Project
ITSECWB Project (Originated from CCAPDEV MCO2 Open Forum Project)

Currently, it features:
- User Registration & Login
- Create, Edit, and Delete Posts
- Comment on Posts
- Upvote/Downvote Posts and Comments
- Tags and Categories for Posts
- User Profile Pages with the ability to edit profiles
- Dark Mode and Light Mode support

## Installation

1. Install the Required Dependencies

Install all required packages by running the following command in the project's root directory:


npm install bcrypt connect-mongo cookie-parser dotenv express express-handlebars express-session method-override moment mongoose


---

## Environment Setup

Create a .env file in the root directory of the project.

### Option 1: MongoDB Atlas (Cloud Database)

If you are using MongoDB Atlas, replace the placeholder below with your own connection string.


MONGODB_URI="your_mongodb_atlas_connection_string"
NODE_ENV=development


### Option 2: Local MongoDB

If you are running MongoDB locally, use the default connection string below.


MONGODB_URI="mongodb://localhost:27017/forumdb"
NODE_ENV=development


---

## Running the Application

Start the application by running the following command from the project's root directory:


node app.js


After the server starts successfully, open your browser and visit:


http://localhost:9090


The application should now be running locally.
