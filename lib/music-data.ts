export interface DataItem { id: string; base: string; noise: string | null; info: string; type: string }
export interface MusicItem {
  id: string
  base: string
  noise: string | null
  info: string
  type: string
  det?: number
  tBase?: number
  tNoise?: number
}


const data: DataItem[][] = [
    [
        // 扫脸
        {id:'0001',base:'BASE002',noise:'NB02',info:'心跳快',type:'1'},
        {id:'0002',base:'BASE002',noise:'W01',info:'心跳快',type:'1'},
        {id:'0003',base:'BASE002',noise:'NB02',info:'压力大',type:'2'},
        {id:'0004',base:'BASE002',noise:'W01',info:'压力大',type:'2'},
        {id:'0005',base:'BASE001',noise:'NA01',info:'身体放松',type:'3'},
        {id:'0006',base:'BASE001',noise:'NA02',info:'身体放松',type:'3'},
        {id:'0007',base:'BASE003',noise:'NA01',info:'身体放松',type:'3'},
        {id:'0008',base:'BASE003',noise:'NA02',info:'身体放松',type:'3'},
    ],
    [
        // 脑电
        {id:'0009',base:'BASE001',noise:'NA01',info:'精神紧绷焦虑',type:'4'},
        {id:'0010',base:'BASE004',noise:'NA01',info:'精神紧绷焦虑',type:'4'},
        {id:'0011',base:'BASE002',noise:'NB01',info:'很累、耗竭没精神',type:'5'},
        {id:'0012',base:'BASE002',noise:'NB03',info:'很累、耗竭没精神',type:'5'},
        {id:'0013',base:'BASE005',noise:'NB01',info:'很累、耗竭没精神',type:'5'},
        {id:'0014',base:'BASE005',noise:'NB03',info:'很累、耗竭没精神',type:'5'},
        {id:'0015',base:'BASE003',noise:null,info:'脑子思虑多想得多',type:'6'},
    ],
    [
        // 量表
        {id:'0016',base:'BASE001',noise:'NA02',info:'急躁紧绷',type:'7'},
        {id:'0017',base:'BASE001',noise:'W01',info:'急躁紧绷',type:'7'},
        {id:'0018',base:'BASE002',noise:'NA02',info:'压抑无力',type:'8'},
        {id:'0019',base:'BASE002',noise:'W01',info:'压抑无力',type:'8'},
        {id:'0020',base:'BASE003',noise:'NA02',info:'思虑多想',type:'9'},
        {id:'0021',base:'BASE003',noise:'W01',info:'思虑多想',type:'9'},
        {id:'0022',base:'BASE004',noise:'NA02',info:'恐慌压力',type:'10'},
        {id:'0023',base:'BASE004',noise:'W01',info:'恐慌压力',type:'10'},
        {id:'0024',base:'BASE005',noise:'NA02',info:'低落耗竭',type:'11'},
        {id:'0025',base:'BASE005',noise:'W01',info:'低落耗竭',type:'11'},
    ],
    [
        // 自选
        {id:'0026',base:'BASE001',noise:'NA01',info:'愤怒',type:'12'},
        {id:'0027',base:'BASE002',noise:'NB02',info:'悲伤',type:'13'},
        {id:'0028',base:'BASE002',noise:'NB03',info:'悲伤',type:'13'},
        {id:'0029',base:'BASE003',noise:'NA01',info:'焦虑',type:'14'},
        {id:'0030',base:'BASE004',noise:null,info:'快乐',type:'15'},
        {id:'0031',base:'BASE005',noise:'NB02',info:'麻木',type:'16'},
        {id:'0032',base:'BASE005',noise:'NB03',info:'麻木',type:'16'},
    ],
]
const times=[
    {id:'t1',info:'8:00-12:00',base:0.8,noise:0.4},
    {id:'t2',info:'12:00-16:00',base:0.6,noise:0.3},
    {id:'t3',info:'16:00-20:00',base:0.5,noise:0.2},
    {id:'t4',info:'20:00-8:00',base:0.3,noise:0.1},
]
export const musicDurations={
  "BASE001": 51.891896,
  "BASE002": 56.453875,
  "BASE003": 50.526313,
  "BASE004": 56.470583,
  "BASE005": 32,
  "NA01": 60,
  "NA02": 60,
  "NB01": 60,
  "NB02": 60,
  "NB03": 60,
  "W01": 60,
  "W02": 60
}

const all: Array<{id: string, music: MusicItem[]}> = []
const allMap: Record<string, MusicItem[]> = {}
for(let t=0;t<times.length;t++){
    let time=times[t]
    let tid=times[t].id;
    for(let i=-1;i<data[0].length;i++){
        let id1='0000'
        let d1: MusicItem | null = null
        if(data[0][i]){
            id1=data[0][i].id;
            d1={...data[0][i], det:0.4}
        }
        for(let j=-1;j<data[1].length;j++){
            let id2='0000'
            let d2: MusicItem | null = null
            if(data[1][j]){
                id2=data[1][j].id;
                d2={...data[1][j], det:0.4}
            }
            for(let m=-1;m<data[2].length;m++){
                let id3='0000'
                let d3: MusicItem | null = null
                if(data[2][m]){
                    id3=data[2][m].id;
                    d3={...data[2][m], det:0.6}
                }
                for(let n=-1;n<data[3].length;n++){
                    let id4='0000'
                    let d4: MusicItem | null = null
                    if(data[3][n]){
                        id4=data[3][n].id;
                        d4={...data[3][n], det:1}
                    }
                    let allid=`${id1}-${id2}-${id3}-${id4}-${tid}`
                    let music=[]
                    if(d1){
                        d1.tBase=time.base
                        d1.tNoise=time.noise
                        music.push(d1)
                    }
                    if(d2){
                        d2.tBase=time.base
                        d2.tNoise=time.noise
                        music.push(d2)
                    }
                    if(d3){
                        d3.tBase=time.base
                        d3.tNoise=time.noise
                        music.push(d3)
                    }
                    if(d4){
                        d4.tBase=time.base
                        d4.tNoise=time.noise
                        music.push(d4)
                    }
                    all.push({id:allid,music:music})
                    allMap[allid]=music
                }
            }
        }
    }
}

export const MUSICS= allMap 

export function getTimeTag() {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    let tid=times[0].id

    for (const t of times) {
      const [start, end] = t.info.split('-')
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em

      if (startMin <= endMin) {
        // 不跨午夜，如 8:00-12:00
        if (currentMinutes >= startMin && currentMinutes < endMin) tid=t.id
      } else {
        // 跨午夜，如 20:00-8:00
        if (currentMinutes >= startMin || currentMinutes < endMin) tid=t.id
      }
    }
    return tid
}
export const randomIndex = (max: number) => Math.floor(Math.random() * max)
