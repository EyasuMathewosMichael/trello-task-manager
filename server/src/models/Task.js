import { Schema, model } from 'mongoose';

const AttachmentSchema = new Schema({
  url:        { type: String, required: true },
  filename:   { type: String, required: true },
  size:       { type: Number, required: true },
  mimeType:   { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const TaskSchema = new Schema({
  listId:      { type: Schema.Types.ObjectId, ref: 'List', required: true },
  boardId:     { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  position:    { type: Number, required: true },
  priority:    { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate:     { type: Date },
  isComplete:  { type: Boolean, default: false },
  isOverdue:   { type: Boolean, default: false },
  assignees:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
  labels:      [{ type: String }],
  attachments: [AttachmentSchema],
  reminderSent: { type: Boolean, default: false },
  createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

// Indexes for common query patterns
TaskSchema.index({ listId: 1 });
TaskSchema.index({ boardId: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ isOverdue: 1 });

// Text index for full-text search on title and description
TaskSchema.index({ title: 'text', description: 'text' });

const Task = model('Task', TaskSchema);

export default Task;
