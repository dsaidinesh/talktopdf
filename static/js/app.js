const { useState, useEffect, useCallback, useRef } = React;

const Microphone = ({ isListening, onClick }) => (
    <button
        onClick={onClick}
        className={`microphone w-40 h-40 rounded-full flex items-center justify-center ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
        }`}
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
                ctx.strokeStyle = 'rgb(255, 255, 255)';
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
    <div className="mt-8 text-2xl font-bold text-center animate-fade-in">
        {status}
    </div>
);

const BackgroundTransition = ({ isResponding }) => (
    <div className={`fixed inset-0 transition-colors duration-1000 ${isResponding ? 'bg-purple-900' : 'bg-gray-900'}`} style={{ zIndex: -1 }}></div>
);

const InterruptButton = ({ onClick, isVisible }) => (
    <button
        onClick={onClick}
        className={`mt-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded ${isVisible ? 'visible' : 'invisible'}`}
    >
        Interrupt AI
    </button>
);

const FileUpload = ({ onFileUpload }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
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
            onFileUpload(false);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="mb-8">
            <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="mb-4"
            />
            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
                {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>
            {uploading && (
                <div className="mt-2">
                    <div className="bg-blue-500 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style={{ width: `${progress}%` }}>
                        {Math.round(progress)}%
                    </div>
                </div>
            )}
        </div>
    );
};

const PDFSelector = ({ pdfs, selectedPDF, onSelect }) => (
    <div className="mb-4">
        <label htmlFor="pdf-select" className="block text-sm font-medium text-gray-300 mb-2">Select PDF:</label>
        <select
            id="pdf-select"
            value={selectedPDF}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-gray-700 text-white rounded-md px-3 py-2 w-full"
        >
            <option value="">Select a PDF</option>
            {pdfs.map((pdf) => (
                <option key={pdf.id} value={pdf.id}>{pdf.filename}</option>
            ))}
        </select>
    </div>
);

const TranscriptDisplay = ({ transcript }) => (
    <div className="mt-8 bg-gray-800 p-4 rounded-lg max-h-60 overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">Transcript</h3>
        {transcript.map((entry, index) => (
            <div key={index} className={`mb-2 ${entry.speaker === 'User' ? 'text-blue-300' : 'text-green-300'}`}>
                <strong>{entry.speaker}:</strong> {entry.text}
            </div>
        ))}
    </div>
);

const App = () => {
    const [isListening, setIsListening] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [status, setStatus] = useState('');
    const [recognition, setRecognition] = useState(null);
    const [pdfs, setPDFs] = useState([]);
    const [selectedPDF, setSelectedPDF] = useState('');
    const [transcript, setTranscript] = useState([]);
    const utteranceRef = useRef(null);

    useEffect(() => {
        fetchPDFs();
    }, []);

    const fetchPDFs = async () => {
        try {
            const response = await fetch('/pdfs');
            const data = await response.json();
            setPDFs(data);
        } catch (error) {
            console.error('Error fetching PDFs:', error);
        }
    };

    const startListening = useCallback(() => {
        if (!selectedPDF) {
            setStatus('Please select a PDF first');
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
            fetchPDFs();
            setSelectedPDF(pdf_id);
            setStatus('PDF uploaded successfully. You can now ask questions.');
        } else {
            setStatus('PDF upload failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
            <BackgroundTransition isResponding={isResponding} />
            <h1 className="text-4xl font-bold mb-8 relative z-10">Enhanced Voice Chatbot with PDF RAG</h1>
            <FileUpload onFileUpload={handleFileUpload} />
            <PDFSelector pdfs={pdfs} selectedPDF={selectedPDF} onSelect={setSelectedPDF} />
            <Microphone isListening={isListening} onClick={toggleListening} />
            <VoiceVisualizer isListening={isListening} />
            <InterruptButton onClick={interruptAI} isVisible={isResponding} />
            <StatusIndicator status={status} />
            <TranscriptDisplay transcript={transcript} />
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
