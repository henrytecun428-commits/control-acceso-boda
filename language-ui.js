import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const code = new URLSearchParams(location.search).get('code');
const $ = (s) => document.querySelector(s);
const set = (s, v) => { const e = $(s); if (e && v != null) e.textContent = v; };

async function initLanguage(){
  if(!code) return;
  const { data, error } = await supabase.rpc('get_public_invitation',{p_code:code});
  const i = Array.isArray(data) ? data[0] : data;
  if(error || !i || i.language !== 'en') return;
  document.documentElement.lang='en';
  document.title='Your invitation · Wedding';
  const nav=['Home','RSVP','Schedule','Registry','Story','Travel','FAQ','Photos','Pass'];
  document.querySelectorAll('[data-go-page]').forEach((b,idx)=>{ if(nav[idx]) b.textContent=nav[idx]; });
  const next=['Discover','View the schedule','View registry','Read our story','How to get there','Frequently asked questions','View photos','Your digital pass'];
  document.querySelectorAll('[data-next-page]').forEach((b,idx)=>{ if(next[idx]) b.innerHTML=`${next[idx]} <span>→</span>`; });
  const m={
    '#hero-eyebrow':'A SPECIAL INVITATION','#home-subtitle':'We are so happy to share this special moment with you.',
    '#rsvp-eyebrow':'YOUR PLACE IS RESERVED','#rsvp-title':'We would love to celebrate with you.','#rsvp-text':'Please confirm how many guests will attend.','#rsvp-prompt':'How many people will be joining us?','#confirm':i.rsvp_confirm_label||"Yes, we'll be there",'#decline':i.rsvp_decline_label||"We won't be able to attend",
    '#event-eyebrow':'THE BIG DAY','#event-title':'This is the moment.','#event-intro':'Arrive with plenty of time and enjoy every moment with us.','#reception-title':'Reception','#reception-description':'We will welcome you with joy as the celebration begins.','#ceremony-title':'Ceremony','#ceremony-description':'The moment that officially begins our next chapter.','#dress-eyebrow':'DRESS CODE','#dress-description':'Come comfortable, elegant and ready to celebrate.',
    '#gift-eyebrow':'REGISTRY','#gift-title':'A gift, if you wish.','#gift-link':'View registry',
    '#story-eyebrow':'OUR STORY','#story-title':'A new chapter is about to begin.','#story-text':'Through glances, conversations, laughter and memories, we have arrived here. Now we want to celebrate what comes next surrounded by the people who make our story special.','#story-signature':'with love, always ✦',
    '#location-eyebrow':'FIND US HERE','#travel-text':'Everything you need to arrive and enjoy the day with ease.','#maps-link':'Google Maps','#waze-link':'Waze',
    '#faq-eyebrow':'FREQUENTLY ASKED QUESTIONS','#faq-title':'Everything you need to know.','#faq-q1':'Is parking available?','#faq-q2':'Can I bring children?','#faq-q3':'Where can I find my access code?','#faq-a3':'Your code and QR are available in your digital pass.',
    '#gallery-eyebrow':'MOMENTS','#gallery-title':'Photos that tell our story.','#gallery-description':'A space for our favorite images.',
    '#access-eyebrow':'YOUR DIGITAL PASS','#access-title':'You’re all set. This is your access.','#access-description':'Save this screen. Your code and QR are linked to this invitation.','#view-pass-2':'Open full pass','#print-pass':'Save / print pass',
    '#final-eyebrow':'THANK YOU FOR BEING PART OF IT','#final-title':'See you there.','#final-description':'Your presence will make this memory even more special.'
  };
  Object.entries(m).forEach(([s,v])=>set(s,v));
  document.querySelectorAll('.guest-line').forEach(e=>{e.firstChild.textContent='Prepared with love for ';});
  const reserved=$('#rsvp .rsvp-box > p:not(.label):not(#rsvp-message)'); if(reserved) reserved.innerHTML=`We have reserved <strong id="total-guests">${i.total_guests}</strong> places for you.`;
  const success=$('.rsvp-confirmed-badge'); if(success) success.textContent='✓ Attendance confirmed';
  const passK=$('.pass-kicker'); if(passK) passK.textContent='DIGITAL PASS · WEDDING';
  const passT=$('.pass-title'); if(passT) passT.textContent='Access confirmed';
  const passS=$('.pass-subtitle'); if(passS) passS.textContent='Present this screen upon arrival';
  const passLbl=$('.pass-code-label'); if(passLbl) passLbl.textContent='Access code';
  const passNote=$('.pass-note'); if(passNote) passNote.textContent='Your code is unique and connected to your invitation.';
  const back=$('#pass-close-2'); if(back) back.textContent='Back';
  const save=$('#pass-print'); if(save) save.textContent='Save / print';
}
initLanguage();
