import {registerRoot, Composition, AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import React from 'react';
const Test = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background:'#FDF6EC',justifyContent:'center',alignItems:'center'}}>
    <div style={{fontFamily:'sans-serif',fontWeight:800,fontSize:120,color:'#1A1A1A',opacity:interpolate(f,[0,30],[0,1])}}>hola</div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="Test" component={Test} durationInFrames={60} fps={30} width={1080} height={1920}/>;
registerRoot(Root);
