// 🎵 음표 마스터 데이터 (기준선 Y: 80, 105, 130, 155, 180)
const ALL_NOTES_MASTER = [
  { name: '낮은 라', full: '낮은 라', y: 230, ledgers: [205, 230], stemDir: 'up', aliases: ['낮은 라', '낮은라', '라'], type: 'low' },
  { name: '낮은 시', full: '낮은 시', y: 217.5, ledgers: [205], stemDir: 'up', aliases: ['낮은 시', '낮은시', '시'], type: 'low' },
  { name: '도', full: '도', y: 205, ledgers: [205], stemDir: 'up', aliases: ['도', '1'], type: 'mid' },
  { name: '레', full: '레', y: 192.5, ledgers: [], stemDir: 'up', aliases: ['레', '2'], type: 'mid' },
  { name: '미', full: '미', y: 180, ledgers: [], stemDir: 'up', aliases: ['미', '3'], type: 'mid' },
  { name: '파', full: '파', y: 167.5, ledgers: [], stemDir: 'up', aliases: ['파', '4'], type: 'mid' },
  { name: '솔', full: '솔', y: 155, ledgers: [], stemDir: 'up', aliases: ['솔', '5'], type: 'mid' },
  { name: '라', full: '라', y: 142.5, ledgers: [], stemDir: 'up', aliases: ['라', '6'], type: 'mid' },
  { name: '시', full: '시', y: 130, ledgers: [], stemDir: 'down', aliases: ['시', '7'], type: 'mid' },
  { name: '높은 도', full: '높은 도', y: 117.5, ledgers: [], stemDir: 'down', aliases: ['높은 도', '높은도', '8'], type: 'high' },
  { name: '높은 레', full: '높은 레', y: 105, ledgers: [], stemDir: 'down', aliases: ['높은 레', '높은레'], type: 'high' },
  { name: '높은 미', full: '높은 미', y: 92.5, ledgers: [], stemDir: 'down', aliases: ['높은 미', '높은미'], type: 'high' },
  { name: '높은 파', full: '높은 파', y: 80, ledgers: [], stemDir: 'down', aliases: ['높은 파', '높은파'], type: 'high' },
  { name: '높은 솔', full: '높은 솔', y: 67.5, ledgers: [], stemDir: 'down', aliases: ['높은 솔', '높은솔'], type: 'high' }
];

// 5단계 설정 (모든 단계 목표 점수 5,000점 통일)
const STAGES_CONFIG = [
  { id: 1, name: '1단계', rangeText: '도 ~ 솔', targetScore: 5000, noteNames: ['도', '레', '미', '파', '솔'] },
  { id: 2, name: '2단계', rangeText: '도 ~ 높은 도', targetScore: 5000, noteNames: ['도', '레', '미', '파', '솔', '라', '시', '높은 도'] },
  { id: 3, name: '3단계', rangeText: '낮은 라 ~ 높은 도', targetScore: 5000, noteNames: ['낮은 라', '낮은 시', '도', '레', '미', '파', '솔', '라', '시', '높은 도'] },
  { id: 4, name: '4단계', rangeText: '낮은 라 ~ 높은 미', targetScore: 5000, noteNames: ['낮은 라', '낮은 시', '도', '레', '미', '파', '솔', '라', '시', '높은 도', '높은 레', '높은 미'] },
  { id: 5, name: '5단계', rangeText: '낮은 라 ~ 높은 솔', targetScore: 5000, noteNames: ['낮은 라', '낮은 시', '도', '레', '미', '파', '솔', '라', '시', '높은 도', '높은 레', '높은 미', '높은 파', '높은 솔'] }
];

const GAME_DURATION = 60; // 60초 (1분)
const STORAGE_PREFIX = 'MUSIC_NOTES_RANKING_STAGE_';
const PROGRESS_STORAGE_KEY = 'MUSIC_NOTES_STUDENT_PROGRESS';

// 한글 종성 매핑
const JONGSEONG_TABLE = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

function decomposeKorean(char) {
  const code = char.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const sIndex = code - 0xAC00;
    const tIndex = sIndex % 28;
    const baseCode = code - tIndex;
    return {
      baseChar: String.fromCharCode(baseCode),
      jongseong: JONGSEONG_TABLE[tIndex] || ''
    };
  }
  return { baseChar: char, jongseong: '' };
}

