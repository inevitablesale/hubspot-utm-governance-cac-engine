import { dataStore } from '../models/store.js';
import type { ChannelMetrics, AttributionEvent } from '../models/types.js';

export interface MetricsCalculationOptions {
  startDate: string;
  endDate: string;
  channel?: string;
  source?: string;
  sourceDetail?: string;
}

/**
 * Service for calculating CAC (Customer Acquisition Cost) and ROI metrics
 */
export class MetricsService {
  /**
   * Calculate CAC for a specific channel or overall
   * CAC = Total Marketing Cost / Number of New Customers Acquired
   */
  calculateCAC(options: MetricsCalculationOptions): number {
    const costs = this.getTotalCosts(options);
    const conversions = this.getConversions(options);
    
    if (conversions === 0) return 0;
    return costs / conversions;
  }

  /**
   * Calculate ROI for a specific channel or overall
   * ROI = ((Revenue - Cost) / Cost) * 100
   */
  calculateROI(options: MetricsCalculationOptions): number {
    const costs = this.getTotalCosts(options);
    const revenue = this.getTotalRevenue(options);
    
    if (costs === 0) return 0;
    return ((revenue - costs) / costs) * 100;
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   * ROAS = Revenue / Cost
   */
  calculateROAS(options: MetricsCalculationOptions): number {
    const costs = this.getTotalCosts(options);
    const revenue = this.getTotalRevenue(options);
    
    if (costs === 0) return 0;
    return revenue / costs;
  }

  /**
   * Get total costs for a period/channel
   */
  private getTotalCosts(options: MetricsCalculationOptions): number {
    const costs = dataStore.getChannelCostsInRange(options.startDate, options.endDate);
    
    return costs
      .filter(c => {
        if (options.channel && c.channel !== options.channel) return false;
        if (options.source && c.source !== options.source) return false;
        if (options.sourceDetail && c.sourceDetail !== options.sourceDetail) return false;
        return true;
      })
      .reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get total revenue from attributed conversions
   */
  private getTotalRevenue(options: MetricsCalculationOptions): number {
    const events = this.getAttributionEvents(options);
    return events.reduce((sum, e) => sum + (e.revenue * e.attributionWeight), 0);
  }

  /**
   * Get number of conversions
   */
  private getConversions(options: MetricsCalculationOptions): number {
    const events = this.getAttributionEvents(options);
    return events.reduce((sum, e) => sum + e.attributionWeight, 0);
  }

  /**
   * Get attribution events matching criteria
   */
  private getAttributionEvents(options: MetricsCalculationOptions): AttributionEvent[] {
    const allEvents = dataStore.getAllAttributionEvents();
    
    return allEvents.filter(e => {
      const eventDate = new Date(e.timestamp);
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);
      
      if (eventDate < startDate || eventDate > endDate) return false;
      if (options.channel && e.channel !== options.channel) return false;
      if (options.source && e.source !== options.source) return false;
      if (options.sourceDetail && e.sourceDetail !== options.sourceDetail) return false;
      return true;
    });
  }

  /**
   * Get comprehensive metrics for all channels
   */
  getChannelMetrics(options: { startDate: string; endDate: string }): ChannelMetrics[] {
    const channels = this.getUniqueChannels();
    const metrics: ChannelMetrics[] = [];

    for (const channel of channels) {
      const channelOptions = { ...options, channel };
      const totalCost = this.getTotalCosts(channelOptions);
      const totalRevenue = this.getTotalRevenue(channelOptions);
      const conversions = this.getConversions(channelOptions);

      metrics.push({
        channel,
        period: {
          start: options.startDate,
          end: options.endDate,
        },
        totalCost,
        totalRevenue,
        conversions,
        cac: conversions > 0 ? totalCost / conversions : 0,
        roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
        roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      });
    }

    return metrics.filter(m => m.totalCost > 0 || m.totalRevenue > 0 || m.conversions > 0);
  }

  /**
   * Get metrics for a specific contact
   */
  getContactMetrics(contactId: string): {
    touchpoints: Array<{
      channel: string;
      source: string;
      sourceDetail: string;
      timestamp: string;
      utmCampaign?: string;
    }>;
    attributedRevenue: number;
    attributedCAC: number;
  } {
    const utmRecords = dataStore.getUTMRecordsByContact(contactId);
    const attributionEvents = dataStore.getAttributionEventsByContact(contactId);

    const touchpoints = utmRecords.map(r => ({
      channel: r.channel,
      source: r.source,
      sourceDetail: r.sourceDetail,
      timestamp: r.timestamp,
      utmCampaign: r.normalizedParams.utm_campaign,
    }));

    const attributedRevenue = attributionEvents.reduce(
      (sum, e) => sum + (e.revenue * e.attributionWeight), 
      0
    );

    // Calculate CAC based on attributed costs
    const uniqueChannels = [...new Set(attributionEvents.map(e => e.channel))];
    let totalAttributedCost = 0;
    
    for (const channel of uniqueChannels) {
      const channelCosts = dataStore.getChannelCostsByChannel(channel);
      // Simple attribution: divide channel costs by number of conversions in that channel
      const channelEvents = dataStore.getAttributionEventsByChannel(channel);
      if (channelEvents.length > 0) {
        const contactWeight = attributionEvents
          .filter(e => e.channel === channel)
          .reduce((sum, e) => sum + e.attributionWeight, 0);
        const totalWeight = channelEvents.reduce((sum, e) => sum + e.attributionWeight, 0);
        const channelTotalCost = channelCosts.reduce((sum, c) => sum + c.cost, 0);
        totalAttributedCost += (channelTotalCost * contactWeight) / totalWeight;
      }
    }

    return {
      touchpoints,
      attributedRevenue,
      attributedCAC: totalAttributedCost,
    };
  }

  /**
   * Get unique channels from data
   */
  private getUniqueChannels(): string[] {
    const utmRecords = dataStore.getAllUTMRecords();
    const channelCosts = dataStore.getAllChannelCosts();
    
    const channels = new Set<string>();
    utmRecords.forEach(r => channels.add(r.channel));
    channelCosts.forEach(c => channels.add(c.channel));
    
    return Array.from(channels);
  }

  /**
   * Get overall summary metrics
   */
  getOverallMetrics(options: { startDate: string; endDate: string }): {
    totalCAC: number;
    averageROI: number;
    totalRevenue: number;
    totalCost: number;
    totalConversions: number;
  } {
    const totalCost = this.getTotalCosts(options);
    const totalRevenue = this.getTotalRevenue(options);
    const totalConversions = this.getConversions(options);

    return {
      totalCAC: totalConversions > 0 ? totalCost / totalConversions : 0,
      averageROI: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
      totalRevenue,
      totalCost,
      totalConversions,
    };
  }
}

export const metricsService = new MetricsService();
