import { Schema, model, Types } from 'mongoose';

const { ObjectId } = Types;

const RefreshTokenSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// TTL index: MongoDB automatically removes documents when expiresAt is reached
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = model('RefreshToken', RefreshTokenSchema);

export default RefreshToken;
