import { extractUrlFromMessage } from './src/lib/ai/url-scraper';

const text = "Check out www.actibuzz.com for more info";
const url = extractUrlFromMessage(text);
console.log('Input:', text);
console.log('Result:', url);

if (url === 'https://www.actibuzz.com') {
  console.log('SUCCESS: URL detected correctly');
} else {
  console.log('FAILURE: URL not detected correctly');
}
