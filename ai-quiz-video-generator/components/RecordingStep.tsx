
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, ArrowRight, FileVideo, Check, X, BrainCircuit, Play, Pause, Image, UploadCloud, Trash2, Link, Sparkles, PenTool, Lightbulb } from 'lucide-react';
import { QuizQuestion, VoiceStyle } from '../types';
import { VOICE_STYLES, PERSONAS } from '../constants';
import VoiceRecorder from './VoiceRecorder';
import { generateBackgroundImage, rewriteTextWithPersona, generateFunFact, generateVoiceoverScript } from '../services/claudeService';
import { speak, cancelSpeech, isSpeechSupported } from '../services/speech';
import { loadMediaFromUrl } from '../utils/media';

interface RecordingStepProps {
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  audioBlobs: (Blob | null)[];
  setAudioBlobs: React.Dispatch<React.SetStateAction<(Blob | null)[]>>;
  answerAudioBlobs: (Blob | null)[];
  setAnswerAudioBlobs: React.Dispatch<React.SetStateAction<(Blob | null)[]>>;
  includeAnswerVoiceover: boolean;
  setIncludeAnswerVoiceover: (include: boolean) => void;
  currentQuestionIndex: number;
  quizData: QuizQuestion[];
  updateQuizItem: (index: number, updatedData: Partial<QuizQuestion>) => void;
  canGoPrev: boolean;
  goToPrevQuestion: () => void;
  canGoNext: boolean;
  goToNextQuestion: () => void;
  allAudioRecorded: boolean;
  setStep: (step: string) => void;
}

