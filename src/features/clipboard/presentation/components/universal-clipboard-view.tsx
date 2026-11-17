import React from 'react';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';
import { Button } from '@/shared/components/ui/button';
import { 
  Smartphone, 
  Link as LinkIcon, 
  Share2, 
  Trash2, 
  Copy, 
  Check, 
  Key, 
  Code, 
  FileText,
  ClipboardPaste,
  Image as ImageIcon,
  Download,
  Sparkles,
  Maximize2,
  X
} from 'lucide-react';

export const UniversalClipboardView: React.FC = () => {
  const { 
    autoSync, 
    toggleAutoSync, 
    activeItem, 
    historyItems, 
    sendToPeer, 
    clearActiveBuffer, 
    copyToLocalClipboard,
    addNewItem,
    readLocalClipboard
  } = useClipboardStore();

  const user = useAuthStore((state) => state.user);
  const isPro = user?.plan === 'PRO_LIFETIME';

  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [inputText, setInputText] = React.useState('');
  const [previewModalUrl, setPreviewModalUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopy = async (id: string, textOrDataUrl: string) => {
    const success = await copyToLocalClipboard(textOrDataUrl);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addNewItem(inputText);
    setInputText('');
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!isPro) {
      setErrorMessage('Sinkronisasi Gambar & Screenshot Clipboard adalah fitur ZYNQ Pro Lifetime. Upgrade untuk sinkronisasi gambar antar perangkat.');
      e.target.value = '';
      return;
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        addNewItem(dataUrl, 'image', file.type || 'image/png');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleDownload = (dataUrl: string, filename = 'zynq-clipboard.png') => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* Subtitle & Sync Pill Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-lg font-bold text-on-surface">Universal Clipboard</h2>
          <p className="text-xs text-on-surface-variant">Real-time clipboard stream via WebRTC & PostgreSQL Vault</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-white/[0.04]">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.9)]" />
          <span className="font-mono text-xs text-secondary font-bold uppercase tracking-wider">Mesh P2P</span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-primary/10 border border-primary/30 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-primary font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Master Sync Status Banner */}
      <section className="bg-surface-container-low rounded-2xl p-4 shadow-md border border-white/[0.04] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Auto-Sync Clipboard
                </span>
                {autoSync && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
              </div>
              <p className={`font-headline text-base font-bold ${autoSync ? 'text-primary' : 'text-on-surface-variant'}`}>
                {autoSync ? 'ACTIVE' : 'PAUSED'}
              </p>
            </div>
          </div>

          {/* Interactive Toggle */}
          <button
            onClick={toggleAutoSync}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              autoSync ? 'bg-primary shadow-[0_0_12px_rgba(76,215,246,0.45)]' : 'bg-surface-container-highest'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-on-primary shadow-md transition-transform duration-200 ${
                autoSync ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Connected Target & Telemetry Sub-card */}
        <div className="bg-surface-container rounded-xl p-3 flex items-center justify-between border border-white/[0.03]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-on-surface font-medium truncate">
                WebRTC DataChannel Bridge
              </p>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-secondary">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Zero Cloud Relay Latency</span>
                <span className="text-on-surface-variant">•</span>
                <span className="text-on-surface-variant">Direct DTLS 1.3</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setErrorMessage(null);
                readLocalClipboard();
              }}
              title="Paste teks / gambar dari OS clipboard"
              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-xs flex items-center gap-1 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste OS</span>
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              title="Kirim Gambar / Screenshot"
              className="p-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-mono text-xs flex items-center justify-center transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
          </div>
        </div>
      </section>

      {/* 2. Active Live Clipboard Item (Hero Card) */}
      {activeItem ? (
        <section className="bg-surface-container-low rounded-2xl p-4 shadow-lg border border-primary/20 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-primary font-medium">{activeItem.timestamp}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {activeItem.type === 'image' && (
                <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono text-[10px] font-bold border border-secondary/30">
                  PNG Screenshot · E2EE
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-mono text-[11px]">
                Payload: {activeItem.type.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Image Payload Visualizer */}
          {activeItem.type === 'image' ? (
            <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 border border-white/[0.03] space-y-2">
              <div className="relative group rounded-lg overflow-hidden bg-black/30 flex items-center justify-center max-h-64 border border-white/5">
                <img
                  src={activeItem.content}
                  alt="Active Clipboard Screenshot"
                  className="max-h-64 object-contain rounded-lg"
                />
                <button
                  onClick={() => setPreviewModalUrl(activeItem.content)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                  title="Perbesar Tampilan"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant px-1">
                <span>{activeItem.mimeType || 'image/png'}</span>
                <span>{activeItem.byteSize}</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-3 mb-3 border border-white/[0.03] flex items-start gap-2.5">
              <LinkIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-on-surface break-all select-all font-medium leading-relaxed">
                  {activeItem.content}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={sendToPeer} className="w-full gap-2 font-bold">
              <Share2 className="w-4 h-4" />
              <span>Broadcast to Peer Now</span>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy('hero', activeItem.content)}
                className="gap-1.5 text-xs"
              >
                {copiedId === 'hero' ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
                <span>
                  {copiedId === 'hero'
                    ? 'Tersalin!'
                    : activeItem.type === 'image'
                    ? 'Salin Gambar ke OS'
                    : 'Salin ke Lokal'}
                </span>
              </Button>
              {activeItem.type === 'image' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(activeItem.content)}
                  className="gap-1.5 text-xs text-on-surface-variant hover:text-primary"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearActiveBuffer}
                  className="gap-1.5 text-xs text-on-surface-variant hover:text-error"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Buffer</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-surface-container rounded-2xl p-6 text-center border border-white/[0.04]">
          <p className="text-xs text-on-surface-variant font-mono">
            Clipboard buffer kosong. Ketik teks di bawah atau klik "Paste OS" / ikon gambar untuk mengirim.
          </p>
        </section>
      )}

      {/* Manual Input Trigger */}
      <form onSubmit={handleManualAdd} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik teks, URL, token untuk disinkronkan..."
          className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-xs font-mono text-on-surface border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" variant="primary" size="sm">
          Push
        </Button>
      </form>

      {/* 3. Clipboard History Stream */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Encrypted History Stream (PostgreSQL Vault)
          </span>
          <span className="font-mono text-xs text-on-surface-variant">{historyItems.length} Items</span>
        </div>

        {historyItems.length > 0 ? (
          historyItems.map((item) => (
            <div
              key={item.id}
              className="bg-surface-container rounded-xl p-3 border border-white/[0.04] flex items-center justify-between gap-3 hover:bg-surface-container-high transition-colors"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 rounded-lg bg-surface-container-highest text-primary mt-0.5">
                  {item.type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-secondary" />
                  ) : item.type === 'token' ? (
                    <Key className="w-3.5 h-3.5" />
                  ) : item.type === 'code' ? (
                    <Code className="w-3.5 h-3.5" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                </div>

                {item.type === 'image' ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.content}
                      alt="Thumbnail"
                      onClick={() => setPreviewModalUrl(item.content)}
                      className="w-10 h-10 object-cover rounded-lg border border-white/10 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-black/40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-on-surface font-medium truncate">
                        Screenshot / Image Blob
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mt-0.5">
                        <span className="text-secondary font-bold">{item.byteSize || 'PNG'}</span>
                        <span>•</span>
                        <span>{item.sourceDevice}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-on-surface truncate font-medium">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mt-0.5">
                      <span>{item.sourceDevice}</span>
                      <span>•</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {item.type === 'image' && (
                  <button
                    onClick={() => handleDownload(item.content)}
                    title="Unduh PNG"
                    className="p-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleCopy(item.id, item.content)}
                  title={item.type === 'image' ? 'Salin gambar ke OS' : 'Salin teks'}
                  className="p-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-xl bg-surface-container-low text-center text-xs text-on-surface-variant font-mono">
            Belum ada riwayat clipboard tersimpan.
          </div>
        )}
      </div>

      {/* Full Resolution Image Lightbox Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-surface-container-low rounded-2xl p-4 border border-white/10 shadow-2xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs text-secondary font-bold">Screenshot Preview (E2EE)</span>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewModalUrl}
              alt="Fullscreen Preview"
              className="max-h-[70vh] object-contain rounded-xl"
            />
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCopy('modal', previewModalUrl)}
                className="gap-1.5"
              >
                {copiedId === 'modal' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'modal' ? 'Tersalin!' : 'Salin ke OS'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(previewModalUrl)}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
