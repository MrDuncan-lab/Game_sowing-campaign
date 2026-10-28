// Every tutorial step as a stored session, for screenshots: npx tsx tools/tutorial-steps.ts <out.json>
// A careful player's actions (the same policy as tests/tutorial.test.ts): free time waters what is dry.
import {writeFileSync} from 'node:fs';
import {applyTutorial,createTutorial,tutorialNext,type TutorialSession} from '../src/engine/tutorial';
import {lessonAction} from '../tests/lesson-walk';
const out:Record<string,TutorialSession>={};
let t=createTutorial(),guard=0;
while(t.step!=='done'&&guard++<120){
 if(!out[t.step])out[t.step]=JSON.parse(JSON.stringify(t));
 const a=lessonAction(t,{waterCard:true,shelterCard:true});
 t=a==='next'?tutorialNext(t):applyTutorial(t,a);
}
out.done=t;
writeFileSync(process.argv[2],JSON.stringify(out));
console.log(Object.keys(out).join(' '));
