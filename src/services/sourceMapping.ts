import { dataStore } from '../models/store.js';
import type { UTMParams, SourceMapping } from '../models/types.js';

export interface SourceMappingResult {
  source: string;
  sourceDetail: string;
  channel: string;
  matchedMapping: SourceMapping | null;
}

/**
 * Service for mapping UTM parameters to Source, Source Detail, and Channel
 */
export class SourceMappingService {
  /**
   * Maps UTM parameters to source, source detail, and channel
   */
  mapToSource(params: UTMParams): SourceMappingResult {
    const mappings = dataStore.getAllSourceMappings();
    const utmSource = params.utm_source?.toLowerCase() || '';
    const utmMedium = params.utm_medium?.toLowerCase() || '';

    // Find best matching mapping (priority order)
    for (const mapping of mappings) {
      const sourceMatches = this.matchesPattern(utmSource, mapping.utmSource);
      
      if (sourceMatches) {
        // If medium is specified in mapping, it must also match
        if (mapping.utmMedium) {
          const mediumMatches = this.matchesPattern(utmMedium, mapping.utmMedium);
          if (mediumMatches) {
            return {
              source: mapping.source,
              sourceDetail: mapping.sourceDetail,
              channel: mapping.channel,
              matchedMapping: mapping,
            };
          }
        } else {
          // Medium not specified, just match on source
          return {
            source: mapping.source,
            sourceDetail: mapping.sourceDetail,
            channel: mapping.channel,
            matchedMapping: mapping,
          };
        }
      }
    }

    // Default fallback mapping
    return this.getDefaultMapping(params);
  }

  /**
   * Check if a value matches a pattern (supports wildcards)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    const lowerPattern = pattern.toLowerCase();
    
    if (lowerPattern.includes('*')) {
      // Convert wildcard pattern to regex
      const regexPattern = lowerPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(value);
    }
    
    return value === lowerPattern;
  }

  /**
   * Get default mapping when no rules match
   */
  private getDefaultMapping(params: UTMParams): SourceMappingResult {
    const utmSource = params.utm_source?.toLowerCase() || 'unknown';
    const utmMedium = params.utm_medium?.toLowerCase() || '';

    // Infer channel from medium
    let channel = 'Other';
    if (utmMedium.includes('organic')) {
      channel = utmSource.includes('google') || utmSource.includes('bing') 
        ? 'Organic Search' 
        : 'Organic Social';
    } else if (utmMedium.includes('paid') || utmMedium.includes('cpc') || utmMedium.includes('ppc')) {
      channel = utmSource.includes('google') || utmSource.includes('bing') 
        ? 'Paid Search' 
        : 'Paid Social';
    } else if (utmMedium.includes('email') || utmSource.includes('email')) {
      channel = 'Email';
    } else if (utmMedium.includes('social') || ['facebook', 'twitter', 'linkedin', 'instagram'].includes(utmSource)) {
      channel = 'Social';
    } else if (utmSource === 'direct' || (!params.utm_source && !params.utm_medium)) {
      channel = 'Direct';
    } else if (utmMedium.includes('referral')) {
      channel = 'Referral';
    }

    return {
      source: this.formatSourceName(utmSource),
      sourceDetail: utmMedium ? this.formatSourceName(utmMedium) : 'Unknown',
      channel,
      matchedMapping: null,
    };
  }

  /**
   * Format source name for display
   */
  private formatSourceName(name: string): string {
    return name
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get all available channels from mappings
   */
  getAvailableChannels(): string[] {
    const mappings = dataStore.getAllSourceMappings();
    const channels = new Set<string>();
    
    for (const mapping of mappings) {
      channels.add(mapping.channel);
    }
    
    // Add default channels
    ['Paid Search', 'Organic Search', 'Paid Social', 'Organic Social', 'Email', 'Direct', 'Referral', 'Other']
      .forEach(c => channels.add(c));
    
    return Array.from(channels).sort();
  }
}

export const sourceMappingService = new SourceMappingService();
