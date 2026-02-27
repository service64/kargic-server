export default {
  database_url: process.env.DATABASE_URL as string,
  port: process.env.PORT || 3000,
  jwt_secret: process.env.JWT_SECRET as string,
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '1d',
};
