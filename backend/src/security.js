import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
export const roles = ['colaborador', 'gestor', 'administrador_setor', 'administrador_principal'];
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, hash) {
  try {
    if (/^\$2[aby]\$/.test(hash)) return bcrypt.compareSync(password, hash);
    const [salt, key] = hash.split(':');
    return timingSafeEqual(Buffer.from(key, 'hex'), scryptSync(password, salt, 64));
  } catch {
    return false;
  }
}
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const publicUser = ({ senha, ...user }) => user;
export function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
export function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    fail(400, `${label}: preencha entre 1 e ${max} caracteres.`);
  return value.trim();
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128)
    fail(400, 'A senha deve ter de 8 a 128 caracteres.');
  return value;
}
export function email(value) {
  const v = text(value, 'E-mail').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400, 'E-mail inválido.');
  return v;
}
