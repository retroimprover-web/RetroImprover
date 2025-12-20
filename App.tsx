import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { AppStep, RestoredImage, SubscriptionPlan, ViewMode, AppTab } from './types';
import { getCroppedImg, readFile } from './utils';
import * as API from './services/gemini'; // Renamed to API conceptually
import { 
  Upload, Scissors, Wand2, Download, Heart, Play, 
  Loader2, CheckCircle2, ChevronLeft, Menu, Sparkles, X, Image as ImageIcon, Video, ArrowLeft, Plus, FolderOpen, PlusCircle, LogIn, UserPlus
} from 'lucide-react';

// --- Icons ---

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.9 3.8-.74c.81.12 2.68.53 3.5 1.7-3.13 1.5-2.58 5.76.68 7.14-.65 1.58-1.57 3.12-3.06 4.13zm-3.08-16.6C14.7 2.67 15.65.7 15.65.7c-1.9.15-3.56 1.34-4.25 2.81-.6.04-1.9-.3-1.63-2.9 2.05.15 3.53 1.25 4.2 3.07z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2]" xmlns="http://www.w3.org/2000/svg">
     <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.742-2.971 2.28v1.69h3.843l-.625 3.667h-3.218v7.98h-4.843Z" />
  </svg>
);

// --- Sub Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost', size?: 'sm' | 'md' }> = 
  ({ className = '', variant = 'primary', size = 'md', children, ...props }) => {
  const base = "rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3"
  }
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700",
    ghost: "bg-transparent text-zinc-400 hover:text-white"
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

