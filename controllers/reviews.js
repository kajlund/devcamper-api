const { CustomError } = require('../utils/errors');
const wrap = require('../middleware/wrap');
const Review = require('../models/Review');
const Bootcamp = require('../models/Bootcamp');

// @desc      Get reviews
// @route     GET /api/v1/reviews
// @route     GET /api/v1/reviews/:bootcampId/reviews
// @access    Public
exports.getReviews = wrap(async (req, res, next) => {
  if (req.params.bootcampId) {
    const reviews = await Review.find({ bootcamp: req.params.bootcampId });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } else {
    res.status(200).json(res.results);
  }
});

// @desc      Get review by id
// @route     GET /api/v1/reviews/:id
// @access    Public
exports.getReview = wrap(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate({
    path: 'bootcamp',
    select: 'name description',
  });

  if (!review) {
    return next(new CustomError(`Not Found. Review id: ${req.params.id}`, 404));
  }
  res.status(200).json({ success: true, data: review });
});

// @desc      Add review
// @route     POST /api/v1/bootcamps/:bootcampId/reviews
// @access    Private
exports.addReview = wrap(async (req, res, next) => {
  req.body.bootcamp = req.params.bootcampId;
  req.body.user = req.user.id;

  const bootcamp = await Bootcamp.findById(req.params.bootcampId);
  if (!bootcamp) {
    return next(new CustomError(`Not Found. Bootcamp id: ${req.params.bootcampId}`, 404));
  }

  const review = await Review.create(req.body);
  res.status(201).json({ success: true, data: review });
});

// @desc      Update review
// @route     PUT /api/v1/reviews/:id
// @access    Private
exports.updateReview = wrap(async (req, res, next) => {
  let review = await Review.findById(req.params.id);
  if (!review) {
    return next(new CustomError(`Not Found. Review id: ${req.params.id}`, 404));
  }

  // Ensure review belongs to user or user is admin
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new CustomError(`Not authorized. Review id: ${req.params.id}`, 401));
  }

  review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: review });
});

// @desc      Delete review
// @route     DELETE /api/v1/reviews/:id
// @access    Private
exports.deleteReview = wrap(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new CustomError(`Not Found. Review id: ${req.params.id}`, 404));
  }

  // Ensure review belongs to user or user is admin
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new CustomError(`Not authorized. Review id: ${req.params.id}`, 401));
  }

  await Review.remove();

  res.status(200).json({ success: true, data: {} });
});
