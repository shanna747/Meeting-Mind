const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class FileStorageService {
  constructor() {
    // Check if we're using S3 or local storage
    this.useS3 = process.env.USE_S3 === 'true';

    if (this.useS3) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      this.bucketName = process.env.AWS_S3_BUCKET;
    }
  }

  /**
   * Upload file to S3 or local storage
   */
  async uploadFile(file, folder = 'documentation') {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;

    if (this.useS3) {
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname
        }
      });

      await this.s3Client.send(command);

      return {
        id: crypto.randomBytes(16).toString('hex'),
        filename: fileName,
        originalName: file.originalname,
        path: fileName, // S3 key
        size: file.size,
        uploadedAt: new Date().toISOString(),
        storage: 's3',
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`
      };
    } else {
      // Local storage (file is already saved by multer)
      return {
        id: crypto.randomBytes(16).toString('hex'),
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        storage: 'local'
      };
    }
  }

  /**
   * Get signed URL for S3 file (temporary access)
   */
  async getFileUrl(filePath, expiresIn = 3600) {
    if (this.useS3) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } else {
      // For local files, return the file path
      return filePath;
    }
  }

  /**
   * Delete file from S3 or local storage
   */
  async deleteFile(filePath) {
    if (this.useS3) {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      });

      await this.s3Client.send(command);
    } else {
      // Delete local file
      const fs = require('fs').promises;
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting local file:', error);
      }
    }
  }

  /**
   * Get file content (for reading)
   */
  async getFileContent(filePath) {
    if (this.useS3) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body;

      // Convert stream to string
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString('utf-8');
    } else {
      // Read local file
      const fs = require('fs').promises;
      return await fs.readFile(filePath, 'utf-8');
    }
  }

  /**
   * Check if S3 is configured
   */
  isS3Configured() {
    return this.useS3 &&
           this.bucketName &&
           process.env.AWS_ACCESS_KEY_ID &&
           process.env.AWS_SECRET_ACCESS_KEY;
  }
}

module.exports = new FileStorageService();
