import { useState, useEffect } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  File, 
  Plus, 
  MoreVertical,
  Trash2,
  Edit2,
  FolderPlus,
  FilePlus,
  HardDrive,
  Cloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FolderItem, FileItem } from '@/lib/types'
import { fileSystemManager, isFileSystemSupported } from '@/lib/filesystem'

interface SidebarProps {
  folders: FolderItem[]
  activeFileId: string | null
  activeFolderId: string | null
  onFileSelect: (folderId: string, fileId: string) => void
  onFolderToggle: (folderId: string) => void
  onFolderCreate: () => void
  onFileCreate: (folderId: string) => void
  onFolderRename: (folderId: string, newName: string) => void
  onFileRename: (folderId: string, fileId: string, newName: string) => void
  onFolderDelete: (folderId: string) => void
  onFileDelete: (folderId: string, fileId: string) => void
}

export function Sidebar({
  folders,
  activeFileId,
  activeFolderId,
  onFileSelect,
  onFolderToggle,
  onFolderCreate,
  onFileCreate,
  onFolderRename,
  onFileRename,
  onFolderDelete,
  onFileDelete
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [fsSupported, setFsSupported] = useState(false)

  useEffect(() => {
    setFsSupported(isFileSystemSupported())
    setStorageLocation(fileSystemManager.getCurrentPath())
  }, [])

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const finishEditing = (type: 'folder' | 'file', folderId: string, fileId?: string) => {
    if (editingName.trim()) {
      if (type === 'folder') {
        onFolderRename(folderId, editingName.trim())
      } else if (fileId) {
        onFileRename(folderId, fileId, editingName.trim())
      }
    }
    setEditingId(null)
    setEditingName('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  return (
    <div className="w-64 border-r bg-gradient-to-b from-muted/40 to-muted/20 flex flex-col h-full animate-fade-in backdrop-blur-sm">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            Documents
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-accent/50 transition-all duration-200 hover:scale-105 shadow-glow"
            onClick={onFolderCreate}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* Storage status indicator */}
        <div className="mb-4 px-3 py-2 text-xs text-muted-foreground border-b border-border/30 bg-accent/10 rounded-lg mx-1 animate-slide-up">
          <div className="flex items-center gap-2">
            {fsSupported ? (
              <HardDrive className="h-3 w-3 text-green-500" />
            ) : (
              <Cloud className="h-3 w-3 text-blue-500" />
            )}
            <span className="truncate font-medium">{storageLocation}</span>
          </div>
        </div>

        {folders.map((folder) => (
          <div key={folder.id} className="mb-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 group transition-all duration-200 hover:shadow-card mx-1",
                activeFolderId === folder.id && "bg-gradient-to-r from-accent/60 to-accent/40 shadow-glow"
              )}
            >
              <button
                onClick={() => onFolderToggle(folder.id)}
                className="p-1 hover:bg-accent/30 rounded transition-all duration-150"
              >
                {folder.isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-primary/70" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              
              <Folder className="h-4 w-4 text-amber-500 group-hover:text-amber-400 transition-colors duration-200" />
              
              {editingId === folder.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => finishEditing('folder', folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEditing('folder', folder.id)
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  className="h-6 text-sm flex-1"
                  autoFocus
                />
              ) : (
                <span className="text-sm flex-1 truncate">{folder.name}</span>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-accent/60 hover:scale-105 transition-all duration-150"
                  onClick={() => onFileCreate(folder.id)}
                >
                  <FilePlus className="h-3 w-3" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(folder.id, folder.name)}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileCreate(folder.id)}>
                      <FilePlus className="h-3 w-3 mr-2" />
                      New File
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onFolderDelete(folder.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {folder.isExpanded && (
              <div className="ml-4 mt-1">
                {folder.files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/40 group cursor-pointer transition-all duration-200 mx-1 hover:shadow-card",
                      activeFileId === file.id && "bg-gradient-to-r from-primary/20 to-primary/10 shadow-glow border-l-2 border-primary/50"
                    )}
                    onClick={() => onFileSelect(folder.id, file.id)}
                  >
                    <File className="h-3 w-3 text-blue-500 group-hover:text-blue-400 transition-colors duration-200" />
                    
                    {editingId === file.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => finishEditing('file', folder.id, file.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditing('file', folder.id, file.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-sm flex-1"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(file.id, file.name)
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onFileDelete(folder.id, file.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}