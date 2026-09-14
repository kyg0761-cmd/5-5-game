// ✖️ 구구단 스피드 챌린지 5단계 게임 로직
const PROGRESS_STORAGE_KEY = 'GUGUDAN_STUDENT_STAGES_V1';
const RANKINGS_STORAGE_KEY = 'GUGUDAN_SPEED_RANKINGS_TOP10';

const GUGUDAN_STAGES = [
  {
    id: 1,
    name: '1단계',
    title: '초급 (3x3)',
    size: 3,
    totalCells: 9,
    description: '3단 분량 (9칸)',
    targetTimeSec: 120,
    targetTimeStr: '2분 이내',
    icon: '🌱'
  },
  {
    id: 2,
    name: '2단계',
    title: '중급 (5x5)',
    size: 5,
    totalCells: 25,
    description: '5단 분량 (25칸)',
    targetTimeSec: 120,
    targetTimeStr: '2분 이내',
    icon: '🌿'
  },
  {
    id: 3,
    name: '3단계',
    title: '상급 (6x6)',
    size: 6,
    totalCells: 36,
    description: '6단 분량 (36칸)',
    targetTimeSec: 120,
    targetTimeStr: '2분 이내',
    icon: '🌳'
  },
  {
    id: 4,
    name: '4단계',
    title: '마스터 (7x7)',
    size: 7,
    totalCells: 49,
    description: '7단 분량 (49칸)',
    targetTimeSec: 120,
    targetTimeStr: '2분 이내',
    icon: '🔥'
  },
  {
    id: 5,
    name: '5단계',
    title: '챔피언 (8x8)',
    size: 8,
    totalCells: 64,
    description: '전체 정복 (64칸)',
    targetTimeSec: 120,
    targetTimeStr: '2분 이내',
    icon: '👑'
  }
];

class GugudanSpeedGame {
  constructor() {
    this.studentNum = '';
    this.playerName = '';
    this.currentStageId = 1;
    this.startTime = 0;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.checkAttempts = 0;
    this.isPlaying = false;
    this.isCleared = false;
    this.selectedRankTab = 'all';

    // 현재 게임의 가로 및 세로 헤더 번호 (2~9단 중 Stage size개 무작위 샘플)
    this.rowNumbers = [];
    this.colNumbers = [];

    this.initDOM();
    this.populateAttendanceDropdown();
    this.checkUrlParameters();
    this.renderStageSelectGrid();
    this.bindEvents();
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
    this.stageGrid = document.getElementById('stage-grid');
    this.btnStart = document.getElementById('btn-start');
    this.btnShowRankings = document.getElementById('btn-show-rankings');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnNextStage = document.getElementById('btn-next-stage');
    this.btnResultRankings = document.getElementById('btn-result-rankings');
    this.modalRankings = document.getElementById('modal-rankings');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');
    this.btnResetRankings = document.getElementById('btn-reset-rankings');
    this.rankingTabs = document.getElementById('ranking-tabs');

    // 플레이 UI
    this.currentStageBadge = document.getElementById('current-stage-badge');
    this.currentStageTarget = document.getElementById('current-stage-target');
    this.stopwatchDisplay = document.getElementById('stopwatch-display');
    this.progressDisplay = document.getElementById('progress-display');
    this.progressBarFill = document.getElementById('progress-bar-fill');
    this.wrongDisplay = document.getElementById('wrong-display');
    this.gugudanTable = document.getElementById('gugudan-table');
    this.btnSubmitCheck = document.getElementById('btn-submit-check');

    // 결과 요소
    this.resultBadgeClear = document.getElementById('result-badge-clear');
    this.resultTitle = document.getElementById('result-title');
    this.resultPlayerName = document.getElementById('result-player-name');
    this.resultTime = document.getElementById('result-time');
    this.resultTotalCells = document.getElementById('result-total-cells');
    this.resultAttempts = document.getElementById('result-attempts');
    this.resultSpeed = document.getElementById('result-speed');
    this.stageUnlockBanner = document.getElementById('stage-unlock-banner');
    this.stageTimeWarning = document.getElementById('stage-time-warning');
    this.newRecordAlert = document.getElementById('new-record-alert');
    this.rankingListBody = document.getElementById('ranking-list-body');
  }

