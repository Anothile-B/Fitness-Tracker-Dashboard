// STORAGE keys
const KEY_WORKOUTS = 'ft_workouts_v2';
const KEY_PROFILE = 'ft_profile_v2';
const KEY_DARK = 'ft_dark_v2';
const KEY_BADGES = 'ft_badges_neon';

// STATE
let workouts = JSON.parse(localStorage.getItem(KEY_WORKOUTS) || '[]');
let profile = JSON.parse(localStorage.getItem(KEY_PROFILE) || '{}');
let badges = JSON.parse(localStorage.getItem(KEY_BADGES) || '{}');
let chartInstance = null;
let streakChartInstance = null;

// MET-like values
const MET = { cardio: 8, strength: 6, flexibility: 3, balance: 2 };

// ---- UI ELEMENT SHORTCUTS
const avatarPlaceholder = document.getElementById('avatarPlaceholder');
const genderModal = document.getElementById('genderModal');

// ------------- GENDER MODAL ----------------
document.querySelectorAll('.gender-option').forEach(opt => {
  opt.addEventListener('click', () => {
    // mark selection visually
    document.querySelectorAll('.gender-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');

    profile.gender = opt.dataset.gender;
    // set default avatar based on gender
    profile.avatar = profile.gender === 'female' ? 'images/female-avatar.png' : 'images/male-avatar.png';
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
    renderProfile();
    hideGenderModal();
  });
});

document.getElementById('genderSkip')?.addEventListener('click', () => {
  hideGenderModal();
});

function showGenderModal(){ genderModal.classList.add('show'); }
function hideGenderModal(){ genderModal.classList.remove('show'); }

// ------------- PROFILE ----------------
function saveProfileToStorage(){ localStorage.setItem(KEY_PROFILE, JSON.stringify(profile)); }

function renderProfile(){
  document.getElementById('username').value = profile.name || '';
  document.getElementById('age').value = profile.age || '';
  document.getElementById('weight').value = profile.weight || '';
  document.getElementById('height').value = profile.height || '';

  if (profile.avatar) {
    avatarPlaceholder.style.backgroundImage = `url(${profile.avatar})`;
    avatarPlaceholder.style.backgroundSize = 'cover';
    avatarPlaceholder.style.backgroundPosition = 'center';
    avatarPlaceholder.textContent = '';
  } else {
    avatarPlaceholder.style.backgroundImage = '';
    avatarPlaceholder.textContent = (profile.name||'YOU').slice(0,2).toUpperCase();
  }
}

function saveProfile(){
  profile.name = document.getElementById('username').value || '';
  profile.age  = Number(document.getElementById('age').value) || null;
  profile.weight = Number(document.getElementById('weight').value) || null;
  profile.height = Number(document.getElementById('height').value) || null;
  if(!profile.avatar && profile.gender){
    profile.avatar = profile.gender === 'female' ? 'images/female-avatar.png' : 'images/male-avatar.png';
  }
  saveProfileToStorage();
  renderProfile();
  recalcBMIDisplay();
  alert('Profile saved locally');
}

function clearProfile(){ if(!confirm('Clear profile?')) return; profile={}; localStorage.removeItem(KEY_PROFILE); renderProfile(); recalcBMIDisplay(); }

// ------------- DARK MODE ----------------
function toggleDarkMode(){
  document.body.classList.toggle('dark');
  localStorage.setItem(KEY_DARK, document.body.classList.contains('dark'));
  document.getElementById('darkmode-btn').textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
}
(function loadDark(){
  const d = localStorage.getItem(KEY_DARK) === 'true';
  if(d){ document.body.classList.add('dark'); document.getElementById('darkmode-btn').textContent='Light'; }
})();

// ------------- WORKOUT CRUD ----------------
function addWorkout(){
  const type = document.getElementById('type').value;
  const duration = Number(document.getElementById('duration').value) || 0;
  const intensity = Number(document.getElementById('intensity').value) || 5;
  if(duration <= 0){ alert('Enter duration'); return; }
  const calories = Math.round(estimateCaloriesFor(type, duration));
  const w = { type, duration, intensity, calories, date: new Date().toISOString().slice(0,10) };
  workouts.unshift(w);
  localStorage.setItem(KEY_WORKOUTS, JSON.stringify(workouts));
  document.getElementById('duration').value=''; document.getElementById('intensity').value='';
  document.getElementById('estCalories').textContent = '—';
  loadUI();
  updateAchievements();
}

function deleteWorkout(i){ if(!confirm('Delete workout?')) return; workouts.splice(i,1); localStorage.setItem(KEY_WORKOUTS, JSON.stringify(workouts)); loadUI(); }
function clearAll(){ if(!confirm('Clear all workouts?')) return; workouts=[]; localStorage.removeItem(KEY_WORKOUTS); loadUI(); }

