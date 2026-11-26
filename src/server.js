import { PrismaClient } from '@prisma/client';
import { configuracao } from './config.js';
import { criarApp } from './app.js';

const config = configuracao();
const db = new PrismaClient();
await db.$connect();
const servidor = criarApp(db, config).listen(config.porta, '127.0.0.1', () => {
  console.log('API Conecta.Net em http://127.0.0.1:' + config.porta);
});
function desligar() {
  servidor.close(() => db.$disconnect());
}
process.once('SIGINT', desligar);
process.once('SIGTERM', desligar);
