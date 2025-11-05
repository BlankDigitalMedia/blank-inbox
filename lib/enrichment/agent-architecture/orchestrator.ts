import type { EnrichmentField, EnrichmentResult, EmailContext } from './core/types';
import { parseEmailContext } from './tools/email-parser-tool';
import {
  DiscoveryAgent,
  CompanyProfileAgent,
  FundingAgent,
  TechStackAgent,
  PersonAgent,
  GeneralAgent,
} from './agents';

export class SimpleEnrichmentOrchestrator {
  private openaiApiKey: string;
  private firecrawlApiKey: string;

  constructor(openaiApiKey: string, firecrawlApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.firecrawlApiKey = firecrawlApiKey;
  }

  /**
   * Default field set covering company + person data
   */
  private getDefaultFields(): EnrichmentField[] {
    return [
      // Company fields
      { name: 'companyName', displayName: 'Company Name', description: 'Official company name', type: 'string', required: false },
      { name: 'website', displayName: 'Website', description: 'Company website URL', type: 'string', required: false },
      { name: 'industry', displayName: 'Industry', description: 'Primary industry or sector', type: 'string', required: false },
      { name: 'headquarters', displayName: 'Headquarters', description: 'Headquarters location', type: 'string', required: false },
      { name: 'yearFounded', displayName: 'Year Founded', description: 'Year the company was founded', type: 'number', required: false },
      { name: 'employeeCount', displayName: 'Employee Count', description: 'Approximate employee count', type: 'string', required: false },
      { name: 'description', displayName: 'Description', description: 'Brief company description', type: 'string', required: false },
      { name: 'fundingStage', displayName: 'Funding Stage', description: 'Current funding stage', type: 'string', required: false },
      { name: 'totalRaised', displayName: 'Total Raised', description: 'Total funding raised', type: 'string', required: false },
      { name: 'lastRoundAmount', displayName: 'Last Round Amount', description: 'Most recent funding round', type: 'string', required: false },
      { name: 'investors', displayName: 'Investors', description: 'List of investors', type: 'array', required: false },
      { name: 'techStack', displayName: 'Tech Stack', description: 'Technology stack', type: 'array', required: false },
      // Person fields
      { name: 'titleNormalized', displayName: 'Job Title', description: 'Normalized job title', type: 'string', required: false },
      { name: 'seniority', displayName: 'Seniority', description: 'Seniority level', type: 'string', required: false },
      { name: 'department', displayName: 'Department', description: 'Department or team', type: 'string', required: false },
      { name: 'linkedinUrl', displayName: 'LinkedIn URL', description: 'LinkedIn profile URL', type: 'string', required: false },
      { name: 'location', displayName: 'Location', description: 'Location', type: 'string', required: false },
    ];
  }

