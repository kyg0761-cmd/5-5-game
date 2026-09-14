// ✖️ 구구단 스피드 챌린지 로직 (2단 ~ 9단 8x8 = 64칸 타임어택)
const STORAGE_KEY = 'GUGUDAN_SPEED_RANKING_TOP10';

class GugudanSpeedGame {
  constructor() {
    this.studentNum = '';
    this.playerName = '';
    this.startTime = 0;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.checkAttempts = 0;
    this.isPlaying = false;
    this.isCleared = false;

    // 가로 및 세로 헤더 번호 (2~9단, 게임 시작 시 랜덤 셔플)
    this.rowNumbers = [2, 3, 4, 5, 6, 7, 8, 9];
    this.colNumbers = [2, 3, 4, 5, 6, 7, 8, 9];

    this.initDOM();
    this.populateAttendanceDropdown();
    this.checkUrlParameters();
    this.renderGugudanGrid();
    this.bindEvents();
    this.renderRankingsTable();
  }

  initDOM() {
    this.screens = {
      start: document.getElementById('screen-start'),
      play: document.getElementById('screen-play'),
      result: document.getElementById('screen-result')
    };

    // UI 요소
    this.playerNumSelect = document.getElementById('player-num-select');
    this.playerNameInput = document.getElementById('player-name-input');
    this.autoLoginBadge = document.getElementById('auto-login-badge');
    this.btnStart = document.getElementById('btn-start');
    this.btnShowRankings = document.getElementById('btn-show-rankings');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnResultRankings = document.getElementById('btn-result-rankings');
    this.modalRankings = document.getElementById('modal-rankings');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');
    this.btnResetRankings = document.getElementById('btn-reset-rankings');

    // 플레이 UI
    this.stopwatchDisplay = document.getElementById('stopwatch-display');
    this.progressDisplay = document.getElementById('progress-display');
    this.progressBarFill = document.getElementById('progress-bar-fill');
    this.wrongDisplay = document.getElementById('wrong-display');
    this.gugudanTable = document.getElementById('gugudan-table');
    this.btnSubmitCheck = document.getElementById('btn-submit-check');

    // 결과 요소
    this.resultPlayerName = document.getElementById('result-player-name');
    this.resultTime = document.getElementById('result-time');
    this.resultAttempts = document.getElementById('result-attempts');
    this.resultSpeed = document.getElementById('result-speed');
    this.newRecordAlert = document.getElementById('new-record-alert');
    this.rankingListBody = document.getElementById('ranking-list-body');
  }

  // 배열 랜덤 셔플 (Fisher-Yates)
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 1번 ~ 35번 출석 번호 드롭다운 옵션 생성
  populateAttendanceDropdown() {
    let options = '<option value="">번호 선택</option>';
    for (let i = 1; i <= 35; i++) {
      options += `<option value="${i}">${i}번</option>`;
    }
    this.playerNumSelect.innerHTML = options;
  }

  // URL 파라미터 감지 (?num=7&student=김민준)
  checkUrlParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const numParam = urlParams.get('num') || urlParams.get('number') || urlParams.get('id');
      const studentParam = urlParams.get('student') || urlParams.get('name') || urlParams.get('user');

      if (numParam) {
        const numVal = parseInt(numParam);
        if (numVal >= 1 && numVal <= 35) {
          this.studentNum = numVal.toString();
          this.playerNumSelect.value = this.studentNum;
        }
      }

      if (studentParam) {
        this.playerName = studentParam.trim();
        this.playerNameInput.value = this.playerName;
      } else if (this.studentNum) {
        this.playerName = `${this.studentNum}번 학생`;
        this.playerNameInput.value = this.playerName;
      }

