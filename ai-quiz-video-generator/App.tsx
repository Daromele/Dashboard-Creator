
import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { QuizQuestion, ColorTheme, GroundingChunk } from './types';
import { COLOR_THEMES, AUDIENCE_OPTIONS, DIFFICULTY_OPTIONS, QUIZ_TYPES, QUESTION_COUNT_OPTIONS, BACKGROUND_MOVEMENTS } from './constants';
import { generateQuizFromTopic, generateAITitle, generateCategory } from './services/claudeService';
import { getCurrentSeason } from './utils/audio';

import TopicStep from './components/TopicStep';
import RecordingStep from './components/RecordingStep';
import VideoRenderStep from './components/VideoRenderStep';
import DownloadStep from './components/DownloadStep';

const getRandomQuizType = () => {
  const types = QUIZ_TYPES;
  const randomIndex = Math.floor(Math.random() * types.length);
  return types[randomIndex];
};

export default function App() {
  const [step, setStep] = useState('topic'); // topic, recording, rendering, download
  const [topic, setTopic] = useState('');
  const [aiTitle, setAiTitle] = useState('QUIZ TIME!');
  const [quizCategory, setQuizCategory] = useState('General');
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [quizSources, setQuizSources] = useState<GroundingChunk[]>([]);
  const [audioBlobs, setAudioBlobs] = useState<(Blob | null)[]>([]);
  const [answerAudioBlobs, setAnswerAudioBlobs] = useState<(Blob | null)[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [finalVideoURL, setFinalVideoURL] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState("clear");
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const randomIndex = Math.floor(Math.random() * COLOR_THEMES.length);
    return COLOR_THEMES[randomIndex].id;
  });
  const [selectedMovement, setSelectedMovement] = useState(() => {
    const randomIndex = Math.floor(Math.random() * BACKGROUND_MOVEMENTS.length);
    return BACKGROUND_MOVEMENTS[randomIndex].id;
  });
  // Updated Defaults requested by user
  const [selectedAudience, setSelectedAudience] = useState("General");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(3);
  
  const [includeAnswerVoiceover, setIncludeAnswerVoiceover] = useState(false);
  const [selectedQuizType, setSelectedQuizType] = useState(getRandomQuizType);
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [backgroundType, setBackgroundType] = useState<'image' | 'video' | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [watermark, setWatermark] = useState('');
  const [introClip, setIntroClip] = useState<Blob | null>(null);
  const [outroClip, setOutroClip] = useState<Blob | null>(null);
  const [introAudio, setIntroAudio] = useState<Blob | null>(null);

  const currentSeason = getCurrentSeason();
  const abortControllerRef = useRef<AbortController | null>(null);

  const randomizeProjectSettings = () => {
    setSelectedTheme(() => {
        const randomIndex = Math.floor(Math.random() * COLOR_THEMES.length);
        return COLOR_THEMES[randomIndex].id;
    });
    setSelectedMovement(() => {
        const randomIndex = Math.floor(Math.random() * BACKGROUND_MOVEMENTS.length);
        return BACKGROUND_MOVEMENTS[randomIndex].id;
    });
    // Defaults are fixed now, but randomize can still change them for variety
    const audiences = AUDIENCE_OPTIONS.filter(d => d !== "Default");
    setSelectedAudience(audiences[Math.floor(Math.random() * audiences.length)]);
    
    const difficulties = DIFFICULTY_OPTIONS.filter(d => d !== "Default");
    setSelectedDifficulty(difficulties[Math.floor(Math.random() * difficulties.length)]);
    
    setSelectedQuizType(getRandomQuizType);
    setNumQuestions(3); // Keep 3 as preferred default even on randomize
    setIsSeasonal(Math.random() < 0.25);
    setUseWebSearch(Math.random() < 0.25);
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic to begin.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuizData([]);
    setQuizSources([]);
    abortControllerRef.current = new AbortController();
    try {
      const { questions, sources } = await generateQuizFromTopic(topic, selectedAudience, selectedDifficulty, selectedQuizType, numQuestions, isSeasonal, currentSeason, useWebSearch);
      
      setQuizSources(sources || []);
      
      let category = 'General';
      try {
        category = await generateCategory(topic);
      } catch (e) {
        console.error("Category generation failed, using fallback.", e);
      }
      
      const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '');
      setQuizCategory(cleanCategory);

      try {
        const title = await generateAITitle(topic, selectedAudience, selectedDifficulty, selectedQuizType, numQuestions, isSeasonal, currentSeason, cleanCategory);
        setAiTitle(title);
      } catch(e) {
        console.error("Title generation failed, constructing fallback.", e);
        setAiTitle(`${topic} #quiz #trivia Social_Quiz_[${cleanCategory}]`);
      }
      
      const fullQuestions = questions.map(q => ({...q, quizType: selectedQuizType, media: null})) as QuizQuestion[];
      setQuizData(fullQuestions);
      setAudioBlobs(new Array(fullQuestions.length).fill(null));
      setAnswerAudioBlobs(new Array(fullQuestions.length).fill(null));
      setCurrentQuestionIndex(0);
      setStep('recording');
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
      if (errorMessage !== "This operation was aborted.") {
          setError(`Quiz generation failed: ${errorMessage}`);
      } else {
          setError("Quiz generation cancelled.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };
  
  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("This operation was aborted.");
    }
  };

  const updateQuizItem = (index: number, updatedData: Partial<QuizQuestion>) => {
    setQuizData(prevData => {
      const newData = [...prevData];
      if (index >= 0 && index < newData.length) {
        newData[index] = { ...newData[index], ...updatedData };
      }
      return newData;
    });
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) setCurrentQuestionIndex(p => p + 1);
  };
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p + 1);
  };

  const allAudioRecorded = quizData.length > 0 && quizData.every((q, i) => q.quizType === 'Emoji' || audioBlobs[i] !== null);
  const canGoNext = currentQuestionIndex < quizData.length - 1 && (quizData[currentQuestionIndex]?.quizType === 'Emoji' || audioBlobs[currentQuestionIndex] !== null);
  const canGoPrev = currentQuestionIndex > 0;
  const currentTheme = COLOR_THEMES.find(t => t.id === selectedTheme) || COLOR_THEMES[0];

  const startOver = () => {
    if (customBackground) {
        URL.revokeObjectURL(customBackground);
    }
    quizData.forEach(q => {
      if (q.media?.url && q.media.url.startsWith('blob:')) {
        URL.revokeObjectURL(q.media.url);
      }
    });
    setStep('topic'); setTopic(''); setAiTitle('QUIZ TIME!'); setQuizData([]); setAudioBlobs([]);
    setQuizSources([]);
    setAnswerAudioBlobs([]); setCurrentQuestionIndex(0); setFinalVideoURL(null); setError(null);
    setIsLoading(false); setSelectedVoice("clear");
    const randomThemeIndex = Math.floor(Math.random() * COLOR_THEMES.length);
    setSelectedTheme(COLOR_THEMES[randomThemeIndex].id);
    setSelectedAudience("General");
    setSelectedDifficulty("Medium");
    setIncludeAnswerVoiceover(false); 
    setSelectedQuizType(getRandomQuizType());
    setNumQuestions(3); 
    setIsSeasonal(false); setUseWebSearch(false);
    setQuizCategory('General');
    setCustomBackground(null); setBackgroundType(null); setAspectRatio('9:16');
    setWatermark('');
    setIntroClip(null); setOutroClip(null); setIntroAudio(null);
    const randomMovementIndex = Math.floor(Math.random() * BACKGROUND_MOVEMENTS.length);
    setSelectedMovement(BACKGROUND_MOVEMENTS[randomMovementIndex].id);
    if (abortControllerRef.current) abortControllerRef.current.abort("This operation was aborted.");
  };

  const renderStep = () => {
    switch (step) {
      case 'topic':
        return <TopicStep {...{ topic, setTopic, selectedTheme, setSelectedTheme, selectedMovement, setSelectedMovement, selectedAudience, setSelectedAudience, selectedDifficulty, setSelectedDifficulty, selectedQuizType, setSelectedQuizType, numQuestions, setNumQuestions, isSeasonal, setIsSeasonal, useWebSearch, setUseWebSearch, customBackground, setCustomBackground, backgroundType, setBackgroundType, aspectRatio, setAspectRatio, watermark, setWatermark, introClip, setIntroClip, outroClip, setOutroClip, introAudio, setIntroAudio, onGenerateQuiz: handleGenerateQuiz, isLoading, error, onCancelGenerate: handleCancelGenerate, onRandomize: randomizeProjectSettings }} />;
      case 'recording':
        return <RecordingStep {...{ selectedVoice, setSelectedVoice, audioBlobs, setAudioBlobs, answerAudioBlobs, setAnswerAudioBlobs, includeAnswerVoiceover, setIncludeAnswerVoiceover, currentQuestionIndex, quizData, updateQuizItem, canGoPrev, goToPrevQuestion, canGoNext, goToNextQuestion, allAudioRecorded, setStep }} />;
      case 'rendering':
        return <VideoRenderStep {...{ quizData, audioBlobs, answerAudioBlobs, theme: currentTheme, topic: aiTitle, difficulty: selectedDifficulty, quizType: selectedQuizType, customBackground, backgroundType, aspectRatio, watermark, introClip, outroClip, introAudio, backgroundMovement: selectedMovement, onComplete: (blob) => { setFinalVideoURL(blob); setStep('download'); }, onError: (err) => { setError(`Render Failed: ${err}`); setStep('recording'); } }} />;
      case 'download':
        return <DownloadStep {...{ finalVideoURL, topic: aiTitle, quizCategory, quizSources, startOver, selectedTheme, selectedQuizType, aspectRatio }} />;
      default:
        return <TopicStep {...{ topic, setTopic, selectedTheme, setSelectedTheme, selectedMovement, setSelectedMovement, selectedAudience, setSelectedAudience, selectedDifficulty, setSelectedDifficulty, selectedQuizType, setSelectedQuizType, numQuestions, setNumQuestions, isSeasonal, setIsSeasonal, useWebSearch, setUseWebSearch, customBackground, setCustomBackground, backgroundType, setBackgroundType, aspectRatio, setAspectRatio, watermark, setWatermark, introClip, setIntroClip, outroClip, setOutroClip, introAudio, setIntroAudio, onGenerateQuiz: handleGenerateQuiz, isLoading, error, onCancelGenerate: handleCancelGenerate, onRandomize: randomizeProjectSettings }} />;
    }
  };
  
  return (
    <div className="bg-gray-950 min-h-screen p-4 sm:p-8 font-inter text-white">
      <div className="relative w-full max-w-lg mx-auto bg-gray-900 shadow-2xl rounded-xl border border-gray-700 p-6 sm:p-8 overflow-hidden">
        {isLoading && step === 'topic' && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
            <Loader2 size={48} className="animate-spin text-blue-400" />
            <p className="text-white mt-4 text-lg">Generating Quiz...</p>
          </div>
        )}
        {renderStep()}
      </div>
    </div>
  );
}
