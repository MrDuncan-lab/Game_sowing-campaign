// QA fixtures for the lesson (bean, water, hail and place steps): npx tsx tools/learning-fixtures.ts
import {writeFileSync} from 'node:fs';
import {applyTutorial,createTutorial,tutorialNext,type TutorialSession} from '../src/engine/tutorial';
import {lessonAction} from '../tests/lesson-walk';
const keep:Record<string,TutorialSession>={};
let t=createTutorial(),guard=0;
while(t.step!=='practice'&&guard++<120){
 if(['bean','water','hail','place'].includes(t.step)&&!keep[t.step])keep[t.step]=JSON.parse(JSON.stringify(t));
 const a=lessonAction(t,{waterCard:true,shelterCard:true});
 t=a==='next'?tutorialNext(t):applyTutorial(t,a);
}
writeFileSync(new URL('../../qa/tutorial-fixtures.json',import.meta.url),JSON.stringify(keep));
