const $ = id => document.getElementById(id);
const play = id => { const a = $(id); if(a) { a.currentTime = 0; a.play().catch(()=>{}); }};
const pad = n => String(n).padStart(2, '0');
const fmtTime = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
const fmtTime3 = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;

let focused = null, currentSection = 'timer';

// Background
const bgImgs = Array.from({length: 16}, (_, i) => `./IMG/background-image/bgimg-${i+1}.jpg`);
const bg = document.querySelectorAll('.bg-img');
let bgIdx = 0, bgVis = 0;
setInterval(() => {
  const next = (bgVis + 1) % 2;
  bgIdx = (bgIdx + 1) % bgImgs.length;
  bg[next].src = bgImgs[bgIdx];
  bg[bgVis].classList.remove('active');
  bg[next].classList.add('active');
  bgVis = next;
}, 10000);

// Sidebar
function toggleSidebar() {
  const sidebar = $('sidebar');
  const overlay = $('mobile-overlay');
  
  if (window.innerWidth <= 1024) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  } else {
    sidebar.classList.toggle('collapsed');
  }
  play('snd-click');
}

// Section
function switchSection(section) {
  play('snd-click');
  currentSection = section;
  
  // 現在のセクションを保存
  localStorage.setItem('current-section', section);
  
  // Home タブの特別処理
  if (section === 'home') {
    document.body.classList.add('home-active');
  } else {
    document.body.classList.remove('home-active');
  }
  
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(`section-${section}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => 
    item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${section}'`)
  );
  if (navItem) navItem.classList.add('active');
  
  if (window.innerWidth <= 1024) {
    $('sidebar').classList.remove('open');
    $('mobile-overlay').classList.remove('show');
  }
  
  // セクション切り替え時にフロート表示を更新
  checkVis();
  updateYoutubeControls();
}
// Keyboard
document.addEventListener('keydown', e => {
  if (e.target.tagName !== 'INPUT' && e.target.contentEditable !== 'true' && !e.target.classList.contains('calc-btn')) {
    const key = e.key;
    const sections = ['home', 'timer', 'clock', 'weather', 'stopwatch', 'custom-timer', 'memo', 'gemini', 'calculator'];
    const idx = parseInt(key) - 1;
    if (idx >= 0 && idx < sections.length) {
      switchSection(sections[idx]);
    } else if (key === ' ' && currentSection === 'timer') {
      e.preventDefault();
      toggleTimer();
    }
  }
  
  if (currentSection === 'calculator' && e.target.tagName !== 'INPUT') {
    if (/^[0-9]$/.test(e.key)) calcInput(e.key);
    else if (['+', '-', '*', '/', '%', '.'].includes(e.key)) calcInput(e.key);
    else if (e.key === 'Enter' || e.key === '=') calcEquals();
    else if (e.key === 'Escape' || e.key === 'c') clearCalc();
    else if (e.key === 'Backspace') backspaceCalc();
  }
  
  if (focused) {
    if (e.ctrlKey && !e.shiftKey && e.key === 'b') { e.preventDefault(); fmt('bold'); }
    else if (e.ctrlKey && !e.shiftKey && e.key === 'u') { e.preventDefault(); fmt('underline'); }
    else if (e.ctrlKey && e.shiftKey && e.key === '>') { e.preventDefault(); fmt('larger'); }
    else if (e.ctrlKey && e.shiftKey && e.key === '<') { e.preventDefault(); fmt('smaller'); }
  }
});

// Format
function fmt(a) {
  if (!focused) return;
  focused.focus();
  if (a === 'bold') document.execCommand('bold');
  else if (a === 'underline') document.execCommand('underline');
  else if (a === 'larger' || a === 'smaller') {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && !sel.isCollapsed) {
      const delta = a === 'larger' ? 2 : -2;
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      try {
        range.surroundContents(span);
        span.style.fontSize = (parseFloat(getComputedStyle(span).fontSize) + delta) + 'px';
      } catch(e) {
        const frag = range.extractContents();
        span.appendChild(frag);
        span.style.fontSize = (parseFloat(getComputedStyle(focused).fontSize) + delta) + 'px';
        range.insertNode(span);
      }
    }
  }
}

// Search
// ===== script.js の // Search コメントの後に追加・置き換え =====

let searchLinks = JSON.parse(localStorage.getItem('search-links') || '[]');
let selectedSuggestionIndex = -1;

function doSearch() {
  const q = $('search').value.trim();
  if (q) {
    // 選択された候補があればそれを開く
    const suggestions = $('search-suggestions');
    if (suggestions.classList.contains('show') && selectedSuggestionIndex >= 0) {
      const items = suggestions.querySelectorAll('.search-suggestion-item');
      if (items[selectedSuggestionIndex]) {
        items[selectedSuggestionIndex].click();
        return;
      }
    }
    
    // カスタム検索リンクをチェック
    const matchedLink = searchLinks.find(link => 
      link.keywords.some(keyword => keyword.toLowerCase() === q.toLowerCase())
    );
    
    if (matchedLink) {
      window.open(matchedLink.url, '_blank');
    } else {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    }
    $('search').value = '';
    hideSearchSuggestions();
  }
}

function handleSearchInput(e) {
  const query = e.target.value.trim().toLowerCase();
  const suggestions = $('search-suggestions');
  
  // 矢印キーの処理
  if (e.inputType === undefined && suggestions.classList.contains('show')) {
    const items = suggestions.querySelectorAll('.search-suggestion-item');
    if (items.length > 0) {
      // 前の選択を解除
      items.forEach(item => item.classList.remove('selected'));
      
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
        items[selectedSuggestionIndex].classList.add('selected');
        items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    return;
  }
  
  selectedSuggestionIndex = -1;
  
  if (!query) {
    hideSearchSuggestions();
    return;
  }
  
  // キーワードにマッチする検索リンクを探す
  const matches = searchLinks.filter(link =>
    link.keywords.some(keyword => keyword.toLowerCase().includes(query))
  );
  
  if (matches.length > 0) {
    showSearchSuggestions(matches, query);
  } else {
    hideSearchSuggestions();
  }
}

// 検索ボックスのキーボード操作
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = $('search');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
    
    searchInput.addEventListener('keydown', (e) => {
      const suggestions = $('search-suggestions');
      if (!suggestions || !suggestions.classList.contains('show')) return;
      
      const items = suggestions.querySelectorAll('.search-suggestion-item');
      if (items.length === 0) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
        handleSearchInput({ target: e.target });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        handleSearchInput({ target: e.target });
      } else if (e.key === 'Escape') {
        hideSearchSuggestions();
        selectedSuggestionIndex = -1;
      }
    });
  }
});

function showSearchSuggestions(matches, query) {
  const suggestions = $('search-suggestions');
  if (!suggestions) return;
  
  suggestions.innerHTML = '';
  
  matches.forEach((match, index) => {
    const item = document.createElement('div');
    item.className = 'search-suggestion-item';
    if (index === selectedSuggestionIndex) {
      item.classList.add('selected');
    }
    
    item.innerHTML = `
      <div class="search-suggestion-name">${match.name}</div>
      <div class="search-suggestion-url">${match.url}</div>
    `;
    
    item.onclick = () => {
      window.open(match.url, '_blank');
      $('search').value = '';
      hideSearchSuggestions();
    };
    
    suggestions.appendChild(item);
  });
  
  suggestions.classList.add('show');
}

function hideSearchSuggestions() {
  const suggestions = $('search-suggestions');
  if (suggestions) {
    suggestions.classList.remove('show');
  }
  selectedSuggestionIndex = -1;
}

// 検索ボックス外をクリックしたら候補を非表示
document.addEventListener('click', (e) => {
  const searchWrap = document.querySelector('.search-wrap');
  if (searchWrap && !searchWrap.contains(e.target)) {
    hideSearchSuggestions();
  }
});

// Search Settings
function showSearchSettings() {
  play('snd-click');
  renderSearchLinks();
  $('search-settings').classList.add('show');
}

function hideSearchSettings() {
  play('snd-click');
  localStorage.setItem('search-links', JSON.stringify(searchLinks));
  $('search-settings').classList.remove('show');
}

