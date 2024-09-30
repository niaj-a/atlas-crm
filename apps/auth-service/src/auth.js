import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { User } from './user.model.js';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('Email is already registered');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  return issueSession(user);
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }
  return issueSession(user);
}

function issueSession(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
  const token = jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '8h',
  });
  return { token, user: publicUser(user) };
}
