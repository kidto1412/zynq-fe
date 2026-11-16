import React from 'react';
import QRCode from 'qrcode';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { 
  Sparkles, 
  Shield, 
  Cloud, 
  HardDrive, 
  Infinity, 
  QrCode, 
  ArrowLeft, 
  RefreshCw,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/shared/services/api';

interface ProUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ open, onOpenChange }) => {
  const [selectedCurrency, setSelectedCurrency] = React.useState<'IDR' | 'USD'>('IDR');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [activeView, setActiveView] = React.useState<'plans' | 'qris'>('plans');

  // QRIS Payment Details
  const [qrisData, setQrisData] = React.useState<{
    orderId: string;
    transactionId: string;
    qrString: string;
    amount: number;
    expiresAt?: string;
  } | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Reset view when modal is closed/opened
  React.useEffect(() => {
    if (!open) {
      setActiveView('plans');
      setQrisData(null);
      setIsSuccess(false);
    }
  }, [open]);

  // Render QR Code onto Canvas whenever qrisData changes
  React.useEffect(() => {
    if (activeView === 'qris' && qrisData?.qrString && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrisData.qrString,
        {
          width: 240,
          margin: 1,
          color: {
            dark: '#0f131d',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('[QRIS] Failed to render QR code:', error);
        }
      );
    }
  }, [activeView, qrisData]);

