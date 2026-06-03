import React, { useRef, useEffect, useState } from 'react';
import type { QualityReport, LivenessReport } from '../services/biometricService';
import { biometricService } from '../services/biometricService';

interface CameraViewfinderProps {
  onCapture: (video: HTMLVideoElement, detectionResult: any) => void;
  challenge?: 'Blink' | 'Look Left' | 'Look Right' | 'Look Up';
  challengeHistory?: any;
  onLivenessProgress?: (progress: number, passed: boolean) => void;
  qualityReportCallback?: (report: QualityReport) => void;
  isActive: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  onCapture,
  challenge,
  challengeHistory,
  onLivenessProgress,
  qualityReportCallback,
  isActive
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [hasWebcam, setHasWebcam] = useState<boolean>(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [liveness, setLiveness] = useState<LivenessReport | null>(null);

  const lastVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastDetectionRef = useRef<any>(null);
  const [hasDetectedFace, setHasDetectedFace] = useState<boolean>(false);

  // Initialize camera stream
  useEffect(() => {
    if (!isActive) {
      stopCamera();
      setHasDetectedFace(false);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
      setHasDetectedFace(false);
    };
  }, [isActive]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setHasWebcam(true);
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setHasWebcam(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Real-time loop for FaceMesh detection and drawing
  useEffect(() => {
    if (!isActive || !hasWebcam) return;

    let animationFrameId: number;
    let isProcessing = false;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.paused || video.ended || video.videoWidth === 0) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isProcessing) {
        isProcessing = true;
        try {
          // Perform MediaPipe Landmarking
          const detection = await biometricService.detectFace(video);
          
          lastVideoRef.current = video;
          if (detection && detection.faceLandmarks && detection.faceLandmarks.length > 0 && detection.faceLandmarks[0].length > 0) {
            lastDetectionRef.current = detection;
            setHasDetectedFace(true);
          }
          
          if (detection && detection.faceLandmarks && detection.faceLandmarks.length > 0) {
            const landmarks = detection.faceLandmarks[0];

            // 1. Run Quality validation checks
            const qReport = biometricService.validateFaceQuality(video, detection);
            setQuality(qReport);
            if (qualityReportCallback) qualityReportCallback(qReport);

            // 2. Draw real-time landmarks on overlay
            drawFaceMesh(ctx, landmarks, canvas.width, canvas.height, qReport.isValid);

            // 3. Run Liveness evaluation if challenge is provided
            if (challenge && challengeHistory) {
              const liveReport = biometricService.validateLiveness(landmarks, challenge, challengeHistory);
              setLiveness(liveReport);
              
              if (onLivenessProgress) {
                onLivenessProgress(liveReport.progress, liveReport.isPassed);
              }
            }

            // 4. Capture callback if quality criteria are passed
            if (qReport.isValid && (!challenge || (liveness && liveness.isPassed))) {
              onCapture(video, detection);
            }

          } else {
            // No face detected
            setQuality(null);
            setLiveness(null);
            if (qualityReportCallback) {
              qualityReportCallback({
                isValid: false,
                detected: false,
                centered: false,
                sizeOK: false,
                lightingOK: false,
                blurOK: false,
                score: 0,
                details: { brightness: 0, blurScore: 0, centerOffset: 0, faceRatio: 0 },
                errors: ['No face detected. Align your face inside the circle.']
              });
            }
          }
        } catch (e) {
          console.error('Frame processing exception:', e);
        } finally {
          isProcessing = false;
        }
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, hasWebcam, challenge, challengeHistory, onCapture, onLivenessProgress]);

  // MediaPipe FaceMesh draw overlay helper
  const drawFaceMesh = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number,
    isValid: boolean
  ) => {
    // Green mesh if quality is valid, amber if face detected but quality poor
    ctx.fillStyle = isValid ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 152, 0, 0.6)';
    ctx.strokeStyle = isValid ? 'rgba(76, 175, 80, 0.25)' : 'rgba(255, 152, 0, 0.25)';
    ctx.lineWidth = 0.5;

    // Draw mesh dots for select landmarks to reduce layout noise
    // MediaPipe face mesh has 468 landmarks. We sample key landmarks (e.g. eyes, outline, nose bridge).
    for (let i = 0; i < landmarks.length; i += 3) {
      const pt = landmarks[i];
      const x = pt.x * w;
      const y = pt.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw eye circles
    const drawFeaturePath = (indices: number[]) => {
      ctx.beginPath();
      indices.forEach((idx, idxVal) => {
        const pt = landmarks[idx];
        const x = pt.x * w;
        const y = pt.y * h;
        if (idxVal === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    };

    // Left eye outline landmarks
    drawFeaturePath([33, 160, 158, 133, 153, 144, 33]);
    // Right eye outline landmarks
    drawFeaturePath([362, 385, 387, 263, 373, 380, 362]);
    // Mouth outline
    drawFeaturePath([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78]);
  };

  const handleManualTrigger = () => {
    const video = videoRef.current || lastVideoRef.current;
    let detection = lastDetectionRef.current;

    console.log("Manual capture triggered. Video:", !!video, "Detection:", !!detection);

    if (!detection || !detection.faceLandmarks || detection.faceLandmarks.length === 0 || detection.faceLandmarks[0].length === 0) {
      // Mock landmarks as a fail-safe fallback
      const mockLandmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      detection = { faceLandmarks: [mockLandmarks] };
    }

    if (video) {
      onCapture(video, detection);
    } else {
      // Complete mock fallback if video element isn't available
      const mockLandmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      onCapture(document.createElement('video'), { faceLandmarks: [mockLandmarks] });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-square bg-neutral-950 rounded-2xl overflow-hidden border border-outline-variant shadow-lg flex items-center justify-center">
      {hasWebcam ? (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover grayscale-[20%]"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
          />
        </>
      ) : (
        // Simulated Camera Viewport for browser fallback (if camera not allowed)
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-surface-container-high/90">
          <span className="material-symbols-outlined text-5xl text-primary animate-bounce mb-4">
            no_photography
          </span>
          <h3 className="font-bold text-lg text-on-surface">Webcam Stream Blocked</h3>
          <p className="text-sm text-on-surface-variant max-w-[280px] mt-2">
            Please check webcam permissions. Simulating virtual biometric stream for developer demo purposes...
          </p>
          {/* Virtual stream emulator trigger button */}
          <button
            onClick={() => {
              setHasWebcam(true);
              // Trigger capture manually for testing
              setTimeout(() => {
                onCapture(document.createElement('video'), { faceLandmarks: [[]] });
              }, 2000);
            }}
            className="mt-6 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-primary-container"
          >
            FORCE SIMULATED LANDMARK INFUSION
          </button>
        </div>
      )}

      {/* Guide Target Overlay Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className={`w-[70%] h-[70%] border-2 border-dashed rounded-full flex items-center justify-center relative pulse-viewfinder ${
          quality?.isValid ? 'border-secondary/60' : 'border-white/40'
        }`}>
          <div className="viewfinder-corners absolute inset-[-15px]"></div>
          <div className="viewfinder-corners-inv absolute inset-[-15px]"></div>
          <div className="scan-line"></div>
        </div>
      </div>

      {/* Real-time Validation Parameter Indicators */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none">
        {quality?.detected && (
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white flex flex-col text-[10px] font-mono gap-1 shadow-lg">
            <div className="flex justify-between gap-4">
              <span>BRIGHTNESS:</span>
              <span className={quality.lightingOK ? 'text-secondary font-bold' : 'text-red-400 font-bold'}>
                {quality.details.brightness}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>SHARPNESS:</span>
              <span className={quality.blurOK ? 'text-secondary font-bold' : 'text-red-400 font-bold'}>
                {quality.details.blurScore}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>CENTERING:</span>
              <span className={quality.centered ? 'text-secondary font-bold' : 'text-red-400 font-bold'}>
                {quality.details.centerOffset}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>FACE SIZE:</span>
              <span className={quality.sizeOK ? 'text-secondary font-bold' : 'text-red-400 font-bold'}>
                {quality.details.faceRatio}%
              </span>
            </div>
            <div className="border-t border-white/10 mt-1 pt-1 flex justify-between gap-4 font-bold">
              <span>QUALITY SCORE:</span>
              <span className={quality.isValid ? 'text-secondary' : 'text-red-400'}>
                {quality.score}/100
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Instruction Banners */}
      <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
        <div className="flex flex-col gap-2 items-center">
          {/* Liveness challenge prompts */}
          {challenge && liveness && (
            <div className="bg-primary border border-white/20 text-white font-bold text-sm px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
              <span className="material-symbols-outlined text-[18px]">
                {challenge === 'Blink' ? 'visibility' : 'rotate_right'}
              </span>
              <span>{liveness.instructions} ({liveness.progress}%)</span>
            </div>
          )}

          {/* Quality error notifications */}
          {quality && !quality.isValid && quality.errors.length > 0 && (
            <div className="bg-red-600/90 text-white border border-red-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-1.5 max-w-[90%] text-center">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>{quality.errors[0]}</span>
            </div>
          )}

          {/* Prompt to stay still */}
          {quality?.isValid && (!challenge || (liveness && liveness.isPassed)) && (
            <div className="bg-secondary/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] animate-pulse">lock_open</span>
              <span>BIOMETRICS SECURED. CAPTURING...</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual Capture Shutter Button */}
      {hasWebcam && (
        <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
          <button
            onClick={handleManualTrigger}
            disabled={!hasDetectedFace}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs shadow-2xl transition-all border border-white/20 ${
              hasDetectedFace 
                ? 'bg-secondary text-white cursor-pointer hover:bg-secondary-container hover:scale-105 active:scale-95' 
                : 'bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-75'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {hasDetectedFace ? 'photo_camera' : 'hourglass_empty'}
            </span>
            <span>{hasDetectedFace ? 'CAPTURE PHOTO' : 'ALIGN FACE TO CAPTURE'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
