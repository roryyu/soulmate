const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: 'Bearer sk-xxx'},
  body: JSON.stringify({
    model: 'music-2.6',
    output_format: 'url',
    prompt: '30秒鼓点',
    is_instrumental: true,
    audio_setting: {sample_rate: 44100, bitrate: 256000, format: 'mp3'}
  })
};
console.log(options)
fetch('https://api.minimaxi.com/v1/music_generation', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));