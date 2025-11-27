import { dataStore } from '../models/store.js';
import type { UTMParams, NormalizationRule } from '../models/types.js';

/**
 * Service for normalizing UTM parameters based on configured rules
 */
export class NormalizationService {
  /**
   * Normalizes UTM parameters by applying all active normalization rules
   */
  normalize(params: UTMParams): UTMParams {
    const normalized: UTMParams = { ...params };
    const rules = dataStore.getAllNormalizationRules();

    // Apply rules in priority order
    for (const rule of rules) {
      const field = rule.field as keyof UTMParams;
      const value = normalized[field];
      
      if (value && this.matchesRule(value, rule)) {
        normalized[field] = rule.normalizedValue;
      }
    }

    // Additional cleanup: lowercase all values for consistency
    return this.cleanupParams(normalized);
  }

  /**
   * Check if a value matches a rule
   */
  private matchesRule(value: string, rule: NormalizationRule): boolean {
    const lowerValue = value.toLowerCase();
    const lowerMatch = rule.matchValue.toLowerCase();

    switch (rule.matchType) {
      case 'exact':
        return lowerValue === lowerMatch;
      case 'contains':
        return lowerValue.includes(lowerMatch);
      case 'startsWith':
        return lowerValue.startsWith(lowerMatch);
      case 'endsWith':
        return lowerValue.endsWith(lowerMatch);
      case 'regex':
        try {
          const regex = new RegExp(rule.matchValue, 'i');
          return regex.test(value);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Clean up parameters (lowercase, trim whitespace, etc.)
   */
  private cleanupParams(params: UTMParams): UTMParams {
    const cleaned: UTMParams = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        const field = key as keyof UTMParams;
        cleaned[field] = value
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[^a-z0-9_-]/g, ''); // Remove special characters
      }
    }

    return cleaned;
  }

  /**
   * Validate UTM parameters for common issues
   */
  validateParams(params: UTMParams): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for required parameters
    if (!params.utm_source) {
      issues.push('Missing required utm_source parameter');
    }

    // Check for common typos/issues
    if (params.utm_source && params.utm_source.length < 2) {
      issues.push('utm_source is too short');
    }

    // Check for URL encoding issues
    for (const [key, value] of Object.entries(params)) {
      if (value && (value.includes('%') || value.includes('+'))) {
        issues.push(`${key} may contain URL encoding that should be decoded`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

export const normalizationService = new NormalizationService();
