const { useState, useEffect, useCallback, useRef } = React;

const Microphone = ({ isListening, onClick }) => (
    <button
        onClick={onClick}
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening 
            ? 'bg-primary animate-pulse' 
            : 'bg-white hover:bg-secondary text-primary hover:text-white'
        } shadow-lg microphone`}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    </button>
);

const VoiceVisualizer = ({ isListening }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let audioContext;
        let analyser;
        let dataArray;

        const drawVisualizer = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (isListening && analyser) {
                analyser.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgb(59, 130, 246)';
                ctx.beginPath();
                const sliceWidth = canvas.width * 1.0 / dataArray.length;
                let x = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * canvas.height / 2;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }
            animationRef.current = requestAnimationFrame(drawVisualizer);
        };

        if (isListening) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    analyser = audioContext.createAnalyser();
                    const source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);
                    analyser.fftSize = 2048;
                    dataArray = new Uint8Array(analyser.frequencyBinCount);
                    drawVisualizer();
                })
                .catch(err => console.error('Error accessing microphone:', err));
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioContext) {
                audioContext.close();
            }
        };
    }, [isListening]);

    return (
        <canvas ref={canvasRef} width="300" height="50" className="mt-4"></canvas>
    );
};

const StatusIndicator = ({ status }) => (
    <div className="mt-4 text-xl font-semibold text-gray-900 text-center animate-fade-in">
        {status}
    </div>
);

const BackgroundTransition = ({ isResponding }) => (
    <div className={`fixed inset-0 transition-colors duration-1000 ${
        isResponding ? 'bg-[#E8EFFF]' : 'bg-[#F3F6FF]'
    }`} style={{ zIndex: -1 }}></div>
);

const InterruptButton = ({ onClick, isVisible }) => (
    <button
        onClick={onClick}
        className={`mt-4 bg-white border-2 border-[#A294F9] hover:bg-[#E5D9F2] text-[#4F6EF7] font-bold py-2 px-4 rounded transition-colors duration-300 ${isVisible ? 'visible' : 'invisible'}`}
    >
        Interrupt AI
    </button>
);

const FileUpload = ({ onFileUpload }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setUploadStatus('');
        } else {
            setFile(null);
            setUploadStatus('Please select a PDF file.');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus('Please select a file first.');
            return;
        }

        setUploading(true);
        setProgress(0);
        setUploadStatus('Uploading...');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload', true);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setProgress(percentComplete);
                }
            };
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    onFileUpload(true, response.pdf_id);
                    setUploadStatus('File uploaded successfully!');
                } else {
                    throw new Error('Upload failed');
                }
            };
            xhr.onerror = () => {
                throw new Error('Upload failed');
            };
            xhr.send(formData);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus('Upload failed. Please try again.');
            onFileUpload(false);
        } finally {
            setUploading(false);
            setProgress(0);
            setFile(null);
        }
    };

    return (
        <div className="mb-6 p-6 bg-white rounded-3xl shadow-lg chat-container">
            <h2 className="text-xl font-bold mb-4 text-primary">Upload PDF</h2>
            <div className="flex items-center mb-4">
                <label className="w-full flex flex-col items-center px-4 py-6 bg-[#E5D9F2] text-gray-700 rounded-lg tracking-wide uppercase border border-[#CDC1FF] cursor-pointer hover:bg-[#CDC1FF] hover:text-white transition-colors duration-300">
                    <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                    </svg>
                    <span className="mt-2 text-base leading-normal">{file ? file.name : 'Select a PDF file'}</span>
                    <input type='file' className="hidden" onChange={handleFileChange} accept=".pdf" />
                </label>
            </div>
            <div className="flex items-center justify-between">
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={`px-4 py-2 rounded font-bold upload-button ${
                        !file || uploading ? 'opacity-50' : ''
                    }`}
                >
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                </button>
                {uploadStatus && (
                    <p className={`text-sm ${
                        uploadStatus.includes('success') ? 'text-green-400' : 'text-red-400'
                    }`}>
                        {uploadStatus}
                    </p>
                )}
            </div>
            {uploading && (
                <div className="mt-4">
                    <div className="h-2 bg-gray-700 rounded-full">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{Math.round(progress)}% uploaded</p>
                </div>
            )}
        </div>
    );
};

