
import React, { useState, useEffect, FormEvent, ChangeEvent, ReactNode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIGURATION ---
// IMPORTANT: Replace this placeholder with your actual deployed Google Apps Script URL.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwvsFzfv7B2m7nLmh2XAxwfWdzQAcRgb5O7gDd7FM5qFuRYtDWoK_SL8ZR8GFfVIe7d/exec';

// --- TYPE DEFINITIONS ---
interface Profile {
  name: string;
  email: string;
}

interface SubTopic {
    topic: string;
    difficulty: number;
    studyHours: number;
    isCompleted: boolean;
}

interface Subject {
  id: string;
  name:string;
  description?: string;
  isBrokenDown: boolean;
  subTopics: SubTopic[];
  isLoading: boolean;
  error?: string;
}

interface Exam {
  id: string;
  subjectId: string;
  date: string;
}

// --- API HELPER ---
const apiCall = async (action: string, payload: object) => {
    if (WEB_APP_URL.includes('PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
        throw new Error("API URL is not configured. Please paste your Google Apps Script Web App URL in index.tsx.");
    }
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Required for Apps Script
            },
            body: JSON.stringify({ action, payload })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let result;
        try {
            result = await response.json();
        } catch (err) {
            throw new Error('Could not parse server response as JSON.');
        }
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response from server.');
        }
        if (result.status !== 'success') {
            throw new Error(result.message || 'An unknown API error occurred.');
        }
        return result.data ?? {};
    } catch (error) {
        console.error(`API call failed for action "${action}":`, error);
        throw error; // Re-throw to be caught by the calling function
    }
};

// --- SVG ICONS ---
const icons = {
    profile: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    add: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    subjects: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
    timetable: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    delete: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
    brain: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 9.5 7h-3A2.5 2.5 0 0 1 4 4.5v0A2.5 2.5 0 0 1 6.5 2h3z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v0A2.5 2.5 0 0 1 14.5 7h-3a2.5 2.5 0 0 1-2.5-2.5v0A2.5 2.5 0 0 1 11.5 2h3z"/><path d="M12 12a2.5 2.5 0 0 1 2.5 2.5v0A2.5 2.5 0 0 1 12 17h0a2.5 2.5 0 0 1-2.5-2.5v0A2.5 2.5 0 0 1 12 12h0z"/><path d="M4.2 11.2A2.5 2.5 0 0 1 6.5 9h0a2.5 2.5 0 0 1 2.5 2.5v3A2.5 2.5 0 0 1 6.5 17h0a2.5 2.5 0 0 1-2.5-2.5v-3z"/><path d="M19.8 11.2a2.5 2.5 0 0 0-2.3 2.3v3a2.5 2.5 0 0 1-2.5 2.5h0a2.5 2.5 0 0 1-2.5-2.5v-3a2.5 2.5 0 0 1 2.5-2.5h0a2.5 2.5 0 0 1 2.3 2.3z"/></svg>,
    check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    circle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>,
    logout: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
};

// --- THEME COMPONENTS ---
const MatrixBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
        const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        const alphabet = katakana + latin + nums;

        const fontSize = 8;
        const columns = Math.floor(canvas.width / fontSize);

        const rainDrops: number[] = [];
        for (let x = 0; x < columns; x++) {
            rainDrops[x] = 1;
        }

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0F0';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < rainDrops.length; i++) {
                const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

                if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    rainDrops[i] = 0;
                }
                rainDrops[i]++;
            }
            animationFrameId = window.requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};

// --- UI COMPONENTS ---
const Card = ({ title, icon, children, className }: { title: string, icon: ReactNode, children?: ReactNode, className?: string }) => (
    <div className={`card ${className || ''}`}>
        <div className="card-header">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="card-content">
            {children}
        </div>
    </div>
);

const EmptyState = ({ message, icon }: { message: string, icon: ReactNode }) => (
    <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <p>{message}</p>
    </div>
);

const ProgressBar = ({ value, max }: { value: number, max: number }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
            <span className="progress-label">{value} / {max} Topics Completed</span>
        </div>
    );
};


