import { SimpleEnrichmentOrchestrator } from '../agent-architecture';
import type { EnrichmentField, EnrichmentResult } from '../agent-architecture/core/types';
import { shouldSkipEmail, loadSkipList } from '../utils/skip-list';

export class AgentEnrichmentStrategy {
  private orchestrator: SimpleEnrichmentOrchestrator;
  
  constructor(openaiApiKey: string, firecrawlApiKey: string) {
    this.orchestrator = new SimpleEnrichmentOrchestrator(openaiApiKey, firecrawlApiKey);
  }
  
  async enrichEmail(
    email: string,
    fields: EnrichmentField[] = []
  ): Promise<{ enrichments: Record<string, EnrichmentResult>; status: 'completed' | 'skipped' | 'error'; error?: string }> {
    try {
      // Check skip list
      const skipList = await loadSkipList();
      if (shouldSkipEmail(email, skipList)) {
        return {
          enrichments: {},
          status: 'skipped',
          error: 'Email domain is in skip list',
        };
      }

      const enrichments = await this.orchestrator.enrichEmail(email, fields);
      
      return {
        enrichments,
        status: 'completed',
      };
    } catch (error) {
      console.error('[AgentEnrichmentStrategy] Enrichment error:', error);
      return {
        enrichments: {},
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

