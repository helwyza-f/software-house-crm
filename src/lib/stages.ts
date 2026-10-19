export const STAGES = [
  'Baru',
  'Dihubungi',
  'Follow-up',
  'Meeting / Demo',
  'Penawaran',
  'Negosiasi',
  'Closing',
  'Batal',
] as const;

export type Stage = (typeof STAGES)[number];

export const DEFAULT_STAGE: Stage = 'Baru';

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}

export const LOST_REASONS = [
  'Harga terlalu mahal',
  'Tidak ada respon',
  'Memilih kompetitor',
  'Belum butuh / ditunda',
  'Lainnya',
] as const;
