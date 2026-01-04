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
function doSearch() {
  const q = $('search').value.trim();
  if (q) {
    window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    $('search').value = '';
  }
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
  
  const progress = (timeLeft / initialTime) * 100;
  $('progress-bar').style.width = progress + '%';
  $('current-session').textContent = cycles;
  $('total-today').textContent = stats.today;
  $('next-break').textContent = isWork ? fmtTime(shortT * 60) : fmtTime(pomoT * 60);
}

function switchTimer(type) {
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
  updateTimer(); // これが必要
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
        clearInterval(timerInt);
        timerRun = false;
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
          if (sets.repeat === 0 || cycles < sets.repeat) {
            setTimeout(() => { switchTimer('short'); toggleTimer(); }, 3000);
          }
        } else {
          play('snd-timer');
          showAlert('休憩終了！', '次の作業を始めましょう');
          if (sets.repeat === 0 || cycles < sets.repeat) {
            setTimeout(() => { switchTimer('pomodoro'); toggleTimer(); }, 3000);
          }
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
  const scrollTop = document.querySelector('.content').scrollTop;
  const shouldShow = scrollTop > 200;
  
  // タイマーが動いている かつ timerタブ以外にいる場合に表示
  const showTimer = currentSection !== 'timer' && timerRun;
  const showClock = shouldShow && currentSection !== 'clock';
  
  $('float-timer').classList.toggle('show', showTimer);
  $('float-clock').classList.toggle('show', showClock);
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

 const icons = {
    star: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    pin: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

let memos = [];
let currentMemoId = null;
let nextId = 1;
let currentFilter = 'all';
let currentView = 'list';
let currentSort = 'updated';
let currentEditorMode = 'edit';
let contextMenuMemoId = null;
let currentColorFilter = '';
let currentTagFilter = '';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initData() {
    try {
        const storedData = localStorage.getItem('memos-data');
        if (storedData) {
            memos = JSON.parse(storedData);
            nextId = Math.max(...memos.map(m => m.id), 0) + 1;
            return;
        }
    } catch (e) {
        console.log('Loading from localStorage failed, using default data');
    }
    
    memos = [
        {
            id: nextId++,
            title: 'ようこそ！',
            content: '# Claft風メモアプリへようこそ！\n\n## 主な機能\n\n- リッチテキスト編集\n- ピン留め機能\n- お気に入り\n- 色分け\n- 右クリックメニュー\n- タグ削除機能\n- localStorageでデータ永続化\n\n**右クリック**でメモの操作メニューを表示！',
            tags: ['ideas'],
            favorite: false,
            pinned: true,
            archived: false,
            color: 'blue',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    saveToStorage();
}

function saveToStorage() {
    try {
        localStorage.setItem('memos-data', JSON.stringify(memos));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

const searchBox = document.getElementById('searchBox');
const newMemoBtn = document.getElementById('newMemoBtn');
const memoList = document.getElementById('memoList');
const mainEditor = document.getElementById('mainEditor');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const sortSelect = document.getElementById('sortSelect');
const contextMenu = document.getElementById('contextMenu');
const colorFilter = document.getElementById('colorFilter');
const tagFilter = document.getElementById('tagFilter');

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function getFilteredMemos(filter = '') {
    let filtered = memos.filter(memo => {
        const matchesSearch = memo.title.toLowerCase().includes(filter.toLowerCase()) ||
                            memo.content.toLowerCase().includes(filter.toLowerCase());
        const matchesFilter = 
            (currentFilter === 'all' && !memo.archived) ||
            (currentFilter === 'favorites' && memo.favorite && !memo.archived) ||
            (currentFilter === 'pinned' && memo.pinned && !memo.archived) ||
            (currentFilter === 'archived' && memo.archived);
        const matchesColor = !currentColorFilter || memo.color === currentColorFilter;
        const matchesTag = !currentTagFilter || memo.tags.includes(currentTagFilter);
        return matchesSearch && matchesFilter && matchesColor && matchesTag;
    });

    filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        if (currentSort === 'updated') {
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        } else if (currentSort === 'created') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (currentSort === 'title') {
            return a.title.localeCompare(b.title);
        }
    });

    return filtered;
}

function renderMemoList(filter = '') {
    const filteredMemos = getFilteredMemos(filter);
    memoList.className = currentView === 'grid' ? 'memo-list grid-view' : 'memo-list';

    memoList.innerHTML = filteredMemos.map(memo => {
        const date = new Date(memo.updatedAt);
        const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        const safeTitle = escapeHtml(memo.title || '無題のメモ');
        const safeContent = escapeHtml(memo.content.substring(0, 100) || 'メモを書く...');
        
        return `
            <div class="memo-item ${currentMemoId === memo.id ? 'active' : ''} ${memo.pinned ? 'pinned' : ''}" 
                 data-id="${memo.id}" data-color="${memo.color || ''}">
                <div class="memo-item-header">
                    <div class="memo-item-title">${safeTitle}</div>
                    <div class="memo-item-actions">
                        <button class="memo-action-btn pinned ${memo.pinned ? 'active' : ''}" data-id="${memo.id}" title="ピン留め">${icons.pin}</button>
                        <button class="memo-action-btn favorite ${memo.favorite ? 'active' : ''}" data-id="${memo.id}" title="お気に入り">${icons.star}</button>
                        <button class="memo-action-btn delete" data-id="${memo.id}" title="削除">${icons.trash}</button>
                    </div>
                </div>
                <div class="memo-item-meta">
                    <span>${dateStr}</span>
                    <span>${memo.content.length}文字</span>
                </div>
                <div class="memo-item-preview">${safeContent}</div>
                <div class="memo-item-tags">
                    ${memo.tags.map(tag => `<span class="tag tag-${tag}">${tag}</span>`).join('')}
                </div>
            </div>
        `;
    }).join('');

    attachMemoListeners();
}

function attachMemoListeners() {
    document.querySelectorAll('.memo-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.memo-action-btn')) {
                selectMemo(parseInt(item.dataset.id));
            }
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenuMemoId = parseInt(item.dataset.id);
            showContextMenu(e.clientX, e.clientY);
        });
    });

    document.querySelectorAll('.pinned').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePin(parseInt(btn.dataset.id));
        });
    });

    document.querySelectorAll('.favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(parseInt(btn.dataset.id));
        });
    });

    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMemo(parseInt(btn.dataset.id));
        });
    });
}

