const youtubedl = require('youtube-dl-exec');

async function ytdl(url) {
	const output = `${(Math.random()*(10e10)).toFixed()}`;
  try {
    const result = await youtubedl(url, {
      format: 'bestvideo+bestaudio',
      output: output,
      mergeOutputFormat: 'mp4',
      preferFreeFormats: true
    });
    return {
      success: true,
      filePath: output
    };
  } catch (error) {
    console.error('Download failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  ytdl
};
