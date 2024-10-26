import axios from 'axios';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { MongoClient } from 'mongodb';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
puppeteer.use(StealthPlugin());

const uri = 'mongodb://localhost:27017'; // URL вашей базы данных
const dbName = 'animeService'; // Имя базы данных
const collectionName = 'animeLinks'; // Имя коллекции

async function fetchAnimeLinks(): Promise<{ link: string; name: string }[]> {
  try {
    const url = 'https://jut.su/anime/action-demons/2024/';
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const data = iconv.decode(Buffer.from(response.data), 'windows-1251');
    const $ = cheerio.load(data);

    const results: { link: string; name: string }[] = [];

    $('div.all_anime_global a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullLink = `https://jut.su/${href}`;
        const name = $(element).find('.aaname').text().trim();
        if (name) {
          results.push({ link: fullLink, name });
        }
      }
    });

    return results;
  } catch (error) {
    console.error('Ошибка при извлечении данных:', error);
    return [];
  }
}

async function fetchAdditionalData(link: string): Promise<string[]> {
  try {
    const response = await axios.get(link, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const data = iconv.decode(Buffer.from(response.data), 'windows-1251');
    const $ = cheerio.load(data);
    
    const videoLinks: string[] = [];
    $('.short-btn.green.video.the_hildi, .short-btn.black.video.the_hildi').each((index, element) => {
      const videoLink = $(element).attr('href');
      if (videoLink) {
        videoLinks.push(`https://jut.su${videoLink}`);
      }
    });

    return videoLinks;
  } catch (error) {
    console.error('Ошибка при извлечении дополнительных данных:', error);
    return [];
  }
}

let browser: Browser | null = null;
let page: Page | null = null;

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true }); // запустим браузер в headless-режиме
    page = await browser.newPage();

    // Установим необходимые заголовки один раз
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      
    );
    await page.setExtraHTTPHeaders({
      'Referer': 'https://jut.su/',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1',
      'Cache-Control': 'max-age=0',
      'Accept-Encoding': 'gzip, deflate, br',
    });
  }
}

async function fetchVideo(videoLink: string): Promise<string[]> {
  try {
    await initBrowser();

    // Переход на страницу с видео
    if (page) {
      await page.goto(videoLink, { waitUntil: 'domcontentloaded' });

      // Задержка на 2 секунды
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

      // Ожидаем появления элемента с id #my-player_html5_api
      await page.waitForSelector('#my-player_html5_api');

      // Извлекаем контент страницы
      const content = await page.content();
      const $ = cheerio.load(content);

      const animeVideos: string[] = [];

      // Парсинг только ссылок с res="1080" и res="720"
      $('#my-player_html5_api source').each((index, element) => {
        const src = $(element).attr('src');
        const type = $(element).attr('type');
        const res = $(element).attr('res');

        if (src && type && type.includes('video/') && (res === '1080' || res === '720')) {
          animeVideos.push(src);
        }
      });

      console.log('Полученные ссылки на видео (только 1080 и 720):', animeVideos);
      return animeVideos;
    } else {
      throw new Error('Не удалось инициализировать страницу');
    }
  } catch (error) {
    console.error('Ошибка при извлечении видео:', error);
    return [];
  }
}

process.on('exit', async () => {
  if (browser) await browser.close();
});

async function main() {
  const animeLinks = await fetchAnimeLinks();
  const animeData: { link: string; name: string; videoLinks: string[]; animeVideos: string[][] }[] = [];

  for (const { link, name } of animeLinks) {
    const videos = await fetchAdditionalData(link);
    const animeVideos: string[][] = [];

    // Для каждой ссылки на серию нужно получить список видео
    for (const videoLink of videos) {
      const seriesVideos = await fetchVideo(videoLink);
      animeVideos.push(seriesVideos);
    }

    animeData.push({ link, name, videoLinks: videos, animeVideos });
  }
  console.log('Результаты парсинга:', animeData);
}
  // await saveToDatabase(animeData);
main();


// async function saveToDatabase(animeData: { link: string; name: string; videoLinks: string[] }[]) {
//   const client = new MongoClient(uri);
  
//   try {
//     await client.connect();
//     const database = client.db(dbName);
//     const collection = database.collection(collectionName);
    
//     await collection.insertMany(animeData);
//     console.log('Данные успешно сохранены в базу данных.');
//   } catch (error) {
//     console.error('Ошибка при сохранении данных в базу:', error);
//   } finally {
//     await client.close();
//   }
// }