function showContextMenu(x, y) {
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

function hideContextMenu() {
    contextMenu.classList.remove('show');
    contextMenuMemoId = null;
}

document.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const color = item.dataset.color;

        if (!contextMenuMemoId) return;

        switch(action) {
            case 'edit':
                selectMemo(contextMenuMemoId);
                break;
            case 'duplicate':
                duplicateMemo(contextMenuMemoId);
                break;
            case 'favorite':
                toggleFavorite(contextMenuMemoId);
                break;
            case 'pin':
                togglePin(contextMenuMemoId);
                break;
            case 'color':
                changeColor(contextMenuMemoId, color);
                break;
            case 'archive':
                toggleArchive(contextMenuMemoId);
                break;
            case 'export':
                exportMemo(contextMenuMemoId);
                break;
            case 'delete':
                deleteMemo(contextMenuMemoId);
                break;
        }

        hideContextMenu();
    });
});

document.addEventListener('click', hideContextMenu);
contextMenu.addEventListener('click', (e) => e.stopPropagation());

function parseMarkdown(text) {
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
        .replace(/@date\(([^\)]+)\)/g, '<span class="memo-date">$1</span>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul])/gm, '<p>')
        .replace(/(?<![>])$/gm, '</p>');
    
    return html;
}

function renderEditor(memoId) {
    const memo = memos.find(m => m.id === memoId);
    if (!memo) {
        mainEditor.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-text">メモを選択するか、新しいメモを作成してください</div>
                <div class="empty-state-hint">ショートカット: Ctrl+N で新規メモ</div>
            </div>
        `;
        return;
    }

    const stats = {
        chars: memo.content.length,
        words: memo.content.split(/\s+/).filter(w => w).length,
        lines: memo.content.split('\n').length
    };

    const safeTitle = escapeHtml(memo.title);
    const safeContent = escapeHtml(memo.content);

    mainEditor.innerHTML = `
        <div class="editor-header">
            <input type="text" class="editor-title" id="editorTitle" placeholder="タイトルを入力..." value="${safeTitle}">
            <div class="editor-tabs">
                <button class="editor-tab active" data-mode="edit">
                    <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    編集
                </button>
                <button class="editor-tab" data-mode="preview">
                    <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    プレビュー
                </button>
            </div>
            <div class="editor-toolbar">
                <div class="toolbar-group">
                    <button class="icon-btn" id="uploadBtn" title="画像をアップロード">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                    </button>
                    <input type="file" id="fileInput" class="file-input-hidden" accept="image/*">
                    <button class="icon-btn" id="linkBtn" title="リンクを挿入">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                    </button>
                    <button class="icon-btn" id="dateBtn" title="日付を挿入">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </button>
                    <button class="icon-btn" id="lineBtn" title="ラインを挿入">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"/>
                        </svg>
                    </button>
                </div>
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <select class="tag-select" id="tagSelect">
                        <option value="">タグを追加...</option>
                        <option value="work">work</option>
                        <option value="personal">personal</option>
                        <option value="ideas">ideas</option>
                        <option value="todo">todo</option>
                    </select>
                    <div class="memo-item-tags" id="currentTags">
                        ${memo.tags.map(tag => `
                            <span class="tag tag-${tag}">
                                ${tag}
                                <span class="tag-remove" data-tag="${tag}">×</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <select class="color-select" id="colorSelect">
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
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <button class="icon-btn" id="duplicateBtn" title="複製">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                    <button class="icon-btn" id="exportBtn" title="エクスポート">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                    <button class="icon-btn" id="archiveBtn" title="${memo.archived ? 'アーカイブ解除' : 'アーカイブ'}">
                        <svg class="icon" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="editor-stats">
                <span>${stats.chars} 文字</span>
                <span>${stats.words} 単語</span>
                <span>${stats.lines} 行</span>
            </div>
        </div>
        <div class="editor-content" id="editorContent">
            <textarea class="editor-textarea" id="editorTextarea" placeholder="ここにメモを書く...">${safeContent}</textarea>
        </div>
    `;

    attachEditorListeners(memo);
}

function attachEditorListeners(memo) {
    const titleInput = document.getElementById('editorTitle');
    const contentInput = document.getElementById('editorTextarea');
    const tagSelect = document.getElementById('tagSelect');
    const colorSelect = document.getElementById('colorSelect');
    const duplicateBtn = document.getElementById('duplicateBtn');
    const exportBtn = document.getElementById('exportBtn');
    const archiveBtn = document.getElementById('archiveBtn');
    const editorTabs = document.querySelectorAll('.editor-tab');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const linkBtn = document.getElementById('linkBtn');
    const dateBtn = document.getElementById('dateBtn');
    const lineBtn = document.getElementById('lineBtn');

    if (memo.color) {
        colorSelect.value = memo.color;
    }

    titleInput.addEventListener('input', (e) => {
        memo.title = e.target.value;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
    });

    contentInput.addEventListener('input', (e) => {
        memo.content = e.target.value;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
        updateStats();
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

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
                saveToStorage();
                renderMemoList(searchBox.value);
                showToast('画像を挿入しました');
            };
            reader.readAsDataURL(file);
        }
        fileInput.value = '';
    });

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
                saveToStorage();
                showToast('リンクを挿入しました');
            }
        }
    });

    dateBtn.addEventListener('click', () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        const cursorPos = contentInput.selectionStart;
        const textBefore = contentInput.value.substring(0, cursorPos);
        const textAfter = contentInput.value.substring(cursorPos);
        contentInput.value = textBefore + `@date(${dateStr})` + textAfter;
        memo.content = contentInput.value;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        showToast('日付を挿入しました');
    });

    lineBtn.addEventListener('click', () => {
        const cursorPos = contentInput.selectionStart;
        const textBefore = contentInput.value.substring(0, cursorPos);
        const textAfter = contentInput.value.substring(cursorPos);
        contentInput.value = textBefore + '\n---\n' + textAfter;
        memo.content = contentInput.value;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        showToast('ラインを挿入しました');
    });

    tagSelect.addEventListener('change', (e) => {
        if (e.target.value && !memo.tags.includes(e.target.value)) {
            memo.tags.push(e.target.value);
            memo.updatedAt = new Date().toISOString();
            saveToStorage();
            renderEditor(memo.id);
            renderMemoList(searchBox.value);
        }
        e.target.value = '';
    });

    document.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagToRemove = btn.dataset.tag;
            memo.tags = memo.tags.filter(tag => tag !== tagToRemove);
            memo.updatedAt = new Date().toISOString();
            saveToStorage();
            renderEditor(memo.id);
            renderMemoList(searchBox.value);
            showToast('タグを削除しました');
        });
    });

    colorSelect.addEventListener('change', (e) => {
        memo.color = e.target.value;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
        showToast('色を変更しました');
    });

    duplicateBtn.addEventListener('click', () => duplicateMemo(memo.id));
    exportBtn.addEventListener('click', () => exportMemo(memo.id));
    archiveBtn.addEventListener('click', () => toggleArchive(memo.id));

    editorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            editorTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            toggleEditorMode(tab.dataset.mode);
        });
    });

    function updateStats() {
        const stats = {
            chars: memo.content.length,
            words: memo.content.split(/\s+/).filter(w => w).length,
            lines: memo.content.split('\n').length
        };
        document.querySelector('.editor-stats').innerHTML = `
            <span>${stats.chars} 文字</span>
            <span>${stats.words} 単語</span>
            <span>${stats.lines} 行</span>
        `;
    }
}

