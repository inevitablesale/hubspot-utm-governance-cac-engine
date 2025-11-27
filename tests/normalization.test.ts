import { describe, it, expect, beforeEach } from 'vitest';
import { normalizationService } from '../src/services/normalization.js';
import { dataStore } from '../src/models/store.js';

describe('NormalizationService', () => {
  beforeEach(() => {
    dataStore.clear();
    dataStore.seedDefaults();
  });

  describe('normalize', () => {
    it('should normalize utm_source abbreviations', () => {
      const params = {
        utm_source: 'fb',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
      };

      const result = normalizationService.normalize(params);

      expect(result.utm_source).toBe('facebook');
      expect(result.utm_medium).toBe('paid');
    });

    it('should lowercase and clean up values', () => {
      const params = {
        utm_source: 'GOOGLE',
        utm_medium: 'CPC',
        utm_campaign: 'Summer Sale 2024',
      };

      const result = normalizationService.normalize(params);

      expect(result.utm_source).toBe('google');
      expect(result.utm_medium).toBe('paid');
      expect(result.utm_campaign).toBe('summer_sale_2024');
    });

    it('should remove special characters', () => {
      const params = {
        utm_source: 'google!@#',
        utm_campaign: 'test campaign (v1)',
      };

      const result = normalizationService.normalize(params);

      expect(result.utm_source).toBe('google');
      expect(result.utm_campaign).toBe('test_campaign_v1');
    });

    it('should handle empty params gracefully', () => {
      const params = {};
      const result = normalizationService.normalize(params);
      expect(result).toEqual({});
    });
  });

  describe('validateParams', () => {
    it('should fail validation for missing utm_source', () => {
      const params = {
        utm_medium: 'cpc',
      };

      const result = normalizationService.validateParams(params);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing required utm_source parameter');
    });

    it('should fail for short utm_source', () => {
      const params = {
        utm_source: 'a',
      };

      const result = normalizationService.validateParams(params);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('utm_source is too short');
    });

    it('should pass validation for valid params', () => {
      const params = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'test',
      };

      const result = normalizationService.validateParams(params);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
