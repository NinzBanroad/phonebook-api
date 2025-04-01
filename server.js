const express = require('express');
const cors = require('cors');
const mongodbConnect = require('./config/mongodb');
require('dotenv').config();
const pool = require('./config/mysql');

const app = express();

// Allow frontend requests
app.use(cors());

// Init Middleware
app.use(express.json());

//Connect to MongoDB Database
mongodbConnect();

//Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
