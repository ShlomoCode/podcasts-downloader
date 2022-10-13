const { parse } = require('rss-to-json');
const fs = require('fs');
const axios = require('axios');
const prompts = require('prompts');
require('colors');

(async () => {
  const { url } = await prompts({
    type: 'text',
    name: 'url',
    message: 'Enter the RSS feed URL'
  });

  if (!url) { console.log('No URL provided'.red); process.exit(1); }

  console.log('⏳ Fetching RSS feed...'.yellow);

  let items, podcastTitle;
  try {
    const { items: _items, title } = await parse(url);
    items = _items;
    podcastTitle = title;
  } catch (e) {
    console.log('Error fetching RSS feed:'.red, e.message);
    process.exit(1);
  }
  if (!items.length) { console.log('No items found'.red); process.exit(1); }

  const { itemsToDownload } = await prompts({
    type: 'multiselect',
    name: 'itemsToDownload',
    message: 'Select the items to download',
    choices: items.map((item, index) => ({
      title: item.title,
      value: index,
      selected: true
    }))
  });

  if (!itemsToDownload.length) { console.log('No items selected'.red); process.exit(1); }

  console.log(`⏳ Downloading ${itemsToDownload.length} items...`.yellow);
  for (let i = 0; i < itemsToDownload.length; i++) {
    const item = items[itemsToDownload[i]];
    const { title, enclosures } = item;

    if (!fs.existsSync('podcasts')) {
      fs.mkdirSync('podcasts');
    }

    if (!fs.existsSync('podcasts/' + podcastTitle)) {
      fs.mkdirSync('podcasts/' + podcastTitle);
    }
    const { url } = enclosures[0];
    axios.get(url, { responseType: 'stream' }).then(response => {
      const path = `podcasts/${podcastTitle}/${title}.mp3`;
      if (fs.existsSync(path)) {
        return console.log(`"${title}" already exists`.red);
      }
      const writeStream = fs.createWriteStream(path);
      response.data.pipe(writeStream);
      console.log(`⏳ Downloading "${title}"...`.yellow);
      writeStream.on('finish', () => {
        console.log(`✅ Downloaded "${title}" finished`.green);
      });
    })
      .catch(err => {
        console.log(`❌ Downloading "${title}" failed:`.red, err.message);
      });
  };
})();

process.on('exit', function (exitStatus) {
  if (exitStatus === 0) {
    console.log('👏 All done!', 'Thanks for using the RSS Downloader!'.magenta);
  }
});
