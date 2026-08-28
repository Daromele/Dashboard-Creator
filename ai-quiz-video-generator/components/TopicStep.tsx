
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ChevronRight, Palette, Users, Target, WandSparkles, Type, MessageSquareText, Smile, CheckCheck, GitCompareArrows, XCircle, Hash, CalendarDays, UploadCloud, X, Film, AtSign, UserSquare, Trash2, Globe, TrendingUp, Layers, Dices, Music, Sparkles } from 'lucide-react';
import { COLOR_THEMES, AUDIENCE_OPTIONS, DIFFICULTY_OPTIONS, QUIZ_TYPES, QUESTION_COUNT_OPTIONS, BACKGROUND_MOVEMENTS } from '../constants';
import { getCurrentSeason } from '../utils/audio';
import { suggestTopics, suggestTrendingTopics, generateThemeSound, suggestStyle } from '../services/claudeService';
import { ColorTheme, BackgroundMovement } from '../types';
import CollapsibleSection from './CollapsibleSection';

interface TopicStepProps {
  topic: string;
  setTopic: (topic: string) => void;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  selectedMovement: string;
  setSelectedMovement: (movement: string) => void;
  selectedAudience: string;
  setSelectedAudience: (audience: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  selectedQuizType: string;
  setSelectedQuizType: (type: string) => void;
  numQuestions: number;
  setNumQuestions: (count: number) => void;
  isSeasonal: boolean;
  setIsSeasonal: (isSeasonal: boolean) => void;
  useWebSearch: boolean;
  setUseWebSearch: (useWebSearch: boolean) => void;
  customBackground: string | null;
  setCustomBackground: (url: string | null) => void;
  backgroundType: 'image' | 'video' | null;
  setBackgroundType: (type: 'image' | 'video' | null) => void;
  aspectRatio: '9:16' | '16:9';
  setAspectRatio: (ratio: '9:16' | '16:9') => void;
  watermark: string;
  setWatermark: (watermark: string) => void;
  introClip: Blob | null;
  setIntroClip: (clip: Blob | null) => void;
  outroClip: Blob | null;
  setOutroClip: (clip: Blob | null) => void;
  introAudio: Blob | null;
  setIntroAudio: (clip: Blob | null) => void;
  onGenerateQuiz: () => void;
  isLoading: boolean;
  error: string | null;
  onCancelGenerate: () => void;
  onRandomize: () => void;
}

const TopicStep: React.FC<TopicStepProps> = ({
  topic, setTopic, selectedTheme, setSelectedTheme, selectedMovement, setSelectedMovement,
  selectedAudience, setSelectedAudience, selectedDifficulty, setSelectedDifficulty,
  selectedQuizType, setSelectedQuizType, numQuestions, setNumQuestions,
  isSeasonal, setIsSeasonal, useWebSearch, setUseWebSearch,
  customBackground, setCustomBackground, backgroundType, setBackgroundType,
  aspectRatio, setAspectRatio, watermark, setWatermark,
  introClip, setIntroClip, outroClip, setOutroClip,
  introAudio, setIntroAudio,
  onGenerateQuiz, isLoading, error, onCancelGenerate, onRandomize
}) => {
  const currentTheme = COLOR_THEMES.find(t => t.id === selectedTheme) || COLOR_THEMES[0];
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [trendingSuggestions, setTrendingSuggestions] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isMatchingStyle, setIsMatchingStyle] = useState(false);

  const currentSeason = getCurrentSeason();

  const handleSuggestTopics = async () => {
    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestions([]);
    try {
      const topics = await suggestTopics(topic, selectedQuizType, isSeasonal, currentSeason);
      setSuggestions(topics);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setSuggestionError(`Suggestion failed: ${errorMessage}`);
    } finally {
      setSuggestionLoading(false);
    }
  };
  
  const handleSuggestTrendingTopics = async () => {
    setTrendingLoading(true);
    setTrendingError(null);
    setTrendingSuggestions([]);
    try {
        const topics = await suggestTrendingTopics();
        setTrendingSuggestions(topics);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setTrendingError(`Trending suggestion failed: ${errorMessage}`);
    } finally {
        setTrendingLoading(false);
    }
  };
  
