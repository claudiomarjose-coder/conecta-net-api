import { falhar } from './erros.js';

export function corpo(valor, campos) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(400, 'Envie um objeto JSON.');
  const chaves = Object.keys(valor);
  if (!chaves.length || chaves.some(chave => !campos.includes(chave))) falhar(400, 'Campos ausentes ou desconhecidos.');
  return valor;
}
export function texto(valor, campo, max = 120) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) falhar(400, 'Campo inválido: ' + campo);
  return valor.trim();
}
export function inteiro(valor, campo, min = 1) {
  if (!Number.isInteger(valor) || valor < min || valor > 2147483647) falhar(400, 'Campo inválido: ' + campo);
  return valor;
}
export function idDaRota(valor) {
  if (!/^[1-9]\d*$/.test(valor)) falhar(400, 'ID inválido.');
  return inteiro(Number(valor), 'id');
}
export function email(valor) {
  const normalizado = texto(valor, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) falhar(400, 'E-mail inválido.');
  return normalizado;
}
export function senha(valor, nova = true) {
  if (typeof valor !== 'string' || valor.length < (nova ? 8 : 1) || Buffer.byteLength(valor) > 72) {
    falhar(400, nova ? 'A senha deve ter no mínimo 8 caracteres e até 72 bytes.' : 'Senha inválida.');
  }
  return valor;
}
