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

const connectDB = async (retries = 5, delayMs = 4000) => {
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt < retries) {
        console.log(`⏳ Retrying MongoDB connection in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('❌ All MongoDB connection attempts failed. Check Atlas IP whitelist (0.0.0.0/0).');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

