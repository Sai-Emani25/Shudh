
import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CameraScannerProps {
  onCapture: (images: string[]) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const applyFocus = useCallback(async (manual: boolean = false) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || !track.getCapabilities || !track.applyConstraints) return;

    try {
      const capabilities = track.getCapabilities() as any;
      const constraints: any = { advanced: [] };

      // Prefer continuous focus for most environmental scans
      if (capabilities.focusMode?.includes('continuous')) {
        constraints.advanced.push({ focusMode: 'continuous' });
      } else if (capabilities.focusMode?.includes('single-shot')) {
        // Fallback to single-shot for devices that don't support continuous
        constraints.advanced.push({ focusMode: 'single-shot' });
      }

      if (constraints.advanced.length > 0) {
        setIsFocusing(true);
        await track.applyConstraints(constraints);
        // Brief delay to simulate focus locking visually
        setTimeout(() => setIsFocusing(false), 1000);
      }
    } catch (err) {
      console.warn("Camera hardware controls limited:", err);
      setIsFocusing(false);
    }
  }, [stream]);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Unable to access camera. Please check permissions and ensure no other app is using it.");
        onClose();
      }
    }
    startCamera();
    return () => {
      // Ensure cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Periodic automatic focus refresh to ensure the best possible clarity
  useEffect(() => {
    if (stream) {
      applyFocus(); // Initial focus
      const interval = setInterval(() => {
        applyFocus();
      }, 5000); // Re-focus every 5 seconds
      return () => clearInterval(interval);
    }
  }, [stream, applyFocus]);

  const handleTapToFocus = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as any).touches[0].clientX;
      clientY = (e as any).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    setFocusPoint({ x: clientX, y: clientY });
    applyFocus(true);
    
    setTimeout(() => setFocusPoint(null), 800);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && images.length < 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use the actual video dimensions for highest quality capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.95);
        setImages([...images, data]);
        
        // Haptic-like feedback via visual flash
        const flash = document.createElement('div');
        flash.className = 'fixed inset-0 bg-white z-[120] pointer-events-none animate-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleFinalize = () => {
    if (images.length > 0) {
      stopStream(); // Close camera tracks before moving to analysis
      onCapture(images);
    }
  };

  const handleCancel = () => {
    stopStream(); // Close camera tracks before exiting camera UI
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col items-center select-none">
      <div className="relative w-full h-full flex flex-col max-w-lg mx-auto">
        {/* Header Controls */}
        <div className="p-4 flex justify-between items-center text-white z-20">
          <button onClick={handleCancel} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center transition-all active:scale-90">
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1">
              {isFocusing ? 'Auto-Focusing' : `Scan Labels ${images.length}/3`}
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i < images.length ? 'w-4 bg-emerald-500' : 'w-2 bg-white/20'}`} />
              ))}
            </div>
          </div>
          <div className="w-10 h-10"></div>
        </div>

        {/* Viewfinder */}
        <div 
          className="flex-1 relative overflow-hidden bg-slate-900 cursor-crosshair group"
          onClick={handleTapToFocus}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Focus Reticle */}
          {focusPoint && (
            <div 
              className="absolute pointer-events-none w-20 h-20 border border-emerald-400 rounded-full flex items-center justify-center animate-ping"
              style={{ left: focusPoint.x - 40, top: focusPoint.y - 40 }}
            >
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            </div>
          )}

          {/* Guidelines & Scanning Effect */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
            <div className="w-full aspect-[3/4] border border-white/10 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-emerald-500 rounded-tl-xl -mt-[1px] -ml-[1px]"></div>
              <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-emerald-500 rounded-tr-xl -mt-[1px] -mr-[1px]"></div>
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-emerald-500 rounded-bl-xl -mb-[1px] -ml-[1px]"></div>
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-emerald-500 rounded-br-xl -mb-[1px] -mr-[1px]"></div>
              
              {/* Animated Scan Line */}
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-scan-y"></div>
            </div>
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            Center the ingredient list within the frame
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="flex gap-3 justify-center mb-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`relative w-16 h-16 rounded-xl border transition-all duration-300 ${images[i] ? 'border-emerald-500/50 scale-100 shadow-lg shadow-emerald-500/10' : 'border-white/5 scale-95 bg-white/5'} overflow-hidden`}>
                {images[i] ? (
                  <>
                    <img src={images[i]} className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-0 right-0 w-6 h-6 bg-rose-600/90 backdrop-blur-sm rounded-bl-xl flex items-center justify-center text-[10px] text-white"
                    >
                      <i className="fa-solid fa-x"></i>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <i className="fa-solid fa-image text-lg"></i>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex justify-center items-center">
              <button 
                onClick={takePhoto}
                disabled={images.length >= 3}
                className="w-20 h-20 rounded-full border-2 border-white/50 p-1 flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <div className="w-14 h-14 border-2 border-black/5 rounded-full"></div>
                </div>
              </button>
            </div>
            
            <button 
              onClick={handleFinalize}
              disabled={images.length === 0}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 ${
                images.length > 0 
                  ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 active:translate-y-1' 
                  : 'bg-white/5 text-white/20'
              }`}
            >
              Analyze Ingredients <i className="fa-solid fa-arrow-right-long opacity-50"></i>
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-y {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
        .animate-scan-y {
          animation: scan-y 3s linear infinite;
        }
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.2s ease-out forwards;
        }
      `}} />
    </div>
  );
};
