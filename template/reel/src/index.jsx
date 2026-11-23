import React from 'react';
import {registerRoot, Composition} from 'remotion';
import data from './data.json';
import brand from './brand.json';
import {Reel, FPS, duracionEnFrames} from './Reel.jsx';

// La composición está en Reel.jsx (la comparte la app del editor). Acá solo se registra con los datos del proyecto.
const Root = () => (
  <Composition id="Reel" component={Reel} defaultProps={{data, brand}} durationInFrames={duracionEnFrames(data)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