const TranscriptDisplay = ({ transcript }) => (
    <div className="chat-containers bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="chat-header bg-indigo-600 text-white p-4">
                    <h3 class="font-semibold">Chat History</h3>
                </div>
        <div className="overflow-y-auto h-[calc(100%-2rem)]">
            <div className="space-y-4">
                {transcript.map((entry, index) => (
                    <div key={index} className={`p-4 rounded-2xl shadow-sm ${
                        entry.speaker === 'User' 
                            ? 'bg-blue-100 text-gray-900 ml-auto'
                            : 'bg-gray-200 text-gray-900'
                    } max-w-[80%] ${entry.speaker === 'User' ? 'ml-auto' : 'mr-auto'}`}>
                        <strong className="block mb-1">{entry.speaker}:</strong>
                        <p>{entry.text}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const App = () => {
    const [isListening, setIsListening] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [status, setStatus] = useState('');
    const [selectedPDF, setSelectedPDF] = useState('');
    const [recognition, setRecognition] = useState(null);
    const [transcript, setTranscript] = useState([]);
    const utteranceRef = useRef(null);

    const startListening = useCallback(() => {
        if (!selectedPDF) {
            setStatus('Please upload a PDF first');
            return;
        }

        const newRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        newRecognition.lang = 'en-US';
        newRecognition.interimResults = false;
        newRecognition.maxAlternatives = 1;
        newRecognition.continuous = true;

        newRecognition.onresult = async (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setStatus('Responding...');
            setIsResponding(true);
            setTranscript(prev => [...prev, { speaker: 'User', text: transcript }]);
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: transcript, pdf_id: selectedPDF }),
                });
                const data = await response.json();
                if (response.ok) {
                    utteranceRef.current = new SpeechSynthesisUtterance(data.response);
                    utteranceRef.current.onend = () => {
                        setStatus('Listening...');
                        setIsResponding(false);
                    };
                    speechSynthesis.speak(utteranceRef.current);
                    setTranscript(prev => [...prev, { speaker: 'AI', text: data.response }]);
                } else {
                    throw new Error(data.error || 'Failed to get response from server');
                }
            } catch (error) {
                console.error('Error:', error);
                setStatus('Error occurred');
                setIsResponding(false);
            }
        };

        newRecognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setStatus('Error: ' + event.error);
        };

        newRecognition.onend = () => {
            if (isListening) {
                newRecognition.start();
            }
        };

        newRecognition.start();
        setRecognition(newRecognition);
        setIsListening(true);
        setStatus('Listening...');
    }, [isListening, selectedPDF]);

    const stopListening = useCallback(() => {
        if (recognition) {
            recognition.stop();
        }
        setIsListening(false);
        setStatus('');
    }, [recognition]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    const interruptAI = useCallback(() => {
        if (utteranceRef.current) {
            speechSynthesis.cancel();
        }
        setIsResponding(false);
        setStatus('AI response interrupted. You can ask a new question.');
    }, []);

    useEffect(() => {
        return () => {
            if (recognition) {
                recognition.stop();
            }
            if (utteranceRef.current) {
                speechSynthesis.cancel();
            }
        };
    }, [recognition]);

    const handleFileUpload = (success, pdf_id) => {
        if (success) {
            setSelectedPDF(pdf_id);
            setStatus('PDF uploaded successfully. You can now ask questions.');
        } else {
            setStatus('PDF upload failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F5EFFF] text-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center text-primary">
                    Talk with your pdf
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <FileUpload onFileUpload={handleFileUpload} />
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <Microphone isListening={isListening} onClick={toggleListening} />
                        <VoiceVisualizer isListening={isListening} />
                        <InterruptButton onClick={interruptAI} isVisible={isResponding} />
                        <StatusIndicator status={status} />
                    </div>
                    <div className="h-[500px]">
                        <TranscriptDisplay transcript={transcript} />
                    </div>
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));

