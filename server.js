const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).json({ status: 'error', error: 'Нет SKU' });

  let browser;
  try {
    // Запуск браузера с флагами обхода детекции
    browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--start-maximized'
  ]
});


    // Создание контекста с реалистичными параметрами
    const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
  locale: 'ru-RU',
  timezoneId: 'Europe/Moscow',
  colorScheme: 'light'
});
const page = await context.newPage();

// Удаление webdriver и эмуляция chrome.runtime
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {} };
});

    // Переход на страницу товара
    await page.goto(`https://www.ozon.ru/product/${sku}/`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000
});

await page.waitForTimeout(5000); // больше времени на прогрузку


    const html = await page.content();

    // Парсинг цены
    let price = '';
    let match = html.match(/<span[^>]*?(tsHeadline600Large|tsHeadline500Medium)[^>]*>([\d\s ]+)&thinsp;₽<\/span>/i);
    if (match && match[2]) {
      price = match[2].replace(/[^\d]/g, '');
    } else {
      let m2 = html.match(/<span[^>]*>[\s]*(\d[\d\s ]*)&thinsp;₽<\/span>/i);
      if (m2 && m2[1]) price = m2[1].replace(/[^\d]/g, '');
    }

    // Парсинг наличия
    let stock = (
      html.includes('"isAvailableForBuy":true') ||
      html.includes('В корзину') ||
      html.includes('Добавить в корзину')
    ) ? '✔' : '';
    let in_stock = stock ? 'да' : 'нет';
    let status = price ? 'ok' : 'Не найдено';

    await browser.close();
    browser = null;

    res.json({ status: 'ok', sku, price, in_stock, message: status });
  } catch (e) {
    if (browser) await browser.close();
    res.json({ status: 'ok', sku, price, in_stock, message: status, debug: html.slice(0,1000) });
  }
});

app.get('/', (req, res) => {
  res.send('WORKING! Use /ozon?sku=...');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});



