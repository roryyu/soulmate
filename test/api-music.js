const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: 'Bearer sk-cp-rRH2ZFQskqPOICR3EUzrQt7XfNTk2hJsOeIGSBWMVaEtH641IxGkRJ-OOmY5mgtfQl4RVL8HJdKyMgZFjLQWIwIbB5vcbZML6qIDfvbFHPhBs0QRVtYp6MY'},
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