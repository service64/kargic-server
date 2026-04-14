import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const getR2Config = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const bucketUrl = process.env.R2_BUCKET_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !bucketUrl) {
    throw new Error(
      'R2 configuration incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_BUCKET_URL'
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    bucketUrl,
  };
};

export const getR2Client = (): S3Client => {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export const getR2BucketName = (): string => getR2Config().bucketName;

export const getR2BucketUrl = (): string => getR2Config().bucketUrl;

export { PutObjectCommand, DeleteObjectCommand };
