import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { criarApp } from '../src/app.js';

test('Conecta.Net da autenticação à recuperação', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'conecta-a2-'));
  const url = 'file:' + join(pasta, 'teste.db').replaceAll('\\', '/');
  let db, servidor;
  try {
    const migrate = spawnSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8'
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.error?.message);
    db = new PrismaClient({ datasourceUrl: url });
    await db.usuario.create({
      data: { nome: 'Admin', email: 'admin@conecta.example', senhaHash: await bcrypt.hash('AdminTeste123', 10), papel: 'ADMIN' }
    });
    servidor = criarApp(db, { segredo: randomBytes(48).toString('hex'), modoTeste: true })
      .listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const base = 'http://127.0.0.1:' + servidor.address().port;
    async function chamada(metodo, rota, status, { token, dados } = {}) {
      const headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      if (dados) headers['Content-Type'] = 'application/json';
      const res = await fetch(base + rota, { method: metodo, headers, body: dados && JSON.stringify(dados) });
      const resultado = res.status === 204 ? null : await res.json();
      assert.equal(res.status, status, metodo + ' ' + rota + ': ' + JSON.stringify(resultado));
      return resultado;
    }
    const email = 'cliente@conecta.example', senha = 'ClienteTeste123';
    const registrar = (endereco, nome) => chamada('POST', '/auth/register', 201, { dados: { nome, email: endereco, senha } });
    const entrar = async (endereco, senha, status = 200) =>
      (await chamada('POST', '/auth/login', status, { dados: { email: endereco, senha } })).token;
    const cliente = await registrar(email, 'Cliente');
    assert.equal(cliente.senhaHash, undefined);
    assert.notEqual((await db.usuario.findUnique({ where: { id: cliente.id } })).senhaHash, senha);
    await registrar('outro@conecta.example', 'Outro cliente');
    const token = await entrar(email, senha);
    const outro = await entrar('outro@conecta.example', senha);
    const admin = await entrar('admin@conecta.example', 'AdminTeste123');
    const planos = '/api/planos', solicitacoes = '/api/solicitacoes';
    await chamada('GET', planos, 401);
    await chamada('GET', planos, 401, { token: 'invalido' });
    await chamada('POST', planos, 403, { token, dados: { nome: 'Indevido' } });
    await chamada('POST', planos, 400, { token: admin, dados: { nome: 'Incompleto' } });
    const dados = { nome: 'Fibra', velocidadeMbps: 300, precoCentavos: 9990 };
    const plano = await chamada('POST', planos, 201, { token: admin, dados });
    const planoRota = planos + '/' + plano.id;
    assert.equal((await chamada('GET', planos, 200, { token })).length, 1);
    assert.equal((await chamada('GET', planoRota, 200, { token })).nome, 'Fibra');
    await chamada('PATCH', planoRota, 200, { token: admin, dados: { velocidadeMbps: 500 } });
    const s = await chamada('POST', solicitacoes, 201, { token, dados: { planoId: plano.id } });
    const sRota = solicitacoes + '/' + s.id;
    assert.equal((await chamada('GET', solicitacoes, 200, { token })).length, 1);
    assert.equal((await chamada('GET', sRota, 200, { token })).usuarioId, cliente.id);
    await chamada('GET', sRota, 404, { token: outro });
    await chamada('DELETE', planoRota, 409, { token: admin });
    assert.equal((await chamada('PATCH', sRota, 200, { token: admin, dados: { status: 'APROVADA' } })).status, 'APROVADA');
    await chamada('DELETE', sRota, 409, { token });
    await chamada('DELETE', sRota, 204, { token: admin });
    await chamada('GET', sRota, 404, { token });
    await chamada('DELETE', planoRota, 204, { token: admin });
    await chamada('GET', planoRota, 404, { token });
    const { tokenRecuperacao } = await chamada('POST', '/auth/forgot-password', 202, { dados: { email } });
    const recuperacao = await db.recuperacao.findUnique({ where: { usuarioId: cliente.id } });
    assert.notEqual(recuperacao.tokenHash, tokenRecuperacao);
    const novaSenha = 'ClienteNovaSenha123';
    await db.recuperacao.update({ where: { usuarioId: cliente.id }, data: { expiraEm: new Date(0) } });
    await chamada('POST', '/auth/reset-password', 400, { dados: { token: tokenRecuperacao, novaSenha } });
    const nova = await chamada('POST', '/auth/forgot-password', 202, { dados: { email } });
    const redefinir = { dados: { token: nova.tokenRecuperacao, novaSenha } };
    await chamada('POST', '/auth/reset-password', 204, redefinir);
    await chamada('POST', '/auth/reset-password', 400, redefinir);
    await chamada('GET', planos, 401, { token });
    await entrar(email, senha, 401);
    assert.ok(await entrar(email, novaSenha));
  } finally {
    if (servidor) await new Promise((ok, falha) => servidor.close(erro => erro ? falha(erro) : ok()));
    if (db) await db.$disconnect();
    await rm(pasta, { recursive: true, force: true });
  }
});
