import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCcw, Image as ImageIcon, Download, Trash2, X, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
export type FilterType = 'none' | 'grayscale' | 'sepia' | 'invert' | 'contrast' | 'brightness' | 'blur' | 'saturate' | 'hue-rotate';

export interface Filter {
  id: FilterType;
  name: string;
  css: string;
}

export const FILTERS: Filter[] = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
  { id: 'contrast', name: 'Punchy', css: 'contrast(150%)' },
  { id: 'brightness', name: 'Bright', css: 'brightness(130%)' },
  { id: 'saturate', name: 'Vivid', css: 'saturate(200%)' },
  { id: 'hue-rotate', name: 'Alien', css: 'hue-rotate(90deg)' },
  { id: 'invert', name: 'Negative', css: 'invert(100%)' },
];

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState<Filter>(FILTERS[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Initialize Camera
  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure permissions are granted.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      capture();
      setCountdown(null);
    }
  }, [countdown]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    // Apply filter
    if (activeFilter.id !== 'none') {
      context.filter = activeFilter.css;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    context.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotos(prev => [dataUrl, ...prev]);
  };

  const downloadPhoto = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `booth-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sharePhoto = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Photo Booth Capture',
          text: 'Check out my photo!'
        });
      } else {
        // Fallback to download if share not supported
        downloadPhoto(dataUrl);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const deletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col font-sans">
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Stage */}
      <main className="flex-1 relative flex flex-col">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <h1 className="text-xl font-bold tracking-wider uppercase">PhotoBooth</h1>
          <button 
            onClick={() => setShowGallery(!showGallery)}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
          >
            {showGallery ? <X size={24} /> : <ImageIcon size={24} />}
          </button>
        </header>

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6 text-center">
            <div className="max-w-md">
              <p className="text-red-500 mb-4 text-lg">{error}</p>
              <button 
                onClick={startCamera}
                className="px-6 py-2 bg-white text-black rounded-full font-medium"
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}

        {/* Camera View */}
        <div className="relative flex-1 bg-neutral-900 overflow-hidden">
          {/* Flash Overlay */}
          <AnimatePresence>
            {flash && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-30 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Countdown Overlay */}
          <AnimatePresence>
            {countdown !== null && countdown > 0 && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                key={countdown}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <span className="text-9xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-all duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            style={{ filter: activeFilter.css }}
          />

          {/* Controls Overlay */}
          {!showGallery && (
            <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              {/* Filter Scroller */}
              <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-4 px-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter)}
                      className={`flex flex-col items-center gap-2 min-w-[70px] transition-transform ${activeFilter.id === filter.id ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <div 
                        className={`w-16 h-16 rounded-full border-2 overflow-hidden ${activeFilter.id === filter.id ? 'border-yellow-400' : 'border-white/30'}`}
                      >
                        <div 
                          className="w-full h-full bg-neutral-500"
                          style={{ 
                            backgroundImage: 'url(https://picsum.photos/id/64/100/100)',
                            backgroundSize: 'cover',
                            filter: filter.css 
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Actions */}
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={switchCamera}
                  className="p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                >
                  <RefreshCcw size={24} />
                </button>

                <button 
                  onClick={takePhoto}
                  disabled={countdown !== null}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/30 transition-all active:scale-90"
                >
                  <div className="w-16 h-16 bg-white rounded-full" />
                </button>

                <div className="w-14 h-14 relative">
                  {photos.length > 0 && (
                    <button 
                      onClick={() => setShowGallery(true)}
                      className="w-full h-full rounded-lg overflow-hidden border-2 border-white/50 hover:border-white transition-all"
                    >
                      <img src={photos[0]} className="w-full h-full object-cover" alt="Latest" />
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                        {photos.length}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Overlay */}
        <AnimatePresence>
          {showGallery && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-40 bg-black flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10">
                <h2 className="text-2xl font-bold">Gallery</h2>
                <button 
                  onClick={() => setShowGallery(false)}
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {photos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/50">
                    <ImageIcon size={48} className="mb-4 opacity-50" />
                    <p>No photos yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group rounded-xl overflow-hidden bg-neutral-900 aspect-[3/4]">
                        <img src={photo} alt={`Capture ${index}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button 
                            onClick={() => sharePhoto(photo)}
                            className="p-3 rounded-full bg-blue-500 text-white hover:scale-110 transition-transform"
                            title="Share"
                          >
                            <Share2 size={20} />
                          </button>
                          <button 
                            onClick={() => downloadPhoto(photo)}
                            className="p-3 rounded-full bg-white text-black hover:scale-110 transition-transform"
                            title="Download"
                          >
                            <Download size={20} />
                          </button>
                          <button 
                            onClick={() => deletePhoto(index)}
                            className="p-3 rounded-full bg-red-500 text-white hover:scale-110 transition-transform"
                            title="Delete"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
