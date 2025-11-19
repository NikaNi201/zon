const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const SCRAPINGBEE_API_KEY = 'NY6WX1EBVRHDETAFGI763MC6W8JSFZEO0JSEDMWPJDZAS6YL3DBZRJME7Q25TJK25F77C0A5ZBNSJQR3';

app.get('/ozon', async (req, res) => {
  const sku = (req.query.sku || '').replace(/[^\d]/g, '');
  if (!sku) return res.status(400).json({ status: 'error', error: 'Нет SKU' });

  const ozonUrl = `https://www.ozon.ru/product/${sku}/`;

  try {
    const beeResp = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: ozonUrl,
        render_js: 'true',
        country_code: 'ru'
      },
      timeout: 60000
    });

    const html = beeResp.data;

    // Проверка на капчу
    const isCaptcha = html.includes('captcha') || html.includes('робот') || html.includes('robot') || html.includes('Challenge');
    
    if (isCaptcha) {
      // Ищем base64 картинку капчи
      const captchaMatch = html.match(/data:image\/[^;]+;base64,[^"']+/);
      const captchaImage = captchaMatch ? captchaMatch[0] : null;

      // Ищем текстовую капчу (если есть)
      const captchaTextMatch = html.match(/class="captcha-[^"]*"[^>]*>([^<]+)</i);
      const captchaText = captchaTextMatch ? captchaTextMatch[1] : null;

      return res.json({
        status: 'captcha_required',
        sku,
        captcha_image: captchaImage,
        captcha_text: captchaText,
        message: 'Ozon требует решить капчу',
        debug: html.slice(0, 600)
      });
    }

    // Парсинг цены
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
      html.includes('В корзину') || 
      html.includes('Добавить в корзину')
    ) ? 'да' : 'нет';

    res.json({
      status: price ? 'ok' : 'not_found',
      sku,
      price,
      in_stock: stock,
      message: price ? 'Успешно' : 'Цена не найдена'
    });
  } catch (error) {
    console.error('ScrapingBee Error:', error.response?.status, error.response?.data);
    res.status(500).json({ 
      status: 'error', 
      error: error.toString(),
      details: error.response?.data || 'No details'
    });
  }
});

app.get('/', (req, res) => {
  res.send('WORKING! Use /ozon?sku=...');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server started on', PORT));