  // Polling for KaseraPay payment status
  React.useEffect(() => {
    let interval: any = null;
    if (activeView === 'qris' && qrisData?.transactionId && !isSuccess) {
      interval = setInterval(async () => {
        try {
          const res = await api.checkTransactionStatus(qrisData.transactionId);
          if (res?.data?.status === 'succeeded' || res?.data?.status === 'paid') {
            setIsSuccess(true);
            clearInterval(interval);
          }
        } catch {
          // Soft fail
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeView, qrisData, isSuccess]);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const res = await api.createCheckout({
        userId: 'default-user',
        currency: selectedCurrency,
        provider: selectedCurrency === 'IDR' ? 'KASERAPAY' : 'LEMON_SQUEEZY',
      });

      if (res.success && res.data) {
        if (selectedCurrency === 'IDR' && res.data.qrString) {
          // Direct in-app QRIS generation (Zero redirect)
          setQrisData({
            orderId: res.data.orderId,
            transactionId: res.data.transactionId,
            qrString: res.data.qrString,
            amount: res.data.amount,
            expiresAt: res.data.expiresAt,
          });
          setActiveView('qris');
        } else if (res.data.checkoutUrl) {
          window.open(res.data.checkoutUrl, '_blank');
        }
      }
    } catch (err: any) {
      console.error('[Checkout Error]', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {activeView === 'plans' ? (
        /* Plan Overview View */
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-[0_0_20px_rgba(76,215,246,0.4)]">
            <div className="w-full h-full bg-surface-container rounded-[14px] flex items-center justify-center text-primary">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              One-Time Purchase · Lifetime Deal
            </span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mt-1.5">
              UniBeam Pro License
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5 max-w-sm">
              Bypass local Wi-Fi limits. Sync clipboard and beam files anywhere, anytime.
            </p>
          </div>

          {/* Currency Switcher */}
          <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-white/[0.05]">
            <button
              onClick={() => setSelectedCurrency('IDR')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                selectedCurrency === 'IDR'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              🇮🇩 Rupiah (KaseraPay QRIS)
            </button>
            <button
              onClick={() => setSelectedCurrency('USD')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                selectedCurrency === 'USD'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              🌎 USD (Global Card)
            </button>
          </div>

          {/* Price Tag */}
          <div className="w-full bg-surface-container-lowest rounded-2xl p-4 border border-primary/20 relative overflow-hidden">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-sm font-mono text-on-surface-variant line-through">
                {selectedCurrency === 'IDR' ? 'Rp 149.000' : '$29'}
              </span>
              <span className="font-headline text-3xl font-extrabold text-primary">
                {selectedCurrency === 'IDR' ? 'Rp 49.000' : '$9'}
              </span>
              <span className="text-xs font-mono text-secondary font-medium">/ Sekali Bayar</span>
            </div>
            <span className="text-[11px] font-mono text-secondary block mt-1">
              Early Bird Slot: 42 tersisa
            </span>
          </div>

          {/* Value Perks List */}
          <div className="w-full space-y-2 text-left bg-surface-container-low p-3.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-2 text-xs text-on-surface">
              <Cloud className="w-4 h-4 text-primary flex-shrink-0" />
              <span><strong>Cloud Relay (Beda Jaringan):</strong> HP 5G & Laptop Wi-Fi kantor tetap terhubung</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface">
              <HardDrive className="w-4 h-4 text-secondary flex-shrink-0" />
              <span><strong>Persistent Vault 30 Hari:</strong> Riwayat clipboard E2EE tersimpan di PostgreSQL</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface">
              <Infinity className="w-4 h-4 text-tertiary flex-shrink-0" />
              <span><strong>File Transfer Tanpa Batas:</strong> Kirim file hingga 5GB per batch via TURN relay</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface">
              <Shield className="w-4 h-4 text-primary flex-shrink-0" />
              <span><strong>5 Device Seats:</strong> Sinkronisasi hingga 5 perangkat sekaligus dalam 1 workspace</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full pt-1">
            <Button
              variant="secondary"
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full h-12 text-sm font-bold gap-2"
            >
              {isProcessing ? (
                <span>Menghubungi KaseraPay...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>
                    {selectedCurrency === 'IDR' ? 'Bayar Instan Rp 49.000 via QRIS' : 'Pay with Lemon Squeezy ($9)'}
                  </span>
                </span>
              )}
            </Button>
            <span className="text-[10px] font-mono text-on-surface-variant block mt-2">
              Langsung tampilkan QRIS di aplikasi · Scan via BCA, Mandiri, GoPay, OVO, ShopeePay
            </span>
          </div>
        </div>
      ) : (
        /* In-App Direct QRIS View */
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveView('plans')}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 bg-surface-container-highest px-3 py-1 rounded-full border border-white/[0.05]">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs font-mono font-bold text-secondary uppercase">KaseraPay QRIS</span>
            </div>
            <div className="w-5" />
          </div>

          {isSuccess ? (
            /* Payment Success State */
            <div className="py-8 space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-secondary/20 text-secondary mx-auto flex items-center justify-center border border-secondary/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface">Pembayaran Berhasil!</h3>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto font-mono">
                Lisensi UniBeam Pro Lifetime Anda telah diaktifkan secara permanen.
              </p>
              <Button variant="primary" onClick={() => onOpenChange(false)} className="mt-4">
                Mulai Gunakan Fitur Pro
              </Button>
            </div>
          ) : (
            /* Active Live QRIS Presentation */
            <>
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface">Scan QRIS untuk Membayar</h3>
                <p className="font-mono text-xs text-primary font-bold mt-0.5">
                  Total Tagihan: Rp 49.000
                </p>
              </div>

              {/* QRIS White Frame Card */}
              <div className="bg-white p-4 rounded-2xl shadow-2xl flex flex-col items-center border-4 border-slate-900/10 relative">
                {/* QRIS Header */}
                <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs tracking-tighter text-slate-900 font-headline">QRIS</span>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">Nasional</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Kasera Tech
                  </span>
                </div>

                {/* Canvas QR Code */}
                <canvas ref={canvasRef} className="rounded-lg max-w-full" />

                {/* QRIS Footer Brand */}
                <div className="pt-2 mt-2 border-t border-slate-200 text-center w-full">
                  <span className="text-[9px] font-mono font-medium text-slate-500">
                    BCA · Mandiri · BRI · BNI · GoPay · OVO · Dana · ShopeePay
                  </span>
                </div>
              </div>

              {/* Order Info & Live Poller */}
              <div className="w-full bg-surface-container-lowest p-3 rounded-xl border border-white/[0.04] space-y-1 text-left">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-on-surface-variant">Order ID:</span>
                  <span className="text-on-surface font-semibold">{qrisData?.orderId}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <Clock className="w-3 h-3 text-tertiary" />
                    Status Pembayaran:
                  </span>
                  <span className="text-secondary font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Menunggu Pembayaran
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-left w-full space-y-1 font-mono text-[11px] text-on-surface-variant bg-surface-container-low p-3 rounded-xl">
                <p>1. Buka m-Banking atau aplikasi e-wallet Anda.</p>
                <p>2. Pilih menu Bayar / Scan QRIS.</p>
                <p>3. Arahkan kamera ke kode QR di atas.</p>
                <p>4. Status akan terkonfirmasi otomatis.</p>
              </div>

              {/* Simulation Button for testing */}
              <button
                onClick={() => setIsSuccess(true)}
                className="text-[10px] font-mono text-on-surface-variant hover:text-primary transition-colors underline pt-1"
              >
                Sudah bayar? Verifikasi manual
              </button>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
};
