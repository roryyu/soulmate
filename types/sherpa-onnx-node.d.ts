declare module 'sherpa-onnx-node' {
  interface SenseVoiceConfig {
    model: string;
    language?: string;
    useInverseTextNormalization?: number;
  }

  interface ModelConfig {
    senseVoice?: SenseVoiceConfig;
    tokens: string;
    numThreads?: number;
    debug?: boolean;
    provider?: string;
  }

  interface OfflineRecognizerConfig {
    modelConfig: ModelConfig;
    featConfig?: {
      sampleRate?: number;
      featureDim?: number;
    };
  }

  interface Waveform {
    samples: Float32Array;
    sampleRate: number;
  }

  interface OfflineRecognizerResult {
    text: string;
    lang: string;
    emotion: string;
    event: string;
    timestamps?: number[];
    durations?: number[];
    tokens?: string[];
  }

  interface OfflineStream {
    acceptWaveform(obj: Waveform): void;
    setOption(key: string, value: string): void;
  }

  interface OfflineRecognizer {
    createStream(): OfflineStream;
    decode(stream: OfflineStream): void;
    getResult(stream: OfflineStream): OfflineRecognizerResult;
  }

  const sherpa_onnx: {
    OfflineRecognizer: new (config: OfflineRecognizerConfig) => OfflineRecognizer;
    readWave(filename: string): Waveform;
    readWaveFromBinary(data: Uint8Array): Waveform;
    writeWave(filename: string, obj: Waveform): boolean;
  };

  export default sherpa_onnx;
}