// --- APP COMPONENT ---
const App = () => {
    const [profile, setProfile] = useState<Profile>({ name: '', email: '' });
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);
    const [authMessage, setAuthMessage] = useState('');
    const [subjectMessage, setSubjectMessage] = useState('');

    const profileNameRef = useRef<HTMLInputElement>(null);
    const profileEmailRef = useRef<HTMLInputElement>(null);
    const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setProfile(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleLoadOrCreatePlan = async () => {
        if (!profile.email) {
            setAuthMessage("Email is required to load or create a plan.");
            return;
        }
        setIsLoadingAuth(true);
        setAuthMessage("Connecting to datastream...");
        try {
            const data = await apiCall('LOAD_OR_CREATE_USER', { email: profile.email, name: profile.name });
            setProfile(data.profile);
            setSubjects(data.subjects.map((s: Subject) => ({ ...s, isLoading: false, error: undefined })));
            setExams(data.exams);
            setIsLoggedIn(true);
            setAuthMessage(`Welcome, ${data.profile.name || data.profile.email}. Plan loaded.`);
        } catch (error: any) {
            setAuthMessage(`Error: ${error.message}`);
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setProfile({ name: '', email: '' });
        setSubjects([]);
        setExams([]);
        setAuthMessage("You have been logged out. Enter email to reconnect.");
    };

    const nameRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLInputElement>(null);
    const addSubject = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        if (!name || !description) return;

        const newSubject: Omit<Subject, 'isLoading' | 'error' | 'subTopics'> = {
            id: Date.now().toString(),
            name,
            description,
            isBrokenDown: false
        };

        try {
            const result = await apiCall('ADD_SUBJECT', { email: profile.email, subject: newSubject });
            setSubjects(prev => [...prev, { ...newSubject, subTopics: [], isLoading: false }]);
            if (e.currentTarget && typeof e.currentTarget.reset === 'function') {
                e.currentTarget.reset();
            }
            setSubjectMessage('Subject added successfully!');
            setTimeout(() => setSubjectMessage(''), 2000);
            if (nameRef.current) nameRef.current.focus();
        } catch (error: any) {
            console.error('Add subject error:', error);
            setSubjectMessage('Failed to add subject. ' + (error?.message || 'Please try again.'));
            setTimeout(() => setSubjectMessage(''), 3000);
        }
    };
    
    const deleteItem = async (id: string, type: 'subject' | 'exam') => {
        try {
            if (type === 'subject') {
                await apiCall('DELETE_SUBJECT', { subjectId: id });
                setSubjects(prev => prev.filter(s => s.id !== id));
                setExams(prev => prev.filter(e => e.subjectId !== id)); // Also remove related exams from UI
            } else if (type === 'exam') {
                await apiCall('DELETE_EXAM', { examId: id });
                setExams(prev => prev.filter(e => e.id !== id));
            }
        } catch (error) {
            alert(`Failed to delete ${type}. Please try again.`);
        }
    };
    
    const addExam = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const examData = Object.fromEntries(formData.entries()) as Omit<Exam, 'id'>;
        if (!examData.subjectId || !examData.date) return;
        
        const newExam: Exam = { ...examData, id: Date.now().toString() };
        
        try {
            await apiCall('ADD_EXAM', { email: profile.email, exam: newExam });
            setExams(prev => [...prev, newExam].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            e.currentTarget.reset();
        } catch (error) {
            alert('Failed to add exam. Please try again.');
        }
    };

    const breakdownTopic = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        setSubjects(prev => prev.map(s => s.id === subjectId ? {...s, isLoading: true, error: undefined} : s));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `As an expert academic advisor, breakdown the following subject into smaller, manageable sub-topics. For each sub-topic, provide a difficulty rating on a scale of 1 (easiest) to 10 (hardest), and recommend a number of hours to study it. Subject: "${subject.name}", Description: "${subject.description}". Return the data as a JSON array of objects.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, difficulty: { type: Type.INTEGER }, studyHours: { type: Type.NUMBER } }, required: ["topic", "difficulty", "studyHours"] } }
                }
            });
            
            const resultJson = JSON.parse(response.text.trim());
            const subTopicsWithCompletion: SubTopic[] = resultJson.map((topic: any) => ({ ...topic, isCompleted: false }));
            
            await apiCall('SAVE_SUBTOPICS', { subjectId, subTopics: subTopicsWithCompletion });
            
            setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, isLoading: false, isBrokenDown: true, subTopics: subTopicsWithCompletion } : s));

        } catch (error) {
            console.error("Error breaking down topic:", error);
            setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, isLoading: false, error: "Failed to break down topic. Please try again." } : s));
        }
    };
    
    const toggleTopicCompletion = async (subjectId: string, topicName: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        const topic = subject?.subTopics.find(st => st.topic === topicName);
        if(!topic) return;

        const newCompletedStatus = !topic.isCompleted;

        try {
            await apiCall('TOGGLE_TOPIC_COMPLETION', { subjectId, topicName, isCompleted: newCompletedStatus });
            setSubjects(prevSubjects =>
                prevSubjects.map(s => 
                    s.id === subjectId ? {
                        ...s,
                        subTopics: s.subTopics.map(st => 
                            st.topic === topicName ? { ...st, isCompleted: newCompletedStatus } : st
                        ),
                    } : s
                )
            );
        } catch (error) {
             alert('Failed to update topic status. Please try again.');
        }
    };

    const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';
    const allSubTopics = subjects.flatMap(s => s.subTopics.map(st => ({...st, subjectName: s.name, subjectId: s.id})));
    const completedTopics = allSubTopics.filter(st => st.isCompleted).length;

    return (
        <>
            <MatrixBackground />
            <style>{STYLES}</style>
            <main>
                <header className="main-header">
                    <h1>[ Study Planner ]</h1>
                    <div className="header-line"></div>
                </header>
                
                <Card title="[ Student Profile ]" icon={icons.profile}>
                    <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <label htmlFor="name">{'>'} Name_</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={profile.name}
                                onChange={handleProfileChange}
                                placeholder="Enter your callsign"
                                disabled={isLoggedIn}
                                ref={profileNameRef}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (profileEmailRef.current) profileEmailRef.current.focus();
                                    }
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">{'>'} Email_</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={profile.email}
                                onChange={handleProfileChange}
                                placeholder="Enter your secure address"
                                disabled={isLoggedIn}
                                ref={profileEmailRef}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const form = e.currentTarget.form;
                                        if (form) {
                                            const btn = form.querySelector('button[type="button"]') as HTMLButtonElement;
                                            if (btn) btn.focus();
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="form-actions">
                             {!isLoggedIn ? (
                                <button type="button" onClick={handleLoadOrCreatePlan} disabled={isLoadingAuth}>
                                    {isLoadingAuth ? 'Connecting...' : '[ Load / Create Plan ]'}
                                </button>
                            ) : (
                                <button type="button" onClick={handleLogout} className="logout-btn">
                                    {icons.logout} [ Logout ]
                                </button>
                            )}
                        </div>
                        {authMessage && <p className="auth-message">{authMessage}</p>}
                    </form>
                </Card>

                {isLoggedIn && (
                    <>
                        <Card title="[ Add Subject ]" icon={icons.add}>
                            <form onSubmit={addSubject}>
                                <div className="form-group">
                                    <label htmlFor="subject-name">{'>'} Subject Name_</label>
                                    <input
                                        type="text"
                                        id="subject-name"
                                        name="name"
                                        placeholder="e.g. Quantum Computing"
                                        required
                                        ref={nameRef}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (descRef.current) descRef.current.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="subject-desc">{'>'} Description_</label>
                                    <input
                                        type="text"
                                        id="subject-desc"
                                        name="description"
                                        placeholder="e.g. Please add all topics in a detailed manner"
                                        required
                                        ref={descRef}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const form = e.currentTarget.form;
                                                if (form) {
                                                    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                                                    if (btn) btn.focus();
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <button type="submit">{'>'} Add Subject</button>
                                {subjectMessage && (
                                    <div style={{textAlign:'center',marginTop:'1em',color:subjectMessage.includes('success')?'#00ff41':'#ff4141',fontWeight:700}}>{subjectMessage}</div>
                                )}
                            </form>
                        </Card>

                        <Card title={`[ My Subjects & Topics (${subjects.length}) ]`} icon={icons.subjects}>
                            {subjects.length === 0 ? (
                                <EmptyState message="No subjects loaded..." icon={icons.subjects} />
                            ) : (
                                <ul className="subject-list">
                                    {subjects.map(subject => (
                                        <li key={subject.id}>
                                            <div className="subject-info">
                                                <strong>{subject.name}</strong>
                                                <span>{subject.description}</span>
                                            </div>
                                            <div className="subject-actions">
                                                {!subject.isBrokenDown && (
                                                     <button onClick={() => breakdownTopic(subject.id)} disabled={subject.isLoading} className="breakdown-btn">
                                                        {subject.isLoading ? 'Analyzing...' : <> {icons.brain} Breakdown </>}
                                                    </button>
                                                )}
                                                <button onClick={() => deleteItem(subject.id, 'subject')} className="delete-btn">{icons.delete}</button>
                                            </div>
                                            {subject.error && <p className="error-message">{subject.error}</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card title="[ Study Timetable ]" icon={icons.timetable}>
                            {allSubTopics.length > 0 && <ProgressBar value={completedTopics} max={allSubTopics.length} />}
                            {allSubTopics.length === 0 ? (
                                <EmptyState message="Awaiting topic breakdown..." icon={icons.timetable} />
                            ) : (
                                <ul className="timetable-list">
                                     {allSubTopics.map((topic, index) => (
                                        <li key={`${topic.subjectId}-${index}`} className={topic.isCompleted ? 'completed' : ''}>
                                            <div className="topic-details">
                                                <strong>{topic.topic}</strong>
                                                <span>{topic.subjectName}</span>
                                            </div>
                                            <div className="topic-stats">
                                                <span className="difficulty-badge" style={{'--difficulty': topic.difficulty} as React.CSSProperties}>{topic.difficulty}/10</span>
                                                <span className="hours-badge">~{topic.studyHours} hrs</span>
                                                <button onClick={() => toggleTopicCompletion(topic.subjectId, topic.topic)} className="complete-btn">
                                                    {topic.isCompleted ? icons.check : icons.circle}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card title="[ Add Exam Date ]" icon={icons.add} className="exam-card">
                             <form onSubmit={addExam}>
                                <div className="form-group">
                                    <label htmlFor="exam-subject">{'>'} Subject_</label>
                                    <select name="subjectId" id="exam-subject" required>
                                        <option value="">Select a subject...</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="exam-date">{'>'} Date_</label>
                                    <input type="date" name="date" id="exam-date" required/>
                                </div>
                                <button type="submit">{'>'} Add Exam</button>
                            </form>
                        </Card>

                        <Card title="[ Exam Dates ]" icon={icons.timetable} className="exam-card">
                           {exams.length === 0 ? (
                               <EmptyState message="No exam dates set..." icon={icons.timetable} />
                           ) : (
                               <ul className="exam-list">
                                    {exams.map(exam => (
                                        <li key={exam.id}>
                                            <span>{getSubjectName(exam.subjectId)}</span>
                                            <span>{new Date(exam.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
                                            <button onClick={() => deleteItem(exam.id, 'exam')} className="delete-btn">{icons.delete}</button>
                                        </li>
                                    ))}
                               </ul>
                           )}
                        </Card>
                    </>
                )}
            </main>
        </>
    );
};


// --- STYLES ---
const STYLES = `
    .main-header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid var(--border-color);
        box-shadow: 0 4px 15px -10px var(--shadow-color);
    }
    .main-header h1 {
        font-size: 2.5rem;
        margin: 0;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--accent-color);
    }
    main {
        display: grid;
        gap: 2rem;
    }
    .card {
        background-color: var(--card-bg-color);
        border: 2px solid var(--border-color);
        border-radius: 8px;
        backdrop-filter: blur(5px);
        box-shadow: 0 0 20px var(--shadow-color);
        transition: all 0.3s ease;
    }
    .card:hover {
        border-color: var(--accent-color);
        box-shadow: 0 0 30px var(--shadow-color);
    }
    .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        background-color: rgba(0,0,0,0.2);
    }
    .card-header h3 {
        margin: 0;
        font-size: 1.5rem;
        letter-spacing: 1px;
    }
    .card-content {
        padding: 1.5rem;
    }
    .card.exam-card {
        --primary-color: #41a1ff;
        --accent-color: #82c0ff;
        --border-color: rgba(65, 161, 255, 0.4);
        --glow-color: rgba(65, 161, 255, 0.4);
        --shadow-color: rgba(65, 161, 255, 0.2);
    }
    form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .profile-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        align-items: end;
    }
    @media (max-width: 768px) {
        .profile-form { grid-template-columns: 1fr; }
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .form-group label {
        font-weight: 700;
        color: var(--accent-color);
    }
    input, select {
        background: rgba(0,0,0,0.5);
        border: 1px solid var(--border-color);
        color: var(--text-color-primary);
        padding: 0.75rem;
        font-family: inherit;
        font-size: 1rem;
        border-radius: 4px;
        transition: all 0.2s ease;
        text-shadow: 0 0 5px var(--glow-color);
    }
    input:focus, select:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 10px var(--shadow-color);
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(1) brightness(0.5) sepia(1) saturate(5) hue-rotate(90deg);
    }
    button {
        background-color: transparent;
        border: 2px solid var(--primary-color);
        color: var(--primary-color);
        padding: 0.75rem 1.5rem;
        font-family: inherit;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        text-shadow: 0 0 8px var(--glow-color);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border-radius: 4px;
    }
    button:hover, button:focus {
        background-color: var(--primary-color);
        color: var(--bg-color);
        box-shadow: 0 0 15px var(--shadow-color);
        text-shadow: none;
    }
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .form-actions {
        grid-column: 1 / -1;
        display: flex;
        justify-content: center;
    }
    .auth-message {
        grid-column: 1 / -1;
        text-align: center;
        margin: 0;
        color: var(--accent-color);
        min-height: 1.6em; /* Reserve space to prevent layout shift */
    }
    .logout-btn {
        border-color: var(--danger-color);
        color: var(--danger-color);
    }
    .logout-btn:hover {
        background-color: var(--danger-color);
        color: white;
    }
    .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-color-secondary);
    }
    .empty-state-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem;
        opacity: 0.5;
    }
    .empty-state-icon svg {
        width: 100%;
        height: 100%;
    }
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: rgba(0,0,0,0.3);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    li:hover {
        background-color: rgba(0,0,0,0.5);
    }
    .subject-info {
        display: flex;
        flex-direction: column;
    }
    .subject-info span {
        font-size: 0.9rem;
        color: var(--text-color-secondary);
    }
    .subject-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    .delete-btn {
        background: transparent;
        border: none;
        color: var(--danger-color);
        padding: 0.25rem;
        opacity: 0.6;
    }
    .delete-btn:hover {
        opacity: 1;
        background: transparent;
        text-shadow: 0 0 8px var(--danger-color);
    }
    .breakdown-btn {
        font-size: 0.9rem;
        padding: 0.5rem 1rem;
    }
    .error-message {
        color: var(--danger-color);
        font-size: 0.9rem;
        margin-top: 0.5rem;
    }
    .timetable-list .topic-details {
        display: flex;
        flex-direction: column;
    }
    .timetable-list .topic-stats {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .difficulty-badge {
        background: linear-gradient(to right, rgba(255, 0, 119, 1), rgba(255, 0, 0, 1), rgba(255, 0, 221, 0.23));
        background-size: 200% 200%;
        background-position: calc((var(--difficulty, 1) - 1) * (100 / 9) * 1%) 50%;
        color: black;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-weight: 700;
        font-size: 0.9rem;
    }
    .hours-badge {
        background-color: rgba(255,255,255,0.1);
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.9rem;
        color: var(--accent-color);
    }
    .complete-btn {
        background: none;
        border: none;
        padding: 0.25rem;
        color: var(--primary-color);
        opacity: 0.7;
    }
    .complete-btn:hover {
        opacity: 1;
        background: transparent;
    }
    .timetable-list li.completed {
        text-decoration: line-through;
        opacity: 0.6;
    }
    .timetable-list li.completed .difficulty-badge, .timetable-list li.completed .hours-badge {
        opacity: 0.7;
    }
    .timetable-list li.completed .complete-btn {
        color: var(--accent-color);
        opacity: 1;
    }
    .progress-bar-container {
        width: 100%;
        background-color: rgba(0,0,0,0.5);
        border-radius: 20px;
        border: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
        position: relative;
        text-align: center;
    }
    .progress-bar {
        height: 24px;
        background: var(--primary-color);
        border-radius: 20px;
        box-shadow: 0 0 10px var(--shadow-color);
        transition: width 0.5s ease-in-out;
    }
    .progress-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        color: #000;
        font-weight: 700;
        mix-blend-mode: difference;
        filter: invert(1) grayscale(1) contrast(100);
    }
`;


const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