class MusicGame {
  constructor() {
    this.studentNum = '';
    this.playerName = '';
    this.currentStageId = 1;
    this.currentStageNotes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctCount = 0;
    this.totalAttempts = 0;
    this.timeLeft = GAME_DURATION;
    this.timerInterval = null;
    this.currentNote = null;
    this.isPenalty = false;
    this.isPlaying = false;
    this.lastSolvedNote = '';
    this.currentModalStageTab = 1;

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
    this.btnResultRankings = document.getElementById('btn-result-rankings');
    this.modalRankings = document.getElementById('modal-rankings');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');
    this.btnResetRankings = document.getElementById('btn-reset-rankings');
    this.rankingTabs = document.getElementById('ranking-tabs');

    // 플레이 UI
    this.currentStageBadge = document.getElementById('current-stage-badge');
    this.currentStageTarget = document.getElementById('current-stage-target');
    this.timerDisplay = document.getElementById('timer-display');
    this.timerGaugeFill = document.getElementById('timer-gauge-fill');
    this.scoreDisplay = document.getElementById('score-display');
    this.comboDisplay = document.getElementById('combo-display');
    this.staffCard = document.getElementById('staff-card');
    this.noteRenderGroup = document.getElementById('note-render-group');
    this.feverOverlay = document.getElementById('fever-overlay');
    this.penaltyOverlay = document.getElementById('penalty-overlay');
    this.feedbackBubble = document.getElementById('feedback-bubble');
    this.typingBoxWrap = document.getElementById('typing-box-wrap');
    this.pianoButtonsGrid = document.getElementById('piano-buttons-grid');

    // 결과 요소
    this.resultPlayerName = document.getElementById('result-player-name');
    this.resultStageText = document.getElementById('result-stage-text');
    this.resultScore = document.getElementById('result-score');
    this.resultCorrect = document.getElementById('result-correct');
    this.resultMaxCombo = document.getElementById('result-max-combo');
    this.stageClearBanner = document.getElementById('stage-clear-banner');
    this.newRecordAlert = document.getElementById('new-record-alert');
    this.rankingListBody = document.getElementById('ranking-list-body');
  }

  // 1번~14번(남), 51~61번(여) 출석 번호 드롭다운 옵션 동적 생성
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

  // 학생 고유 식별 키 생성 (출석 번호 우선)
  getStudentIdentifier() {
    const num = this.playerNumSelect.value;
    const name = this.playerNameInput.value.trim();
    if (num) {
      return `num_${num}`;
    }
    return name || 'guest_student';
  }

  // 칭찬 포인트 웹페이지 자동 연동 (URL Query 파라미터 감지)
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

      // 학생의 최고 해금 단계로 기본 선택 설정
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

