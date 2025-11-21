import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

class SpacesClient {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.SPACES_ENDPOINT,
      region: process.env.SPACES_REGION || 'nyc3',
      credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET
      }
    });
    this.bucket = process.env.SPACES_BUCKET;
  }

  /**
   * Upload file to DigitalOcean Spaces
   * @param {string} filePath - Local file path
   * @param {string} key - S3 key (path in bucket)
   * @returns {Promise<string>} - Public URL
   */
  async uploadFile(filePath, key) {
    try {
      const fileContent = fs.readFileSync(filePath);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileContent,
        ACL: 'public-read',
        ContentType: 'video/mp4'
      });

      await this.client.send(command);
      
      const publicUrl = `${process.env.SPACES_ENDPOINT}/${this.bucket}/${key}`;
      logger.info(`File uploaded to Spaces: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      logger.error('Error uploading to Spaces:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for private access
   * @param {string} key - S3 key
   * @param {number} expiresIn - Expiration in seconds (default 3600)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from Spaces
   * @param {string} key - S3 key
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      logger.info(`File deleted from Spaces: ${key}`);
    } catch (error) {
      logger.error('Error deleting from Spaces:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

export default new SpacesClient();