function toggleEditorMode(mode) {
    currentEditorMode = mode;
    const content = document.getElementById('editorContent');
    const textarea = document.getElementById('editorTextarea');
    
    if (mode === 'preview') {
        const currentContent = memos.find(m => m.id === currentMemoId)?.content || '';
        content.innerHTML = `<div class="markdown-preview">${parseMarkdown(currentContent)}</div>`;
    } else {
        const currentContent = memos.find(m => m.id === currentMemoId)?.content || '';
        const safeContent = escapeHtml(currentContent);
        content.innerHTML = `<textarea class="editor-textarea" id="editorTextarea" placeholder="ここにメモを書く...">${safeContent}</textarea>`;
        attachEditorListeners(memos.find(m => m.id === currentMemoId));
    }
}

function selectMemo(id) {
    currentMemoId = id;
    renderEditor(id);
    renderMemoList(searchBox.value);
}

function createNewMemo() {
    const newMemo = {
        id: nextId++,
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
    memos.unshift(newMemo);
    saveToStorage();
    selectMemo(newMemo.id);
    showToast('新しいメモを作成しました');
}

function togglePin(id) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        memo.pinned = !memo.pinned;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
        showToast(memo.pinned ? 'ピン留めしました' : 'ピン留めを解除しました');
    }
}

