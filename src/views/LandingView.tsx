import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Brain, Car, Radio, Eye, Siren, Map } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LogoMark = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
    <defs>
      <linearGradient id="nav-shield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e40af"/>
        <stop offset="100%" stopColor="#3b82f6"/>
      </linearGradient>
    </defs>
    <path d="M16 2L4 8v8c0 7.2 5.1 13.9 12 16 6.9-2.1 12-8.8 12-16V8L16 2z" fill="url(#nav-shield)"/>
    <circle cx="16" cy="11.5" r="3" fill="white"/>
    <path d="M10.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="white" opacity="0.9"/>
    <circle cx="8" cy="11" r="1.2" fill="#06b6d4"/>
    <circle cx="24" cy="11" r="1.2" fill="#06b6d4"/>
    <circle cx="9" cy="18" r="1" fill="#22d3ee"/>
    <circle cx="23" cy="18" r="1" fill="#22d3ee"/>
    <line x1="8" y1="11" x2="13" y2="11.5" stroke="#06b6d4" strokeWidth="0.6" opacity="0.7"/>
    <line x1="24" y1="11" x2="19" y2="11.5" stroke="#06b6d4" strokeWidth="0.6" opacity="0.7"/>
    <line x1="9" y1="18" x2="13.5" y2="16" stroke="#22d3ee" strokeWidth="0.5" opacity="0.5"/>
    <line x1="23" y1="18" x2="18.5" y2="16" stroke="#22d3ee" strokeWidth="0.5" opacity="0.5"/>
  </svg>
);

const publicImages = [
  '/image.png',
  '/image%20copy.png',
  '/image%20copy%202.png',
  '/image%20copy%203.png',
  '/image%20copy%204.png',
  '/image%20copy%205.png',
  '/image%20copy%206.png',
  '/image%20copy%207.png',
  '/image%20copy%208.png',
  '/image%20copy%209.png',
];

const FloatingBackground = () => {
  const stepX = 370;
  const stepY = 260;
  const imgW = 520;
  const imgH = 360;
  const tiles: { img: string; x: number; y: number }[] = [];
  for (let j = -1; j <= 3; j++) {
    for (let i = -1; i <= 5; i++) {
      const idx = (((i + j) % publicImages.length) + publicImages.length) % publicImages.length;
      tiles.push({ img: publicImages[idx], x: i * stepX, y: j * stepY });
    }
  }
  return (
    <div className="absolute inset-0 bg-zinc-900">
      {/* Dark base so even the brief pre-load moment is never "blank" */}
      {tiles.map((t, idx) => (
        <img
          key={idx}
          src={t.img}
          alt=""
          loading="eager"
          className="float-img absolute object-cover opacity-95"
          style={{ width: imgW, height: imgH, left: t.x, top: t.y, filter: 'brightness(1.35) saturate(1.15)' }}
        />
      ))}
    </div>
  );
};

