const express = require('express');
const cors = require('cors');
const mongodbConnect = require('./config/mongodb');
require('dotenv').config();
const pool = require('./config/mysql');

const app = express();

//Connect to MongoDB Database
mongodbConnect();

// Allow frontend requests using the frontend URL
app.use(
  cors({
    origin: 'https://phonebook-ui.onrender.com',
    methods: 'GET,POST,PUT,DELETE',
    credentials: true, // Allow cookies & authentication headers
  })
);

// Init Middleware
app.use(express.json());

//Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
