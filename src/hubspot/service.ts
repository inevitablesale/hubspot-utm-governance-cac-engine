import { Client } from '@hubspot/api-client';
import { 
  PropertyCreateTypeEnum, 
  PropertyCreateFieldTypeEnum 
} from '@hubspot/api-client/lib/codegen/crm/properties/models/PropertyCreate.js';
import { dataStore } from '../models/store.js';
import { metricsService } from '../services/metrics.js';
import type { CRMCardData } from '../models/types.js';

/**
 * Service for integrating with HubSpot API
 */
export class HubSpotService {
  private client: Client | null = null;

  /**
   * Initialize the HubSpot client with access token
   */
  initialize(accessToken: string): void {
    this.client = new Client({ accessToken });
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get the HubSpot client
   */
  getClient(): Client {
    if (!this.client) {
      throw new Error('HubSpot client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Sync UTM and channel metrics to HubSpot contact properties
   */
  async syncContactProperties(contactId: string): Promise<void> {
    const client = this.getClient();
    const contactMetrics = metricsService.getContactMetrics(contactId);
    
    // Get the most recent touchpoint data
    const latestTouchpoint = contactMetrics.touchpoints[contactMetrics.touchpoints.length - 1];
    const firstTouchpoint = contactMetrics.touchpoints[0];

    const properties: Record<string, string> = {};

    // First touch properties
    if (firstTouchpoint) {
      properties['utm_first_touch_source'] = firstTouchpoint.source;
      properties['utm_first_touch_channel'] = firstTouchpoint.channel;
      properties['utm_first_touch_campaign'] = firstTouchpoint.utmCampaign || '';
      properties['utm_first_touch_date'] = firstTouchpoint.timestamp;
    }

    // Last touch properties
    if (latestTouchpoint) {
      properties['utm_last_touch_source'] = latestTouchpoint.source;
      properties['utm_last_touch_channel'] = latestTouchpoint.channel;
      properties['utm_last_touch_campaign'] = latestTouchpoint.utmCampaign || '';
      properties['utm_last_touch_date'] = latestTouchpoint.timestamp;
    }

    // Metrics properties
    properties['total_touchpoints'] = String(contactMetrics.touchpoints.length);
    properties['attributed_revenue'] = String(contactMetrics.attributedRevenue);
    properties['attributed_cac'] = String(contactMetrics.attributedCAC.toFixed(2));

    await client.crm.contacts.basicApi.update(contactId, { properties });
  }

  /**
   * Create a timeline event for UTM tracking
   */
  async createTimelineEvent(
    contactId: string,
    eventData: {
      channel: string;
      source: string;
      sourceDetail: string;
      utmCampaign?: string;
      timestamp: string;
    }
  ): Promise<void> {
    // Note: Timeline events require a custom event type to be created in HubSpot first
    // This is a placeholder for the actual implementation
    console.log(`Creating timeline event for contact ${contactId}:`, eventData);
  }

  /**
   * Sync channel cost data to HubSpot custom objects (if configured)
   */
  async syncChannelCosts(): Promise<void> {
    const costs = dataStore.getAllChannelCosts();
    console.log(`Syncing ${costs.length} channel cost records to HubSpot`);
    // Implementation depends on HubSpot custom object configuration
  }

  /**
   * Get CRM card data for a contact
   */
  getCRMCardData(contactId: string): CRMCardData {
    const contactMetrics = metricsService.getContactMetrics(contactId);
    
    // Get date range for last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const channelMetrics = metricsService.getChannelMetrics({ startDate, endDate });
    const overallMetrics = metricsService.getOverallMetrics({ startDate, endDate });

    return {
      contactId,
      touchpoints: contactMetrics.touchpoints,
      channelMetrics,
      overallMetrics: {
        totalCAC: overallMetrics.totalCAC,
        averageROI: overallMetrics.averageROI,
        totalRevenue: overallMetrics.totalRevenue,
        totalCost: overallMetrics.totalCost,
      },
    };
  }

  /**
   * Create HubSpot properties for UTM tracking (run during app setup)
   */
  async createUTMProperties(): Promise<void> {
    const client = this.getClient();
    
    const propertyGroups = [
      {
        name: 'utm_tracking',
        label: 'UTM Tracking',
        displayOrder: 1,
      },
    ];

    const properties = [
      { name: 'utm_first_touch_source', label: 'First Touch Source', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_first_touch_channel', label: 'First Touch Channel', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_first_touch_campaign', label: 'First Touch Campaign', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_first_touch_date', label: 'First Touch Date', type: PropertyCreateTypeEnum.Datetime, fieldType: PropertyCreateFieldTypeEnum.Date, groupName: 'utm_tracking' },
      { name: 'utm_last_touch_source', label: 'Last Touch Source', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_last_touch_channel', label: 'Last Touch Channel', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_last_touch_campaign', label: 'Last Touch Campaign', type: PropertyCreateTypeEnum.String, fieldType: PropertyCreateFieldTypeEnum.Text, groupName: 'utm_tracking' },
      { name: 'utm_last_touch_date', label: 'Last Touch Date', type: PropertyCreateTypeEnum.Datetime, fieldType: PropertyCreateFieldTypeEnum.Date, groupName: 'utm_tracking' },
      { name: 'total_touchpoints', label: 'Total Touchpoints', type: PropertyCreateTypeEnum.Number, fieldType: PropertyCreateFieldTypeEnum.Number, groupName: 'utm_tracking' },
      { name: 'attributed_revenue', label: 'Attributed Revenue', type: PropertyCreateTypeEnum.Number, fieldType: PropertyCreateFieldTypeEnum.Number, groupName: 'utm_tracking' },
      { name: 'attributed_cac', label: 'Attributed CAC', type: PropertyCreateTypeEnum.Number, fieldType: PropertyCreateFieldTypeEnum.Number, groupName: 'utm_tracking' },
    ];

    // Create property group
    for (const group of propertyGroups) {
      try {
        await client.crm.properties.groupsApi.create('contacts', group);
      } catch (error) {
        // Group might already exist
        console.log(`Property group ${group.name} might already exist`);
      }
    }

    // Create properties
    for (const prop of properties) {
      try {
        await client.crm.properties.coreApi.create('contacts', prop);
      } catch (error) {
        // Property might already exist
        console.log(`Property ${prop.name} might already exist`);
      }
    }
  }
}

export const hubspotService = new HubSpotService();
