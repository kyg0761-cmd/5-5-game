// ✖️ 구구단 스피드 챌린지 5단계 게임 로직
const PROGRESS_STORAGE_KEY = 'GUGUDAN_STUDENT_STAGES_V1';
const RANKINGS_STORAGE_KEY = 'GUGUDAN_SPEED_RANKINGS_TOP10';
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzmwnxxN6B1PjwcE3Q8wZkLCpk03-8oN9LOMt9H26Gr7pJI-AQ7wi1QndbDWYCZ_-aMUQ/exec';

// 🔑 학생 고유 식별 키 정규화 함수 (번호/이름 중복 방지)
function normalizeStudentKey(num, name, identifier) {
  num = (num || "").toString().trim();
  name = (name || "").toString().trim();
  identifier = (identifier || "").toString().trim();

  const mNum = num.match(/^(\d+)$/);
  if (mNum) return "student_num_" + parseInt(mNum[1], 10);

  const mIdent = identifier.match(/num_(\d+)/i);
  if (mIdent) return "student_num_" + parseInt(mIdent[1], 10);

  const mName = name.match(/(?:student|^|학생\s*)(\d+)(?:번|\s*학생|$)/i);
  if (mName) return "student_num_" + parseInt(mName[1], 10);

  const cleanName = (name || identifier || "guest").replace(/\s+/g, "").toLowerCase();
  return "student_name_" + cleanName;
}

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

    // ☁️ 클라우드(구글 스프레드시트) 실시간 랭킹 및 진행상황 동기화
    this.syncCloudData();
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
    this.btnRetryStage = document.getElementById('btn-retry-stage');
    this.btnNextStage = document.getElementById('btn-next-stage');
    this.btnResultRankings = document.getElementById('btn-result-rankings');
    this.modalRankings = document.getElementById('modal-rankings');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');
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

  // 출석 번호 드롭다운 옵션 생성 (남학생 1~14번, 여학생 51~61번)
  populateAttendanceDropdown() {
    let options = '<option value="">번호 선택</option>';
    options += '<optgroup label="남학생 (1~14번)">';
    for (let i = 1; i <= 14; i++) {
      options += `<option value="${i}">${i}번</option>`;
    }
    options += '</optgroup>';
    options += '<optgroup label="여학생 (51~61번)">';
    for (let i = 51; i <= 61; i++) {
      options += `<option value="${i}">${i}번</option>`;
    }
    options += '</optgroup>';
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

  // ☁️ 클라우드(구글 스프레드시트) 진행 상태 및 명예의 전당 동기화
  async syncCloudData() {
    try {
      // 1. 전체 명예의 전당 랭킹 불러오기
      fetch(`${GAS_API_URL}?action=getGugudanRankings`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.rankings && data.rankings.all) {
            localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(data.rankings.all));
          }
        })
        .catch(e => console.log('Gugudan cloud rankings sync error', e));

      // 2. 학생의 개인 클라우드 해금 진행상황 불러오기
      const ident = this.getStudentIdentifier();
      if (ident && ident !== 'guest_student') {
        const numVal = this.playerNumSelect.value || '';
        const nameVal = this.playerNameInput.value.trim() || '';
        fetch(`${GAS_API_URL}?action=getStudentGameProgress&identifier=${encodeURIComponent(ident)}&num=${encodeURIComponent(numVal)}&name=${encodeURIComponent(nameVal)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.gugudan) {
              const localProg = this.getStudentProgress();
              const cloudUnlocked = data.gugudan.unlockedStage || 1;
              const cloudBestTimes = data.gugudan.bestTimes || {};

              let updated = false;
              if (cloudUnlocked > (localProg.unlockedStage || 1)) {
                localProg.unlockedStage = cloudUnlocked;
                updated = true;
              }

              if (!localProg.bestTimes) localProg.bestTimes = {};
              for (let s = 1; s <= 5; s++) {
                if (cloudBestTimes[s] && (!localProg.bestTimes[s] || cloudBestTimes[s] < localProg.bestTimes[s])) {
                  localProg.bestTimes[s] = cloudBestTimes[s];
                  updated = true;
                }
              }

              if (updated) {
                const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
                allData[ident] = localProg;
                localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
                this.renderStageSelectGrid();
              }
            }
          })
          .catch(e => console.log('Gugudan cloud student progress sync error', e));
      }
    } catch(e) {
      console.warn('Sync cloud error', e);
    }
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

  // URL 파라미터 감지 (?num=52&student=이서연&stage=2)
  checkUrlParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const numParam = urlParams.get('num') || urlParams.get('number') || urlParams.get('id');
      const studentParam = urlParams.get('student') || urlParams.get('name') || urlParams.get('user');
      const stageParam = urlParams.get('stage');

      if (numParam) {
        const numVal = parseInt(numParam);
        if ((numVal >= 1 && numVal <= 14) || (numVal >= 51 && numVal <= 61) || (numVal >= 1 && numVal <= 70)) {
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
      } else if (isSelected) {
        statusBadge = '<span class="stage-status-badge" style="background:#0284c7; color:white; font-weight:700;">👉 선택됨</span>';
      } else if (isCleared) {
        statusBadge = `<span class="stage-status-badge">⭐ ${this.formatTime(best)}</span>`;
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

    // 시작 버튼 텍스트를 현재 선택된 단계에 맞게 동적 업데이트!
    const curStage = GUGUDAN_STAGES.find(s => s.id === this.currentStageId) || GUGUDAN_STAGES[0];
    if (this.btnStart && curStage) {
      this.btnStart.innerHTML = `🎯 [ ${curStage.name} (${curStage.size}x${curStage.size}) ] 챌린지 시작! ➔`;
    }

    // 단계 카드 클릭 이벤트 (해금된 모든 단계 자유롭게 선택 가능)
    this.stageGrid.querySelectorAll('.stage-card').forEach(card => {
      card.addEventListener('click', () => {
        const sId = parseInt(card.getAttribute('data-stage-id'));
        if (sId > (this.getStudentProgress().unlockedStage || 1)) {
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
      this.syncCloudData();
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

    // 결과 화면 버튼들
    if (this.btnRetryStage) {
      this.btnRetryStage.addEventListener('click', () => {
        this.startGame();
      });
    }

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

    // 랭킹 저장 (2분 이내 클리어한 학생의 1인 1 최고 기록)
    const isNewRecord = this.saveRanking({
      identifier: this.getStudentIdentifier(),
      stageId: currentStage.id,
      stageName: `${currentStage.name}(${currentStage.size}x${currentStage.size})`,
      name: this.playerName,
      timeSec: this.elapsedSeconds,
      timeStr: finalTimeStr,
      attempts: this.checkAttempts,
      date: new Date().toLocaleDateString('ko-KR')
    });

    if (isNewRecord) {
      this.newRecordAlert.innerHTML = `🏆 축하합니다! 2분 안에 클리어하여 명예의 전당에 등재되었습니다!`;
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

  // 랭킹 시스템 (단계별 1인 1 최고 기록 & 2분 이내 달성자 전당)
  getRankings() {
    try {
      const data = localStorage.getItem(RANKINGS_STORAGE_KEY);
      const rawList = data ? JSON.parse(data) : [];

      // 학생별 단계당 최고 기록 1개만 엄격하게 유지 (중복 제거)
      const map = new Map();
      rawList.forEach(item => {
        if (item.timeSec <= 120) {
          const sKey = normalizeStudentKey(item.num, item.name, item.identifier);
          const idKey = `${item.stageId}_${sKey}`;
          if (!map.has(idKey) || item.timeSec < map.get(idKey).timeSec) {
            map.set(idKey, item);
          }
        }
      });

      const deduplicated = Array.from(map.values());
      deduplicated.sort((a, b) => a.timeSec - b.timeSec || a.attempts - b.attempts);
      return deduplicated;
    } catch (e) {
      return [];
    }
  }

  saveRanking(record) {
    // ⏱️ 2분 (120초) 이내 클리어한 경우에만 명예의 전당에 등재!
    if (record.timeSec > 120) {
      return false;
    }

    const list = this.getRankings();
    const numVal = this.playerNumSelect.value || '';
    const studentIdentifier = record.identifier || (numVal ? `num_${numVal}` : `name_${record.name}`);
    const studentKey = normalizeStudentKey(numVal, record.name, studentIdentifier);

    const existingIndex = list.findIndex(r => r.stageId === record.stageId && normalizeStudentKey(r.num, r.name, r.identifier) === studentKey);

    if (existingIndex !== -1) {
      // 이미 기록이 있을 때: 이번 기록이 더 빠를 때만 갱신
      if (record.timeSec < list[existingIndex].timeSec) {
        list[existingIndex] = record;
      }
    } else {
      list.push(record);
    }

    list.sort((a, b) => a.timeSec - b.timeSec || a.attempts - b.attempts);
    localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(list));

    // ☁️ 구글 스프레드시트 클라우드 비동기 저장
    try {
      const payload = {
        action: 'saveGugudanScore',
        stage: record.stageId,
        identifier: studentIdentifier,
        num: numVal,
        name: record.name,
        timeSec: record.timeSec,
        timeStr: record.timeStr,
        attempts: record.attempts,
        date: record.date || new Date().toLocaleDateString('ko-KR')
      };
      fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      }).catch(e => console.log('Gugudan cloud save error', e));
    } catch (e) {
      console.log('Gugudan cloud save call error', e);
    }

    return true;
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
          <td colspan="6" class="empty-ranking">2분 이내로 통과하여 명예의 전당에 오른 학생이 아직 없습니다. 첫 번째 주인공이 되어보세요!</td>
        </tr>
      `;
      return;
    }

    let rows = '';
    // 인원수 제한 없이 2분 이내 통과한 모든 학생 표시
    filtered.forEach((item, index) => {
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

  async openRankingsModal() {
    this.renderRankingsTable();
    this.modalRankings.classList.remove('hidden');

    // ☁️ 클라우드 최신 명예의 전당 백그라운드 갱신
    try {
      const res = await fetch(`${GAS_API_URL}?action=getGugudanRankings`);
      const data = await res.json();
      if (data && data.success && data.rankings && data.rankings.all) {
        localStorage.setItem(RANKINGS_STORAGE_KEY, JSON.stringify(data.rankings.all));
        this.renderRankingsTable();
      }
    } catch (e) {
      // offline fallback
    }
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
