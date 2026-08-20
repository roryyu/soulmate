const sherpa_onnx = require('sherpa-onnx-node');
const path = require('path');

const modelDir = path.join(__dirname, 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17');

const recognizer = new sherpa_onnx.OfflineRecognizer({
  modelConfig: {
    senseVoice: {
      model: path.join(modelDir, 'model.int8.onnx'), // 或 model.onnx
    },
    tokens: path.join(modelDir, 'tokens.txt'),
    numThreads: 4,
    debug: false,
    // provider: 'cpu', // 或 'coreml'（macOS 加速）
  },
  // 可选：指定语种（'auto' | 'zh' | 'yue' | 'en' | 'ja' | 'ko'），不填默认 auto
  // language: 'zh',
  // useInverseTextNormalization: true,
});

const stream = recognizer.createStream();

console.log(modelDir+'/test_wavs/zh.wav');
const wave = sherpa_onnx.readWave(modelDir+'/test_wavs/zh.wav'); // 返回 { samples: Float32Array, sampleRate }

  
stream.acceptWaveform({ samples: wave.samples, sampleRate: wave.sampleRate });
recognizer.decode(stream);

const result = recognizer.getResult(stream);
console.log('文本 :', result.text);
console.log('语种 :', result.lang);     // 例如 'zh'
console.log('情绪 :', result.emotion);  // 例如 'NEUTRAL' / 'HAPPY' / 'ANGRY' ...
console.log('事件 :', result.event);    // 例如 'Speech' / 'Laughter' / 'Applause' ...