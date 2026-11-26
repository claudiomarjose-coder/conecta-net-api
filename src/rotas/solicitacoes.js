import { Router } from 'express';
import { corpo, idDaRota, inteiro } from '../validacao.js';
import { falhar } from '../erros.js';

const statusPermitidos = ['PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA'];
const visivelPara = usuario => usuario.papel === 'ADMIN' ? {} : { usuarioId: usuario.id };
const registroVisivel = (req, id) => ({ ...visivelPara(req.usuario), id });

async function verificarPlano(db, id) {
  const plano = await db.plano.findFirst({ where: { id, ativo: true } });
  if (!plano) falhar(404, 'Plano disponível não encontrado.');
}

export function rotasSolicitacoes(db) {
  const rotas = Router();
  rotas.post('/', async (req, res) => {
    const dados = corpo(req.body, ['planoId']);
    const planoId = inteiro(dados.planoId, 'planoId');
    const solicitacao = await db.$transaction(async transaction => {
      await verificarPlano(transaction, planoId);
      return transaction.solicitacao.create({ data: { planoId, usuarioId: req.usuario.id } });
    });
    res.location('/api/solicitacoes/' + solicitacao.id).status(201).json(solicitacao);
  });
  rotas.get('/', async (req, res) => {
    res.json(await db.solicitacao.findMany({ where: visivelPara(req.usuario), orderBy: { id: 'asc' } }));
  });
  rotas.get('/:id', async (req, res) => {
    const solicitacao = await db.solicitacao.findFirst({ where: registroVisivel(req, idDaRota(req.params.id)) });
    if (!solicitacao) falhar(404, 'Solicitação não encontrada.');
    res.json(solicitacao);
  });
  rotas.patch('/:id', async (req, res) => {
    const where = registroVisivel(req, idDaRota(req.params.id));
    const admin = req.usuario.papel === 'ADMIN';
    const dados = corpo(req.body, admin ? ['status'] : ['planoId']);
    if (admin && !statusPermitidos.includes(dados.status)) falhar(400, 'Status inválido.');
    const planoId = admin ? null : inteiro(dados.planoId, 'planoId');
    const solicitacao = await db.$transaction(async transaction => {
      const existente = await transaction.solicitacao.findFirst({ where });
      if (!existente) falhar(404, 'Solicitação não encontrada.');
      if (!admin && existente.status !== 'PENDENTE') falhar(409, 'Somente solicitações pendentes podem ser editadas pelo cliente.');
      if (!admin) await verificarPlano(transaction, planoId);
      return transaction.solicitacao.update({
        where: admin ? where : { ...where, status: 'PENDENTE' },
        data: admin ? { status: dados.status } : { planoId }
      });
    });
    res.json(solicitacao);
  });
  rotas.delete('/:id', async (req, res) => {
    const where = registroVisivel(req, idDaRota(req.params.id));
    const admin = req.usuario.papel === 'ADMIN';
    await db.$transaction(async transaction => {
      const existente = await transaction.solicitacao.findFirst({ where });
      if (!existente) falhar(404, 'Solicitação não encontrada.');
      if (!admin && existente.status !== 'PENDENTE') falhar(409, 'Somente solicitações pendentes podem ser excluídas pelo cliente.');
      await transaction.solicitacao.delete({ where: admin ? where : { ...where, status: 'PENDENTE' } });
    });
    res.status(204).end();
  });
  return rotas;
}
