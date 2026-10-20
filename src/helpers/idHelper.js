import { ulid } from 'ulid';

// prefixo + ULID de 26 caracteres, gerado antes do insert para o Outbox poder referenciar
export function newId(prefix) {
    return `${prefix}_${ulid()}`;
}
