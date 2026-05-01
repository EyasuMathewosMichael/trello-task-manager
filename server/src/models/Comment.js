import { Schema, model } from 'mongoose';

const CommentSchema = new Schema({
  taskId:    { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  boardId:   { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  authorId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes: taskId and createdAt for ordered comment retrieval per task
CommentSchema.index({ taskId: 1 });
CommentSchema.index({ createdAt: 1 });

const Comment = model('Comment', CommentSchema);

export default Comment;
