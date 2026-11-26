import express from 'express';
import { rotasAuth, autenticar } from './rotas/auth.js';
import { rotasPlanos } from './rotas/planos.js';
import { rotasSolicitacoes } from './rotas/solicitacoes.js';
import { tratarErro } from './erros.js';

export function criarApp(db, config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth', rotasAuth(db, config));
  const proteger = autenticar(db, config.segredo);
  app.use('/api/planos', proteger, rotasPlanos(db));
  app.use('/api/solicitacoes', proteger, rotasSolicitacoes(db));
  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use(tratarErro);
  return app;
}
