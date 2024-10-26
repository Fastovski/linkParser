"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const iconv = __importStar(require("iconv-lite"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const uri = 'mongodb://localhost:27017'; // URL вашей базы данных
const dbName = 'animeService'; // Имя базы данных
const collectionName = 'animeLinks'; // Имя коллекции
function fetchAnimeLinks() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = 'https://jut.su/anime/action-demons/2024/';
            const response = yield axios_1.default.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            const data = iconv.decode(Buffer.from(response.data), 'windows-1251');
            const $ = cheerio.load(data);
            const results = [];
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
        }
        catch (error) {
            console.error('Ошибка при извлечении данных:', error);
            return [];
        }
    });
}
function fetchAdditionalData(link) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(link, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });
            const data = iconv.decode(Buffer.from(response.data), 'windows-1251');
            const $ = cheerio.load(data);
            const videoLinks = [];
            $('.short-btn.green.video.the_hildi, .short-btn.black.video.the_hildi').each((index, element) => {
                const videoLink = $(element).attr('href');
                if (videoLink) {
                    videoLinks.push(`https://jut.su${videoLink}`);
                }
            });
            return videoLinks;
        }
        catch (error) {
            console.error('Ошибка при извлечении дополнительных данных:', error);
            return [];
        }
    });
}
let browser = null;
let page = null;
function initBrowser() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!browser) {
            browser = yield puppeteer_extra_1.default.launch({ headless: true }); // запустим браузер в headless-режиме
            page = yield browser.newPage();
            // Установим необходимые заголовки один раз
            yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            yield page.setExtraHTTPHeaders({
                'Referer': 'https://jut.su/',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1',
                'Cache-Control': 'max-age=0',
                'Accept-Encoding': 'gzip, deflate, br',
            });
        }
    });
}
function fetchVideo(videoLink) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield initBrowser();
            // Переход на страницу с видео
            if (page) {
                yield page.goto(videoLink, { waitUntil: 'domcontentloaded' });
                // Задержка на 2 секунды
                yield page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                // Ожидаем появления элемента с id #my-player_html5_api
                yield page.waitForSelector('#my-player_html5_api');
                // Извлекаем контент страницы
                const content = yield page.content();
                const $ = cheerio.load(content);
                const animeVideos = [];
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
            }
            else {
                throw new Error('Не удалось инициализировать страницу');
            }
        }
        catch (error) {
            console.error('Ошибка при извлечении видео:', error);
            return [];
        }
    });
}
process.on('exit', () => __awaiter(void 0, void 0, void 0, function* () {
    if (browser)
        yield browser.close();
}));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const animeLinks = yield fetchAnimeLinks();
        const animeData = [];
        for (const { link, name } of animeLinks) {
            const videos = yield fetchAdditionalData(link);
            const animeVideos = [];
            // Для каждой ссылки на серию нужно получить список видео
            for (const videoLink of videos) {
                const seriesVideos = yield fetchVideo(videoLink);
                animeVideos.push(seriesVideos);
            }
            animeData.push({ link, name, videoLinks: videos, animeVideos });
        }
        console.log('Результаты парсинга:', animeData);
    });
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