function renderSearchLinks() {
  const edit = $('search-links-edit');
  edit.innerHTML = '';
  
  searchLinks.forEach((link, idx) => {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:15px;padding:15px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border-radius:8px;';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Name (e.g., YouTube)';
    nameInput.value = link.name;
    nameInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(255,255,255,0.1);color:white;';
    nameInput.addEventListener('input', (e) => { link.name = e.target.value; });
    
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'URL (e.g., https://youtube.com)';
    urlInput.value = link.url;
    urlInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(255,255,255,0.1);color:white;';
    urlInput.addEventListener('input', (e) => { link.url = e.target.value; });
    
    const keywordsInput = document.createElement('input');
    keywordsInput.type = 'text';
    keywordsInput.placeholder = 'Keywords (comma separated, e.g., youtube, yt, video)';
    keywordsInput.value = link.keywords.join(', ');
    keywordsInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(255,255,255,0.1);color:white;';
    keywordsInput.addEventListener('input', (e) => {
      link.keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding:8px 16px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);color:white;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;width:100%;transition:all 0.2s;';
    removeBtn.addEventListener('mouseenter', () => { removeBtn.style.background = 'rgba(255,0,0,0.3)'; });
    removeBtn.addEventListener('mouseleave', () => { removeBtn.style.background = 'rgba(255,255,255,0.12)'; });
    removeBtn.addEventListener('click', () => {
      searchLinks.splice(idx, 1);
      renderSearchLinks();
    });
    
    container.append(nameInput, urlInput, keywordsInput, removeBtn);
    edit.appendChild(container);
  });
}

function addSearchLink() {
  searchLinks.push({
    name: 'New Link',
    url: 'https://example.com',
    keywords: []
  });
  renderSearchLinks();
}

// Alert
function showAlert(title, msg) {
  $('alert-title').textContent = title;
  $('alert-msg').textContent = msg;
  $('alert').classList.add('show');
}
function hideAlert() { $('alert').classList.remove('show'); }

// Stats
let stats = JSON.parse(localStorage.getItem('work-stats') || '{"sessions":0,"minutes":0,"today":0,"lastDate":"","streak":0}');

function updateStats() {
  const today = new Date().toDateString();
  if (stats.lastDate !== today) {
    if (stats.today > 0) {
      const lastD = new Date(stats.lastDate);
      const todayD = new Date(today);
      const diff = Math.floor((todayD - lastD) / (1000 * 60 * 60 * 24));
      if (diff === 1) stats.streak++;
      else if (diff > 1) stats.streak = 1;
    }
    stats.today = 0;
    stats.lastDate = today;
  }
  localStorage.setItem('work-stats', JSON.stringify(stats));
}

function showStats() {
  play('snd-click');
  updateStats();
  $('stat-sessions').textContent = stats.sessions;
  $('stat-minutes').textContent = stats.minutes;
  $('stat-today').textContent = stats.today;
  $('stat-streak').textContent = stats.streak;
  $('stats-modal').classList.add('show');
}

function hideStats() {
  play('snd-click');
  $('stats-modal').classList.remove('show');
}

// Settings
let sets = JSON.parse(localStorage.getItem('sets') || '{"work":25,"break":5,"repeat":0}');
$('set-work').value = sets.work;
$('set-break').value = sets.break;
$('set-repeat').value = sets.repeat;

function showSettings() {
  play('snd-click');
  $('settings').classList.add('show');
}
function saveSettings() {
  play('snd-click');
  sets.work = parseInt($('set-work').value) || 25;
  sets.break = parseInt($('set-break').value) || 5;
  sets.repeat = parseInt($('set-repeat').value) || 0;
  localStorage.setItem('sets', JSON.stringify(sets));
  pomoT = sets.work;
  shortT = sets.break;
  if (timerType === 'pomodoro') timeLeft = pomoT * 60;
  else if (timerType === 'short') timeLeft = shortT * 60;
  updateTimer();
  hideSettings();
}
function hideSettings() {
  play('snd-click');
  $('settings').classList.remove('show');
}

// Pomodoro
let pomoT = sets.work, shortT = sets.break, longT = 15;
let timerType = 'pomodoro', timeLeft = pomoT * 60, timerInt = null, timerRun = false;
let cycles = 0, isWork = true, initialTime = pomoT * 60;

function updateTimer() {
  const str = fmtTime(timeLeft);
  $('timer').textContent = str;
  $('float-timer-time').textContent = str;
  
  // タイマータイプを更新
  const typeNames = {
    'pomodoro': 'Pomodoro',
    'short': 'Short Break',
    'long': 'Long Break'
  };
  const floatTypeEl = $('float-timer-type');
  if (floatTypeEl) {
    floatTypeEl.textContent = typeNames[timerType] || 'Timer';
  }
  
  const progress = ((initialTime - timeLeft) / initialTime) * 100;
  $('progress-bar').style.width = progress + '%';
  
  // フロートタイマーのプログレスバーも更新
  const floatProgress = $('float-timer-progress');
  if (floatProgress) {
    floatProgress.style.width = progress + '%';
  }
  
  $('current-session').textContent = cycles;
  $('total-today').textContent = stats.today;
  $('next-break').textContent = isWork ? fmtTime(shortT * 60) : fmtTime(pomoT * 60);
  
  // フロート表示の更新
  checkVis();
}

function resetTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  cycles = 0;
  switchTimer(timerType);
}

function updateQuickPlayIcon(playing) {
  const icon = $('quick-play-icon');
  if (playing) {
    icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  }
}

// Float visibility
function checkVis() {
  const showTimer = currentSection !== 'timer' && timerRun;
  const showClock = currentSection !== 'clock' && currentSection !== 'home';
  
  $('float-timer').classList.toggle('show', showTimer);
  $('float-clock').classList.toggle('show', showClock);
  
  if (showTimer) {
    const progress = ((initialTime - timeLeft) / initialTime) * 100;
    $('float-timer-progress').style.width = progress + '%';
  }
}

document.querySelector('.content').addEventListener('scroll', checkVis);
window.addEventListener('resize', checkVis);

// Custom Timer
let ctTime = 0, ctInt = null, ctRun = false, ctInitial = 0;
function updateCT() {
  $('ct').textContent = fmtTime3(ctTime);
  if (ctInitial > 0) {
    const progress = (ctTime / ctInitial) * 100;
    $('ct-progress').style.width = progress + '%';
    updateTimer();
  }
}
function toggleCT() {
  play('snd-click');
  if (ctRun) {
    clearInterval(ctInt);
    ctRun = false;
    $('ct-btn').textContent = 'Start';
  } else {
    if (ctTime === 0) {
      ctTime = ctInitial = (parseInt($('ct-h').value) || 0) * 3600 + (parseInt($('ct-m').value) || 0) * 60 + (parseInt($('ct-s').value) || 0);
      if (ctTime === 0) return alert('Please set the time');
    }
    ctRun = true;
    $('ct-btn').textContent = 'Pause';
    ctInt = setInterval(() => {
      if (--ctTime <= 0) {
        clearInterval(ctInt);
        ctRun = false;
        ctTime = 0;
        ctInitial = 0;
        $('ct-btn').textContent = 'Start';
        play('snd-timer');
        showAlert('Time Up！', 'カスタムタイマーが終了しました');
      }
      updateCT();
    }, 1000);
  }
}
function resetCT() {
  play('snd-click');
  clearInterval(ctInt);
  ctRun = false;
  ctTime = 0;
  ctInitial = 0;
  $('ct-btn').textContent = 'Start';
  $('ct-h').value = $('ct-m').value = $('ct-s').value = 0;
  updateCT();
}

// Stopwatch
let swTime = 0, swInt = null, swRun = false, lapCnt = 0;
function updateSW() { $('sw').textContent = fmtTime3(swTime); }
function toggleSW() {
  play('snd-click');
  if (swRun) {
    clearInterval(swInt);
    swRun = false;
    $('sw-btn').textContent = 'Start';
  } else {
    swRun = true;
    $('sw-btn').textContent = 'Pause';
    swInt = setInterval(() => { swTime++; updateSW(); }, 1000);
  }
}
function lapSW() {
  if (swRun) {
    play('snd-lap');
    const lap = document.createElement('div');
    lap.className = 'lap-item';
    lap.innerHTML = `<span>Lap ${++lapCnt}</span><span>${fmtTime3(swTime)}</span>`;
    $('laps').insertBefore(lap, $('laps').firstChild);
  }
}
function resetSW() {
  play('snd-click');
  clearInterval(swInt);
  swRun = false;
  swTime = lapCnt = 0;
  $('sw-btn').textContent = 'Start';
  $('laps').innerHTML = '';
  updateSW();
}

// Calculator
let calcStr = '0', calcPrev = 0, calcOp = null, calcNew = true;
let calcHistory = [];

function calcInput(v) {
  play('snd-click');
  if (calcNew && !isNaN(v)) {
    calcStr = v;
    calcNew = false;
  } else if (['+','-','*','/','%'].includes(v)) {
    if (!calcNew) {
      calcEquals();
    }
    calcPrev = parseFloat(calcStr);
    calcOp = v;
    calcNew = true;
  } else {
    if (calcStr === '0' && v !== '.') {
      calcStr = v;
    } else {
      calcStr += v;
    }
  }
  $('calc-display').textContent = calcStr;
}

function calcEquals() {
  play('snd-click');
  const curr = parseFloat(calcStr);
  let result = curr;
  let historyStr = '';
  
  if (calcOp) {
    historyStr = `${calcPrev} ${calcOp} ${curr} = `;
    if (calcOp === '+') result = calcPrev + curr;
    else if (calcOp === '-') result = calcPrev - curr;
    else if (calcOp === '*') result = calcPrev * curr;
    else if (calcOp === '/') result = calcPrev / curr;
    else if (calcOp === '%') result = calcPrev % curr;
  }
  
  calcStr = String(result);
  $('calc-display').textContent = calcStr;
  
  if (historyStr) {
    historyStr += result;
    calcHistory.push(historyStr);
    updateCalcHistory();
  }
  
  calcNew = true;
  calcOp = null;
}

