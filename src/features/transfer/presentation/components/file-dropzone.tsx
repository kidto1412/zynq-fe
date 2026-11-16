import React from 'react';
import { useTransferStore } from '../stores/useTransferStore';
import { UploadCloud } from 'lucide-react';

export const FileDropzone: React.FC = () => {
  const { startRealFileTransfer } = useTransferStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startRealFileTransfer(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startRealFileTransfer(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
        isDragOver
          ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(76,215,246,0.2)]'
          : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary shadow-sm">
        <UploadCloud className="w-6 h-6 animate-bounce" />
      </div>
      <div>
        <span className="font-headline text-sm font-bold text-on-surface">
          Select or Drop any file to Beam P2P
        </span>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Real binary chunk streaming over WebRTC DataChannel · Zero cloud storage
        </p>
      </div>
    </div>
  );
};
