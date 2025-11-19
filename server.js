const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).send({ error: 'Нет sku' });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome' // явный путь
    });
    const page = await browser.newPage();
    await page.goto('https://www.ozon.ru/product/' + sku + '/', { waitUntil: 'networkidle', timeout: 35000 });
    const html = await page.content();
    
    // Парсинг цены и наличия
    let price = '';
    let match = html.match(/<span[^>]*?(tsHeadline600Large|tsHeadline500Medium)[^>]*>([\d\s ]+)&thinsp;₽<\/span>/i);
    if (match && match[2]) {
      price = match[2].replace(/[^\d]/g, '');
    } else {
      let m2 = html.match(/<span[^>]*>[\s]*(\d[\d\s ]*)&thinsp;₽<\/span>/i);
      if (m2 && m2[1]) price = m2[1].replace(/[^\d]/g, '');
    }
    
    let stock = (html.includes('"isAvailableForBuy":true') || html.includes('В корзину') || html.includes('Добавить в корзину')) ? '✔' : '';
    let in_stock = stock ? 'да' : 'нет';
    let status = price ? 'ok' : 'Не найдено';
    
    res.json({ status: 'ok', price, in_stock, status });
  } catch (e) {
    res.status(500).json({ status: 'err', error: '' + e });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/', (req, res) => res.send('WORKING! Use /ozon?sku=...'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log('Started on', PORT); });
