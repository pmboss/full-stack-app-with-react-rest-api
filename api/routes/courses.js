const express = require('express');

const router = express.Router();
const Course = require('../models').Course;
const User = require('../models').User;
const { authenticateUser } = require('../middleware/auth-user');
const { asyncHandler } = require('../middleware/async-handler');
require('dotenv').config();

const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
module.exports = s3;

// Return all courses
router.get('/courses', asyncHandler(async (req, res) => {
  let courses = await Course.findAll({
    attributes: {
      exclude: ['createdAt', 'updatedAt']
    },
    include: {
      model: User,
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt']
      }
    }
  });
  res.json(courses);
}));

router.get('/courses/upload-url', authenticateUser, asyncHandler(async (req, res) => {
  console.log("Query Parameters:", req.query);
  
  const { filename, fileType } = req.query;

  if (!filename || !fileType) {
    return res.status(400).json({ error: 'Filename and fileType are required' });
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `course-images/${Date.now()}-${filename}`,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read',
  };

  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
  console.log(process.env.AWS_S3_BUCKET_NAME, process.env.AWS_REGION);
  

  res.json({
    uploadUrl,
    fileUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`,
  });
}));

// Return a specific course
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id, {
    attributes: {
      exclude: ['createdAt', 'updatedAt']
    },
    include: {
      model: User,
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt']
      }
    }
  });
  if (course) {
    res.json(course);
  } else {
    res.json({
      "error": "Sorry, we couldn't find the course you were looking for."
    });
  }
}));

router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const { title, description, estimatedTime, materialsNeeded, imageUrl } = req.body;
    const userId = req.currentUser.id;

    const newCourse = await Course.create({
      title,
      description,
      estimatedTime,
      materialsNeeded,
      imageUrl,
      userid: userId
    });

    res.status(201).location(`/courses/${newCourse.id}`).end();
  } catch (error) {
    console.log('ERROR:', error.name);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ errors: error.errors.map(err => err.message) });
    } else {
      throw error;
    }
  }
}));

// Update an existing course
router.put("/courses/:id", authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser;
  let course;
  try {
    course = await Course.findByPk(req.params.id);
    if (course) {
      if (course.userId === user.id) {
        await course.update(req.body);
        res.status(204).end();
      } else {
        res.status(403).json({ error: 'You are not authorised to update this course.' });
      }
    } else {
      const err = new Error(`Course Not Found`);
      res.status(404).json({ error: err.message });
    }
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });
    } else {
      throw error;
    }
  }
}));

router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const course = await Course.findByPk(req.params.id);

  if (course) {
    if (course.userid === user.id) {
      await course.update(req.body);
      res.status(204).end();
    } else {
      res.status(403).json({ error: 'You are not authorized to update this course.' });
    }
  } else {
    res.status(404).json({ error: 'Course not found' });
  }
}));


// Delete an existing course
router.delete("/courses/:id", authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser;
  const course = await Course.findByPk(req.params.id);
  if (course) {
    if (course.userId === user.id) {
      await course.destroy();
      res.status(204).end();
    } else {
      res.status(403).json({ error: 'You are not authorised to delete this course.' });
    }
  } else {
    const err = new Error(`Course Not Found`);
    res.status(404).json({ error: err.message });
  }
}));

module.exports = router;

