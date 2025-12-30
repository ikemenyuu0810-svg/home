const $ = id => document.getElementById(id);
    const play = id => { const a = $(id); if(a) { a.currentTime = 0; a.play().catch(()=>{}); }};
    const pad = n => String(n).padStart(2, '0');
    const fmtTime = s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
    const fmtTime3 = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;

    let focused = null, currentSection = 'timer', nPage = 0;

    // 背景
    const bgImgs = Array.from({length: 16}, (_, i) => `background-image/bgimg-${i+1}.jpg`);
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

    // サイドバー
    function toggleSidebar() {
      $('sidebar').classList.toggle(window.innerWidth <= 1024 ? 'open' : 'collapsed');
      $('mobile-overlay').classList.toggle('show');
      play('snd-click');
    }

    // セクション切り替え
    function switchSection(section) {
      play('snd-click');
      currentSection = section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      $(`section-${section}`).classList.add('active');
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      event.target.closest('.nav-item').classList.add('active');
      if (window.innerWidth <= 1024) {
        $('sidebar').classList.remove('open');
        $('mobile-overlay').classList.remove('show');
      }
      checkVis();
    }

    // キーボードショートカット
    document.addEventListener('keydown', e => {
      if (e.target.tagName !== 'INPUT' && e.target.contentEditable !== 'true') {
        const key = e.key;
        if (key >= '1' && key <= '7') {
          const sections = ['timer', 'clock', 'weather', 'stopwatch', 'custom-timer', 'memo', 'gemini'];
          switchSection(sections[key - 1]);
        } else if (key === ' ' && currentSection === 'timer') {
          e.preventDefault();
          toggleTimer();
        }
      }
      
      if (focused) {
        if (e.ctrlKey && !e.shiftKey && e.key === 'b') { e.preventDefault(); fmt('bold'); }
        else if (e.ctrlKey && !e.shiftKey && e.key === 'u') { e.preventDefault(); fmt('underline'); }
        else if (e.ctrlKey && e.shiftKey && e.key === '>') { e.preventDefault(); fmt('larger'); }
        else if (e.ctrlKey && e.shiftKey && e.key === '<') { e.preventDefault(); fmt('smaller'); }
      }
    });

    // フォーマット
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

    // 検索
    function doSearch() {
      const q = $('search').value.trim();
      if (q) {
        window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
        $('search').value = '';
      }
    }

    // Notion
    const nUrls = [
      'https://todolist-home.notion.site/ebd//2c9ee93cc3e4800aba3ef91a7b2b0a31?v=2c9ee93cc3e480868d75000c8bfe4b7d',
      'https://todolist-home.notion.site/ebd//2c9ee93cc3e480d0a9feecd8ab2bc460'
    ];
    function notionNav(d) {
      play('snd-click');
      nPage = d > 0 ? 1 : 0;
      $('notion').src = nUrls[nPage];
      $('n-prev').style.display = nPage ? 'inline-block' : 'none';
      $('n-next').style.display = nPage ? 'none' : 'inline-block';
    }
    setInterval(() => { $('notion').src = $('notion').src; }, 300000);

    // アラート
    function showAlert(title, msg) {
      $('alert-title').textContent = title;
      $('alert-msg').textContent = msg;
      $('alert').classList.add('show');
    }
    function hideAlert() { $('alert').classList.remove('show'); }

    // 設定
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
    let cycles = 0, isWork = true;

    function updateTimer() {
      const str = fmtTime(timeLeft);
      $('timer').textContent = str;
      $('float-timer-time').textContent = str;
    }

    function switchTimer(type) {
      if (timerRun) {
        clearInterval(timerInt);
        timerRun = false;
        $('start').textContent = 'Start';
      }
      timerType = type;
      document.body.className = type === 'short' ? 'short-break' : type === 'long' ? 'long-break' : '';
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-btn')[type === 'pomodoro' ? 0 : type === 'short' ? 1 : 2].classList.add('active');
      timeLeft = type === 'pomodoro' ? (isWork = true, pomoT * 60) : type === 'short' ? (isWork = false, shortT * 60) : (isWork = false, longT * 60);
      updateTimer();
    }

    function toggleTimer() {
      play('snd-click');
      if (timerRun) {
        clearInterval(timerInt);
        timerRun = false;
        $('start').textContent = 'Start';
      } else {
        timerRun = true;
        $('start').textContent = 'Stop';
        timerInt = setInterval(() => {
          if (--timeLeft <= 0) {
            clearInterval(timerInt);
            timerRun = false;
            $('start').textContent = 'Start';
            if (isWork) {
              cycles++;
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
      }
      cycles = 0;
      switchTimer(timerType);
    }

    // フローティング表示制御
    function checkVis() {
      const scrollTop = document.querySelector('.content').scrollTop;
      const shouldShow = scrollTop > 200;
      $('float-timer').classList.toggle('show', shouldShow && currentSection !== 'timer');
      $('float-clock').classList.toggle('show', shouldShow && currentSection !== 'clock');
    }

    document.querySelector('.content').addEventListener('scroll', checkVis);
    window.addEventListener('resize', checkVis);

    // Custom Timer
    let ctTime = 0, ctInt = null, ctRun = false;
    function updateCT() { $('ct').textContent = fmtTime3(ctTime); }
    function toggleCT() {
      play('snd-click');
      if (ctRun) {
        clearInterval(ctInt);
        ctRun = false;
        $('ct-btn').textContent = 'Start';
      } else {
        if (ctTime === 0) {
          ctTime = (parseInt($('ct-h').value) || 0) * 3600 + (parseInt($('ct-m').value) || 0) * 60 + (parseInt($('ct-s').value) || 0);
          if (ctTime === 0) return alert('Please set the time');
        }
        ctRun = true;
        $('ct-btn').textContent = 'Stop';
        ctInt = setInterval(() => {
          if (--ctTime <= 0) {
            clearInterval(ctInt);
            ctRun = false;
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
        $('sw-btn').textContent = 'Stop';
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

    // Memo
    const memo = $('memo');
    if (localStorage.memo) memo.innerHTML = localStorage.memo;
    function saveMemo() { localStorage.memo = memo.innerHTML; }
    function clearMemo() {
      if (confirm('Clear all notes?')) {
        memo.innerHTML = '';
        localStorage.removeItem('memo');
      }
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

    // Weather
    function loadWeather() {
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=35.85272206403399&lon=136.28673448772105&appid=8eb6dc5492a964ea79dd0ef92f1ae01c&units=metric&lang=ja`)
        .then(r => r.json())
        .then(d => {
          $('w-icon').src = `./weather-svg/${d.weather[0].icon}.svg`;
          $('w-icon').style.display = 'block';
          $('w-desc').textContent = d.weather[0].description;
          $('w-temp').textContent = Math.round(d.main.temp) + '°';
          $('w-max').textContent = Math.round(d.main.temp_max);
          $('w-min').textContent = Math.round(d.main.temp_min);
          $('w-loc').textContent = d.name || '指定地点';
        })
        .catch(e => { $('w-desc').textContent = 'Error loading weather'; });
    }
    loadWeather();
    setInterval(loadWeather, 1800000);

    // Gemini
    function sendGemini() {
      const msg = $('gemini').textContent.trim();
      if (!msg) return;
      $('gemini').textContent = '';
      console.log('Message sent to Gemini:', msg);
    }

    // 初期化
    updateTimer();
    updateCT();
    updateSW();
    checkVis();

    // レスポンシブ
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        $('sidebar').classList.remove('open');
        $('mobile-overlay').classList.remove('show');
        $('mobile-menu').style.display = 'none';
      } else {
        $('mobile-menu').style.display = 'flex';
      }
    });

    // 初期表示設定
    if (window.innerWidth <= 1024) {
      $('mobile-menu').style.display = 'flex';
    }