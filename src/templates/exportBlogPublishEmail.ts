type BlogPublishEmailInput = {
  title: string;
  excerpt: string;
  imageUrl?: string;
  readMoreUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildExportBlogPublishEmailHtml(
  input: BlogPublishEmailInput,
): string {
  const title = escapeHtml(input.title);
  const excerpt = escapeHtml(input.excerpt);
  const readMoreUrl = escapeHtml(input.readMoreUrl);
  const imageUrl = input.imageUrl ? escapeHtml(input.imageUrl) : '';

  const imageBlock = imageUrl
    ? `<tr>
        <td style="padding:0 24px 20px;">
          <img
            src="${imageUrl}"
            alt="${title}"
            width="552"
            style="display:block;width:100%;max-width:552px;height:auto;border-radius:12px;border:0;"
          />
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New article on Kargic</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 24px 8px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#047857;">
                  Kargic Export Blog
                </p>
                <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:700;color:#111827;">
                  ${title}
                </h1>
              </td>
            </tr>
            ${imageBlock}
            <tr>
              <td style="padding:0 24px 24px;">
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4b5563;">
                  ${excerpt}
                </p>
                <a
                  href="${readMoreUrl}"
                  style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;"
                >
                  Read more
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                  You are receiving this email because you have an active Kargic account.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildExportBlogPublishEmailSubject(title: string): string {
  return `New on Kargic Export Blog: ${title}`;
}
