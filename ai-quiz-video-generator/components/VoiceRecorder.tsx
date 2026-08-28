
import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, AlertTriangle } from 'lucide-react';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob | null, error: string | null) => void;
    accentColor?: string;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, accentColor = "bg-blue-500" }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleStartRecording = async () => {
        setError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Audio recording is not supported by your browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(blob, null);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.onerror = (err) => {
                const recorderError = err as unknown as { error: Error };
                setError(`Recording error: ${recorderError.error.name}`);
                console.error(recorderError.error);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access error:", err);
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') setError('Microphone permission denied.');
                else if (err.name === 'NotFoundError') setError('No microphone found.');
                else setError(`Failed to start recording: ${err.message}`);
            } else {
                 setError('An unknown error occurred while accessing the microphone.');
            }
        }
    };
    
    const handleStopRecording = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    if (!isClient) return <div className="h-24 w-full bg-gray-700 rounded-lg animate-pulse"></div>;

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-center">
                {!isRecording ? (
                    <button onClick={handleStartRecording} className={`w-16 h-16 ${accentColor} text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform`}>
                        <Mic size={32} />
                    </button>
                ) : (
                    <button onClick={handleStopRecording} className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <StopCircle size={32} />
                    </button>
                )}
            </div>
            {isRecording && (<p className="text-center text-red-400 animate-pulse">Recording...</p>)}
            {error && (
                <div className="flex items-center gap-2 text-red-400 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                    <AlertTriangle size={16} />
                    <span className="text-sm">{error}</span>
                </div>
            )}
        </div>
    );
}

export default VoiceRecorder;