const RecordingStep: React.FC<RecordingStepProps> = ({
  selectedVoice, setSelectedVoice, audioBlobs, setAudioBlobs, answerAudioBlobs, setAnswerAudioBlobs,
  includeAnswerVoiceover, setIncludeAnswerVoiceover, currentQuestionIndex, quizData, updateQuizItem,
  canGoPrev, goToPrevQuestion, canGoNext, goToNextQuestion, allAudioRecorded, setStep
}) => {
  const [previewAudioURL, setPreviewAudioURL] = useState<string | null>(null);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [isPolishingScript, setIsPolishingScript] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const [selectedPersona, setSelectedPersona] = useState("default");
  const [isRewriting, setIsRewriting] = useState(false);
  const [isGeneratingFunFact, setIsGeneratingFunFact] = useState(false);

  const currentQuestion = quizData[currentQuestionIndex];
  const currentAudioBlob = audioBlobs[currentQuestionIndex];
  const isEmojiQuestion = currentQuestion?.quizType === 'Emoji';
  const isThisOrThat = currentQuestion?.quizType === 'This or That';

  const [editedQuestion, setEditedQuestion] = useState(currentQuestion?.question || '');
  const [editedOptions, setEditedOptions] = useState<string[]>(currentQuestion?.options || []);
  const [editedExplanation, setEditedExplanation] = useState(currentQuestion?.explanation || '');

  useEffect(() => {
    setEditedQuestion(currentQuestion?.question || '');
    setEditedOptions(currentQuestion?.options || []);
    setEditedExplanation(currentQuestion?.explanation || '');
    setMediaError(null);
    setMediaUrlInput('');
    setSelectedPersona("default");
  }, [currentQuestionIndex, currentQuestion]);

  useEffect(() => {
    let url: string | null = null;
    if (currentAudioBlob) {
      url = URL.createObjectURL(currentAudioBlob);
      setPreviewAudioURL(url);
    } else {
      setPreviewAudioURL(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentAudioBlob]);

  useEffect(() => cancelSpeech, []);


  const handleRecordingComplete = (qBlob: Blob | null, aBlob: Blob | null) => {
    setAudioBlobs(p => { const n = [...p]; n[currentQuestionIndex] = qBlob; return n; });
    setAnswerAudioBlobs(p => { const n = [...p]; n[currentQuestionIndex] = aBlob; return n; });
  };
  
  const handleClearRecording = () => {
    handleRecordingComplete(null, null);
  };
  
  const handlePlaySample = async (voice: VoiceStyle) => {
    if (playingVoiceId === voice.id) {
        cancelSpeech();
        setPlayingVoiceId(null);
        return;
    }

    setAiError(null);
    setPlayingVoiceId(voice.id);
    try {
        await speak("Hello, you can select my voice for your quiz.", voice.id);
    } catch (err) {
        setAiError(err instanceof Error ? err.message : "Could not play the voice sample.");
    } finally {
        setPlayingVoiceId(null);
    }
  };

  const handleManualUpload = (file: File | null) => {
    if (!file) return;
    if (currentQuestion.media?.url && currentQuestion.media.url.startsWith('blob:')) {
      URL.revokeObjectURL(currentQuestion.media.url);
    }
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    updateQuizItem(currentQuestionIndex, { media: { url, type } });
    setMediaError(null);
    setMediaUrlInput('');
  };

  const handleUrlPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
      const url = e.clipboardData.getData('text').trim();
      if (!url) return;
      setMediaUrlInput(url);
      await processUrl(url);
  };

  const processUrl = async (url: string) => {
      if (!url) return;
      setMediaError(null);
      setIsMediaLoading(true);
      try {
          const { blobUrl, type } = await loadMediaFromUrl(url);
          updateQuizItem(currentQuestionIndex, { media: { url: blobUrl, type } });
          setMediaUrlInput('');
      } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error occurred";
          setMediaError(message);
      } finally {
          setIsMediaLoading(false);
      }
  };
  
  const handleGenerateImage = async () => {
      setIsGeneratingImage(true);
      setMediaError(null);
      try {
          const imageUrl = await generateBackgroundImage(editedQuestion, '16:9');
          updateQuizItem(currentQuestionIndex, { media: { url: imageUrl, type: 'image' } });
      } catch (err) {
          setMediaError(err instanceof Error ? err.message : "Failed to generate image");
      } finally {
          setIsGeneratingImage(false);
      }
  };
  
  const handleRewriteScript = async () => {
      if(selectedPersona === 'default') return;
      setIsRewriting(true);
      try {
          const personaName = PERSONAS.find(p => p.id === selectedPersona)?.name || "Neutral";
          const newQuestionText = await rewriteTextWithPersona(editedQuestion, personaName);
          setEditedQuestion(newQuestionText);
      } catch(err) {
          setAiError("Failed to rewrite script.");
      } finally {
          setIsRewriting(false);
      }
  };

  const handleGenerateFunFact = async () => {
      if (!currentQuestion || currentQuestion.correctAnswerIndex === null) return;
      setIsGeneratingFunFact(true);
      try {
          const answerText = editedOptions[currentQuestion.correctAnswerIndex];
          const fact = await generateFunFact(editedQuestion, answerText);
          setEditedExplanation(fact || `The answer is ${answerText}.`);
      } catch (err) {
          console.error("Fun fact error", err);
      } finally {
          setIsGeneratingFunFact(false);
      }
  };

  const handleRemoveMedia = () => {
    if (currentQuestion.media?.url && currentQuestion.media.url.startsWith('blob:')) {
      URL.revokeObjectURL(currentQuestion.media.url);
    }
    updateQuizItem(currentQuestionIndex, { media: null });
    setMediaError(null);
  };

  const narrationLines = () => {
    const lines: string[] = [];
    lines.push(isEmojiQuestion ? "Guess the meaning of these emojis!" : editedQuestion);
    if (includeAnswerVoiceover && !isThisOrThat && currentQuestion?.correctAnswerIndex !== null && currentQuestion) {
      const correctText = editedOptions[currentQuestion.correctAnswerIndex as number];
      lines.push(editedExplanation || `The correct answer is: ${correctText}`);
    }
    return lines;
  };

  // Claude has no text-to-speech endpoint, so it writes the script and the
  // browser reads it back so you can rehearse before recording.
  const handlePreviewNarration = async () => {
    setAiError(null);
    setIsPreviewingVoice(true);
    try {
      for (const line of narrationLines()) {
        await speak(line, selectedVoice);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  const handlePolishScript = async () => {
    setAiError(null);
    setIsPolishingScript(true);
    try {
      const spoken = await generateVoiceoverScript(editedQuestion, 'question');
      setEditedQuestion(spoken);
    } catch (err) {
      setAiError(`Could not polish the script: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsPolishingScript(false);
    }
  };

  const saveAndGo = (navigationFunc: () => void) => {
    updateQuizItem(currentQuestionIndex, { question: editedQuestion, options: editedOptions, explanation: editedExplanation });
    navigationFunc();
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Record Voiceovers / Edit</h2>
        <span className="py-1 px-3 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">Q {currentQuestionIndex + 1}/{quizData.length}</span>
      </div>
      {currentQuestion && (
        <div className="p-5 bg-gray-950 border border-gray-700 rounded-lg space-y-4">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="question-edit" className="block text-base font-medium text-gray-400">Question Script:</label>
            <div className="flex items-center gap-2">
                <select 
                    value={selectedPersona} 
                    onChange={(e) => setSelectedPersona(e.target.value)}
                    className="text-xs bg-gray-800 text-gray-300 rounded px-2 py-1 border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                    {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button 
                    onClick={handleRewriteScript} 
                    disabled={isRewriting || selectedPersona === 'default'}
                    className="text-xs flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                   {isRewriting ? <Loader2 size={12} className="animate-spin"/> : <PenTool size={12} />} Rewrite
                </button>
            </div>
          </div>
          <textarea id="question-edit" value={editedQuestion} onChange={(e) => setEditedQuestion(e.target.value)} rows={isEmojiQuestion ? 1 : 3} className={`w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${isEmojiQuestion ? 'text-4xl text-center' : 'text-xl'}`} />
          <hr className="border-gray-700" />
          <p className="text-base font-medium text-gray-400">Options:</p>
          <ul className="space-y-3">
            {editedOptions.map((option, index) => (
              <li key={index} className="flex items-center space-x-3">
                {(currentQuestion.quizType !== "True/False" && !isThisOrThat) && (
                  <span className={`font-mono font-bold flex-shrink-0 ${index === currentQuestion.correctAnswerIndex ? 'text-green-400' : 'text-blue-400'}`}>{String.fromCharCode(65 + index)}:</span>
                )}
                <input type="text" value={option} onChange={(e) => { const newOptions = [...editedOptions]; newOptions[index] = e.target.value; setEditedOptions(newOptions); }} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none flex-1" />
                {(index === currentQuestion.correctAnswerIndex && !isThisOrThat) && (<Check size={20} className="text-green-400 ml-2 flex-shrink-0" />)}
              </li>
            ))}
          </ul>
          <hr className="border-gray-700" />
          
          {!isThisOrThat && (
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <label htmlFor="explanation-edit" className="block text-base font-medium text-gray-400">Answer Explanation:</label>
                      <button 
                          onClick={handleGenerateFunFact} 
                          disabled={isGeneratingFunFact}
                          className="text-xs flex items-center gap-1 bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                         {isGeneratingFunFact ? <Loader2 size={12} className="animate-spin"/> : <Lightbulb size={12} />} AI Fun Fact
                      </button>
                  </div>
                  <textarea 
                      id="explanation-edit" 
                      value={editedExplanation || ''} 
                      onChange={(e) => setEditedExplanation(e.target.value)} 
                      placeholder="Explain the answer..."
                      rows={2} 
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" 
                  />
              </div>
          )}
          
          <hr className="border-gray-700" />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-base font-medium text-gray-400">
                    <Image size={18} />
                    <span>Visual Media (Optional)</span>
                </label>
                {!currentQuestion.media && (
                    <button 
                        onClick={handleGenerateImage} 
                        disabled={isGeneratingImage}
                        className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                    >
                        {isGeneratingImage ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                        AI Generate Image
                    </button>
                )}
            </div>
            {currentQuestion.media ? (
              <div className="relative group w-full max-w-[280px] aspect-[16/9] rounded-lg overflow-hidden border-2 border-blue-500 mx-auto">
                {currentQuestion.media.type === 'image' ? (
                  <img src={currentQuestion.media.url} alt="Question media preview" className="w-full h-full object-cover" />
                ) : (
                  <video src={currentQuestion.media.url} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                )}
                <button onClick={handleRemoveMedia} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Remove media">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                    <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Paste image/video URL to auto-load"
                        value={mediaUrlInput}
                        onPaste={handleUrlPaste}
                        onChange={(e) => setMediaUrlInput(e.target.value)}
                        onBlur={() => processUrl(mediaUrlInput)}
                        disabled={isMediaLoading}
                        className="w-full p-2 pl-9 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                    />
                    {isMediaLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                </div>

                {mediaError && (
                    <p className="text-xs text-red-400 text-center">{mediaError}</p>
                )}

                <div className="flex items-center gap-2">
                    <hr className="flex-1 border-gray-600" />
                    <span className="text-gray-500 text-xs font-semibold">OR</span>
                    <hr className="flex-1 border-gray-600" />
                </div>
                <label htmlFor="media-upload" className="relative block border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer">
                    <input type="file" id="media-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,video/mp4,video/webm" onChange={(e) => handleManualUpload(e.target.files?.[0] || null)} />
                    <div className="flex flex-col items-center justify-center space-y-1">
                        <UploadCloud size={24} className="text-gray-500" />
                        <p className="text-gray-400 text-sm font-semibold">Upload File</p>
                        <p className="text-xs text-gray-500">Guaranteed to work</p>
                    </div>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
      {previewAudioURL ? (
        <div className="flex items-center h-16 bg-gray-800 rounded-lg p-2 gap-2">
          <audio src={previewAudioURL} controls className="flex-1 h-12" />
          <button onClick={handleClearRecording} className="w-12 h-12 bg-gray-700 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors">
            <X size={24} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <VoiceRecorder key={currentQuestionIndex} onRecordingComplete={(blob, err) => handleRecordingComplete(blob, null)} accentColor="bg-blue-600" />
          <div className="flex items-center gap-4">
            <hr className="flex-1 border-gray-700" /><span className="text-gray-500 text-sm font-semibold">OR</span><hr className="flex-1 border-gray-700" />
          </div>
          
          <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Preview voice style</label>
              <p className="text-xs text-gray-500">
                Claude writes the script; your browser reads it back so you can rehearse. Record the take above to put it in the video.
              </p>
              <div className="grid grid-cols-2 gap-3">
                  {VOICE_STYLES.map((voice) => {
                      const nameParts = voice.name.split(' (', 2);
                      const mainName = nameParts[0];
                      const description = nameParts[1]?.replace(')', '');

                      return (
                          <div
                              key={voice.id}
                              onClick={() => setSelectedVoice(voice.id)}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedVoice === voice.id ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                          >
                              <div className="flex-1 pr-2">
                                  <p className="font-semibold text-white text-sm">{mainName}</p>
                                  {description && <p className="text-xs text-gray-400">{description}</p>}
                              </div>

                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaySample(voice);
                                  }}
                                  disabled={playingVoiceId !== null && playingVoiceId !== voice.id}
                                  className="p-2 rounded-full text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  aria-label={`Play sample for ${voice.name}`}
                              >
                                  {playingVoiceId === voice.id ? (
                                      <Pause size={18} className="text-purple-400"/>
                                  ) : (
                                      <Play size={18} />
                                  )}
                              </button>
                          </div>
                      )
                  })}
              </div>
          </div>

          {!isThisOrThat && (
            <div className="flex items-center justify-between py-2">
              <label htmlFor="include-answer-vo" className="text-sm font-medium text-gray-300">Read the answer in the preview too?</label>
              <button id="include-answer-vo" onClick={() => setIncludeAnswerVoiceover(!includeAnswerVoiceover)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${includeAnswerVoiceover ? 'bg-green-500' : 'bg-gray-600'}`}>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${includeAnswerVoiceover ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handlePolishScript} disabled={isPolishingScript} className="flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-70 transition-colors">
              {isPolishingScript ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
              <span>{isPolishingScript ? "Polishing..." : "Polish script"}</span>
            </button>
            <button onClick={handlePreviewNarration} disabled={isPreviewingVoice || !isSpeechSupported()} className="flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-70 transition-colors">
              {isPreviewingVoice ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              <span>{isPreviewingVoice ? "Reading..." : "Hear it read"}</span>
            </button>
          </div>
        </div>
      )}
      {aiError && (<div className="flex items-center gap-2 text-red-400 p-3 bg-red-900/20 border border-red-800 rounded-lg"><span className="text-sm">{aiError}</span></div>)}
      <div className="flex justify-between items-center pt-4">
        <button onClick={() => saveAndGo(goToPrevQuestion)} disabled={!canGoPrev} className="flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 transition-colors">
          <ArrowLeft size={18} /><span>Prev</span>
        </button>
        {currentQuestionIndex === quizData.length - 1 ? (
          <button onClick={() => saveAndGo(() => setStep('rendering'))} disabled={!allAudioRecorded} className="flex items-center justify-center gap-2 py-2 px-6 rounded-full font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 transition-colors">
            <FileVideo size={18} /><span>Finish & Render</span>
          </button>
        ) : (
          <button onClick={() => saveAndGo(goToNextQuestion)} disabled={!canGoNext} className="flex items-center justify-center gap-2 py-2 px-4 rounded-full font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 transition-colors">
            <span>Next</span><ArrowRight size={18} />
          </button>
        )}
      </div>
      {!allAudioRecorded && (<p className="text-center text-sm text-yellow-400 mt-2">Please add audio for all questions to continue.</p>)}
    </div>
  );
}

export default RecordingStep;
