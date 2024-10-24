"use strict";
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
exports.main = main;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
// interface ParsedData {
//     url: string;
//     text: string;
// }
const URL = 'https://jut.su/anime/action-demons/2024/';
function fetchHTML(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return data;
    });
}
function extractAnimeLinks(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const $ = cheerio_1.default.load(html);
        const links = new Set();
        $('div.all_anime_global a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                links.add(`https://jut.su${href}`);
            }
        });
        return Array.from(links);
    });
}
function extractEpisodeLinks(html) {
    return __awaiter(this, void 0, void 0, function* () {
        const $ = cheerio_1.default.load(html);
        const links = [];
        $('.short-btn.green.video.the_hildi, .short-btn.black.video.the_hildi').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                links.push(`https://jut.su${href}`);
            }
        });
        return links;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const html = yield fetchHTML(URL);
        const animeLinks = yield extractAnimeLinks(html);
        let episodeLinks = [];
        for (const currentAnimeLink of animeLinks) {
            console.log(`Fetching episodes for anime: ${currentAnimeLink}`);
            const animeHtml = yield fetchHTML(currentAnimeLink);
            episodeLinks = yield extractEpisodeLinks(animeHtml);
            console.log(`Extracted ${episodeLinks.length} episode links for anime: ${currentAnimeLink}`);
            episodeLinks.forEach(link => console.log(link));
        }
        console.log('All links extracted successfully!');
        return animeLinks;
    });
}
