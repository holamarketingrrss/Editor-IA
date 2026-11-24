import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/vollkorn/400-italic.css';
import {Puerta} from './App.jsx';
import {Avisos} from './ui.jsx';
import './app.css';

createRoot(document.getElementById('root')).render(<Avisos><Puerta /></Avisos>);
