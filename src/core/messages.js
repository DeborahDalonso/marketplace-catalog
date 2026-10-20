const MESSAGES = {
    'auth.required': 'Autenticação necessária',
    'auth.invalid_token': 'Token inválido ou expirado',
    'auth.forbidden': 'Sem permissão para esta ação',
    'validation.failed': 'Dados inválidos',
    'validation.required': 'obrigatório',
    'validation.string': 'deve ser texto',
    'validation.integer': 'deve ser número inteiro',
    'validation.boolean': 'deve ser verdadeiro ou falso',
    'validation.min_length': 'mínimo de {min} caracteres',
    'validation.max_length': 'máximo de {max} caracteres',
    'validation.min': 'mínimo {min}',
    'validation.max': 'máximo {max}',
    'validation.in': 'deve ser um de: {values}',
    'request.invalid_json': 'Corpo da requisição não é um JSON válido',
    'route.not_found': 'Rota não encontrada',
    'internal_error': 'Erro interno, tente novamente mais tarde',
    'product.not_found': 'Produto não encontrado',
    'product.forbidden': 'Este produto pertence a outro vendedor',
    'product.already_deleted': 'Produto já foi removido',
    'product.category_not_found': 'Categoria informada não existe',
    'product.created': 'Produto criado',
    'product.updated': 'Produto atualizado',
    'product.deleted': 'Produto removido',
    'product.view_registered': 'Visualização registrada',
    'category.not_found': 'Categoria não encontrada',
    'category.slug_exists': 'Já existe uma categoria com o nome "{name}"',
    'category.has_products': 'Categoria tem {count} produto(s) e não pode ser removida',
    'category.created': 'Categoria criada',
    'category.updated': 'Categoria atualizada',
    'category.deleted': 'Categoria removida',
};

export function message(code, params = {}) {
    const text = MESSAGES[code];
    if (!text) return code;
    return text.replace(/\{(\w+)\}/g, (_, key) => (params[key] === undefined ? `{${key}}` : String(params[key])));
}
