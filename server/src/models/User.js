import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName:  { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

// Index: email (unique) — already created by the unique: true field option above

const User = model('User', UserSchema);

export default User;
