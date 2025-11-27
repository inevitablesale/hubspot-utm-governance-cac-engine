import type {
  NormalizationRule,
  SourceMapping,
  ChannelCost,
  UTMRecord,
  AttributionEvent,
} from './types.js';

// Simple in-memory store for the application
// In production, this would be replaced with a proper database
class DataStore {
  private normalizationRules: Map<string, NormalizationRule> = new Map();
  private sourceMappings: Map<string, SourceMapping> = new Map();
  private channelCosts: Map<string, ChannelCost> = new Map();
  private utmRecords: Map<string, UTMRecord> = new Map();
  private attributionEvents: Map<string, AttributionEvent> = new Map();

  // Normalization Rules
  addNormalizationRule(rule: NormalizationRule): void {
    this.normalizationRules.set(rule.id, rule);
  }

  getNormalizationRule(id: string): NormalizationRule | undefined {
    return this.normalizationRules.get(id);
  }

  getAllNormalizationRules(): NormalizationRule[] {
    return Array.from(this.normalizationRules.values())
      .filter(r => r.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  updateNormalizationRule(id: string, updates: Partial<NormalizationRule>): NormalizationRule | undefined {
    const existing = this.normalizationRules.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.normalizationRules.set(id, updated);
    return updated;
  }

  deleteNormalizationRule(id: string): boolean {
    return this.normalizationRules.delete(id);
  }

  // Source Mappings
  addSourceMapping(mapping: SourceMapping): void {
    this.sourceMappings.set(mapping.id, mapping);
  }

  getSourceMapping(id: string): SourceMapping | undefined {
    return this.sourceMappings.get(id);
  }

  getAllSourceMappings(): SourceMapping[] {
    return Array.from(this.sourceMappings.values())
      .filter(m => m.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  updateSourceMapping(id: string, updates: Partial<SourceMapping>): SourceMapping | undefined {
    const existing = this.sourceMappings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.sourceMappings.set(id, updated);
    return updated;
  }

  deleteSourceMapping(id: string): boolean {
    return this.sourceMappings.delete(id);
  }

  // Channel Costs
  addChannelCost(cost: ChannelCost): void {
    this.channelCosts.set(cost.id, cost);
  }

  getChannelCost(id: string): ChannelCost | undefined {
    return this.channelCosts.get(id);
  }

  getAllChannelCosts(): ChannelCost[] {
    return Array.from(this.channelCosts.values());
  }

  getChannelCostsByChannel(channel: string): ChannelCost[] {
    return Array.from(this.channelCosts.values())
      .filter(c => c.channel === channel);
  }

  getChannelCostsInRange(startDate: string, endDate: string): ChannelCost[] {
    return Array.from(this.channelCosts.values())
      .filter(c => c.startDate >= startDate && c.endDate <= endDate);
  }

  updateChannelCost(id: string, updates: Partial<ChannelCost>): ChannelCost | undefined {
    const existing = this.channelCosts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.channelCosts.set(id, updated);
    return updated;
  }

  deleteChannelCost(id: string): boolean {
    return this.channelCosts.delete(id);
  }

  // UTM Records
  addUTMRecord(record: UTMRecord): void {
    this.utmRecords.set(record.id, record);
  }

  getUTMRecord(id: string): UTMRecord | undefined {
    return this.utmRecords.get(id);
  }

  getAllUTMRecords(): UTMRecord[] {
    return Array.from(this.utmRecords.values());
  }

  getUTMRecordsByContact(contactId: string): UTMRecord[] {
    return Array.from(this.utmRecords.values())
      .filter(r => r.contactId === contactId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  getUTMRecordsByChannel(channel: string): UTMRecord[] {
    return Array.from(this.utmRecords.values())
      .filter(r => r.channel === channel);
  }

  // Attribution Events
  addAttributionEvent(event: AttributionEvent): void {
    this.attributionEvents.set(event.id, event);
  }

  getAttributionEvent(id: string): AttributionEvent | undefined {
    return this.attributionEvents.get(id);
  }

  getAllAttributionEvents(): AttributionEvent[] {
    return Array.from(this.attributionEvents.values());
  }

  getAttributionEventsByContact(contactId: string): AttributionEvent[] {
    return Array.from(this.attributionEvents.values())
      .filter(e => e.contactId === contactId);
  }

  getAttributionEventsByChannel(channel: string): AttributionEvent[] {
    return Array.from(this.attributionEvents.values())
      .filter(e => e.channel === channel);
  }

  // Utility methods
  clear(): void {
    this.normalizationRules.clear();
    this.sourceMappings.clear();
    this.channelCosts.clear();
    this.utmRecords.clear();
    this.attributionEvents.clear();
  }

  // Seed with default data
  seedDefaults(): void {
    // Default normalization rules
    const defaultRules: NormalizationRule[] = [
      { id: 'norm-1', field: 'utm_source', matchType: 'exact', matchValue: 'fb', normalizedValue: 'facebook', priority: 10, isActive: true },
      { id: 'norm-2', field: 'utm_source', matchType: 'exact', matchValue: 'ig', normalizedValue: 'instagram', priority: 10, isActive: true },
      { id: 'norm-3', field: 'utm_source', matchType: 'exact', matchValue: 'tw', normalizedValue: 'twitter', priority: 10, isActive: true },
      { id: 'norm-4', field: 'utm_source', matchType: 'exact', matchValue: 'li', normalizedValue: 'linkedin', priority: 10, isActive: true },
      { id: 'norm-5', field: 'utm_medium', matchType: 'exact', matchValue: 'cpc', normalizedValue: 'paid', priority: 10, isActive: true },
      { id: 'norm-6', field: 'utm_medium', matchType: 'exact', matchValue: 'ppc', normalizedValue: 'paid', priority: 10, isActive: true },
    ];
    defaultRules.forEach(r => this.addNormalizationRule(r));

    // Default source mappings
    const defaultMappings: SourceMapping[] = [
      { id: 'map-1', utmSource: 'google', utmMedium: 'cpc', source: 'Google Ads', sourceDetail: 'Search', channel: 'Paid Search', priority: 10, isActive: true },
      { id: 'map-2', utmSource: 'google', utmMedium: 'organic', source: 'Google', sourceDetail: 'Organic Search', channel: 'Organic Search', priority: 10, isActive: true },
      { id: 'map-3', utmSource: 'facebook', utmMedium: 'paid', source: 'Facebook', sourceDetail: 'Paid Social', channel: 'Paid Social', priority: 10, isActive: true },
      { id: 'map-4', utmSource: 'facebook', utmMedium: 'organic', source: 'Facebook', sourceDetail: 'Organic Social', channel: 'Organic Social', priority: 10, isActive: true },
      { id: 'map-5', utmSource: 'linkedin', utmMedium: 'paid', source: 'LinkedIn', sourceDetail: 'Paid Social', channel: 'Paid Social', priority: 10, isActive: true },
      { id: 'map-6', utmSource: 'email', source: 'Email', sourceDetail: 'Newsletter', channel: 'Email', priority: 5, isActive: true },
      { id: 'map-7', utmSource: 'direct', source: 'Direct', sourceDetail: 'Direct Traffic', channel: 'Direct', priority: 1, isActive: true },
    ];
    defaultMappings.forEach(m => this.addSourceMapping(m));
  }
}

// Export singleton instance
export const dataStore = new DataStore();
