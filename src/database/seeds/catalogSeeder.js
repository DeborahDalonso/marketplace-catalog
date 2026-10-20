import { slugify } from '../../helpers/slugHelper.js';

export const SEED_SELLER_ID = 'usr_seed_seller_0000000000001';

// ids fixos: rodar o seed duas vezes não duplica nada e os outros serviços
// podem apontar para estes ids em seus próprios seeds
export const SEED_CATEGORIES = [
    { id: 'cat_01JSEED0000000000000000001', name: 'Eletrônicos' },
    { id: 'cat_01JSEED0000000000000000002', name: 'Casa e Cozinha' },
    { id: 'cat_01JSEED0000000000000000003', name: 'Livros' },
    { id: 'cat_01JSEED0000000000000000004', name: 'Esporte e Lazer' },
];

export const SEED_PRODUCTS = [
    ['prd_01JSEED0000000000000000001', 0, 'Fone Bluetooth', 'Fone sem fio com cancelamento de ruído', 19990, 12],
    ['prd_01JSEED0000000000000000002', 0, 'Teclado mecânico', 'Switch azul, layout ABNT2', 34990, 8],
    ['prd_01JSEED0000000000000000003', 0, 'Mouse sem fio', 'Sensor de 4000 dpi, bateria de 6 meses', 8990, 25],
    ['prd_01JSEED0000000000000000004', 1, 'Cafeteira italiana', 'Alumínio, 6 xícaras', 7490, 15],
    ['prd_01JSEED0000000000000000005', 1, 'Jogo de panelas', 'Antiaderente, 5 peças', 25900, 6],
    ['prd_01JSEED0000000000000000006', 1, 'Luminária de mesa', 'LED com três temperaturas de cor', 12900, 10],
    ['prd_01JSEED0000000000000000007', 2, 'Clean Code', 'Robert C. Martin, edição em português', 9900, 30],
    ['prd_01JSEED0000000000000000008', 2, 'Designing Data-Intensive Applications', 'Martin Kleppmann', 32900, 5],
    ['prd_01JSEED0000000000000000009', 2, 'O Programador Pragmático', 'Hunt e Thomas, edição de 20 anos', 11900, 14],
    ['prd_01JSEED0000000000000000010', 3, 'Bola de futebol', 'Tamanho oficial, costurada', 6900, 20],
    ['prd_01JSEED0000000000000000011', 3, 'Tapete de yoga', '6 mm, antiderrapante', 8900, 18],
    ['prd_01JSEED0000000000000000012', 3, 'Garrafa térmica', '1 litro, inox', 5900, 40],
];

export async function seed(db, logger) {
    const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM categories');
    if (count > 0) return false;

    for (const category of SEED_CATEGORIES) {
        await db.query('INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)', [
            category.id,
            category.name,
            slugify(category.name),
        ]);
    }

    for (const [id, categoryIndex, name, description, priceCents, stock] of SEED_PRODUCTS) {
        await db.query(
            `INSERT INTO products (id, seller_id, category_id, name, slug, description, price_cents, stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, SEED_SELLER_ID, SEED_CATEGORIES[categoryIndex].id, name, slugify(name), description, priceCents, stock],
        );
    }

    logger?.info(`seed aplicado: ${SEED_CATEGORIES.length} categorias e ${SEED_PRODUCTS.length} produtos`);
    return true;
}
