'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react'
import { format } from 'date-fns'
import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ProjectFile = Database['public']['Tables']['project_files']['Row']

interface DocumentViewerProps {
  file: ProjectFile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentViewer({ file, open, onOpenChange }: DocumentViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (open && file) {
      loadFileUrl()
    }
    
    return () => {
      // Cleanup object URL when component unmounts
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [open, file])

  const loadFileUrl = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get signed URL for the file
      const { data, error: urlError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 3600) // 1 hour expiry

      if (urlError) throw urlError
      
      setFileUrl(data.signedUrl)
    } catch (err) {
      console.error('Failed to load file:', err)
      setError('Failed to load file preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)

      // Update download count
      await supabase
        .from('project_files')
        .update({ download_count: file.download_count + 1 })
        .eq('id', file.id)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const getFileType = (): string => {
    return file.file_type.split('/')[0]
  }

  const isImage = () => getFileType() === 'image'
  const isPdf = () => file.file_type === 'application/pdf'
  const isVideo = () => getFileType() === 'video'
  const isAudio = () => getFileType() === 'audio'
  const isText = () => getFileType() === 'text'

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 500))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleResetView = () => {
    setZoom(100)
    setRotation(0)
  }

  const renderFileContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      )
    }

    if (error || !fileUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error || 'Failed to load file'}</p>
            <Button variant="outline" onClick={loadFileUrl}>
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    // Image viewer
    if (isImage()) {
      return (
        <div className="relative overflow-auto max-h-[70vh] bg-gray-100 dark:bg-gray-900 rounded-lg">
          <img
            src={fileUrl}
            alt={file.name}
            className="mx-auto block"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>
      )
    }

    // PDF viewer
    if (isPdf()) {
      return (
        <div className="relative">
          <div className="mb-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <iframe
            src={`${fileUrl}#page=${currentPage}&zoom=${zoom}`}
            className="w-full h-96 border rounded"
            title={file.name}
          />
        </div>
      )
    }

    // Video player
    if (isVideo()) {
      return (
        <div className="relative">
          <video
            src={fileUrl}
            className="w-full max-h-96 bg-black rounded"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => {
              const video = e.target as HTMLVideoElement
              setIsMuted(video.muted || video.volume === 0)
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    // Audio player
    if (isAudio()) {
      return (
        <div className="p-8 text-center">
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-medium mb-4">{file.name}</h3>
          <audio
            src={fileUrl}
            className="w-full"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      )
    }

    // Text viewer
    if (isText()) {
      return (
        <div className="max-h-96 overflow-auto">
          <iframe
            src={fileUrl}
            className="w-full h-96 border rounded"
            title={file.name}
          />
        </div>
      )
    }

    // Fallback for unsupported file types
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="font-medium mb-2">Preview not available</h3>
          <p className="text-muted-foreground mb-4">
            This file type cannot be previewed in the browser
          </p>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download to view
          </Button>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'deliverable': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'asset': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'document': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'feedback': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <DialogDescription className="flex items-center space-x-4 mt-1">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>Modified {format(new Date(file.updated_at), 'MMM d, yyyy')}</span>
                <span>•</span>
                <Badge className={getCategoryColor(file.category)} variant="secondary">
                  {file.category}
                </Badge>
              </DialogDescription>
            </div>
            
            {/* Viewer Controls */}
            <div className="flex items-center space-x-2 ml-4">
              {(isImage() || isPdf()) && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 25}
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm font-medium min-w-[50px] text-center">
                    {zoom}%
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 500}
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {isImage() && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* File Content */}
        <div className="space-y-4">
          {renderFileContent()}
          
          {/* File Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t text-sm">
            <div>
              <span className="text-muted-foreground">File Type:</span>
              <span className="ml-2 font-medium">{file.file_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Downloads:</span>
              <span className="ml-2 font-medium">{file.download_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Added:</span>
              <span className="ml-2 font-medium">
                {format(new Date(file.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}