  async enrichEmail(
    email: string,
    fields: EnrichmentField[] = []
  ): Promise<Record<string, EnrichmentResult>> {
    const emailContext = parseEmailContext(email);
    
    // If personal email, return empty results
    if (emailContext.isPersonalEmail) {
      return {};
    }

    // Use provided fields or default set
    const requestedFields = fields.length > 0 ? fields : this.getDefaultFields();

    // Initialize discovered data from email context
    let discoveredData: Record<string, any> = {
      email,
      domain: emailContext.domain,
      companyDomain: emailContext.companyDomain,
      companyNameGuess: emailContext.companyNameGuess,
      website: emailContext.companyDomain 
        ? `https://${emailContext.companyDomain}`
        : undefined,
    };

    // Initialize agents
    const discoveryAgent = new DiscoveryAgent(this.openaiApiKey, this.firecrawlApiKey);
    const companyProfileAgent = new CompanyProfileAgent(this.openaiApiKey, this.firecrawlApiKey);
    const fundingAgent = new FundingAgent(this.openaiApiKey, this.firecrawlApiKey);
    const techStackAgent = new TechStackAgent(this.openaiApiKey, this.firecrawlApiKey);
    const personAgent = new PersonAgent(this.openaiApiKey, this.firecrawlApiKey);
    const generalAgent = new GeneralAgent(this.openaiApiKey, this.firecrawlApiKey);

    // Run agents sequentially, accumulating discovered data and results
    const allResults: Record<string, EnrichmentResult> = {};

    // Phase 1: Discovery
    try {
      console.log('[Orchestrator] Running DiscoveryAgent...');
      const discoveryResult = await discoveryAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      // Merge discovered data
      Object.assign(discoveredData, discoveryResult.fields);
      
      // Convert to EnrichmentResult format
      for (const [fieldName, value] of Object.entries(discoveryResult.fields)) {
        allResults[fieldName] = {
          field: fieldName,
          value,
          confidence: discoveryResult.confidence[fieldName] ?? 0.7,
          source: discoveryResult.sources[fieldName]?.[0],
          sourceContext: discoveryResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
        };
      }
    } catch (error) {
      console.error('[Orchestrator] DiscoveryAgent error:', error);
    }

    // Phase 2: Company Profile
    try {
      console.log('[Orchestrator] Running CompanyProfileAgent...');
      const profileResult = await companyProfileAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      // Merge results (prefer higher confidence if conflict)
      for (const [fieldName, value] of Object.entries(profileResult.fields)) {
        const existing = allResults[fieldName];
        const newConfidence = profileResult.confidence[fieldName] ?? 0.7;
        
        if (!existing || newConfidence > existing.confidence) {
          allResults[fieldName] = {
            field: fieldName,
            value,
            confidence: newConfidence,
            source: profileResult.sources[fieldName]?.[0],
            sourceContext: profileResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
          };
        }
      }
    } catch (error) {
      console.error('[Orchestrator] CompanyProfileAgent error:', error);
    }

    // Phase 3: Funding
    try {
      console.log('[Orchestrator] Running FundingAgent...');
      const fundingResult = await fundingAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      for (const [fieldName, value] of Object.entries(fundingResult.fields)) {
        const existing = allResults[fieldName];
        const newConfidence = fundingResult.confidence[fieldName] ?? 0.7;
        
        if (!existing || newConfidence > existing.confidence) {
          allResults[fieldName] = {
            field: fieldName,
            value,
            confidence: newConfidence,
            source: fundingResult.sources[fieldName]?.[0],
            sourceContext: fundingResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
          };
        }
      }
    } catch (error) {
      console.error('[Orchestrator] FundingAgent error:', error);
    }

    // Phase 4: Tech Stack
    try {
      console.log('[Orchestrator] Running TechStackAgent...');
      const techResult = await techStackAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      for (const [fieldName, value] of Object.entries(techResult.fields)) {
        const existing = allResults[fieldName];
        const newConfidence = techResult.confidence[fieldName] ?? 0.7;
        
        if (!existing || newConfidence > existing.confidence) {
          allResults[fieldName] = {
            field: fieldName,
            value,
            confidence: newConfidence,
            source: techResult.sources[fieldName]?.[0],
            sourceContext: techResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
          };
        }
      }
    } catch (error) {
      console.error('[Orchestrator] TechStackAgent error:', error);
    }

    // Phase 5: Person
    try {
      console.log('[Orchestrator] Running PersonAgent...');
      const personResult = await personAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      for (const [fieldName, value] of Object.entries(personResult.fields)) {
        const existing = allResults[fieldName];
        const newConfidence = personResult.confidence[fieldName] ?? 0.7;
        
        if (!existing || newConfidence > existing.confidence) {
          allResults[fieldName] = {
            field: fieldName,
            value,
            confidence: newConfidence,
            source: personResult.sources[fieldName]?.[0],
            sourceContext: personResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
          };
        }
      }
    } catch (error) {
      console.error('[Orchestrator] PersonAgent error:', error);
    }

    // Phase 6: General (catch-all for custom fields)
    try {
      console.log('[Orchestrator] Running GeneralAgent...');
      const generalResult = await generalAgent.execute({
        email,
        emailContext,
        discoveredData,
        requestedFields,
      });
      
      for (const [fieldName, value] of Object.entries(generalResult.fields)) {
        // Only add if not already present
        if (!allResults[fieldName]) {
          allResults[fieldName] = {
            field: fieldName,
            value,
            confidence: generalResult.confidence[fieldName] ?? 0.7,
            source: generalResult.sources[fieldName]?.[0],
            sourceContext: generalResult.sources[fieldName]?.map(url => ({ url, snippet: '' })) || [],
          };
        }
      }
    } catch (error) {
      console.error('[Orchestrator] GeneralAgent error:', error);
    }

    return allResults;
  }
}

