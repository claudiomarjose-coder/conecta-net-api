import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { corpo, texto, email, senha } from '../validacao.js';
import { falhar } from '../erros.js';

const emissor = 'conecta-net';
const hashToken = token => createHash('sha256').update(token).digest('hex');
const hashFicticio = bcrypt.hashSync('senha-aleatoria-interna', 10);
const publico = { id: true, nome: true, email: true, papel: true };

export function rotasAuth(db, { segredo, modoTeste }) {
  const rotas = Router();

  rotas.post('/register', async (req, res) => {
    const dados = corpo(req.body, ['nome', 'email', 'senha']);
    const usuario = await db.usuario.create({
      data: { nome: texto(dados.nome, 'nome'), email: email(dados.email), senhaHash: await bcrypt.hash(senha(dados.senha), 10) },
      select: publico
    });
    res.status(201).json(usuario);
  });

  rotas.post('/login', async (req, res) => {
    const dados = corpo(req.body, ['email', 'senha']);
    const usuario = await db.usuario.findUnique({ where: { email: email(dados.email) } });
    const confere = await bcrypt.compare(senha(dados.senha, false), usuario?.senhaHash ?? hashFicticio);
    if (!usuario || !confere) falhar(401, 'Credenciais inválidas.');
    const token = jwt.sign({ versao: usuario.versaoSessao }, segredo, {
      algorithm: 'HS256', issuer: emissor, subject: String(usuario.id), expiresIn: '1h'
    });
    res.json({ token });
  });

  rotas.post('/forgot-password', async (req, res) => {
    const dados = corpo(req.body, ['email']);
    const usuario = await db.usuario.findUnique({ where: { email: email(dados.email) }, select: { id: true } });
    const resposta = { mensagem: 'Se a conta existir, a recuperação será solicitada.' };
    if (usuario) {
      const token = randomBytes(32).toString('hex');
      const info = { tokenHash: hashToken(token), expiraEm: new Date(Date.now() + 15 * 60_000) };
      await db.recuperacao.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id, ...info },
        update: info
      });
      if (modoTeste) resposta.tokenRecuperacao = token;
    }
    res.status(202).json(resposta);
  });

  rotas.post('/reset-password', async (req, res) => {
    const dados = corpo(req.body, ['token', 'novaSenha']);
    const token = texto(dados.token, 'token', 64);
    if (!/^[a-f0-9]{64}$/.test(token)) falhar(400, 'Token inválido ou expirado.');
    const senhaHash = await bcrypt.hash(senha(dados.novaSenha), 10);
    await db.$transaction(async transaction => {
      const onde = { tokenHash: hashToken(token), expiraEm: { gt: new Date() } };
      const recuperacao = await transaction.recuperacao.findFirst({ where: onde });
      if (!recuperacao) falhar(400, 'Token inválido ou expirado.');
      const consumido = await transaction.recuperacao.deleteMany({ where: onde });
      if (consumido.count !== 1) falhar(400, 'Token inválido ou expirado.');
      await transaction.usuario.update({
        where: { id: recuperacao.usuarioId },
        data: { senhaHash, versaoSessao: { increment: 1 } }
      });
    });
    res.status(204).end();
  });

  return rotas;
}

export function autenticar(db, segredo) {
  return async (req, res, next) => {
    const token = req.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) falhar(401, 'Informe um JWT válido.');
    let sessao;
    try {
      sessao = jwt.verify(token, segredo, { issuer: emissor, algorithms: ['HS256'] });
    } catch {
      falhar(401, 'JWT inválido ou expirado.');
    }
    const id = Number(sessao.sub);
    if (!Number.isSafeInteger(id) || id < 1) falhar(401, 'Sessão inválida.');
    const usuario = await db.usuario.findUnique({ where: { id }, select: { id: true, papel: true, versaoSessao: true } });
    if (!usuario || usuario.versaoSessao !== sessao.versao) falhar(401, 'Sessão inválida.');
    req.usuario = usuario;
    next();
  };
}

export function exigirAdmin(req, res, next) {
  if (req.usuario.papel !== 'ADMIN') falhar(403, 'Acesso administrativo necessário.');
  next();
}
