
import React from 'react';
import { useLiveGemini } from './hooks/useLiveGemini';
import { ArcReactor } from './components/ArcReactor';
import { LiveStatus } from './types';
import { Activity, Mic, MicOff, Power } from 'lucide-react';

const App: React.FC = () => {
  const { status, connect, disconnect, outputAnalyser, errorMessage } = useLiveGemini();

  const handleToggleConnection = () => {
    if (status === LiveStatus.CONNECTED || status === LiveStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-500 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 border border-cyan-800 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 border border-cyan-900 rounded-full opacity-50"></div>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-900 to-transparent"></div>
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-900 to-transparent"></div>
      </div>

      {/* Header */}
      <div className="z-10 text-center mb-8">
        <h1 className="text-5xl font-bold tracking-widest jarvis-text-glow mb-2">JARVIS</h1>
        <p className="text-cyan-300 text-sm tracking-[0.3em] uppercase opacity-80">System Online • Voice Module Active</p>
      </div>

      {/* Main Interface */}
      <div className="z-10 relative group">
        <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>
        <ArcReactor analyser={outputAnalyser} status={status} />
      </div>

      {/* Controls */}
      <div className="z-10 mt-12 flex flex-col items-center gap-6">
        
        {/* Status Indicator */}
        <div className="flex items-center gap-3 px-6 py-2 border border-cyan-900/50 bg-cyan-950/20 rounded-full backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${status === LiveStatus.CONNECTED ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : status === LiveStatus.ERROR ? 'bg-red-500' : 'bg-cyan-900'}`}></div>
          <span className="text-xs tracking-widest uppercase text-cyan-100">
            {status === LiveStatus.CONNECTED ? 'Systems Online' : 
             status === LiveStatus.CONNECTING ? 'Importing Preferences...' : 
             status === LiveStatus.ERROR ? 'System Failure' : 'Standby Mode'}
          </span>
        </div>

        {errorMessage && (
           <div className="text-red-400 text-sm mt-2 max-w-md text-center bg-red-900/20 p-2 rounded border border-red-900/50">
             Warning: {errorMessage}
           </div>
        )}

        {/* Main Button */}
        <button
          onClick={handleToggleConnection}
          className={`
            relative group px-8 py-4 rounded-full font-bold tracking-wider transition-all duration-300
            flex items-center gap-3 border
            ${status === LiveStatus.CONNECTED 
              ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
              : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'
            }
          `}
        >
          {status === LiveStatus.CONNECTED ? (
             <>
               <Power className="w-5 h-5" />
               <span>DEACTIVATE</span>
             </>
          ) : (
             <>
               <Mic className="w-5 h-5" />
               <span>INITIATE PROTOCOL</span>
             </>
          )}
        </button>
      </div>

      {/* Footer Data */}
      <div className="absolute bottom-6 left-6 z-10 hidden md:block">
        <div className="flex flex-col gap-1 text-[10px] text-cyan-800 font-mono">
          <div className="flex gap-4">
             <span>CPU: 34%</span>
             <span>MEM: 12TB</span>
             <span>NET: SECURE</span>
          </div>
          <div className="h-[2px] w-24 bg-cyan-900/50"></div>
          <div>LOC: {window.navigator.language}</div>
        </div>
      </div>

       <div className="absolute bottom-6 right-6 z-10 hidden md:block">
        <div className="text-[10px] text-cyan-800 font-mono text-right">
          <div>SH-MK.1 BUILD 2025.01</div>
          <div>SHRABONTECH INDUSTRIES</div>
          <div className="text-cyan-600 mt-1">CREATED BY SHRABON</div>
        </div>
      </div>

    </div>
  );
};

export default App;
