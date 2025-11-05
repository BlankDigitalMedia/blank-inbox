import Firecrawl from '@mendable/firecrawl-js';

// Simple in-process rate-limit awareness for Firecrawl API
let firecrawlRateLimitedUntil = 0;

function isRateLimitError(error: unknown): boolean {
  const anyErr = error as any;
  const status = anyErr?.status || anyErr?.response?.status || anyErr?.details?.status;
  const msg: string = anyErr?.message || '';
  return status === 429 || /rate limit/i.test(msg);
}

function backoffMsFromError(error: unknown): number {
  // Default 30s; try to parse reset hint if present
  return 30_000;
}

export interface ScrapedContent {
  markdown?: string;
  html?: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

export interface MapResult {
  links: Array<{ url: string; title?: string }>;
}

export interface CrawlResult {
  data: Array<{
    markdown?: string;
    html?: string;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Scrape a single website URL
 */
export async function scrapeWebsite(
  url: string,
  apiKey: string
): Promise<ScrapedContent> {
  try {
    if (Date.now() < firecrawlRateLimitedUntil) {
      return {};
    }
    const client = new Firecrawl({ apiKey });
    const result = await client.scrape(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    });
    return result as ScrapedContent;
  } catch (error) {
    console.error(`[scrapeWebsite] Error scraping ${url}:`, error);
    if (isRateLimitError(error)) {
      firecrawlRateLimitedUntil = Date.now() + backoffMsFromError(error);
      return {};
    }
    throw error;
  }
}

/**
 * Search the web using Firecrawl search API
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  options?: {
    limit?: number;
    sources?: Array<{ type: 'web' | 'news' | 'images' }>;
    scrapeOptions?: {
      formats?: Array<'markdown' | 'html'>;
    };
  }
): Promise<SearchResult[]> {
  try {
    if (Date.now() < firecrawlRateLimitedUntil) {
      return [];
    }
    const client = new Firecrawl({ apiKey });
    const searchResults = await client.search(query, {
      limit: options?.limit ?? 5,
      sources: options?.sources ?? [{ type: 'web' }],
      scrapeOptions: options?.scrapeOptions ?? {
        formats: ['markdown'],
      },
    });

    const results: SearchResult[] = [];
    
    // Handle different response shapes
    if (searchResults.data?.web) {
      for (const item of searchResults.data.web) {
        results.push({
          url: item.url || item.link || '',
          title: item.title || '',
          description: item.description || item.snippet,
          markdown: item.markdown,
        });
      }
    } else if (Array.isArray(searchResults.data)) {
      for (const item of searchResults.data) {
        results.push({
          url: item.url || item.link || '',
          title: item.title || '',
          description: item.description || item.snippet,
          markdown: item.markdown,
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`[searchWeb] Error searching for "${query}":`, error);
    if (isRateLimitError(error)) {
      firecrawlRateLimitedUntil = Date.now() + backoffMsFromError(error);
    }
    // Return empty array on error rather than throwing
    return [];
  }
}

/**
 * Map/discover URLs on a website
 */
export async function mapWebsite(
  url: string,
  apiKey: string,
  options?: {
    search?: string;
    limit?: number;
  }
): Promise<MapResult> {
  try {
    const client = new Firecrawl({ apiKey });
    const result = await client.map(url, {
      search: options?.search,
      limit: options?.limit ?? 50,
    });

    return {
      links: result.links || [],
    };
  } catch (error) {
    console.error(`[mapWebsite] Error mapping ${url}:`, error);
    // Return empty result on error
    return { links: [] };
  }
}

/**
 * Crawl a website with selective paths
 */
export async function crawlWebsite(
  url: string,
  apiKey: string,
  options?: {
    limit?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
    scrapeOptions?: {
      formats?: Array<'markdown' | 'html'>;
    };
    pollInterval?: number;
    timeout?: number;
  }
): Promise<CrawlResult> {
  try {
    if (Date.now() < firecrawlRateLimitedUntil) {
      return { data: [] };
    }
    const client = new Firecrawl({ apiKey });
    const response = await client.crawl(url, {
      limit: options?.limit ?? 20,
      maxDepth: options?.maxDepth ?? 2,
      includePaths: options?.includePaths,
      excludePaths: options?.excludePaths,
      scrapeOptions: options?.scrapeOptions ?? {
        formats: ['markdown', 'html'],
      },
      pollInterval: options?.pollInterval ?? 5000,
      timeout: options?.timeout ?? 300000,
    });

    return {
      data: response.data || [],
    };
  } catch (error) {
    console.error(`[crawlWebsite] Error crawling ${url}:`, error);
    if (isRateLimitError(error)) {
      firecrawlRateLimitedUntil = Date.now() + backoffMsFromError(error);
    }
    // Return empty result on error
    return { data: [] };
  }
}

