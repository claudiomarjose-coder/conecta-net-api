export class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const falhar = (status, mensagem) => { throw new ErroHttp(status, mensagem); };

export function tratarErro(erro, req, res, next) {
  if (res.headersSent) return next(erro);
  if (erro instanceof ErroHttp) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo muito grande.' });
  if (erro.code === 'P2002') return res.status(409).json({ erro: 'Já existe um registro com esse dado.' });
  if (erro.code === 'P2003') return res.status(409).json({ erro: 'O registro está vinculado a outra entidade.' });
  if (erro.code === 'P2025') return res.status(404).json({ erro: 'Registro não encontrado.' });
  console.error('Falha na API:', erro.code || erro.name);
  res.status(500).json({ erro: 'Erro interno.' });
}
