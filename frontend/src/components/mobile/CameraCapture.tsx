'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, Download, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture?: (file: File) => void;
  onClose?: () => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  quality?: number; // 0.1 to 1.0
  facingMode?: 'user' | 'environment';
}

export function CameraCapture({
  onCapture,
  onClose,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize = 5 * 1024 * 1024, // 5MB
  quality = 0.8,
  facingMode = 'environment'
}: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFacingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        setCapturedImage(dataUrl);
        
        // Create file from blob
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        // Check file size
        if (file.size > maxFileSize) {
          setError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${maxFileSize / 1024 / 1024}MB)`);
          return;
        }

        onCapture?.(file);
      }
    }, 'image/jpeg', quality);
  }, [quality, maxFileSize, onCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
  }, []);

  const switchCamera = useCallback(() => {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(newFacingMode);
    
    if (stream) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [currentFacingMode, stream, stopCamera, startCamera]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`File type ${file.type} not supported. Please use: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Check file size
    if (file.size > maxFileSize) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${maxFileSize / 1024 / 1024}MB)`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onCapture?.(file);
  }, [acceptedTypes, maxFileSize, onCapture]);

  const openCamera = () => {
    setIsOpen(true);
    startCamera();
  };

  const closeCamera = () => {
    stopCamera();
    setIsOpen(false);
    setCapturedImage(null);
    setError(null);
    onClose?.();
  };

  const downloadImage = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.download = `camera-capture-${Date.now()}.jpg`;
    link.href = capturedImage;
    link.click();
  };

  // Check if camera is supported
  const isCameraSupported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  if (!isCameraSupported) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Camera className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">Camera Not Available</p>
              <p className="text-sm text-gray-500">Your device doesn't support camera access</p>
            </div>
          </div>
        </Card>
        
        <div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload from Gallery
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={openCamera}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 text-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeCamera}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="font-medium">
            {capturedImage ? 'Photo Preview' : 'Camera'}
          </div>
          
          {!capturedImage && stream && (
            <Button
              variant="ghost"
              size="sm"
              onClick={switchCamera}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Camera/Preview Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {isLoading && (
            <div className="flex items-center space-x-2 text-white">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Starting camera...</span>
            </div>
          )}

          {error && (
            <div className="text-center text-white p-4">
              <p className="mb-4">{error}</p>
              <div className="space-x-4">
                <Button
                  variant="outline"
                  onClick={startCamera}
                  className="text-white border-white hover:bg-white/20"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white border-white hover:bg-white/20"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>
          )}

          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            stream && !isLoading && !error && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/80">
          {capturedImage ? (
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="text-white border-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadImage}
                className="text-white border-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          ) : (
            stream && !isLoading && !error && (
              <div className="flex items-center justify-center">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-white text-black hover:bg-gray-100 p-0"
                >
                  <Camera className="w-6 h-6" />
                </Button>
              </div>
            )
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

// Document scanner component
export function DocumentScanner({
  onScan,
  onClose
}: {
  onScan?: (file: File) => void;
  onClose?: () => void;
}) {
  return (
    <CameraCapture
      onCapture={onScan}
      onClose={onClose}
      acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
      maxFileSize={10 * 1024 * 1024} // 10MB for documents
      quality={0.9}
    />
  );
}

// Quick capture button for mobile
export function QuickCaptureButton({
  onCapture,
  variant = 'photo'
}: {
  onCapture?: (file: File) => void;
  variant?: 'photo' | 'document';
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        {variant === 'document' ? (
          <>
            <FileText className="w-4 h-4" />
            <span>Scan</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            <span>Photo</span>
          </>
        )}
      </Button>

      {isOpen && (
        variant === 'document' ? (
          <DocumentScanner
            onScan={(file) => {
              onCapture?.(file);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        ) : (
          <CameraCapture
            onCapture={(file) => {
              onCapture?.(file);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        )
      )}
    </>
  );
}