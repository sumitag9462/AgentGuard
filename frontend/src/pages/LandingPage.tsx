import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShieldCheck } from '@phosphor-icons/react';

// Components
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { PipelineSection } from '../components/landing/PipelineSection';
import { ScenarioSection } from '../components/landing/ScenarioSection';
import { WowSection } from '../components/landing/WowSection';
import { ScorecardSection } from '../components/landing/ScorecardSection';
import { CTASection, Footer } from '../components/landing/CTASection';

export default function LandingPage() {
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 100], ['rgba(9,9,11,0)', 'rgba(9,9,11,0.8)']);
  const navBorder = useTransform(scrollY, [0, 100], ['rgba(39,39,42,0)', 'rgba(39,39,42,1)']);
  const navBackdrop = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(16px)']);

  return (
    <div className="min-h-screen bg-canvas text-white overflow-x-hidden selection:bg-accent selection:text-white">
      
      {/* Navigation */}
      <motion.nav 
        style={{ backgroundColor: navBg, borderBottomColor: navBorder, backdropFilter: navBackdrop, WebkitBackdropFilter: navBackdrop }}
        className="fixed top-0 w-full z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b transition-colors duration-300"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" className="text-accent text-2xl" />
          <span className="font-semibold tracking-tighter text-lg">AgentEval</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#problem" className="hidden md:block text-content-secondary hover:text-white transition-colors">Platform</a>
          <a href="#" className="hidden md:block text-content-secondary hover:text-white transition-colors">Methodology</a>
          <a href="#" className="hidden md:block text-content-secondary hover:text-white transition-colors">Docs</a>
          <Link to="/app" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-1.5 rounded-full transition-colors text-xs uppercase tracking-widest font-bold">
            Dashboard →
          </Link>
        </div>
      </motion.nav>

      <main>
        <HeroSection />
        <ProblemSection />
        <PipelineSection />
        <ScenarioSection />
        <WowSection />
        <ScorecardSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
