import { Schema, model } from 'mongoose';

const InvitationSchema = new Schema({
  boardId:   { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  email:     { type: String, required: true, lowercase: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// TTL index: MongoDB automatically removes documents when expiresAt is reached
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation = model('Invitation', InvitationSchema);

export default Invitation;
