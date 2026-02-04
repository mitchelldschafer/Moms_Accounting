'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string | null;
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept = '.pdf,.jpg,.jpeg,.png,.heic',
  maxSize = 52428800,
  multiple = true,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
    }

    const allowedTypes = accept.split(',').map((t) => t.trim());
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(extension)) {
      return `File type not allowed. Accepted: ${accept}`;
    }

    return null;
  };

  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles: FileWithProgress[] = Array.from(selectedFiles).map((file) => {
        const error = validateFile(file);
        return {
          file,
          progress: 0,
          status: error ? ('error' as const) : ('pending' as const),
          error,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < newFiles.length; i++) {
        const fileWithProgress = newFiles[i];

        if (fileWithProgress.status === 'error') continue;

        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileWithProgress.file
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        try {
          await onUpload(fileWithProgress.file);

          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? { ...f, status: 'success', progress: 100 }
                : f
            )
          );
        } catch (error) {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? {
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      }
    },
    [onUpload]
  );

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop files here, or click to select
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, JPG, PNG, HEIC up to {Math.round(maxSize / 1024 / 1024)}MB
        </p>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Select Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileWithProgress.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(fileWithProgress.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {fileWithProgress.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all"
                        style={{ width: `${fileWithProgress.progress}%` }}
                      />
                    </div>
                  )}

                  {fileWithProgress.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">{fileWithProgress.error}</p>
                  )}

                  {fileWithProgress.status === 'success' && (
                    <p className="text-xs text-green-600 mt-1">Uploaded successfully</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {fileWithProgress.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                )}

                {(fileWithProgress.status === 'pending' || fileWithProgress.status === 'error') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileWithProgress.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
