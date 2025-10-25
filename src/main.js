// Расчет бонусов и анализа продаж
// Автор: Рудницкий

function calculateBonusByProfit(index, total, seller) {
  const profit = seller.profit;

  let rate = 0;
  if (index === 0) rate = 0.15;
  else if (index === 1 || index === 2) rate = 0.10;
  else if (index === total - 1) rate = 0;
  else rate = 0.05;

  return +(profit * rate).toFixed(2);
}

function calculateSimpleRevenue(purchase, _product) {
  const discount = purchase.discount ? purchase.discount / 100 : 0;
  const price = purchase.sale_price * (1 - discount);
  return price * purchase.quantity;
}

function analyzeSalesData(data, options) {
  // Проверка корректности переданных функций
  if (
    !options ||
    typeof options.calculateRevenue !== "function" ||
    typeof options.calculateBonus !== "function"
  ) {
    throw new Error("Не заданы корректные функции расчета");
  }

  const { calculateRevenue, calculateBonus } = options;

  // Проверка структуры данных
  if (!data) throw new Error("Данные отсутствуют");
  if (!Array.isArray(data.sellers) || data.sellers.length === 0)
    throw new Error("Пустой или некорректный список продавцов");
  if (!Array.isArray(data.products) || data.products.length === 0)
    throw new Error("Пустой или некорректный список товаров");
  if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0)
    throw new Error("Пустой или некорректный список покупок");

  // Индексы для быстрого доступа
  const sellersMap = Object.fromEntries(
    data.sellers.map(s => [
      s.id,
      {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0,
        top_products: [],
      },
    ])
  );

  const productsMap = Object.fromEntries(
    data.products.map(p => [p.sku, p])
  );

  // Основная обработка данных продаж
  data.purchase_records.forEach(record => {
    const seller = sellersMap[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;
    seller.revenue += record.total_amount || 0;

    record.items.forEach(item => {
      const product = productsMap[item.sku];
      if (!product) return;

      const revenue = calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.profit += profit;
      seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  // Сортировка по прибыли
  const sellerStats = Object.values(sellersMap).sort(
    (a, b) => b.profit - a.profit
  );

  // Расчет бонусов и топ-товаров
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Формирование итогового результата
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
