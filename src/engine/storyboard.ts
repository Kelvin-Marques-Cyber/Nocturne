// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import type {Project,Scene,SceneKind,Action,Word,Analysis,Motion} from './model';
import {styles,normalize} from './model';
export const metaphors:Record<SceneKind,{label:string;intent:string;code:string;action:Action;accent:string}>= {
 constellation:{label:'Mapa do invisível',intent:'As estrelas se conectam ao pequeno coração; a escala do céu revela a fragilidade humana.',code:'const céu = conectar(estrelas);',action:'reach',accent:'CONSTELAÇÕES'},
 heart:{label:'O que está dentro',intent:'O peito vira uma janela de código e o coração permanece visível mesmo atrás do corpo.',code:'Deus.vê(coração);',action:'hold',accent:'CORAÇÕES'},
 corridor:{label:'A fuga dobra o espaço',intent:'O corpo corre, mas o corredor retorna ao ponto de partida; as palavras fecham a saída.',code:'while (eu.fujo()) mundo.voltar();',action:'run',accent:'FUGIR'},
 choice:{label:'Duas direções',intent:'O corpo antecipa dois passos incompatíveis; uma interface espera por uma decisão.',code:'if (correr) return ficar;',action:'hesitate',accent:'EU NÃO SEI'},
 echo:{label:'A chamada',intent:'Ondas tipográficas alcançam o personagem e puxam sua atenção de volta à origem.',code:'await voz.chamar(eu);',action:'surprise',accent:'CHAMAR'},
 hide:{label:'Esconder o visível',intent:'O personagem arrasta uma tarja sobre si; o coração atravessa a máscara.',code:'alma.ocultar() // impossível',action:'drag',accent:'ESCONDER'},
 soul:{label:'Transparência',intent:'As camadas de uma interface abrem o peito; aquilo que era íntimo se torna constelação.',code:'const alma = revelar(interior);',action:'kneel',accent:'ALMA'},
 fall:{label:'Queda e retorno',intent:'O chão cede em uma queda articulada, seguido da preparação corporal para levantar e caminhar.',code:'try { cair(); } finally { levantar(); }',action:'fall',accent:'LEVANTO'},
 denial:{label:'A palavra pesa',intent:'Cada NÃO se materializa em um bloco e comprime o espaço; o corpo tenta sustentá-lo.',code:'não !== ausência;',action:'push',accent:'NÃO'},
 orbit:{label:'A pequena órbita',intent:'A câmera se afasta de uma pessoa mínima enquanto os astros descrevem uma órbita ao seu redor.',code:'eu.escala = 1 / universo;',action:'idle',accent:'TÃO PEQUENO'},
 rest:{label:'Soltar o controle',intent:'Os controles se desprendem; o personagem senta e a tensão vermelha se converte em uma linha estável.',code:'release(controle); await descansar();',action:'rest',accent:'DESCANSAR'},
 terminal:{label:'Permissão para sentir',intent:'A emoção aparece como um processo; o gesto do personagem afeta o cursor e o andamento da interface.',code:'vontade > emoções;',action:'hold',accent:'VONTADE'},
 ocean:{label:'Abaixo da superfície',intent:'A linha de base vira água e leva o personagem para um espaço profundo; as palavras ganham flutuação.',code:'alma.profundidade += silêncio;',action:'reach',accent:'PROFUNDO'},
 door:{label:'O limiar',intent:'Uma porta de código recusa a passagem e o personagem reage fisicamente ao limite.',code:'access.request(coração);',action:'push',accent:'ENTRAR'},
 lift:{label:'O peso muda',intent:'Uma palavra é erguida com antecipação e esforço antes de se desprender do chão.',code:'força = esperança + movimento;',action:'hold',accent:'LEVANTAR'},
 television:{label:'Canal interior',intent:'Uma televisão CRT em uma sala 3D tenta sintonizar a voz; a letra habita a tela, atravessando o chiado.',code:'tv.sintonizar(interior);',action:'hesitate',accent:'SINAL'},
 tunnel3d:{label:'Profundidade sem saída',intent:'O personagem corre por um corredor tridimensional; os mesmos versos o esperam em todos os planos de profundidade.',code:'while (fugir) espaço.repetir();',action:'run',accent:'SEM SAÍDA'}
};
export function chooseMetaphor(text:string,index=0):SceneKind {
 const s=text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 if(/descans|controlar|nao preciso|rest|peace/.test(s))return'rest';
 if(/afund|oceano|agua|drown|sink/.test(s))return'ocean';
 if(/entrar|permiss|porta|denied|enter/.test(s))return'door';
 if(/eu caio|levanto|tropec|fall|rise/.test(s))return'fall';
 if(/mesmo quando|nao quero|nao posso$|deny|recuso/.test(s))return'denial';
 if(/nao sei|devo correr|devo ficar|choose/.test(s))return'choice';
 if(/conhece a alma/.test(s))return'soul';
 if(/esconder|ocultar|hide/.test(s))return'hide';
 if(/chamar|sua voz|chamado|call/.test(s))return'echo';
 if(/fugir|fujo|correr|escape|run/.test(s))return'corridor';
 if(/pequeno|perdido|vejo o ceu|small|universe/.test(s))return'orbit';
 if(/alma|ninguem ve|dentro de mim|soul/.test(s))return'soul';
 if(/vontade|emoc|will|emotion/.test(s))return'terminal';
 if(/corac|heart/.test(s))return'heart';
 if(/estrel|constel|star/.test(s))return'constellation';
 if(/mentir|negar|lies/.test(s))return'denial';
 return (['echo','orbit','lift','soul']as SceneKind[])[index%4];
}
function motions(kind:SceneKind,start:number,end:number):Motion[]{
 const d=end-start,base=metaphors[kind].action;
 if(kind==='fall')return[{action:'stumble',start,end:start+d*.18},{action:'fall',start:start+d*.18,end:start+d*.39},{action:'crawl',start:start+d*.39,end:start+d*.56},{action:'rise',start:start+d*.56,end:start+d*.83},{action:'walk',start:start+d*.83,end}];
 if(kind==='corridor')return[{action:'hesitate',start,end:start+Math.min(.7,d*.14)},{action:'run',start:start+Math.min(.7,d*.14),end:end-Math.min(.8,d*.12)},{action:'fear',start:end-Math.min(.8,d*.12),end}];
 if(kind==='hide')return[{action:'fear',start,end:start+d*.18},{action:'drag',start:start+d*.18,end:start+d*.75},{action:'surprise',start:start+d*.75,end}];
 if(kind==='rest')return[{action:'kneel',start,end:start+d*.3},{action:'rest',start:start+d*.3,end}];
 return[{action:base,start,end}];
}
export function createStoryboard(lyrics:string,words:Word[],a:Analysis):Scene[]{
 const stanzas=lyrics.split(/\n\s*\n/).filter(s=>s.trim());let cursor=0;
 const groups=stanzas.map((text,i)=>{const count=text.trim().split(/\s+/).length,ws=words.slice(cursor,cursor+count);cursor+=count;return{text,ws,i};});
 if(!groups.length)groups.push({text:'',ws:[],i:0});
 const motifs=new Map<SceneKind,number>();
 const boundaries=[0];
 for(let i=1;i<groups.length;i++){
  const ws=groups[i].ws,prev=groups[i-1].ws,first=ws[0]?.start??a.duration*i/groups.length;
  const gap=first-(prev.at(-1)?.end??first),raw=first-Math.min(.4,Math.max(.04,gap*.45));
  const beat=a.beats.filter(b=>Math.abs(b-raw)<.13).sort((x,y)=>Math.abs(x-raw)-Math.abs(y-raw))[0];
  boundaries.push(Math.max(boundaries.at(-1)!+.05,Math.min(a.duration-.05*(groups.length-i),beat??raw)));
 }
 boundaries.push(a.duration);
 const scenes=groups.map(({text,ws,i})=>{
  let kind=chooseMetaphor(text,i);const repeat=motifs.get(kind)??0;motifs.set(kind,repeat+1);
  // Refrains evolve from a sky to a connected heart to an encompassing orbit.
  if(kind==='heart'&&/estrel|constel/i.test(text))kind=repeat%3===0?'constellation':repeat%3===1?'heart':'orbit';
  const m={...metaphors[kind]},start=boundaries[i],end=boundaries[i+1];
  if(/^eu sei[.\s…]*$/i.test(text.trim())){kind='terminal';Object.assign(m,{label:'Reconhecimento',intent:'Depois da terceira recusa, o corpo se levanta e aceita aquilo que já sabia.',code:'eu.sei = true;',accent:'EU SEI',action:'rise'});}
  const roll=kind==='corridor'?-3.5:kind==='denial'?2:0;
  const accents=ws.filter(w=>/^(não|fugir|caio|levanto|vê|corações|esconder|descansar)[.!?,…]*$/i.test(w.text));
  const events=accents.map(w=>({at:w.start,duration:.28,type:kind==='rest'?'word':'impact',strength:.5+(w.text.toLowerCase().includes('não')?.35:0),wordId:w.id}))as Scene['events'];
  for(const t of a.impacts.filter(t=>t>=start&&t<end).filter((t,k,all)=>k===0||t-all[k-1]>.6))events.push({at:t,duration:.14,type:'glitch',strength:.32});
  const silence=a.silences.find(s=>s.start>start+.5&&s.end<end);if(silence)events.push({at:silence.start,duration:Math.min(.5,silence.end-silence.start),type:'freeze',strength:1});
  const shot:Scene={id:`s${i}`,start,end,kind,title:m.label,intent:m.intent,code:m.code,wordIds:ws.map(w=>w.id),accent:m.accent,variant:repeat,camera:{zoomFrom:kind==='orbit'?1.12:1,zoomTo:kind==='orbit'?.86:kind==='heart'?1.1:1.04,panX:kind==='corridor'?-32:repeat%2?12:-12,panY:0,roll,shake:kind==='rest'?.1:.45},motions:motions(kind,start,end),events,transition:i===0?'dissolve':kind==='denial'||kind==='corridor'?'shutter':kind==='rest'?'dissolve':repeat%2?'ink':'cut'};
  if(m.accent==='EU SEI')shot.motions=[{action:'rise',start,end}];
  if(i===groups.length-1&&kind==='heart'){shot.title='Conhecido por inteiro';shot.intent='O coração continua visível, mas o corpo agora descansa; o último acorde encontra o espaço aberto.';shot.motions=[{action:'rest',start,end}];shot.camera.zoomTo=.97;shot.camera.shake=.05;shot.code='coração.emPaz = true;';}
  return shot;
 });
 // Variable shot lengths follow phrases. A sustained wide shot alternates with
 // short physical beats, CRT cutaways and perspective shots, rather than a fixed template interval.
 const directed:Scene[]=[];
 for(const [i,s]of scenes.entries()){
  const ws=words.filter(w=>s.wordIds.includes(w.id)),d=s.end-s.start;
  const switchAt=(line:number)=>{const first=ws.find(w=>w.line===line);return first?Math.max(s.start+.65,Math.min(s.end-.7,first.start-.12)):undefined;};
  const lines=[...new Set(ws.map(w=>w.line))];
  const hasVoice=['terminal','echo'].includes(s.kind),refrainCutaway=i<scenes.length-2&&['heart','constellation','orbit'].includes(s.kind)&&s.variant%2===1;
  const split=(hasVoice||refrainCutaway)&&d>5.5?switchAt(lines[Math.floor(lines.length/2)]):undefined;
  if(split&&split>s.start+.6&&split<s.end-.6){
   const firstWords=ws.filter(w=>w.start<split),lastWords=ws.filter(w=>w.start>=split);
   const tvFirst=s.kind==='terminal';
   const first:Scene={...s,end:split,wordIds:firstWords.map(w=>w.id),motions:motions(tvFirst?'television':s.kind,s.start,split),events:s.events.filter(e=>e.at<split)};
   if(tvFirst)Object.assign(first,{kind:'television',title:'Canal interior',intent:metaphors.television.intent,transition:'channel',camera:{...s.camera,zoomFrom:1.05,zoomTo:1,roll:0}});
   const second:Scene={...s,start:split,wordIds:lastWords.map(w=>w.id),motions:motions(tvFirst?s.kind:'television',split,s.end),events:s.events.filter(e=>e.at>=split),transition:tvFirst?'whip':'channel'};
   if(!tvFirst)Object.assign(second,{kind:'television',title:'Canal interior',intent:metaphors.television.intent,camera:{...s.camera,zoomFrom:1,zoomTo:1.09,roll:0}});
   directed.push(first,second);
  }else if(s.kind==='corridor'&&d>5){
   const mid=s.start+d*.55;directed.push({...s,end:mid,motions:motions('corridor',s.start,mid),events:s.events.filter(e=>e.at<mid)},{...s,start:mid,kind:'tunnel3d',title:metaphors.tunnel3d.label,intent:metaphors.tunnel3d.intent,transition:'zoom',motions:motions('tunnel3d',mid,s.end),events:s.events.filter(e=>e.at>=mid)});
  }else if(s.kind==='denial'&&/mesmo quando/i.test(ws.map(w=>w.text).join(' '))){
   const no=ws.find(w=>/^não/i.test(w.text.replace(/[“”"!]/g,''))),hit=no?Math.max(s.start+.6,Math.min(s.end-.5,no.start-.05)):s.start+d*.68;
   directed.push({...s,end:hit,kind:i%2?'television':'terminal',title:'Antes da recusa',transition:i%2?'channel':'cut',motions:[{action:'hesitate',start:s.start,end:hit}],events:s.events.filter(e=>e.at<hit)},{...s,start:hit,camera:{...s.camera,zoomFrom:1.08+i%3*.06,zoomTo:1.23,roll:Math.sin(i)*4},transition:'burn',motions:motions('denial',hit,s.end),events:s.events.filter(e=>e.at>=hit)});
  }else directed.push(s);
 }
 return directed.map((s,i)=>({...s,id:`s${i}`,transition:i===0?'dissolve':s.transition==='cut'?(['cut','whip','iris','zoom']as Scene['transition'][])[i%4]:s.transition}));
}
export function makeProject(input:{title:string;artist?:string;audio:string;lyrics:string;analysis:Analysis;words:Word[];alignment:Project['alignment']}):Project {
 return{schemaVersion:1,id:'project-'+Date.now().toString(36),title:input.title,artist:input.artist??'Kelvin',seed:4271,duration:input.analysis.duration,audio:input.audio,lyrics:input.lyrics,fps:30,format:'vertical',analysis:input.analysis,words:input.words,scenes:createStoryboard(input.lyrics,input.words,input.analysis),character:{name:'Testemunha',stroke:'#e9e5dc',thickness:2.7,scale:1,head:1,heart:true},style:{...styles['terminal-noir']},alignment:input.alignment};
}
