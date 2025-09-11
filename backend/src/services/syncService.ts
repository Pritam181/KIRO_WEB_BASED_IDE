import cron from 'node-cron';
import { fileService } from './fileService';
import { projectService } from './projectService';
import { cloudStorageService } from './cloudStorageService';
import { config } from '../config/environment';

export interface SyncStatus {
  isEnabled: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  syncInProgress: boolean;
  totalFiles: number;
  syncedFiles: number;
  failedFiles: number;
  errors: string[];
}

class SyncService {
  private syncStatus: SyncStatus = {
    isEnabled: false,
    lastSync: null,
    nextSync: null,
    syncInProgress: false,
    totalFiles: 0,
    syncedFiles: 0,
    failedFiles: 0,
    errors: [],
  };

  private syncJob: cron.ScheduledTask | null = null;

  async initialize(): Promise<void> {
    // Only enable sync if cloud storage is configured
    if (config.cloudStorage.provider === 'aws' && config.cloudStorage.aws.accessKeyId) {
      this.syncStatus.isEnabled = true;
      this.startPeriodicSync();
      console.log('🔄 Sync service initialized with cloud storage');
    } else {
      console.log('📁 Sync service initialized in local mode');
    }
  }

  /**
   * Start periodic sync every 5 minutes
   */
  private startPeriodicSync(): void {
    if (this.syncJob) {
      this.syncJob.stop();
    }

    // Run sync every 5 minutes
    this.syncJob = cron.schedule('*/5 * * * *', async () => {
      await this.syncAllProjects();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Set next sync time
    this.updateNextSyncTime();
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
    }
    this.syncStatus.nextSync = null;
  }

  /**
   * Sync all projects
   */
  async syncAllProjects(): Promise<void> {
    if (!this.syncStatus.isEnabled || this.syncStatus.syncInProgress) {
      return;
    }

    console.log('🔄 Starting sync for all projects...');
    this.syncStatus.syncInProgress = true;
    this.syncStatus.errors = [];
    this.syncStatus.totalFiles = 0;
    this.syncStatus.syncedFiles = 0;
    this.syncStatus.failedFiles = 0;

    try {
      // Get all project directories
      const projectDirs = await this.getProjectDirectories();

      for (const projectId of projectDirs) {
        try {
          await this.syncProject(projectId);
        } catch (error) {
          const errorMsg = `Failed to sync project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          this.syncStatus.errors.push(errorMsg);
        }
      }

      this.syncStatus.lastSync = new Date();
      this.updateNextSyncTime();
      
      console.log(`✅ Sync completed. ${this.syncStatus.syncedFiles}/${this.syncStatus.totalFiles} files synced`);
    } catch (error) {
      const errorMsg = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      this.syncStatus.errors.push(errorMsg);
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * Sync specific project
   */
  async syncProject(projectId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing project: ${projectId}`);

      // Generate file tree for the project
      const fileTreeResult = await fileService.generateFileTree(projectId);
      
      if (!fileTreeResult.success || !fileTreeResult.data) {
        throw new Error(`Failed to get file tree: ${fileTreeResult.message}`);
      }

      // Sync with cloud storage
      const syncResult = await cloudStorageService.syncProject(projectId, fileTreeResult.data);
      
      if (syncResult.success) {
        this.syncStatus.syncedFiles += syncResult.synced?.length || 0;
        
        if (syncResult.conflicts && syncResult.conflicts.length > 0) {
          console.log(`⚠️ Found ${syncResult.conflicts.length} conflicts in project ${projectId}`);
          // Handle conflicts - for now, just log them
          syncResult.conflicts.forEach(conflict => {
            console.log(`Conflict in ${conflict.filePath}: local=${conflict.localChecksum}, remote=${conflict.remoteChecksum}`);
          });
        }
      } else {
        throw new Error(syncResult.message);
      }
    } catch (error) {
      this.syncStatus.failedFiles++;
      throw error;
    }
  }

  /**
   * Sync file immediately after modification
   */
  async syncFileImmediately(projectId: string, filePath: string, content: string): Promise<boolean> {
    if (!this.syncStatus.isEnabled) {
      return true; // Return true for local mode
    }

    try {
      const success = await cloudStorageService.uploadFile(projectId, filePath, content, {
        syncedAt: new Date().toISOString(),
        immediate: true,
      });

      if (success) {
        console.log(`✅ File synced immediately: ${projectId}/${filePath}`);
      } else {
        console.error(`❌ Failed to sync file immediately: ${projectId}/${filePath}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Error syncing file immediately: ${projectId}/${filePath}`, error);
      return false;
    }
  }

  /**
   * Create backup for project
   */
  async createProjectBackup(projectId: string): Promise<string | null> {
    try {
      console.log(`💾 Creating backup for project: ${projectId}`);

      // Generate file tree for the project
      const fileTreeResult = await fileService.generateFileTree(projectId);
      
      if (!fileTreeResult.success || !fileTreeResult.data) {
        throw new Error(`Failed to get file tree: ${fileTreeResult.message}`);
      }

      // Create backup
      const backup = await cloudStorageService.createBackup(projectId, fileTreeResult.data);
      
      if (backup) {
        console.log(`✅ Backup created: ${backup.id} (${backup.fileCount} files, ${(backup.size / 1024).toFixed(1)} KB)`);
        return backup.id;
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (error) {
      console.error(`❌ Failed to create backup for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * List backups for project
   */
  async listProjectBackups(projectId: string): Promise<any[]> {
    try {
      return await cloudStorageService.listBackups(projectId);
    } catch (error) {
      console.error(`❌ Failed to list backups for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Restore project from backup
   */
  async restoreProjectBackup(projectId: string, backupId: string): Promise<boolean> {
    try {
      console.log(`🔄 Restoring project ${projectId} from backup ${backupId}`);
      
      const success = await cloudStorageService.restoreBackup(projectId, backupId);
      
      if (success) {
        console.log(`✅ Project restored from backup: ${projectId}`);
      } else {
        console.error(`❌ Failed to restore project from backup: ${projectId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error restoring project from backup:`, error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Enable/disable sync
   */
  setSyncEnabled(enabled: boolean): void {
    this.syncStatus.isEnabled = enabled;
    
    if (enabled && config.cloudStorage.provider === 'aws') {
      this.startPeriodicSync();
    } else {
      this.stopPeriodicSync();
    }
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<void> {
    if (this.syncStatus.syncInProgress) {
      throw new Error('Sync already in progress');
    }
    
    await this.syncAllProjects();
  }

  /**
   * Get project directories
   */
  private async getProjectDirectories(): Promise<string[]> {
    // This would integrate with the project service to get all project IDs
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Update next sync time
   */
  private updateNextSyncTime(): void {
    if (this.syncJob) {
      // Calculate next sync time (5 minutes from now)
      const nextSync = new Date();
      nextSync.setMinutes(nextSync.getMinutes() + 5);
      this.syncStatus.nextSync = nextSync;
    }
  }

  /**
   * Handle file operation for sync
   */
  async handleFileOperation(
    operation: 'create' | 'update' | 'delete',
    projectId: string,
    filePath: string,
    content?: string
  ): Promise<void> {
    if (!this.syncStatus.isEnabled) {
      return;
    }

    try {
      switch (operation) {
        case 'create':
        case 'update':
          if (content !== undefined) {
            await this.syncFileImmediately(projectId, filePath, content);
          }
          break;
          
        case 'delete':
          await cloudStorageService.deleteFile(projectId, filePath);
          console.log(`🗑️ File deleted from cloud: ${projectId}/${filePath}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to handle file operation ${operation} for ${projectId}/${filePath}:`, error);
    }
  }
}

export const syncService = new SyncService();