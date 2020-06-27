const path = require('path');

const Bootcamp = require('../models/Bootcamp');
const log = require('consola');

const Geocoder = require('../utils/geocoder.js');
const { CustomError } = require('../utils/errors');
const wrap = require('../middleware/wrap');

// @desc   Get all Bootcamps
// @route  GET /api/v1/bootcamps
// @access Public
exports.getBootcamps = wrap(async (req, res, next) => {
  res.status(200).json(res.results);
});

// @desc   Get single Bootcamp
// @route  GET /api/v1/bootcamps/:id
// @access Public
exports.getBootcamp = wrap(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    throw new CustomError(`Not Found. Bootcamp id: ${req.params.id}`, 404);
  }
  res.status(200).json({ success: true, data: bootcamp });
});

// @desc   Create Bootcamp
// @route  POST /api/v1/bootcamps
// @access Private
exports.createBootcamp = wrap(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check for published bootcamp
  publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });
  // Only admin can publish more than one Bootcamp
  if (publishedBootcamp && req.user.role !== 'admin') {
    return next(
      new CustomError(
        `The user with id: ${req.user.id} has already published a bootcamp`,
        400
      )
    );
  }

  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({ success: true, data: bootcamp });
});

// @desc   Update Bootcamp
// @route  PUT /api/v1/bootcamps/:id
// @access Private
exports.updateBootcamp = wrap(async (req, res, next) => {
  // new: true returns updated record
  let bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    throw new CustomError(`Not Found. Bootcamp id: ${req.params.id}`, 404);
  }

  // Ensure user = bootcamp owner or admin to allow modify
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        `The user with id: ${req.user.id} is not authorized to update this bootcamp`,
        401
      )
    );
  }

  bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: bootcamp });
});

// @desc   Delete Bootcamp
// @route  DELETE /api/v1/bootcamps/:id
// @access Private
exports.deleteBootcamp = wrap(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    throw new CustomError(`Not Found. Bootcamp id: ${req.params.id}`, 404);
  }

  // Ensure user = bootcamp owner or admin to allow delete
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        `The user with id: ${req.user.id} is not authorized to delete this bootcamp`,
        401
      )
    );
  }
  bootcamp.remove();
  res.status(200).json({ success: true, data: {} });
});

// @desc   Get Bootcamps within a radius
// @route  GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access Private
exports.getBootcampsInRadius = wrap(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from zipcode
  const loc = await Geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  // Calc radiys using radian
  // Divide dist by radius of earth
  // Earth Radius = 3963mi 6378km
  const radius = distance / 6378;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({ success: true, count: bootcamps.length, data: bootcamps });
});

// @desc   Upload Bootcamp Photo
// @route  PUT /api/v1/bootcamps/:id/photo
// @access Private
exports.uploadBootcampImage = wrap(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    throw new CustomError(`Not Found. Bootcamp id: ${req.params.id}`, 404);
  }
  // Ensure user = bootcamp owner or admin to allow modify
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        `The user with id: ${req.user.id} is not authorized to update this bootcamp`,
        401
      )
    );
  }

  if (!req.files) {
    throw new CustomError(`Please upload an image file`, 400);
  }

  const file = req.files.file;
  // Make sure the image has correct mime type
  if (!file.mimetype.startsWith('image')) {
    throw new CustomError('Upload needs to be an image file', 400);
  }

  // Check File Size
  if (file.size > process.env.FILE_UPLOAD_MAX_SIZE) {
    throw new CustomError(
      `Image upload file size can be max ${process.env.FILE_UPLOAD_MAX_SIZE}`,
      400
    );
  }

  // Create unique file name
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
  file.mv(path.join(process.env.FILE_UPLOAD_PATH, file.name), async (err) => {
    if (err) {
      log.error(err);
      return next(new CustomError('Problem uploading file', 500));
    }
    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
    res.status(200).json({ success: true, data: { file: file.name } });
  });
});
