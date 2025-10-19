import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "dompurify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Check if content contains HTML tags
function isHtml(content: string): boolean {
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(content);
}

// Sanitize HTML content for safe rendering
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead'
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'style', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

// Render email body content (HTML or plain text)
export function renderEmailBody(body: string): { __html: string } {
  if (isHtml(body)) {
    return { __html: sanitizeHtml(body) };
  }
  // For plain text, preserve line breaks and wrap in paragraph
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return { __html: `<p>${escaped.replace(/\n/g, '<br>')}</p>` };
}
