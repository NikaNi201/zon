const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).json({ status: 'error', error: 'Нет SKU' });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--lang=ru-RU,ru',
        '--window-size=1280,800'
      ]
    });
    const [page] = await browser.pages();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // "Человеческие" движение и заход на главную
    await page.goto('https://www.ozon.ru/', { waitUntil: 'domcontentloaded', timeout: 160000 });
    await page.mouse.move(600, 400);
    await page.mouse.move(800, 500);

    // На карточку
    await page.goto(`https://www.ozon.ru/product/${sku}/`, { waitUntil: 'domcontentloaded', timeout: 80000 });
    await page.waitForTimeout(4000);

    const html = await page.content();
    const priceMatch = html.match(/<span[^>]*?(tsHeadline600Large|tsHeadline500Medium)[^>]*>([\d\s ]+)&thinsp;₽<\/span>/i);
    const price = priceMatch && priceMatch[2] ? priceMatch[2].replace(/[^\d]/g, '') : '';
    let antibot = html.includes('Antibot Challenge Page') || html.includes('включите JavaScript');
    let status = antibot ? 'antibot' : 'ok';

    await browser.close();

    res.json({
      status,
      sku,
      price,
      antibot,
      debug: antibot ? html.slice(0, 700) : undefined
    });
  } catch (e) {
    if (browser) await browser.close();
    res.status(500).json({ status: 'error', error: '' + e });
  }
});

app.get('/', (req, res) => {
  res.send('WORKING! Use /ozon?sku=...');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server started on', PORT));

