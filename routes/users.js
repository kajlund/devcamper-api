const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/users');

const User = require('../models/User');

const router = express.Router();

const query = require('../middleware/query');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes from anyone except admin
router.use(protect);
router.use(authorize('admin'));

router.route('/').get(query(User), getUsers).post(createUser);

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
