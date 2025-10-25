// Функция для расчета выручки от одной позиции в чеке
function calculateSimpleRevenue(purchase, _product) {
    const discountMultiplier = 1 - ((purchase.discount || 0) / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountMultiplier;
    return revenue;
}

// Функция для расчета бонуса на основе позиции в рейтинге по прибыли
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

// Главная функция анализа данных о продажах
function analyzeSalesData(data, options) {
    console.log('=== НАЧАЛО АНАЛИЗА ===');

    // Базовая проверка данных
    if (!data || !data.sellers || !data.products || !data.purchase_records) {
        console.error('Отсутствуют необходимые данные');
        return [];
    }

    // Проверка опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        console.error('Некорректные опции');
        return [];
    }

    const { calculateRevenue, calculateBonus } = options;

    // Создаем базовую статистику продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    console.log('Создано статистик:', sellerStats.length);

    // Создаем простые индексы
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    console.log('Индексы созданы');

    // Обрабатываем продажи
    try {
        data.purchase_records.forEach((record, recordIndex) => {
            const seller = sellerIndex[record.seller_id];

            if (!seller) {
                console.log('Продавец не найден:', record.seller_id);
                return;
            }

            seller.sales_count += 1;

            record.items.forEach(item => {
                const product = productIndex[item.sku];

                if (!product) {
                    console.log('Товар не найден:', item.sku);
                    return;
                }

                const itemRevenue = calculateRevenue(item, product);
                const itemCost = product.purchase_price * item.quantity;
                const itemProfit = itemRevenue - itemCost;

                seller.revenue += itemRevenue;
                seller.profit += itemProfit;

                if (!seller.products_sold[item.sku]) {
                    seller.products_sold[item.sku] = 0;
                }
                seller.products_sold[item.sku] += item.quantity;
            });
        });
    } catch (error) {
        console.error('Ошибка при обработке продаж:', error);
        return [];
    }

    console.log('Продажи обработаны');

    // Сортируем по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Рассчитываем бонусы и формируем топ товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формируем результат
    const result = sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: Math.round(seller.revenue * 100) / 100,
        profit: Math.round(seller.profit * 100) / 100,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: Math.round(seller.bonus * 100) / 100
    }));

    console.log('=== АНАЛИЗ ЗАВЕРШЕН ===');
    console.log('Результат:', result);
    return result;
}
