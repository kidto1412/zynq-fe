import React from 'react';
import { api } from '@/shared/services/api';
import { signalingService } from '@/shared/services/signaling-service';
import { webrtcManager } from '@/shared/services/webrtc-manager';
import { getLocalDeviceInfo } from '@/shared/lib/device-detector';
import { formatBytes } from '@/shared/lib/utils';
import { ZynqLogo } from '@/shared/components/ui/zynq-logo';
import { Button } from '@/shared/components/ui/button';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ShieldCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface GuestDropViewProps {
  slug: string;
}

export const GuestDropView: React.FC<GuestDropViewProps> = ({ slug }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hostInfo, setHostInfo] = React.useState<{
    hostName: string;
    hostPlatform: string;
    expiresAt: string;
    ttlRemainingSeconds: number;
  } | null>(null);

  const [connectionState, setConnectionState] = React.useState<
    'connecting' | 'connected' | 'transferring' | 'completed' | 'error'
  >('connecting');
  const [secondsLeft, setSecondsLeft] = React.useState<number>(600);
  const [transferProgress, setTransferProgress] = React.useState({
    fileName: '',
    fileSize: 0,
    transferredBytes: 0,
    speedMBs: 0,
    percentage: 0,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // 1. Validate Link on Mount & Setup Timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    api
      .getDropLinkInfo(slug)
      .then((res) => {
        if (res.success && res.data) {
          setHostInfo(res.data);
          setSecondsLeft(res.data.ttlRemainingSeconds || 600);

          timer = setInterval(() => {
            setSecondsLeft((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                setError('Tautan Guest Drop telah kedaluwarsa (10 menit telah berlalu).');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setError(res.message || 'Tautan Guest Drop tidak valid atau sudah kedaluwarsa.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat info tautan drop.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [slug]);

  // 2. Connect to Socket Signaling and Join Drop Room
  React.useEffect(() => {
    if (!hostInfo) return;

    const localDevice = getLocalDeviceInfo();

    // Connect to signaling
    signalingService.connect(() => {
      console.log('[Guest Drop] Connected to signaling, joining drop room...');
      signalingService
        .joinDropLink({
          slug,
          deviceName: `${localDevice.deviceName} (Guest)`,
          platform: localDevice.platform,
        })
        .then((res) => {
          console.log('[Guest Drop] Successfully joined room:', res);
        })
        .catch((err) => {
          console.error('[Guest Drop] Join room failed:', err);
          setError(err.message);
        });
    });

    // WebRTC Signaling Handshake (Guest listens for Host offer or vice versa)
    webrtcManager.onDataChannelOpen = () => {
      console.log('[Guest Drop] WebRTC DataChannel connected directly to Host!');
      setConnectionState('connected');
    };

    webrtcManager.onConnectionStateChange = (state) => {
      console.log('[Guest Drop] Connection state:', state);
      if (state === 'connected') {
        setConnectionState('connected');
      } else if (state === 'failed' || state === 'closed') {
        setConnectionState('error');
      }
    };

    signalingService.onOffer(async ({ senderClientId, sdp }) => {
      console.log('[Guest Drop] Received WebRTC offer from host:', senderClientId);
      webrtcManager.initConnection(false, (candidate) => {
        signalingService.sendIceCandidate(senderClientId, candidate);
      });
      const answer = await webrtcManager.handleOffer(sdp);
      signalingService.sendAnswer(senderClientId, answer);
    });

    signalingService.onAnswer(async ({ sdp }) => {
      await webrtcManager.handleAnswer(sdp);
    });

    signalingService.onIceCandidate(async ({ candidate }) => {
      await webrtcManager.addIceCandidate(candidate);
    });
  }, [hostInfo, slug]);

  const handleSendFile = async (file: File) => {
    if (!file) return;

    setConnectionState('transferring');
    setTransferProgress({
      fileName: file.name,
      fileSize: file.size,
      transferredBytes: 0,
      speedMBs: 0,
      percentage: 0,
    });

    try {
      await webrtcManager.sendFile(
        file,
        {
          fileName: file.name,
          fileSize: file.size,
        },
        (transferred, total, speed) => {
          const percent = Math.min(100, Math.floor((transferred / total) * 100));
          setTransferProgress({
            fileName: file.name,
            fileSize: total,
            transferredBytes: transferred,
            speedMBs: speed,
            percentage: percent,
          });
        }
      );

      setConnectionState('completed');
    } catch (err: any) {
      console.error('[Guest Drop] File send failed:', err);
      setError('Gagal mengirim file: ' + err.message);
      setConnectionState('connected');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleSendFile(file);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="h-16 px-4 flex items-center justify-between gap-3 max-w-xl mx-auto">
          <div className="flex items-center gap-2.5">
            <ZynqLogo size={32} animatePulse={connectionState === 'connected'} />
            <span className="font-headline text-base font-extrabold tracking-tight text-white">
              ZYNQ <span className="text-cyan-400 font-bold">• Guest Drop</span>
            </span>
          </div>

          {hostInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-cyan-500/20 text-xs font-mono text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs text-slate-400">Menghubungkan ke Guest Drop...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-surface-container border border-rose-500/20 max-w-sm w-full space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="font-headline font-bold text-base text-white">Tautan Tidak Tersedia</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <Button
              onClick={() => {
                window.location.href = '/';
              }}
              className="w-full bg-surface-container-high hover:bg-surface-container-highest text-white text-xs h-10 rounded-xl mt-2"
            >
              Buka Zynq Home
            </Button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {/* Host Title Card */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Koneksi P2P Terenkripsi DTLS/AES-GCM</span>
              </div>
              <h1 className="font-headline text-2xl font-black text-white tracking-tight">
                Kirim File ke {hostInfo?.hostName || 'Host'}
              </h1>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                File mengalir langsung dari peramban Anda ke perangkat penerima. Tanpa login, tanpa limit ukuran, dan tanpa disimpan di server cloud.
              </p>
            </div>

            {/* Transfer In Progress Card */}
            {connectionState === 'transferring' ? (
              <div className="p-6 rounded-2xl bg-surface-container border border-cyan-500/30 space-y-4 max-w-md mx-auto shadow-2xl">
                <div className="flex items-center justify-between text-left">
                  <div className="min-w-0 pr-2">
                    <span className="font-headline text-xs font-bold text-white block truncate">
                      {transferProgress.fileName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatBytes(transferProgress.transferredBytes)} dari {formatBytes(transferProgress.fileSize)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high text-xs font-mono text-cyan-300">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{transferProgress.speedMBs} MB/s</span>
                  </div>
                </div>

                <div className="w-full bg-surface-container-lowest h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                    style={{ width: `${transferProgress.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 block">
                  Mengalirkan langsung via WebRTC chunk data... {transferProgress.percentage}%
                </span>
              </div>
            ) : connectionState === 'completed' ? (
              /* Success Card */
              <div className="p-8 rounded-2xl bg-surface-container border border-emerald-500/30 space-y-4 max-w-md mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(52,211,153,0.4)] animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-headline font-bold text-lg text-white">File Berhasil Terkirim!</h3>
                <p className="text-xs text-slate-300">
                  Berkas <strong>{transferProgress.fileName}</strong> telah diterima secara utuh oleh {hostInfo?.hostName}.
                </p>
                <Button
                  onClick={() => setConnectionState('connected')}
                  className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold h-11 rounded-xl text-xs"
                >
                  Kirim File Lainnya
                </Button>
              </div>
            ) : (
              /* Dropzone Ready State */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer max-w-md mx-auto flex flex-col items-center justify-center gap-3.5 ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-400/10 scale-102'
                    : 'border-white/[0.1] hover:border-cyan-400/60 bg-surface-container hover:bg-surface-container-high'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-headline text-sm font-bold text-white">
                    Seret berkas ke sini atau klik untuk memilih
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mendukung video, dokumen, zip, dan foto tanpa batas ukuran
                  </p>
                </div>

                <div className="flex gap-2 mt-2">
                  <span className="px-3 py-1 rounded-lg bg-surface-container-high border border-white/[0.04] text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Pilih File
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSendFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-white/[0.04]">
        Zynq — Cross-Ecosystem P2P Sync &amp; Share
      </footer>
    </div>
  );
};
