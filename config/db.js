const mongoose = require('mongoose');

const getMongoUri = () => {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    process.env.MONGO_PRIVATE_URL ||
    ''
  );
};

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    console.error('\n❌ ========================================================');
    console.error('   FATAL: MongoDB connection string is MISSING!');
    console.error('   --------------------------------------------------------');
    console.error('   Please set MONGODB_URI or MONGO_URL in your environment.');
    console.error('   • On Railway: Go to your project -> Service -> Variables');
    console.error('   • Add: MONGODB_URI = <your MongoDB connection string>');
    console.error('   • Or link a Railway MongoDB database (which sets MONGO_URL)');
    console.error('========================================================\n');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