function clearCalc() {
  play('snd-click');
  calcStr = '0';
  calcPrev = 0;
  calcOp = null;
  calcNew = true;
  $('calc-display').textContent = '0';
}

function backspaceCalc() {
  play('snd-click');
  if (calcStr.length > 1) {
    calcStr = calcStr.slice(0, -1);
  } else {
    calcStr = '0';
  }
  $('calc-display').textContent = calcStr;
}

function updateCalcHistory() {
  const history = $('calc-history');
  history.innerHTML = '';
  calcHistory.slice(-5).forEach(item => {
    const div = document.createElement('div');
    div.className = 'calc-history-item';
    div.textContent = item;
    history.appendChild(div);
  });
}



// Clock
function updateClocks() {
  const now = new Date();
  const t = fmtTime3(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
  $('time').textContent = t;
  $('float-clock-time').textContent = t;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  $('date').textContent = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} (${wd})`;
  
  const getTZ = tz => {
    const d = new Date(now.toLocaleString('en-US', {timeZone: tz}));
    return fmtTime3(d.getHours()*3600+d.getMinutes()*60+d.getSeconds());
  };
  
  $('tokyo').textContent = getTZ('Asia/Tokyo');
  $('ny').textContent = getTZ('America/New_York');
  $('london').textContent = getTZ('Europe/London');
}
updateClocks();
setInterval(updateClocks, 1000);

function updateHomeClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const homeClockEl = $('home-clock');
  if (homeClockEl) {
    homeClockEl.textContent = `${hours}:${minutes}`;
    homeClockEl.innerHTML = `${hours}:${minutes}`;
  }
}
updateHomeClock();
setInterval(updateHomeClock, 1000);
updateHomeClock();
setInterval(updateHomeClock, 1000);
// Weather
function loadWeather() {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=35.85272206403399&lon=136.28673448772105&appid=8eb6dc5492a964ea79dd0ef92f1ae01c&units=metric&lang=ja`)
    .then(r => r.json())
    .then(d => {
      $('w-icon').src = `./SVG-IMG/weather-svg/${d.weather[0].icon}.svg`;
      $('w-icon').style.display = 'block';
      $('w-desc').textContent = d.weather[0].description;
      $('w-temp').textContent = Math.round(d.main.temp) + '°';
      $('w-max').textContent = Math.round(d.main.temp_max);
      $('w-min').textContent = Math.round(d.main.temp_min);
      $('w-loc').textContent = d.name || '指定地点';
    })
    .catch(e => { $('w-desc').textContent = 'Error loading weather'; });
}

function reloadWeather() {
  play('snd-click');
  loadWeather();
  const iframe = $('weather-iframe');
  iframe.src = iframe.src;
}

loadWeather();
setInterval(loadWeather, 1800000);

// Gemini
let geminiHistory = [];

function sendGemini() {
  const msg = $('gemini').textContent.trim();
  if (!msg) return;
  
  // ユーザーメッセージを履歴に追加
  geminiHistory.push({
    role: 'user',
    message: msg
  });
  
  // 入力欄をクリア
  $('gemini').textContent = '';
  
  // ユーザーメッセージを表示
  displayGeminiMessage('user', msg);
  
  // ローディング表示
  const loadingId = displayGeminiMessage('assistant', 'Thinking...');
  
  // Gemini APIにリクエスト
  fetch("https://steep-heart-f7f8.ikemenyuu0810.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: msg }] }
      ]
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("RAW Gemini response:", data);

    document.getElementById(loadingId)?.remove();

    if (data.error) {
      displayGeminiMessage('assistant', 'API Error: ' + data.error.message);
      return;
    }

    if (data.promptFeedback?.blockReason) {
      displayGeminiMessage(
        'assistant',
        'Blocked: ' + data.promptFeedback.blockReason
      );
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      displayGeminiMessage('assistant', 'No response (empty)');
      return;
    }

    displayGeminiMessage('assistant', text);
  })
  .catch(error => {
    // ローディングを削除
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) loadingElement.remove();
    
    // エラーメッセージを表示
    displayGeminiMessage('assistant', 'Error: ' + error.message);
    console.error('Gemini API Error:', error);
  });
}

