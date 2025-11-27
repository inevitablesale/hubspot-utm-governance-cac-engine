import { describe, it, expect, beforeEach } from 'vitest';
import { attributionService } from '../src/services/attribution.js';
import { dataStore } from '../src/models/store.js';
import type { UTMRecord } from '../src/models/types.js';

describe('AttributionService', () => {
  beforeEach(() => {
    dataStore.clear();
  });

  describe('createAttribution', () => {
    it('should create first_touch attribution', () => {
      // Add touchpoints
      const records: UTMRecord[] = [
        {
          id: 'utm-1',
          contactId: 'contact-1',
          originalParams: { utm_source: 'google', utm_medium: 'cpc' },
          normalizedParams: { utm_source: 'google', utm_medium: 'paid' },
          source: 'Google Ads',
          sourceDetail: 'Search',
          channel: 'Paid Search',
          timestamp: '2024-01-01T00:00:00Z',
          revenue: 0,
        },
        {
          id: 'utm-2',
          contactId: 'contact-1',
          originalParams: { utm_source: 'facebook', utm_medium: 'paid' },
          normalizedParams: { utm_source: 'facebook', utm_medium: 'paid' },
          source: 'Facebook',
          sourceDetail: 'Paid Social',
          channel: 'Paid Social',
          timestamp: '2024-01-15T00:00:00Z',
          revenue: 0,
        },
      ];
      records.forEach(r => dataStore.addUTMRecord(r));

      const events = attributionService.createAttribution(
        'contact-1',
        undefined,
        1000,
        { model: 'first_touch' }
      );

      expect(events).toHaveLength(1);
      expect(events[0].channel).toBe('Paid Search');
      expect(events[0].attributionWeight).toBe(1);
      expect(events[0].revenue).toBe(1000);
    });

    it('should create last_touch attribution', () => {
      const records: UTMRecord[] = [
        {
          id: 'utm-1',
          contactId: 'contact-1',
          originalParams: { utm_source: 'google', utm_medium: 'cpc' },
          normalizedParams: { utm_source: 'google', utm_medium: 'paid' },
          source: 'Google Ads',
          sourceDetail: 'Search',
          channel: 'Paid Search',
          timestamp: '2024-01-01T00:00:00Z',
          revenue: 0,
        },
        {
          id: 'utm-2',
          contactId: 'contact-1',
          originalParams: { utm_source: 'facebook', utm_medium: 'paid' },
          normalizedParams: { utm_source: 'facebook', utm_medium: 'paid' },
          source: 'Facebook',
          sourceDetail: 'Paid Social',
          channel: 'Paid Social',
          timestamp: '2024-01-15T00:00:00Z',
          revenue: 0,
        },
      ];
      records.forEach(r => dataStore.addUTMRecord(r));

      const events = attributionService.createAttribution(
        'contact-1',
        undefined,
        1000,
        { model: 'last_touch' }
      );

      expect(events).toHaveLength(1);
      expect(events[0].channel).toBe('Paid Social');
      expect(events[0].attributionWeight).toBe(1);
    });

    it('should create linear attribution', () => {
      const records: UTMRecord[] = [
        {
          id: 'utm-1',
          contactId: 'contact-1',
          originalParams: { utm_source: 'google', utm_medium: 'cpc' },
          normalizedParams: { utm_source: 'google', utm_medium: 'paid' },
          source: 'Google Ads',
          sourceDetail: 'Search',
          channel: 'Paid Search',
          timestamp: '2024-01-01T00:00:00Z',
          revenue: 0,
        },
        {
          id: 'utm-2',
          contactId: 'contact-1',
          originalParams: { utm_source: 'facebook', utm_medium: 'paid' },
          normalizedParams: { utm_source: 'facebook', utm_medium: 'paid' },
          source: 'Facebook',
          sourceDetail: 'Paid Social',
          channel: 'Paid Social',
          timestamp: '2024-01-15T00:00:00Z',
          revenue: 0,
        },
      ];
      records.forEach(r => dataStore.addUTMRecord(r));

      const events = attributionService.createAttribution(
        'contact-1',
        undefined,
        1000,
        { model: 'linear' }
      );

      expect(events).toHaveLength(2);
      expect(events[0].attributionWeight).toBe(0.5);
      expect(events[1].attributionWeight).toBe(0.5);
    });

    it('should return empty array when no touchpoints', () => {
      const events = attributionService.createAttribution(
        'contact-1',
        undefined,
        1000,
        { model: 'last_touch' }
      );

      expect(events).toHaveLength(0);
    });
  });

  describe('getContactAttribution', () => {
    it('should return attribution events for contact', () => {
      const records: UTMRecord[] = [
        {
          id: 'utm-1',
          contactId: 'contact-1',
          originalParams: { utm_source: 'google', utm_medium: 'cpc' },
          normalizedParams: { utm_source: 'google', utm_medium: 'paid' },
          source: 'Google Ads',
          sourceDetail: 'Search',
          channel: 'Paid Search',
          timestamp: '2024-01-01T00:00:00Z',
          revenue: 0,
        },
      ];
      records.forEach(r => dataStore.addUTMRecord(r));

      attributionService.createAttribution('contact-1', undefined, 1000, { model: 'last_touch' });

      const events = attributionService.getContactAttribution('contact-1');

      expect(events).toHaveLength(1);
      expect(events[0].contactId).toBe('contact-1');
    });
  });
});