      if (this.studentNum || studentParam) {
        this.autoLoginBadge.classList.remove('hidden');
        if (this.studentNum) {
          this.autoLoginBadge.textContent = `✨ ${this.studentNum}번 학생 연동됨`;
        } else {
          this.autoLoginBadge.textContent = `✨ 자동 연동됨`;
        }
      }
    } catch (e) {
      console.warn('URL param parse error', e);
    }
  }

  // 9x9 구구단 그리드 테이블 렌더링 (가로/세로 헤더: 무작위 섞인 2~9단, 셀: 64개)
  renderGugudanGrid() {
    let html = '<thead><tr><th class="cell-header-corner">✕</th>';
    // 상단 가로 헤더 (무작위 섞인 순서)
    for (let c = 0; c < 8; c++) {
      const colVal = this.colNumbers[c];
      html += `<th class="cell-header-top">${colVal}</th>`;
    }
    html += '</tr></thead><tbody>';

    // 8개 세로 행 (무작위 섞인 순서)
    for (let r = 0; r < 8; r++) {
      const rowVal = this.rowNumbers[r];
      html += `<tr><th class="cell-header-left">${rowVal}</th>`;
      for (let c = 0; c < 8; c++) {
        const tabIdx = r * 8 + c + 1;
        html += `
          <td id="cell-wrap-${r}-${c}">
            <input type="text" 
                   inputmode="numeric" 
                   class="gugudan-input" 
                   id="input-${r}-${c}" 
                   data-row-idx="${r}" 
                   data-col-idx="${c}" 
                   tabindex="${tabIdx}" 
                   maxlength="2" 
                   autocomplete="off">
          </td>
        `;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    this.gugudanTable.innerHTML = html;
  }

  bindEvents() {
    this.playerNumSelect.addEventListener('change', () => {
      const num = this.playerNumSelect.value;
      if (num) {
        if (!this.playerNameInput.value || this.playerNameInput.value.includes('번 학생')) {
          this.playerNameInput.value = `${num}번 학생`;
        }
      }
    });

    this.btnStart.addEventListener('click', () => this.startGame());
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startGame();
    });

    this.btnShowRankings.addEventListener('click', () => this.openRankingsModal());
    this.btnResultRankings.addEventListener('click', () => this.openRankingsModal());
    this.btnCloseModal.addEventListener('click', () => this.closeRankingsModal());
    this.btnCloseModalBottom.addEventListener('click', () => this.closeRankingsModal());
    this.btnResetRankings.addEventListener('click', () => this.resetRankings());

    this.btnRestart.addEventListener('click', () => this.showScreen('start'));
    this.btnSubmitCheck.addEventListener('click', () => this.checkAllAnswers());

    // 64개 입력 칸 키보드 내비게이션 & 입력 이벤트 바인딩
    this.gugudanTable.addEventListener('input', (e) => {
      if (e.target.classList.contains('gugudan-input')) {
        this.handleCellInput(e.target);
      }
    });

    this.gugudanTable.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('gugudan-input')) {
        this.handleCellKeydown(e, e.target);
      }
    });
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
  }

  startGame() {
    const inputName = this.playerNameInput.value.trim();
    if (!inputName && !this.playerNumSelect.value) {
      alert('출석 번호를 선택하거나 학생 이름을 입력해주세요!');
      this.playerNameInput.focus();
      return;
    }

    sounds.init();
    this.playerName = inputName || `${this.playerNumSelect.value}번 학생`;
    this.checkAttempts = 0;
    this.elapsedSeconds = 0;
    this.isPlaying = true;
    this.isCleared = false;

    // 🎲 가로/세로 헤더 순서 무작위 셔플 (매 판마다 새로운 조합으로 연습)
    this.rowNumbers = this.shuffleArray([2, 3, 4, 5, 6, 7, 8, 9]);
    this.colNumbers = this.shuffleArray([2, 3, 4, 5, 6, 7, 8, 9]);

    // 테이블 새로 렌더링 및 셀 초기화
    this.renderGugudanGrid();
    this.updateProgressUI();
    this.wrongDisplay.textContent = '0';

    this.showScreen('play');

    // 첫 번째 칸(0, 0)에 자동 포커스
    setTimeout(() => {
      const firstInput = document.getElementById('input-0-0');
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 100);

    // 스톱워치 타이머 가동 (0.1초 단위)
    this.startTime = Date.now();
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = (Date.now() - this.startTime) / 1000;
      this.stopwatchDisplay.textContent = this.formatTime(this.elapsedSeconds);
    }, 100);
  }

  formatTime(totalSec) {
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 10);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
  }

  // 셀 입력 감지 (자동 이동 제거: Tab/Enter/방향키로 직접 이동 유도)
  handleCellInput(inputEl) {
    // 숫자 이외의 문자 필터링
    inputEl.value = inputEl.value.replace(/[^0-9]/g, '');

    // 수정 시 기존 오답/정답 클래스 제거
    const td = inputEl.parentElement;
    td.classList.remove('cell-wrong', 'cell-correct');

    if (inputEl.value) {
      sounds.playType();
    }

    this.updateProgressUI();
  }

  // 키보드 내비게이션 (Tab, Enter, 상하좌우 방향키)
  handleCellKeydown(e, inputEl) {
    const r = parseInt(inputEl.getAttribute('data-row-idx'));
    const c = parseInt(inputEl.getAttribute('data-col-idx'));

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.focusCell(r, c + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.focusCell(r, c - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusCell(r + 1, c);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusCell(r - 1, c);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (r === 7 && c === 7) {
        // 마지막 칸에서 Enter 누르면 채점 버튼으로 이동
        this.btnSubmitCheck.focus();
      } else {
        this.moveToNextCell(inputEl);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // 마지막 칸에서 Tab 누르면 채점 버튼으로 유도
      if (r === 7 && c === 7) {
        e.preventDefault();
        this.btnSubmitCheck.focus();
      }
    }
  }

  focusCell(r, c) {
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = document.getElementById(`input-${r}-${c}`);
      if (target) {
        target.focus();
        target.select();
      }
    }
  }

  moveToNextCell(currentInput) {
    let r = parseInt(currentInput.getAttribute('data-row-idx'));
    let c = parseInt(currentInput.getAttribute('data-col-idx'));

    if (c < 7) {
      c++;
    } else if (r < 7) {
      r++;
      c = 0;
    }
    this.focusCell(r, c);
  }

  updateProgressUI() {
    const inputs = this.gugudanTable.querySelectorAll('.gugudan-input');
    let filledCount = 0;
    inputs.forEach(i => {
      if (i.value.trim() !== '') filledCount++;
    });

    this.progressDisplay.textContent = `${filledCount} / 64`;
    const pct = (filledCount / 64) * 100;
    this.progressBarFill.style.width = `${pct}%`;
  }

  // 📝 64칸 전체 채점 검사
  checkAllAnswers() {
    if (!this.isPlaying || this.isCleared) return;

    this.checkAttempts++;
    let wrongCount = 0;
    let firstWrongInput = null;

    // 64칸 순회 검사
    for (let r = 0; r < 8; r++) {
      const rowVal = this.rowNumbers[r];
      for (let c = 0; c < 8; c++) {
        const colVal = this.colNumbers[c];
        const expected = rowVal * colVal;
        const inputEl = document.getElementById(`input-${r}-${c}`);
        if (!inputEl) continue;

        const td = inputEl.parentElement;
        const userVal = parseInt(inputEl.value.trim());

        if (userVal === expected) {
          // 정답
          td.classList.remove('cell-wrong');
          td.classList.add('cell-correct');
        } else {
          // 🔺 오답 (빨간 펜 삼각형 표시)
          td.classList.remove('cell-correct');
          td.classList.add('cell-wrong');
          wrongCount++;
          if (!firstWrongInput) {
            firstWrongInput = inputEl;
          }
        }
      }
    }

    this.wrongDisplay.textContent = wrongCount;

    if (wrongCount === 0) {
      // 🏆 64칸 올클리어 성공!
      this.handleGameClear();
    } else {
      // ⚠️ 오답 발생 (빨간펜 표시 후 첫 번째 오답 칸으로 포커스)
      sounds.playWrong();
      if (firstWrongInput) {
        firstWrongInput.focus();
        firstWrongInput.select();
      }
    }
  }

  handleGameClear() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.isCleared = true;
    sounds.playClearFanfare();

    const finalTimeStr = this.formatTime(this.elapsedSeconds);
    const speed = (64 / this.elapsedSeconds).toFixed(1);

    this.resultPlayerName.textContent = `👤 ${this.playerName} 학생의 기록`;
    this.resultTime.textContent = finalTimeStr;
    this.resultAttempts.textContent = `${this.checkAttempts}회 채점`;
    this.resultSpeed.textContent = `${speed}칸/초`;

    // 랭킹 저장 (클리어 시간 오름차순: 빠른 시간 1위)
    const isNewRecord = this.saveRanking({
      name: this.playerName,
      timeSec: this.elapsedSeconds,
      timeStr: finalTimeStr,
      attempts: this.checkAttempts,
      date: new Date().toLocaleDateString('ko-KR')
    });

    if (isNewRecord) {
      this.newRecordAlert.classList.remove('hidden');
    } else {
      this.newRecordAlert.classList.add('hidden');
    }

    // 칭찬 포인트 웹페이지로 결과 전송
    try {
      const payload = {
        type: 'GUGUDAN_GAME_RESULT',
        studentNum: this.playerNumSelect.value || '',
        studentName: this.playerName,
        timeSec: this.elapsedSeconds,
        timeStr: finalTimeStr,
        attempts: this.checkAttempts,
        timestamp: Date.now()
      };
      localStorage.setItem('GUGUDAN_LATEST_RESULT', JSON.stringify(payload));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (e) {}

    this.showScreen('result');
  }

  // 랭킹 시스템 (낮은 시간 순 정렬)
  getRankings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveRanking(record) {
    const list = this.getRankings();
    list.push(record);
    // 시간 오름차순 정렬 (빠른 시간이 1위, 동점이면 시도 횟수 적은 순)
    list.sort((a, b) => a.timeSec - b.timeSec || a.attempts - b.attempts);

    const top10 = list.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
    this.renderRankingsTable();

    return top10.some(r => r.name === record.name && r.timeSec === record.timeSec);
  }

  renderRankingsTable() {
    const list = this.getRankings();
    if (list.length === 0) {
      this.rankingListBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-ranking">아직 등록된 기록이 없습니다. 첫 번째 스피드 챔피언이 되어보세요!</td>
        </tr>
      `;
      return;
    }

    let rows = '';
    list.forEach((item, index) => {
      const rank = index + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      rows += `
        <tr class="${rankClass}">
          <td><span class="rank-badge">${rank}</span></td>
          <td><strong>${this.escapeHtml(item.name)}</strong></td>
          <td style="color: #38bdf8; font-weight: 800; font-size:1.1rem;">⏱️ ${item.timeStr}</td>
          <td>${item.attempts}회</td>
          <td style="color: #94a3b8; font-size: 0.82rem;">${item.date || '-'}</td>
        </tr>
      `;
    });

    this.rankingListBody.innerHTML = rows;
  }

  resetRankings() {
    if (confirm('정말로 구구단 스피드 챌린지의 모든 명예의 전당 기록을 초기화하시겠습니까?')) {
      localStorage.removeItem(STORAGE_KEY);
      this.renderRankingsTable();
      alert('명예의 전당 기록이 초기화되었습니다.');
    }
  }

  openRankingsModal() {
    this.renderRankingsTable();
    this.modalRankings.classList.remove('hidden');
  }

  closeRankingsModal() {
    this.modalRankings.classList.add('hidden');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }
}

// 시작
window.addEventListener('DOMContentLoaded', () => {
  window.gugudanGame = new GugudanSpeedGame();
});