  const handleGenerateIntroAudio = async () => {
      if (!topic.trim()) return;
      setIsGeneratingAudio(true);
      try {
          const audioBlob = await generateThemeSound(topic);
          setIntroAudio(audioBlob);
      } catch (err) {
          console.error("Failed to generate intro audio", err);
      } finally {
          setIsGeneratingAudio(false);
      }
  };
  
  const handleAutoMatchStyle = async () => {
      if (!topic.trim()) return;
      setIsMatchingStyle(true);
      try {
          const result = await suggestStyle(topic, COLOR_THEMES, BACKGROUND_MOVEMENTS);
          setSelectedTheme(result.themeId);
          setSelectedMovement(result.movementId);
      } catch (err) {
          console.error("Failed to match style", err);
      } finally {
          setIsMatchingStyle(false);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (customBackground) {
        URL.revokeObjectURL(customBackground);
    }
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        setCustomBackground(url);
        setBackgroundType(file.type.startsWith('image') ? 'image' : 'video');
    }
  };

  const handleRemoveBackground = () => {
      if(customBackground) {
          URL.revokeObjectURL(customBackground);
      }
      setCustomBackground(null);
      setBackgroundType(null);
  };

  const getQuizTypeIcon = (type: string) => {
    switch (type) {
      case 'Emoji': return <Smile size={16} />;
      case 'True/False': return <CheckCheck size={16} />;
      case 'This or That': return <GitCompareArrows size={16} />;
      default: return <MessageSquareText size={16} />;
    }
  };

