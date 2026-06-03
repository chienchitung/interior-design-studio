import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Plus } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  description?: string;
  // Single mode
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  // Multiple mode
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  compact?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  description,
  file,
  onFileChange,
  files,
  onFilesChange,
  multiple = false,
  maxFiles = Infinity,
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Single-file preview URL — managed via effect to avoid per-render leaks
  const [singlePreview, setSinglePreview] = useState<string | null>(null);
  // Previews for multiple files to avoid constant URL regeneration
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!multiple && file) {
      const url = URL.createObjectURL(file);
      setSinglePreview(url);
      return () => { URL.revokeObjectURL(url); };
    } else {
      setSinglePreview(null);
    }
  }, [file, multiple]);

  useEffect(() => {
    if (multiple && files) {
      const newPreviews = files.map(f => URL.createObjectURL(f));
      setPreviews(newPreviews);
      return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
      };
    }
  }, [files, multiple]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp') {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) return;

    if (multiple && onFilesChange && files) {
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;
      onFilesChange([...files, ...validFiles.slice(0, remaining)]);
    } else if (onFileChange) {
      onFileChange(validFiles[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    // Reset input so same file can be selected again if needed
    if (inputRef.current) inputRef.current.value = '';
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFileChange) onFileChange(null);
  };

  const removeFileAtIndex = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (multiple && onFilesChange && files) {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      onFilesChange(newFiles);
    }
  };

  const hasFiles = multiple ? (files && files.length > 0) : !!file;

  if (compact) {
    return (
      <div className="w-full">
        <div
          className={`relative group border border-dashed rounded-lg transition-all flex items-center gap-2 px-2.5 py-2
            ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/40'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" ref={inputRef} className="hidden"
            accept="image/png, image/jpeg, image/webp" multiple={multiple} onChange={handleFileSelect} />

          {/* Clickable area (left side) */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => inputRef.current?.click()}>
            {hasFiles ? (
              <>
                {!multiple && singlePreview && (
                  <img src={singlePreview} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                )}
                {multiple && files && files.length > 0 && (
                  <div className="flex -space-x-1 flex-shrink-0">
                    {files.slice(0, 3).map((f, i) => (
                      <img key={i} src={previews[i] || ''} alt="" className="w-6 h-6 object-cover rounded border border-neutral-700" />
                    ))}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-neutral-300 truncate">{label}</p>
                  <p className="text-[9px] text-emerald-400">
                    {multiple ? `${files?.length ?? 0} 張` : '已上傳'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 bg-neutral-800 rounded flex items-center justify-center flex-shrink-0">
                  <Upload size={13} className="text-neutral-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-neutral-400">{label}</p>
                  <p className="text-[9px] text-neutral-600">{description || '點擊上傳'}</p>
                </div>
              </>
            )}
          </div>

          {/* Remove button — only shown when file(s) exist */}
          {hasFiles && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!multiple && onFileChange) onFileChange(null);
                if (multiple && onFilesChange) onFilesChange([]);
              }}
              className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-all"
              title="移除"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-medium text-neutral-300">{label}</label>
        {description && <span className="text-xs text-neutral-500">{description}</span>}
      </div>

      <div
        className={`relative group border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
          ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50'}
          ${hasFiles ? 'min-h-32' : 'h-32'}
          cursor-pointer
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          multiple={multiple}
          onChange={handleFileSelect}
        />

        {/* SINGLE MODE DISPLAY */}
        {!multiple && singlePreview && (
          <div className="absolute inset-0 p-2 w-full h-full">
            <img
              src={singlePreview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <p className="text-white text-sm font-medium">點擊重新上傳</p>
            </div>
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 p-1 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* MULTIPLE MODE DISPLAY */}
        {multiple && files && files.length > 0 && (
          <div className="p-3 grid grid-cols-3 gap-2">
            {files.map((f, idx) => (
              <div 
                key={idx} 
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-600 group/item cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                 <img 
                    src={previews[idx] || ""} 
                    alt={`Preview ${idx}`}
                    className="w-full h-full object-cover"
                 />
                 <button
                    onClick={(e) => removeFileAtIndex(e, idx)}
                    className="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors opacity-0 group-hover/item:opacity-100"
                 >
                    <X size={12} />
                 </button>
              </div>
            ))}
            {/* Add More — hidden when at limit */}
            {files.length < maxFiles && (
              <div
                className="aspect-square rounded-lg border border-neutral-700 border-dashed flex flex-col items-center justify-center text-neutral-500 hover:bg-neutral-700/50 transition-colors hover:text-neutral-300"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <Plus size={20} />
                <span className="text-[10px] mt-1">新增</span>
              </div>
            )}
            {files.length >= maxFiles && maxFiles !== Infinity && (
              <div className="aspect-square rounded-lg border border-neutral-800 flex flex-col items-center justify-center text-neutral-600">
                <span className="text-[10px] text-center leading-tight">已達<br/>上限</span>
              </div>
            )}
          </div>
        )}
 
        {/* EMPTY STATE */}
        {!hasFiles && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 pointer-events-none">
            <div className={`p-3 rounded-full mb-2 ${isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-neutral-800 text-neutral-500'}`}>
              <Upload size={20} />
            </div>
            <p className="text-sm font-medium">點擊或拖曳檔案至此</p>
            <p className="text-xs text-neutral-600 mt-1">支援格式 JPG, PNG, WebP</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;