const Header = ({ onBack, showBack, onMenu, credits, onAddCredits, highlightCredits, onLogout }: { 
    onBack: () => void, 
    showBack: boolean, 
    onMenu: () => void, 
    credits: number,
    onAddCredits: () => void,
    highlightCredits: boolean,
    onLogout: () => void
}) => (
  <header className="fixed top-0 left-0 right-0 h-16 px-4 z-50 flex items-center justify-between backdrop-blur-md bg-black/30 border-b border-white/5">
    <div className="flex items-center gap-3">
      <button onClick={onMenu} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <Menu size={24} />
      </button>
      {showBack && (
         <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronLeft size={24} />
         </button>
      )}
      <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent hidden sm:block">
        RetroImprover
      </h1>
    </div>
    
    <div className="flex items-center gap-3">
        <div 
            onClick={onAddCredits}
            className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border rounded-full shadow-lg cursor-pointer hover:bg-zinc-800 transition-all ${highlightCredits ? 'border-red-500 animate-shake' : 'border-zinc-700'}`}
        >
            <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{credits}</span>
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center ml-1">
                <Plus size={10} className="text-white"/>
            </div>
        </div>
    </div>
  </header>
);

const AuthScreen = ({ onLogin }: { onLogin: (token: string, user: any) => void }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [oauthStatus, setOAuthStatus] = useState<{ google: boolean; facebook: boolean; apple: boolean } | null>(null);

    useEffect(() => {
        // Проверяем доступность OAuth при загрузке
        API.getOAuthStatus().then(setOAuthStatus).catch(() => setOAuthStatus({ google: false, facebook: false, apple: false }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = isRegister 
                ? await API.registerUser(email, password)
                : await API.loginUser(email, password);
            onLogin(data.token, data.user);
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        // Redirect to backend OAuth endpoint
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${apiUrl}/api/auth/${provider}`;
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-sm bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">RetroImprover</h1>
                    <p className="text-zinc-400 text-sm">Sign in to sync your projects and credits.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                        <input 
                            type="email" 
                            required 
                            className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Password</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    
                    {error && <div className="text-red-400 text-xs text-center">{error}</div>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin"/> : (isRegister ? 'Create Account' : 'Sign In')}
                    </Button>
                </form>

                {/* Social Auth - показываем только если OAuth настроен */}
                {oauthStatus && (oauthStatus.google || oauthStatus.facebook || oauthStatus.apple) && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-zinc-950 px-2 text-zinc-500 text-xs uppercase tracking-wider">Or continue with</span>
                            </div>
                        </div>

                        <div className={`grid gap-3 ${[oauthStatus.google, oauthStatus.facebook, oauthStatus.apple].filter(Boolean).length === 3 ? 'grid-cols-3' : [oauthStatus.google, oauthStatus.facebook, oauthStatus.apple].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {oauthStatus.google && (
                                <button 
                                    onClick={() => handleSocialLogin('google')}
                                    className="flex items-center justify-center py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700"
                                >
                                    <GoogleIcon />
                                </button>
                            )}
                            {oauthStatus.apple && (
                                <button 
                                    onClick={() => handleSocialLogin('apple')}
                                    className="flex items-center justify-center py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700"
                                >
                                    <AppleIcon />
                                </button>
                            )}
                            {oauthStatus.facebook && (
                                <button 
                                    onClick={() => handleSocialLogin('facebook')}
                                    className="flex items-center justify-center py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors border border-zinc-700"
                                >
                                    <FacebookIcon />
                                </button>
                            )}
                        </div>
                    </>
                )}

                <div className="mt-8 text-center">
                    <button 
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const Sidebar = ({ isOpen, onClose, activeTab, onSelectTab, onNewProject, onLogout }: { 
    isOpen: boolean, 
    onClose: () => void, 
    activeTab: AppTab, 
    onSelectTab: (t: AppTab) => void,
    onNewProject: () => void,
    onLogout: () => void
}) => {
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />}
            <div className={`fixed top-0 left-0 h-full w-72 bg-zinc-950 border-r border-zinc-800 z-[70] transform transition-transform duration-300 p-6 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold tracking-tighter">RetroImprover</h2>
                    <button onClick={onClose}><X size={24} className="text-zinc-400" /></button>
                </div>
                
                <div className="mb-6">
                     <Button onClick={() => { onNewProject(); onClose(); }} className="w-full" size="sm">
                        <PlusCircle size={18} /> New Restoration
                     </Button>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: AppTab.HOME, label: 'Workbench', icon: Wand2 },
                        { id: AppTab.PROJECTS, label: 'My Projects', icon: FolderOpen },
                        { id: AppTab.GALLERY, label: 'Liked Gallery', icon: Heart },
                        { id: AppTab.PLANS, label: 'Buy Stars', icon: Sparkles },
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => { onSelectTab(item.id as AppTab); onClose(); }}
                            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                 <div className="border-t border-zinc-800 pt-4">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                        <LogIn size={20} className="rotate-180"/> Sign Out
                    </button>
                </div>
            </div>
        </>
    )
}

