
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number | null;
  explanation: string | null;
  quizType: string;
  media?: {
    url: string;
    type: 'image' | 'video';
  } | null;
}

export interface ColorTheme {
  id: string;
  name: string;
  bgGradientStart: string;
  bgGradientMid: string;
  bgGradientEnd: string;
}

export interface BackgroundMovement {
  id: string;
  name: string;
}

export interface VoiceStyle {
  id: string;
  name: string;
  /** SpeechSynthesisUtterance rate (1 = normal). */
  rate: number;
  /** SpeechSynthesisUtterance pitch (1 = normal). */
  pitch: number;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: WebSource;
}