  // 1번 ~ 35번 출석 번호 드롭다운 옵션 생성
  populateAttendanceDropdown() {
    let options = '<option value="">번호 선택</option>';
    for (let i = 1; i <= 35; i++) {
      options += `<option value="${i}">${i}번</option>`;
    }
    this.playerNumSelect.innerHTML = options;
  }

  // 학생 식별 키
  getStudentIdentifier() {
    const num = this.playerNumSelect.value;
    const name = this.playerNameInput.value.trim();
    if (num) {
      return `num_${num}`;
    }
    return name ? `name_${name}` : 'guest_student';
  }

  // 학생별 진행 상태 (해금 단계 & 최고 클리어 기록)
  getStudentProgress(customKey) {
    const studentKey = customKey || this.getStudentIdentifier();
    try {
      const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      if (!allData[studentKey]) {
        allData[studentKey] = {
          unlockedStage: 1, // 1단계 기본 해금
          bestTimes: {}
        };
      }
      return allData[studentKey];
    } catch (e) {
      return { unlockedStage: 1, bestTimes: {} };
    }
  }

  saveStudentProgress(stageId, clearTimeSec) {
    const studentKey = this.getStudentIdentifier();
    try {
      const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      if (!allData[studentKey]) {
        allData[studentKey] = { unlockedStage: 1, bestTimes: {} };
      }

      const cur = allData[studentKey];
      if (!cur.bestTimes) cur.bestTimes = {};

      const prevBest = cur.bestTimes[stageId];
      if (!prevBest || clearTimeSec < prevBest) {
        cur.bestTimes[stageId] = clearTimeSec;
      }

      // ⏱️ 2분 (120초) 이내 클리어 시 다음 단계 해금!
      let unlockedNext = false;
      if (clearTimeSec <= 120 && stageId < 5) {
        if (cur.unlockedStage <= stageId) {
          cur.unlockedStage = stageId + 1;
          unlockedNext = true;
        }
      }

      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
      this.renderStageSelectGrid();
      return { unlockedNext, newMaxStage: cur.unlockedStage };
    } catch (e) {
      console.warn('Save progress error', e);
      return { unlockedNext: false, newMaxStage: 1 };
    }
  }

  // URL 파라미터 감지 (?num=7&student=김민준&stage=2)
  checkUrlParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const numParam = urlParams.get('num') || urlParams.get('number') || urlParams.get('id');
      const studentParam = urlParams.get('student') || urlParams.get('name') || urlParams.get('user');
      const stageParam = urlParams.get('stage');

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

      const progress = this.getStudentProgress();
      this.currentStageId = progress.unlockedStage || 1;

