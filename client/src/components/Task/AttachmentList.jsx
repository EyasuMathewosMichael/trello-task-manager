import { useState, useRef } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Permitted MIME types (mirrors server-side rules)
const PERMITTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * AttachmentList
 *
 * Props:
 *   task - Task object (with `attachments` array and `_id`)
 */
function AttachmentList({ task }) {
  const { user } = useAuth();

  const [attachments, setAttachments] = useState(task?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const fileInputRef = useRef(null);

  function formatSize(bytes) {
    if (bytes == null) return '';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function isOwnAttachment(attachment) {
    const uploadedBy = attachment.uploadedBy?._id ?? attachment.uploadedBy;
    return uploadedBy === user?._id;
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Client-side pre-validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('File is too large. Maximum size is 25 MB.');
      e.target.value = '';
      return;
    }

    if (!PERMITTED_MIME_TYPES.includes(file.type)) {
      setUploadError(
        'File type not permitted. Allowed types: images, PDF, Word, Excel, text, CSV, ZIP.'
      );
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Server returns the new attachment subdocument — append it to the list
      const newAttachment = res.data;
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(attachmentId) {
    setDeleteError('');
    try {
      await api.delete(`/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete attachment.');
    }
  }

  return (
    <section style={styles.section} aria-labelledby="attachments-heading">
      <h3 id="attachments-heading" style={styles.heading}>
        Attachments
      </h3>

      {/* Attachment list */}
      {attachments.length === 0 ? (
        <p style={styles.emptyText}>No attachments yet.</p>
      ) : (
        <ul style={styles.list} aria-label="Attachments">
          {attachments.map((attachment) => (
            <li key={attachment._id} style={styles.item}>
              <div style={styles.itemInfo}>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.filename}
                  aria-label={`Download ${attachment.filename}`}
                >
                  📎 {attachment.filename}
                </a>
                <span style={styles.meta}>
                  {formatSize(attachment.size)}
                  {attachment.uploadedAt && ` · ${formatDate(attachment.uploadedAt)}`}
                </span>
              </div>
              {isOwnAttachment(attachment) && (
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(attachment._id)}
                  aria-label={`Delete attachment ${attachment.filename}`}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleteError && (
        <p style={styles.errorText} role="alert">
          {deleteError}
        </p>
      )}

      {/* Upload area */}
      <div style={styles.uploadArea}>
        <label htmlFor="attachment-file-input" style={styles.uploadLabel}>
          {uploading ? 'Uploading…' : 'Upload a file'}
        </label>
        <input
          id="attachment-file-input"
          ref={fileInputRef}
          type="file"
          style={styles.fileInput}
          accept={PERMITTED_MIME_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={uploading}
          aria-describedby={uploadError ? 'upload-error' : undefined}
        />
        {uploading && (
          <span style={styles.uploadingIndicator} aria-live="polite" aria-busy="true">
            Uploading…
          </span>
        )}
        {uploadError && (
          <p id="upload-error" style={styles.errorText} role="alert">
            {uploadError}
          </p>
        )}
        <p style={styles.hint}>
          Max 25 MB · Images, PDF, Word, Excel, text, CSV, ZIP
        </p>
      </div>
    </section>
  );
}

const styles = {
  section: {
    marginTop: '1.5rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
  },
  heading: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.75rem',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flex: 1,
    minWidth: 0,
  },
  filename: {
    fontSize: '0.875rem',
    color: 'var(--accent)',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#e53e3e',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '0.1rem 0.3rem',
    borderRadius: '3px',
    fontWeight: 500,
    flexShrink: 0,
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    marginBottom: '0.75rem',
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  uploadLabel: {
    display: 'inline-block',
    padding: '0.45rem 1rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    width: 'fit-content',
  },
  fileInput: {
    // Visually hidden but accessible
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  uploadingIndicator: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  errorText: {
    fontSize: '0.85rem',
    color: '#e53e3e',
    fontWeight: 500,
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
};

export default AttachmentList;
