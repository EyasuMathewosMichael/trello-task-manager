import { Schema, model } from 'mongoose';

const BoardSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role:   { type: String, enum: ['Admin', 'Member'], required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index: members.userId for efficient membership lookups
BoardSchema.index({ 'members.userId': 1 });

const Board = model('Board', BoardSchema);

export default Board;
