const Geocoder = require('node-geocoder');

const opt = {
  provider: process.env.GEOCODER_PROVIDER,
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null,
};

module.exports = Geocoder(opt);
