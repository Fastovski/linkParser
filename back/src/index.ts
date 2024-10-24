import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchAnimeLinks() {
    try {
        const url = 'https://jut.su/anime/action-demons/2024/';
        
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        console.log(data);
        
        const $ = cheerio.load(data);
        const results: { link: string, name: string }[] = [];
        
        $('div.all_anime_global a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullLink = `https://jut.su/${href}`;
                const name = $(element).find('.aaname').parent().text().trim();
                
                results.push({ link: fullLink, name });
            }
        });
        
        return results;
    } catch (error) {
        console.error('Ошибка при извлечении данных:', error);
        return [];
    }
}

fetchAnimeLinks().then(results => {
    console.log('Извлеченные ссылки и названия:', results);
});