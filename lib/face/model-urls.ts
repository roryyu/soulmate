// QAWF · 本地同域模型路径（v2.1 离线化）
// 权重文件由 `npm run fetch-models` 预先下载到 public/models/，运行时同域加载，
// 不再从 tfhub.dev / kaggle.com / storage.googleapis.com 远程拉取。
// 传给 face-landmarks-detection 的 URL 只要不含 'https://tfhub.dev'，
// 加载器就走普通 loadGraphModel（同域 fetch），见 node_modules 内 detector.js。

export const LOCAL_DETECTOR_MODEL_URL = '/models/face-detection-short/model.json';
export const LOCAL_LANDMARK_MODEL_URL = '/models/face-mesh/model.json';
