// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type{SceneKind}from'./model';
import{lexical,scriptLanguage,type Language}from'./language';
import{worldSpecs}from'./scene-catalog';
type Lexicon=Partial<Record<Exclude<Language,'auto'>,string>>;
interface Concept{id:string;kind:SceneKind;weight:number;focus:number;terms:Lexicon;}
// Deliberately inspectable vocabulary, not a claim of general language
// understanding. Phrases outrank isolated nouns; mixed-language songs work too.
export const concepts:Concept[]=[
 ...worldSpecs.map(s=>({id:s.kind,kind:s.kind,weight:s.kind==='cross'?36:s.kind==='valley'?34:s.kind==='hands'?26:33,focus:12,terms:s.terms})),
 {id:'bridge',kind:'bridge',weight:32,focus:14,terms:{pt:'ponte|travessia|atravessar',en:'bridge|crossing over',es:'puente|travesía'}},
 {id:'forest',kind:'forest',weight:32,focus:12,terms:{pt:'floresta|bosque|árvores',en:'forest|woods|trees',es:'bosque|árboles'}},
 {id:'city',kind:'city',weight:32,focus:12,terms:{pt:'cidade|avenida|multidão',en:'city|avenue|crowd',es:'ciudad|avenida|multitud'}},
 {id:'desert',kind:'desert',weight:32,focus:14,terms:{pt:'deserto|areia|sede',en:'desert|sand|thirst',es:'desierto|arena|sed'}},
 {id:'staircase',kind:'staircase',weight:32,focus:14,terms:{pt:'escadaria|escada|degraus',en:'staircase|stairs|steps ahead',es:'escalera|peldaños'}},
 {id:'cage',kind:'cage',weight:32,focus:15,terms:{pt:'gaiola|correntes|prisão',en:'cage|chains|prison',es:'jaula|cadenas|prisión'}},
 {id:'eclipse',kind:'eclipse',weight:32,focus:14,terms:{pt:'eclipse|escuridão',en:'eclipse|darkness',es:'eclipse|oscuridad'}},
 {id:'prism',kind:'prism',weight:32,focus:13,terms:{pt:'prisma|refratar|espectro',en:'prism|refraction|spectrum',es:'prisma|refracción|espectro'}},
 {id:'guitar',kind:'guitar',weight:40,focus:12,terms:{pt:'guitarra|violão',en:'guitar|guitars|guitar solo',es:'guitarra'}},
 {id:'piano',kind:'piano',weight:40,focus:12,terms:{pt:'piano|teclado',en:'piano|keyboard',es:'piano|teclado'}},
 {id:'drums',kind:'drums',weight:40,focus:12,terms:{pt:'bateria|tambores|tambor',en:'drums|drummer|drum solo',es:'batería|tambores'}},
 {id:'farewell',kind:'bridge',weight:26,focus:12,terms:{pt:'adeus|despedida',en:'goodbye|farewell',es:'adiós|despedida'}},
 {id:'rest',kind:'rest',weight:28,focus:17,terms:{pt:'descansar|descanso|não preciso controlar|não preciso entender|paz',en:'rest|resting|peace|let go|surrender',es:'descansar|descanso|paz|soltar el control',ja:'休む|休める|安らぎ|手放す',ko:'쉬다|쉬고|쉴|휴식|평화',ru:'отдохнуть|отдых|покой|отпустить',fr:'repos|reposer|paix|lâcher prise',de:'ruhen|ruhe|frieden|loslassen',it:'riposare|riposo|pace',zh:'休息|安息|平静|放下'}},
 {id:'ocean',kind:'ocean',weight:30,focus:14,terms:{pt:'afundou|afundar|afundo|afundando|oceano|mar|água',en:'drown|drowning|sink|sinking|ocean|underwater',es:'hundir|hundió|me hundo|océano|agua',ja:'沈む|沈んだ|溺れる|海',ko:'가라앉|바다|물속|익사',ru:'тону|тонуть|утонул|океан|под водой',fr:'couler|noyer|océan',de:'sinken|ertrinken|ozean',it:'affondare|annegare|oceano',zh:'沉没|下沉|溺水|海洋'}},
 {id:'threshold',kind:'door',weight:29,focus:13,terms:{pt:'permissão|entrar|porta|acesso negado',en:'access denied|permission|enter|door|locked out',es:'permiso|entrar|puerta|acceso denegado',ja:'立入禁止|許可|入れない|扉',ko:'허가|출입 금지|들어갈|문이',ru:'нет доступа|разрешение|войти|дверь|заперто',fr:'permission|entrer|porte|accès refusé',de:'zugang verweigert|erlaubnis|tür',it:'permesso|entrare|porta|accesso negato',zh:'拒绝访问|许可|进不去|门'}},
 {id:'fall',kind:'fall',weight:27,focus:12,terms:{pt:'caio|cair|caí|levanto|levantar|tropeçar',en:'fall|falls|falling|fell|rise|rises|rising|stumble',es:'caigo|caer|caí|levanto|levantar|tropiezo',ja:'転ぶ|倒れる|立ち上がる|つまずく',ko:'넘어져|넘어지|쓰러져|일어나',ru:'падаю|падать|упал|встаю|встать|споткнулся',fr:'tomber|tombé|relever',de:'fallen|stürzen|aufstehen',it:'cadere|cado|rialzare',zh:'跌倒|倒下|站起来'}},
 {id:'refusal',kind:'denial',weight:28,focus:15,terms:{pt:'não quero|mesmo quando|recuso|mentir|negar',en:'i refuse|i don’t want|i do not want|i don\'t want|lie|lying|deny',es:'no quiero|me niego|mentir|negar',ja:'嫌だ|拒む|拒否|嘘',ko:'싫어|거부|거짓말',ru:'не хочу|отказываюсь|лгать|отрицать',fr:'je refuse|je ne veux pas|mentir|nier',de:'ich will nicht|lügen|leugnen',it:'non voglio|rifiuto|mentire',zh:'不愿|拒绝|撒谎|否认'}},
 {id:'choice',kind:'choice',weight:29,focus:10,terms:{pt:'não sei|devo correr|devo ficar|escolher',en:'i don’t know|i don\'t know|i do not know|should i|choose|stay or go',es:'no sé|debo correr|debo quedar|elegir',ja:'わからない|分からない|選ぶ|迷う',ko:'모르겠|모르|선택|망설',ru:'не знаю|выбрать|остаться или уйти',fr:'je ne sais pas|choisir|hésiter',de:'ich weiß nicht|wählen|zögern',it:'non so|scegliere|esitare',zh:'不知道|选择|犹豫'}},
 {id:'known-soul',kind:'soul',weight:31,focus:14,terms:{pt:'conhece a alma|ninguém vê|dentro de mim',en:'knows my soul|inside of me|inside me|no one sees',es:'conoce mi alma|dentro de mí|nadie ve',ja:'心の奥|魂を知る|誰にも見えない',ko:'내 안에|영혼을 알아|아무도 보지',ru:'знает мою душу|внутри меня|никто не видит',fr:'connaît mon âme|en moi',de:'kennt meine seele|in mir',it:'conosce la mia anima|dentro di me',zh:'知道我的灵魂|在我心里|无人看见'}},
 {id:'hide',kind:'hide',weight:21,focus:14,terms:{pt:'esconder|me escondo|escondido|escondida|ocultar',en:'hide|hiding|conceal',es:'esconder|ocultar|me escondo',ja:'隠れる|隠す|隠れて',ko:'숨기|숨고|숨을|숨어',ru:'прятаться|прячусь|спрятаться|скрыть',fr:'cacher|cachette',de:'verstecken|verbergen',it:'nascondere|nascondermi',zh:'躲藏|隐藏'}},
 {id:'voice',kind:'echo',weight:20,focus:13,terms:{pt:'chamar|chamado|sua voz|me chama',en:'call|calling|your voice|his voice|hear you',es:'llamar|me llama|tu voz|su voz',ja:'呼ぶ|呼んで|声',ko:'부르|불러|목소리',ru:'зовёт|зовет|зову|голос|зов',fr:'appeler|ta voix|sa voix',de:'rufen|stimme',it:'chiamare|voce',zh:'呼唤|声音'}},
 {id:'escape',kind:'corridor',weight:24,focus:15,terms:{pt:'fugir|fujo|fugindo|correr|corro|corre|correndo|escapar|escapando',en:'run|runs|running|ran|escape|escapes|escaped|escaping|flee',es:'huir|huyo|huyendo|correr|corro|corriendo|escapar|escapando',ja:'逃げる|逃げ|走る|走り',ko:'도망|달리|달려|도피',ru:'бежать|бегу|бежал|убежать|убегаю|сбежать',fr:'fuir|courir|échapper',de:'fliehen|laufen|weglaufen',it:'fuggire|scappare|correre',zh:'逃跑|逃离|奔跑'}},
 {id:'scale',kind:'orbit',weight:22,focus:10,terms:{pt:'pequeno|perdido|vejo o céu|universo',en:'small|tiny|lost|universe|look at the sky',es:'pequeño|perdido|universo|veo el cielo',ja:'小さい|小さな|迷子|宇宙',ko:'작은|작아|길을 잃|우주',ru:'маленький|потерян|вселенная|смотрю на небо',fr:'petit|perdu|univers',de:'klein|verloren|universum',it:'piccolo|perduto|universo',zh:'渺小|迷失|宇宙'}},
 {id:'soul',kind:'soul',weight:16,focus:11,terms:{pt:'alma|interior',en:'soul|inner self',es:'alma|interior',ja:'魂|内面',ko:'영혼|내면',ru:'душа|душу|душе',fr:'âme|intérieur',de:'seele|inneres',it:'anima|interiore',zh:'灵魂|内心'}},
 {id:'emotion',kind:'terminal',weight:17,focus:12,terms:{pt:'vontade|emoções|emoção',en:'my will|emotion|emotions|feelings',es:'voluntad|emociones|emoción',ja:'意志|感情',ko:'의지|감정',ru:'воля|волю|эмоции|чувства',fr:'volonté|émotions',de:'wille|gefühle',it:'volontà|emozioni',zh:'意志|情绪'}},
 {id:'heart',kind:'heart',weight:15,focus:13,terms:{pt:'coração|corações',en:'heart|hearts',es:'corazón|corazones',ja:'心|心臓',ko:'마음|심장',ru:'сердце|сердца|сердцах',fr:'cœur|coeur',de:'herz|herzen',it:'cuore|cuori',zh:'心脏|心中'}},
 {id:'sight',kind:'heart',weight:14,focus:16,terms:{pt:'vê|veem|ver',en:'see|sees|seen|watching',es:'ve|ven|ver',ja:'見る|見える|見て',ko:'보는|본다|보여',ru:'видит|вижу|видеть',fr:'voit|voir',de:'sieht|sehen',it:'vede|vedere',zh:'看见|看到'}},
 {id:'stars',kind:'constellation',weight:15,focus:9,terms:{pt:'estrelas|estrela|constelações|constelação',en:'star|stars|constellation|constellations',es:'estrella|estrellas|constelación|constelaciones',ja:'星座|星',ko:'별자리|별',ru:'звёзды|звезды|звезда|созвездие|созвездия',fr:'étoiles|étoile|constellation',de:'sterne|stern|sternbild',it:'stelle|stella|costellazioni',zh:'星星|星座'}},
 {id:'mirror',kind:'mirror',weight:25,focus:14,terms:{pt:'espelho|reflexo|quem sou',en:'mirror|reflection|who am i',es:'espejo|reflejo|quién soy',ja:'鏡|映る|私は誰',ko:'거울|반사|나는 누구',ru:'зеркало|отражение|кто я',fr:'miroir|reflet',de:'spiegel|spiegelbild',it:'specchio|riflesso',zh:'镜子|倒影|我是谁'}},
 {id:'storm',kind:'storm',weight:25,focus:14,terms:{pt:'tempestade|trovão|chuva|raiva',en:'storm|thunder|rain|anger',es:'tormenta|trueno|lluvia|rabia',ja:'嵐|雷|雨|怒り',ko:'폭풍|천둥|비가|분노',ru:'буря|гроза|дождь|гнев',fr:'tempête|tonnerre|pluie',de:'sturm|donner|regen',it:'tempesta|tuono|pioggia',zh:'风暴|雷声|下雨|愤怒'}},
 {id:'time',kind:'clock',weight:24,focus:12,terms:{pt:'tempo|relógio|segundos|esperar',en:'time|clock|seconds|waiting',es:'tiempo|reloj|segundos|esperar',ja:'時間|時計|待つ',ko:'시간|시계|기다리',ru:'время|часы|секунды|ждать',fr:'temps|horloge|attendre',de:'zeit|uhr|warten',it:'tempo|orologio|aspettare',zh:'时间|时钟|等待'}}
];
export interface SemanticHit{concept:string;kind:SceneKind;language:Exclude<Language,'auto'>;phrase:string;start:number;end:number;score:number;focus:number;}
function matches(text:string,term:string,lang:string){
 const normalized=lexical(text),needle=lexical(term),hits:{start:number;end:number}[]=[];
 let from=0,index=normalized.indexOf(needle,from);
 while(index>=0){const end=index+needle.length,before=normalized[index-1]??'',after=normalized[end]??'';
  const loose=lang==='ja'||lang==='zh',prefix=lang==='ko';
  if(loose||(!/[\p{L}\p{N}]/u.test(before)&&(prefix||!/[\p{L}\p{N}]/u.test(after))))hits.push({start:index,end});
  from=end;index=normalized.indexOf(needle,from);
 }return hits;
}
export function analyzeMeaning(text:string,language:Language='auto'){
 const hits:SemanticHit[]=[];
 for(const c of concepts)for(const[lang,terms]of Object.entries(c.terms)){
  if(language!=='auto'&&language!==lang)continue;
  for(const term of terms!.split('|'))for(const at of matches(text,term,lang))hits.push({concept:c.id,kind:c.kind,language:lang as SemanticHit['language'],phrase:text.slice(at.start,at.end),...at,score:c.weight+Math.min(4,term.split(/\s+/).length-1),focus:c.focus});
 }
 const key=lexical(text).replace(/[^\p{L}\p{N}]/gu,'');
 const negatives=['nao','no','non','nein','нет','いいえ','아니','아니요','不'];
 if(negatives.includes(key))hits.push({concept:'refusal',kind:'denial',language:language==='auto'?'pt':language,phrase:text,start:0,end:text.length,score:100,focus:20});
 hits.sort((a,b)=>b.score-a.score||a.start-b.start);
 const votes=new Map<string,number>();for(const h of hits)votes.set(h.language,(votes.get(h.language)??0)+h.score);
 const detected=language!=='auto'?language:scriptLanguage(text)!=='auto'?scriptLanguage(text):[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0]??'auto';
 return{language:detected as Language,hits,kind:hits[0]?.kind};
}
export function wordEmphasis(text:string,language:Language='auto'){
 const a=analyzeMeaning(text,language);return Math.max(0,...a.hits.map(h=>h.focus));
}
