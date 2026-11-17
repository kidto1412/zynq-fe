import React from 'react';
import { useTransferStore } from '../stores/useTransferStore';
import { UploadCloud, FolderUp, FileUp, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';

// Recursive WebKit Entry Walker for dropped directory trees
async function traverseFileTree(entry: any, path = ''): Promise<{ file: File; relativePath: string }[]> {
  const results: { file: File; relativePath: string }[] = [];
  if (entry.isFile) {
    const file: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
    results.push({ file, relativePath: path ? `${path}/${file.name}` : file.name });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readAllEntries = async (): Promise<any[]> => {
      const all: any[] = [];
      const readBatch = (): Promise<any[]> =>
        new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));

      let batch: any[];
      do {
        batch = await readBatch();
        all.push(...batch);
      } while (batch.length > 0);
      return all;
    };

    const entries = await readAllEntries();
    const currentPath = path ? `${path}/${entry.name}` : entry.name;
    for (const child of entries) {
      const childResults = await traverseFileTree(child, currentPath);
      results.push(...childResults);
    }
  }
  return results;
}

export const FileDropzone: React.FC = () => {
  const { startRealFileTransfer, startFolderTransfer } = useTransferStore();
  const user = useAuthStore((state) => state.user);
  const isPro = user?.plan === 'PRO_LIFETIME';

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length === 1) {
        startRealFileTransfer(e.target.files[0]);
      } else {
        const filesWithPaths = Array.from(e.target.files).map((f) => ({
          file: f,
          relativePath: f.name,
        }));
        startFolderTransfer(filesWithPaths);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesWithPaths = Array.from(e.target.files).map((f) => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name,
      }));
      startFolderTransfer(filesWithPaths);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const allExtracted: { file: File; relativePath: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

        if (entry) {
          const files = await traverseFileTree(entry);
          allExtracted.push(...files);
        } else {
          const f = item.getAsFile();
          if (f) allExtracted.push({ file: f, relativePath: f.name });
        }
      }

      if (allExtracted.length === 1 && !allExtracted[0].relativePath.includes('/')) {
        startRealFileTransfer(allExtracted[0].file);
      } else if (allExtracted.length > 0) {
        startFolderTransfer(allExtracted);
      }
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1) {
        startRealFileTransfer(e.dataTransfer.files[0]);
      } else {
        const filesWithPaths = Array.from(e.dataTransfer.files).map((f) => ({
          file: f,
          relativePath: f.name,
        }));
        startFolderTransfer(filesWithPaths);
      }
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
      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
        isDragOver
          ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(76,215,246,0.2)]'
          : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'
      }`}
    >
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFolderChange}
        {...({ webkitdirectory: '', directory: '' } as any)}
      />

      <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary shadow-sm">
        <UploadCloud className="w-6 h-6 animate-bounce" />
      </div>

      <div>
        <span className="font-headline text-sm font-bold text-on-surface">
          Seret File atau Direktori Folder ke sini
        </span>
        <p className="text-xs text-on-surface-variant mt-0.5">
          WebRTC binary chunk streaming · Free Tier hingga 1 GB · Pro Unlimited Folder Tree
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-white/[0.04] transition-all active:scale-95"
        >
          <FileUp className="w-3.5 h-3.5 text-primary" />
          <span>Pilih File</span>
        </button>

        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-white/[0.04] transition-all active:scale-95 group"
        >
          <FolderUp className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" />
          <span>Pilih Folder</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
            isPro ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
          }`}>
            PRO
          </span>
        </button>
      </div>

      {!isPro && (
        <div className="flex items-center gap-1 text-[11px] font-mono text-on-surface-variant/80">
          <Sparkles className="w-3 h-3 text-secondary" />
          <span>Single/Multi file maks 1 GB (Free) · Folder Tree & Auto-Resume (Pro)</span>
        </div>
      )}
    </div>
  );
};
