/**
 * Sample product options available in the VitaDreamz free sample program
 */
export const SAMPLE_OPTIONS = [
  { value: 'slumber-berry', label: 'Slumber Berry - Sleep Gummies (4ct)' },
  { value: 'luna-berry', label: 'Luna Berry - Sleep Gummies (4ct)' },
  { value: 'bliss-berry', label: 'Bliss Berry - Relax & Sleep Gummies (4ct)' },
  { value: 'berry-chill', label: 'Berry Chill - ChillOut Chewz (4ct)' }
] as const;

export type SampleValue = typeof SAMPLE_OPTIONS[number]['value'];
