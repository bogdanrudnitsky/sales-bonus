function calculateSimpleRevenue(purchase, _product) {
    // считаем выручку для одной позиции, возвращаем в рублях (float)
    const discount = purchase.discount ? purchase.discount / 100 : 0;
    const priceAfterDiscount = purchase.sale_price * (1 - discount);
    return priceAfterDiscount * purchase.quantity;
}

function calculateBonusByProfit(index, total, seller) {
    // рассчитываем бонус по прибыли; seller.profit_cents должен существовать (см. analyzeSalesData)
    let rate = 0;
    if (index === 0) rate = 0.15;
    else if (index === 1 || index === 2) rate = 0.10;
    else if (index === total - 1) rate = 0;
    else rate = 0.05;

    // seller.profit_cents — целые копейки; вычисляем бонус в копейках и возвращаем в рублях
    const bonusCents = Math.round((seller.profit_cents || 0) * rate);
    return bonusCents / 100;
}

function analyzeSalesData(data, options) {
    // проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('некорректные данные');
    }

    if (
        !options ||
        typeof options.calculateRevenue !== 'function' ||
        typeof options.calculateBonus !== 'function'
    ) {
        throw new Error('некорректные функции расчёта');
    }

    const { calculateRevenue, calculateBonus } = options;

    // базовая статистика (с полями для копеек)
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue_cents: 0, // аккумулируем в копейках
        profit_cents: 0,  // аккумулируем в копейках
        sales_count: 0,
        products_sold: {}
    }));

    const sellerById = Object.fromEntries(sellerStats.map(s => [s.id, s]));
    const productBySku = Object.fromEntries(data.products.map(p => [p.sku, p]));

    // проходим по чекам и считаем в копейках
    data.purchase_records.forEach(record => {
        const seller = sellerById[record.seller_id];
        if (!seller) return;

        seller.sales_count++;

        record.items.forEach(item => {
            const product = productBySku[item.sku];
            if (!product) return;

            // revenue в рублях (float) от вспомогательной функции
            const revenueRub = calculateRevenue(item, product);
            // cost в рублях (float)
            const costRub = product.purchase_price * item.quantity;
            const profitRub = revenueRub - costRub;

            // перевод в копейки с округлением до ближайшей копейки
            const revenueCents = Math.round(revenueRub * 100);
            const costCents = Math.round(costRub * 100);
            const profitCents = revenueCents - costCents;

            seller.revenue_cents += revenueCents;
            seller.profit_cents += profitCents;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // сортируем по прибыли (используем profit_cents)
    sellerStats.sort((a, b) => b.profit_cents - a.profit_cents);

    // назначаем бонусы и формируем топ-10
    sellerStats.forEach((seller, index) => {
        // временно добавляем поля в рублях для совместимости с calculateBonus (он использует profit_cents here)
        // calculateBonus ожидает seller объект — мы оставляем seller.profit_cents
        // получаем бонус в рублях
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        const sortedProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        seller.top_products = sortedProducts;
    });

    // формируем окончательный результат: переводим копейки в рубли и форматируем числа
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +(seller.revenue_cents / 100).toFixed(2),
        profit: +(seller.profit_cents / 100).toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +(+seller.bonus).toFixed(2)
    }));
}