function displayGeminiMessage(role, message) {
  const geminiWrap = document.querySelector('#section-gemini .card-content');
  const messagesContainer = geminiWrap.querySelector('.gemini-messages') || createMessagesContainer();
  
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = 'gemini-message gemini-message-' + role;
  messageDiv.innerHTML = `
    <div class="gemini-message-header">${role === 'user' ? 'You' : 'Gemini'}</div>
    <div class="gemini-message-content">${message.replace(/\n/g, '<br>')}</div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageId;
}

function createMessagesContainer() {
  const geminiWrap = document.querySelector('#section-gemini .card-content');
  const existingWrap = geminiWrap.querySelector('.gemini-wrap');
  
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'gemini-messages';
  messagesContainer.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px;';
  
  geminiWrap.insertBefore(messagesContainer, existingWrap);
  return messagesContainer;
}

function clearGeminiChat() {
  const messagesContainer = document.querySelector('.gemini-messages');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
  }
  geminiHistory = [];
}

// Quick Links
let quickLinks = JSON.parse(localStorage.getItem('quick-links') || JSON.stringify([
  {name:'GitHub',url:'https://github.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.840 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.430.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>'},
  {name:'ChatGPT',url:'https://chat.openai.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>'},
  {name:'Claude',url:'https://claude.ai',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM12 22.1538C6.15385 22.1538 1.84615 17.8462 1.84615 12C1.84615 6.15385 6.15385 1.84615 12 1.84615C17.8462 1.84615 22.1538 6.15385 22.1538 12C22.1538 17.8462 17.8462 22.1538 12 22.1538Z"/><path d="M16.6154 7.38462H7.38462C6.56769 7.38462 5.96154 8.00769 5.96154 8.76923V15.2308C5.96154 15.9923 6.56769 16.6154 7.38462 16.6154H16.6154C17.4323 16.6154 18.0385 15.9923 18.0385 15.2308V8.76923C18.0385 8.00769 17.4323 7.38462 16.6154 7.38462ZM16.6154 15.2308H7.38462V8.76923H16.6154V15.2308Z"/></svg>'},
  {name:'VS Code',url:'https://vscode.dev',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>'},
  {name:'Notion',url:'https://notion.so',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.336.653c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>'},
  {name:'Drive',url:'https://drive.google.com',icon:'<svg viewBox="0 0 24 24" fill="white"><path d="M7.71 3.5L1.15 15l3.43 5.5h13.71L22 15l-6.56-11.5H7.71zM8.73 5.5h6.54L19.21 15h-3.09l-3.43-5.5-4.63 8H4.03L8.73 5.5zm-.42 11.5h6.54l-3.26 5.5h-6.54l3.26-5.5z"/></svg>'}
]));

let currentIconIndex = 0;

function renderQuickLinksSidebar() {
  const container = $('quick-links-sidebar');
  container.innerHTML = '';
  quickLinks.forEach(link => {
    const a = document.createElement('a');
    a.className = 'quick-link-sidebar-item';
    a.href = link.url;
    a.target = '_blank';
    a.innerHTML = `<div class="quick-link-sidebar-icon">${link.icon}</div>`;
    a.title = link.name;
    container.appendChild(a);
  });
}

function showIconPicker(idx) {
  currentIconIndex = idx;
  const modal = $('icon-picker-modal');
  const grid = $('icon-picker-grid');
  grid.innerHTML = '';
  
  // 01.svg ~ 16.svgまでのアイコンを表示
  for (let i = 1; i <= 16; i++) {
    const item = document.createElement('div');
    item.className = 'icon-picker-item';
    const iconPath = `./SVG-IMG/Quick-Link-SVG/${String(i).padStart(2, '0')}.svg`;
    item.innerHTML = `<img src="${iconPath}" alt="Icon ${i}">`;
    item.onclick = () => selectIcon(iconPath);
    grid.appendChild(item);
  }
  
  modal.classList.add('show');
  play('snd-click');
}

function hideIconPicker() {
  $('icon-picker-modal').classList.remove('show');
  play('snd-click');
}

function selectIcon(iconPath) {
  quickLinks[currentIconIndex].icon = `<img src="${iconPath}">`;
  hideIconPicker();
  showAppSettings();
  play('snd-click');
}

function showAppSettings() {
  play('snd-click');
  const edit = $('quick-links-edit');
  edit.innerHTML = '';

  quickLinks.forEach((link, idx) => {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:15px;padding:15px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border-radius:8px;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Name';
    nameInput.value = link.name;
    nameInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(255,255,255,0.1);color:white;';
    nameInput.addEventListener('input', (e) => { link.name = e.target.value; });

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'URL';
    urlInput.value = link.url;
    urlInput.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(255,255,255,0.1);color:white;';
    urlInput.addEventListener('input', (e) => { link.url = e.target.value; });

    const iconPreview = document.createElement('div');
    iconPreview.style.cssText = 'width:100%;padding:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;';
    iconPreview.innerHTML = `<div style="width:48px;height:48px;">${link.icon}</div>`;
    iconPreview.onclick = () => showIconPicker(idx);
    iconPreview.onmouseenter = () => { iconPreview.style.background = 'rgba(255,255,255,0.15)'; };
    iconPreview.onmouseleave = () => { iconPreview.style.background = 'rgba(255,255,255,0.08)'; };

    const iconBtn = document.createElement('button');
    iconBtn.textContent = 'Change Icon';
    iconBtn.style.cssText = 'width:100%;padding:8px 16px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);color:white;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;margin-bottom:8px;transition:all 0.2s;';
    iconBtn.addEventListener('mouseenter', () => { iconBtn.style.background = 'rgba(255,255,255,0.2)'; });
    iconBtn.addEventListener('mouseleave', () => { iconBtn.style.background = 'rgba(255,255,255,0.12)'; });
    iconBtn.addEventListener('click', () => showIconPicker(idx));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding:8px 16px;background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);color:white;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;width:100%;transition:all 0.2s;';
    removeBtn.addEventListener('mouseenter', () => { removeBtn.style.background = 'rgba(255,0,0,0.3)'; });
    removeBtn.addEventListener('mouseleave', () => { removeBtn.style.background = 'rgba(255,255,255,0.12)'; });
    removeBtn.addEventListener('click', () => {
      quickLinks.splice(idx, 1);
      showAppSettings();
    });

    container.append(nameInput, urlInput, iconPreview, iconBtn, removeBtn);
    edit.appendChild(container);
  });

  $('app-settings').classList.add('show');
}

function hideAppSettings() {
  play('snd-click');
  localStorage.setItem('quick-links', JSON.stringify(quickLinks));
  renderQuickLinksSidebar();
  $('app-settings').classList.remove('show');
}

function addQuickLink() {
  quickLinks.push({name:'New Link',url:'https://example.com',icon:'<svg viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>'});
  showAppSettings();
}

renderQuickLinksSidebar();

// Notion
let notionPages = JSON.parse(localStorage.getItem('notion-pages') || JSON.stringify([
  {name:'Tasks',url:'https://todolist-home.notion.site/ebd//2c9ee93cc3e4800aba3ef91a7b2b0a31?v=2c9ee93cc3e480868d75000c8bfe4b7d'},
  {name:'Notes',url:'https://todolist-home.notion.site/ebd//2c9ee93cc3e480d0a9feecd8ab2bc460'}
]));
let notionIdx = 0;

function renderNotionTabs() {
  const tabs = $('notion-tabs');
  tabs.innerHTML = '';
  notionPages.forEach((page, idx) => {
    const btn = document.createElement('button');
    btn.className = 'notion-tab' + (idx === notionIdx ? ' active' : '');
    
    // テキストをspanで包む
    const textSpan = document.createElement('span');
    textSpan.textContent = page.name;
    btn.appendChild(textSpan);
    
    btn.onclick = () => switchNotionPage(idx);
    
    // 2ページ以上ある場合のみ削除ボタンを表示
    if (notionPages.length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'notion-tab-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteNotionPage(idx);
      };
      btn.appendChild(deleteBtn);
    }
    
    tabs.appendChild(btn);
  });
  
  if (notionPages.length < 5) {
    const add = document.createElement('button');
    add.className = 'notion-tab notion-add';
    add.textContent = '+ Add';
    add.onclick = addNotionPage;
    tabs.appendChild(add);
  }
}

function deleteNotionPage(idx) {
  if (notionPages.length <= 1) {
    alert('Cannot delete the last page');
    return;
  }
  
  if (confirm(`Delete "${notionPages[idx].name}"?`)) {
    notionPages.splice(idx, 1);
    
    // 削除したページが現在表示中だった場合、インデックスを調整
    if (notionIdx >= notionPages.length) {
      notionIdx = notionPages.length - 1;
    }
    
    localStorage.setItem('notion-pages', JSON.stringify(notionPages));
    $('notion').src = notionPages[notionIdx].url;
    renderNotionTabs();
  }
}

function switchNotionPage(idx) {
  play('snd-click');
  notionIdx = idx;
  $('notion').src = notionPages[idx].url;
  renderNotionTabs();
}

function addNotionPage() {
  if (notionPages.length >= 5) return alert('Maximum 5 pages');
  const url = prompt('Enter Notion page URL:');
  if (url) {
    const name = prompt('Enter page name:') || 'Page ' + (notionPages.length + 1);
    notionPages.push({name, url});
    localStorage.setItem('notion-pages', JSON.stringify(notionPages));
    renderNotionTabs();
  }
}

renderNotionTabs();
setInterval(() => { $('notion').src = $('notion').src; }, 300000);

// YouTube
let ytPlayer = null;
let ytPlaying = false;
let ytPlaylistId = '';

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('yt-player', {
    height: '390',
    width: '100%',
    playerVars: {
      'playsinline': 1,
      'controls': 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  setYoutubeVolume(70);
}

function onPlayerStateChange(event) {
  ytPlaying = event.data === YT.PlayerState.PLAYING;
  updateYoutubePlayPauseIcon();
  updateYoutubeControls();
}

function updateYoutubePlayPauseIcon() {
  // タブ内のアイコンを更新
  const tabPlayIcon = document.querySelector('#section-youtube .youtube-btn svg polygon');
  const tabPauseIcon1 = document.querySelector('#section-youtube .youtube-btn svg rect:nth-of-type(1)');
  const tabPauseIcon2 = document.querySelector('#section-youtube .youtube-btn svg rect:nth-of-type(2)');
  
  // 固定コントロールのアイコンを更新
  const fixedPlayIcon = document.querySelector('#youtube-fixed-controls svg polygon');
  const fixedPauseIcon1 = document.querySelector('#youtube-fixed-controls svg rect:nth-of-type(1)');
  const fixedPauseIcon2 = document.querySelector('#youtube-fixed-controls svg rect:nth-of-type(2)');
  
  if (ytPlaying) {
    // 一時停止アイコンを表示
    if (tabPlayIcon) tabPlayIcon.style.display = 'none';
    if (tabPauseIcon1) tabPauseIcon1.style.display = 'block';
    if (tabPauseIcon2) tabPauseIcon2.style.display = 'block';
    if (fixedPlayIcon) fixedPlayIcon.style.display = 'none';
    if (fixedPauseIcon1) fixedPauseIcon1.style.display = 'block';
    if (fixedPauseIcon2) fixedPauseIcon2.style.display = 'block';
  } else {
    // 再生アイコンを表示
    if (tabPlayIcon) tabPlayIcon.style.display = 'block';
    if (tabPauseIcon1) tabPauseIcon1.style.display = 'none';
    if (tabPauseIcon2) tabPauseIcon2.style.display = 'none';
    if (fixedPlayIcon) fixedPlayIcon.style.display = 'block';
    if (fixedPauseIcon1) fixedPauseIcon1.style.display = 'none';
    if (fixedPauseIcon2) fixedPauseIcon2.style.display = 'none';
  }
}
function loadYoutubePlaylist() {
  const url = $('yt-playlist').value.trim();
  if (!url) return alert('Please enter a playlist URL');
  
  const match = url.match(/[?&]list=([^&]+)/);
  if (match) {
    ytPlaylistId = match[1];
    if (ytPlayer && ytPlayer.loadPlaylist) {
      ytPlayer.loadPlaylist({
        list: ytPlaylistId,
        listType: 'playlist'
      });
    }
  } else {
    alert('Invalid playlist URL');
  }
}

function updateYoutubeControls() {
  const fixed = $('youtube-fixed-controls');
  
  // YouTubeタブ以外で、かつプレイヤーが存在する場合は常に表示
  if (currentSection !== 'youtube' && ytPlayer) {
    // プレイリストが読み込まれているか確認
    try {
      const playlist = ytPlayer.getPlaylist();
      if (playlist && playlist.length > 0) {
        fixed.classList.add('show');
      } else {
        fixed.classList.remove('show');
      }
    } catch(e) {
      // プレイリストがない場合は再生中のみ表示
      if (ytPlaying) {
        fixed.classList.add('show');
      } else {
        fixed.classList.remove('show');
      }
    }
  } else {
    // YouTubeタブ内では非表示
    fixed.classList.remove('show');
  }
}
function nextYoutube() {
  if (ytPlayer) ytPlayer.nextVideo();
}

function prevYoutube() {
  if (ytPlayer) ytPlayer.previousVideo();
}

function setYoutubeVolume(vol) {
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(vol);
    $('yt-vol-display').textContent = vol + '%';
    const fixedVol = $('youtube-volume-fixed');
    if (fixedVol) fixedVol.value = vol;
  }
}

function updateYoutubeControls() {
  const fixed = $('youtube-fixed-controls');
  if (currentSection !== 'youtube' && ytPlaying) {
    fixed.classList.add('show');
  } else {
    fixed.classList.remove('show');
  }
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
setInterval(updateYoutubeControls, 1000);
switchTimer('pomodoro');

// script.js に追加
function toggleYoutubePlay() {
  if (ytPlayer && ytPlayer.getPlayerState) {
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  }
}

function switchTimer(type) {
  // タイマーが動いている場合は停止
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  
  timerType = type;
  document.body.className = type === 'short' ? 'short-break' : type === 'long' ? 'long-break' : '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[type === 'pomodoro' ? 0 : type === 'short' ? 1 : 2].classList.add('active');
  isWork = type === 'pomodoro';
  timeLeft = initialTime = type === 'pomodoro' ? pomoT * 60 : type === 'short' ? shortT * 60 : longT * 60;
  updateTimer();
}


function toggleTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  } else {
    timerRun = true;
    $('start').textContent = 'Pause';
    updateQuickPlayIcon(true);
    timerInt = setInterval(() => {
      if (--timeLeft <= 0) {
        timerRun = false;
        clearInterval(timerInt);
        $('start').textContent = 'Start';
        updateQuickPlayIcon(false);
        
        if (isWork) {
          cycles++;
          stats.sessions++;
          stats.today++;
          stats.minutes += pomoT;
          updateStats();
          play('snd-pomo');
          showAlert('作業完了！', '休憩時間です');
          
          setTimeout(() => {
            hideAlert();
            switchTimer('short');
            toggleTimer();
          }, 3000);
          
        } else {
          play('snd-timer');
          showAlert('休憩終了！', '次の作業を始めましょう');
          
          setTimeout(() => {
            hideAlert();
            switchTimer('pomodoro');
            toggleTimer();
          }, 3000);
        }
      }
      updateTimer();
    }, 1000);
  }
}

function resetTimer() {
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  timeLeft = initialTime;
  updateTimer();
  play('snd-click');
  if (timerRun) {
    clearInterval(timerInt);
    timerRun = false;
    $('start').textContent = 'Start';
    updateQuickPlayIcon(false);
  }
  timeLeft = initialTime;
  updateTimer();
}

checkVis();
setInterval(checkVis, 1000);

let globeScene, globeCamera, globeRenderer, globeObject;
let globeMouseDown = false;
let globeMouseX = 0, globeMouseY = 0;
let globeTargetRotationX = 0, globeTargetRotationY = 0;
let globeCurrentRotationX = 0, globeCurrentRotationY = 0;

function initGlobe() {
  console.log('地球儀の初期化を開始');
  const container = document.getElementById('globe-container');
  if (!container) {
    console.error('globe-containerが見つかりません');
    return;
  }

  // THREE.jsが読み込まれているか確認
  if (typeof THREE === 'undefined') {
    console.error('THREE.jsが読み込まれていません');
    const loadingEl = document.getElementById('globe-loading');
    if (loadingEl) loadingEl.textContent = 'THREE.jsの読み込みエラー';
    return;
  }

  globeScene = new THREE.Scene();
  
  globeCamera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
  globeCamera.position.z = 2.5;

  globeRenderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  globeRenderer.setSize(container.offsetWidth, container.offsetHeight);
  globeRenderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(globeRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
  globeScene.add(ambientLight);

  console.log('SVGテクスチャの読み込みを開始');
  loadGlobeSVGTexture('./earth.svg'); 
}

function loadGlobeSVGTexture(url) {
  console.log('SVG読み込み開始:', url);
  
  fetch(url)
    .then(response => {
      console.log('Fetchレスポンス:', response.status);
      if (!response.ok) {
        throw new Error(`earth.svgが見つかりません (${response.status})`);
      }
      return response.text();
    })
    .then(svgText => {
      console.log('SVGテキスト取得成功、長さ:', svgText.length);
      const img = new Image();
      const svg = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svg);
      
      img.onload = function() {
        console.log('画像読み込み成功');
        const canvas = document.createElement('canvas');
        const targetWidth = 2048;  // サイズを小さくして読み込み速度を改善
        const targetHeight = 1024;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        URL.revokeObjectURL(svgUrl);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = globeRenderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        
        const loadingEl = document.getElementById('globe-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        
        console.log('地球儀オブジェクト作成開始');
        createGlobeObject(texture);
        setupGlobeEventListeners();
        animateGlobe();
        console.log('地球儀の初期化完了');
      };
      
      img.onerror = function(e) {
        console.error('画像読み込みエラー:', e);
        const loadingEl = document.getElementById('globe-loading');
        if (loadingEl) loadingEl.textContent = '画像の読み込みに失敗しました';
      };
      
      img.src = svgUrl;
    })
    .catch(error => {
      console.error('SVG読み込みエラー:', error);
      const loadingEl = document.getElementById('globe-loading');
      if (loadingEl) {
        loadingEl.textContent = `エラー: ${error.message}`;
      }
    });
}

function createGlobeObject(texture) {
  const geometry = new THREE.SphereGeometry(1, 128, 128);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      earthTexture: { value: texture },
      sunDirection: { value: new THREE.Vector3() },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D earthTexture;
      uniform vec3 sunDirection;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      void main() {
        vec4 texColor = texture2D(earthTexture, vUv);
        float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
        
        vec3 normal = normalize(vNormal);
        float sunDot = dot(normal, normalize(sunDirection));
        float dayNight = smoothstep(-0.05, 0.05, sunDot);
        
        vec3 dayColor = vec3(brightness);
        vec3 nightColor = vec3(1.0 - brightness);
        vec3 color = mix(nightColor, dayColor, dayNight);
        
        float fresnel = pow(1.0 - abs(dot(normal, normalize(vec3(0, 0, 1)))), 1.5);
        color *= 1.0 - fresnel * 0.2;
        
        if(sunDot > -0.2 && sunDot < 0.2) {
          float twilightFactor = 1.0 - abs(sunDot) / 0.2;
          vec3 twilightColor = vec3(0.4, 0.5, 0.7) * twilightFactor * 0.3;
          color += twilightColor;
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  globeObject = new THREE.Mesh(geometry, material);
  globeScene.add(globeObject);
}

function updateGlobeSunDirection() {
  if (!globeObject) return;
  
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const seconds = now.getUTCSeconds();
  
  const timeInHours = hours + minutes / 60 + seconds / 3600;
  const angle = (timeInHours / 24) * Math.PI * 2 - Math.PI;
  
  const sunDirection = new THREE.Vector3(
    Math.cos(angle),
    0,
    Math.sin(angle)
  );
  
  globeObject.material.uniforms.sunDirection.value = sunDirection;
}

function setupGlobeEventListeners() {
  const canvas = globeRenderer.domElement;
  
  canvas.addEventListener('mousedown', onGlobeMouseDown);
  canvas.addEventListener('mousemove', onGlobeMouseMove);
  canvas.addEventListener('mouseup', onGlobeMouseUp);
  canvas.addEventListener('mouseleave', onGlobeMouseUp);
  canvas.addEventListener('wheel', onGlobeWheel);
  canvas.addEventListener('touchstart', onGlobeTouchStart);
  canvas.addEventListener('touchmove', onGlobeTouchMove);
  canvas.addEventListener('touchend', onGlobeTouchEnd);
  
  window.addEventListener('resize', onGlobeWindowResize);
}

function onGlobeMouseDown(e) {
  globeMouseDown = true;
  globeMouseX = e.clientX;
  globeMouseY = e.clientY;
}

function onGlobeMouseMove(e) {
  if (globeMouseDown) {
    const deltaX = e.clientX - globeMouseX;
    const deltaY = e.clientY - globeMouseY;
    
    globeTargetRotationY += deltaX * 0.005;
    globeTargetRotationX += deltaY * 0.005;
    globeTargetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globeTargetRotationX));
    
    globeMouseX = e.clientX;
    globeMouseY = e.clientY;
  }
}

function onGlobeMouseUp() {
  globeMouseDown = false;
}

function onGlobeWheel(e) {
  e.preventDefault();
  globeCamera.position.z += e.deltaY * 0.002;
  globeCamera.position.z = Math.max(1.5, Math.min(6, globeCamera.position.z));
}

let globeLastTouchX = 0, globeLastTouchY = 0;
let globeLastTouchDistance = 0;

function onGlobeTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    globeLastTouchX = e.touches[0].clientX;
    globeLastTouchY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    globeLastTouchDistance = Math.sqrt(dx * dx + dy * dy);
  }
}

function onGlobeTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - globeLastTouchX;
    const deltaY = e.touches[0].clientY - globeLastTouchY;
    
    globeTargetRotationY += deltaX * 0.005;
    globeTargetRotationX += deltaY * 0.005;
    globeTargetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globeTargetRotationX));
    
    globeLastTouchX = e.touches[0].clientX;
    globeLastTouchY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const delta = distance - globeLastTouchDistance;
    globeCamera.position.z -= delta * 0.01;
    globeCamera.position.z = Math.max(1.5, Math.min(6, globeCamera.position.z));
    
    globeLastTouchDistance = distance;
  }
}

function onGlobeTouchEnd() {
  globeLastTouchDistance = 0;
}

function onGlobeWindowResize() {
  const container = document.getElementById('globe-container');
  if (!container || !globeCamera || !globeRenderer) return;
  
  globeCamera.aspect = container.offsetWidth / container.offsetHeight;
  globeCamera.updateProjectionMatrix();
  globeRenderer.setSize(container.offsetWidth, container.offsetHeight);
  globeRenderer.setPixelRatio(window.devicePixelRatio);
}

function animateGlobe() {
  requestAnimationFrame(animateGlobe);
  
  if (!globeObject) return;
  
  updateGlobeSunDirection();
  
  if (!globeMouseDown) {
    globeTargetRotationY += 0.001;
  }
  
  globeCurrentRotationX += (globeTargetRotationX - globeCurrentRotationX) * 0.1;
  globeCurrentRotationY += (globeTargetRotationY - globeCurrentRotationY) * 0.1;
  
  globeObject.rotation.x = globeCurrentRotationX;
  globeObject.rotation.y = globeCurrentRotationY;
  
  globeRenderer.render(globeScene, globeCamera);
}

// Clock セクションがアクティブになったら地球儀を初期化
const originalSwitchSection = switchSection;
switchSection = function(section) {
  originalSwitchSection(section);
  
  if (section === 'clock' && !globeObject) {
    setTimeout(initGlobe, 100);
  }
};

// ページ読み込み時に Clock セクションがアクティブなら初期化
window.addEventListener('load', () => {
  if (document.getElementById('section-clock').classList.contains('active')) {
    setTimeout(initGlobe, 100);
  }
});

// ページ読み込み時に前回のセクションを復元
window.addEventListener('DOMContentLoaded', () => {
  const lastSection = localStorage.getItem('current-section');
  if (lastSection && lastSection !== 'timer') {
    switchSection(lastSection);
  }
});

// ===== Memo-site 完全統合 (既存script.jsの最後に追加) =====

const memoSiteIcons = {
  star: '<svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  pin: '<svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  trash: '<svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

let memoSiteMemos = [];
let memoSiteCurrentMemoId = null;
let memoSiteNextId = 1;
let memoSiteCurrentFilter = 'all';
let memoSiteCurrentView = 'list';
let memoSiteCurrentSort = 'updated';
let memoSiteCurrentEditorMode = 'edit';
let memoSiteContextMenuMemoId = null;
let memoSiteCurrentColorFilter = '';
let memoSiteCurrentTagFilter = '';

function memoSiteEscapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function initMemoSiteData() {
  try {
    const storedData = localStorage.getItem('work-hub-memos-data');
    if (storedData) {
      memoSiteMemos = JSON.parse(storedData);
      memoSiteNextId = Math.max(...memoSiteMemos.map(m => m.id), 0) + 1;
      return;
    }
  } catch (e) {
    console.log('メモデータ読み込みエラー:', e);
  }
  
  memoSiteMemos = [{
    id: memoSiteNextId++,
    title: 'ようこそ！',
    content: '# Work Hub メモへようこそ！\n\n## 主な機能\n\n- リッチテキスト編集\n- ピン留め機能\n- お気に入り\n- 色分け\n- 右クリックメニュー\n- タグ削除機能\n- localStorageでデータ永続化\n\n**右クリック**でメモの操作メニューを表示！',
    tags: ['ideas'],
    favorite: false,
    pinned: true,
    archived: false,
    color: 'blue',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }];
  memoSiteSaveToStorage();
}

function memoSiteSaveToStorage() {
  try {
    localStorage.setItem('work-hub-memos-data', JSON.stringify(memoSiteMemos));
  } catch (e) {
    console.error('メモ保存エラー:', e);
  }
}

function memoSiteShowToast(message) {
  const toast = document.getElementById('memoToast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function memoSiteGetFilteredMemos(filter = '') {
  let filtered = memoSiteMemos.filter(memo => {
    const matchesSearch = memo.title.toLowerCase().includes(filter.toLowerCase()) ||
                          memo.content.toLowerCase().includes(filter.toLowerCase());
    const matchesFilter = 
      (memoSiteCurrentFilter === 'all' && !memo.archived) ||
      (memoSiteCurrentFilter === 'favorites' && memo.favorite && !memo.archived) ||
      (memoSiteCurrentFilter === 'pinned' && memo.pinned && !memo.archived) ||
      (memoSiteCurrentFilter === 'archived' && memo.archived);
    const matchesColor = !memoSiteCurrentColorFilter || memo.color === memoSiteCurrentColorFilter;
    const matchesTag = !memoSiteCurrentTagFilter || memo.tags.includes(memoSiteCurrentTagFilter);
    return matchesSearch && matchesFilter && matchesColor && matchesTag;
  });

  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    if (memoSiteCurrentSort === 'updated') {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    } else if (memoSiteCurrentSort === 'created') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (memoSiteCurrentSort === 'title') {
      return a.title.localeCompare(b.title);
    }
  });

  return filtered;
}

function memoSiteRenderMemoList(filter = '') {
  const filteredMemos = memoSiteGetFilteredMemos(filter);
  const memoList = document.getElementById('memoList');
  if (!memoList) return;
  
  memoList.className = memoSiteCurrentView === 'grid' ? 'memo-site-memo-list grid-view' : 'memo-site-memo-list';

  memoList.innerHTML = filteredMemos.map(memo => {
    const date = new Date(memo.updatedAt);
    const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    const safeTitle = memoSiteEscapeHtml(memo.title || '無題のメモ');
    const safeContent = memoSiteEscapeHtml(memo.content.substring(0, 100) || 'メモを書く...');
    
    return `
      <div class="memo-site-memo-item ${memoSiteCurrentMemoId === memo.id ? 'active' : ''} ${memo.pinned ? 'pinned' : ''}" 
           data-id="${memo.id}" data-color="${memo.color || ''}">
        <div class="memo-site-memo-item-header">
          <div class="memo-site-memo-item-title">${safeTitle}</div>
          <div class="memo-site-memo-item-actions">
            <button class="memo-site-memo-action-btn pinned ${memo.pinned ? 'active' : ''}" data-id="${memo.id}" title="ピン留め">${memoSiteIcons.pin}</button>
            <button class="memo-site-memo-action-btn favorite ${memo.favorite ? 'active' : ''}" data-id="${memo.id}" title="お気に入り">${memoSiteIcons.star}</button>
            <button class="memo-site-memo-action-btn delete" data-id="${memo.id}" title="削除">${memoSiteIcons.trash}</button>
          </div>
        </div>
        <div class="memo-site-memo-item-meta">
          <span>${dateStr}</span>
          <span>${memo.content.length}文字</span>
        </div>
        <div class="memo-site-memo-item-preview">${safeContent}</div>
        <div class="memo-site-memo-item-tags">
          ${memo.tags.map(tag => `<span class="memo-site-tag memo-site-tag-${tag}">${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  memoSiteAttachMemoListeners();
}

function memoSiteAttachMemoListeners() {
  document.querySelectorAll('.memo-site-memo-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.memo-site-memo-action-btn')) {
        memoSiteSelectMemo(parseInt(item.dataset.id));
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      memoSiteContextMenuMemoId = parseInt(item.dataset.id);
      memoSiteShowContextMenu(e.clientX, e.clientY);
    });
  });

  document.querySelectorAll('.pinned').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      memoSiteTogglePin(parseInt(btn.dataset.id));
    });
  });

  document.querySelectorAll('.favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      memoSiteToggleFavorite(parseInt(btn.dataset.id));
    });
  });

  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      memoSiteDeleteMemo(parseInt(btn.dataset.id));
    });
  });
}

function memoSiteShowContextMenu(x, y) {
  const contextMenu = document.getElementById('memoContextMenu');
  if (!contextMenu) return;
  
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.add('show');

  setTimeout(() => {
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = (y - rect.height) + 'px';
    }
  }, 0);
}

function memoSiteHideContextMenu() {
  const contextMenu = document.getElementById('memoContextMenu');
  if (contextMenu) {
    contextMenu.classList.remove('show');
  }
  memoSiteContextMenuMemoId = null;
}

function memoSiteParseMarkdown(text) {
  let html = text
    .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^\)]+\)/g, (match) => {
      return `<img src="${match.match(/\((data:image[^\)]+)\)/)[1]}" alt="uploaded image">`;
    })
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>');
  
  return html;
}

function memoSiteRenderEditor(memoId) {
  const mainEditor = document.getElementById('memoMainEditor');
  if (!mainEditor) return;
  
  const memo = memoSiteMemos.find(m => m.id === memoId);
  if (!memo) {
    mainEditor.innerHTML = `
      <div class="memo-site-empty-state">
        <div class="memo-site-empty-state-text">メモを選択するか、新しいメモを作成してください</div>
        <div class="memo-site-empty-state-hint">ショートカット: Ctrl+N で新規メモ</div>
      </div>
    `;
    return;
  }

  const stats = {
    chars: memo.content.length,
    words: memo.content.split(/\s+/).filter(w => w).length,
    lines: memo.content.split('\n').length
  };

  const safeTitle = memoSiteEscapeHtml(memo.title);
  const safeContent = memoSiteEscapeHtml(memo.content);

  mainEditor.innerHTML = `
    <div class="memo-site-editor-header">
      <input type="text" class="memo-site-editor-title" id="memoEditorTitle" placeholder="タイトルを入力..." value="${safeTitle}">
      <div class="memo-site-editor-tabs">
        <button class="memo-site-editor-tab active" data-mode="edit">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          編集
        </button>
        <button class="memo-site-editor-tab" data-mode="preview">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          プレビュー
        </button>
      </div>
      <div class="memo-site-editor-toolbar">
        <div class="memo-site-toolbar-group">
          <button class="memo-site-icon-btn" id="memoUploadBtn" title="画像をアップロード">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input type="file" id="memoFileInput" style="display:none;" accept="image/*">
          <button class="memo-site-icon-btn" id="memoLinkBtn" title="リンクを挿入">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button class="memo-site-icon-btn" id="memoDateBtn" title="日付を挿入">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
        <div class="memo-site-toolbar-divider"></div>
        <div class="memo-site-toolbar-group">
          <select class="memo-site-tag-select" id="memoTagSelect">
            <option value="">タグを追加...</option>
            <option value="work">work</option>
            <option value="personal">personal</option>
            <option value="ideas">ideas</option>
            <option value="todo">todo</option>
          </select>
          <div class="memo-site-memo-item-tags" id="memoCurrentTags">
            ${memo.tags.map(tag => `
              <span class="memo-site-tag memo-site-tag-${tag}">
                ${tag}
                <span class="memo-site-tag-remove" data-tag="${tag}">×</span>
              </span>
            `).join('')}
          </div>
        </div>
        <div class="memo-site-toolbar-divider"></div>
        <div class="memo-site-toolbar-group">
          <select class="memo-site-color-select" id="memoColorSelect">
            <option value="">色を選択...</option>
            <option value="red">赤</option>
            <option value="orange">オレンジ</option>
            <option value="yellow">黄色</option>
            <option value="green">緑</option>
            <option value="blue">青</option>
            <option value="purple">紫</option>
            <option value="pink">ピンク</option>
          </select>
        </div>
        <div class="memo-site-toolbar-divider"></div>
        <div class="memo-site-toolbar-group">
          <button class="memo-site-icon-btn" id="memoDuplicateBtn" title="複製">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="memo-site-icon-btn" id="memoExportBtn" title="エクスポート">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="memo-site-icon-btn" id="memoArchiveBtn" title="${memo.archived ? 'アーカイブ解除' : 'アーカイブ'}">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="memo-site-editor-stats">
        <span>${stats.chars} 文字</span>
        <span>${stats.words} 単語</span>
        <span>${stats.lines} 行</span>
      </div>
    </div>
    <div class="memo-site-editor-content" id="memoEditorContent">
      <textarea class="memo-site-editor-textarea" id="memoEditorTextarea" placeholder="ここにメモを書く...">${safeContent}</textarea>
    </div>
  `;

  memoSiteAttachEditorListeners(memo);
}

function memoSiteAttachEditorListeners(memo) {
  const titleInput = document.getElementById('memoEditorTitle');
  const contentInput = document.getElementById('memoEditorTextarea');
  const tagSelect = document.getElementById('memoTagSelect');
  const colorSelect = document.getElementById('memoColorSelect');
  const duplicateBtn = document.getElementById('memoDuplicateBtn');
  const exportBtn = document.getElementById('memoExportBtn');
  const archiveBtn = document.getElementById('memoArchiveBtn');
  const editorTabs = document.querySelectorAll('.memo-site-editor-tab');
  const uploadBtn = document.getElementById('memoUploadBtn');
  const fileInput = document.getElementById('memoFileInput');
  const linkBtn = document.getElementById('memoLinkBtn');
  const dateBtn = document.getElementById('memoDateBtn');

  if (!titleInput || !contentInput) return;

  if (memo.color) colorSelect.value = memo.color;

  titleInput.addEventListener('input', (e) => {
    memo.title = e.target.value;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
  });

  contentInput.addEventListener('input', (e) => {
    memo.content = e.target.value;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    memoSiteUpdateStats();
  });

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          const cursorPos = contentInput.selectionStart;
          const textBefore = contentInput.value.substring(0, cursorPos);
          const textAfter = contentInput.value.substring(cursorPos);
          contentInput.value = textBefore + `![uploaded image](${base64})` + textAfter;
          memo.content = contentInput.value;
          memo.updatedAt = new Date().toISOString();
          memoSiteSaveToStorage();
          memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
          memoSiteShowToast('画像を挿入しました');
        };
        reader.readAsDataURL(file);
      }
      fileInput.value = '';
    });
  }

  if (linkBtn) {
    linkBtn.addEventListener('click', () => {
      const url = prompt('リンクのURLを入力してください:');
      if (url) {
        const text = prompt('リンクのテキストを入力してください:', url);
        if (text !== null) {
          const cursorPos = contentInput.selectionStart;
          const textBefore = contentInput.value.substring(0, cursorPos);
          const textAfter = contentInput.value.substring(cursorPos);
          contentInput.value = textBefore + `[${text}](${url})` + textAfter;
          memo.content = contentInput.value;
          memo.updatedAt = new Date().toISOString();
          memoSiteSaveToStorage();
          memoSiteShowToast('リンクを挿入しました');
        }
      }
    });
  }

  if (dateBtn) {
    dateBtn.addEventListener('click', () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      const cursorPos = contentInput.selectionStart;
      const textBefore = contentInput.value.substring(0, cursorPos);
      const textAfter = contentInput.value.substring(cursorPos);
      contentInput.value = textBefore + dateStr + textAfter;
      memo.content = contentInput.value;
      memo.updatedAt = new Date().toISOString();
      memoSiteSaveToStorage();
      memoSiteShowToast('日付を挿入しました');
    });
  }

  if (tagSelect) {
    tagSelect.addEventListener('change', (e) => {
      if (e.target.value && !memo.tags.includes(e.target.value)) {
        memo.tags.push(e.target.value);
        memo.updatedAt = new Date().toISOString();
        memoSiteSaveToStorage();
        memoSiteRenderEditor(memo.id);
        memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
      }
      e.target.value = '';
    });
  }

  document.querySelectorAll('.memo-site-tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagToRemove = btn.dataset.tag;
      memo.tags = memo.tags.filter(tag => tag !== tagToRemove);
      memo.updatedAt = new Date().toISOString();
      memoSiteSaveToStorage();
      memoSiteRenderEditor(memo.id);
      memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
      memoSiteShowToast('タグを削除しました');
    });
  });

  if (colorSelect) {
    colorSelect.addEventListener('change', (e) => {
      memo.color = e.target.value;
      memo.updatedAt = new Date().toISOString();
      memoSiteSaveToStorage();
      memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
      memoSiteShowToast('色を変更しました');
    });
  }

  if (duplicateBtn) duplicateBtn.addEventListener('click', () => memoSiteDuplicateMemo(memo.id));
  if (exportBtn) exportBtn.addEventListener('click', () => memoSiteExportMemo(memo.id));
  if (archiveBtn) archiveBtn.addEventListener('click', () => memoSiteToggleArchive(memo.id));

  editorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      editorTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      memoSiteToggleEditorMode(tab.dataset.mode);
    });
  });

  function memoSiteUpdateStats() {
    const stats = {
      chars: memo.content.length,
      words: memo.content.split(/\s+/).filter(w => w).length,
      lines: memo.content.split('\n').length
    };
    const statsEl = document.querySelector('.memo-site-editor-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span>${stats.chars} 文字</span>
        <span>${stats.words} 単語</span>
        <span>${stats.lines} 行</span>
      `;
    }
  }
}

