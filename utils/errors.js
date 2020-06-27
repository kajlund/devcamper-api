class CustomError extends Error {
  constructor(message = 'Server Error', status = 500) {
    super(message);
    this.status = status;
  }
}

module.exports = {
  CustomError,
};
