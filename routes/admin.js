const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');

const pool = require('../config/mysql');

// Check Current Password
// @route    POST api/admin//check-current-password/:UserID
// @desc     Authenticate User & get token
// @access   Public
router.post(
  '/check-current-password/:UserID',
  auth,
  check('password', 'Password is required').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT * FROM tbl_Users WHERE UserID = ?',
        [req.params.UserID]
      );

      if (!rows) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      const isMatch = await bcrypt.compare(password, rows[0].Password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Incorrect Current Password' }] });
      }

      return res.json({ msg: 'Current Password match' });
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server error');
    }
  }
);

// @route    GET api/admin/all-users
// @desc     Get all users
// @access   Private
router.get('/all-users', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tbl_Users');

    return res.json(rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

//approval of new sign up
// @route    PUT api/admin/approve
// @desc     Update user status
// @access   Private
router.put('/approve-user/:UserID', auth, async (req, res) => {
  try {
    if (!req.params.UserID || isNaN(req.params.UserID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const { status } = req.body;

    const [result] = await pool.query(
      'UPDATE tbl_Users SET Status = ?, isActive = ? WHERE UserID = ?',
      [status, true, req.params.UserID]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ errors: [{ msg: 'User not found' }] });
    }

    const [updatedUser] = await pool.query(
      'SELECT * FROM tbl_Users WHERE UserID = ?',
      [req.params.UserID]
    );

    return res.json({ user: updatedUser[0], msg: 'Approve User Successful' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

//create user
// @route    POST api/admin/create-user
// @desc     Create User
// @access   Private
router.post(
  '/add-user',
  auth,
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

        //Insert User in the MySQL
        const [result] = await pool.query(
          'INSERT INTO tbl_Users (Email, Password, isAdmin, isActive, Status) VALUES (?, ?, ?, ?, ?)',
          [email, newPassword, 0, 1, 'approved']
        );

        const [newUser] = await pool.query(
          'SELECT * FROM tbl_Users WHERE UserID = ?',
          [result.insertId]
        );

        return res.json({ user: newUser[0], msg: 'Add User Successful' });
      }
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

//update User
// @route    PUT api/admin/update-user
// @desc     Update User
// @access   Private
router.put(
  '/update-user/:UserID',
  auth,
  check('email', 'Please include a valid email').isEmail(),
  async (req, res) => {
    try {
      if (!req.params.UserID || isNaN(req.params.UserID)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const { email, password } = req.body;

      // check if there's no password inputted
      if (!password) {
        const [checkUser] = await pool.query(
          'SELECT * FROM tbl_Users WHERE UserID = ?',
          [req.params.UserID]
        );

        // check current email if no changes will save the current email and current password
        if (checkUser[0].Email === email) {
          await pool.query(
            'UPDATE tbl_Users SET Email = ?, Password = ? WHERE UserID = ?',
            [email, checkUser[0].Password, req.params.UserID]
          );

          const [updatedUser] = await pool.query(
            'SELECT * FROM tbl_Users WHERE UserID = ?',
            [req.params.UserID]
          );

          return res.json({
            user: updatedUser[0],
            msg: 'Update User Successful',
          });
        }

        // if new email will check again if it is not existing before saving the email and password
        const [rows] = await pool.query(
          'SELECT COUNT(*) AS count FROM tbl_Users WHERE email = ?',
          [email]
        );

        if (rows[0].count > 0) {
          return res
            .status(400)
            .json({ errors: [{ msg: 'Email already exists' }] });
        }

        await pool.query(
          'UPDATE tbl_Users SET Email = ?, Password = ? WHERE UserID = ?',
          [email, checkUser[0].Password, req.params.UserID]
        );

        const [updatedUser] = await pool.query(
          'SELECT * FROM tbl_Users WHERE UserID = ?',
          [req.params.UserID]
        );

        return res.json({
          user: updatedUser[0],
          msg: 'Update User Successful',
        });
      } else {
        const [checkUser] = await pool.query(
          'SELECT * FROM tbl_Users WHERE UserID = ?',
          [req.params.UserID]
        );

        // check current email if no changes will save the current email and new password
        if (checkUser[0].Email === email) {
          // hash and update password
          const salt = await bcrypt.genSalt(10);

          const newPassword = await bcrypt.hash(password, salt);

          await pool.query(
            'UPDATE tbl_Users SET Email = ?, Password = ? WHERE UserID = ?',
            [email, newPassword, req.params.UserID]
          );

          const [updatedUser] = await pool.query(
            'SELECT * FROM tbl_Users WHERE UserID = ?',
            [req.params.UserID]
          );

          return res.json({
            user: updatedUser[0],
            msg: 'Update User Successful',
          });
        }

        // if new email will check again if it is not existing before saving the email and password
        const [rows] = await pool.query(
          'SELECT COUNT(*) AS count FROM tbl_Users WHERE email = ?',
          [email]
        );

        if (rows[0].count > 0) {
          return res
            .status(400)
            .json({ errors: [{ msg: 'Email already exists' }] });
        }
        // hash and update password
        const salt = await bcrypt.genSalt(10);

        const newPassword = await bcrypt.hash(password, salt);

        await pool.query(
          'UPDATE tbl_Users SET Email = ?, Password = ? WHERE UserID = ?',
          [email, newPassword, req.params.UserID]
        );

        const [updatedUser] = await pool.query(
          'SELECT * FROM tbl_Users WHERE UserID = ?',
          [req.params.UserID]
        );

        return res.json({
          user: updatedUser[0],
          msg: 'Update User Successful',
        });
      }
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

// deletion or deactivation
// @route    DELETE api/admin/user/:UserID
// @desc     Delete User
// @access   Private
router.delete('/delete-user/:UserID', auth, async (req, res) => {
  try {
    if (!req.params.UserID || isNaN(req.params.UserID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const [result] = await pool.query(
      'DELETE FROM tbl_Users WHERE UserID = ?',
      [req.params.UserID]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ errors: [{ msg: 'User not found' }] });
    }

    // Check if Contact exists in tbl_Contacts
    const [contactExist] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE UserID = ?',
      [req.params.UserID]
    );
    if (contactExist.length > 0) {
      // delete the contact photo in cloudinary
      contactExist.map(
        async (contact) =>
          await cloudinary.uploader.destroy(contact.ContactPhoto)
      );

      // delete the contact in MySQL
      await pool.query('DELETE FROM tbl_Contacts WHERE UserID = ?', [
        req.params.UserID,
      ]);

      // delete the users shared contacts in MySQL
      await pool.query('DELETE FROM tbl_SharedContacts WHERE UserID = ?', [
        req.params.UserID,
      ]);
    }

    return res.json({ msg: 'Delete User Successful' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
