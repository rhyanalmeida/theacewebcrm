'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatFileSize, formatDate, getFileIcon } from '@/lib/utils'
import { projectService } from '@/services/projects'
import { 
  Download, 
  Search, 
  Filter,
  FileText,
  FolderOpen,
  Grid,
  List,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Database } from '@/types/database'

type ProjectFile = Database['public']['Tables']['project_files']['Row']

interface FileManagerProps {
  projectId?: string
  clientId: string
}

export function FileManager({ projectId, clientId }: FileManagerProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFiles()
  }, [projectId, clientId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      let filesData: ProjectFile[]

      if (projectId) {
        filesData = await projectService.getProjectFiles(projectId)
      } else {
        // Load all files for client (would need a different service method)
        filesData = []
      }

      setFiles(filesData)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (file: ProjectFile) => {
    if (downloadingFiles.has(file.id)) return

    try {
      setDownloadingFiles(prev => new Set(prev).add(file.id))
      
      const { file: blob, filename } = await projectService.downloadFile(file.id)
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { value: 'all', label: 'All Files', count: files.length },
    { value: 'deliverable', label: 'Deliverables', count: files.filter(f => f.category === 'deliverable').length },
    { value: 'asset', label: 'Assets', count: files.filter(f => f.category === 'asset').length },
    { value: 'document', label: 'Documents', count: files.filter(f => f.category === 'document').length },
    { value: 'feedback', label: 'Feedback', count: files.filter(f => f.category === 'feedback').length },
    { value: 'other', label: 'Other', count: files.filter(f => f.category === 'other').length },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>File Manager</CardTitle>
              <CardDescription>
                Access and download your project files and deliverables
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[120px]">
                  <Filter className="h-4 w-4 mr-2" />
                  {categories.find(c => c.value === selectedCategory)?.label}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    {category.label}
                    <Badge variant="secondary" className="ml-auto">
                      {category.count}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid/List */}
      {filteredFiles.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2'
        }>
          {filteredFiles.map((file) => (
            <Card 
              key={file.id} 
              className={
                viewMode === 'grid' 
                  ? 'hover:shadow-md transition-shadow cursor-pointer'
                  : 'hover:bg-muted/50 transition-colors'
              }
            >
              <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-3'}>
                <div className={
                  viewMode === 'grid' 
                    ? 'space-y-3' 
                    : 'flex items-center justify-between'
                }>
                  <div className={viewMode === 'grid' ? 'space-y-2' : 'flex items-center space-x-3'}>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                      {viewMode === 'list' && (
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {viewMode === 'grid' && (
                      <div>
                        <h3 className="font-medium text-sm truncate">{file.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    )}

                    <div className={viewMode === 'grid' ? 'flex items-center justify-between' : ''}>
                      <Badge 
                        variant="outline" 
                        className={viewMode === 'list' ? 'ml-auto mr-2' : ''}
                      >
                        {file.category}
                      </Badge>
                      
                      {viewMode === 'grid' && (
                        <div className="text-xs text-muted-foreground">
                          {formatDate(file.created_at, { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={viewMode === 'grid' ? 'pt-2 border-t' : ''}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={downloadingFiles.has(file.id)}
                      className={viewMode === 'grid' ? 'w-full' : ''}
                    >
                      {downloadingFiles.has(file.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No files found</h3>
            <p className="mt-2 text-muted-foreground">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Files will appear here as they become available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}