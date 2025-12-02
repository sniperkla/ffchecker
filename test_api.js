import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.forexfactory.com/calendar/apply-settings/1?navigation=0';
const payload = {
  "begin_date": "December 1, 2025",
  "end_date": "December 3, 2025",
  "default_view": "this_week",
  "impacts": [3, 2, 1],
  "event_types": [1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
  "currencies": [9]
};

async function test() {
  try {
    const response = await axios.post(url, payload, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    console.log('Status:', response.status);
    console.log('Data type:', typeof response.data);
    if (typeof response.data === 'string') {
        console.log('Preview:', response.data.substring(0, 200));
    } else {
        console.log('Keys:', Object.keys(response.data));
        if (response.data.content) {
            console.log('Content preview:', response.data.content.substring(0, 200));
        }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
    }
  }
}

test();
