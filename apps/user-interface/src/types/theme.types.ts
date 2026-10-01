/**
 * @file theme.types.ts
 * @description Nexus Precision Tasarım Sistemi tema modu ve kurumsal renk paleti tür tanımları.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export type ColorPalette = 'indigo' | 'emerald' | 'obsidian' | 'ocean';

export interface PaletteOption {
  id: ColorPalette;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: 'indigo',
    name: 'Nexus Indigo',
    description: 'Modern AI & Yüksek Teknoloji',
    primaryColor: '#4338ca',
    secondaryColor: '#0284c7',
  },
  {
    id: 'emerald',
    name: 'Emerald Sentinel',
    description: 'Veri Güvenliği & Mevzuat',
    primaryColor: '#059669',
    secondaryColor: '#0d9488',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Minimal',
    description: 'Linear Tarzı Monokrom',
    primaryColor: '#18181b',
    secondaryColor: '#71717a',
  },
  {
    id: 'ocean',
    name: 'Cyber Ocean',
    description: 'Kurumsal Bulut Mavisi',
    primaryColor: '#0284c7',
    secondaryColor: '#6366f1',
  },
];
