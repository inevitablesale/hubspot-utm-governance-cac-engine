import { describe, it, expect, beforeEach } from 'vitest';
import { metricsService } from '../src/services/metrics.js';
import { dataStore } from '../src/models/store.js';
import type { ChannelCost, AttributionEvent, UTMRecord } from '../src/models/types.js';

describe('MetricsService', () => {
  beforeEach(() => {
    dataStore.clear();
  });

  describe('calculateCAC', () => {
    it('should calculate CAC correctly', () => {
      // Add channel costs
      const cost: ChannelCost = {
        id: 'cost-1',
        channel: 'Paid Search',
        cost: 1000,
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        currency: 'USD',
      };
      dataStore.addChannelCost(cost);

      // Add attribution events (conversions)
      const events: AttributionEvent[] = [
        {
          id: 'event-1',
          contactId: 'contact-1',
          utmRecordId: 'utm-1',
          channel: 'Paid Search',
          source: 'Google Ads',
          sourceDetail: 'Search',
          attributionModel: 'last_touch',
          attributionWeight: 1,
          revenue: 500,
          timestamp: '2024-01-15T00:00:00Z',
        },
        {
          id: 'event-2',
          contactId: 'contact-2',
          utmRecordId: 'utm-2',
          channel: 'Paid Search',
          source: 'Google Ads',
          sourceDetail: 'Search',
          attributionModel: 'last_touch',
          attributionWeight: 1,
          revenue: 500,
          timestamp: '2024-01-20T00:00:00Z',
        },
      ];
      events.forEach(e => dataStore.addAttributionEvent(e));

      const cac = metricsService.calculateCAC({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        channel: 'Paid Search',
      });

      expect(cac).toBe(500); // $1000 / 2 conversions = $500 CAC
    });

    it('should return 0 when no conversions', () => {
      const cost: ChannelCost = {
        id: 'cost-1',
        channel: 'Paid Search',
        cost: 1000,
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        currency: 'USD',
      };
      dataStore.addChannelCost(cost);

      const cac = metricsService.calculateCAC({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        channel: 'Paid Search',
      });

      expect(cac).toBe(0);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      const cost: ChannelCost = {
        id: 'cost-1',
        channel: 'Paid Search',
        cost: 1000,
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        currency: 'USD',
      };
      dataStore.addChannelCost(cost);

      const event: AttributionEvent = {
        id: 'event-1',
        contactId: 'contact-1',
        utmRecordId: 'utm-1',
        channel: 'Paid Search',
        source: 'Google Ads',
        sourceDetail: 'Search',
        attributionModel: 'last_touch',
        attributionWeight: 1,
        revenue: 3000,
        timestamp: '2024-01-15T00:00:00Z',
      };
      dataStore.addAttributionEvent(event);

      const roi = metricsService.calculateROI({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        channel: 'Paid Search',
      });

      expect(roi).toBe(200); // ((3000 - 1000) / 1000) * 100 = 200%
    });

    it('should return 0 when no costs', () => {
      const roi = metricsService.calculateROI({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        channel: 'Paid Search',
      });

      expect(roi).toBe(0);
    });
  });

  describe('calculateROAS', () => {
    it('should calculate ROAS correctly', () => {
      const cost: ChannelCost = {
        id: 'cost-1',
        channel: 'Paid Search',
        cost: 1000,
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        currency: 'USD',
      };
      dataStore.addChannelCost(cost);

      const event: AttributionEvent = {
        id: 'event-1',
        contactId: 'contact-1',
        utmRecordId: 'utm-1',
        channel: 'Paid Search',
        source: 'Google Ads',
        sourceDetail: 'Search',
        attributionModel: 'last_touch',
        attributionWeight: 1,
        revenue: 4000,
        timestamp: '2024-01-15T00:00:00Z',
      };
      dataStore.addAttributionEvent(event);

      const roas = metricsService.calculateROAS({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        channel: 'Paid Search',
      });

      expect(roas).toBe(4); // 4000 / 1000 = 4x ROAS
    });
  });

  describe('getContactMetrics', () => {
    it('should return touchpoints for a contact', () => {
      const utmRecord: UTMRecord = {
        id: 'utm-1',
        contactId: 'contact-1',
        originalParams: { utm_source: 'google', utm_medium: 'cpc' },
        normalizedParams: { utm_source: 'google', utm_medium: 'paid' },
        source: 'Google Ads',
        sourceDetail: 'Search',
        channel: 'Paid Search',
        timestamp: '2024-01-15T00:00:00Z',
        revenue: 0,
      };
      dataStore.addUTMRecord(utmRecord);

      const metrics = metricsService.getContactMetrics('contact-1');

      expect(metrics.touchpoints).toHaveLength(1);
      expect(metrics.touchpoints[0].channel).toBe('Paid Search');
    });
  });
});
