import config from '../../config';
import { User } from '../auth/user/user.model';
import { sendEmail } from '../../utils/sendEmail';
import {
  buildExportBlogPublishEmailHtml,
  buildExportBlogPublishEmailSubject,
} from '../../templates/exportBlogPublishEmail';
import { ExportBlog } from './exportBlog.model';

const BATCH_SIZE = 20;

const populateOptions = [
  { path: 'featuredImage', select: '_id url name alt' },
  { path: 'seo.image', select: '_id url name alt' },
];

type PopulatedImage = { url?: string } | null | undefined;

function getFeaturedImageUrl(featuredImage: unknown): string | undefined {
  if (!featuredImage || typeof featuredImage !== 'object') return undefined;
  const url = (featuredImage as PopulatedImage)?.url;
  return typeof url === 'string' && url.trim() ? url : undefined;
}

function buildBlogDetailUrl(slug: string): string {
  const locale = config.blog_email_default_locale;
  return `${config.frontend_base_url}/${locale}/resources/export-blog/${encodeURIComponent(slug)}`;
}

async function getActiveUserEmails(): Promise<string[]> {
  const users = await User.find({
    deletedAt: null,
    status: 'ACTIVE',
    isVerified: true,
  })
    .select('email')
    .lean();

  const emails = users
    .map((user) => user.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));

  return [...new Set(emails)];
}

async function sendEmailsInBatches(
  emails: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((email) => sendEmail(email, subject, html)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed };
}

export async function sendBlogPublishNotifications(blogId: string): Promise<void> {
  const claimed = await ExportBlog.findOneAndUpdate(
    {
      _id: blogId,
      status: 'published',
      $or: [
        { publishNotificationSentAt: null },
        { publishNotificationSentAt: { $exists: false } },
      ],
    },
    { $set: { publishNotificationSentAt: new Date() } },
    { new: false },
  )
    .populate(populateOptions)
    .lean();

  if (!claimed) return;

  const emails = await getActiveUserEmails();
  if (emails.length === 0) {
    console.info(`Blog publish notification skipped: no active users (${blogId})`);
    return;
  }

  const excerpt =
    claimed.excerpt?.trim() ||
    claimed.seo?.description?.trim() ||
    'Read the latest export insights on Kargic.';

  const html = buildExportBlogPublishEmailHtml({
    title: claimed.title,
    excerpt,
    imageUrl: getFeaturedImageUrl(claimed.featuredImage),
    readMoreUrl: buildBlogDetailUrl(claimed.slug),
  });

  const subject = buildExportBlogPublishEmailSubject(claimed.title);

  const { sent, failed } = await sendEmailsInBatches(emails, subject, html);

  console.info(
    `Blog publish notification for "${claimed.title}" (${blogId}): sent=${sent}, failed=${failed}, total=${emails.length}`,
  );
}

export function scheduleBlogPublishNotifications(blogId: string): void {
  void sendBlogPublishNotifications(blogId).catch((err) => {
    console.error(`Blog publish notification failed for ${blogId}`, err);
  });
}
