(() => {
  "use strict";

  const STORAGE_KEY = "focuspath_pro_v1";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const todayKey = (date = new Date()) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const defaultState = () => ({tasks:[], sessions:[], weeklyGoal:300, theme:"dark"});
  let state = loadState();
  let currentView = "overview";
  let currentFilter = "all";
  let timerMode = "focus";
  let timerSeconds = 25 * 60;
  let timerRemaining = timerSeconds;
  let timerInterval = null;
  let timerRunning = false;
  let toastTimeout = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return defaultState();
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        weeklyGoal: Number(parsed.weeklyGoal) > 0 ? Number(parsed.weeklyGoal) : 300,
        theme: parsed.theme === "light" ? "light" : "dark"
      };
    } catch { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { showToast("Could not save data. Export a backup and check browser storage."); }
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
  function formatDate(value) {
    if (!value) return "No deadline";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "No deadline";
    return d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
  }
  function formatMinutes(min) {
    const n = Math.max(0, Math.round(min));
    if (n < 60) return `${n}m`;
    const h = Math.floor(n/60), m=n%60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  function showToast(message) {
    const toast=$("#toast"); toast.textContent=message; toast.classList.add("show");
    clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>toast.classList.remove("show"),2400);
  }
  function setView(view) {
    currentView=view;
    $$(".view").forEach(el=>el.classList.toggle("active",el.id===`view-${view}`));
    $$(".nav-item[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    $("#breadcrumb-current").textContent=({overview:"Overview",tasks:"My tasks",focus:"Focus timer",insights:"Insights"})[view];
    renderAll();
  }
  function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
  function weekStart(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
  function sessionsForDate(key){return state.sessions.filter(s=>s.date===key);}
  function focusMinutes(sessions=state.sessions){return sessions.reduce((sum,s)=>sum+(Number(s.minutes)||0),0);}
  function getStreak(){
    const days=new Set(state.sessions.map(s=>s.date));
    let cursor=new Date();cursor.setHours(0,0,0,0);
    if(!days.has(todayKey(cursor))) cursor=addDays(cursor,-1);
    let streak=0;
    while(days.has(todayKey(cursor))){streak++;cursor=addDays(cursor,-1);}
    return streak;
  }
  function updateHeader(){
    $("#header-date").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
    $("#nav-task-count").textContent=state.tasks.filter(t=>!t.completed).length;
  }
  function renderStats(){
    const total=state.tasks.length,done=state.tasks.filter(t=>t.completed).length;
    $("#stat-completed").textContent=done;
    $("#stat-focus").textContent=formatMinutes(focusMinutes());
    $("#stat-streak").textContent=`${getStreak()} ${getStreak()===1?"day":"days"}`;
    $("#stat-rate").textContent=total?`${Math.round(done/total*100)}%`:"0%";
    $("#goal-target").textContent=state.weeklyGoal;
    $("#weekly-goal").value=state.weeklyGoal;
    const start=weekStart();
    const thisWeek=state.sessions.filter(s=>s.date>=todayKey(start));
    const mins=focusMinutes(thisWeek);
    $("#goal-progress").textContent=mins;
    $("#goal-bar").style.width=`${Math.min(100,mins/state.weeklyGoal*100)}%`;
    $("#goal-message").textContent=mins>=state.weeklyGoal?"Weekly target reached. Great consistency!":`${Math.max(0,state.weeklyGoal-mins)} minutes to reach your weekly target.`;
  }
  function renderWeekChart(){
    const start=weekStart(),days=Array.from({length:7},(_,i)=>addDays(start,i));
    const values=days.map(d=>({date:d,key:todayKey(d),minutes:focusMinutes(sessionsForDate(todayKey(d)))}));
    const max=Math.max(30,...values.map(v=>v.minutes));
    $("#week-chart").innerHTML=values.map(v=>`<div class="day-column ${v.key===todayKey()?"today":""}" title="${v.minutes} focus minutes"><div class="bar-track"><div class="bar-fill" style="height:${v.minutes?Math.max(5,v.minutes/max*100):2}%"></div></div><span>${v.date.toLocaleDateString(undefined,{weekday:"short"}).slice(0,2)}</span></div>`).join("");
  }
  function renderOverviewTasks(){
    const open=state.tasks.filter(t=>!t.completed).sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")).slice(0,4);
    $("#overview-task-list").innerHTML=open.map(t=>`<div class="compact-task"><span class="task-dot"></span><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.subject)} · ${formatDate(t.date)}</small></div><span class="task-due">${t.priority==="high"?"High":""}</span></div>`).join("");
    $("#overview-empty").style.display=open.length?"none":"block";
  }
  function renderTaskList(){
    const query=$("#task-search").value.trim().toLowerCase(),subject=$("#subject-filter").value;
    const filtered=state.tasks.filter(t=>{
      const status=currentFilter==="all"||(currentFilter==="active"&&!t.completed)||(currentFilter==="done"&&t.completed);
      const matchesSubject=subject==="all"||t.subject===subject;
      const matchesQuery=!query||`${t.title} ${t.subject} ${t.notes||""}`.toLowerCase().includes(query);
      return status&&matchesSubject&&matchesQuery;
    }).sort((a,b)=>Number(a.completed)-Number(b.completed)||(a.date||"9999").localeCompare(b.date||"9999"));
    $("#full-task-list").innerHTML=filtered.map(t=>{
      const overdue=t.date&&!t.completed&&t.date<todayKey();
      return `<article class="full-task ${t.completed?"completed":""}" data-id="${escapeHTML(t.id)}">
        <input class="check-task" type="checkbox" ${t.completed?"checked":""} aria-label="Mark task complete">
        <div class="full-task-main"><div class="full-task-title">${escapeHTML(t.title)}</div>${t.notes?`<div class="full-task-notes">${escapeHTML(t.notes)}</div>`:""}
        <div class="task-tags"><span class="tag">${escapeHTML(t.subject)}</span><span class="tag">${formatDate(t.date)}</span><span class="tag priority-${escapeHTML(t.priority||"normal")}">${escapeHTML((t.priority||"normal").replace(/^./,c=>c.toUpperCase()))} priority</span>${overdue?'<span class="tag overdue">Overdue</span>':""}<span class="tag">${Number(t.estimate)||30} min</span></div></div>
        <div class="task-actions"><button class="delete-task" aria-label="Delete task" title="Delete task">×</button></div></article>`;
    }).join("");
    $("#tasks-empty").classList.toggle("visible",filtered.length===0);
    $("#filter-all-count").textContent=state.tasks.length;
    $("#filter-active-count").textContent=state.tasks.filter(t=>!t.completed).length;
    $("#filter-done-count").textContent=state.tasks.filter(t=>t.completed).length;
  }
  function renderSessionSelect(){
    const select=$("#session-task"),previous=select.value;
    const open=state.tasks.filter(t=>!t.completed);
    select.innerHTML='<option value="">No task selected</option>'+open.map(t=>`<option value="${escapeHTML(t.id)}">${escapeHTML(t.title)}</option>`).join("");
    if(open.some(t=>t.id===previous))select.value=previous;
  }
  function renderInsights(){
    const sessions=state.sessions, total=focusMinutes(sessions);
    $("#insight-sessions").textContent=sessions.length;
    $("#insight-created").textContent=state.tasks.length;
    $("#insight-average").textContent=sessions.length?formatMinutes(total/sessions.length):"0m";
    const bySubject={};
    sessions.forEach(s=>{const subject=s.subject||"Unassigned";bySubject[subject]=(bySubject[subject]||0)+(Number(s.minutes)||0);});
    const sorted=Object.entries(bySubject).sort((a,b)=>b[1]-a[1]);
    $("#insight-subject").textContent=sorted[0]?.[0]||"—";
    const max=sorted[0]?.[1]||1;
    $("#subject-breakdown").innerHTML=sorted.length?sorted.map(([name,mins])=>`<div class="subject-row"><div class="subject-row-head"><span>${escapeHTML(name)}</span><span>${formatMinutes(mins)}</span></div><div class="subject-track"><div class="subject-fill" style="width:${mins/max*100}%"></div></div></div>`).join(""):'<p class="muted small">Complete a focus session to see your subject breakdown.</p>';
    const recent=[...sessions].sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,6);
    $("#recent-sessions").innerHTML=recent.length?recent.map(s=>`<div class="recent-item"><span class="recent-symbol">◷</span><div><strong>${escapeHTML(s.taskTitle||"Independent study")}</strong><small>${escapeHTML(s.subject||"Unassigned")} · ${formatMinutes(s.minutes)}</small></div><time>${new Date(s.completedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time></div>`).join(""):'<p class="muted small">Your completed focus sessions will appear here.</p>';
  }
  function renderAll(){
    updateHeader();renderStats();renderWeekChart();renderOverviewTasks();renderTaskList();renderSessionSelect();renderInsights();
  }
  function openModal(){
    $("#task-modal").hidden=false;$("#task-title").focus();
  }
  function closeModal(){$("#task-modal").hidden=true;$("#task-form").reset();}
  function addTask(form){
    const title=$("#task-title").value.trim();if(!title){$("#task-title").focus();return;}
    state.tasks.unshift({id:uid(),title,subject:$("#task-subject").value,date:$("#task-date").value,priority:$("#task-priority").value,estimate:Math.min(600,Math.max(5,Number($("#task-estimate").value)||30)),notes:$("#task-details").value.trim(),completed:false,createdAt:new Date().toISOString()});
    saveState();closeModal();renderAll();showToast("Task added to your study plan.");
  }
  function toggleTask(id,completed){
    const task=state.tasks.find(t=>t.id===id);if(!task)return;task.completed=completed;task.updatedAt=new Date().toISOString();saveState();renderAll();showToast(completed?"Task completed. Nice work!":"Task moved back to to-do.");
  }
  function deleteTask(id){
    const task=state.tasks.find(t=>t.id===id);if(!task)return;
    if(!confirm(`Delete "${task.title}"?`))return;
    state.tasks=state.tasks.filter(t=>t.id!==id);saveState();renderAll();showToast("Task deleted.");
  }
  function setTimerMode(mode){
    pauseTimer();timerMode=mode;timerSeconds=({focus:25,short:5,long:15})[mode]*60;timerRemaining=timerSeconds;
    $$(".timer-tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
    $("#timer-label").textContent=({focus:"FOCUS SESSION",short:"SHORT BREAK",long:"LONG BREAK"})[mode];
    $("#timer-start").textContent=mode==="focus"?"Start focus":"Start break";
    $("#timer-status").textContent="Ready when you are";renderTimer();
  }
  function renderTimer(){
    const mins=Math.floor(timerRemaining/60),secs=timerRemaining%60;
    $("#timer-display").textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    const fraction=timerSeconds?timerRemaining/timerSeconds:1;
    $("#timer-ring").style.background=`conic-gradient(var(--accent-strong) ${(1-fraction)*360}deg,#293753 ${(1-fraction)*360}deg)`;
  }
  function pauseTimer(){
    if(timerInterval)clearInterval(timerInterval);timerInterval=null;timerRunning=false;
    if($("#timer-start"))$("#timer-start").textContent=timerMode==="focus"?"Resume focus":"Resume break";
  }
  function startTimer(){
    if(timerRunning)return;timerRunning=true;$("#timer-start").textContent="Pause";$("#timer-status").textContent="Stay with one thing.";
    timerInterval=setInterval(()=>{
      timerRemaining--;renderTimer();
      if(timerRemaining<=0){pauseTimer();timerRemaining=0;renderTimer();completeTimer();}
    },1000);
  }
  function completeTimer(){
    if(timerMode==="focus"){
      const task=state.tasks.find(t=>t.id===$("#session-task").value);
      state.sessions.push({id:uid(),date:todayKey(),minutes:25,subject:task?.subject||"Unassigned",taskId:task?.id||null,taskTitle:task?.title||$("#session-note").value.trim()||"Independent study",note:$("#session-note").value.trim(),completedAt:new Date().toISOString()});
      saveState();renderAll();showToast("Focus session saved. Take a short break!");
      $("#timer-status").textContent="Session complete — well done.";
    }else{$("#timer-status").textContent="Break finished. Ready to focus?";showToast("Break finished. You can start another session.");}
    $("#timer-start").textContent="Start again";
  }
  function exportData(){
    const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:"FocusPath"},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`focuspath-backup-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);showToast("Backup exported.");
  }
  function importData(file){
    if(!file)return;const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        if(!data||!Array.isArray(data.tasks)||!Array.isArray(data.sessions))throw new Error("Invalid backup");
        if(!confirm("Import this backup? It will replace the data currently saved in this browser."))return;
        state={tasks:data.tasks, sessions:data.sessions, weeklyGoal:Number(data.weeklyGoal)||300,theme:data.theme==="light"?"light":"dark"};
        saveState();applyTheme();renderAll();showToast("Backup imported.");
      }catch{showToast("That file is not a valid FocusPath backup.");}
    };
    reader.readAsText(file);
  }
  function applyTheme(){document.body.classList.toggle("light",state.theme==="light");}
  function bindEvents(){
    $$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
    $$("[data-go]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.go)));
    $("#quick-add").addEventListener("click",openModal);
    $("#open-task-modal").addEventListener("click",openModal);
    $("#empty-add").addEventListener("click",openModal);
    $("#close-modal").addEventListener("click",closeModal);
    $("#cancel-modal").addEventListener("click",closeModal);
    $("#task-modal").addEventListener("click",e=>{if(e.target===$("#task-modal"))closeModal();});
    $("#task-form").addEventListener("submit",e=>{e.preventDefault();addTask(e.currentTarget);});
    $$(".filter-tab").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;$$(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));renderTaskList();}));
    $("#task-search").addEventListener("input",renderTaskList);
    $("#subject-filter").addEventListener("change",renderTaskList);
    $("#full-task-list").addEventListener("change",e=>{if(e.target.matches(".check-task"))toggleTask(e.target.closest(".full-task").dataset.id,e.target.checked);});
    $("#full-task-list").addEventListener("click",e=>{if(e.target.matches(".delete-task"))deleteTask(e.target.closest(".full-task").dataset.id);});
    $("#save-goal").addEventListener("click",()=>{const val=Math.min(3000,Math.max(30,Number($("#weekly-goal").value)||300));state.weeklyGoal=val;saveState();renderStats();showToast("Weekly goal updated.");});
    $$(".timer-tab").forEach(b=>b.addEventListener("click",()=>setTimerMode(b.dataset.mode)));
    $("#timer-start").addEventListener("click",()=>timerRunning?pauseTimer():startTimer());
    $("#timer-reset").addEventListener("click",()=>{pauseTimer();timerRemaining=timerSeconds;$("#timer-status").textContent="Timer reset";$("#timer-start").textContent=timerMode==="focus"?"Start focus":"Start break";renderTimer();});
    $("#export-btn").addEventListener("click",exportData);
    $("#import-btn").addEventListener("click",()=>$("#import-file").click());
    $("#import-file").addEventListener("change",e=>importData(e.target.files[0]));
    $("#theme-toggle").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";applyTheme();saveState();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#task-modal").hidden)closeModal();});
  }

  applyTheme();bindEvents();renderAll();setTimerMode("focus");
})();