// ------------- ESTIMATE / CALCULATE CALORIES ----------------
function estimateCaloriesFor(type, duration){
  const w = profile.weight || 70;
  const hours = Math.max(duration,0) / 60;
  const met = MET[type] || 5;
  return met * w * hours;
}
function estimateCalories(){
  const type = document.getElementById('type').value;
  const duration = Number(document.getElementById('duration').value) || 0;
  if(duration<=0){ alert('Enter duration first'); return; }
  const c = Math.round(estimateCaloriesFor(type, duration));
  document.getElementById('estCalories').textContent = `${c} cal (est)`;
}
function calcCalories(){ const type = document.getElementById('calcType').value; const duration = Number(document.getElementById('calcDuration').value) || 0; if(duration<=0){ alert('Enter minutes'); return; } const c = Math.round(estimateCaloriesFor(type, duration)); document.getElementById('calcResult').textContent = `Estimated calories: ${c} cal`; }

// ------------- CHART (14 days) ----------------
function buildChart(){
  const ctx = document.getElementById('fitnessChart').getContext('2d');
  if(chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Calories/day', data: [], fill:true, tension:0.3, backgroundColor: gradient(ctx), borderColor:'#ff6384' }] },
    options: { responsive:true, animation:{duration:700}, scales:{y:{beginAtZero:true}} }
  });
}
function gradient(ctx){
  const g = ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0,'rgba(255,99,132,0.25)');
  g.addColorStop(1,'rgba(255,99,132,0)');
  return g;
}
function updateChart(){
  if(!chartInstance) buildChart();
  const days = 14;
  const labels = [];
  const data = [];
  for(let i = days-1; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    labels.push(key.slice(5)); // MM-DD
    const sum = workouts.filter(w => w.date === key).reduce((s,w)=>s+w.calories,0);
    data.push(sum);
  }
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.update();
}

// ------------- STREAK CHART (simple) ----------------

function buildStreakChart(){
  const ctx = document.getElementById('streakChart').getContext('2d');
  if(streakChartInstance) streakChartInstance.destroy();
  streakChartInstance = new Chart(ctx, {
    type:'line',
    data:{labels:[],datasets:[{label:'Workout Streak',data:[],fill:false,tension:0.3,borderColor:'#0ff',pointRadius:8}]},
    options:{responsive:true,animation:{duration:700},scales:{y:{min:0,max:1,display:false}}}
  });
}
function updateStreakChart(){
  if(!streakChartInstance) buildStreakChart();
  const days=14; const labels=[]; const data=[];
  for(let i=days-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); labels.push(key.slice(5)); const has = workouts.some(w=>w.date===key); data.push(has?1:0); }
  streakChartInstance.data.labels=labels; streakChartInstance.data.datasets[0].data=data; streakChartInstance.update();
}

