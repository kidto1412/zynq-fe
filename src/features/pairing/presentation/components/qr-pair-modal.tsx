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
  CameraOff,
  AlertCircle,
  WifiOff,
  Radio,
  ArrowRight
} from 'lucide-react';

type Mode = 'display' | 'scan' | 'manual' | 'hotspot';

export const QrPairModal: React.FC = () => {
  const { 
    isQrModalOpen, 
    setQrModalOpen, 
    activePin, 
    activeRoomId,
    isCreatingRoom,
    errorMessage,
    joinRealRoom, 
    createRealRoom,
    hotspotPayloadString,
    generateHotspotOffer,
    receiveHotspotOffer,
    receiveHotspotAnswer,
    resetHotspotState
  } = usePairingStore();

  const [mode, setMode] = React.useState<Mode>('display');
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [hotspotStep, setHotspotStep] = React.useState<'menu' | 'host' | 'client_scan' | 'client_answer' | 'host_scan_answer'>('menu');

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const hotspotCanvasRef = React.useRef<HTMLCanvasElement>(null);
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

  // Auto-generate room if PIN is not yet set when opening modal
  React.useEffect(() => {
    if (isQrModalOpen && (activePin === '------' || !activeRoomId)) {
      createRealRoom();
    }
  }, [isQrModalOpen, activePin, activeRoomId, createRealRoom]);

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

  // Render Hotspot QR Code to Canvas
  React.useEffect(() => {
    if (
      isQrModalOpen &&
      mode === 'hotspot' &&
      (hotspotStep === 'host' || hotspotStep === 'client_answer') &&
      hotspotCanvasRef.current &&
      hotspotPayloadString
    ) {
      QRCode.toCanvas(
        hotspotCanvasRef.current,
        hotspotPayloadString,
        {
          width: 220,
          margin: 1,
          color: {
            dark: '#064e3b',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('[Hotspot QR] Render error:', error);
        }
      );
    }
  }, [isQrModalOpen, mode, hotspotStep, hotspotPayloadString]);

  // Handle Camera QR Scanner in 'scan' or hotspot scan modes
  React.useEffect(() => {
    let isMounted = true;
    const isScanningActive = mode === 'scan' || hotspotStep === 'client_scan' || hotspotStep === 'host_scan_answer';

    if (isQrModalOpen && isScanningActive) {
      setCameraError(null);
      setIsCameraActive(false);

      const html5QrCode = new Html5Qrcode('zynq-qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
      };

      html5QrCode
        .start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            if (!isMounted) return;
            console.log('[QR Scanner] Detected text:', decodedText);

            // 1. Check for Offline Hotspot Direct Protocol
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.protocol === 'zynq-hotspot') {
                if (scannerRef.current && scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
                }
                setIsCameraActive(false);

                if (parsed.type === 'offer') {
                  setIsSubmitting(true);
                  await receiveHotspotOffer(decodedText);
                  setHotspotStep('client_answer');
                  setIsSubmitting(false);
                  return;
                } else if (parsed.type === 'answer') {
                  setIsSubmitting(true);
                  await receiveHotspotAnswer(decodedText);
                  setSuccess(true);
                  setTimeout(() => {
                    setSuccess(false);
                    setQrModalOpen(false);
                  }, 1200);
                  setIsSubmitting(false);
                  return;
                }
              }
            } catch {
              // Not hotspot JSON, continue to PIN evaluation
            }

            // 2. Parse PIN for Cloud Signaling
            let extractedPin = '';
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.pin) extractedPin = String(parsed.pin);
            } catch {}

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
                console.error('[QR Pairing] Join failed:', err);
                const msg = err.message?.includes('does not exist')
                  ? 'PIN / Kode QR tidak ditemukan di server atau sudah kedaluwarsa. Pastikan QR aktif di perangkat lawan.'
                  : (err.message || 'Gagal pairing dengan QR ini');
                setCameraError(msg);
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
  }, [isQrModalOpen, mode, hotspotStep, joinRealRoom, receiveHotspotOffer, receiveHotspotAnswer, setQrModalOpen]);

  // Clean up when modal closes
  React.useEffect(() => {
    if (!isQrModalOpen) {
      setMode('display');
      setHotspotStep('menu');
      setSuccess(false);
      setCameraError(null);
      setCopied(false);
      resetHotspotState();
    }
  }, [isQrModalOpen, resetHotspotState]);

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
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container rounded-xl w-full border border-white/[0.04]">
          <button
            type="button"
            onClick={() => { setMode('display'); setHotspotStep('menu'); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'display'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('scan'); setHotspotStep('menu'); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'scan'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Pindai</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('manual'); setHotspotStep('menu'); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-primary text-surface font-bold shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>PIN</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('hotspot'); setHotspotStep('menu'); }}
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'hotspot'
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-md'
                : 'text-emerald-400/80 hover:text-emerald-400'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Hotspot</span>
          </button>
        </div>

        {/* Mode 1: Display QR & PIN (Host) */}
        {mode === 'display' && (
          <div className="flex flex-col items-center space-y-4 w-full animate-in fade-in duration-200">
            <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center min-w-[224px] min-h-[224px]">
              {activePin === '------' ? (
                isCreatingRoom ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-slate-800">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                    <span className="text-xs font-semibold">Menyiapkan Room P2P...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-4 text-slate-800 max-w-[200px]">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <span className="text-xs font-semibold text-center">Gagal Membuat Room</span>
                    <Button
                      type="button"
                      onClick={() => createRealRoom()}
                      className="text-xs h-8 px-3 mt-1 bg-primary text-slate-950 font-bold"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                )
              ) : (
                <canvas ref={canvasRef} className="rounded-lg" />
              )}
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

            {errorMessage && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] max-w-xs text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>{errorMessage}</span>
              </div>
            )}

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
            <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_20px_rgba(0,240,255,0.2)] flex items-center justify-center">
              {/* Camera Video Viewfinder Target */}
              <div id="zynq-qr-reader" className="w-full h-full" />

              {/* Viewfinder Target Framing Overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-48 h-48 border-2 border-primary/70 rounded-xl relative shadow-[0_0_15px_rgba(0,240,255,0.4)]">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-on-surface-variant p-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Mengaktifkan kamera...</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-rose-400 p-4 text-xs">
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

        {/* Mode 4: Offline Hotspot Direct Mode (Zero Internet / Free & Pro) */}
        {mode === 'hotspot' && (
          <div className="flex flex-col items-center space-y-4 w-full animate-in fade-in duration-200">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Direct · 0 KB Kuota Seluler</span>
            </div>

            {hotspotStep === 'menu' && (
              <div className="flex flex-col gap-3 w-full">
                <p className="text-xs text-on-surface-variant text-center">
                  Hubungkan kedua perangkat ke Tethering / Hotspot Wi-Fi HP yang sama (tanpa perlu paket data internet).
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await generateHotspotOffer();
                      setHotspotStep('host');
                    } catch (err: any) {
                      setCameraError(err.message || 'Gagal membuat penawaran hotspot');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-emerald-500/20 hover:border-emerald-500/50 flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Mode Host (Buat Sinyal)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tampilkan QR sinyal untuk dipindai lawan
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setHotspotStep('client_scan');
                  }}
                  className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/[0.06] hover:border-emerald-500/50 flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                        Mode Klien (Pindai Host)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Arahkan kamera ke QR sinyal Host
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}

            {/* Sub-step: Host Displays Offer QR */}
            {hotspotStep === 'host' && (
              <div className="flex flex-col items-center space-y-3 w-full">
                <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center min-w-[224px] min-h-[224px]">
                  <canvas ref={hotspotCanvasRef} className="rounded-lg" />
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  1. Minta perangkat lawan membuka tab <strong>Hotspot</strong> &rarr; <strong>Mode Klien</strong> untuk memindai QR ini.
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    onClick={() => {
                      if (hotspotPayloadString) {
                        navigator.clipboard.writeText(hotspotPayloadString);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    variant="outline"
                    className="flex-1 text-xs h-9 bg-surface-container border-white/[0.08]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    <span>Salin Sinyal</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setHotspotStep('host_scan_answer')}
                    className="flex-1 text-xs h-9 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    <span>Pindai Balasan Lawan</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Sub-step: Camera Viewfinder */}
            {(hotspotStep === 'client_scan' || hotspotStep === 'host_scan_answer') && (
              <div className="flex flex-col items-center space-y-3 w-full">
                <div className="relative w-full aspect-square max-w-[260px] bg-black rounded-2xl overflow-hidden border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center">
                  <div id="zynq-qr-reader" className="w-full h-full" />
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="w-44 h-44 border-2 border-emerald-400/70 rounded-xl relative">
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}
                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-on-surface-variant p-4">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs">Mengaktifkan kamera...</span>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-rose-400 p-4 text-xs">
                      <CameraOff className="w-8 h-8 text-rose-400 mb-1" />
                      <span>{cameraError}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {hotspotStep === 'client_scan'
                    ? 'Arahkan ke QR yang sedang ditampilkan oleh perangkat Host.'
                    : 'Arahkan ke QR balasan yang ditampilkan di layar lawan.'}
                </p>
                <button
                  type="button"
                  onClick={() => setHotspotStep('menu')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali ke Menu Hotspot
                </button>
              </div>
            )}

            {/* Sub-step: Client displays Answer QR */}
            {hotspotStep === 'client_answer' && (
              <div className="flex flex-col items-center space-y-3 w-full">
                <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center min-w-[224px] min-h-[224px]">
                  <canvas ref={hotspotCanvasRef} className="rounded-lg" />
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center max-w-xs">
                  Sinyal Host berhasil diterima! Tunjukkan kode ini ke kamera Host untuk merampungkan koneksi P2P.
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (hotspotPayloadString) {
                      navigator.clipboard.writeText(hotspotPayloadString);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  variant="outline"
                  className="w-full text-xs h-9 bg-surface-container border-white/[0.08]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  <span>Salin Sinyal Balasan</span>
                </Button>
              </div>
            )}
          </div>
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
