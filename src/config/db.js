const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, { autoIndex: true });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
};

module.exports = connectDB;
