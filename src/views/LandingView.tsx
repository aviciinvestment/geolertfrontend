import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Camera, MapPin, Zap, ArrowRight, Sun, Moon, Play, Users } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-pink-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ACHIV</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-white/10 dark:hover:bg-white/10 bg-black/5 dark:bg-white/5 transition-colors"
            >
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => navigate(user ? '/app' : '/login')}
              className="hidden sm:flex items-center justify-center px-5 py-2.5 rounded-full font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {user ? 'Go to App' : 'Sign In'}
            </button>
            <button 
              onClick={() => navigate(user ? '/app' : '/login')}
              className="bg-foreground text-background px-6 py-2.5 rounded-full font-medium shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {user ? 'Open App' : 'Get Started'}
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Orbs */}
        <motion.div 
          style={{ y }}
          className="absolute top-20 left-[-10%] w-[500px] h-[500px] rounded-full bg-pink-500/20 blur-[120px] pointer-events-none"
        />
        <motion.div 
          style={{ y: useTransform(scrollYProgress, [0, 1], ['0%', '-50%']) }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[150px] pointer-events-none"
        />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto flex flex-col items-center"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 font-medium text-sm mb-8 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Emergency Network
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              Real-Time Intelligence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
                Life-Saving Action.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-2xl leading-relaxed font-medium">
              Empowering citizens and emergency responders with live, AI-verified video streams to coordinate rapidly during fires, terrorism, and natural disasters.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button 
                onClick={() => navigate(user ? '/app' : '/login')}
                className="w-full sm:w-auto px-8 py-4 bg-foreground text-background rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-2"
              >
                {user ? 'Open ACHIV' : 'Join the Network'} <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-background border-2 border-border text-foreground rounded-full font-bold text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                <Play className="w-5 h-5" /> Watch Demo
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* iPhone Mockup Section */}
      <section className="py-20 px-6 relative z-20">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative keep-dark rounded-[40px] border-[12px] border-black shadow-2xl overflow-hidden aspect-[9/16] sm:aspect-video bg-zinc-900"
          >
            {/* Simulated UI inside mockup */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl sm:text-2xl">Live Incident Reported</h3>
                  <p className="text-white/70">Downtown Sector • 0.2 miles away</p>
                </div>
              </div>
              <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-green-400 font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" /> AI Verified
                  </span>
                  <span className="text-white/50 text-sm">Just now</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 10, ease: "linear" }}
                    className="h-full bg-red-500"
                  />
                </div>
                <p className="text-white/50 text-sm mt-3 text-center">Broadcasting 10s clip to authorities...</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">How ACHIV Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">A seamless flow from the moment an incident is captured to the second authorities arrive.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Camera,
                title: "1. Capture",
                desc: "Record a quick 10-second video of the incident using the mobile app. The camera is instantly ready.",
                color: "text-blue-500",
                bg: "bg-blue-500/10"
              },
              {
                icon: Users,
                title: "2. Community Validation",
                desc: "Community members and eyewitnesses capture, post, and engage with incidents happening in their community for localized validation.",
                color: "text-amber-500",
                bg: "bg-amber-500/10"
              },
              {
                icon: Shield,
                title: "3. AI Verification",
                desc: "Our AI instantly analyzes the video to verify the threat level, filtering out noise and preventing misinformation.",
                color: "text-violet-500",
                bg: "bg-violet-500/10"
              },
              {
                icon: MapPin,
                title: "4. Broadcast",
                desc: "Geolocation alerts are sent immediately to people in the vicinity and routed directly to relevant authorities.",
                color: "text-pink-500",
                bg: "bg-pink-500/10"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="bg-card border border-border p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all"
              >
                <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-background mb-8 leading-tight">
            Be the First to Know.<br/>Be the First to Help.
          </h2>
          <p className="text-xl text-background/70 mb-12 max-w-2xl mx-auto">
            Join thousands of citizens and responders making their communities safer through real-time verified intelligence.
          </p>
          <button 
            onClick={() => navigate(user ? '/app' : '/login')}
            className="px-10 py-5 bg-background text-foreground rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
          >
            {user ? 'Open ACHIV' : 'Create Free Account'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border text-center">
        <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" /> ACHIV &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingView;
