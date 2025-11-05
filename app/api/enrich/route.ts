import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AgentEnrichmentStrategy } from '@/lib/enrichment/strategies/agent-enrichment-strategy';
import { checkRateLimit } from '@/lib/enrichment/utils/rate-limit';

const enrichRequestSchema = z.object({
  email: z.string().email(),
  fields: z.array(z.object({
    name: z.string(),
    displayName: z.string(),
    description: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array']),
    required: z.boolean().optional(),
  })).optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Check API keys
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!firecrawlApiKey || !openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Enrichment API keys not configured' },
        { status: 500 }
      );
    }

    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = enrichRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, fields } = validationResult.data;

    // Enrich email
    const strategy = new AgentEnrichmentStrategy(openaiApiKey, firecrawlApiKey);
    const result = await strategy.enrichEmail(email, fields);

    if (result.status === 'skipped') {
      return NextResponse.json({
        success: false,
        error: result.error || 'Email skipped',
        status: 'skipped',
      }, { status: 200 });
    }

    if (result.status === 'error') {
      return NextResponse.json({
        success: false,
        error: result.error || 'Enrichment failed',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        enrichments: result.enrichments,
      },
    }, {
      headers: {
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('[API /enrich] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

