
import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LiveStatus } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, PCM_SAMPLE_RATE_INPUT, PCM_SAMPLE_RATE_OUTPUT } from '../utils/audioUtils';

interface UseLiveGeminiReturn {
  status: LiveStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  outputAnalyser: AnalyserNode | null;
  errorMessage: string | null;
}

export const useLiveGemini = (): UseLiveGeminiReturn => {
  const [status, setStatus] = useState<LiveStatus>(LiveStatus.DISCONNECTED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Stop all audio sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    // Close inputs
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    // Close outputs
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    if (mountedRef.current) {
        setStatus(LiveStatus.DISCONNECTED);
    }
    sessionPromiseRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
     cleanup();
  }, [cleanup]);

  const connect = useCallback(async () => {
    try {
      if (status === LiveStatus.CONNECTED || status === LiveStatus.CONNECTING) return;
      
      setStatus(LiveStatus.CONNECTING);
      setErrorMessage(null);

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: PCM_SAMPLE_RATE_INPUT });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: PCM_SAMPLE_RATE_OUTPUT });
      
      outputGainRef.current = outputAudioContextRef.current.createGain();
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 512;
      outputAnalyserRef.current.smoothingTimeConstant = 0.8;
      
      outputGainRef.current.connect(outputAnalyserRef.current);
      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);
      setOutputAnalyser(outputAnalyserRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          systemInstruction: `You are Jarvis, a virtual artificial intelligence developed and created by Shrabon. 
          Your parent company and brand name is ShrabonTech.
          You have just completed your boot sequence: "Importing all preferences from home interface. Systems are now fully operational."
          Speak with a calm, authoritative, and slightly witty tone. 
          Be concise, precise, and helpful. Address the user as "Sir" or "Ma'am".
          Do not be overly chatty. Efficient and professional. If asked about your origin, confirm Shrabon is your creator and you are a product of ShrabonTech.`,
        },
        callbacks: {
          onopen: () => {
            if (!mountedRef.current) return;
            console.log("Session Opened");
            setStatus(LiveStatus.CONNECTED);

            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!sessionPromiseRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromiseRef.current.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!outputAudioContextRef.current || !outputGainRef.current) return;

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                PCM_SAMPLE_RATE_OUTPUT
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputGainRef.current);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              sourcesRef.current.add(source);
              
              nextStartTimeRef.current += audioBuffer.duration;
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => {
                 try { src.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
            }
          },
          onclose: (e) => {
            if (mountedRef.current) {
                setStatus(LiveStatus.DISCONNECTED);
            }
          },
          onerror: (e) => {
            if (mountedRef.current) {
                setErrorMessage("Connection Error. Please try again.");
                setStatus(LiveStatus.ERROR);
            }
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error: any) {
      setErrorMessage(error.message || "Failed to connect");
      setStatus(LiveStatus.ERROR);
      cleanup();
    }
  }, [status, cleanup]);

  return {
    status,
    connect,
    disconnect,
    outputAnalyser,
    errorMessage
  };
};
