'use client'

import { useCallback, useState } from 'react'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  isLoading?: boolean
}

export function UploadDropzone({ 
  onFileSelect, 
  selectedFile, 
  onClear,
  isLoading 
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ]
    const allowedExtensions = ['.pdf', '.docx', '.md', '.txt']
    
    const hasAllowedType = allowedTypes.includes(file.type)
    const hasAllowedExt = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    return hasAllowedType || hasAllowedExt
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <File className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <button
              onClick={onClear}
              className="p-2 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      )}
    >
      <input
        type="file"
        accept=".pdf,.docx,.md,.txt"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer block">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop your CV here' : 'Drag & drop your CV here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
          <span className="px-2 py-1 bg-gray-100 rounded">DOCX</span>
          <span className="px-2 py-1 bg-gray-100 rounded">MD</span>
          <span className="px-2 py-1 bg-gray-100 rounded">TXT</span>
        </div>
        <p className="text-xs text-gray-400 mt-4">Maximum file size: 10MB</p>
      </label>
    </div>
  )
}
