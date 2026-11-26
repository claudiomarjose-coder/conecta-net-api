import { Router } from 'express';
import { exigirAdmin } from './auth.js';
import { corpo, idDaRota, inteiro, texto } from '../validacao.js';
import { falhar } from '../erros.js';

function validar(body, parcial = false) {
  const valor = corpo(body, ['nome', 'velocidadeMbps', 'precoCentavos', 'ativo']);
  const dados = {};
  if (!parcial || 'nome' in valor) dados.nome = texto(valor.nome, 'nome');
  if (!parcial || 'velocidadeMbps' in valor) dados.velocidadeMbps = inteiro(valor.velocidadeMbps, 'velocidadeMbps');
  if (!parcial || 'precoCentavos' in valor) dados.precoCentavos = inteiro(valor.precoCentavos, 'precoCentavos', 0);
  if ('ativo' in valor) {
    if (typeof valor.ativo !== 'boolean') falhar(400, 'ativo deve ser booleano.');
    dados.ativo = valor.ativo;
  }
  return dados;
}

export function rotasPlanos(db) {
  const rotas = Router();
  rotas.post('/', exigirAdmin, async (req, res) => {
    const plano = await db.plano.create({ data: validar(req.body) });
    res.location('/api/planos/' + plano.id).status(201).json(plano);
  });
  rotas.get('/', async (req, res) => {
    const where = req.usuario.papel === 'ADMIN' ? {} : { ativo: true };
    res.json(await db.plano.findMany({ where, orderBy: { id: 'asc' } }));
  });
  rotas.get('/:id', async (req, res) => {
    const id = idDaRota(req.params.id);
    const where = req.usuario.papel === 'ADMIN' ? { id } : { id, ativo: true };
    const plano = await db.plano.findFirst({ where });
    if (!plano) falhar(404, 'Plano não encontrado.');
    res.json(plano);
  });
  rotas.patch('/:id', exigirAdmin, async (req, res) => {
    res.json(await db.plano.update({ where: { id: idDaRota(req.params.id) }, data: validar(req.body, true) }));
  });
  rotas.delete('/:id', exigirAdmin, async (req, res) => {
    await db.plano.delete({ where: { id: idDaRota(req.params.id) } });
    res.status(204).end();
  });
  return rotas;
}