// ------------- RINGS (animated) ----------------
function drawRing(canvasId, value, max, color){
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height; ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 12;
  ctx.beginPath(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(200,200,200,0.25)'; ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  const pct = Math.max(0, Math.min(1, value/max));
  ctx.beginPath(); ctx.lineWidth = 12; ctx.strokeStyle = color; ctx.lineCap='round';
  ctx.arc(cx,cy,r, -Math.PI/2, (-Math.PI/2) + (Math.PI*2*pct)); ctx.stroke();
  ctx.fillStyle = getComputedStyle(document.body).color; ctx.font = '14px Inter, Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(Math.round(value), cx, cy);
}
function updateRings(){
  const today = new Date();
  const past7 = []; for(let i=0;i<7;i++){ const d=new Date(); d.setDate(today.getDate()-i); past7.push(d.toISOString().slice(0,10)); }
  const totalCalories = past7.reduce((s,day)=> s + workouts.filter(w=>w.date===day).reduce((a,b)=>a+b.calories,0), 0);
  const totalMinutes  = past7.reduce((s,day)=> s + workouts.filter(w=>w.date===day).reduce((a,b)=>a+b.duration,0), 0);
  const maxCalories = Math.max(500, totalCalories, 1000);
  const maxMinutes = Math.max(150, totalMinutes, 300);
  drawRing('ringCalories', totalCalories, maxCalories, '#ff6384');
  drawRing('ringMinutes', totalMinutes, maxMinutes, '#36a2eb');
}

// ------------- SUMMARY ----------------
function updateSummary(){
  const totalWorkouts = workouts.length;
  const totalMinutes = workouts.reduce((s,w)=>s+w.duration,0);
  const totalCalories = workouts.reduce((s,w)=>s+w.calories,0);
  document.getElementById('sumWorkouts').textContent = totalWorkouts;
  document.getElementById('sumMinutes').textContent = totalMinutes;
  document.getElementById('sumCalories').textContent = totalCalories;
}

// ------------- HISTORY UI ----------------
function displayWorkouts(){
  const ul = document.getElementById('workout-list'); ul.innerHTML = '';
  if(workouts.length===0){ ul.innerHTML = '<li class="muted">No workouts yet</li>'; return; }
  workouts.forEach((w,i)=>{
    const li = document.createElement('li'); li.className='history-list-item';
    li.innerHTML = `<div><strong>${capitalize(w.type)}</strong> • ${w.duration} min • ${w.calories} cal<br><small class="muted">${w.date}</small></div>
      <div><button class="small" onclick="deleteWorkout(${i})" style="background:#e74c3c">Delete</button></div>`;
    ul.appendChild(li);
  });
}

// ------------- CSV EXPORT ----------------
function downloadCSV(){
  if(workouts.length===0){ alert('No workouts to export'); return; }
  let csv = 'Type,Duration,Calories,Date\n';
  workouts.slice().forEach(w=> csv += `${w.type},${w.duration},${w.calories},${w.date}\n`);
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='workouts.csv'; a.click(); URL.revokeObjectURL(url);
}

// ------------- BMI ----------------
function recalcBMIDisplay(){
  const w = profile.weight, h = profile.height;
  if(!w || !h){ document.getElementById('bmiDisplay').textContent=''; return; }
  const bmi = +(w / ((h/100)*(h/100))).toFixed(1);
  let status = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  document.getElementById('bmiDisplay').textContent = `BMI: ${bmi} — ${status}`;
}

// ------------- UTIL ----------------
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

// ------------- ACHIEVEMENTS & STREAKS ----------------
function updateBadges(){ const container = document.getElementById('badgeContainer'); container.innerHTML = ''; const streak = calculateStreak(); document.getElementById('streakDisplay').textContent = `Weekly Streak: ${streak} day${streak!==1?'s':''}`; if(workouts.length>=1 && !badges.firstWorkout){badges.firstWorkout=true; notifyBadge('First Workout');} const weeklyMinutes = getWeeklyMinutes(); if(weeklyMinutes>=100 && !badges.week100){badges.week100=true; notifyBadge('100 Minutes This Week');} if(streak>=7 && !badges.streak7){badges.streak7=true; notifyBadge('Consistency King');} localStorage.setItem(KEY_BADGES, JSON.stringify(badges)); for(const [key,unlocked] of Object.entries(badges)){ if(unlocked){ const b = document.createElement('div'); b.className='badge unlocked'; b.textContent=key.replace(/([A-Z])/g,' $1'); container.appendChild(b); } } }
function notifyBadge(name){ const b = document.createElement('div'); b.className='badge unlocked'; b.textContent = name; b.style.position='fixed'; b.style.top='20px'; b.style.right='20px'; b.style.zIndex=999; b.style.background='rgba(0,0,0,0.6)'; document.body.appendChild(b); setTimeout(()=>b.remove(),3000); }
function calculateStreak(){ if(workouts.length===0) return 0; const sorted = [...workouts].sort((a,b)=>new Date(a.date)-new Date(b.date)); let streak=1; for(let i=sorted.length-1;i>0;i--){ const d1=new Date(sorted[i].date); const d0=new Date(sorted[i-1].date); const diff=(d1-d0)/(1000*60*60*24); if(diff===1) streak++; else break; } return streak; }
function getWeeklyMinutes(){ const today = new Date(); let sum=0; for(let i=0;i<7;i++){ const d=new Date(); d.setDate(today.getDate()-i); const key=d.toISOString().slice(0,10); sum += workouts.filter(w=>w.date===key).reduce((a,b)=>a+b.duration,0); } return sum; }
function updateAchievements(){ updateBadges(); }

// ------------- WORKOUT CARD SELECTION ----------------
const workoutCards = document.querySelectorAll('.workout-card');
workoutCards.forEach(card => {
  card.addEventListener('click', () => {
    workoutCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('type').value = card.dataset.type;
  });
});

// Default selection
(function defaultWorkoutSelection(){
  const defaultCard = document.querySelector(`.workout-card[data-type="${document.getElementById('type').value}"]`);
  if(defaultCard) defaultCard.classList.add('selected');
})();

// ------------- BOOT / LOAD UI ----------------
function loadUI(){
  renderProfile();
  // ensure workouts have calories/duration (backwards compatibility)
  workouts = workouts.map(w=>{
    if(!w.calories) w.calories = Math.round(estimateCaloriesFor(w.type, w.duration));
    return w;
  });
  displayWorkouts();
  updateSummary();
  updateChart();
  updateStreakChart();
  updateRings();
  recalcBMIDisplay();
  updateAchievements();
}
(function init(){
  buildChart();
  // ensure avatar exists for chosen gender if needed
  if(profile && profile.gender && !profile.avatar){
    profile.avatar = profile.gender==='female' ? 'images/female-avatar.png' : 'images/male-avatar.png';
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  }
  // show gender modal if no gender chosen
  if(!profile.gender){
    showGenderModal();
  } else {
    renderProfile();
  }
  loadUI();
})();

// hookup calc input key listener
document.getElementById && (document.getElementById('calcDuration')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') calcCalories(); }));
