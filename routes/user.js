const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');

const pool = require('../config/mysql');
const sharedContactsWith = require('../models/SharedContactsWith');

// @route    GET api/user/all-active-users
// @desc     Get all users
// @access   Private
router.get('/all-active-users/:ContactID', auth, async (req, res) => {
  try {
    const data = [];
    //Check if valid Contact ID
    if (!req.params.ContactID || isNaN(req.params.ContactID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if UserID exists in tbl_Users
    const [contactExists] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
      [req.params.ContactID]
    );
    if (contactExists.length === 0) {
      return res.status(404).json({ error: 'Contact ID not found' });
    }

    const [users] = await pool.query(
      'SELECT * FROM tbl_Users WHERE isAdmin = ? AND isActive = ? AND UserID != ?',
      [0, 1, contactExists[0].UserID]
    );

    const sharedContacts = await sharedContactsWith.findOne({
      ContactID: Number(req.params.ContactID),
    });

    if (!sharedContacts) {
      res.json(users);
    } else {
      // will check if the array of users exist in sharedWith
      users.forEach((user) => {
        if (sharedContacts.sharedWith.includes(user.UserID)) {
          data.push({
            UserID: user.UserID,
            Email: user.Email,
            isShared: true,
          });
        } else {
          data.push({
            UserID: user.UserID,
            Email: user.Email,
            isShared: false,
          });
        }
      });

      res.json(data);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/user/all-contacts
// @desc     Get all users
// @access   Private
router.get('/all-contacts/:UserID', auth, async (req, res) => {
  try {
    if (!req.params.UserID || isNaN(req.params.UserID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Fetch ContactIDs FROM tbl_SharedContacts using the UserID of the one who signin
    const [rowsContactID] = await pool.query(
      'SELECT ContactID FROM tbl_SharedContacts WHERE UserID = ?',
      [req.params.UserID]
    );

    // Original Contacts of the User who signin
    const [finalContacts] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE UserID = ?',
      [req.params.UserID]
    );

    // Check if there are contacts that were shared to that user if none proceed to showing the finalContacts
    if (rowsContactID.length != 0) {
      // map the rowsContactID to retrieve the array of ids
      const sharedContactIDs = rowsContactID.map((rows) => rows.ContactID);

      // Fetch Contacts using the Array of ContactIDs from the Shared Contacts
      const [results] = await pool.query(
        `SELECT * FROM tbl_Contacts WHERE ContactID IN (?)`,
        [sharedContactIDs]
      );

      // push to the finalContacts
      results.map((result) => {
        finalContacts.push(result);
      });
    }

    res.json(finalContacts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route  POST api/user/share-contacts-with
//@desc   Share Contact
//@access Private
router.post('/share-contacts-with', auth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { UserID, ContactID, sharedWith } = req.body;

  if (sharedWith.length === 0) {
    return res.status(400).json({
      errors: [{ msg: 'Please select users to share this contact with' }],
    });
  }

  //Check if valid User ID
  if (!UserID || isNaN(UserID)) {
    return res.status(400).json({ errors: [{ msg: 'Invalid ID format' }] });
  }

  // Check if UserID exists in tbl_Users
  const [userExists] = await pool.query(
    'SELECT UserID FROM tbl_Users WHERE UserID = ?',
    [UserID]
  );
  if (userExists.length === 0) {
    return res.status(404).json({ errors: [{ msg: 'User ID not found' }] });
  }

  // will use to check the ContactID and UserIDs if existed in the SharedContacts
  const sharedUserIDs = sharedWith.map((shareduserid) => shareduserid);
  const [results] = await pool.query(
    `SELECT * FROM tbl_SharedContacts WHERE ContactID = ? AND UserID IN (?)`,
    [ContactID, sharedUserIDs]
  );

  if (results.length !== 0) {
    await pool.query(
      'DELETE FROM tbl_SharedContacts WHERE ContactID = ? AND UserID IN (?)',
      [ContactID, sharedUserIDs]
    );
  }

  // map all the shared UserIDs and the ContactID that is being shared
  const sharedUserIDsWithContact = sharedWith.map((shareduserid) => [
    ContactID,
    shareduserid,
  ]);

  // Add shared contacts using the IDs of the users and Contact ID of the Contact
  const query = `INSERT INTO tbl_SharedContacts (ContactID, UserID) VALUES ?`;
  await pool.query(query, [sharedUserIDsWithContact]);

  await sharedContactsWith.findOneAndUpdate(
    { ContactID: ContactID },
    { $set: { UserID, ContactID, sharedWith } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ msg: 'Contacts shared successfully!' });
});

// Create Contacts
//@route  POST api/user/add-contact
//@desc   Create Contact
//@access Private
router.post(
  '/add-contact/:UserID',
  [auth, upload.single('contactphoto')],
  [
    check('firstname', 'Firstname is required').not().isEmpty(),
    check('lastname', 'Lastname is required').not().isEmpty(),
    check('contactnumber', 'Contact Number is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstname, lastname, contactnumber, email } = req.body;

    if (!req.file)
      return res
        .status(400)
        .json({ errors: [{ msg: 'No Contact Photo uploaded' }] });

    //handle upload images in cloudinary
    cloudinary.uploader.upload(req.file.path, async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error',
        });
      }

      //Check if valid ID
      if (!req.params.UserID || isNaN(req.params.UserID)) {
        return res.status(400).json({ errors: [{ msg: 'Invalid ID format' }] });
      }

      // Check if UserID exists in tbl_Users
      const [userExists] = await pool.query(
        'SELECT UserID FROM tbl_Users WHERE UserID = ?',
        [req.params.UserID]
      );
      if (userExists.length === 0) {
        return res.status(404).json({ errors: [{ msg: 'User ID not found' }] });
      }

      try {
        const [insertContact] = await pool.query(
          'INSERT INTO tbl_Contacts (UserID, firstname, lastname, contactnumber, email, contactphoto) VALUES (?, ?, ?, ?, ?, ?)',
          [
            req.params.UserID,
            firstname,
            lastname,
            contactnumber,
            email,
            result.public_id,
          ]
        );

        const [newContact] = await pool.query(
          'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
          [insertContact.insertId]
        );

        res.json({
          contact: newContact[0],
          msg: 'Contact Added Successfully!',
        });
      } catch (err) {
        res.status(400).send(err.message);
      }
    });
  }
);

// Update Contacts
//@route  PUT api/user/update-contact
//@desc   Update Contact
//@access Private
router.put(
  '/update-contact/:ContactID',
  [auth, upload.single('contactphoto')],
  [
    check('firstname', 'Firstname is required').not().isEmpty(),
    check('lastname', 'Lastname is required').not().isEmpty(),
    check('contactnumber', 'Contact Number is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstname, lastname, contactnumber, email } = req.body;

    cloudinary.uploader.upload(req.file.path, async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error',
        });
      }

      //Check if valid ID
      if (!req.params.ContactID || isNaN(req.params.ContactID)) {
        return res.status(400).json({ errors: [{ msg: 'Invalid ID format' }] });
      }

      // Check if ContactID exists in tbl_Contacts
      const [contactExist] = await pool.query(
        'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
        [req.params.ContactID]
      );
      if (contactExist.length === 0) {
        return res
          .status(404)
          .json({ errors: [{ msg: 'Contact ID not found' }] });
      }

      try {
        await pool.query(
          'UPDATE tbl_Contacts SET Firstname = ?, Lastname = ?, Email = ?, ContactNumber = ?, ContactPhoto = ? WHERE ContactID = ?',
          [
            firstname,
            lastname,
            email,
            contactnumber,
            result.public_id,
            req.params.ContactID,
          ]
        );

        const [updatedContact] = await pool.query(
          'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
          [req.params.ContactID]
        );

        res.json({
          contact: updatedContact[0],
          msg: 'Contact Updated Successfully!',
        });
      } catch (err) {
        res.status(400).send(err.message);
      }
    });
  }
);

// Delete Contacts
// @route    DELETE api/user/delete-contact
// @desc     Delete contact
// @access   Private
router.delete('/delete-contact/:ContactID', auth, async (req, res) => {
  try {
    if (!req.params.ContactID || isNaN(req.params.ContactID)) {
      return res.status(400).json({ errors: [{ msg: 'Invalid ID format' }] });
    }

    // Check if Contact exists in tbl_Contacts
    const [contactExist] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
      [req.params.ContactID]
    );
    if (contactExist.length === 0) {
      return res
        .status(404)
        .json({ errors: [{ msg: 'Contact ID not found' }] });
    }

    // delete the contact photo in cloudinary
    await cloudinary.uploader.destroy(contactExist[0].ContactPhoto);

    // delete the contact in MySQL
    await pool.query('DELETE FROM tbl_Contacts WHERE ContactID = ?', [
      req.params.ContactID,
    ]);

    res.json({ msg: 'Contact Deleted Successfully!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Share or Unshare the contacts within the users of the application

module.exports = router;
