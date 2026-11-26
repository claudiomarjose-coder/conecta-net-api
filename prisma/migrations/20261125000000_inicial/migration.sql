CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'CLIENTE',
    "versaoSessao" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Plano" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "velocidadeMbps" INTEGER NOT NULL,
    "precoCentavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Solicitacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "planoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Solicitacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Solicitacao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Recuperacao" (
    "usuarioId" INTEGER NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    CONSTRAINT "Recuperacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE INDEX "Solicitacao_usuarioId_idx" ON "Solicitacao"("usuarioId");
CREATE INDEX "Solicitacao_planoId_idx" ON "Solicitacao"("planoId");
CREATE UNIQUE INDEX "Recuperacao_tokenHash_key" ON "Recuperacao"("tokenHash");
