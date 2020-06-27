const path = require('path');

const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const hpp = require('hpp');
const log = require('consola');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const xssClean = require('xss-clean');
const YAML = require('yamljs');

const { connectDB } = require('./config/db');
const { CustomError } = require('./utils/errors');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Connect to database
connectDB();

const app = express();

// Body Parser
app.use(express.json());

// Cookie Parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Sanitize data
app.use(mongoSanitize());

// Set Security Headers
app.use(helmet());

// Prevent http parameter pollution
app.use(hpp());

// Prevent Cross-Site Scripting Attacs
app.use(xssClean());

// Enable CORS
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
});
app.use(limiter);

app.use(
  fileUpload({
    limits: { fileSize: 1 * 1024 * 1024 },
  })
);

app.use(express.static(path.join(process.cwd(), 'public')));

const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.send({ message: 'Hello from express' });
});

app.use('/api/v1/bootcamps', require('./routes/bootcamps'));
app.use('/api/v1/courses', require('./routes/courses'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/reviews', require('./routes/reviews'));

// Generic Error Handler
app.use((err, req, res, next) => {
  log.error(err);

  let status = 500;
  let message = 'Server Error';

  // Custom Errors can be returned
  if (err instanceof CustomError) {
    status = err.status;
    message = err.message;
  }

  // Faulty Mongoose ObjectId
  if (err.name && err.name === 'CastError') {
    status = 404;
    message = `Resource not found.`;
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    status = 400;
    message = 'Duplicate key value';
  }

  // Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((val) => val.message);
  }

  res.status(status).json({
    success: false,
    error: message,
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  log.success(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled rejections
process.on('unhandledRejection', (err, promise) => {
  log.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
