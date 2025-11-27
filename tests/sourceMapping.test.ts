import { describe, it, expect, beforeEach } from 'vitest';
import { sourceMappingService } from '../src/services/sourceMapping.js';
import { dataStore } from '../src/models/store.js';

describe('SourceMappingService', () => {
  beforeEach(() => {
    dataStore.clear();
    dataStore.seedDefaults();
  });

  describe('mapToSource', () => {
    it('should map google/cpc to Paid Search', () => {
      const params = {
        utm_source: 'google',
        utm_medium: 'cpc',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.source).toBe('Google Ads');
      expect(result.sourceDetail).toBe('Search');
      expect(result.channel).toBe('Paid Search');
    });

    it('should map google/organic to Organic Search', () => {
      const params = {
        utm_source: 'google',
        utm_medium: 'organic',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.source).toBe('Google');
      expect(result.sourceDetail).toBe('Organic Search');
      expect(result.channel).toBe('Organic Search');
    });

    it('should map facebook/paid to Paid Social', () => {
      const params = {
        utm_source: 'facebook',
        utm_medium: 'paid',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.source).toBe('Facebook');
      expect(result.sourceDetail).toBe('Paid Social');
      expect(result.channel).toBe('Paid Social');
    });

    it('should provide default mapping for unknown sources', () => {
      const params = {
        utm_source: 'unknown_source',
        utm_medium: 'cpc',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.source).toBe('Unknown Source');
      expect(result.channel).toBe('Paid Social'); // CPC for non-google/bing sources defaults to Paid Social
      expect(result.matchedMapping).toBeNull();
    });

    it('should infer channel from medium when no mapping exists', () => {
      const params = {
        utm_source: 'bing',
        utm_medium: 'organic',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.channel).toBe('Organic Search');
    });

    it('should handle email channel', () => {
      const params = {
        utm_source: 'email',
        utm_medium: 'newsletter',
      };

      const result = sourceMappingService.mapToSource(params);

      expect(result.channel).toBe('Email');
    });
  });

  describe('getAvailableChannels', () => {
    it('should return list of channels', () => {
      const channels = sourceMappingService.getAvailableChannels();

      expect(channels).toContain('Paid Search');
      expect(channels).toContain('Organic Search');
      expect(channels).toContain('Paid Social');
      expect(channels).toContain('Email');
      expect(channels).toContain('Direct');
    });
  });
});
