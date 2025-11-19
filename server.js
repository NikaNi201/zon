const express = require('express');
const axios = require('axios'); // нужен для http-запроса к ScrapingBee

const app = express();

const SCRAPINGBEE_API_KEY = 'NY6WX1EBVRHDETAFGI763MC6W8JSFZEO0JSEDMWPJDZAS6YL3DBZRJME7Q25TJK25F77C0A5ZBNSJQR3'; // ← вставь свой ключ

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).json({ status: 'error', error: 'Нет SKU' });

  // Собираем URL карточки Ozon
  const ozonUrl = `https://www.ozon.ru/product/${sku}/`;

  try {
    const beeResp = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: ozonUrl,
        render_js: 'true',
        premium_proxy: 'true', // если твой тариф поддерживает
        country_code: 'ru'     // максимально "нативно" для Ozon
      }
    });

    const html = beeResp.data;

    // Теперь парсим цену из html
    let price = '';
    let match = html.match(/<span[^>]*?(tsHeadline600Large|tsHeadline500Medium)[^>]*>([\d\s ]+)&thinsp;₽<\/span>/i);
    if (match && match[2]) {
      price = match[2].replace(/[^\d]/g, '');
    } else {
      let m2 = html.match(/<span[^>]*>[\s]*(\d[\d\s ]*)&thinsp;₽<\/span>/i);
      if (m2 && m2[1]) price = m2[1].replace(/[^\d]/g, '');
    }

    let stock = (
      html.includes('"isAvailableForBuy":true') ||
      html.includes('В корзину') || html.includes('Добавить в корзину')
    ) ? 'да' : 'нет';

    res.json({
      status: price ? 'ok' : 'empty',
      sku,
      price,
      in_stock: stock,
      debug: price ? undefined : html.slice(0, 900)
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.toString() });
  }
});

app.get('/', (req, res) => {
  res.send('WORKING! Use /ozon?sku=...');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server started on', PORT));

