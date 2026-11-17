import React from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pinInputSchema, PinInputValues } from '../forms/pin-input.schema';
import { usePairingStore } from '../stores/usePairingStore';
import { Dialog, Input } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { 
  QrCode, 
  Camera, 
  Keyboard, 
  Copy, 
  Check, 
  RefreshCw,
  CameraOff
} from 'lucide-react';

type Mode = 'display' | 'scan' | 'manual';

export const QrPairModal: React.FC = () => {
  const { 
    isQrModalOpen, 
    setQrModalOpen, 
    activePin, 
    activeRoomId,
    joinRealRoom, 
    createRealRoom
  } = usePairingStore();

  const [mode, setMode] = React.useState<Mode>('display');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PinInputValues>({
    resolver: zodResolver(pinInputSchema),
    defaultValues: { pin: '' },
  });

  // Generate payload for QR Code
  const qrString = React.useMemo(() => {
    return JSON.stringify({
      protocol: 'zynq-pair',
      pin: activePin,
      room: activeRoomId,
      ts: Date.now(),
    });
  }, [activePin, activeRoomId]);

  // Render QR Code to Canvas in 'display' mode
  React.useEffect(() => {
    if (isQrModalOpen && mode === 'display' && canvasRef.current && activePin !== '------') {
      QRCode.toCanvas(
        canvasRef.current,
        qrString,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('[QR] Render error:', error);
        }
      );
    }
  }, [isQrModalOpen, mode, qrString, activePin]);

  // Handle Camera QR Scanner in 'scan' mode
  React.useEffect(() => {
    let isMounted = true;

    if (isQrModalOpen && mode === 'scan') {
      setCameraError(null);
      setIsCameraActive(false);

      const html5QrCode = new Html5Qrcode('zynq-qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      html5QrCode
        .start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            if (!isMounted) return;
            console.log('[QR Scanner] Detected text:', decodedText);

            // Parse PIN from scanned string
            let extractedPin = '';
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.pin) extractedPin = String(parsed.pin);
            } catch {
              // Not JSON, check for regex
            }

            if (!extractedPin) {
              const match = decodedText.match(/(?:pin[=:_]|\b)(\d{6})\b/i);
              if (match) {
                extractedPin = match[1];
              } else if (/^\d{6}$/.test(decodedText.trim())) {
                extractedPin = decodedText.trim();
              }
            }

            if (extractedPin && extractedPin.length === 6) {
              try {
                // Stop camera immediately on match
                if (scannerRef.current && scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
                }
                setIsCameraActive(false);
                setIsSubmitting(true);
                await joinRealRoom(extractedPin);
                setSuccess(true);
                setTimeout(() => {
                  setSuccess(false);
                  setQrModalOpen(false);
                }, 1200);
              } catch (err: any) {
                setCameraError(err.message || 'Gagal pairing dengan QR ini');
              } finally {
                setIsSubmitting(false);
              }
            }
          },
          () => {
            // Frame scan miss, ignore
          }
        )
        .then(() => {
          if (isMounted) setIsCameraActive(true);
        })
        .catch((err) => {
          if (isMounted) {
            console.error('[QR Scanner] Camera start failed:', err);
            setCameraError(
              'Akses kamera tidak diizinkan atau kamera tidak tersedia. Gunakan tab "Input PIN".'
            );
          }
        });
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            })
            .catch(() => {});
        } else {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      }
      setIsCameraActive(false);
    };
  }, [isQrModalOpen, mode, joinRealRoom, setQrModalOpen]);

  // Clean up when modal closes
  React.useEffect(() => {
    if (!isQrModalOpen) {
      setMode('display');
      setSuccess(false);
      setCameraError(null);
      setCopied(false);
    }
  }, [isQrModalOpen]);

  // Manual PIN submission
  const onSubmit = async (data: PinInputValues) => {
    setIsSubmitting(true);
    setCameraError(null);
    try {
      await joinRealRoom(data.pin);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        reset();
        setQrModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setCameraError(err.message || 'Gagal terhubung dengan PIN tersebut');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPin = () => {
    if (activePin && activePin !== '------') {
      navigator.clipboard.writeText(activePin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isQrModalOpen} onOpenChange={setQrModalOpen}>
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(0,240,255,0.2)]">
          <QrCode className="w-6 h-6" />
        </div>

        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Pairing Antar-Perangkat</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Hubungkan dua perangkat secara langsung via WebRTC P2P
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container rounded-xl w-full border border-white/[0.04]">
          <button
            type="button"
            onClick={() => setMode('display')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'display'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Kode QR</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('scan')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'scan'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Pindai QR</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Ketik PIN</span>
          </button>
        </div>

        {/* Mode 1: Display QR & PIN (Host) */}
        {mode === 'display' && (
          <div className="flex flex-col items-center space-y-4 w-full animate-in fade-in duration-200">
            <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>

            <div className="flex flex-col items-center gap-1.5 w-full">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
                Sync PIN Perangkat Ini
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-3xl font-black tracking-[0.25em] text-primary bg-surface-container px-4 py-2 rounded-xl border border-primary/20 shadow-inner">
                  {activePin}
                </span>
                <button
                  type="button"
                  onClick={copyPin}
                  className="p-3 bg-surface-container hover:bg-surface-container-high rounded-xl border border-white/[0.04] text-on-surface hover:text-primary transition-all"
                  title="Salin PIN"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => createRealRoom()}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors py-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Perbarui Kode QR &amp; PIN</span>
            </button>
          </div>
        )}

        {/* Mode 2: Camera Scanner (Peer) */}
        {mode === 'scan' && (
          <div className="flex flex-col items-center space-y-3 w-full animate-in fade-in duration-200">
            <div className="relative w-full aspect-square max-w-[260px] bg-slate-950 rounded-2xl overflow-hidden border border-primary/30 shadow-lg flex items-center justify-center">
              {/* Camera Video Viewfinder Target */}
              <div id="zynq-qr-reader" className="w-full h-full" />

              {/* Viewfinder Target Framing Overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-48 h-48 border-2 border-primary/70 rounded-xl relative shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                    {/* Laser Scanner Animation */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f0ff] animate-pulse top-1/2 -translate-y-1/2" />
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
                  </div>
                </div>
              )}

              {/* Camera Loading or Error State */}
              {!isCameraActive && !cameraError && (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant p-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Mengaktifkan kamera...</span>
                </div>
              )}

              {cameraError && (
                <div className="flex flex-col items-center gap-2 text-rose-400 p-4 text-xs">
                  <CameraOff className="w-8 h-8 text-rose-400 mb-1" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-on-surface-variant max-w-xs">
              Arahkan kamera ke layar perangkat lain yang menampilkan Kode QR Zynq.
            </p>
          </div>
        )}

        {/* Mode 3: Manual PIN Input */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full animate-in fade-in duration-200">
            <div className="space-y-2 text-left">
              <label className="text-xs font-medium text-on-surface-variant">
                Masukkan 6-Digit PIN Perangkat Lawan
              </label>
              <Input
                {...register('pin')}
                type="text"
                placeholder="123456"
                maxLength={6}
                disabled={isSubmitting}
                className="font-mono text-center tracking-[0.3em] text-2xl h-14 bg-surface-container border-white/[0.08] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl"
              />
              {errors.pin && (
                <p className="text-xs text-error font-medium">{errors.pin.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-surface font-headline font-bold h-12 rounded-xl transition-all shadow-[0_0_16px_rgba(0,240,255,0.3)]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menghubungkan...</span>
                </div>
              ) : (
                'Hubungkan Sekarang'
              )}
            </Button>
          </form>
        )}

        {/* Global Error Banner */}
        {cameraError && mode !== 'scan' && (
          <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-medium w-full text-center">
            {cameraError}
          </div>
        )}

        {/* Success Overlay */}
        {success && (
          <div className="absolute inset-0 bg-surface/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 space-y-3 z-50">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="font-headline font-bold text-lg text-white">Berhasil Terhubung!</h3>
            <p className="text-xs text-slate-400">Tunnel WebRTC Direct P2P aktif.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
};
