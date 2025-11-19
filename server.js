const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).json({ status: 'error', error: 'Нет SKU' });

  let browser, html = '', price = '', in_stock = 'нет', status = 'Не найдено', debug = '';
  const startTime = Date.now();
  try {
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

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      colorScheme: 'light'
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    console.log('Step 1:', ((Date.now() - startTime) / 1000).toFixed(2), 'сек');
    await page.goto(`https://www.ozon.ru/product/${sku}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    console.log('Step 2:', ((Date.now() - startTime) / 1000).toFixed(2), 'сек');
    await page.waitForTimeout(5000);
    console.log('Step 3:', ((Date.now() - startTime) / 1000).toFixed(2), 'сек');

    html = await page.content();
    debug = html.slice(0, 1000);

    // Парсинг цены
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
    in_stock = stock ? 'да' : 'нет';
    status = price ? 'ok' : 'Не найдено';

    res.json({ status: 'ok', sku, price, in_stock, message: status, debug });
  } catch (e) {
    debug = html ? html.slice(0, 1000) : String(e);
    res.status(500).json({ status: 'error', sku, price, in_stock, message: status, error: '' + e, debug });
  } finally {
    if (browser) { await browser.close(); }
    console.log('Memory usage:', process.memoryUsage());
    console.log('Total time:', ((Date.now() - startTime) / 1000).toFixed(2), 'сек');
  }
});

app.get('/', (req, res) => {
  res.send('WORKING! Use /ozon?sku=...');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
