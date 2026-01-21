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

  const applyFocus = useCallback(async (manual: boolean = false) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      const constraints: any = { advanced: [] };

      if (capabilities.focusMode?.includes('continuous')) {
        constraints.advanced.push({ focusMode: 'continuous' });
      } else if (capabilities.focusMode?.includes('manual') && manual) {
        constraints.advanced.push({ focusMode: 'manual' });
      }

      if (constraints.advanced.length > 0) {
        await track.applyConstraints(constraints);
      }
    } catch (err) {
      console.warn("Advanced camera constraints not supported.");
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
        alert("Unable to access camera. Please check permissions.");
        onClose();
      }
    }
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (stream) {
      applyFocus();
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
    
    setTimeout(() => setFocusPoint(null), 500);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && images.length < 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.95);
        setImages([...images, data]);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col items-center">
      <div className="relative w-full h-full flex flex-col max-w-lg mx-auto">
        <div className="p-4 flex justify-between items-center text-white z-20">
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className="text-sm font-black uppercase tracking-widest text-emerald-400">
            Scanning {images.length}/3
          </div>
          <div className="w-10 h-10"></div>
        </div>

        <div 
          className="flex-1 relative overflow-hidden bg-slate-900 cursor-crosshair"
          onClick={handleTapToFocus}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {focusPoint && (
            <div 
              className="absolute pointer-events-none w-16 h-16 border-2 border-emerald-400 rounded-full focus-ring"
              style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
            />
          )}

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
            <div className="w-full aspect-square border-2 border-white/20 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl -mt-1 -ml-1"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl -mt-1 -mr-1"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl -mb-1 -ml-1"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl -mb-1 -mr-1"></div>
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-500/20 blur-sm animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="flex gap-4 justify-center mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative w-20 h-20 rounded-2xl border-2 border-white/10 overflow-hidden bg-white/5">
                {images[i] ? (
                  <>
                    <img src={images[i]} className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-[10px] text-white"
                    >
                      <i className="fa-solid fa-x"></i>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <i className="fa-solid fa-camera"></i>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center">
              <button 
                onClick={takePhoto}
                disabled={images.length >= 3}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 group"
              >
                <div className="w-16 h-16 bg-white rounded-full group-active:scale-95 transition-transform"></div>
              </button>
            </div>
            
            <button 
              onClick={() => images.length > 0 && onCapture(images)}
              disabled={images.length === 0}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                images.length > 0 ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white/10 text-white/30'
              }`}
            >
              Analyze Ingredients
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};