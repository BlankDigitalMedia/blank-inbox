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

// Module-level guard to prevent hook accumulation
let hooksInitialized = false;

// Initialize DOMPurify hooks exactly once
function initDomPurifyHooks(): void {
  if (hooksInitialized) return;
  hooksInitialized = true;

  // Protocol allowlist for src/href attributes
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'src' || data.attrName === 'href') {
      const val = (data.attrValue || '').trim();
      const isHttp = /^(https?:)?\/\//i.test(val) || val.startsWith('/');
      const isCid = /^cid:/i.test(val);
      const isDataImage = /^data:image\/(png|jpe?g|gif|webp);/i.test(val) && data.attrName === 'src';
      if (!(isHttp || isCid || isDataImage)) {
        data.keepAttr = false;
      }
    }
    // Forbid JS event handlers
    if (/^on/i.test(data.attrName)) {
      data.keepAttr = false;
    }
  });

  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    // Enforce rel attribute on links
    if (node.tagName === 'A' && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    
    // Strip tracking pixels (tiny invisible images)
    if (node.tagName === 'IMG') {
      const w = parseInt(node.getAttribute('width') || '0', 10);
      const h = parseInt(node.getAttribute('height') || '0', 10);
      const style = (node.getAttribute('style') || '').toLowerCase();
      const zeroSized = (w && w <= 2 && h && h <= 2);
      const hidden = style.includes('display:none') || style.includes('opacity:0');
      if (zeroSized || hidden) {
        node.parentNode && node.parentNode.removeChild(node);
      } else {
        // Add lazy loading for performance
        if (!node.hasAttribute('loading')) node.setAttribute('loading', 'lazy');
        node.setAttribute('decoding', 'async');
      }
    }
    
    // Only allow iframes from known video hosts
    if (node.tagName === 'IFRAME') {
      const src = (node.getAttribute('src') || '').toLowerCase();
      const allowed = src.startsWith('https://www.youtube.com/') ||
                      src.startsWith('https://youtube.com/') ||
                      src.startsWith('https://player.vimeo.com/');
      if (!allowed) {
        node.parentNode && node.parentNode.removeChild(node);
      } else {
        node.setAttribute('referrerpolicy', 'no-referrer');
      }
    }
  });
}

// Sanitize HTML content for safe rendering
export function sanitizeHtml(html: string): string {
  initDomPurifyHooks();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
      // Media tags
      'img', 'picture', 'source', 'video', 'audio', 'iframe', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'alt', 'title', 'class',
      // Media attributes
      'src', 'srcset', 'sizes', 'type', 'controls', 'poster',
      'width', 'height', 'loading', 'decoding',
      'frameborder', 'allow', 'allowfullscreen', 'referrerpolicy',
      'autoplay', 'muted', 'playsinline', 'loop'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'link', 'meta'],
  });
}

// Strip HTML tags from text for plain text display
export function stripHtml(html: string): string {
  if (!isHtml(html)) return html;
  // Create a temporary div element to strip HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
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
