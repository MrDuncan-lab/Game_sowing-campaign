import { render } from 'preact';
import { App } from './ui/App';
import favicon from './assets/favicon.png';
import './fonts.css';
import './legacy.css';
import './styles.css';
import './field-life.css';
import './style-polish.css';
import './theme.css';
import './animation-polish.css';
import './tutorial.css';
import './responsive-field.css';
import './style-pass.css';
import './card-polish.css';
import './lab-polish.css';
import './tutorial-polish.css';
import './event-sync.css';
import './collisions.css';
import './sky-field.css';
import './calm.css';
import './village.css';
import './contrast.css';
// the field's motion language goes last: it owns growth, wind, the troubles in three acts and the animals' breath
import './motion.css';

// favicon is set from code so the single-file build keeps it inlined
if (!document.querySelector('link[rel="icon"]')) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = favicon;
  document.head.appendChild(link);
}

render(<App />, document.getElementById('app')!);
