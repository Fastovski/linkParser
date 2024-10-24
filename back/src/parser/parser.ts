import axios from 'axios';
import cheerio from 'cheerio';

// interface ParsedData {
//     url: string;
//     text: string;
// }

const URL = 'https://jut.su/anime/action-demons/2024/';

async function fetchHTML(url: string): Promise<string> {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    return data;
}

async function extractAnimeLinks(html: string): Promise<string[]> {
    const $ = cheerio.load(html);
    const links: Set<string> = new Set();

    $('div.all_anime_global a').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            links.add(`https://jut.su${href}`);
        }
    });

    return Array.from(links);
}

async function extractEpisodeLinks(html: string): Promise<string[]> {
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('.short-btn.green.video.the_hildi, .short-btn.black.video.the_hildi').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            links.push(`https://jut.su${href}`);
        }
    });

    return links;
}

export async function main() {
    let animeLinks: string[] = [];
    let episodeLinks: string[] = [];
    let currentIndex = 0;
  
    while (currentIndex < animeLinks.length || animeLinks.length === 0) {
        let currentAnimeLink: string;
        if (animeLinks.length === 0) {
            const html = await fetchHTML(URL);
            animeLinks = await extractAnimeLinks(html);
            currentAnimeLink = animeLinks[0];
        } else {
            currentAnimeLink = animeLinks[currentIndex];
        }
  
        const html = await fetchHTML(currentAnimeLink);
        episodeLinks = await extractEpisodeLinks(html);
  
        console.log(`Extracted ${episodeLinks.length} episode links for anime: ${currentAnimeLink}`);
        episodeLinks.forEach(link => console.log(link));
  
        currentIndex++;
    }
  
    console.log('All links extracted successfully!');
    return animeLinks;
}