const GridGallery = ({ items, onLoadItem, title, emptyMsg, onLikeToggle }: { 
    items: any[], 
    onLoadItem: (item: any) => void, 
    title: string, 
    emptyMsg: string,
    onLikeToggle: (id: string) => void
}) => (
    <div className="w-full h-full p-4 overflow-y-auto pt-20 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 gap-4">
                <ImageIcon size={48} className="opacity-20" />
                <p>{emptyMsg}</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-20">
                {items.map((item) => (
                    <div 
                        key={item.id} 
                        className="aspect-[3/4] rounded-xl overflow-hidden relative group border border-white/10 bg-zinc-900"
                    >
                        <div onClick={() => onLoadItem(item)} className="w-full h-full cursor-pointer">
                            {item.video ? (
                                <div className="relative w-full h-full">
                                    <video src={item.video} muted className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Play size={24} className="fill-white text-white"/></div>
                                </div>
                            ) : (
                                <img src={item.restoredImage} alt="Saved" className="w-full h-full object-cover" />
                            )}
                        </div>
                        
                        <div className="absolute top-2 right-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onLikeToggle(item.id); }}
                                className={`p-2 rounded-full backdrop-blur-sm ${item.isLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white/70'}`}
                            >
                                <Heart size={14} fill={item.isLiked ? "currentColor" : "none"} />
                            </button>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-3 pt-6 pointer-events-none">
                             <div className="text-[10px] text-zinc-300 font-medium opacity-80">{new Date(item.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
)

const PlansView = ({ onBuy }: { onBuy: (amount: number) => void }) => (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Get More Stars</h2>
            <p className="text-zinc-400">Generate high-quality videos and restorations.</p>
        </div>
        
        <div className="w-full max-w-sm space-y-3">
            {[
                { id: 'free', price: 'Free', stars: 3, label: 'Starter', desc: 'Try it out' },
                { id: 'mid', price: '$9.99', stars: 20, label: 'Creator', desc: 'Best for hobbyists' },
                { id: 'pro', price: '$25.99', stars: 50, label: 'Pro', desc: 'Heavy usage' },
            ].map((plan) => (
            <div key={plan.id} className="group relative p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600 transition-all flex justify-between items-center overflow-hidden cursor-pointer"
                 onClick={() => onBuy(plan.stars)}>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                         <span className="font-bold text-white text-lg">{plan.label}</span>
                         {plan.id === 'mid' && <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Sparkles size={14} fill="currentColor"/> {plan.stars} Stars
                    </div>
                </div>
                <div className="relative z-10 flex flex-col items-end">
                    <div className="text-xl font-bold text-white">{plan.price}</div>
                    <div className="text-xs text-zinc-500">{plan.desc}</div>
                </div>
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            ))}
        </div>
    </div>
)

// --- Main Application ---

export default function App() {
  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  // Navigation & State
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ORIGINAL);
  const [highlightCredits, setHighlightCredits] = useState(false);
  
  // Data State
  const [credits, setCredits] = useState(0); 
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [selectedPromptIndices, setSelectedPromptIndices] = useState<number[]>([]);
  
  const [projects, setProjects] = useState<any[]>([]);

  // Processing Flags
  const [isRestoring, setIsRestoring] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  // Crop State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth Handlers ---
  const handleLogin = (newToken: string, user: any) => {
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setCredits(user.credits);
      loadProjects(newToken);
  };

  const handleLogout = () => {
      setToken(null);
      localStorage.removeItem('token');
      setProjects([]);
      startNewProject();
  };

  const loadProjects = async (authToken: string) => {
      try {
          const list = await API.getProjects(authToken);
          setProjects(list);
      } catch (e) {
          console.error(e);
      }
  };

  const refreshProfile = async () => {
      if(!token) return;
      try {
        const p = await API.getProfile(token);
        setCredits(p.credits);
      } catch(e) {}
  };

  useEffect(() => {
      if (token) {
          refreshProfile();
          loadProjects(token);
      }
  }, [token, activeTab]);

  // --- Logic ---

  const triggerCreditError = () => {
      setHighlightCredits(true);
      setTimeout(() => setHighlightCredits(false), 800);
  };

  const handleBuyStars = (amount: number) => {
      // In a real app, this would call a payment API
      alert(`For MVP Demo: Please use Database to add credits manually or ask Admin.`);
      setActiveTab(AppTab.HOME); 
  };

  const startNewProject = () => {
    setCurrentProjectId(null);
    setOriginalImage(null);
    setCroppedImage(null);
    setRestoredImage(null);
    setGeneratedVideo(null);
    setVideoPrompts([]);
    setIsRestoring(false);
    setIsVideoLoading(false);
    setStep(AppStep.UPLOAD);
    setViewMode(ViewMode.ORIGINAL);
    setActiveTab(AppTab.HOME);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startNewProject(); 
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setOriginalImage(imageDataUrl);
      setStep(AppStep.CROP);
    }
  };

  const handleCropConfirm = async () => {
    if (!originalImage || !croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(originalImage, croppedAreaPixels);
      setCroppedImage(croppedBase64);
      setStep(AppStep.PREVIEW);
      setViewMode(ViewMode.ORIGINAL);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Backend Integration Methods ---

  const handleRestore = async () => {
    if (!croppedImage || !token) return;
    if (credits < 1) {
        triggerCreditError();
        return;
    }

    setCredits(prev => prev - 1);
    setIsRestoring(true);
    setStep(AppStep.WORKBENCH);
    setViewMode(ViewMode.RESTORED); 

    try {
      // Convert base64 cropped image back to blob for upload
      const res = await fetch(croppedImage);
      const blob = await res.blob();
      const file = new File([blob], "upload.jpg", { type: "image/jpeg" });

      const { project, creditsLeft } = await API.restorePhoto(token, file);
      
      setCredits(creditsLeft);
      setCurrentProjectId(project.id);
      setRestoredImage(project.restoredImage);
      setIsRestoring(false);
      
      // Refresh projects list
      loadProjects(token);

      // Generate Prompts
      const prompts = await API.generatePrompts(token, project.id);
      setVideoPrompts(prompts);

    } catch (error) {
      console.error("Restoration failed", error);
      alert("Failed to restore image. Ensure backend is running.");
      setIsRestoring(false);
      setViewMode(ViewMode.ORIGINAL);
      refreshProfile(); // Sync credits back in case of fail
    }
  };

  const handleGenerateVideo = async () => {
    if (!currentProjectId || !token || selectedPromptIndices.length === 0) return;
    
    const cost = 3; // Fixed cost for simplicity in MVP, or server logic
    if (credits < cost) {
        triggerCreditError();
        return;
    }

    setCredits(prev => prev - cost);
    setIsVideoLoading(true);
    setViewMode(ViewMode.VIDEO);

    try {
      const selected = selectedPromptIndices.map(i => videoPrompts[i]);
      const { videoUrl, creditsLeft } = await API.generateVideo(token, currentProjectId, selected);
      
      setCredits(creditsLeft);
      setGeneratedVideo(videoUrl);
      loadProjects(token);

    } catch (e: any) {
      console.error(e);
      alert(e.message || "Video generation failed.");
      refreshProfile();
    } finally {
      setIsVideoLoading(false);
    }
  };

  const toggleLike = async (projectId?: string) => {
      if (!token) return;
      const targetId = projectId || currentProjectId;
      if (!targetId) return;

      try {
          await API.toggleLikeProject(token, targetId);
          // Update local state for immediate feedback
          setProjects(prev => prev.map(p => p.id === targetId ? { ...p, isLiked: !p.isLiked } : p));
      } catch (e) {
          console.error("Like failed", e);
      }
  };

  const loadFromGalleryOrProject = (item: any) => {
      setCurrentProjectId(item.id);
      // Ensure we have full URLs from backend, or assume backend returns full paths
      // If backend returns relative paths (e.g. /uploads/...), you might need to prepend URL
      // For this demo, we assume the API Client normalized it or backend sends full URLs
      setOriginalImage(item.originalImage);
      setCroppedImage(item.originalImage); // Simplification, ideally store crop
      setRestoredImage(item.restoredImage);
      setGeneratedVideo(item.video || null);
      
      setStep(AppStep.WORKBENCH);
      setViewMode(item.video ? ViewMode.VIDEO : ViewMode.RESTORED);
      setActiveTab(AppTab.HOME);
      
      if (!item.video && item.restoredImage) {
           // If loaded from gallery and has no video, try to fetch prompts or generate
           // For MVP, we might need to re-trigger prompt gen or store prompts in DB
           // We'll leave empty or simple array for now
           setVideoPrompts(item.prompts ? JSON.parse(item.prompts) : []);
      }
  };

  const handleBack = () => {
    if (step === AppStep.CROP) {
        setStep(AppStep.UPLOAD);
        setOriginalImage(null);
    } else if (step === AppStep.PREVIEW) {
        setStep(AppStep.CROP);
        setCroppedImage(null);
    } else if (step === AppStep.WORKBENCH) {
        if (viewMode === ViewMode.VIDEO) {
            setViewMode(ViewMode.RESTORED);
        } else {
            setStep(AppStep.PREVIEW);
        }
    }
  };

  // --- Render Widgets (Navigation Bubbles) ---

  const renderNavWidgets = () => {
    if (step !== AppStep.WORKBENCH) return null;

    // Helper for bubble styles
    const bubbleClass = "relative z-30 flex flex-col items-center animate-in fade-in zoom-in duration-300 cursor-pointer group";
    const thumbClass = "w-14 h-14 rounded-xl overflow-hidden shadow-xl border-2 transition-all group-hover:scale-105 group-active:scale-95";

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center z-30 pt-20 pb-40">
            {/* TOP WIDGET: Original */}
            <div className="pointer-events-auto">
                {/* Only show Original bubble if NOT in Video mode. In Video mode we only want to go back to Restored. */}
                {viewMode !== ViewMode.ORIGINAL && viewMode !== ViewMode.VIDEO && (
                    <div onClick={() => setViewMode(ViewMode.ORIGINAL)} className={bubbleClass}>
                        <div className={`${thumbClass} border-zinc-700 bg-black`}>
                            {originalImage && <img src={originalImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="Original" />}
                        </div>
                        <div className="mt-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-black/50 px-2 rounded-full backdrop-blur-sm">Original</div>
                    </div>
                )}
                {/* Secondary Top (Photo from Video) - Shown ONLY when in Video Mode */}
                {viewMode === ViewMode.VIDEO && (
                    <div onClick={() => setViewMode(ViewMode.RESTORED)} className={`${bubbleClass}`}>
                        <div className={`${thumbClass} w-10 h-10 border-zinc-700 bg-zinc-900`}>
                            {restoredImage && <img src={restoredImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="Photo" />}
                        </div>
                        <div className="mt-1 text-[9px] font-bold text-zinc-300 uppercase tracking-widest bg-black/50 px-2 rounded-full backdrop-blur-sm">Editor</div>
                    </div>
                )}
            </div>

            {/* BOTTOM WIDGET */}
            <div className="pointer-events-auto">
                 {/* Show Restored Bubble if in Original Mode */}
                 {viewMode === ViewMode.ORIGINAL && (restoredImage || isRestoring) && (
                     <div onClick={() => setViewMode(ViewMode.RESTORED)} className={bubbleClass}>
                         <div className={`${thumbClass} border-green-500/50 bg-zinc-900`}>
                             {isRestoring ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-green-500"/></div> : 
                             <img src={restoredImage!} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />}
                         </div>
                         <div className="mt-1 text-[9px] font-bold text-green-400 uppercase tracking-widest bg-black/50 px-2 rounded-full backdrop-blur-sm">Result</div>
                     </div>
                 )}
                 {/* Show Video Bubble if in Restored Mode */}
                 {viewMode === ViewMode.RESTORED && (generatedVideo || isVideoLoading) && (
                     <div onClick={() => setViewMode(ViewMode.VIDEO)} className={bubbleClass}>
                         <div className={`${thumbClass} border-purple-500/50 bg-zinc-900`}>
                             {isVideoLoading ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500"/></div> : 
                             <div className="w-full h-full bg-black flex items-center justify-center opacity-80 group-hover:opacity-100"><Play size={20} className="text-purple-400 fill-purple-400"/></div>}
                         </div>
                         <div className="mt-1 text-[9px] font-bold text-purple-400 uppercase tracking-widest bg-black/50 px-2 rounded-full backdrop-blur-sm">Video</div>
                     </div>
                 )}
            </div>
        </div>
    );
  }

  const renderContent = () => {
      // 1. Upload Phase
      if (step === AppStep.UPLOAD) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in zoom-in duration-500">
                <div className="space-y-2">
                    <h2 className="text-4xl font-bold tracking-tight text-white">Restore<br/>Memories</h2>
                    <p className="text-zinc-400 text-lg">AI-powered vintage photo enhancement</p>
                </div>
                <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-64 h-64 bg-zinc-900/30 border-2 border-dashed border-zinc-700 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-800/30 hover:border-zinc-500 transition-all group backdrop-blur-sm"
                >
                <div className="p-5 bg-zinc-800 rounded-full group-hover:scale-110 transition-transform shadow-xl">
                    <Upload size={32} className="text-zinc-300" />
                </div>
                <span className="text-zinc-500 font-medium">Tap to Upload</span>
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange}/>
            </div>
          );
      }

      // 2. Crop Phase
      if (step === AppStep.CROP && originalImage) {
        return (
            <div className="flex-1 flex flex-col h-full relative">
                <div className="flex-1 relative bg-black/50">
                    <Cropper image={originalImage} crop={crop} zoom={zoom} aspect={3/4} onCropChange={setCrop} onCropComplete={(a, b) => setCroppedAreaPixels(b)} onZoomChange={setZoom}/>
                </div>
                <div className="h-auto shrink-0 p-6 bg-zinc-950 flex flex-col gap-4 z-40">
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <Scissors size={16} />
                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"/>
                    </div>
                    <Button onClick={handleCropConfirm}>Crop Image</Button>
                </div>
            </div>
        )
      }

      // 3. Preview Phase
      if (step === AppStep.PREVIEW && croppedImage) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 animate-in fade-in duration-300">
                <div className="relative flex-1 w-full max-h-[60vh] rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-900">
                    <img src={croppedImage} className="w-full h-full object-contain grayscale sepia-[0.3]" alt="Preview"/>
                    <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent">
                        {['Denoise', 'Colorize', 'Sharpen'].map(t => <span key={t} className="px-3 py-1 bg-white/10 backdrop-blur border border-white/20 rounded-full text-[10px] uppercase font-bold tracking-wider">{t}</span>)}
                    </div>
                </div>
                <Button className="w-full max-w-sm shrink-0" onClick={handleRestore}>
                    <Wand2 size={20} className="animate-pulse" /> Restore (1 Star)
                </Button>
            </div>
          )
      }

      // 4. Workbench Phase
      if (step === AppStep.WORKBENCH) {
          
          // --- VIEW: ORIGINAL ---
          if (viewMode === ViewMode.ORIGINAL) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="relative flex-1 w-full rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl bg-black">
                        {originalImage && <img src={originalImage} className="w-full h-full object-contain opacity-80" alt="Original"/>}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-zinc-700">ORIGINAL</div>
                    </div>
                    <div className="h-20 shrink-0"></div>
                </div>
              );
          }

          // --- VIEW: RESTORED ---
          if (viewMode === ViewMode.RESTORED) {
              if (isRestoring) {
                return (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
                            <Wand2 size={32} className="absolute inset-0 m-auto text-white animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold animate-pulse">Restoring...</h3>
                    </div>
                );
              }

              const isLiked = projects.find(p => p.id === currentProjectId)?.isLiked;

              return (
                <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
                    {/* Image Area */}
                    <div className="flex-1 relative min-h-0 bg-zinc-900/50">
                        <img src={restoredImage!} alt="Restored" className="w-full h-full object-contain" />
                        
                        <div className="absolute top-20 right-4 flex flex-col gap-3 z-50">
                            <button onClick={() => toggleLike()} className={`p-3 rounded-full backdrop-blur-md shadow-lg border border-white/10 transition-colors ${isLiked ? 'bg-red-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}>
                                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                            </button>
                            <a href={restoredImage!} download={`restored_${Date.now()}`} className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 border border-white/10 shadow-lg">
                                <Download size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Generator Controls */}
                    <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 p-4 pb-6 z-40">
                        <div className="max-w-md mx-auto">
                            <div className="flex items-center gap-2 mb-3">
                                <Video size={16} className="text-purple-400" />
                                <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-400">Generate Animation</h3>
                            </div>

                            {isVideoLoading ? (
                                <div className="h-12 flex items-center justify-center bg-zinc-900 rounded-xl text-zinc-400 gap-3 text-sm border border-zinc-800">
                                    <Loader2 size={16} className="animate-spin" /> Generating in background...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {videoPrompts.length > 0 ? (
                                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                {videoPrompts.map((p, idx) => {
                                                    const isSelected = selectedPromptIndices.includes(idx);
                                                    return (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => {
                                                                if (isSelected) setSelectedPromptIndices(prev => prev.filter(i => i !== idx));
                                                                else setSelectedPromptIndices(prev => [...prev, idx]);
                                                            }}
                                                            className={`whitespace-nowrap text-xs px-3 py-2 rounded-lg border transition-all ${isSelected ? 'bg-purple-500 text-white border-purple-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                                                        >
                                                            {isSelected && <CheckCircle2 size={10} className="inline mr-1 fill-white text-purple-500"/>}
                                                            {p}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                    ) : (
                                        <div className="h-8 flex items-center justify-center text-xs text-zinc-600 italic">Reading image context...</div>
                                    )}

                                    <Button 
                                            size="sm"
                                            disabled={selectedPromptIndices.length === 0}
                                            onClick={handleGenerateVideo}
                                            className="w-full text-sm"
                                    >
                                        Generate Video (-{selectedPromptIndices.length * 3} Stars)
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              );
          }

          // --- VIEW: VIDEO ---
          if (viewMode === ViewMode.VIDEO) {
             const isLiked = projects.find(p => p.id === currentProjectId)?.isLiked;

             if (isVideoLoading) {
                 return (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                        <Video size={32} className="absolute inset-0 m-auto text-purple-500 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold">Generating Video...</h3>
                        <p className="text-zinc-500 text-sm">Please wait ~10-15 seconds</p>
                    </div>
                 )
             }
             
             return (
                <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
                     <div className="flex-1 relative min-h-0 bg-black">
                         {generatedVideo && <video src={generatedVideo} autoPlay loop muted playsInline className="w-full h-full object-contain" />}
                         
                         <div className="absolute top-20 right-4 flex flex-col gap-3 z-50">
                            <a href={generatedVideo!} download={`video_${Date.now()}.mp4`} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 border border-white/10 shadow-xl transition-transform active:scale-95">
                                <Download size={20} />
                            </a>
                            <button onClick={() => toggleLike()} className={`p-3 rounded-full backdrop-blur-md shadow-xl border border-white/10 transition-colors ${isLiked ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}>
                                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                            </button>
                        </div>
                     </div>
                     
                     <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 p-4 pb-8 z-40 flex justify-center">
                        <Button variant="secondary" onClick={() => setViewMode(ViewMode.RESTORED)} className="w-full max-w-sm">
                            <ArrowLeft size={16}/> Back to Editor
                        </Button>
                     </div>
                </div>
             )
          }
      }

      return null;
  }

  // If no token, show Auth Screen
  if (!token) {
      return (
        <div className="h-screen w-screen bg-zinc-950 text-white relative overflow-hidden flex flex-col">
            <div className="noise-bg" />
            <div className="noise-overlay" />
            <AuthScreen onLogin={handleLogin} />
        </div>
      )
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white relative overflow-hidden flex flex-col">
      <div className="noise-bg" />
      <div className="noise-overlay" />

      <Header 
        showBack={step !== AppStep.UPLOAD && activeTab === AppTab.HOME}
        onBack={handleBack}
        onMenu={() => setIsMenuOpen(true)}
        credits={credits}
        onAddCredits={() => setActiveTab(AppTab.PLANS)}
        highlightCredits={highlightCredits}
        onLogout={handleLogout}
      />

      <Sidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        activeTab={activeTab}
        onSelectTab={(tab) => {
            setActiveTab(tab);
        }}
        onNewProject={startNewProject}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === AppTab.HOME ? (
            <>
                {renderNavWidgets()}
                {renderContent()}
            </>
        ) : activeTab === AppTab.PLANS ? (
            <PlansView onBuy={handleBuyStars} />
        ) : activeTab === AppTab.GALLERY ? (
            <GridGallery 
                items={projects.filter(p => p.isLiked)} 
                onLoadItem={loadFromGalleryOrProject} 
                title="Liked Gallery" 
                emptyMsg="No liked photos yet." 
                onLikeToggle={toggleLike}
            />
        ) : (
            <GridGallery 
                items={projects} 
                onLoadItem={loadFromGalleryOrProject} 
                title="My Projects" 
                emptyMsg="No restorations yet." 
                onLikeToggle={toggleLike}
            />
        )}
      </main>
    </div>
  );
}