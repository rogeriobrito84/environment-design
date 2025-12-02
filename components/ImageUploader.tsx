import React, { useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string, mimeType: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      onImageSelect(result, file.type);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onImageSelect(result, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="w-full max-w-2xl mx-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div 
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-current/20 rounded-[2rem] p-12 text-center cursor-pointer hover:border-current/50 hover:bg-current/5 transition-all duration-300 group backdrop-blur-sm"
      >
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="w-24 h-24 rounded-full bg-current/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
             <h3 className="text-2xl font-bold mb-2">Upload da Foto</h3>
             <p className="opacity-60 text-sm">Clique para buscar ou arraste o arquivo aqui</p>
             <p className="text-xs opacity-40 mt-4 uppercase tracking-widest font-semibold">JPG, PNG</p>
          </div>
        </div>
      </div>
    </div>
  );
};