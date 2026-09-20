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

// 🏷️ 명예의 전당 등록 시 출석 번호 강제 접두사 포맷터 (예: 51번 멋쟁이토끼)
function formatRankingDisplayName(num, rawName) {
  rawName = (rawName || "").trim();
  num = (num || "").toString().trim();
  if (!num) return rawName || "학생";

  const numPrefixRegex = new RegExp(`^${num}\\s*번?\\s*`, 'i');
  const cleanName = rawName.replace(numPrefixRegex, '').trim() || '학생';
  return `${num}번 ${cleanName}`;
}

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
    window.gameInstance = this;
    this.studentNum = '';
    this.playerName = '';
    this.currentStageId = 1;
    this.userHasManuallySelectedStage = false;
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
    this.studentNumText = document.getElementById('student-num-text');
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

  // 학생 고유 식별 키 생성 (출석 번호 최우선 고정)
  getStudentIdentifier() {
    if (this.studentNum) {
      return `num_${this.studentNum}`;
    }
    const name = this.playerNameInput ? this.playerNameInput.value.trim() : this.playerName;
    return name ? `name_${name}` : 'guest_student';
  }

  // ☁️ 클라우드(구글 스프레드시트) 진행 상태 및 명예의 전당 동기화
  async syncCloudData() {
    try {
      // 1. 전체 명예의 전당 랭킹 불러오기
      fetch(`${GAS_API_URL}?action=getMusicRankings`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.rankings) {
            for (let s = 1; s <= 5; s++) {
              if (data.rankings[s]) {
                localStorage.setItem(`${STORAGE_PREFIX}${s}`, JSON.stringify(data.rankings[s]));
              }
            }
          }
        })
        .catch(e => console.log('Cloud rankings sync error', e));

      // 2. 학생의 개인 클라우드 해금 진행상황 불러오기
      const ident = this.getStudentIdentifier();
      if (ident && ident !== 'guest_student') {
        const numVal = this.studentNum || '';
        const nameVal = (this.playerNameInput ? this.playerNameInput.value.trim() : '') || this.playerName || '';
        fetch(`${GAS_API_URL}?action=getStudentGameProgress&identifier=${encodeURIComponent(ident)}&num=${encodeURIComponent(numVal)}&name=${encodeURIComponent(nameVal)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.music) {
              const localProg = this.getStudentProgress();
              const cloudUnlocked = data.music.unlockedStage || 1;
              const cloudScores = data.music.highScores || {};

              let updated = false;
              if (cloudUnlocked > (localProg.unlockedStage || 1)) {
                localProg.unlockedStage = cloudUnlocked;
                updated = true;
              }

              if (!localProg.highScores) localProg.highScores = {};
              for (let s = 1; s <= 5; s++) {
                if ((cloudScores[s] || 0) > (localProg.highScores[s] || 0)) {
                  localProg.highScores[s] = cloudScores[s];
                  updated = true;
                }
              }

              if (updated) {
                const allData = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
                allData[ident] = localProg;
                localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(allData));
                
                // 사용자가 수동으로 이전 단계를 클릭해두지 않은 경우에만 최고 해금 단계로 맞춤
                if (!this.userHasManuallySelectedStage) {
                  this.currentStageId = localProg.unlockedStage || 1;
                }
                this.renderStageSelectGrid();
              }
            }
          })
          .catch(e => console.log('Cloud student progress sync error', e));
      }
    } catch(e) {
      console.warn('Sync cloud error', e);
    }
  }

  // 칭찬 포인트 웹페이지 자동 연동 (URL Query 파라미터 / LocalStorage 감지)
  checkUrlParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let numParam = urlParams.get('num') || urlParams.get('number') || urlParams.get('id');
      let studentParam = urlParams.get('student') || urlParams.get('name') || urlParams.get('user');
      const stageParam = urlParams.get('stage');

      // 1. URL 파라미터가 없으면 칭찬포인트 웹페이지 로컬 스토리지에서 승계
      if (!numParam) {
        numParam = localStorage.getItem("55_selected_student_num");
      }
      if (!studentParam) {
        studentParam = localStorage.getItem("55_selected_student_name");
      }

      if (numParam) {
        const numVal = parseInt(numParam);
        if ((numVal >= 1 && numVal <= 14) || (numVal >= 51 && numVal <= 61) || (numVal >= 1 && numVal <= 100)) {
          this.studentNum = numVal.toString();
        }
      }

      if (studentParam) {
        this.playerName = studentParam.trim();
      } else if (this.studentNum) {
        this.playerName = `${this.studentNum}번 학생`;
      }

      // 출석 번호 고정 뱃지 갱신
      if (this.studentNumText) {
        this.studentNumText.textContent = this.studentNum ? `${this.studentNum}번` : '미지정';
      }

      if (this.playerNameInput) {
        this.playerNameInput.value = this.playerName;
      }

      // 학생의 최고 해금 단계로 기본 선택 설정
      const progress = this.getStudentProgress();
      this.currentStageId = progress.unlockedStage || 1;

      if (stageParam && parseInt(stageParam) >= 1 && parseInt(stageParam) <= 5) {
        const reqStage = parseInt(stageParam);
        if (reqStage <= progress.unlockedStage) {
          this.currentStageId = reqStage;
          this.userHasManuallySelectedStage = true;
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

      // 목표 점수(5,000점) 달성 시 다음 단계 해금!
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

  // 🎯 단계 선택 메서드 (전역/인라인에서 즉시 실행)
  selectStage(sid) {
    sid = parseInt(sid, 10);
    const progress = this.getStudentProgress();
    const currentUnlocked = progress.unlockedStage || 1;

    if (sid > currentUnlocked) {
      if (window.sounds && window.sounds.playWrong) sounds.playWrong();
      alert(`${sid - 1}단계에서 ${STAGES_CONFIG[sid - 2].targetScore}점 이상을 획득해야 해금됩니다!`);
      return;
    }

    if (window.sounds && window.sounds.playPop) sounds.playPop();
    this.userHasManuallySelectedStage = true;
    this.currentStageId = sid;
    this.renderStageSelectGrid();
  }

  // 단계 선택 카드 그리드 렌더링 (단일 선택 완전 보장)
  renderStageSelectGrid() {
    const progress = this.getStudentProgress();
    const unlocked = progress.unlockedStage || 1;

    // 만약 현재 선택된 단계가 아직 해금되지 않은 잠긴 단계라면 해금된 최고 단계로 보정
    if (this.currentStageId > unlocked) {
      this.currentStageId = unlocked;
    }

    let html = '';
    STAGES_CONFIG.forEach(stg => {
      const isLocked = stg.id > unlocked;
      const isSelected = (stg.id === this.currentStageId);
      const best = (progress.highScores && progress.highScores[stg.id]) || 0;
      const isCleared = best >= stg.targetScore;

      let cardClass = 'stage-card';
      if (isLocked) {
        cardClass += ' locked';
      } else if (isSelected) {
        cardClass += ' selected';
      } else if (isCleared) {
        cardClass += ' cleared';
      }

      let statusBadge = '';
      if (isLocked) {
        statusBadge = '<span class="stage-status-badge badge-locked">🔒 잠김</span>';
      } else if (isSelected) {
        statusBadge = '<span class="stage-status-badge badge-selected">👉 선택됨</span>';
      } else if (isCleared) {
        statusBadge = `<span class="stage-status-badge badge-cleared">🌟 완료 (${best.toLocaleString()}점)</span>`;
      } else if (best > 0) {
        statusBadge = `<span class="stage-status-badge badge-available">${best.toLocaleString()}점</span>`;
      } else {
        statusBadge = '<span class="stage-status-badge badge-available">도전 가능</span>';
      }

      html += `
        <div class="${cardClass}" data-stage="${stg.id}" onclick="window.gameInstance && window.gameInstance.selectStage(${stg.id})">
          <div class="stage-num-badge">${stg.name}</div>
          <div class="stage-range-text">${stg.rangeText}</div>
          <div class="stage-target-text">목표: ${stg.targetScore.toLocaleString()}점</div>
          ${statusBadge}
        </div>
      `;
    });

    this.stageGrid.innerHTML = html;

    // 시작 버튼 텍스트를 현재 선택된 단계에 맞게 동적 업데이트!
    const curStg = STAGES_CONFIG[this.currentStageId - 1];
    if (this.btnStart && curStg) {
      this.btnStart.innerHTML = `🎯 [ ${curStg.name} (${curStg.rangeText}) ] 게임 시작하기 ➔`;
    }
  }

  bindEvents() {
    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', () => {
        this.playerName = this.playerNameInput.value.trim();
      });
      this.playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.startGame();
      });
    }

    this.btnStart.addEventListener('click', () => this.startGame());
    this.playerNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startGame();
    });

    this.btnShowRankings.addEventListener('click', () => this.openRankingsModal(this.currentStageId));
    this.btnResultRankings.addEventListener('click', () => this.openRankingsModal(this.currentStageId));
    this.btnCloseModal.addEventListener('click', () => this.closeRankingsModal());
    this.btnCloseModalBottom.addEventListener('click', () => this.closeRankingsModal());

    // 결과 화면 버튼들
    if (this.btnRetryStage) {
      this.btnRetryStage.addEventListener('click', () => {
        this.startGame();
      });
    }

    if (this.btnNextStage) {
      this.btnNextStage.addEventListener('click', () => {
        if (this.currentStageId < 5) {
          this.currentStageId++;
          this.renderStageSelectGrid();
          this.startGame();
        }
      });
    }

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

    // 다음 단계 버튼 표시 여부
    if (this.btnNextStage) {
      if (unlockedStage > this.currentStageId && this.currentStageId < 5) {
        this.btnNextStage.textContent = `🚀 ${this.currentStageId + 1}단계 도전하기`;
        this.btnNextStage.classList.remove('hidden');
      } else {
        this.btnNextStage.classList.add('hidden');
      }
    }

    // 단계별 랭킹 저장 (5,000점 이상 달성자 명예의 전당)
    const displayName = formatRankingDisplayName(this.studentNum, this.playerName);
    const isNewRecord = this.saveRanking(this.currentStageId, {
      identifier: this.getStudentIdentifier(),
      name: displayName,
      num: this.studentNum || '',
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
      studentNum: this.studentNum || '',
      studentName: displayName,
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
      
      // 학생별 최고 기록 1개만 엄격하게 유지 (중복 제거)
      const map = new Map();
      rawList.forEach(item => {
        if (item.score >= 5000) {
          const sKey = normalizeStudentKey(item.num, item.name, item.identifier);
          if (!map.has(sKey) || item.score > map.get(sKey).score) {
            map.set(sKey, item);
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
    const numVal = this.studentNum || record.num || '';
    const studentIdentifier = record.identifier || (numVal ? `num_${numVal}` : `name_${record.name}`);
    const studentKey = normalizeStudentKey(numVal, record.name, studentIdentifier);

    const existingIndex = list.findIndex(r => normalizeStudentKey(r.num, r.name, r.identifier) === studentKey);

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

    // ☁️ 구글 스프레드시트 클라우드 비동기 저장
    try {
      const payload = {
        action: 'saveMusicScore',
        stage: stageId,
        identifier: studentIdentifier,
        num: numVal,
        name: record.name,
        score: record.score,
        correct: record.correct,
        combo: record.combo,
        date: record.date || new Date().toLocaleDateString('ko-KR')
      };
      fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      }).catch(e => console.log('Cloud save error', e));
    } catch (e) {
      console.log('Cloud save call error', e);
    }

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

  async openRankingsModal(stageId = 1) {
    this.currentModalStageTab = stageId;
    
    this.rankingTabs.querySelectorAll('.rank-tab-btn').forEach(btn => {
      const sid = parseInt(btn.getAttribute('data-stage'));
      if (sid === stageId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.renderRankingsTable(stageId);
    this.modalRankings.classList.remove('hidden');

    // ☁️ 클라우드 최신 명예의 전당 백그라운드 갱신
    try {
      const res = await fetch(`${GAS_API_URL}?action=getMusicRankings`);
      const data = await res.json();
      if (data && data.success && data.rankings) {
        for (let s = 1; s <= 5; s++) {
          if (data.rankings[s]) {
            localStorage.setItem(`${STORAGE_PREFIX}${s}`, JSON.stringify(data.rankings[s]));
          }
        }
        if (this.currentModalStageTab === stageId) {
          this.renderRankingsTable(stageId);
        }
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
  window.game = new MusicGame();
});
