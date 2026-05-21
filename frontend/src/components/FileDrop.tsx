import { useRef, useState } from 'react';

interface Props {
  label: string;
  help?: string;
  accept?: string;
  required?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  files: File[];
}

export const FileDrop = ({ label, help, accept = '.pdf,.png,.jpg,.jpeg,.webp', required, multiple, onFiles, files }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    onFiles(multiple ? [...files, ...arr] : arr.slice(0, 1));
  };

  return (
    <div>
      <div className="field-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition
          ${drag ? 'border-brand-green bg-green-50' : 'border-slate-300 hover:border-brand-green hover:bg-slate-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-brand-green-dark">Click to upload</span> or drag and drop
        </div>
        <div className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, WebP — up to 10 MB each</div>
      </div>
      {help && <div className="field-help">{help}</div>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-md">
              <span className="truncate">{f.name} <span className="text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span></span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFiles(files.filter((_, idx) => idx !== i));
                }}
                className="text-red-600 hover:text-red-800 ml-3"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
