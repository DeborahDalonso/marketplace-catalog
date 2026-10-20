# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento semântico.

## [1.0.0] - 2026-10-20

### Added

- CRUD de produtos com soft delete e regra de dono (vendedor só mexe no que é dele; admin em tudo).
- CRUD de categorias restrito a admin, com slug único e bloqueio de remoção quando há produto vinculado.
- Registro de visualização de produto (`POST /products/:id/views`), público, com usuário opcional.
- Autenticação por JWT RS256 validado no JWKS do `marketplace-auth`, com cache de 10 minutos.
- Validação declarativa com `FormRequest` próprio (required, string, integer, boolean, min, max, in) e resposta 422.
- Eventos `product.created`, `product.updated`, `product.deleted`, `product.viewed`, `stock.reserved` e `stock.rejected` via Outbox.
- Consumidor idempotente de `order.created` (reserva de estoque tudo-ou-nada) e `order.cancelled` (devolução).
- Migrations numeradas e seed idempotente com 4 categorias e 12 produtos, rodados no boot.
- `GET /health` com estado do MySQL e do Kafka.
- Testes unitários com mocks à mão e de integração com MySQL real (pulados com aviso quando o banco não responde).
- Dockerfile e workflow de CI com MySQL em service container.
