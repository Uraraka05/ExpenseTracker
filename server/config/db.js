import mongoose from 'mongoose';

// Function to connect to MongoDB
const connectDB = async () => {

  // --- ADD THIS LINE ---
  console.log("ATTEMPTING TO CONNECT WITH URI:", process.env.MONGO_URI);
  // ---------------------

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log("MONGO CONNECTION ERROR:", error); 
    process.exit(1); 
  }
};

export default connectDB;