  // 학생별 진행 상태 (해금 단계 & 최고점수)
  getStudentProgress(customKey) {
    const studentKey = customKey || this.getStudentIdentifier();
    try {
      const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      if (!allData[studentKey]) {
        allData[studentKey] = {
          unlockedStage: 1, // 1단계 기본 해금
          highScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }
      return allData[studentKey];
    } catch (e) {
      return { unlockedStage: 1, highScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
  }

  saveStudentProgress(stageId, score) {
    const studentKey = this.getStudentIdentifier();
    try {
      const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      if (!allData[studentKey]) {
        allData[studentKey] = { unlockedStage: 1, highScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      }

      const cur = allData[studentKey];
      if (!cur.highScores) cur.highScores = {};
      if (score > (cur.highScores[stageId] || 0)) {
        cur.highScores[stageId] = score;
      }

      // 목표 점수 달성 시 다음 단계 해금!
      const target = STAGES_CONFIG[stageId - 1].targetScore;
      let unlockedNext = false;
      if (score >= target && stageId < 5) {
        if (cur.unlockedStage <= stageId) {
          cur.unlockedStage = stageId + 1;
          unlockedNext = true;
        }
      }

      allData[studentKey] = cur;
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
      return { unlockedNext, unlockedStage: cur.unlockedStage };
    } catch (e) {
      return { unlockedNext: false, unlockedStage: 1 };
    }
  }

  // 단계 선택 카드 그리드 렌더링
  renderStageSelectGrid() {
    const progress = this.getStudentProgress();
    const unlocked = progress.unlockedStage || 1;

    // 만약 현재 선택된 단계가 잠겨있다면 해금된 최고 단계로 자동 보정
    if (this.currentStageId > unlocked) {
      this.currentStageId = unlocked;
    }

    let html = '';
    STAGES_CONFIG.forEach(stg => {
      const isLocked = stg.id > unlocked;
      const isSelected = stg.id === this.currentStageId;
      const best = (progress.highScores && progress.highScores[stg.id]) || 0;
      const isCleared = best >= stg.targetScore;

      let cardClass = 'stage-card';
      if (isLocked) cardClass += ' locked';
      if (isSelected && !isLocked) cardClass += ' selected';
      if (isCleared) cardClass += ' cleared';

      html += `
        <div class="${cardClass}" data-stage="${stg.id}">
          <div class="stage-num-badge">${stg.name}</div>
          <div class="stage-range-text">${stg.rangeText}</div>
          <div class="stage-target-text">목표: ${stg.targetScore.toLocaleString()}점</div>
          <div class="stage-status-badge">
            ${isLocked ? '🔒 잠김' : (isCleared ? '🌟 완료 (' + best.toLocaleString() + ')' : (best > 0 ? best.toLocaleString() + '점' : '도전가능'))}
          </div>
        </div>
      `;
    });

    this.stageGrid.innerHTML = html;

    // 단계 카드 클릭 이벤트
    this.stageGrid.querySelectorAll('.stage-card').forEach(card => {
      card.addEventListener('click', () => {
        const sid = parseInt(card.getAttribute('data-stage'));
        if (sid <= (this.getStudentProgress().unlockedStage || 1)) {
          this.currentStageId = sid;
          this.renderStageSelectGrid();
        } else {
          alert(`${sid - 1}단계에서 ${STAGES_CONFIG[sid - 2].targetScore}점 이상을 획득해야 해금됩니다!`);
        }
      });
    });
  }

  bindEvents() {
    // 번호 드롭다운 선택 시 자동 이름 및 기록 연동
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

    this.btnShowRankings.addEventListener('click', () => this.openRankingsModal(this.currentStageId));
    this.btnResultRankings.addEventListener('click', () => this.openRankingsModal(this.currentStageId));
    this.btnCloseModal.addEventListener('click', () => this.closeRankingsModal());
    this.btnCloseModalBottom.addEventListener('click', () => this.closeRankingsModal());
    this.btnResetRankings.addEventListener('click', () => this.resetRankings());

    this.btnRestart.addEventListener('click', () => {
      this.renderStageSelectGrid();
      this.showScreen('start');
    });

    // 랭킹 탭 클릭
    this.rankingTabs.querySelectorAll('.rank-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        const sid = parseInt(tab.getAttribute('data-stage'));
        this.openRankingsModal(sid);
      });
    });
  }

  // 선택된 단계에 맞는 화면 건반 버튼 렌더링
  renderPianoButtons() {
    let btnsHtml = '';
    this.currentStageNotes.forEach(note => {
      let extraClass = '';
      if (note.type === 'high') extraClass = 'high';
      else if (note.type === 'low') extraClass = 'low';

      btnsHtml += `<button class="note-btn ${extraClass}" data-note="${note.name}">${note.name}</button>`;
    });

    this.pianoButtonsGrid.innerHTML = btnsHtml;

    this.pianoButtonsGrid.querySelectorAll('.note-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.isPlaying || this.isPenalty) return;
        const noteName = btn.getAttribute('data-note');
        this.checkAnswer(noteName);
      });
    });
  }

  // 새로운 문제가 나올 때마다 input 엘리먼트 완전 재생성 (IME 100% 리셋)
  recreateInputElement() {
    this.typingBoxWrap.innerHTML = `
      <input type="text" id="answer-input" class="answer-input" placeholder="계이름 입력 (예: 도)" autocomplete="off">
      <span class="input-hint">💡 키보드로 바로 치거나 아래 버튼을 누르세요</span>
    `;
    this.answerInput = document.getElementById('answer-input');

    // 실시간 입력 이벤트
    this.answerInput.addEventListener('input', (e) => {
      if (!this.isPlaying || this.isPenalty) return;
      let val = e.target.value;
      if (!val) return;

      // 🛡️ 이중 안전장치: 직전 글자 받침 결합('랏', '돌' 등) 자동 복원
      if (this.lastSolvedNote && val.length === 1) {
        const { baseChar, jongseong } = decomposeKorean(val);
        if (baseChar === this.lastSolvedNote && jongseong) {
          val = jongseong;
          this.answerInput.value = val;
          this.lastSolvedNote = '';
          return;
        }
      }

      this.checkRealtimeTyping(val);
    });

    // Enter 키로 제출
    this.answerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!this.isPlaying || this.isPenalty) return;
        const val = this.answerInput.value.trim();
        if (val) {
          this.submitWithEnter(val);
        }
      }
    });

    this.answerInput.focus();
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

    // 현재 단계 설정 및 음표 필터링
    const stageCfg = STAGES_CONFIG[this.currentStageId - 1];
    this.currentStageNotes = ALL_NOTES_MASTER.filter(n => stageCfg.noteNames.includes(n.name));

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctCount = 0;
    this.totalAttempts = 0;
    this.timeLeft = GAME_DURATION;
    this.isPenalty = false;
    this.isPlaying = true;
    this.lastSolvedNote = '';

    // 상단 스탯 업데이트
    this.currentStageBadge.textContent = stageCfg.name;
    this.currentStageTarget.textContent = `목표: ${stageCfg.targetScore.toLocaleString()}점`;
    this.updateStatsUI();
    this.renderPianoButtons();
    this.showScreen('play');
    this.spawnNextNote();

    // 타이머 가동
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerUI();

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
    this.updateTimerUI();
  }

  updateTimerUI() {
    this.timerDisplay.innerHTML = `${this.timeLeft}<small>s</small>`;
    const pct = (this.timeLeft / GAME_DURATION) * 100;
    this.timerGaugeFill.style.width = `${pct}%`;

    if (this.timeLeft <= 10) {
      this.timerGaugeFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      this.timerDisplay.style.color = '#ef4444';
    } else {
      this.timerGaugeFill.style.background = 'linear-gradient(90deg, #38bdf8, #818cf8)';
      this.timerDisplay.style.color = '#38bdf8';
    }
  }

  updateStatsUI() {
    this.scoreDisplay.textContent = this.score;
    this.comboDisplay.innerHTML = `${this.combo}<span class="combo-unit">COMBO</span>`;

    if (this.combo >= 5) {
      this.feverOverlay.classList.add('fever-active');
    } else {
      this.feverOverlay.classList.remove('fever-active');
    }
  }

  spawnNextNote() {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * this.currentStageNotes.length);
    } while (this.currentNote && this.currentStageNotes[nextIndex].name === this.currentNote.name && this.currentStageNotes.length > 1);

    this.currentNote = this.currentStageNotes[nextIndex];
    this.renderStaffNote(this.currentNote);
    this.recreateInputElement();
  }

  renderStaffNote(note) {
    const cx = 320;
    const cy = note.y;

    let groupInnerHtml = '';

    // 1. 덧줄들 (Ledger Lines - 낮은 라, 낮은 시, 도 등)
    if (note.ledgers && note.ledgers.length > 0) {
      note.ledgers.forEach(ly => {
        groupInnerHtml += `<line x1="${cx - 32}" y1="${ly}" x2="${cx + 32}" y2="${ly}" class="ledger-line" />`;
      });
    }

    // 2. 4분음표 기둥
    if (note.stemDir === 'up') {
      groupInnerHtml += `<line x1="${cx + 13.5}" y1="${cy - 2}" x2="${cx + 13.5}" y2="${cy - 72}" class="note-stem" />`;
    } else {
      groupInnerHtml += `<line x1="${cx - 13.5}" y1="${cy + 2}" x2="${cx - 13.5}" y2="${cy + 72}" class="note-stem" />`;
    }

    // 3. 4분음표 머리
    groupInnerHtml += `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="10" transform="rotate(-22 ${cx} ${cy})" class="note-head" />`;

    this.noteRenderGroup.innerHTML = `<g class="note-group">${groupInnerHtml}</g>`;
  }

  // 실시간 타이핑 감지
  checkRealtimeTyping(input) {
    if (!this.currentNote || this.isPenalty) return;

    const trimmed = input.trim();
    const compact = trimmed.replace(/\s+/g, '');
    const noteName = this.currentNote.name;

    // 1. '높은 ~' 또는 '낮은 ~' 다단어 계이름인 경우 (예: '높은 도', '낮은 라')
    if (noteName.includes(' ')) {
      const compactTarget = noteName.replace(/\s+/g, '');
      if (trimmed === noteName || compact === compactTarget || compact.endsWith(compactTarget) || trimmed.endsWith(noteName)) {
        this.checkAnswer(noteName);
      }
      return;
    }

    // 2. 단일 1글자 계이름인 경우
    const noteAliasNum = (this.currentNote.aliases && this.currentNote.aliases[1]) || '';
    if (trimmed === noteName || compact.endsWith(noteName) || (noteAliasNum && trimmed === noteAliasNum)) {
      this.checkAnswer(noteName);
    }
  }

  submitWithEnter(input) {
    const trimmed = input.trim();
    const compact = trimmed.replace(/\s+/g, '');
    const noteName = this.currentNote.name;
    const compactTarget = noteName.replace(/\s+/g, '');

    const isCorrect = (trimmed === noteName || compact === compactTarget || compact.endsWith(compactTarget) || trimmed.endsWith(noteName));

    if (isCorrect) {
      this.checkAnswer(noteName);
    } else {
      this.checkAnswer('__WRONG__');
    }
  }

  checkAnswer(answerName) {
    this.totalAttempts++;
    const isCorrect = (answerName === this.currentNote.name);

    if (isCorrect) {
      this.lastSolvedNote = this.currentNote.name;
      this.correctCount++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const comboBonus = Math.min((this.combo - 1) * 20, 200);
      const earned = 100 + comboBonus;
      this.score += earned;

      sounds.playNote(this.currentNote.name);
      if (this.combo > 1) {
        sounds.playCombo(this.combo);
      }

      this.showFeedback(`+${earned} 딩동댕!`, 'correct');
      this.updateStatsUI();
      this.spawnNextNote();
    } else {
      this.lastSolvedNote = '';
      this.triggerPenalty();
    }
  }

  triggerPenalty() {
    this.combo = 0;
    this.isPenalty = true;
    this.updateStatsUI();

    sounds.playWrong();

    this.staffCard.classList.add('shake');
    this.penaltyOverlay.classList.add('active');
    if (this.answerInput) {
      this.answerInput.classList.add('disabled');
      this.answerInput.disabled = true;
    }

    setTimeout(() => {
      this.staffCard.classList.remove('shake');
      this.penaltyOverlay.classList.remove('active');
      this.isPenalty = false;
      this.recreateInputElement();
    }, 1000);
  }

  showFeedback(text, type) {
    this.feedbackBubble.textContent = text;
    this.feedbackBubble.className = `feedback-bubble show-${type}`;
    
    setTimeout(() => {
      this.feedbackBubble.className = 'feedback-bubble';
    }, 500);
  }

  endGame() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    sounds.playFanfare();

    const stageCfg = STAGES_CONFIG[this.currentStageId - 1];
    this.resultPlayerName.textContent = `👤 ${this.playerName} 학생의 기록`;
    this.resultStageText.textContent = `${stageCfg.name} (${stageCfg.rangeText})`;
    this.resultScore.textContent = `${this.score.toLocaleString()}점`;
    this.resultCorrect.textContent = `${this.correctCount}개`;
    this.resultMaxCombo.textContent = `${this.maxCombo} Combo`;

    // 학생 진행 상태 저장 및 다음 단계 해금 여부 확인
    const { unlockedNext, unlockedStage } = this.saveStudentProgress(this.currentStageId, this.score);

    if (unlockedNext) {
      this.stageClearBanner.classList.remove('hidden');
      this.stageClearBanner.innerHTML = `🎉 목표 점수(${stageCfg.targetScore}점)를 돌파하여 <strong>${this.currentStageId + 1}단계가 해금되었습니다!</strong>`;
    } else if (this.score >= stageCfg.targetScore) {
      this.stageClearBanner.classList.remove('hidden');
      this.stageClearBanner.innerHTML = `🌟 목표 점수(${stageCfg.targetScore}점) 달성 성공! 멋진 실력입니다!`;
    } else {
      this.stageClearBanner.classList.add('hidden');
    }

    // 단계별 랭킹 저장 (5,000점 이상 달성자 명예의 전당)
    const isNewRecord = this.saveRanking(this.currentStageId, {
      identifier: this.getStudentIdentifier(),
      name: this.playerName,
      score: this.score,
      correct: this.correctCount,
      combo: this.maxCombo,
      date: new Date().toLocaleDateString('ko-KR')
    });

    if (isNewRecord) {
      this.newRecordAlert.innerHTML = `🏆 축하합니다! 5,000점 이상을 달성하여 명예의 전당에 등재되었습니다!`;
      this.newRecordAlert.classList.remove('hidden');
    } else {
      this.newRecordAlert.classList.add('hidden');
    }

    // 칭찬 포인트 웹페이지로 결과 데이터 전송 (PostMessage 및 LocalStorage 동시 백업)
    const resultPayload = {
      type: 'MUSIC_NOTES_GAME_RESULT',
      studentNum: this.playerNumSelect.value || '',
      studentName: this.playerName,
      stage: this.currentStageId,
      stageName: stageCfg.name,
      score: this.score,
      correct: this.correctCount,
      maxCombo: this.maxCombo,
      unlockedStage: unlockedStage,
      isPassed: this.score >= stageCfg.targetScore,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('PRAISE_POINT_LATEST_RESULT', JSON.stringify(resultPayload));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(resultPayload, '*');
      }
    } catch (e) {
      console.log('Result payload save err', e);
    }

    this.showScreen('result');
  }

  // 단계별 랭킹 시스템 (1인 1 최고 기록 & 5,000점 이상 달성자 명예의 전당)
  getRankings(stageId) {
    try {
      const key = `${STORAGE_PREFIX}${stageId}`;
      const data = localStorage.getItem(key);
      const rawList = data ? JSON.parse(data) : [];
      
      // 학생별 최고 기록 1개만 유지 (중복 제거)
      const map = new Map();
      rawList.forEach(item => {
        if (item.score >= 5000) {
          const idKey = item.identifier || item.name;
          if (!map.has(idKey) || item.score > map.get(idKey).score) {
            map.set(idKey, item);
          }
        }
      });

      const deduplicated = Array.from(map.values());
      deduplicated.sort((a, b) => b.score - a.score || b.correct - a.correct || b.combo - a.combo);
      return deduplicated;
    } catch (e) {
      return [];
    }
  }

  saveRanking(stageId, record) {
    // 5,000점 이상을 달성한 경우에만 명예의 전당에 등재!
    if (record.score < 5000) {
      return false;
    }

    const list = this.getRankings(stageId);
    const studentIdentifier = record.identifier || record.name;

    const existingIndex = list.findIndex(r => (r.identifier && r.identifier === studentIdentifier) || r.name === record.name);

    if (existingIndex !== -1) {
      // 이미 기록이 있을 때: 이번 점수가 더 높을 때만 갱신
      if (record.score > list[existingIndex].score) {
        list[existingIndex] = record;
      }
    } else {
      list.push(record);
    }

    list.sort((a, b) => b.score - a.score || b.correct - a.correct || b.combo - a.combo);
    localStorage.setItem(`${STORAGE_PREFIX}${stageId}`, JSON.stringify(list));
    return true;
  }

  renderRankingsTable(stageId) {
    const list = this.getRankings(stageId);
    if (list.length === 0) {
      this.rankingListBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-ranking">${stageId}단계에서 5,000점 이상을 달성한 학생이 아직 없습니다. 첫 번째 주인공이 되어보세요!</td>
        </tr>
      `;
      return;
    }

    let rows = '';
    // 인원수 제한 없이 5,000점 이상 통과한 모든 학생 표시
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
          <td style="color: #fbbf24; font-weight: 700;">${item.score.toLocaleString()}점</td>
          <td>${item.correct}개</td>
          <td>${item.combo}</td>
          <td style="color: #94a3b8; font-size: 0.82rem;">${item.date || '-'}</td>
        </tr>
      `;
    });

    this.rankingListBody.innerHTML = rows;
  }

  resetRankings() {
    if (confirm(`정말로 ${this.currentModalStageTab}단계의 모든 랭킹 기록을 초기화하시겠습니까?`)) {
      localStorage.removeItem(`${STORAGE_PREFIX}${this.currentModalStageTab}`);
      this.renderRankingsTable(this.currentModalStageTab);
      alert(`${this.currentModalStageTab}단계 명예의 전당 기록이 초기화되었습니다.`);
    }
  }

  openRankingsModal(stageId = 1) {
    this.currentModalStageTab = stageId;
    
    this.rankingTabs.querySelectorAll('.rank-tab-btn').forEach(btn => {
      const sid = parseInt(btn.getAttribute('data-stage'));
      if (sid === stageId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.renderRankingsTable(stageId);
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
  window.game = new MusicGame();
});
