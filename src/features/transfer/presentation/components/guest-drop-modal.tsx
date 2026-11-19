import React from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { signalingService } from '@/shared/services/signaling-service';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';
import { getLocalDeviceInfo } from '@/shared/lib/device-detector';
import QRCode from 'qrcode';
import {
  Link2,
  Copy,
  Check,
  Clock,
  Send,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface GuestDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProModal?: () => void;
}

export const GuestDropModal: React.FC<GuestDropModalProps> = ({
  isOpen,
  onClose,
  onOpenProModal,
}) => {
  const user = useAuthStore((state) => state.user);
  const isPro = user?.plan === 'PRO_LIFETIME';

  const [customSlug, setCustomSlug] = React.useState('');
  const [createdDropUrl, setCreatedDropUrl] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(600);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [guestConnected, setGuestConnected] = React.useState<string | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Generate default slug recommendation based on user name
  React.useEffect(() => {
    if (isOpen && !createdDropUrl) {
      const sanitizedName = (user?.name || 'fast')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 15);
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      setCustomSlug(`${sanitizedName}-${randomSuffix}`);
      setErrorMessage(null);
    }
  }, [isOpen, user, createdDropUrl]);

  // Live countdown timer for active 10-minute link
  React.useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Render QR Code once link is generated
  React.useEffect(() => {
    if (createdDropUrl && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        createdDropUrl,
        {
          width: 180,
          margin: 1,
          color: {
            dark: '#03202f',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('[Drop QR] Render failed:', err);
        }
      );
    }
  }, [createdDropUrl]);

  // Listen for guest connection to this drop link
  React.useEffect(() => {
    if (!isOpen || !createdDropUrl) return;

    const onPeer = (payload: any) => {
      if (payload.isDropLink || payload.peer) {
        setGuestConnected(payload.peer?.deviceName || 'Klien Eksternal');
      }
    };

    signalingService.onPeerJoined(onPeer);
  }, [isOpen, createdDropUrl]);

  const handleCreate = async () => {
    if (!isPro) {
      onClose();
      onOpenProModal?.();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const localDevice = getLocalDeviceInfo();
      const res = await signalingService.createDropLink({
        slug: customSlug,
        deviceName: `${user?.name || localDevice.deviceName} (Drop Host)`,
        platform: localDevice.platform,
        publicKey: localDevice.deviceId,
        isPro: true,
      });

      const fullUrl = `${window.location.origin}${res.dropUrl}`;
      setCreatedDropUrl(fullUrl);
      const expDate = new Date(res.expiresAt);
      setExpiresAt(expDate);
      setSecondsRemaining(Math.max(0, Math.floor((expDate.getTime() - Date.now()) / 1000)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat Guest Drop Link');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdDropUrl) {
      navigator.clipboard.writeText(createdDropUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToWhatsApp = () => {
    if (createdDropUrl) {
      const msg = encodeURIComponent(
        `Halo! Kirim file langsung ke perangkat saya tanpa login & tanpa kompresi via Zynq Drop (Aktif 10 Menit): ${createdDropUrl}`
      );
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm mx-auto select-none">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
          <Link2 className="w-6 h-6" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300 mb-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>PRO EXCLUSIVE · 10 MINUTE EPHEMERAL</span>
          </div>
          <h2 className="font-headline text-xl font-extrabold text-white">
            Guest Drop Link
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Kirimkan tautan sementara ke klien atau rekan kerja. Mereka cukup buka link, seret file, dan file langsung mengalir ke perangkat Anda tanpa mendaftar.
          </p>
        </div>

        {!isPro ? (
          /* Free Tier Gate Prompt */
          <div className="p-4 rounded-2xl bg-surface-container border border-white/[0.06] flex flex-col items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-white">
              Khusus Pengguna Zynq Pro
            </div>
            <p className="text-[11px] text-slate-400 leading-normal text-center">
              Dapatkan akses ke Guest Drop Link, transfer direktori pohon tanpa batas, dan Group Beam multi-peer seumur hidup dengan satu kali bayar.
            </p>
            <Button
              onClick={() => {
                onClose();
                onOpenProModal?.();
              }}
              className="w-full bg-gradient-to-r from-primary to-cyan-400 text-slate-950 font-bold h-10 text-xs rounded-xl"
            >
              Upgrade ke Pro Lifetime (Rp49.000)
            </Button>
          </div>
        ) : !createdDropUrl ? (
          /* Configuration State: Set Slug & Create */
          <div className="flex flex-col gap-3 w-full text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Kustom Tautan Drop (Slug)
              </label>
              <div className="flex items-center bg-surface-container border border-white/[0.08] rounded-xl overflow-hidden px-3 focus-within:border-cyan-400">
                <span className="text-xs font-mono text-slate-500 select-none">
                  zynq.web.id/drop/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="andi-studio"
                  maxLength={30}
                  className="bg-transparent text-xs font-mono text-white py-3 px-1 w-full focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">
                Tautan otomatis hancur (auto-destruct) setelah 10 menit.
              </span>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={isLoading || !customSlug.trim()}
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold h-11 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] text-xs mt-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Membuat Tautan...</span>
                </div>
              ) : (
                'Aktifkan Tautan Drop (10 Menit)'
              )}
            </Button>
          </div>
        ) : (
          /* Active Drop Link State */
          <div className="flex flex-col items-center space-y-3.5 w-full animate-in fade-in duration-200">
            {/* Live Countdown Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-cyan-500/30 text-cyan-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Sisa Waktu: <strong>{formatTimer(secondsRemaining)}</strong></span>
            </div>

            {/* QR Code */}
            <div className="p-2.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>

            {/* Shareable Link Box */}
            <div className="w-full p-2.5 rounded-xl bg-surface-container border border-white/[0.06] flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-200 truncate select-all">
                {createdDropUrl}
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-2 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-slate-300 hover:text-white transition-all flex-shrink-0"
                title="Salin Tautan"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1 text-xs h-10 bg-surface-container border-white/[0.08]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </Button>

              <Button
                type="button"
                onClick={shareToWhatsApp}
                className="flex-1 text-xs h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span>WhatsApp</span>
              </Button>
            </div>

            {/* Guest Connection Status */}
            <div className="w-full p-2.5 rounded-xl bg-surface-container/60 border border-white/[0.04] text-[11px] text-slate-400 flex items-center justify-center gap-2">
              {guestConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">
                    {guestConnected} terhubung & siap kirim file!
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Menunggu tamu membuka tautan di browser...</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
