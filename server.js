const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/ozon', async (req, res) => {
    const sku = (req.query.sku || '').replace(/[^\d]+/g, '');
    if (!sku) return res.status(400).send({error: 'Нет sku'});

    let browser;
    try {
        browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto('https://www.ozon.ru/product/' + sku + '/', {waitUntil: 'networkidle2', timeout: 35000});
        const html = await page.content();

        let price = '';
        let in_stock = 'нет';
        let regex = /<span[^>]*?tsHeadline6[\w\d]+Large[^>]*>([\d\s ]+)&thinsp;₽<\/span>/i;
        let match = html.match(regex);
        if (match && match[1]) price = match[1].replace(/[^\d]/g, '');

        if (html.includes('В корзину') || html.includes('isAvailableForBuy":true')) in_stock = 'да';

        res.json({status: "ok", price, in_stock});
    } catch (e) {
        res.status(500).json({status:'err', error: ''+e});
    } finally {
        if (browser) await browser.close();
    }
});
app.get('/', (req, res) => { res.send("WORKING! Use /ozon?sku=..."); });
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log('Started on', PORT); });