      if (stageParam && parseInt(stageParam) >= 1 && parseInt(stageParam) <= 5) {
        const reqStage = parseInt(stageParam);
        if (reqStage <= progress.unlockedStage) {
          this.currentStageId = reqStage;
        }
      }
    } catch (e) {
      console.warn('URL param parse error', e);
    }
  }

  // 5단계 스테이지 선택 카드 UI 렌더링
  renderStageSelectGrid() {
    const progress = this.getStudentProgress();
    const unlockedMax = progress.unlockedStage || 1;
    const bestTimes = progress.bestTimes || {};

    let html = '';
    GUGUDAN_STAGES.forEach(st => {
      const isLocked = st.id > unlockedMax;
      const isSelected = st.id === this.currentStageId;
      const best = bestTimes[st.id];
      const isCleared = !!best;

      let cardClass = 'stage-card';
      if (isLocked) cardClass += ' locked';
      if (isSelected) cardClass += ' selected';
      if (isCleared) cardClass += ' cleared';

      let statusBadge = '';
      if (isLocked) {
        statusBadge = '<span class="stage-status-badge">🔒 잠김</span>';
      } else if (isCleared) {
        statusBadge = `<span class="stage-status-badge">⭐ ${this.formatTime(best)}</span>`;
      } else if (isSelected) {
        statusBadge = '<span class="stage-status-badge">👉 선택됨</span>';
      } else {
        statusBadge = '<span class="stage-status-badge" style="color:#38bdf8;">도전 가능</span>';
      }

      html += `
        <div class="${cardClass}" data-stage-id="${st.id}">
          <div class="stage-card-icon">${st.icon}</div>
          <div class="stage-num-badge">${st.name}</div>
          <div class="stage-size-text">${st.size}x${st.size} (${st.totalCells}칸)</div>
          <div class="stage-desc-text">목표: 2분 이내</div>
          ${statusBadge}
        </div>
      `;
    });

    this.stageGrid.innerHTML = html;

    // 단계 카드 클릭 이벤트
    this.stageGrid.querySelectorAll('.stage-card').forEach(card => {
      card.addEventListener('click', () => {
        const sId = parseInt(card.getAttribute('data-stage-id'));
        if (sId > unlockedMax) {
          sounds.playWrong();
          alert(`🔒 ${sId}단계는 잠겨있습니다!\n이전 단계를 2분(120초) 이내에 먼저 클리어해야 도전할 수 있습니다.`);
          return;
        }
        sounds.playPop();
        this.currentStageId = sId;
        this.renderStageSelectGrid();
      });
    });
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

  // 2~9단 중 stageSize개의 무작위 숫자 배열 추출
  pickRandomNumbers(size) {
    const all = [2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = this.shuffleArray(all);
    return shuffled.slice(0, size);
  }

  // 선택된 단계(NxN)에 맞게 구구단 그리드 테이블 렌더링
  renderGugudanGrid() {
    const currentStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    const N = currentStage.size;

    this.gugudanTable.className = `gugudan-table size-${N}`;

    let html = '<thead><tr><th class="cell-header-corner">✕</th>';
    // 상단 가로 헤더 (무작위 섞인 순서)
    for (let c = 0; c < N; c++) {
      const colVal = this.colNumbers[c];
      html += `<th class="cell-header-top">${colVal}</th>`;
    }
    html += '</tr></thead><tbody>';

    // N개 세로 행 (무작위 섞인 순서)
    for (let r = 0; r < N; r++) {
      const rowVal = this.rowNumbers[r];
      html += `<tr><th class="cell-header-left">${rowVal}</th>`;
      for (let c = 0; c < N; c++) {
        const tabIdx = r * N + c + 1;
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
      this.renderStageSelectGrid();
    });

    this.playerNameInput.addEventListener('input', () => {
      this.renderStageSelectGrid();
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

    this.btnRestart.addEventListener('click', () => {
      this.renderStageSelectGrid();
      this.showScreen('start');
    });

    this.btnNextStage.addEventListener('click', () => {
      if (this.currentStageId < 5) {
        this.currentStageId++;
        this.renderStageSelectGrid();
        this.startGame();
      }
    });

    this.btnSubmitCheck.addEventListener('click', () => this.checkAllAnswers());

    // 입력 칸 키보드 내비게이션 & 입력 이벤트 바인딩
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

    // 랭킹 탭 전환 이벤트
    if (this.rankingTabs) {
      this.rankingTabs.querySelectorAll('.rank-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.rankingTabs.querySelectorAll('.rank-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedRankTab = btn.getAttribute('data-stage');
          this.renderRankingsTable();
        });
      });
    }
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

    const currentStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    const N = currentStage.size;

    // 🎲 2~9단 중 N개의 가로/세로 숫자 무작위 추출 및 셔플
    this.rowNumbers = this.pickRandomNumbers(N);
    this.colNumbers = this.pickRandomNumbers(N);

    // 상단 스탯 업데이트
    this.currentStageBadge.textContent = `${currentStage.name} (${N}x${N})`;
    this.currentStageTarget.textContent = `목표: 2분 이내`;
    this.stopwatchDisplay.textContent = '00:00.0';
    this.progressDisplay.textContent = `0 / ${currentStage.totalCells}`;
    this.progressBarFill.style.width = '0%';
    this.wrongDisplay.textContent = '0';

    // 테이블 렌더링
    this.renderGugudanGrid();

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

  // 셀 입력 감지 (수동 Tab/Enter/방향키 이동 유도)
  handleCellInput(inputEl) {
    inputEl.value = inputEl.value.replace(/[^0-9]/g, '');

    const td = inputEl.parentElement;
    td.classList.remove('cell-wrong', 'cell-correct');

    if (inputEl.value) {
      sounds.playType();
    }

    this.updateProgressUI();
  }

  // 키보드 내비게이션 (Tab, Enter, 상하좌우 방향키)
  handleCellKeydown(e, inputEl) {
    const currentStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    const N = currentStage.size;
    const r = parseInt(inputEl.getAttribute('data-row-idx'));
    const c = parseInt(inputEl.getAttribute('data-col-idx'));

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.focusCell(r, c + 1, N);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.focusCell(r, c - 1, N);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusCell(r + 1, c, N);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusCell(r - 1, c, N);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (r === N - 1 && c === N - 1) {
        this.btnSubmitCheck.focus();
      } else {
        this.moveToNextCell(inputEl, N);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (r === N - 1 && c === N - 1) {
        e.preventDefault();
        this.btnSubmitCheck.focus();
      }
    }
  }

  focusCell(r, c, N) {
    if (r >= 0 && r < N && c >= 0 && c < N) {
      const target = document.getElementById(`input-${r}-${c}`);
      if (target) {
        target.focus();
        target.select();
      }
    }
  }

  moveToNextCell(currentInput, N) {
    let r = parseInt(currentInput.getAttribute('data-row-idx'));
    let c = parseInt(currentInput.getAttribute('data-col-idx'));

    if (c < N - 1) {
      c++;
    } else if (r < N - 1) {
      r++;
      c = 0;
    }
    this.focusCell(r, c, N);
  }

  updateProgressUI() {
    const currentStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    const total = currentStage.totalCells;
    const inputs = this.gugudanTable.querySelectorAll('.gugudan-input');
    let filledCount = 0;
    inputs.forEach(i => {
      if (i.value.trim() !== '') filledCount++;
    });

    this.progressDisplay.textContent = `${filledCount} / ${total}`;
    const pct = (filledCount / total) * 100;
    this.progressBarFill.style.width = `${pct}%`;
  }

  // 📝 NxN 전체 채점 검사
  checkAllAnswers() {
    if (!this.isPlaying || this.isCleared) return;

    const currentStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    const N = currentStage.size;

    this.checkAttempts++;
    let wrongCount = 0;
    let firstWrongInput = null;

    // NxN 순회 검사
    for (let r = 0; r < N; r++) {
      const rowVal = this.rowNumbers[r];
      for (let c = 0; c < N; c++) {
        const colVal = this.colNumbers[c];
        const expected = rowVal * colVal;
        const inputEl = document.getElementById(`input-${r}-${c}`);
        if (!inputEl) continue;

        const td = inputEl.parentElement;
        const userVal = parseInt(inputEl.value.trim());

        if (userVal === expected) {
          td.classList.remove('cell-wrong');
          td.classList.add('cell-correct');
        } else {
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
      // 🏆 올클리어 성공!
      this.handleGameClear(currentStage);
    } else {
      // ⚠️ 오답 발생 (빨간펜 표시 후 첫 번째 오답 칸으로 포커스)
      sounds.playWrong();
      if (firstWrongInput) {
        firstWrongInput.focus();
        firstWrongInput.select();
      }
    }
  }

  handleGameClear(currentStage) {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.isCleared = true;
    sounds.playClearFanfare();

    const finalTimeStr = this.formatTime(this.elapsedSeconds);
    const speed = (currentStage.totalCells / this.elapsedSeconds).toFixed(1);

    this.resultTitle.textContent = `${currentStage.name} (${currentStage.size}x${currentStage.size}) 정복 완료!`;
    this.resultPlayerName.textContent = `👤 ${this.playerName} 학생의 기록`;
    this.resultTime.textContent = finalTimeStr;
    this.resultTotalCells.textContent = `${currentStage.totalCells}칸`;
    this.resultAttempts.textContent = `${this.checkAttempts}회 채점`;
    this.resultSpeed.textContent = `${speed}칸/초`;

    // 학생 진행 상황 저장 및 2분 이내 해금 여부 판정
    const saveResult = this.saveStudentProgress(currentStage.id, this.elapsedSeconds);

    if (this.elapsedSeconds <= 120) {
      // 2분 이내 클리어
      if (saveResult.unlockedNext) {
        this.stageUnlockBanner.innerHTML = `🔓 <strong>축하합니다! 2분 안에 통과하여 ${currentStage.id + 1}단계가 해금되었습니다!</strong>`;
        this.stageUnlockBanner.classList.remove('hidden');
      } else if (currentStage.id === 5) {
        this.stageUnlockBanner.innerHTML = `👑 <strong>대단합니다! 최종 5단계(8x8 64칸)까지 2분 이내 완전 정복을 달성했습니다!</strong>`;
        this.stageUnlockBanner.classList.remove('hidden');
      } else {
        this.stageUnlockBanner.innerHTML = `⚡ <strong>2분 이내 통과 성공! 멋진 연산 속도입니다!</strong>`;
        this.stageUnlockBanner.classList.remove('hidden');
      }
      this.stageTimeWarning.classList.add('hidden');

      if (currentStage.id < 5) {
        this.btnNextStage.textContent = `🚀 ${currentStage.id + 1}단계 도전하기`;
        this.btnNextStage.classList.remove('hidden');
      } else {
        this.btnNextStage.classList.add('hidden');
      }
    } else {
      // 2분 초과 클리어
      this.stageUnlockBanner.classList.add('hidden');
      this.stageTimeWarning.innerHTML = `⏱️ 클리어 성공! (다음 단계 해금을 위해서는 <strong>2분(02:00.0) 이내</strong>에 통과해야 합니다)`;
      this.stageTimeWarning.classList.remove('hidden');

      const progress = this.getStudentProgress();
      if (progress.unlockedStage > currentStage.id && currentStage.id < 5) {
        this.btnNextStage.textContent = `🚀 ${currentStage.id + 1}단계 도전하기`;
        this.btnNextStage.classList.remove('hidden');
      } else {
        this.btnNextStage.classList.add('hidden');
      }
    }

    // 랭킹 저장 (클리어 시간 오름차순: 빠른 시간 1위)
    const isNewRecord = this.saveRanking({
      stageId: currentStage.id,
      stageName: `${currentStage.name}(${currentStage.size}x${currentStage.size})`,
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

    // 칭찬 포인트 웹페이지 연동
    try {
      const payload = {
        type: 'GUGUDAN_GAME_RESULT',
        studentNum: this.playerNumSelect.value || '',
        studentName: this.playerName,
        stage: currentStage.id,
        stageName: currentStage.name,
        timeSec: this.elapsedSeconds,
        timeStr: finalTimeStr,
        attempts: this.checkAttempts,
        isQualified: this.elapsedSeconds <= 120,
        timestamp: Date.now()
      };
      localStorage.setItem('GUGUDAN_LATEST_RESULT', JSON.stringify(payload));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (e) {}

    this.showScreen('result');
  }

  // 랭킹 시스템
  getRankings() {
    try {
      const data = localStorage.getItem(RANKINGS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveRanking(record) {
    const list = this.getRankings();
    list.push(record);
    // 시간 오름차순 정렬 (빠른 시간이 1위)
    list.sort((a, b) => a.timeSec - b.timeSec || a.attempts - b.attempts);

    const top50 = list.slice(0, 50);
    localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(top50));

    return top50.some(r => r.name === record.name && r.stageId === record.stageId && r.timeSec === record.timeSec);
  }

  renderRankingsTable() {
    const list = this.getRankings();
    let filtered = list;
    if (this.selectedRankTab !== 'all') {
      const targetStageId = parseInt(this.selectedRankTab);
      filtered = list.filter(item => item.stageId === targetStageId);
    }

    if (filtered.length === 0) {
      this.rankingListBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-ranking">아직 등록된 기록이 없습니다. 첫 번째 스피드 챔피언이 되어보세요!</td>
        </tr>
      `;
      return;
    }

    let rows = '';
    filtered.slice(0, 10).forEach((item, index) => {
      const rank = index + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      rows += `
        <tr class="${rankClass}">
          <td><span class="rank-badge">${rank}</span></td>
          <td><span class="rank-stage-tag">${this.escapeHtml(item.stageName || `${item.stageId}단계`)}</span></td>
          <td><strong>${this.escapeHtml(item.name)}</strong></td>
          <td style="color: #38bdf8; font-weight: 800; font-size:1.05rem;">⏱️ ${item.timeStr}</td>
          <td>${item.attempts}회</td>
          <td style="color: #94a3b8; font-size: 0.82rem;">${item.date || '-'}</td>
        </tr>
      `;
    });

    this.rankingListBody.innerHTML = rows;
  }

  resetRankings() {
    if (confirm('정말로 구구단 스피드 챌린지의 모든 명예의 전당 기록을 초기화하시겠습니까?')) {
      localStorage.removeItem(RANKINGS_STORAGE_KEY);
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
