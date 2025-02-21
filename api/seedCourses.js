const { faker } = require('@faker-js/faker');
const { Sequelize } = require('sequelize');
const db = require('./models');
const Course = db.Course;
const User = db.User;

async function seedCourses() {
  try {
    await db.sequelize.sync();

    const users = await User.findAll({ attributes: ['id'] });
    if (users.length === 0) {
      console.log("No users found. Please create users before adding courses.");
      return;
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
    console.log('✅ Successfully added 1000 dummy courses.');
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
  } finally {
    process.exit();
  }
}

seedCourses();
