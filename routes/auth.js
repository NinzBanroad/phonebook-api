const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const pool = require('../config/mysql');

// @route    GET api/auth
// @desc     Get user by token
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tbl_Users WHERE UserID = ?',
      [req.user.UserID]
    );

    if (rows.length === 0) {
      return res.status(400).json({ errors: [{ msg: 'User not found' }] });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/auth/verify-email
// @desc     Verify Email
// @access   Public
router.post(
  '/verify-email',
  check('email', 'Please include a valid email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      // Check if email existed
      const [rows] = await pool.query(
        'SELECT * FROM tbl_Users WHERE Email = ? LIMIT 1',
        [email]
      );

      if (rows.length === 0) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Email' }] });
      }

      res.json({ msg: 'Email Verified Successfully!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/auth/change-password
// @desc     Change Password
// @access   Public
router.post(
  '/change-password',
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if email existed
      const [rows] = await pool.query(
        'SELECT * FROM tbl_Users WHERE Email = ? LIMIT 1',
        [email]
      );

      if (rows.length === 0) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Email' }] });
      }

      const salt = await bcrypt.genSalt(10);

      const newPassword = await bcrypt.hash(password, salt);

      await pool.query('UPDATE tbl_Users SET Password = ? WHERE UserID = ?', [
        newPassword,
        rows[0].UserID,
      ]);

      const [updatedUser] = await pool.query(
        'SELECT * FROM tbl_Users WHERE UserID = ?',
        [rows[0].UserID]
      );

      // Check if Status is approved or pending
      if (updatedUser[0].Status === 'pending') {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Please wait for Admin Approval' }] });
      }

      const isMatch = await bcrypt.compare(password, updatedUser[0].Password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const payload = {
        user: {
          UserID: rows[0].UserID,
        },
      };

      const jwtSecret = config.has('jwtSecret')
        ? config.get('jwtSecret')
        : process.env.jwtSecret;

      jwt.sign(payload, jwtSecret, { expiresIn: '5 days' }, (err, token) => {
        if (err) throw err;
        res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/auth
// @desc     Authenticate User & get token
// @access   Public
router.post(
  '/sign-in',
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if email existed
      const [rows] = await pool.query(
        'SELECT * FROM tbl_Users WHERE Email = ? LIMIT 1',
        [email]
      );

      if (rows.length === 0) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bcrypt.compare(password, rows[0].Password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Check if Status is approved or pending
      if (rows[0].Status === 'pending') {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Please wait for Admin Approval' }] });
      }

      const payload = {
        user: {
          UserID: rows[0].UserID,
        },
      };

      const jwtSecret = config.has('jwtSecret')
        ? config.get('jwtSecret')
        : process.env.jwtSecret;

      jwt.sign(payload, jwtSecret, { expiresIn: '5 days' }, (err, token) => {
        if (err) throw err;
        res.json({ token, msg: 'Signin Successfully!' });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/auth
// @desc     Sign Up User & get token
// @access   Public
router.post(
  '/sign-up',
  check('email', 'Please include a valid email').isEmail(),
  check(
    'password',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count FROM tbl_Users WHERE email = ?',
        [email]
      );

      if (rows[0].count > 0) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      } else {
        const salt = await bcrypt.genSalt(10);

        const newPassword = await bcrypt.hash(password, salt);

        //Insert User in the MySQL for Admin Approval
        const [result] = await pool.query(
          'INSERT INTO tbl_Users (Email, Password, isAdmin, isActive, Status) VALUES (?, ?, ?, ?, ?)',
          [email, newPassword, 0, 0, 'pending']
        );

        res.json({
          msg: 'Please wait for Admin Approval',
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
