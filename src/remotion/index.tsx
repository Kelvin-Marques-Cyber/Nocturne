// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Kelvin e Silva Marques
import React from 'react';
import {registerRoot,Composition,useCurrentFrame,AbsoluteFill,Audio,staticFile} from 'remotion';
import demo from '../../public/demo.json';
import type {Project} from '../engine/model';
import {dimensions} from '../engine/model';
import {renderFrame} from '../engine/frame';
function Film({project}:{project:Project}){const frame=useCurrentFrame();return <AbsoluteFill><div style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{__html:renderFrame(project,frame)}}/><Audio src={staticFile(project.audio)}/></AbsoluteFill>;}
const Root=()=>{const p=demo as Project;const d=dimensions(p.format);return <Composition id="Nocturne" component={Film} durationInFrames={Math.ceil(p.duration*p.fps)} fps={p.fps} width={d.width} height={d.height} defaultProps={{project:p}} calculateMetadata={({props})=>({durationInFrames:Math.ceil(props.project.duration*props.project.fps),fps:props.project.fps,...dimensions(props.project.format)})}/>;};
registerRoot(Root);
