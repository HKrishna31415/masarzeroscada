
import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, Loader2, Globe, Activity, Cpu, AlertCircle, Terminal, Wifi } from 'lucide-react';
import { t } from '../utils/i18n';

interface LoginViewProps {
    onLogin: (clientId: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [bootStatus, setBootStatus] = useState('');
    const [email, setEmail] = useState('admin@sasco.com.sa');
    const [password, setPassword] = useState('12345678');
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    
    // Helper to get lang from local storage since we aren't inside the main app layout yet
    const lang = (localStorage.getItem('masarzero_lang') as 'en'|'ar') || 'en';

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        performLogin(email, password);
    };

    const performLogin = (u: string, p: string) => {
        setError('');
        setIsLoading(true);
        
        // Cinematic Boot Sequence Steps
        const steps = [
            { msg: t('authenticating', lang), delay: 0 },
            { msg: lang === 'ar' ? 'جاري التحقق من التشفير...' : 'Verifying Encryption Keys...', delay: 800 },
            { msg: lang === 'ar' ? 'جاري الاتصال بالخادم الآمن...' : 'Establishing Secure Uplink...', delay: 1600 },
            { msg: lang === 'ar' ? 'تم منح الصلاحية' : 'Access Granted', delay: 2400 }
        ];

        let currentStep = 0;

        const runStep = () => {
            if (currentStep < steps.length) {
                setBootStatus(steps[currentStep].msg);
                setTimeout(() => {
                    currentStep++;
                    runStep();
                }, 800);
            } else {
                // Final Check
                const user = u.trim();
                const pass = p.trim();
                
                if (user.toLowerCase() === 'admin@sasco.com.sa' && pass === '12345678') {
                    onLogin('sasco');
                } else if (user.toLowerCase() === 'admin@bapcoenergies.com' && pass === 'B@PC0123456789') {
                    onLogin('bapco');
                } else if (user === 'GECO' && pass === 'GECO') {
                    onLogin('geco');
                } else if (user.toLowerCase() === 'admin@masarzero.com' && pass === 'masterkey') {
                    onLogin('masarzero');
                } else {
                    setIsLoading(false);
                    setBootStatus('');
                    setError(t('invalidCreds', lang));
                }
            }
        };

        runStep();
    }

    return (
        <div 
            className="min-h-screen w-full bg-[#050b14] flex items-center justify-center relative overflow-hidden font-sans selection:bg-emerald-500/30"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-scan { animation: scan 8s linear infinite; }
                .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
                .bg-grid-pattern {
                    background-size: 40px 40px;
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                }
            `}</style>
            
            {/* --- Animated Background Layer --- */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[#050b14]"></div>
                
                {/* Dynamic Grid */}
                <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
                
                {/* Moving Orbs */}
                <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[100px] transition-all duration-[3000ms] animate-pulse-glow ${mounted ? 'translate-x-0' : '-translate-x-20'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[100px] transition-all duration-[3000ms] animate-pulse-glow delay-1000 ${mounted ? 'translate-x-0' : 'translate-x-20'}`}></div>
                
                {/* Scanning Line Effect */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent blur-sm animate-scan z-0 pointer-events-none"></div>
            </div>

            <div className={`relative z-10 w-full max-w-[420px] p-6 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                
                {/* Header Brand Area */}
                <div className="text-center mb-10 relative">
                    <div className="flex justify-center mb-6 relative group animate-float">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
                        <img 
                            src="https://i.ibb.co/Lzf6K7nG/masarzerologo.png" 
                            alt="MasarZero Logo" 
                            className="h-48 w-auto relative z-10 object-contain drop-shadow-2xl" 
                        />
                    </div>
                    
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 drop-shadow-md">{t('loginTitle', lang)}</h1>
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-widest">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {t('loginSubtitle', lang)}
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-[#0f172a]/70 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden relative group">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500"></div>
                    
                    <div className="p-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5 group/field">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within/field:text-emerald-500">{t('operatorId', lang)}</label>
                                <div className="relative group/input">
                                    <div className={`absolute inset-y-0 flex items-center pointer-events-none transition-colors group-focus-within/input:text-emerald-500 ${error ? 'text-rose-500' : 'text-slate-500'} ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                        <User size={18} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        className={`block w-full py-3 bg-[#020617]/50 border rounded-lg text-sm text-white placeholder-slate-600 focus:ring-1 outline-none transition-all ${error ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 hover:border-slate-600'} ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                        placeholder="Enter your ID"
                                        dir="ltr"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group/field">
                                <div className="flex justify-between ml-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-focus-within/field:text-emerald-500">{t('accessKey', lang)}</label>
                                </div>
                                <div className="relative group/input">
                                    <div className={`absolute inset-y-0 flex items-center pointer-events-none transition-colors group-focus-within/input:text-emerald-500 ${error ? 'text-rose-500' : 'text-slate-500'} ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                        <Lock size={18} />
                                    </div>
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        className={`block w-full py-3 bg-[#020617]/50 border rounded-lg text-sm text-white placeholder-slate-600 focus:ring-1 outline-none transition-all ${error ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 hover:border-slate-600'} ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                        placeholder="••••••••"
                                        dir="ltr"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 animate-in slide-in-from-top-1">
                                    <AlertCircle size={14} className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className={`w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 group relative overflow-hidden active:scale-[0.98] disabled:opacity-80 disabled:cursor-wait`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <div className="relative flex items-center gap-2">
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span className="animate-pulse">{bootStatus}</span>
                                            </>
                                        ) : (
                                            <>
                                                {t('initSession', lang)} <ArrowRight size={18} className={`transition-transform ${lang === 'ar' ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`} />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Card Footer */}
                    <div className="bg-[#020617]/50 p-4 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500 backdrop-blur-sm">
                        <div className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-help">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span>{t('encrypted', lang)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Globe size={12} />
                            <span>Secure Node</span>
                        </div>
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="mt-8 flex justify-center gap-6 text-[10px] text-slate-600 uppercase tracking-widest font-bold font-mono">
                    <span className="flex items-center gap-1.5 hover:text-slate-400 cursor-pointer transition-colors"><Activity size={10}/> {t('statusNormal', lang)}</span>
                    <span className="flex items-center gap-1.5 hover:text-slate-400 cursor-pointer transition-colors"><Cpu size={10}/> v2.4.0 (Stable)</span>
                </div>
            </div>
        </div>
    );
};
