import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

interface FaceBox {
  id: number;
  box: faceapi.Box;
  timestamp: number;
  color: string;
}

let faceIdCounter = 0;

const FaceDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const faceBoxesRef = useRef<FaceBox[]>([]);

  // Load model
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      setIsModelLoaded(true);
    };
    loadModels();
  }, []);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    };
    startCamera();
  }, []);

  // Detection logic
  useEffect(() => {
    if (!isModelLoaded || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const detectFaces = async () => {
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;

      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      );
      const resized = faceapi.resizeResults(detections, displaySize);
      const now = Date.now();

      // Match faces with existing ones
      const updated: FaceBox[] = resized.map((det) => {
        const match = faceBoxesRef.current.find((f) => {
          const dx = Math.abs(f.box.x - det.box.x);
          const dy = Math.abs(f.box.y - det.box.y);
          return dx < 30 && dy < 30;
        });

        if (match) {
          // Update box but keep timestamp
          return {
            ...match,
            box: det.box,
            color: now - match.timestamp > 500 ? 'green' : 'red',
          };
        } else {
          return {
            id: faceIdCounter++,
            box: det.box,
            timestamp: now,
            color: 'red',
          };
        }
      });

      faceBoxesRef.current = updated;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceBoxesRef.current.forEach(({ box, color }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      });
    };

    const interval = setInterval(detectFaces, 100);
    return () => clearInterval(interval);
  }, [isModelLoaded]);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-md w-full h-auto"
        onLoadedMetadata={() => videoRef.current?.play()}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};

export default FaceDetection;
