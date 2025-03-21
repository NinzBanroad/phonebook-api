const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const pool = require('../config/mysql');

// Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// @route    GET api/user/all-contacts
// @desc     Get all users
// @access   Private
router.get('/all-contacts/:UserID', auth, async (req, res) => {
  try {
    if (!req.params.UserID || isNaN(req.params.UserID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE UserID = ?',
      [req.params.UserID]
    );

    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
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

    const contactphoto = req.file ? req.file.filename : null;

    //Check if valid ID
    if (!req.params.UserID || isNaN(req.params.UserID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if UserID exists in tbl_Users
    const [userExists] = await pool.query(
      'SELECT UserID FROM tbl_Users WHERE UserID = ?',
      [req.params.UserID]
    );
    if (userExists.length === 0) {
      return res.status(404).json({ error: 'User ID not found' });
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO tbl_Contacts (UserID, firstname, lastname, contactnumber, email, contactphoto) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.params.UserID,
          firstname,
          lastname,
          contactnumber,
          email,
          contactphoto,
        ]
      );

      const [newContact] = await pool.query(
        'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
        [result.insertId]
      );

      res.json({ contact: newContact[0] });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
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

    const contactphoto = req.file ? req.file.filename : req.body.contactphoto;

    //Check if valid ID
    if (!req.params.ContactID || isNaN(req.params.ContactID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if ContactID exists in tbl_Contacts
    const [contactExist] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
      [req.params.ContactID]
    );
    if (contactExist.length === 0) {
      return res.status(404).json({ error: 'Contact ID not found' });
    }

    try {
      await pool.query(
        'UPDATE tbl_Contacts SET Firstname = ?, Lastname = ?, Email = ?, ContactNumber = ?, ContactPhoto = ? WHERE ContactID = ?',
        [
          firstname,
          lastname,
          email,
          contactnumber,
          contactphoto,
          req.params.ContactID,
        ]
      );

      const [updatedContact] = await pool.query(
        'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
        [req.params.ContactID]
      );

      res.json(updatedContact[0]);
    } catch (err) {
      console.error(err.message);
      res.status.send('Server Error');
    }
  }
);

// Delete Contacts
// @route    DELETE api/user/delete-contact
// @desc     Delete contact
// @access   Private
router.delete('/delete-contact/:ContactID', auth, async (req, res) => {
  try {
    if (!req.params.ContactID || isNaN(req.params.ContactID)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if Contact exists in tbl_Contacts
    const [contactExist] = await pool.query(
      'SELECT * FROM tbl_Contacts WHERE ContactID = ?',
      [req.params.ContactID]
    );
    if (contactExist.length === 0) {
      return res.status(404).json({ error: 'Contact ID not found' });
    }

    const [result] = await pool.query(
      'DELETE FROM tbl_Contacts WHERE ContactID = ?',
      [req.params.ContactID]
    );

    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Share or Unshare the contacts within the users of the application

module.exports = router;
