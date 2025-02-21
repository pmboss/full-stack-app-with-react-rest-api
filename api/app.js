'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const { sequelize } = require('./models');
const cors = require('cors');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

const userRouter = require('./routes/users');
const courseRouter = require('./routes/courses');

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan('dev'));

// set up cors 
app.use(cors());

// set up Express to work with JSON
app.use(express.json());

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// Add routes
app.use('/api', userRouter);
app.use('/api', courseRouter);

app.get('/api/error/:status_code', (req, res, next) => {
  const { status_code } = req.params;
  const status = parseInt(status_code, 10);

  const validStatuses = [401, 403, 404, 500];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status code. Use 401, 403, 404, or 500.' });
  }

  const errorMessages = {
    401: 'Unauthorized access',
    403: 'Forbidden access',
    404: 'Resource not found',
    500: 'Internal server error',
  };

  const error = new Error(errorMessages[status]);
  error.status = status;
  next(error);
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const seedCourses = async () => {
  try {
    const users = await User.findAll({ attributes: ['id'] });
    if (users.length === 0) {
      throw new Error("No users found. Please create users before adding courses.");
    }

    const courses = [];
    for (let i = 0; i < 1000; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      courses.push({
        title: faker.lorem.words(5),
        description: faker.lorem.paragraph(),
        estimatedTime: `${faker.number.int({ min: 1, max: 20 })} hours`,
        materialsNeeded: faker.lorem.sentence(),
        userId: randomUser.id,
      });
    }

    await Course.bulkCreate(courses);
    return "1000 dummy courses inserted successfully!";
  } catch (error) {
    throw new Error(`Error seeding courses: ${error.message}`);
  }
};


const findNthPrime = (n) => {
  let primes = [2];
  let num = 3;
  while (primes.length < n) {
    if (primes.every(p => num % p !== 0)) {
      primes.push(num);
    }
    num += 2;
  }
  return primes[n - 1];
};

app.get('/api/sleep', async (req, res) => {
  let { seconds, tasks } = req.query;
  seconds = parseInt(seconds, 10);
  tasks = parseInt(tasks, 10);

  if (isNaN(seconds) || seconds < 0 || seconds >= 1000) {
    return res.status(400).json({ error: 'Seconds must be an integer < 1000' });
  }
  if (isNaN(tasks) || tasks < 0 || tasks > 3) {
    return res.status(400).json({ error: 'Tasks must be an integer (0, 1, 2, or 3)' });
  }

  console.log(`Sleeping for ${seconds} seconds...`);
  await sleep(seconds * 1000);

  let resultMessage = `Slept for ${seconds} seconds`;

  if (tasks === 1) {
    console.log('Running CPU-heavy task: Finding 1000th prime...');
    const prime = findNthPrime(1000);
    resultMessage += ` | 1000th prime is ${prime}`;
  } 
  else if (tasks === 2) {
    console.log('Running DB-heavy task: Creating 1000 dummy courses...');
    const message = await seedCourses();
    resultMessage += ` | ${message}`;
  }

  res.json({ message: resultMessage });
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// Test the database connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database: ', error);
  }
})();

// start listening on our port
sequelize.sync()
  .then(() => {
    const server = app.listen(app.get('port'), () => {
      console.log(`Express server is listening on port ${server.address().port}`);
    });
  });