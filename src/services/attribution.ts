import { randomUUID } from 'crypto';
import { dataStore } from '../models/store.js';
import type { AttributionEvent, UTMRecord } from '../models/types.js';

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay';

export interface AttributionConfig {
  model: AttributionModel;
  timeDecayHalfLife?: number; // Days for time decay model (default: 7)
}

/**
 * Service for attributing conversions to marketing touchpoints
 */
export class AttributionService {
  private defaultConfig: AttributionConfig = {
    model: 'last_touch',
    timeDecayHalfLife: 7,
  };

  /**
   * Create attribution events for a conversion
   */
  createAttribution(
    contactId: string,
    dealId: string | undefined,
    revenue: number,
    config: AttributionConfig = this.defaultConfig
  ): AttributionEvent[] {
    const touchpoints = dataStore.getUTMRecordsByContact(contactId);
    
    if (touchpoints.length === 0) {
      return [];
    }

    const weights = this.calculateWeights(touchpoints, config);
    const events: AttributionEvent[] = [];

    for (let i = 0; i < touchpoints.length; i++) {
      const touchpoint = touchpoints[i];
      const weight = weights[i];

      if (weight > 0) {
        const event: AttributionEvent = {
          id: randomUUID(),
          contactId,
          dealId,
          utmRecordId: touchpoint.id,
          channel: touchpoint.channel,
          source: touchpoint.source,
          sourceDetail: touchpoint.sourceDetail,
          attributionModel: config.model,
          attributionWeight: weight,
          revenue: revenue,
          timestamp: new Date().toISOString(),
        };

        dataStore.addAttributionEvent(event);
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Calculate attribution weights based on the model
   */
  private calculateWeights(touchpoints: UTMRecord[], config: AttributionConfig): number[] {
    const n = touchpoints.length;
    
    switch (config.model) {
      case 'first_touch':
        return this.firstTouchWeights(n);
      case 'last_touch':
        return this.lastTouchWeights(n);
      case 'linear':
        return this.linearWeights(n);
      case 'time_decay':
        return this.timeDecayWeights(touchpoints, config.timeDecayHalfLife || 7);
      default:
        return this.lastTouchWeights(n);
    }
  }

  /**
   * First touch: 100% credit to first touchpoint
   */
  private firstTouchWeights(n: number): number[] {
    const weights = new Array(n).fill(0);
    if (n > 0) weights[0] = 1;
    return weights;
  }

  /**
   * Last touch: 100% credit to last touchpoint
   */
  private lastTouchWeights(n: number): number[] {
    const weights = new Array(n).fill(0);
    if (n > 0) weights[n - 1] = 1;
    return weights;
  }

  /**
   * Linear: Equal credit to all touchpoints
   */
  private linearWeights(n: number): number[] {
    if (n === 0) return [];
    const weight = 1 / n;
    return new Array(n).fill(weight);
  }

  /**
   * Time decay: More credit to recent touchpoints
   */
  private timeDecayWeights(touchpoints: UTMRecord[], halfLifeDays: number): number[] {
    const n = touchpoints.length;
    if (n === 0) return [];

    const now = new Date();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
    
    // Calculate raw weights based on time decay
    const rawWeights = touchpoints.map(tp => {
      const tpDate = new Date(tp.timestamp);
      const ageMs = now.getTime() - tpDate.getTime();
      return Math.pow(0.5, ageMs / halfLifeMs);
    });

    // Normalize weights to sum to 1
    const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
    return rawWeights.map(w => w / totalWeight);
  }

  /**
   * Get attribution events for a contact
   */
  getContactAttribution(contactId: string): AttributionEvent[] {
    return dataStore.getAttributionEventsByContact(contactId);
  }

  /**
   * Get attribution events for a channel
   */
  getChannelAttribution(channel: string): AttributionEvent[] {
    return dataStore.getAttributionEventsByChannel(channel);
  }

  /**
   * Recalculate attribution for a contact with a new model
   */
  recalculateAttribution(
    contactId: string,
    newConfig: AttributionConfig
  ): AttributionEvent[] {
    const existingEvents = dataStore.getAttributionEventsByContact(contactId);
    if (existingEvents.length === 0) return [];

    // Get the total revenue from existing events
    const totalRevenue = existingEvents.reduce((sum, e) => sum + e.revenue, 0) / 
                         existingEvents.reduce((sum, e) => sum + e.attributionWeight, 0);
    
    // Get deal ID if any
    const dealId = existingEvents.find(e => e.dealId)?.dealId;

    // Remove old events (in a real implementation, you'd update the database)
    // For now, we'll just create new ones
    return this.createAttribution(contactId, dealId, totalRevenue, newConfig);
  }
}

export const attributionService = new AttributionService();
