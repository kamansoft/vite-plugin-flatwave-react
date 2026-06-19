import { startRenderLoop } from '@kamansoft/vite-plugin-flatwave-react/render-loop';
import { App } from './App';
import './styles.css';

startRenderLoop({
  root: document.getElementById('root')!,
  App,
});
