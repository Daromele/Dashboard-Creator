
import React, { useState, useEffect } from 'react';
import { Check, Download, RefreshCcw, Loader2, Eye } from 'lucide-react';
import { generateHashtags } from '../services/claudeService';
import { GroundingChunk } from '../types';

interface DownloadStepProps {
  finalVideoURL: Blob | null;
  topic: string;
  quizCategory: string;
  quizSources: GroundingChunk[];
  startOver: () => void;
  selectedTheme: string;
  selectedQuizType: string;
  aspectRatio: '9:16' | '16:9';
}

const DownloadStep: React.FC<DownloadStepProps> = ({ finalVideoURL, topic, quizCategory, quizSources, startOver, selectedTheme, selectedQuizType, aspectRatio }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('quiz-video.webm');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    if (finalVideoURL) {
      url = URL.createObjectURL(finalVideoURL);
      setDownloadUrl(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [finalVideoURL]);

  useEffect(() => {
    if (!topic) return;

    const generateAndSetData = async () => {
      setIsGeneratingTags(true);
      const defaultTags = ['#quiz', '#quizchallenge', '#trivia'];
      if (selectedTheme === 'halloween') defaultTags.push('#halloween', '#spookyquiz');
      if (selectedTheme === 'festive') defaultTags.push('#christmas', '#holidayquiz');
      if (selectedQuizType === 'Emoji') defaultTags.push('#emojichallenge', '#guesstheemoji');

      try {
        const generatedTags = await generateHashtags(topic, selectedQuizType);
        const allTags = [...new Set([...defaultTags, ...generatedTags.map(t => `#${t.replace(/#/g, '')}`)])];
        setHashtags(allTags);
      } catch (error) {
        console.error("Failed to generate hashtags, using defaults.", error);
        setHashtags(defaultTags);
      } finally {
        setIsGeneratingTags(false);
      }
    };

    generateAndSetData();
  }, [topic, selectedTheme, selectedQuizType]);
  
  useEffect(() => {
    if (topic) {
      // Remove emojis and characters that are invalid in filenames, replacing them with nothing or a space.
      const cleanFileName = topic
        .replace(/[/\\?%*:|"<>]/g, '') // Remove invalid file characters.
        // A more comprehensive regex to remove most common emojis and symbols.
        .replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ') // Collapse multiple spaces into one.
        .trim();
      setFileName(`${cleanFileName}.webm`);
    }
  }, [topic]);


  const isPortrait = aspectRatio === '9:16';

  return (
    <div className="w-full text-center space-y-6 p-4 animate-fade-in">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check size={36} className="text-white" />
      </div>
      <h2 className="text-3xl font-bold text-green-400">Render Complete!</h2>
      <p className="text-gray-300">Your quiz video is ready to download and share.</p>
      {downloadUrl ? (
        <div className="space-y-4">
          <div className="relative inline-block w-full">
              <video src={downloadUrl} controls className={`w-full rounded-lg border border-gray-700 ${isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-black`} />
              {showOverlay && isPortrait && (
                  <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                      {/* Mock TikTok/Reels UI Safe Zones */}
                      <div className="absolute right-2 bottom-20 flex flex-col gap-4 items-center opacity-60">
                          <div className="w-10 h-10 rounded-full bg-gray-200/50"></div>
                          <div className="w-8 h-8 bg-gray-200/50"></div>
                          <div className="w-8 h-8 bg-gray-200/50"></div>
                      </div>
                      <div className="absolute bottom-4 left-4 w-2/3 h-16 space-y-2 opacity-60">
                           <div className="w-32 h-4 bg-gray-200/50 rounded"></div>
                           <div className="w-48 h-4 bg-gray-200/50 rounded"></div>
                      </div>
                      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
              )}
          </div>
          
          {isPortrait && (
             <div className="flex justify-center">
                 <button onClick={() => setShowOverlay(!showOverlay)} className="text-sm flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                     <Eye size={16} />
                     <span>{showOverlay ? "Hide" : "Show"} Social Safe Zones</span>
                 </button>
             </div>
          )}

          <a href={downloadUrl} download={fileName} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-white bg-green-600 hover:bg-green-700 transition-colors">
            <Download size={20} />
            <span>Download Video (.webm)</span>
          </a>

          <div className="text-left bg-gray-800 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-gray-300">Suggested Hashtags:</h3>
            {isGeneratingTags ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span>Generating relevant tags...</span>
              </div>
            ) : (
              <p className="text-cyan-400 text-sm font-mono break-words">
                {hashtags.join(' ')}
              </p>
            )}
          </div>
          
          {quizSources && quizSources.length > 0 && (
            <div className="text-left bg-gray-800 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-300">Sources:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {quizSources.map((source, index) => source.web && (
                  <li key={index}>
                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" title={source.web.title}>
                      {source.web.title || source.web.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-400 pt-2 break-all">
            Filename: <code className="bg-gray-800 p-1 rounded-md">{fileName}</code>
          </p>
        </div>
      ) : (
        <div className="p-6 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400">No video URL found. An error may have occurred.</p>
        </div>
      )}
      <button onClick={startOver} className="flex items-center justify-center gap-2 py-3 px-6 rounded-full font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors mx-auto">
        <RefreshCcw size={18} />
        <span>Start New Project</span>
      </button>
    </div>
  );
}

export default DownloadStep;
