'use client'

import { FileManager } from '@/components/files/file-manager'
import { useAuthContext } from '@/components/auth/auth-provider'

export default function FilesPage() {
  const { profile } = useAuthContext()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Files</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Access and download your project files and deliverables
        </p>
      </div>
      
      <FileManager clientId={profile?.id || ''} />
    </div>
  )
}