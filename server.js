const express = require('express');
const cors = require('cors');
const mongodbConnect = require('./config/mongodb');
const pool = require('./config/mysql');

const app = express();

//Connect to MongoDB Database
mongodbConnect();

//Connect to MySQL Database
// app.get('/test-db', async (req, res) => {
//   try {
//     const [rows] = await pool.query('SELECT 1 + 1 AS result');
//     res.json({ message: 'DATABASE connected!', result: rows[0].result });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Allow frontend requests
app.use(cors());

// Init Middleware
app.use(express.json());

//Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
