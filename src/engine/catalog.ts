// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
// Recipes are parameterized primitives, not millions of hand-authored clips.
export const cameraFamilies=[
 {id:'dolly',label:'Aproximação',yaw:.055,pitch:.025,roll:0,x:0,y:0,depth:.08},
 {id:'orbit',label:'Órbita da frase',yaw:.24,pitch:.045,roll:.018,x:.012,y:0,depth:.04},
 {id:'tilt',label:'Inclinação vertical',yaw:.04,pitch:.2,roll:0,x:0,y:.012,depth:.035},
 {id:'crane',label:'Elevação',yaw:.09,pitch:-.12,roll:.01,x:0,y:-.04,depth:.045},
 {id:'sweep',label:'Travessia lateral',yaw:.15,pitch:.04,roll:-.012,x:.04,y:0,depth:.03},
 {id:'hinge',label:'Dobradiça no espaço',yaw:.3,pitch:.07,roll:.02,x:-.015,y:.005,depth:.02},
 {id:'pendulum',label:'Arco de leitura',yaw:.17,pitch:-.045,roll:.035,x:.015,y:-.01,depth:.025},
 {id:'depth',label:'Passagem de profundidade',yaw:.09,pitch:.08,roll:0,x:0,y:0,depth:.12},
 {id:'recoil',label:'Impacto e recuperação',yaw:-.075,pitch:.055,roll:-.025,x:-.012,y:.01,depth:.09},
 {id:'snap',label:'Entrada de grito',yaw:.06,pitch:-.04,roll:.012,x:0,y:0,depth:.11},
 {id:'rack',label:'Mudança de plano',yaw:-.14,pitch:.09,roll:0,x:.02,y:-.015,depth:.055},
 {id:'float',label:'Suspensão',yaw:.09,pitch:.06,roll:-.02,x:.018,y:-.025,depth:.035},
 {id:'glide',label:'Deslizamento de palco',yaw:-.12,pitch:.035,roll:.012,x:.035,y:-.008,depth:.055},
 {id:'spiral',label:'Espiral contida',yaw:.16,pitch:-.08,roll:.06,x:.012,y:-.018,depth:.07},
 {id:'portrait',label:'Retrato em profundidade',yaw:-.06,pitch:.11,roll:-.015,x:-.015,y:.02,depth:.09},
 {id:'reveal',label:'Revelação lateral',yaw:-.22,pitch:.06,roll:.025,x:-.03,y:0,depth:.045}
] as const;
export const cameraRecipes=cameraFamilies.flatMap(f=>[0,1,2].map(i=>({...f,id:`${f.id}-${i}`,label:`${f.label} · ${i+1}`,yaw:f.yaw*[.75,1,-.9][i],pitch:f.pitch*[1,-.7,1.1][i],roll:f.roll*(i===2?-1:1),depth:f.depth*(.8+i*.15)})));
export const fontFaces=[
 {id:'mono',label:'Mono',file:'DejaVuSansMono.ttf',family:'DejaVu Sans Mono',weight:400,italic:false},
 {id:'mono-bold',label:'Mono bold',file:'DejaVuSansMono-Bold.ttf',family:'DejaVu Sans Mono',weight:700,italic:false},
 {id:'mono-italic',label:'Mono oblíqua',file:'DejaVuSansMono-Oblique.ttf',family:'DejaVu Sans Mono',weight:400,italic:true},
 {id:'sans',label:'Sans bold',file:'DejaVuSans-Bold.ttf',family:'DejaVu Sans',weight:700,italic:false},
 {id:'serif',label:'Serif',file:'DejaVuSerif.ttf',family:'DejaVu Serif',weight:400,italic:false},
 {id:'sans-book',label:'Sans regular',file:'DejaVuSans.ttf',family:'DejaVu Sans',weight:400,italic:false},
 {id:'serif-bold',label:'Serif bold',file:'DejaVuSerif-Bold.ttf',family:'DejaVu Serif',weight:700,italic:false},
 {id:'lm-sans',label:'Humanista',file:'lmsans10-regular.otf',family:'Latin Modern Sans',weight:400,italic:false},
 {id:'lm-sans-bold',label:'Humanista bold',file:'lmsans10-bold.otf',family:'Latin Modern Sans',weight:700,italic:false},
 {id:'lm-roman',label:'Clássica',file:'lmroman10-regular.otf',family:'Latin Modern Roman',weight:400,italic:false},
 {id:'lm-italic',label:'Clássica itálica',file:'lmroman10-italic.otf',family:'Latin Modern Roman',weight:400,italic:true},
 {id:'lm-condensed',label:'Demi condensada',file:'lmsansdemicond10-regular.otf',family:'Latin Modern Sans Demi Cond',weight:600,italic:false},
 {id:'lm-light',label:'Mono leve',file:'lmmonolt10-regular.otf',family:'Latin Modern Mono Light',weight:400,italic:false}
] as const;
const typeTreatments=[{label:'Integral',width:1,tracking:0,outline:false},{label:'Condensada',width:.8,tracking:.015,outline:false},{label:'Aberta',width:1.08,tracking:.085,outline:false},{label:'Contorno',width:1,tracking:.025,outline:true}];
export const typographyRecipes=fontFaces.flatMap(face=>typeTreatments.map((t,i)=>({...t,id:`${face.id}-${i}`,label:`${face.label} · ${t.label}`,face})));
export const gestureKinds=['question','refuse','appeal','explain','protect','listen','resolve','grieve','welcome','release','point','search','offer','remember','shield','doubt','promise','reachout','carry','farewell'] as const;
export type GestureKind=typeof gestureKinds[number];
const gestureLabels:Record<GestureKind,string>={question:'Indagar',refuse:'Recusar',appeal:'Suplicar',explain:'Expressar',protect:'Proteger o peito',listen:'Escutar',resolve:'Decidir',grieve:'Recolher-se',welcome:'Acolher',release:'Soltar',point:'Indicar',search:'Procurar',offer:'Oferecer',remember:'Recordar',shield:'Resguardar',doubt:'Hesitar com as mãos',promise:'Firmar uma promessa',reachout:'Estender a mão',carry:'Carregar o peso',farewell:'Despedir-se'};
export const gestureRecipes=gestureKinds.flatMap(kind=>[.45,.65,.82,1].map((amount,i)=>({id:`${kind}-${i}`,kind,amount,speed:[.7,.9,1.1,1.3][i],label:`${gestureLabels[kind]} · ${['contido','natural','expressivo','intenso'][i]}`})));
export const textureKinds=['monochrome','duotone','contrast','invert','posterize','bloom','chromatic','datamosh','halftone','scanlines','vignette','letterbox','hazard','hud','sepia','cyanotype','thermal','solarize','ink','emboss','softfocus','filmgrain','dust','scratches','grid','lightleak'] as const;
export const textureRecipes=[{id:'clean',label:'Sem textura adicional',type:'contrast' as typeof textureKinds[number],amount:0},...textureKinds.flatMap(type=>[.12,.26,.42].map((amount,i)=>({id:`${type}-${i}`,label:`${type} · ${i+1}`,type,amount})))];
export const rhythmRecipes=[
 {id:'accent',label:'Acento vocal',attack:.11,release:.24,delay:.2},
 {id:'legato',label:'Ligado',attack:.3,release:.4,delay:.3},
 {id:'staccato',label:'Ataque seco',attack:.075,release:.18,delay:.16},
 {id:'swelling',label:'Crescendo',attack:.42,release:.36,delay:.4},
 {id:'suspended',label:'Suspenso',attack:.26,release:.5,delay:.34},
 {id:'breath',label:'Respiração',attack:.35,release:.42,delay:.38},
 {id:'rebound',label:'Resposta curta',attack:.09,release:.32,delay:.22},
 {id:'longtake',label:'Plano prolongado',attack:.48,release:.55,delay:.42}
];
export const beatStyles=['pulse','ripple','rays','bars','diamonds','waveform','brackets','rings'] as const;
export const beatStyleLabels:Record<typeof beatStyles[number],string>={pulse:'Pulso do quadro',ripple:'Ondas',rays:'Raios',bars:'Barras de frequência',diamonds:'Losangos',waveform:'Traço sonoro',brackets:'Cantos de enquadramento',rings:'Anéis concêntricos'};
export interface Performance {enabled:boolean;camera:string;typography:string;gesture:string;texture:string;rhythm:string;intensity:number;variation:number;followLyrics?:boolean;beatSync?:number;beatStyle?:typeof beatStyles[number]}
export const catalogStats={cameras:cameraRecipes.length,typography:typographyRecipes.length,gestures:gestureRecipes.length,textures:textureRecipes.length,rhythms:rhythmRecipes.length,combinations:cameraRecipes.length*typographyRecipes.length*gestureRecipes.length*textureRecipes.length*rhythmRecipes.length};
export function validPerformance(p:Performance){return p&&typeof p.enabled==='boolean'&&(p.followLyrics===undefined||typeof p.followLyrics==='boolean')&&(p.beatSync===undefined||Number.isFinite(p.beatSync)&&p.beatSync>=0&&p.beatSync<=1)&&(p.beatStyle===undefined||beatStyles.includes(p.beatStyle))&&Number.isFinite(p.intensity)&&p.intensity>=0&&p.intensity<=1&&Number.isSafeInteger(p.variation)&&p.variation>=0&&[ [cameraRecipes,p.camera],[typographyRecipes,p.typography],[gestureRecipes,p.gesture],[textureRecipes,p.texture],[rhythmRecipes,p.rhythm] ].every(([list,id])=>(list as {id:string}[]).some(x=>x.id===id));}
