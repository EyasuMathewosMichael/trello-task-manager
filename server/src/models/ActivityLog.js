import { Schema, model } from 'mongoose';

const ActivityLogSchema = new Schema({
  boardId:    { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true },   // e.g. 'task:created', 'list:renamed'
  entityId:   { type: Schema.Types.ObjectId },
  entityType: { type: String },                   // 'Board' | 'List' | 'Task' | 'Comment' | 'Member'
  meta:       { type: Schema.Types.Mixed },        // additional context (old name, new name, etc.)
  createdAt:  { type: Date, default: Date.now }
});

// Index: boardId + createdAt descending for paginated activity feed
ActivityLogSchema.index({ boardId: 1, createdAt: -1 });

const ActivityLog = model('ActivityLog', ActivityLogSchema);

export default ActivityLog;
