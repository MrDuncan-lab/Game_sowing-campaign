import { render } from 'preact';
import { App } from './ui/App';
import favicon from './assets/favicon.png';
import { initTelegram } from './ui/telegram';
import { UpdateBanner } from './ui/UpdateBanner';
import { BUILD_ID } from './ui/autoUpdate';
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
import './main-screen.css';
// progression v3: the shed, the fair, help on a building site, trees on the field
import './progression.css';
// the training farm's locks, openings and goal counter sit on top of every section's look
import './lesson-locks.css';
// the year's ordeal and the fire pits
import './trials.css';

initTelegram();
document.documentElement.dataset.build = BUILD_ID;

// favicon is set from code so the single-file build keeps it inlined
if (!document.querySelector('link[rel="icon"]')) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = favicon;
  document.head.appendChild(link);
}

render(<App />, document.getElementById('app')!);
// the update offer lives outside the game tree: it works on every screen, the save-lock screen included
const updateRoot = document.createElement('div');
document.body.appendChild(updateRoot);
render(<UpdateBanner />, updateRoot);
