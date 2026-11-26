import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { email, senha } from '../src/validacao.js';

const db = new PrismaClient();
try {
  const endereco = email(process.env.ADMIN_EMAIL);
  const credencial = senha(process.env.ADMIN_SENHA);
  const existente = await db.usuario.findUnique({ where: { email: endereco } });
  if (existente && existente.papel !== 'ADMIN') throw new Error('O e-mail do administrador já pertence a um cliente.');
  if (!existente) {
    await db.usuario.create({
      data: { nome: 'Administrador de testes', email: endereco, senhaHash: await bcrypt.hash(credencial, 10), papel: 'ADMIN' }
    });
    console.log('Administrador criado.');
  } else {
    console.log('Administrador existente preservado.');
  }
} finally {
  await db.$disconnect();
}