function memoSiteToggleEditorMode(mode) {
  memoSiteCurrentEditorMode = mode;
  const content = document.getElementById('memoEditorContent');
  const textarea = document.getElementById('memoEditorTextarea');
  
  if (mode === 'preview') {
    const currentContent = memoSiteMemos.find(m => m.id === memoSiteCurrentMemoId)?.content || '';
    content.innerHTML = `<div class="memo-site-markdown-preview">${memoSiteParseMarkdown(currentContent)}</div>`;
  } else {
    const currentContent = memoSiteMemos.find(m => m.id === memoSiteCurrentMemoId)?.content || '';
    const safeContent = memoSiteEscapeHtml(currentContent);
    content.innerHTML = `<textarea class="memo-site-editor-textarea" id="memoEditorTextarea" placeholder="ここにメモを書く...">${safeContent}</textarea>`;
    memoSiteAttachEditorListeners(memoSiteMemos.find(m => m.id === memoSiteCurrentMemoId));
  }
}

function memoSiteSelectMemo(id) {
  memoSiteCurrentMemoId = id;
  memoSiteRenderEditor(id);
  memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
}

function memoSiteCreateNewMemo() {
  const newMemo = {
    id: memoSiteNextId++,
    title: '',
    content: '',
    tags: [],
    favorite: false,
    pinned: false,
    archived: false,
    color: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoSiteMemos.unshift(newMemo);
  memoSiteSaveToStorage();
  memoSiteSelectMemo(newMemo.id);
  memoSiteShowToast('新しいメモを作成しました');
}

function memoSiteTogglePin(id) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    memo.pinned = !memo.pinned;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    memoSiteShowToast(memo.pinned ? 'ピン留めしました' : 'ピン留めを解除しました');
  }
}

