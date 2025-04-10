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
    const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
    const [countdown, setCountdown] = useState(5); // 5 seconds for attendance marking
    const [attendanceMarkedForId, setAttendanceMarkedForId] = useState<number | null>(null); // Track the face ID for whom attendance was marked

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

            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceBoxesRef.current.forEach(({ box, color }) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            });


            // Attendance marking logic
            if (faceBoxesRef.current.length > 0 && faceBoxesRef.current.every(face => face.color === 'green') && !isAttendanceMarked) {
                const timer = setInterval(() => {
                    setCountdown((prevCountdown) => prevCountdown - 1);
                }, 1000);

                if (countdown <= 0) {
                    clearInterval(timer);
                    setIsAttendanceMarked(true);
                    setAttendanceMarkedForId(faceBoxesRef.current[0].id);  // Store the ID of the first face detected
                }

                return () => clearInterval(timer);
            } else {
                setCountdown(5); // Reset countdown if face disappears or isn't green
            }
        };

        const interval = setInterval(detectFaces, 100);
        return () => clearInterval(interval);
    }, [isModelLoaded, isAttendanceMarked, countdown]);


    const resetForNextUser = () => {
        setIsAttendanceMarked(false);
        setAttendanceMarkedForId(null);
        faceIdCounter++; //Increment counter, so the same person can do this again.
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-semibold text-gray-800 mb-8">Facial Attendance System</h1>

            <div className="relative w-full max-w-xl  rounded-lg shadow-xl overflow-hidden p-1 mx-auto">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-auto object-cover rounded-lg"
                    style={{ aspectRatio: '4/3' }}
                    onLoadedMetadata={() => videoRef.current?.play()}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                {isAttendanceMarked && (
                    <div className="absolute top-0 left-0 w-full h-full bg-green-500 bg-opacity-50 flex items-center justify-center">
                        <p className="text-white text-2xl font-bold">Attendance Marked!</p>
                    </div>
                )}
                {!isAttendanceMarked && faceBoxesRef.current.length > 0 && faceBoxesRef.current.every(face => face.color === 'green') && (
                    <div className="absolute bottom-4 left-4 bg-blue-500 text-white py-2 px-4 rounded-md shadow-md">
                        Marking attendance in {countdown} seconds...
                    </div>
                )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
                Make sure your face is clearly visible in the camera.
            </div>
            <div className="mt-4 text-sm text-gray-500">
                {isAttendanceMarked ? "You can leave now. Attendance marked successfully" : "Please keep your face in view until attendance is marked."}
            </div>

            {isAttendanceMarked && (
                <button
                    onClick={resetForNextUser}
                    className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Next Person
                </button>
            )}
        </div>
    );
};

export default FaceDetection;