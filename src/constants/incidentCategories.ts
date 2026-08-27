export const INCIDENT_CATEGORIES = [
  'fire',
  'medical',
  'police',
  'rescue',
  'flood',
  'gas_hazard',
  'traffic',
  'building_collapse',
  'general',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  fire: 'Fire',
  medical: 'Medical',
  police: 'Police / Security',
  rescue: 'Search & Rescue',
  flood: 'Flood',
  gas_hazard: 'Gas / Hazardous Materials',
  traffic: 'Traffic / Accident',
  building_collapse: 'Building Collapse',
  general: 'General',
};

export const SPECIALIZATION_OPTIONS: { value: IncidentCategory; label: string }[] =
  INCIDENT_CATEGORIES.map((c) => ({
    value: c,
    label: CATEGORY_LABELS[c],
  }));

export function categoryLabel(value?: string | null): string {
  if (!value) return 'General';
  const v = value.toLowerCase();
  return (CATEGORY_LABELS as Record<string, string>)[v] || 'General';
}