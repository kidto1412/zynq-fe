import React from 'react';
import { ZynqLogo } from '@/shared/components/ui/zynq-logo';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '../stores/useAuthStore';
import { 
  ShieldCheck, 
  Zap, 
  Share2, 
  Lock, 
  ArrowRight,
  UserPlus,
  LogIn,
  WifiOff
} from 'lucide-react';

export const AuthGate: React.FC = () => {
  const { setAuthModalOpen, enableHotspotGuestMode } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-2 py-6 text-center max-w-lg mx-auto">
      {/* Dynamic Animated Logo Header */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 blur-2xl rounded-full" />
        <ZynqLogo size={80} animatePulse={true} className="relative z-10" />
      </div>

      {/* Title & Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-3">
        <Lock className="w-3.5 h-3.5" />
        <span>Autentikasi Diperlukan</span>
      </div>

      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white mb-2">
        Akses Mesh Terproteksi
      </h1>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        Masuk atau daftar akun untuk menghubungkan perangkat Anda, mengaktifkan transfer WebRTC P2P direct, dan sinkronisasi clipboard terenkripsi.
      </p>

      {/* Main Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mb-4">
        <Button
          onClick={() => setAuthModalOpen(true, 'login')}
          className="flex-1 bg-gradient-to-r from-primary to-cyan-400 hover:from-primary/90 hover:to-cyan-400/90 text-slate-950 font-headline font-bold h-12 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          <span>Masuk</span>
          <ArrowRight className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => setAuthModalOpen(true, 'register')}
          variant="outline"
          className="flex-1 bg-surface-container/60 hover:bg-surface-container-high border-white/[0.1] text-white font-headline font-semibold h-12 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-primary" />
          <span>Daftar Akun</span>
        </Button>
      </div>

      {/* Offline Hotspot Direct Mode Action */}
      <div className="w-full max-w-xs mb-8">
        <button
          onClick={() => enableHotspotGuestMode()}
          className="w-full py-2.5 px-3 rounded-xl border border-white/[0.08] hover:border-emerald-400/40 bg-surface-container-low hover:bg-surface-container text-xs font-medium text-slate-300 hover:text-emerald-300 transition-all flex items-center justify-center gap-2 group"
        >
          <WifiOff className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Offline Hotspot Direct (0 Kuota / PWA)</span>
        </button>
      </div>

      {/* Core Ecosystem Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
        <div className="p-3.5 rounded-xl bg-surface-container/50 border border-white/[0.04] flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-headline font-bold text-xs text-white">Direct P2P Speed</span>
          <span className="text-[11px] text-slate-400 leading-normal">
            Streaming transfer file tanpa limit bandwidth cloud.
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container/50 border border-white/[0.04] flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Share2 className="w-4 h-4" />
          </div>
          <span className="font-headline font-bold text-xs text-white">Universal Clipboard</span>
          <span className="text-[11px] text-slate-400 leading-normal">
            Salin teks di satu device, langsung tempel di device lain.
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container/50 border border-white/[0.04] flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-headline font-bold text-xs text-white">E2EE Privacy</span>
          <span className="text-[11px] text-slate-400 leading-normal">
            Data terenkripsi dan hanya terikat pada akun Anda.
          </span>
        </div>
      </div>
    </div>
  );
};
