// app.js
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser'); // Add this line
const path = require('path');
const exphbs = require('express-handlebars');

const forumRoutes = require('./routes/func');

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Use cookie-parser middleware
app.use(cookieParser());

// Set up express-handlebars with a custom helper "concat"
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: {
    concat: function () {
      return Array.prototype.slice.call(arguments, 0, -1).join('');
    },
    eq: function(a, b) {
      return a === b;
    }
  }
}));
app.set('view engine', 'hbs');

// Session config (session cookie ends on browser close)
app.use(session({
  secret: 'forum-friends-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { expires: null }
}));

// Use the routes from func.js
app.use('/', forumRoutes);

// Start the server
const PORT = process.env.PORT || 9090;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;