function memoSiteToggleFavorite(id) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    memo.favorite = !memo.favorite;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    memoSiteShowToast(memo.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
  }
}

function memoSiteToggleArchive(id) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    memo.archived = !memo.archived;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    if (memo.archived) {
      memoSiteCurrentMemoId = null;
      memoSiteRenderEditor(null);
    }
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    memoSiteShowToast(memo.archived ? 'アーカイブしました' : 'アーカイブを解除しました');
  }
}

function memoSiteChangeColor(id, color) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    memo.color = color;
    memo.updatedAt = new Date().toISOString();
    memoSiteSaveToStorage();
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    if (memoSiteCurrentMemoId === id) {
      memoSiteRenderEditor(id);
    }
    memoSiteShowToast('色を変更しました');
  }
}

function memoSiteDeleteMemo(id) {
  if (confirm('このメモを削除しますか？')) {
    memoSiteMemos = memoSiteMemos.filter(m => m.id !== id);
    memoSiteSaveToStorage();
    if (memoSiteCurrentMemoId === id) {
      memoSiteCurrentMemoId = null;
      memoSiteRenderEditor(null);
    }
    memoSiteRenderMemoList(document.getElementById('memoSearchBox')?.value || '');
    memoSiteShowToast('メモを削除しました');
  }
}

