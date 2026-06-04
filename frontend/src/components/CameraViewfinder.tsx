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
  isActive,
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

  // ── Camera init ────────────────────────────────────────────
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setHasWebcam(true);
    } catch {
      setHasWebcam(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  // ── Frame processing loop ──────────────────────────────────
  useEffect(() => {
    if (!isActive || !hasWebcam) return;
    let animId: number;
    let isProcessing = false;

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended || video.videoWidth === 0) {
        animId = requestAnimationFrame(processFrame);
        return;
      }
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animId = requestAnimationFrame(processFrame); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isProcessing) {
        isProcessing = true;
        try {
          const detection = await biometricService.detectFace(video);
          lastVideoRef.current = video;
          if (
            detection?.faceLandmarks?.length > 0 &&
            detection.faceLandmarks[0].length > 0
          ) {
            lastDetectionRef.current = detection;
            setHasDetectedFace(true);
          }
          if (detection?.faceLandmarks?.length > 0) {
            const landmarks = detection.faceLandmarks[0];
            const qReport = biometricService.validateFaceQuality(video, detection);
            setQuality(qReport);
            if (qualityReportCallback) qualityReportCallback(qReport);
            drawFaceMesh(ctx, landmarks, canvas.width, canvas.height, qReport.isValid);
            if (challenge && challengeHistory) {
              const liveReport = biometricService.validateLiveness(landmarks, challenge, challengeHistory);
              setLiveness(liveReport);
              if (onLivenessProgress) onLivenessProgress(liveReport.progress, liveReport.isPassed);
            }
            if (qReport.isValid && (!challenge || (liveness && liveness.isPassed))) {
              onCapture(video, detection);
            }
          } else {
            setQuality(null);
            setLiveness(null);
            if (qualityReportCallback) {
              qualityReportCallback({
                isValid: false, detected: false, centered: false, sizeOK: false,
                lightingOK: false, blurOK: false, score: 0,
                details: { brightness: 0, blurScore: 0, centerOffset: 0, faceRatio: 0 },
                errors: ['No face detected. Align your face inside the circle.'],
              });
            }
          }
        } catch (e) {
          console.error('Frame processing exception:', e);
        } finally {
          isProcessing = false;
        }
      }
      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [isActive, hasWebcam, challenge, challengeHistory, onCapture, onLivenessProgress]);

  // ── Mesh drawing ───────────────────────────────────────────
  const drawFaceMesh = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number,
    isValid: boolean,
  ) => {
    ctx.fillStyle = isValid ? 'rgba(22,163,74,0.55)' : 'rgba(217,119,6,0.55)';
    ctx.strokeStyle = isValid ? 'rgba(22,163,74,0.22)' : 'rgba(217,119,6,0.22)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < landmarks.length; i += 3) {
      const pt = landmarks[i];
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }
    const drawPath = (indices: number[]) => {
      ctx.beginPath();
      indices.forEach((idx, iv) => {
        const pt = landmarks[idx];
        const x = pt.x * w;
        const y = pt.y * h;
        iv === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    };
    drawPath([33, 160, 158, 133, 153, 144, 33]);
    drawPath([362, 385, 387, 263, 373, 380, 362]);
    drawPath([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78]);
  };

  // ── Manual trigger ─────────────────────────────────────────
  const handleManualTrigger = () => {
    const video = videoRef.current || lastVideoRef.current;
    let detection = lastDetectionRef.current;
    if (
      !detection?.faceLandmarks?.length ||
      !detection.faceLandmarks[0].length
    ) {
      const mock = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      detection = { faceLandmarks: [mock] };
    }
    if (video) {
      onCapture(video, detection);
    } else {
      const mock = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
      onCapture(document.createElement('video'), { faceLandmarks: [mock] });
    }
  };

  // ── Quality metric color ───────────────────────────────────
  const metricColor = (ok: boolean) => (ok ? '#4ade80' : '#f87171');

  // ── Challenge icon ─────────────────────────────────────────
  const challengeIcon = challenge === 'Blink' ? 'visibility' : challenge === 'Look Up' ? 'expand_less' : 'rotate_right';

  return (
    <div
      ref={containerRef}
      style={styles.container}
    >
      {/* ── Camera / Fallback ───────────────────────────────── */}
      {hasWebcam ? (
        <>
          <video
            ref={videoRef}
            style={styles.video}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            style={styles.canvas}
          />
        </>
      ) : (
        <div style={styles.fallback}>
          <div style={styles.fallbackIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 36, color: '#11296B' }}
            >
              no_photography
            </span>
          </div>
          <h3 style={styles.fallbackTitle}>Camera Unavailable</h3>
          <p style={styles.fallbackDesc}>
            Check browser permissions. Using simulated biometric stream for demo purposes.
          </p>
          <button
            onClick={() => {
              setHasWebcam(true);
              setTimeout(() => {
                onCapture(document.createElement('video'), { faceLandmarks: [[]] });
              }, 1500);
            }}
            style={styles.fallbackBtn}
          >
            Force Simulated Capture
          </button>
        </div>
      )}

      {/* ── Guide overlay ring ──────────────────────────────── */}
      <div style={styles.overlayCenter}>
        {/* Animated corner brackets */}
        <div
          style={{
            ...styles.guideRing,
            borderColor: quality?.isValid
              ? 'rgba(22,163,74,0.70)'
              : 'rgba(255,255,255,0.35)',
            boxShadow: quality?.isValid
              ? '0 0 0 3px rgba(22,163,74,0.12), inset 0 0 0 1px rgba(22,163,74,0.20)'
              : '0 0 0 2px rgba(255,255,255,0.08)',
          }}
        >
          {/* Corner accents */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <div key={corner} style={{ ...styles.corner, ...cornerStyles[corner], borderColor: quality?.isValid ? '#4ade80' : 'rgba(255,255,255,0.70)' }} />
          ))}

          {/* Scan line */}
          {isActive && (
            <div style={styles.scanLineWrap}>
              <div
                style={{
                  ...styles.scanLine,
                  background: quality?.isValid
                    ? 'linear-gradient(90deg, transparent, rgba(22,163,74,0.60), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Quality metrics HUD (top-left) ──────────────────── */}
      {quality?.detected && (
        <div style={styles.hudPanel}>
          {[
            { label: 'BRIGHTNESS', value: quality.details.brightness, ok: quality.lightingOK },
            { label: 'SHARPNESS', value: quality.details.blurScore, ok: quality.blurOK },
            { label: 'CENTERING', value: `${quality.details.centerOffset}%`, ok: quality.centered },
            { label: 'FACE SIZE', value: `${quality.details.faceRatio}%`, ok: quality.sizeOK },
          ].map((m) => (
            <div key={m.label} style={styles.hudRow}>
              <span style={styles.hudLabel}>{m.label}</span>
              <span style={{ ...styles.hudValue, color: metricColor(m.ok) }}>{m.value}</span>
            </div>
          ))}
          <div style={styles.hudDivider} />
          <div style={styles.hudRow}>
            <span style={styles.hudLabel}>SCORE</span>
            <span
              style={{
                ...styles.hudValue,
                color: metricColor(quality.isValid),
                fontWeight: 700,
              }}
            >
              {quality.score}/100
            </span>
          </div>
        </div>
      )}

      {/* ── Bottom banners ──────────────────────────────────── */}
      <div style={styles.bottomBanners}>
        {/* Liveness challenge */}
        {challenge && liveness && (
          <div style={styles.livenessBanner}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              {challengeIcon}
            </span>
            <span style={styles.livenessBannerText}>
              {liveness.instructions}
            </span>
            {/* Progress pill */}
            <div style={styles.livenessProgressWrap}>
              <div
                style={{
                  ...styles.livenessProgressFill,
                  width: `${liveness.progress}%`,
                }}
              />
            </div>
            <span style={styles.livenessPct}>{liveness.progress}%</span>
          </div>
        )}

        {/* Quality errors */}
        {quality && !quality.isValid && quality.errors.length > 0 && (
          <div style={styles.errorBanner}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 14 }}
            >
              warning
            </span>
            <span style={styles.errorBannerText}>{quality.errors[0]}</span>
          </div>
        )}

        {/* Capturing */}
        {quality?.isValid && (!challenge || (liveness && liveness.isPassed)) && (
          <div style={styles.capturingBanner}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 14, animation: 'pulse 1s ease-in-out infinite' }}
            >
              lock_open
            </span>
            <span style={styles.capturingText}>CAPTURING…</span>
          </div>
        )}
      </div>

      {/* ── Manual shutter ──────────────────────────────────── */}
      {hasWebcam && (
        <button
          onClick={handleManualTrigger}
          disabled={!hasDetectedFace}
          style={{
            ...styles.shutterBtn,
            ...(hasDetectedFace ? styles.shutterBtnActive : styles.shutterBtnDisabled),
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15 }}
          >
            {hasDetectedFace ? 'photo_camera' : 'hourglass_empty'}
          </span>
          <span style={styles.shutterText}>
            {hasDetectedFace ? 'Capture' : 'Align Face'}
          </span>
        </button>
      )}

      <style>{`
        @keyframes scanMove {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

// ── Corner style helpers ─────────────────────────────────────
const cornerStyles: Record<'tl' | 'tr' | 'bl' | 'br', React.CSSProperties> = {
  tl: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    background: '#0a0f1e',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'grayscale(15%)',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 10,
    pointerEvents: 'none',
  },
  fallback: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    textAlign: 'center',
    background: 'rgba(10,15,30,0.96)',
  },
  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(17,41,107,0.15)',
    border: '1px solid rgba(17,41,107,0.30)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#FFFFFF',
    margin: 0,
  },
  fallbackDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    maxWidth: 260,
    lineHeight: 1.5,
    margin: 0,
  },
  fallbackBtn: {
    marginTop: 8,
    padding: '8px 20px',
    background: '#11296B',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  // Guide ring
  overlayCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 20,
  },
  guideRing: {
    width: '70%',
    height: '70%',
    borderRadius: '50%',
    border: '2px dashed',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.70)',
    borderWidth: 0,
    borderRadius: 3,
  },
  scanLineWrap: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    animation: 'scanMove 2.4s ease-in-out infinite',
  },
  // HUD
  hudPanel: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 30,
    background: 'rgba(0,0,0,0.70)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 160,
  },
  hudRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  hudLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.06em',
  },
  hudValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
  },
  hudDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.10)',
    margin: '2px 0',
  },
  // Bottom banners
  bottomBanners: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 60,
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  livenessBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(17,41,107,0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: '7px 14px',
    color: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
  },
  livenessBannerText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: 'white',
    letterSpacing: '0.02em',
  },
  livenessProgressWrap: {
    width: 48,
    height: 4,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  livenessProgressFill: {
    height: '100%',
    background: '#FFDB57',
    borderRadius: 999,
    transition: 'width 0.3s ease',
  },
  livenessPct: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: '#FFDB57',
    fontWeight: 700,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(191,6,3,0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: '6px 14px',
    color: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
    maxWidth: '90%',
    textAlign: 'center',
  },
  errorBannerText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: 'white',
  },
  capturingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(22,163,74,0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 999,
    padding: '6px 14px',
    color: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.30)',
  },
  capturingText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    color: 'white',
    letterSpacing: '0.06em',
  },
  // Shutter
  shutterBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '8px 10px',
    borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.20)',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.30)',
    transition: 'all 0.15s',
  },
  shutterBtnActive: {
    background: 'rgba(17,41,107,0.90)',
    color: 'white',
  },
  shutterBtnDisabled: {
    background: 'rgba(30,30,30,0.75)',
    color: 'rgba(255,255,255,0.30)',
    cursor: 'not-allowed',
  },
  shutterText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
};