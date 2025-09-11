import AWS from 'aws-sdk';
import { config } from '../config/environment';
import { FileContent, FileTree } from '../types/file';
import crypto from 'crypto';
import path from 'path';

export interface CloudStorageConfig {
  provider: 'aws' | 'local';
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  conflicts?: ConflictInfo[];
  synced?: string[];
  errors?: string[];
}

export interface ConflictInfo {
  filePath: string;
  localChecksum: string;
  remoteChecksum: string;
  localModified: Date;
  remoteModified: Date;
}

export interface BackupInfo {
  id: string;
  projectId: string;
  timestamp: Date;
  fileCount: number;
  size: number;
  checksum: string;
}

class CloudStorageService {
  private s3: AWS.S3 | null = null;
  private config: CloudStorageConfig;

  constructor() {
    this.config = {
      provider: (config.cloudStorage?.provider as 'aws' | 'local') || 'local',
      aws: config.cloudStorage?.aws ? {
        accessKeyId: config.cloudStorage.aws.accessKeyId,
        secretAccessKey: config.cloudStorage.aws.secretAccessKey,
        region: config.cloudStorage.aws.region,
        bucket: config.cloudStorage.aws.bucket,
      } : undefined,
    };

    if (this.config.provider === 'aws' && this.config.aws) {
      this.initializeAWS();
    }
  }

  private initializeAWS(): void {
    if (!this.config.aws) {
      throw new Error('AWS configuration is required for AWS provider');
    }

    AWS.config.update({
      accessKeyId: this.config.aws.accessKeyId,
      secretAccessKey: this.config.aws.secretAccessKey,
      region: this.config.aws.region,
    });

    this.s3 = new AWS.S3();
  }

  /**
   * Upload file to cloud storage
   */
  async uploadFile(projectId: string, filePath: string, content: string, metadata?: any): Promise<boolean> {
    try {
      if (this.config.provider === 'local') {
        return true;
      }

      if (!this.s3 || !this.config.aws) {
        throw new Error('AWS S3 not configured');
      }

      const key = `projects/${projectId}/${filePath}`;
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.config.aws.bucket,
        Key: key,
        Body: content,
        ContentType: this.getContentType(filePath),
        Metadata: {
          projectId,
          filePath,
          checksum: crypto.createHash('md5').update(content).digest('hex'),
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      await this.s3.upload(params).promise();
      return true;
    } catch (error) {
      console.error('Failed to upload file to cloud storage:', error);
      return false;
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
    };
    return contentTypes[ext] || 'text/plain';
  }
}

export const cloudStorageService = new CloudStorageService();