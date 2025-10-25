function calculateSimpleRevenue(purchase, _product) {
    // считаем выручку с учётом скидки
    const discount = purchase.discount ? purchase.discount / 100 : 0;
    const priceAfterDiscount = purchase.sale_price * (1 - discount);
    return priceAfterDiscount * purchase.quantity;
}

function calculateBonusByProfit(index, total, seller) {
    // определяем процент бонуса по месту в рейтинге
    const profit = seller.profit;
    let bonusRate = 0;

    if (index === 0) {
        bonusRate = 0.15;
    } else if (index === 1 || index === 2) {
        bonusRate = 0.10;
    } else if (index === total - 1) {
        bonusRate = 0;
    } else {
        bonusRate = 0.05;
    }

    return profit * bonusRate;
}

function analyzeSalesData(data, options) {
    // проверяем входные данные
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records)
    ) {
        throw new Error('некорректные данные');
    }

    // проверяем функции расчёта
    if (
        !options ||
        typeof options.calculateRevenue !== 'function' ||
        typeof options.calculateBonus !== 'function'
    ) {
        throw new Error('некорректные функции расчёта');
    }

    const { calculateRevenue, calculateBonus } = options;

    // создаём статистику по каждому продавцу
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // индексы для быстрого доступа
    const sellerById = Object.fromEntries(sellerStats.map(s => [s.id, s]));
    const productBySku = Object.fromEntries(data.products.map(p => [p.sku, p]));

    // проходим по всем продажам
    data.purchase_records.forEach(record => {
        const seller = sellerById[record.seller_id];
        if (!seller) return;

        seller.sales_count++;

        record.items.forEach(item => {
            const product = productBySku[item.sku];
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // сортируем продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // считаем бонусы и топ-товары
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        const sortedProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        seller.top_products = sortedProducts;
    });

    // формируем итоговый отчёт
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
