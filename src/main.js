function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  switch (index) {
    case 0:
      return +(profit * 0.15).toFixed(2);
    case 1:
    case 2:
      return +(profit * 0.10).toFixed(2);
    case total - 1:
      return 0;
    default:
      return +(profit * 0.05).toFixed(2);
  }
}

function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discountFactor;
}

function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;

  // Проверка входных данных и функций
  if (
    !calculateRevenue ||
    !calculateBonus ||
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Не определены функции для расчетов");
  }

  if (!data) {
    throw new Error("Отсутствуют данные");
  }

  if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Пустой массив sellers");
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error("Пустой массив products");
  }

  if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
    throw new Error("Пустой массив purchase_records");
  }

  // Индексы для быстрого доступа по id и sku
  const sellerIndex = Object.fromEntries(
    data.sellers.map(seller => [
      seller.id,
      {
        id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`, // Формируем имя
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0,
        top_products: [],
      },
    ])
  );

  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );

  // Сбор статистики по продажам
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return; // на всякий случай

    // Увеличиваем количество продаж и общую сумму выручки
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    // Перебираем все товары в чеке
    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортируем продавцов по убыванию прибыли
  const sellerStats = Object.values(sellerIndex).sort(
    (a, b) => b.profit - a.profit
  );

  // Расчёт бонусов и топ-10 товаров
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Формируем итоговый отчёт с нужным форматированием
  return sellerStats.map(seller => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
