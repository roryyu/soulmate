import { aiMusicControl } from '@/lib/ai-music-client';

const result = await aiMusicControl({
  instruction: "将第一首歌的前30秒作为开头，然后在40秒处插入第二首歌的副歌部分（从1分钟到1分30秒）",
  musicFiles: [
    { id: "song1", name: "开场曲.mp3", duration: 180, base64Data: "..." },
    { id: "song2", name: "主题曲.mp3", duration: 240, base64Data: "..." }
  ],
  totalDuration: 90
});
// 返回合并后的 base64 字符串