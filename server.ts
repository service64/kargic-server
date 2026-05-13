import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './src/config';
import { registerChatSocket } from './src/socket/registerChatSocket';

const port = Number(config.port) || 50001;

async function main() {
  try {
    await mongoose.connect(config.database_url);

    console.log('Database connected successfully');

    const server = http.createServer(app);
    registerChatSocket(server);

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log('Database connection failed', error);
  }
}

main();
