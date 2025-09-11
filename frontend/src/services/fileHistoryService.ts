export interface FileVersion {
  id: string;
  filePath: string;
  content: string;
  timestamp: Date;
  checksum: string;
  size: number;
  changeType: 'create' | 'update' | 'delete';
  description?: string;
}

export interface FileHistory {
  filePath: string;
  versions: FileVersion[];
  currentVersion: string;
}

class FileHistoryService {
  private readonly STORAGE_KEY = 'kiro-file-history';
  private readonly MAX_VERSIONS_PER_FILE = 50;
  private readonly MAX_TOTAL_VERSIONS = 1000;

  /**
   * Save a new version of a file to history
   */
  saveVersion(
    projectId: string,
    filePath: string,
    content: string,
    checksum: string,
    changeType: FileVersion['changeType'] = 'update',
    description?: string
  ): void {
    const histories = this.getProjectHistories(projectId);
    const fileHistory = histories[filePath] || { filePath, versions: [], currentVersion: '' };

    const version: FileVersion = {
      id: this.generateVersionId(),
      filePath,
      content,
      timestamp: new Date(),
      checksum,
      size: new Blob([content]).size,
      changeType,
      description,
    };

    fileHistory.versions.unshift(version);
    fileHistory.currentVersion = version.id;

    // Limit versions per file
    if (fileHistory.versions.length > this.MAX_VERSIONS_PER_FILE) {
      fileHistory.versions = fileHistory.versions.slice(0, this.MAX_VERSIONS_PER_FILE);
    }

    histories[filePath] = fileHistory;

    // Limit total versions across all files
    this.limitTotalVersions(histories);

    this.saveProjectHistories(projectId, histories);
  }

  /**
   * Get file history for a specific file
   */
  getFileHistory(projectId: string, filePath: string): FileHistory | null {
    const histories = this.getProjectHistories(projectId);
    return histories[filePath] || null;
  }

  /**
   * Get all file histories for a project
   */
  getAllHistories(projectId: string): Record<string, FileHistory> {
    return this.getProjectHistories(projectId);
  }

  /**
   * Get a specific version of a file
   */
  getVersion(projectId: string, filePath: string, versionId: string): FileVersion | null {
    const history = this.getFileHistory(projectId, filePath);
    if (!history) return null;

    return history.versions.find(v => v.id === versionId) || null;
  }

  /**
   * Restore a file to a previous version
   */
  restoreVersion(projectId: string, filePath: string, versionId: string): FileVersion | null {
    const version = this.getVersion(projectId, filePath, versionId);
    if (!version) return null;

    // Create a new version based on the restored content
    this.saveVersion(
      projectId,
      filePath,
      version.content,
      version.checksum,
      'update',
      `Restored from version ${versionId.slice(0, 8)}`
    );

    return version;
  }

  /**
   * Delete file history
   */
  deleteFileHistory(projectId: string, filePath: string): void {
    const histories = this.getProjectHistories(projectId);
    delete histories[filePath];
    this.saveProjectHistories(projectId, histories);
  }

  /**
   * Clear all history for a project
   */
  clearProjectHistory(projectId: string): void {
    localStorage.removeItem(`${this.STORAGE_KEY}-${projectId}`);
  }

  /**
   * Get file differences between two versions
   */
  getVersionDiff(
    projectId: string,
    filePath: string,
    fromVersionId: string,
    toVersionId: string
  ): { added: string[]; removed: string[]; modified: string[] } | null {
    const fromVersion = this.getVersion(projectId, filePath, fromVersionId);
    const toVersion = this.getVersion(projectId, filePath, toVersionId);

    if (!fromVersion || !toVersion) return null;

    const fromLines = fromVersion.content.split('\n');
    const toLines = toVersion.content.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const maxLines = Math.max(fromLines.length, toLines.length);

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i];
      const toLine = toLines[i];

      if (fromLine === undefined && toLine !== undefined) {
        added.push(`+${i + 1}: ${toLine}`);
      } else if (fromLine !== undefined && toLine === undefined) {
        removed.push(`-${i + 1}: ${fromLine}`);
      } else if (fromLine !== toLine) {
        modified.push(`~${i + 1}: ${fromLine} → ${toLine}`);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(projectId: string): {
    totalFiles: number;
    totalVersions: number;
    totalSize: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
  } {
    const histories = this.getProjectHistories(projectId);
    let totalVersions = 0;
    let totalSize = 0;
    let oldestVersion: Date | null = null;
    let newestVersion: Date | null = null;

    Object.values(histories).forEach(history => {
      history.versions.forEach(version => {
        totalVersions++;
        totalSize += version.size;

        if (!oldestVersion || version.timestamp < oldestVersion) {
          oldestVersion = version.timestamp;
        }
        if (!newestVersion || version.timestamp > newestVersion) {
          newestVersion = version.timestamp;
        }
      });
    });

    return {
      totalFiles: Object.keys(histories).length,
      totalVersions,
      totalSize,
      oldestVersion,
      newestVersion,
    };
  }

  private getProjectHistories(projectId: string): Record<string, FileHistory> {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}-${projectId}`);
      if (!stored) return {};

      const parsed = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      Object.values(parsed).forEach((history: any) => {
        history.versions.forEach((version: any) => {
          version.timestamp = new Date(version.timestamp);
        });
      });

      return parsed;
    } catch (error) {
      console.warn('Failed to load file histories:', error);
      return {};
    }
  }

  private saveProjectHistories(projectId: string, histories: Record<string, FileHistory>): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}-${projectId}`, JSON.stringify(histories));
    } catch (error) {
      console.warn('Failed to save file histories:', error);
      // If storage is full, try to clean up old versions
      this.cleanupOldVersions(projectId);
    }
  }

  private limitTotalVersions(histories: Record<string, FileHistory>): void {
    const allVersions: Array<{ filePath: string; version: FileVersion }> = [];

    Object.entries(histories).forEach(([filePath, history]) => {
      history.versions.forEach(version => {
        allVersions.push({ filePath, version });
      });
    });

    if (allVersions.length <= this.MAX_TOTAL_VERSIONS) return;

    // Sort by timestamp, oldest first
    allVersions.sort((a, b) => a.version.timestamp.getTime() - b.version.timestamp.getTime());

    // Remove oldest versions
    const versionsToRemove = allVersions.slice(0, allVersions.length - this.MAX_TOTAL_VERSIONS);

    versionsToRemove.forEach(({ filePath, version }) => {
      const history = histories[filePath];
      if (history) {
        history.versions = history.versions.filter(v => v.id !== version.id);
        if (history.versions.length === 0) {
          delete histories[filePath];
        }
      }
    });
  }

  private cleanupOldVersions(projectId: string): void {
    const histories = this.getProjectHistories(projectId);
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    Object.entries(histories).forEach(([filePath, history]) => {
      // Keep at least 5 versions per file, regardless of age
      const versionsToKeep = Math.max(5, this.MAX_VERSIONS_PER_FILE / 2);
      
      if (history.versions.length > versionsToKeep) {
        const recentVersions = history.versions.slice(0, versionsToKeep);
        const olderVersions = history.versions.slice(versionsToKeep);
        
        // Keep older versions only if they're newer than cutoff
        const filteredOlderVersions = olderVersions.filter(v => v.timestamp > cutoffDate);
        
        history.versions = [...recentVersions, ...filteredOlderVersions];
      }
    });

    this.saveProjectHistories(projectId, histories);
  }

  private generateVersionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const fileHistoryService = new FileHistoryService();