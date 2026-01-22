import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps, LiveStatus } from '../types';

export const ArcReactor: React.FC<AudioVisualizerProps> = ({ analyser, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;

      ctx.clearRect(0, 0, width, height);

      // Base Glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#06b6d4"; // cyan-500
      
      // Draw Static Outer Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
      ctx.lineWidth = 10;
      ctx.stroke();

      // Draw Dynamic Inner Rings based on Audio
      if (status === LiveStatus.CONNECTED && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume for pulsing effect
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const pulseScale = 1 + (average / 256) * 0.5;

        // Inner Reactor Core (Pulsing)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${0.1 + (average / 256)})`;
        ctx.fill();
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 5;
        ctx.stroke();

        // Frequency Ring
        ctx.beginPath();
        const sliceWidth = (Math.PI * 2) / 60; // 60 segments
        let angle = 0;
        
        for (let i = 0; i < 60; i++) {
           // Sample different parts of the frequency data
           const freqIndex = Math.floor((i / 60) * (bufferLength / 2)); 
           const value = dataArray[freqIndex];
           const barHeight = (value / 255) * 40;
           
           const x1 = centerX + Math.cos(angle) * (radius + 5);
           const y1 = centerY + Math.sin(angle) * (radius + 5);
           const x2 = centerX + Math.cos(angle) * (radius + 15 + barHeight);
           const y2 = centerY + Math.sin(angle) * (radius + 15 + barHeight);
           
           ctx.moveTo(x1, y1);
           ctx.lineTo(x2, y2);
           
           angle += sliceWidth;
        }
        ctx.strokeStyle = "#a5f3fc"; // cyan-200
        ctx.lineWidth = 2;
        ctx.stroke();

      } else {
        // Idle State - Slow breathing
        const time = Date.now() / 1000;
        const breath = (Math.sin(time) + 1) / 2; // 0 to 1
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.1 + breath * 0.1})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + breath * 0.2})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, status]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={600} 
      className="w-full max-w-[400px] h-auto mx-auto"
    />
  );
};