  const ClipPreview: React.FC<{ clip: Blob; onRemove: () => void; }> = ({ clip, onRemove }) => {
      const [videoUrl, setVideoUrl] = useState('');

      useEffect(() => {
          if (!clip) return;
          const url = URL.createObjectURL(clip);
          setVideoUrl(url);

          return () => {
              if (url) URL.revokeObjectURL(url);
          };
      }, [clip]);
      
      if (!videoUrl) return null;

      return (
          <div className="relative group w-24 h-32 bg-black rounded-lg overflow-hidden border border-gray-600">
              <video src={videoUrl} muted loop playsInline className="w-full h-full object-cover" onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
              <button onClick={onRemove} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Remove clip">
                  <Trash2 size={14} />
              </button>
          </div>
      );
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="relative text-center">
        <h1 className="text-3xl font-bold text-white">Quiz Video Generator</h1>
        <p className="text-gray-400 mt-1">Enter details for your AI-generated quiz.</p>
        <button 
          onClick={onRandomize}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          title="Randomize style & format"
          aria-label="Randomize style and format"
        >
          <Dices size={20} />
        </button>
      </div>

      <CollapsibleSection title="Quiz Details" icon={<Type size={20} />} defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topic" className="block text-sm font-medium text-gray-300">Quiz Topic</label>
            <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., 'Recent Movie Titles'" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="flex items-center justify-between border border-gray-700 rounded-lg px-4 py-2 bg-gray-800/80">
            <label htmlFor="search-toggle" className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Globe size={16} className="text-green-400" />
              <span>Let Claude search the web for current events</span>
            </label>
            <button id="search-toggle" onClick={() => setUseWebSearch(!useWebSearch)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${useWebSearch ? 'bg-green-500' : 'bg-gray-600'}`}>
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${useWebSearch ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
                <button onClick={handleSuggestTopics} disabled={suggestionLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-70 transition-colors">
                  {suggestionLoading ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />}
                  <span>{suggestionLoading ? 'Suggesting...' : '✨ Suggest Related'}</span>
                </button>
                <button onClick={handleSuggestTrendingTopics} disabled={trendingLoading} className="w-full text-sm flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-70 transition-colors">
                  {trendingLoading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                  <span>{trendingLoading ? 'Finding...' : '🔥 Suggest Trending'}</span>
                </button>
            </div>
            
            {suggestionError && (<p className="text-xs text-red-400 mt-1">{suggestionError}</p>)}
            {trendingError && (<p className="text-xs text-red-400 mt-1">{trendingError}</p>)}
            
            {(suggestions.length > 0 || trendingSuggestions.length > 0) && (
              <div className="space-y-3 pt-2">
                {suggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-1.5">Related to '{topic || "..."}':</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, i) => (
                        <button key={`rel-${i}`} onClick={() => setTopic(s)} className="py-1 px-3 bg-gray-700 text-gray-300 rounded-full text-xs hover:bg-gray-600 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {trendingSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-1.5">🔥 Trending Now:</p>
                    <div className="flex flex-wrap gap-2">
                      {trendingSuggestions.map((s, i) => (
                        <button key={`trend-${i}`} onClick={() => setTopic(s)} className="py-1 px-3 bg-gray-700 text-gray-300 rounded-full text-xs hover:bg-gray-600 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="quiz-type-select" className="flex items-center space-x-2 text-sm font-medium text-gray-300">{getQuizTypeIcon(selectedQuizType)} <span>Quiz Format</span></label>
              <select id="quiz-type-select" value={selectedQuizType} onChange={(e) => setSelectedQuizType(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                {QUIZ_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="question-count-select" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><Hash size={16} /> <span>Questions</span></label>
              <select id="question-count-select" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                {QUESTION_COUNT_OPTIONS.map(count => (<option key={count} value={count}>{count} {count === 1 ? 'Question' : 'Questions'}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="watermark" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><AtSign size={16} /><span>Channel Watermark (Optional)</span></label>
            <input type="text" id="watermark" value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="e.g., @QuizFlow" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div className="flex items-center justify-between border border-gray-700 rounded-lg px-4 py-2 bg-gray-800/80">
            <label htmlFor="seasonal-toggle" className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <CalendarDays size={16} className="text-cyan-400" />
              <span>Seasonal Topics (Now: {currentSeason})</span>
            </label>
            <button id="seasonal-toggle" onClick={() => setIsSeasonal(!isSeasonal)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isSeasonal ? 'bg-green-500' : 'bg-gray-600'}`}>
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSeasonal ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Visual Style" icon={<Palette size={20} />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="theme-select" className="flex items-center justify-between text-sm font-medium text-gray-300">
                  <div className="flex items-center space-x-2"><Palette size={16} /><span>Color Theme</span></div>
                  <button onClick={handleAutoMatchStyle} disabled={!topic.trim() || isMatchingStyle} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50">
                      {isMatchingStyle ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Auto-Match
                  </button>
              </label>
              <select id="theme-select" value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} disabled={!!customBackground} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                {COLOR_THEMES.map((th: ColorTheme) => <option key={th.id} value={th.id}>{th.name}</option>)}
              </select>
              {!customBackground && (
                <div className="h-3 w-full rounded mt-2" style={{ background: `linear-gradient(to right, ${currentTheme.bgGradientStart}, ${currentTheme.bgGradientMid}, ${currentTheme.bgGradientEnd})` }} />
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="movement-select" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><Layers size={16} /><span>Background Movement</span></label>
              <select id="movement-select" value={selectedMovement} onChange={(e) => setSelectedMovement(e.target.value)} disabled={!!customBackground} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                {BACKGROUND_MOVEMENTS.map((m: BackgroundMovement) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
           {customBackground && (
              <div className="h-3 w-full rounded-b-lg -mt-4 bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-medium">Custom Background Active</div>
            )}

          <div className="space-y-2">
            <label htmlFor="background-upload" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><UploadCloud size={16} /><span>Custom Background (Optional)</span></label>
            {!customBackground ? (
                <label htmlFor="background-upload" className="relative block border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer">
                    <input type="file" id="background-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,video/mp4,video/webm" onChange={handleFileChange} />
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <UploadCloud size={24} className="text-gray-500" />
                        <p className="text-gray-400 text-sm">Drag &amp; drop or click to upload</p>
                        <p className="text-xs text-gray-500">Image or Video File</p>
                    </div>
                </label>
            ) : (
                <div className="relative group w-full max-w-[270px] mx-auto aspect-[9/16] rounded-lg overflow-hidden border-2 border-blue-500">
                    {backgroundType === 'image' ? (
                        <img src={customBackground} alt="Custom background preview" className="w-full h-full object-cover" />
                    ) : (
                        <video src={customBackground} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                    )}
                    <button onClick={handleRemoveBackground} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Remove custom background">
                        <X size={16} />
                    </button>
                </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300"><Film size={16} /><span>Resolution</span></label>
            <div className="flex w-full bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button onClick={() => setAspectRatio('9:16')} className={`w-1/2 py-1.5 rounded-md text-sm font-semibold transition-colors ${aspectRatio === '9:16' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                Portrait (9:16)
              </button>
              <button onClick={() => setAspectRatio('16:9')} className={`w-1/2 py-1.5 rounded-md text-sm font-semibold transition-colors ${aspectRatio === '16:9' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                Landscape (16:9)
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Personal Touch & Audio" icon={<UserSquare size={20} />}>
        <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-semibold text-gray-400">INTRO VIDEO</label>
                {introClip ? <ClipPreview clip={introClip} onRemove={() => setIntroClip(null)} /> : (
                    <label className="w-full h-24 flex flex-col items-center justify-center bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors cursor-pointer">
                        <UploadCloud size={20} />
                        <span className="text-xs mt-1">Upload</span>
                        <input type="file" className="hidden" accept="video/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setIntroClip(file);
                        }} />
                    </label>
                )}
            </div>
            <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-semibold text-gray-400">OUTRO VIDEO</label>
                {outroClip ? <ClipPreview clip={outroClip} onRemove={() => setOutroClip(null)} /> : (
                    <label className="w-full h-24 flex flex-col items-center justify-center bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors cursor-pointer">
                        <UploadCloud size={20} />
                        <span className="text-xs mt-1">Upload</span>
                        <input type="file" className="hidden" accept="video/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setOutroClip(file);
                        }} />
                    </label>
                )}
            </div>
             <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-semibold text-gray-400">INTRO SOUND</label>
                {introAudio ? (
                    <div className="w-full h-24 flex flex-col items-center justify-center bg-green-900/30 border border-green-600 rounded-lg relative">
                         <Music size={24} className="text-green-400" />
                         <span className="text-xs mt-1 text-green-300">SFX Ready</span>
                         <button onClick={() => setIntroAudio(null)} className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-400"><X size={14}/></button>
                    </div>
                ) : (
                    <button 
                        onClick={handleGenerateIntroAudio}
                        disabled={!topic.trim() || isGeneratingAudio}
                        className="w-full h-24 flex flex-col items-center justify-center bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingAudio ? <Loader2 size={20} className="animate-spin" /> : <WandSparkles size={20} />}
                        <span className="text-xs mt-1">AI Generate</span>
                    </button>
                )}
            </div>
        </div>
      </CollapsibleSection>
      
      <CollapsibleSection title="Advanced Targeting" icon={<Target size={20} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="audience-select" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><Users size={16} /><span>Audience (Optional)</span></label>
            <select id="audience-select" value={selectedAudience} onChange={(e) => setSelectedAudience(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {AUDIENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="difficulty-select" className="flex items-center space-x-2 text-sm font-medium text-gray-300"><Target size={16} /><span>Difficulty (Optional)</span></label>
            <select id="difficulty-select" value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {DIFFICULTY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <div className="flex items-center gap-2 pt-2">
        <button onClick={onGenerateQuiz} disabled={isLoading || !topic.trim()} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors">
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
          <span>{isLoading ? "Generating..." : "Generate Quiz"}</span>
        </button>
        {isLoading && (
          <button onClick={onCancelGenerate} title="Cancel Generation" className="flex-shrink-0 p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors">
            <XCircle size={20} />
          </button>
        )}
      </div>
      {error && (
          <div className="flex items-center gap-2 text-red-400 p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <span className="text-sm">{error}</span>
          </div>
      )}
    </div>
  );
}

export default TopicStep;
