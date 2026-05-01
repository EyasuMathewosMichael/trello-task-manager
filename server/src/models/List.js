import { Schema, model } from 'mongoose';

const ListSchema = new Schema({
  boardId:   { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  name:      { type: String, required: true, trim: true },
  position:  { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes: boardId and position for ordered list retrieval
ListSchema.index({ boardId: 1 });
ListSchema.index({ position: 1 });

const List = model('List', ListSchema);

export default List;
