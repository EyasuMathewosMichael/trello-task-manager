// Feature: trello-task-manager, Attachment Service
import { v2 as cloudinary } from 'cloudinary';
import Task from '../models/Task.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB in bytes

const PERMITTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Uploads a buffer to Cloudinary using upload_stream.
 * Returns the Cloudinary upload result.
 *
 * @param {Buffer} buffer
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Extracts the Cloudinary public_id from a Cloudinary URL.
 * Cloudinary URLs follow the pattern:
 *   https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
 * or without version:
 *   https://res.cloudinary.com/<cloud_name>/raw/upload/<public_id>
 *
 * @param {string} url - Cloudinary asset URL
 * @returns {string} public_id (without file extension)
 */
function extractPublicId(url) {
  // Remove query string if present
  const cleanUrl = url.split('?')[0];
  // Match everything after /upload/ (optionally skipping a version segment v\d+/)
  const match = cleanUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) {
    throw new Error(`Cannot extract public_id from URL: ${url}`);
  }
  // Strip file extension
  const withExt = match[1];
  const lastDot = withExt.lastIndexOf('.');
  return lastDot !== -1 ? withExt.substring(0, lastDot) : withExt;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Validates, uploads, and records a file attachment on a task.
 *
 * @param {string|ObjectId} taskId  - The task to attach the file to
 * @param {string|ObjectId} userId  - The user uploading the file
 * @param {object}          file    - Multer file object (memoryStorage)
 *   @param {string} file.originalname
 *   @param {number} file.size
 *   @param {string} file.mimetype
 *   @param {Buffer} file.buffer
 * @returns {Promise<object>} The new attachment subdocument
 */
async function uploadAttachment(taskId, userId, file) {
  // ── Configure Cloudinary (read env vars at call time, not module load time) ─
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // ── Validate file size ──────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('File too large');
    err.status = 413;
    throw err;
  }

  // ── Validate MIME type ──────────────────────────────────────────────────────
  if (!PERMITTED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Unsupported media type');
    err.status = 415;
    throw err;
  }

  // ── Find the task ───────────────────────────────────────────────────────────
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  // ── Upload to Cloudinary ────────────────────────────────────────────────────
  let uploadResult;
  try {
    uploadResult = await uploadToCloudinary(file.buffer, {
      resource_type: 'auto',
      folder: `task-attachments/${taskId}`,
    });
  } catch (cloudinaryErr) {
    console.error('Cloudinary upload error:', cloudinaryErr?.message || cloudinaryErr);
    const err = new Error(`File upload failed: ${cloudinaryErr?.message || 'Cloudinary error'}`);
    err.status = 502;
    throw err;
  }

  // ── Store attachment metadata on the task ───────────────────────────────────
  const attachmentData = {
    url:        uploadResult.secure_url,
    filename:   file.originalname,
    size:       file.size,
    mimeType:   file.mimetype,
    uploadedBy: userId,
    uploadedAt: new Date(),
  };

  task.attachments.push(attachmentData);
  await task.save();

  // Return the newly added subdocument (last element)
  return task.attachments[task.attachments.length - 1];
}

/**
 * Deletes an attachment from a task. Only the uploader may delete their attachment.
 *
 * @param {string|ObjectId} taskId        - The task that owns the attachment
 * @param {string|ObjectId} attachmentId  - The attachment subdocument _id
 * @param {string|ObjectId} userId        - The user requesting deletion
 * @returns {Promise<void>}
 */
async function deleteAttachment(taskId, attachmentId, userId) {
  // ── Configure Cloudinary ────────────────────────────────────────────────────
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // ── Find the task ───────────────────────────────────────────────────────────
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  // ── Find the attachment subdocument ─────────────────────────────────────────
  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    const err = new Error('Attachment not found');
    err.status = 404;
    throw err;
  }

  // ── Ownership check ─────────────────────────────────────────────────────────
  if (attachment.uploadedBy.toString() !== userId.toString()) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // ── Delete from Cloudinary ──────────────────────────────────────────────────
  try {
    const publicId = extractPublicId(attachment.url);
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  } catch (cloudinaryErr) {
    // Log but do not block the deletion of the metadata record
    console.error('Cloudinary delete error:', cloudinaryErr);
  }

  // ── Remove from task's attachments array ────────────────────────────────────
  attachment.deleteOne();
  await task.save();
}

export default { uploadAttachment, deleteAttachment };