const NetworkNode = ({ icon: Icon, imgSrc, label, sublabel, color, delay }: {
  icon?: React.ElementType; imgSrc?: string; label: string; sublabel: string; color: string; delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="flex flex-col items-center gap-3 relative z-10"
  >
    <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${color} flex items-center justify-center shadow-xl overflow-hidden`}>
      {imgSrc ? (
        <img src={imgSrc} alt={label} className="w-full h-full object-cover" />
      ) : (
        Icon && <Icon className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
      )}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: delay + 0.5 }}
        className={`absolute inset-0 rounded-2xl ${color} opacity-30 pointer-events-none`}
      />
    </div>
    <div className="text-center">
      <p className="text-foreground font-bold text-sm sm:text-base">{label}</p>
      <p className="text-muted-foreground text-xs sm:text-sm">{sublabel}</p>
    </div>
  </motion.div>
);

const Typewriter = ({ lines, className }: { lines: string[]; className?: string }) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const line = lines[lineIdx];
    if (!deleting && charIdx === line.length) {
      const t = setTimeout(() => {
        if (lineIdx === lines.length - 1) setDeleting(true);
        else setLineIdx((i) => i + 1);
      }, 900);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      const t = setTimeout(() => {
        setDeleting(false);
        setCharIdx(0);
        setLineIdx(0);
      }, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCharIdx((c) => (deleting ? c - 1 : c + 1));
    }, deleting ? 25 : 75);
    return () => clearTimeout(t);
  }, [charIdx, deleting, lineIdx, lines]);

  return (
    <span className={className}>
      {lines.slice(0, lineIdx + 1).map((ln, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {i === lineIdx ? ln.slice(0, charIdx) : ln}
        </React.Fragment>
      ))}
      <span className="inline-block w-[3px] h-[0.9em] align-middle bg-current ml-1 animate-pulse" />
    </span>
  );
};

const LandingView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5">
            <LogoMark className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight">ACHIV</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 bg-black/5 dark:bg-white/5 transition-colors">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={() => navigate(user ? '/app' : '/login')} className="hidden sm:flex items-center justify-center px-5 py-2.5 rounded-full font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              {user ? 'Go to App' : 'Sign In'}
            </button>
            <button onClick={() => navigate(user ? '/app' : '/login')} className="bg-foreground text-background px-6 py-2.5 rounded-full font-medium shadow-xl hover:scale-105 active:scale-95 transition-all">
              {user ? 'Open App' : 'Get Started'}
            </button>
          </motion.div>
        </div>
      </nav>

      {/* SECTION 1: Flowing images with text overlaid at the bottom */}
      <section className="relative overflow-hidden">
        <div className="relative w-[100vw] ml-[calc(50%-50vw)] h-[540px] sm:h-[640px] overflow-hidden">
          <FloatingBackground />

          {/* Darker bottom scrim so the white text stands out against the bright photo papers */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 sm:h-72 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

          {/* Text overlaid on the bottom of the image strip */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 pb-8 sm:pb-10 px-6 text-center z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 font-medium text-xs sm:text-sm mb-3 border border-amber-500/30 backdrop-blur-sm">
                <Eye className="w-3.5 h-3.5" /> Be the Journalist
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                What if you are the{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
                  journalist
                </span>{' '}
                who disseminates incidents close to you?
              </h1>
              <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                You capture it and it reaches the appropriate authority in seconds.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Network Flow */}
      <section className="py-28 px-6 bg-black/[0.02] dark:bg-white/[0.02] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }} className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 font-medium text-sm mb-6 border border-blue-500/20">
              <Radio className="w-4 h-4" /> Connected Response
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              From Citizen to Response.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">In Seconds.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">A closed-loop network where every citizen report triggers AI analysis, authority dispatch, rapid response, and community feedback — all in real-time.</p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-px z-0">
              <svg className="w-full h-24 -mt-12" preserveAspectRatio="none">
                {[0, 1, 2, 3].map((i) => (
                  <g key={i}>
                    <line x1={`${10 + i * 20}%`} y1="48" x2={`${30 + i * 20}%`} y2="48" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="6 4" opacity="0.4" />
                    <motion.circle animate={{ cx: [`${10 + i * 20}%`, `${30 + i * 20}%`] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'linear' }} cy="48" r="3" fill="#06b6d4" style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.8))' }} />
                  </g>
                ))}
                <defs><linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
              </svg>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-4 relative z-10">
              <NetworkNode imgSrc="/android-phone-camera.svg" label="Citizen" sublabel="Captures incident" color="bg-gradient-to-br from-amber-500 to-orange-600" delay={0} />
              <NetworkNode icon={Brain} label="AI Analysis" sublabel="Verifies & classifies" color="bg-gradient-to-br from-blue-600 to-cyan-500" delay={0.15} />
              <NetworkNode icon={Car} label="Authority" sublabel="Receives verified alert" color="bg-gradient-to-br from-slate-600 to-slate-800" delay={0.3} />
              <NetworkNode icon={Siren} label="Response" sublabel="Teams dispatched" color="bg-gradient-to-br from-red-500 to-red-700" delay={0.45} />
              <NetworkNode icon={Map} label="Feedback" sublabel="Community updates" color="bg-gradient-to-br from-green-500 to-emerald-600" delay={0.6} />
            </div>
            <div className="lg:hidden flex flex-col items-center gap-0 -my-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <motion.div animate={{ height: [0, 40, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} className="w-0.5 bg-gradient-to-b from-blue-500 to-cyan-500 opacity-40" />
                </div>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 0.6 }} className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-2xl shadow-lg">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                <Radio className="w-5 h-5 text-cyan-500" />
              </motion.div>
              <span className="text-sm font-medium text-muted-foreground">Closed-loop system — feedback informs future AI detection, making the network smarter over time</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 px-6 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-8 leading-tight">
            <Typewriter lines={['Be the First to Know.', 'Be the First to Help.']} />
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">Join thousands of citizens and responders making their communities safer through real-time verified intelligence.</p>
          <button onClick={() => navigate(user ? '/app' : '/login')} className="px-10 py-5 bg-white text-black rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl">
            {user ? 'Open ACHIV' : 'Create Free Account'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border text-center">
        <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
          <LogoMark className="w-5 h-5" /> ACHIV &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingView;
