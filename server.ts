import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app';
import config from './src/config';

const port = Number(config.port) || 50001;

async function main() {
  try {
    await mongoose.connect(config.database_url);

    console.log('Database connected successfully');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log('Database connection failed', error);
  }
}

main();
