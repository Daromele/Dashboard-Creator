
import { ColorTheme, VoiceStyle, BackgroundMovement } from './types';

export const VOICE_STYLES: VoiceStyle[] = [
  { id: "clear", name: "Clear (Neutral)", rate: 1.0, pitch: 1.0 },
  { id: "cinematic", name: "Cinematic (Deep, Slow)", rate: 0.85, pitch: 0.7 },
  { id: "energetic", name: "Energetic (Bright, Fast)", rate: 1.25, pitch: 1.3 },
  { id: "professional", name: "Professional (Firm)", rate: 0.95, pitch: 0.9 },
  { id: "upbeat", name: "Upbeat (Friendly)", rate: 1.1, pitch: 1.15 },
  { id: "dramatic", name: "Dramatic (Authoritative)", rate: 0.8, pitch: 0.6 },
];

export const PERSONAS = [
  { id: "default", name: "Default (Neutral)" },
  { id: "pirate", name: "Pirate Captain" },
  { id: "genz", name: "Gen Z Influencer" },
  { id: "news", name: "1920s News Anchor" },
  { id: "sarcastic", name: "Sarcastic Robot" },
  { id: "hype", name: "Hype Man" },
  { id: "detective", name: "Noir Detective" },
];

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cosmic', name: 'Cosmic Aurora (Default)',
    bgGradientStart: '#0f0c29', bgGradientMid: '#302b63', bgGradientEnd: '#24243e',
  },
  {
    id: 'molten', name: 'Molten Core',
    bgGradientStart: '#330800', bgGradientMid: '#ff4800', bgGradientEnd: '#ff8c00',
  },
  {
    id: 'ocean_deep', name: 'Deep Ocean',
    bgGradientStart: '#000428', bgGradientMid: '#004e92', bgGradientEnd: '#1a2980',
  },
  {
    id: 'enchanted_forest', name: 'Enchanted Forest',
    bgGradientStart: '#0f2027', bgGradientMid: '#203a43', bgGradientEnd: '#2c5364',
  },
  {
    id: 'twilight', name: 'Twilight',
    bgGradientStart: '#1a2a6c', bgGradientMid: '#b21f1f', bgGradientEnd: '#fdbb2d',
  }, {
    id: 'sunset', name: 'Sunset Flare',
    bgGradientStart: '#ff4e50', bgGradientMid: '#f9d423', bgGradientEnd: '#ff4e50',
  }, {
    id: 'emerald', name: 'Emerald Sea',
    bgGradientStart: '#02AAB0', bgGradientMid: '#00CDAC', bgGradientEnd: '#02AAB0',
  }, {
    id: 'amethyst', name: 'Amethyst Sky',
    bgGradientStart: '#6a3093', bgGradientMid: '#a044ff', bgGradientEnd: '#6a3093',
  },
  {
    id: 'cyber', name: 'Cyber (Vibrant)',
    bgGradientStart: '#00f2ff', bgGradientMid: '#d600ff', bgGradientEnd: '#ff00a0',
  }, {
    id: "rainbow", name: "Rainbow (Gradient)",
    bgGradientStart: "#ff0000", bgGradientMid: "#00ff00", bgGradientEnd: "#0000ff",
  }, {
    id: 'halloween', name: 'Spooky (Halloween)',
    bgGradientStart: '#ff6600', bgGradientMid: '#1a1a1a', bgGradientEnd: '#5800a1',
  }, {
    id: 'harvest', name: 'Harvest (Thanksgiving)',
    bgGradientStart: '#d2691e', bgGradientMid: '#8b4513', bgGradientEnd: '#ffc107',
  }, {
    id: 'festive', name: 'Festive (Christmas)',
    bgGradientStart: '#d62828', bgGradientMid: '#f7b538', bgGradientEnd: '#008148',
  }, {
    id: 'midnight', name: 'Midnight (New Years)',
    bgGradientStart: '#000000', bgGradientMid: '#1a1a1a', bgGradientEnd: '#fdbb2d',
  }, {
    id: 'mono', name: 'Mono (Minimalist)',
    bgGradientStart: '#111827', bgGradientMid: '#374151', bgGradientEnd: '#111827',
  },
  {
    id: 'solar_flare', name: 'Solar Flare',
    bgGradientStart: '#F7971E', bgGradientMid: '#FFD200', bgGradientEnd: '#f12711'
  },
  {
    id: 'galactic_haze', name: 'Galactic Haze',
    bgGradientStart: '#4A00E0', bgGradientMid: '#8E2DE2', bgGradientEnd: '#DA00FF'
  },
  {
    id: 'jungle_mist', name: 'Jungle Mist',
    bgGradientStart: '#00467F', bgGradientMid: '#A5CC82', bgGradientEnd: '#00467F'
  }
];

export const BACKGROUND_MOVEMENTS: BackgroundMovement[] = [
  { id: 'wavy', name: 'Wavy Blobs (Default)' },
  { id: 'particles', name: 'Cosmic Dust' },
  { id: 'pulse', name: 'Subtle Pulse' },
  { id: 'none', name: 'Static Gradient' },
];

export const AUDIENCE_OPTIONS: string[] = ["Default", "General", "Office", "Family Reunion", "Kids", "Teens"];
export const DIFFICULTY_OPTIONS: string[] = ["Default", "Easy", "Medium", "Hard", "Expert", "Master", "Legendary"];
export const QUIZ_TYPES: string[] = ["Multiple Choice", "Emoji", "True/False", "This or That"];
export const QUESTION_COUNT_OPTIONS: number[] = [1, 2, 3, 4, 5];
