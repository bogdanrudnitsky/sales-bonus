function calculateSimpleRevenue(purchase, _product) {
    const discount = purchase.discount ? purchase.discount / 100 : 0;
    const priceAfterDiscount = purchase.sale_price * (1 - discount);
    return priceAfterDiscount * purchase.quantity;
}

function calculateBonusByProfit(index, total, seller) {
    // поддержка profit и profit_cents
    const profit = seller.profit_cents ? seller.profit_cents / 100 : seller.profit || 0;
    let rate = 0;

    if (index === 0) rate = 0.15;
    else if (index === 1 || index === 2) rate = 0.10;
    else if (index === total - 1) rate = 0;
    else rate = 0.05;

    return +(profit * rate).toFixed(2);
}

function analyzeSalesData(data, options) {
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

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue_cents: 0,
        profit_cents: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerById = Object.fromEntries(sellerStats.map(s => [s.id, s]));
    const productBySku = Object.fromEntries(data.products.map(p => [p.sku, p]));

    data.purchase_records.forEach(record => {
        const seller = sellerById[record.seller_id];
        if (!seller) return;

        seller.sales_count++;

        record.items.forEach(item => {
            const product = productBySku[item.sku];
            if (!product) return;

            const revenueRub = calculateRevenue(item, product);
            const costRub = product.purchase_price * item.quantity;
            const profitRub = revenueRub - costRub;

            const revenueCents = Math.round(revenueRub * 100);
            const costCents = Math.round(costRub * 100);
            const profitCents = revenueCents - costCents;

            seller.revenue_cents += revenueCents;
            seller.profit_cents += profitCents;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit_cents - a.profit_cents);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        const sortedProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        seller.top_products = sortedProducts;
    });

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
