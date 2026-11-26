import 'dotenv/config';

export function configuracao(env = process.env) {
  const segredo = env.JWT_SECRET;
  if (typeof segredo !== 'string' || segredo.length < 32) throw new Error('Configure JWT_SECRET com ao menos 32 caracteres.');
  if (!env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
  const porta = Number(env.PORT || 3000);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT inválida.');
  return { segredo, porta, modoTeste: env.NODE_ENV !== 'production' && env.MODO_TESTE === 'true' };
}
