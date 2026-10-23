import { Btn } from './common';
import cover from '../assets/cover.webp';
import { PORTRAIT_IMAGES } from '../art/portraits';
// The title page: Палыч invites the player to the training farm; one can also go straight to the map.
export function Intro({onDone}:{onDone:(guide:boolean)=>void}) {
  return <div class="intro atlas"><img src={cover} alt="" class="intro-cover"/>
    <div class="atlas-title"><small class="atlas-kicker">атлас хозяйств</small><h1>Посевная</h1></div>
    <div class="intro-card">
      <div class="intro-palych"><span class="ip-face"><img src={PORTRAIT_IMAGES.palych} alt=""/></span><p>«Здравствуйте! Я Палыч, здешний старожил. Покажу на учебной ферме, как сажать, поливать, продавать и расти. Минут пятнадцать — и хозяйство ваше.»</p></div>
      <ol class="intro-plan" aria-label="Что будет в обучении"><li><b>Глава I</b><span>посадка, вода, защита, продажа, заказ</span></li><li><b>Глава II</b><span>селекция, помощник, улучшения, постройки</span></li></ol>
      <div class="btn-row"><Btn tone="primary" onClick={()=>onDone(true)}>Учиться у Палыча</Btn><Btn tone="ghost" onClick={()=>onDone(false)}>Сразу к карте ферм</Btn></div>
      <small class="intro-later">Обучение можно пройти позже — с карты ферм.</small>
    </div></div>;
}
