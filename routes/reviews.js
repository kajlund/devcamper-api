const express = require('express');

const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviews');

const { protect, authorize } = require('../middleware/auth');

const Review = require('../models/Review');
const query = require('../middleware/query');
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(query(Review, { path: 'bootcamp', select: 'name description' }), getReviews)
  .post(protect, authorize('user', 'admin'), addReview);

router
  .route('/:id')
  .get(getReview)
  .put(protect, authorize('user', 'admin'), updateReview)
  .delete(protect, authorize('user', 'admin'), deleteReview);

module.exports = router;