function toggleFavorite(id) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        memo.favorite = !memo.favorite;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
        showToast(memo.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
    }
}

function toggleArchive(id) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        memo.archived = !memo.archived;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        if (memo.archived) {
            currentMemoId = null;
            renderEditor(null);
        }
        renderMemoList(searchBox.value);
        showToast(memo.archived ? 'アーカイブしました' : 'アーカイブを解除しました');
    }
}

function changeColor(id, color) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        memo.color = color;
        memo.updatedAt = new Date().toISOString();
        saveToStorage();
        renderMemoList(searchBox.value);
        if (currentMemoId === id) {
            renderEditor(id);
        }
        showToast('色を変更しました');
    }
}

function deleteMemo(id) {
    if (confirm('このメモを削除しますか？')) {
        memos = memos.filter(m => m.id !== id);
        saveToStorage();
        if (currentMemoId === id) {
            currentMemoId = null;
            renderEditor(null);
        }
        renderMemoList(searchBox.value);
        showToast('メモを削除しました');
    }
}

function duplicateMemo(id) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        const newMemo = {
            ...memo,
            id: nextId++,
            title: memo.title + ' (コピー)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        memos.unshift(newMemo);
        saveToStorage();
        selectMemo(newMemo.id);
        showToast('メモを複製しました');
    }
}

function exportMemo(id) {
    const memo = memos.find(m => m.id === id);
    if (memo) {
        const content = `# ${memo.title}\n\n${memo.content}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${memo.title || 'memo'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('メモをエクスポートしました');
    }
}

searchBox.addEventListener('input', (e) => {
    renderMemoList(e.target.value);
});

colorFilter.addEventListener('change', (e) => {
    currentColorFilter = e.target.value;
    renderMemoList(searchBox.value);
});

tagFilter.addEventListener('change', (e) => {
    currentTagFilter = e.target.value;
    renderMemoList(searchBox.value);
});

newMemoBtn.addEventListener('click', createNewMemo);
helpBtn.addEventListener('click', () => {
    helpModal.classList.add('show');
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.remove('show');
});

helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.remove('show');
    }
});

document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderMemoList(searchBox.value);
    });
});

document.querySelectorAll('.control-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.control-btn[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderMemoList(searchBox.value);
    });
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderMemoList(searchBox.value);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n') {
            e.preventDefault();
            createNewMemo();
        } else if (e.key === 's') {
            e.preventDefault();
            saveToStorage();
            showToast('保存しました');
        } else if (e.key === 'f') {
            e.preventDefault();
            searchBox.focus();
        } else if (e.key === 'd') {
            e.preventDefault();
            if (currentMemoId) {
                deleteMemo(currentMemoId);
            }
        } else if (e.key === 'b') {
            e.preventDefault();
            if (currentMemoId) {
                toggleFavorite(currentMemoId);
            }
        }
    }
});

initData();
renderMemoList();

setInterval(() => {
    if (memos.length > 0) {
        saveToStorage();
    }
}, 5000);
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
  updateYoutubeControls();
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
loadSettings();

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

function updateTimer() {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  document.getElementById('timer').textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  document.getElementById('float-timer-time').textContent = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  const progress = ((initialTime - timeLeft) / initialTime) * 100;
  document.getElementById('timer-progress').style.width = progress + '%';
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

function checkVis() {
  const shouldShow = localStorage.getItem('float-timer') === 'true';
  if (!shouldShow) return;
  
  const content = document.querySelector('.content');
  const timerRect = $('timer-section').getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  
  const isVisible = timerRect.top < contentRect.bottom && timerRect.bottom > contentRect.top;
  
  $('float-timer').classList.toggle('visible', !isVisible);
}
checkVis();
setInterval(checkVis, 1000);