function memoSiteDuplicateMemo(id) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    const newMemo = {
      ...memo,
      id: memoSiteNextId++,
      title: memo.title + ' (コピー)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoSiteMemos.unshift(newMemo);
    memoSiteSaveToStorage();
    memoSiteSelectMemo(newMemo.id);
    memoSiteShowToast('メモを複製しました');
  }
}

function memoSiteExportMemo(id) {
  const memo = memoSiteMemos.find(m => m.id === id);
  if (memo) {
    const content = `# ${memo.title}\n\n${memo.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${memo.title || 'memo'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    memoSiteShowToast('メモをエクスポートしました');
  }
}

// イベントリスナー設定
function memoSiteInitEventListeners() {
  const searchBox = document.getElementById('memoSearchBox');
  const newMemoBtn = document.getElementById('memoNewMemoBtn');
  const helpBtn = document.getElementById('memoHelpBtn');
  const helpModal = document.getElementById('memoHelpModal');
  const closeHelpBtn = document.getElementById('memoCloseHelpBtn');
  const sortSelect = document.getElementById('memoSortSelect');
  const contextMenu = document.getElementById('memoContextMenu');
  const colorFilter = document.getElementById('memoColorFilter');
  const tagFilter = document.getElementById('memoTagFilter');

  if (searchBox) {
    searchBox.addEventListener('input', (e) => {
      memoSiteRenderMemoList(e.target.value);
    });
  }

  if (colorFilter) {
    colorFilter.addEventListener('change', (e) => {
      memoSiteCurrentColorFilter = e.target.value;
      memoSiteRenderMemoList(searchBox?.value || '');
    });
  }

  if (tagFilter) {
    tagFilter.addEventListener('change', (e) => {
      memoSiteCurrentTagFilter = e.target.value;
      memoSiteRenderMemoList(searchBox?.value || '');
    });
  }

  if (newMemoBtn) {
    newMemoBtn.addEventListener('click', memoSiteCreateNewMemo);
  }

  if (helpBtn && helpModal && closeHelpBtn) {
    helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('show'));
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.classList.remove('show');
    });
  }

  document.querySelectorAll('.memo-site-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.memo-site-filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      memoSiteCurrentFilter = tab.dataset.filter;
      memoSiteRenderMemoList(searchBox?.value || '');
    });
  });

  document.querySelectorAll('.memo-site-control-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.memo-site-control-btn[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      memoSiteCurrentView = btn.dataset.view;
      memoSiteRenderMemoList(searchBox?.value || '');
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      memoSiteCurrentSort = e.target.value;
      memoSiteRenderMemoList(searchBox?.value || '');
    });
  }

  // コンテキストメニュー
  document.addEventListener('click', memoSiteHideContextMenu);
  if (contextMenu) {
    contextMenu.addEventListener('click', (e) => e.stopPropagation());
  }

  document.querySelectorAll('.memo-site-context-menu-item[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const color = item.dataset.color;

      if (!memoSiteContextMenuMemoId) return;

      switch(action) {
        case 'edit':
          memoSiteSelectMemo(memoSiteContextMenuMemoId);
          break;
        case 'duplicate':
          memoSiteDuplicateMemo(memoSiteContextMenuMemoId);
          break;
        case 'favorite':
          memoSiteToggleFavorite(memoSiteContextMenuMemoId);
          break;
        case 'pin':
          memoSiteTogglePin(memoSiteContextMenuMemoId);
          break;
        case 'color':
          memoSiteChangeColor(memoSiteContextMenuMemoId, color);
          break;
        case 'archive':
          memoSiteToggleArchive(memoSiteContextMenuMemoId);
          break;
        case 'export':
          memoSiteExportMemo(memoSiteContextMenuMemoId);
          break;
        case 'delete':
          memoSiteDeleteMemo(memoSiteContextMenuMemoId);
          break;
      }

      memoSiteHideContextMenu();
    });
  });

  // キーボードショートカット
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'n') {
        e.preventDefault();
        memoSiteCreateNewMemo();
      } else if (e.key === 's') {
        e.preventDefault();
        memoSiteSaveToStorage();
        memoSiteShowToast('保存しました');
      } else if (e.key === 'f') {
        e.preventDefault();
        searchBox?.focus();
      } else if (e.key === 'd') {
        e.preventDefault();
        if (memoSiteCurrentMemoId) {
          memoSiteDeleteMemo(memoSiteCurrentMemoId);
        }
      } else if (e.key === 'b') {
        e.preventDefault();
        if (memoSiteCurrentMemoId) {
          memoSiteToggleFavorite(memoSiteCurrentMemoId);
        }
      }
    }
  });
}

// Geminiチャットにボタン追加
function memoSiteAddGeminiButtons() {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.gemini-message-assistant').forEach(msg => {
      if (!msg.querySelector('.gemini-memo-actions')) {
        const content = msg.querySelector('.gemini-message-content');
        if (content) {
          const actions = document.createElement('div');
          actions.className = 'gemini-memo-actions';
          actions.style.cssText = 'margin-top:8px;display:flex;gap:8px;';
          actions.innerHTML = `
            <button class="btn" onclick="memoSiteCopyGeminiText(this)" style="padding:6px 12px;font-size:12px;background:rgba(255,255,255,0.15);border:none;border-radius:6px;color:white;cursor:pointer;display:flex;align-items:center;gap:4px;">
              <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              コピー
            </button>
            <button class="btn" onclick="memoSiteAddGeminiToMemo(this)" style="padding:6px 12px;font-size:12px;background:rgba(255,255,255,0.15);border:none;border-radius:6px;color:white;cursor:pointer;display:flex;align-items:center;gap:4px;">
              <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              メモに追加
            </button>
          `;
          msg.appendChild(actions);
        }
      }
    });
  });
  
  const geminiSection = document.getElementById('section-gemini');
  if (geminiSection) {
    observer.observe(geminiSection, { childList: true, subtree: true });
  }
}

function memoSiteCopyGeminiText(btn) {
  const msg = btn.closest('.gemini-message-assistant');
  const content = msg.querySelector('.gemini-message-content').textContent;
  navigator.clipboard.writeText(content).then(() => {
    memoSiteShowToast('クリップボードにコピーしました');
  });
}

function memoSiteAddGeminiToMemo(btn) {
  const msg = btn.closest('.gemini-message-assistant');
  const content = msg.querySelector('.gemini-message-content').textContent;
  
  const newMemo = {
    id: memoSiteNextId++,
    title: 'Gemini - ' + new Date().toLocaleString('ja-JP'),
    content: content,
    tags: ['gemini'],
    favorite: false,
    pinned: false,
    archived: false,
    color: 'purple',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  memoSiteMemos.unshift(newMemo);
  memoSiteSaveToStorage();
  memoSiteShowToast('Geminiの回答をメモに追加しました');
}

// 初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMemoSiteApp);
} else {
  initMemoSiteApp();
}

function initMemoSiteApp() {
  setTimeout(() => {
    initMemoSiteData();
    memoSiteInitEventListeners();
    memoSiteAddGeminiButtons();
    memoSiteRenderMemoList();
    
    // 自動保存（5秒ごと）
    setInterval(() => {
      if (memoSiteMemos.length > 0) {
        memoSiteSaveToStorage();
      }
    }, 5000);
  }, 500);
}