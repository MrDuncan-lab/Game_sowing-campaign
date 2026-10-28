import {useEffect,useRef,useState} from 'preact/hooks';
import {type Action} from '../engine/game';
import {applyTutorial,createTutorial,normalizeTutorial,restartTutorialStep,tutorialAccepted,tutorialNext,tutorialProblem,TUTORIAL_KEY,type TutorialSession} from '../engine/tutorial';
import {FarmScreen} from './FarmScreen';
import {validFarm,checkSaveSession,writeSessionStorage,type Profile} from './persist';
import {Sheet,Btn} from './common';
function load():TutorialSession {
  // A lesson stored by an older build (version 3, its own key) is not continued: the training farm starts anew.
  try {const v=JSON.parse(localStorage.getItem(TUTORIAL_KEY)||'null');
    if(tutorialAccepted(v,validFarm)){
      // v3 · a lesson saved before the materials keeps going: no sprouting trees, logs for the drip-line lesson
      for(const f of [v.farm,v.checkpoint?.farm])if(f){f.quiet=true;f.mats={logs:0,bricks:0,glass:0,...f.mats};if((f.levels.irrigation??0)<2)f.mats.logs=Math.max(f.mats.logs,6);}
      return normalizeTutorial(v);
    }
  }catch{}return createTutorial();
}
export function Tutorial({profile,onExit}:{profile:Profile;onExit:()=>void}) {
  const [session,setSession]=useState(load),ref=useRef(session),[error,setError]=useState<string|null>(null),[reset,setReset]=useState(0);
  const [fast,setFast]=useState(profile.settings.fast);ref.current=session;
  const [confirmReset,setConfirmReset]=useState(false);
  function save(n:TutorialSession){
    if(!writeSessionStorage(TUTORIAL_KEY,JSON.stringify(n))){setError('Не удалось сохранить обучение: запись недоступна или закончилось место. Освободите место и повторите действие.');return false;}
    ref.current=n;setSession(n);return true;
  }
  useEffect(()=>{save(ref.current);},[]);
  useEffect(()=>{if(error){const t=setTimeout(()=>setError(null),4000);return()=>clearTimeout(t);}},[error]);
  const dispatch=(a:Action)=>{if(!checkSaveSession())return null;try{const n=applyTutorial(ref.current,a);if(!save(n))return null;setError(null);return n.farm;}catch(e){setError(e instanceof Error?e.message:String(e));return null;}};
  const restart=()=>{if(save(restartTutorialStep(ref.current))){setError(null);setReset(n=>n+1);}};
  return <><FarmScreen key={reset} s={session.farm} profile={profile} dispatch={dispatch} fast={fast} onFast={()=>setFast(v=>!v)} onMap={onExit} onRestart={restart} error={error}
    tutorial={{session,error,precheck:a=>tutorialProblem(ref.current,a),onHideHint:hidden=>{save({...ref.current,hiddenHintStep:hidden?ref.current.step:undefined});},onNext:()=>{save(tutorialNext(ref.current));},onExit,onRetry:restart,onReset:()=>setConfirmReset(true)}}/>
    {confirmReset&&<Sheet title="Начать обучение заново?" icon="journal" variant="info" onClose={()=>setConfirmReset(false)} footer={<div class="btn-row"><Btn onClick={()=>setConfirmReset(false)}>Продолжить обучение</Btn><Btn tone="danger" onClick={()=>{if(save(createTutorial())){setError(null);setConfirmReset(false);setReset(n=>n+1);}}}>Начать с первой недели</Btn></div>}>
      <p>Пройденные учебные задания будут сброшены. Обычные фермы сохранятся.</p>
    </Sheet>}
  </>;
}
