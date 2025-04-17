/**
 * TimeCircle - Main Application
 * 일정 관리 앱의 메인 로직 및 이벤트 처리
 */

// 로컬 스토리지 키
const PLAN_DATA_KEY = 'timecircle_plan_data';
const RECORD_DATA_KEY = 'timecircle_record_data';

// 하루 계획 데이터 초기화 (로컬 스토리지에서 불러오거나 빈 배열로 초기화)
window.planData = JSON.parse(localStorage.getItem(PLAN_DATA_KEY)) || [];

// 하루 기록 데이터 초기화 (로컬 스토리지에서 불러오거나 빈 배열로 초기화)
window.recordData = JSON.parse(localStorage.getItem(RECORD_DATA_KEY)) || [];

// planData를 로컬 스토리지에 저장하는 함수
function savePlanData() {
  localStorage.setItem(PLAN_DATA_KEY, JSON.stringify(window.planData));
}

// recordData를 로컬 스토리지에 저장하는 함수
function saveRecordData() {
  localStorage.setItem(RECORD_DATA_KEY, JSON.stringify(window.recordData));
}

const TimeCircleApp = (function() {
  // 비공개 변수
  let currentDate;
  let scheduleModal, settingsModal, overlay;
  let isEditMode = false;
  let currentScheduleId = null;
  
  /**
   * 현재 날짜 표시 업데이트
   */
  function updateCurrentDateDisplay() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
      const date = new Date(currentDate);
      dateElement.textContent = TimeCircleUtils.formatDateKorean(date);
    }
  }
  
  /**
   * 날짜 변경 처리
   * @param {number} days - 이동할 일수 (양수: 미래, 음수: 과거)
   */
  function changeDate(days) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + days);
    
    currentDate = date.toISOString().split('T')[0];
    updateCurrentDateDisplay();
    
    // 차트 및 목록 업데이트
    renderPlanCircle();
    renderPlanList();
    renderRecordCircle();
    renderRecordList();
    
    // 주간 뷰 업데이트
    if (typeof renderWeekCalendar === 'function') {
      renderWeekCalendar();
    }
    
    // 홈 탭 업데이트
    if (typeof refreshHomeTab === 'function') {
      refreshHomeTab();
    }
  }
  
  /**
   * 특정 날짜로 이동
   * @param {string} dateString - YYYY-MM-DD 형식의 날짜
   */
  function goToDate(dateString) {
    currentDate = dateString;
    updateCurrentDateDisplay();
    
    // 차트 및 목록 업데이트
    TimeCircle.changeDate(currentDate, planData);
    ScheduleList.changeDate(currentDate);
  }
  
  /**
   * 일정 모달 초기화
   * @param {boolean} isEdit - 편집 모드 여부
   * @param {Object} scheduleData - 일정 데이터 (편집 시)
   */
  function initScheduleModal(isEdit, scheduleData) {
    const modalTitle = document.getElementById('modal-title');
    const scheduleForm = document.getElementById('schedule-form');
    
    // 모달 제목 설정
    modalTitle.textContent = isEdit ? '일정 편집' : '새 일정 추가';
    
    // 폼 초기화
    scheduleForm.reset();
    
    if (isEdit && scheduleData) {
      // 편집 모드: 기존 데이터로 폼 채우기
      document.getElementById('schedule-title').value = scheduleData.title || '';
      document.getElementById('start-time').value = TimeCircleUtils.minutesToTimeString(scheduleData.startTime);
      document.getElementById('end-time').value = TimeCircleUtils.minutesToTimeString(scheduleData.endTime);
      document.getElementById('schedule-category').value = scheduleData.category || 'other';
      document.getElementById('schedule-memo').value = scheduleData.memo || '';
      
      isEditMode = true;
      currentScheduleId = scheduleData.id;
    } else {
      // 새 일정 모드
      if (scheduleData) {
        // 시작/종료 시간이 제공된 경우 (드래그 또는 빈 시간대 클릭)
        document.getElementById('start-time').value = TimeCircleUtils.minutesToTimeString(scheduleData.startTime);
        document.getElementById('end-time').value = TimeCircleUtils.minutesToTimeString(scheduleData.endTime);
      } else {
        // 기본값: 현재 시간부터 1시간
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = Math.floor(now.getMinutes() / 15) * 15; // 15분 간격으로 반올림
        
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const endHour = (currentHour + 1) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        document.getElementById('start-time').value = startTime;
        document.getElementById('end-time').value = endTime;
      }
      
      // 기본 카테고리 설정
      const defaultCategory = 'other';
      document.getElementById('schedule-category').value = defaultCategory;
      
      isEditMode = false;
      currentScheduleId = null;
    }
    
    // 모달 표시
    scheduleModal.style.display = 'block';
    
    // overlay 표시
    if (overlay) {
      overlay.style.display = 'block';
    } else {
      const overlayElement = document.getElementById('main-overlay');
      if (overlayElement) {
        overlayElement.style.display = 'block';
      }
    }
    
    // 제목 입력에 포커스
    document.getElementById('schedule-title').focus();
  }
  
  /**
   * 일정 삭제 처리
   * @param {number} index - 삭제할 일정의 인덱스
   * @param {string} type - 일정 타입 ('plan' 또는 'record')
   */
  function deleteSchedule(index, type) {
    if (confirm('정말로 이 일정을 삭제하시겠습니까?')) {
      if (type === 'plan') {
        // 계획에서 삭제
        planData.splice(index, 1);
        // 로컬 스토리지 업데이트
        savePlanData();
        // 화면 새로고침
        renderPlanCircle();
        renderPlanList();
      } else if (type === 'record') {
        // 기록에서 삭제
        recordData.splice(index, 1);
        // 로컬 스토리지 업데이트
        saveRecordData();
        // 화면 새로고침
        renderRecordCircle();
        renderRecordList();
      }
    }
  }
  
  // 삭제할 일정 정보를 저장할 변수
  let scheduleToDelete = {
    id: null,
    type: null
  };
  
  /**
   * 모달 창에서 일정 삭제 처리
   * 현재 편집 중인 일정을 삭제하고 모달을 닫음
   */
  function deleteScheduleFromModal() {
    // 현재 편집 중인 일정이 있는지 확인
    if (isEditMode && currentScheduleId !== null) {
      // 현재 탭에 따라 삭제 대상 구분
      const activeTab = getActiveTab();
      console.log('현재 활성화된 탭:', activeTab);
      
      // 삭제할 일정 정보 저장
      scheduleToDelete.id = currentScheduleId;
      
      // 탭 이름에 따라 타입 설정
      if (activeTab === 'plan') {
        scheduleToDelete.type = 'plan';
      } else if (activeTab === 'record') {
        scheduleToDelete.type = 'record';
      } else {
        // 기본값으로 plan 설정
        scheduleToDelete.type = 'plan';
      }
      
      console.log('삭제할 일정 정보 설정:', scheduleToDelete);
      
      // 삭제 확인 모달 표시
      const deleteConfirmModal = document.getElementById('delete-confirm-modal');
      deleteConfirmModal.style.display = 'block';
      
      // 오버레이 표시
      const overlayElement = document.getElementById('main-overlay');
      if (overlayElement) {
        overlayElement.style.display = 'block';
      }
    } else {
      alert('삭제할 일정이 없습니다.');
    }
  }
  
  /**
   * 일정 삭제 확인 처리
   * 삭제 확인 모달에서 삭제 버튼을 클릭했을 때 호출
   */
  function confirmDeleteSchedule() {
    console.log('삭제 버튼 클릭됨:', scheduleToDelete);
    
    if (scheduleToDelete.id !== null && scheduleToDelete.type !== null) {
      console.log('삭제 시작:', scheduleToDelete.type, scheduleToDelete.id);
      
      if (scheduleToDelete.type === 'plan') {
        // 계획에서 삭제
        console.log('삭제 전 planData 길이:', planData.length);
        planData.splice(scheduleToDelete.id, 1);
        console.log('삭제 후 planData 길이:', planData.length);
        
        // 로컬 스토리지 업데이트
        savePlanData();
        // 화면 새로고침
        renderPlanCircle();
        renderPlanList();
      } else if (scheduleToDelete.type === 'record') {
        // 기록에서 삭제
        console.log('삭제 전 recordData 길이:', recordData.length);
        recordData.splice(scheduleToDelete.id, 1);
        console.log('삭제 후 recordData 길이:', recordData.length);
        
        // 로컬 스토리지 업데이트
        saveRecordData();
        // 화면 새로고침
        renderRecordCircle();
        renderRecordList();
      }
      
      // 삭제 확인 모달 닫기
      const deleteConfirmModal = document.getElementById('delete-confirm-modal');
      deleteConfirmModal.style.display = 'none';
      
      // 일정 모달 닫기
      scheduleModal.style.display = 'none';
      
      // 오버레이 숨김
      const overlayElement = document.getElementById('main-overlay');
      if (overlayElement) {
        overlayElement.style.display = 'none';
      }
      
      // 삭제할 일정 정보 초기화
      scheduleToDelete.id = null;
      scheduleToDelete.type = null;
      
      console.log('삭제 완료');
    } else {
      console.error('삭제할 일정 정보가 없습니다:', scheduleToDelete);
    }
  }

  /**
   * 일정 저장 처리
   */
  function saveSchedule() {
    // 폼 데이터 가져오기
    const title = document.getElementById('schedule-title').value;
    const startTimeStr = document.getElementById('start-time').value;
    const endTimeStr = document.getElementById('end-time').value;
    const category = document.getElementById('schedule-category').value;
    // 색상은 카테고리에 따라 자동 지정
    const memo = document.getElementById('schedule-memo').value;
    
    // 시간 변환 (분 단위)
    const startTime = TimeCircleUtils.timeStringToMinutes(startTimeStr);
    const endTime = TimeCircleUtils.timeStringToMinutes(endTimeStr);
    
    // 유효성 검사
    if (!title) {
      alert('일정명을 입력해주세요.');
      return;
    }
    if (startTime === endTime) {
      alert('시작 시간과 종료 시간이 같을 수 없습니다.');
      return;
    }
    
    const schedule = { title, startTime, endTime, category, memo };
    const activeTab = getActiveTab();
    
    if (isEditMode && currentScheduleId !== null) {
      // 편집 모드: 해당 인덱스 덮어쓰기
      console.log('편집 모드 - 활성화된 탭:', activeTab);
      
      // 현재 날짜 정보 추가
      schedule.date = currentDate;
      
      if (activeTab === 'plan') {
        console.log('계획 데이터 수정:', currentScheduleId, schedule);
        planData[currentScheduleId] = schedule;
        // 로컬 스토리지에 저장
        savePlanData();
        renderPlanCircle();
        renderPlanList();
      } else if (activeTab === 'record') {
        console.log('기록 데이터 수정:', currentScheduleId, schedule);
        recordData[currentScheduleId] = schedule;
        // 로컬 스토리지에 저장
        saveRecordData();
        renderRecordCircle();
        renderRecordList();
      }
    } else {
      // 새 일정 추가
      console.log('새 일정 추가 - 활성화된 탭:', activeTab);
      
      // 현재 날짜 정보 추가
      schedule.date = currentDate;
      
      if (activeTab === 'plan') {
        console.log('계획 데이터 추가:', schedule);
        planData.push(schedule);
        // 로컬 스토리지에 저장
        savePlanData();
        renderPlanCircle();
        renderPlanList();
      } else if (activeTab === 'record') {
        console.log('기록 데이터 추가:', schedule);
        recordData.push(schedule);
        // 로컬 스토리지에 저장
        saveRecordData();
        renderRecordCircle();
        renderRecordList();
      }
    }
    closeModal(scheduleModal);

  }
  
  /**
   * 반복 일정 처리
   * @param {Object} schedule - 일정 객체
   * @param {string} repeatType - 반복 유형
   */
  function handleRecurringSchedule(schedule, repeatType) {
    // 현재는 구현하지 않음 (향후 확장)
    console.log('반복 일정 처리:', repeatType);
  }
  
  /**
   * 알림 설정
   * @param {Object} schedule - 일정 객체
   */
  function setupNotification(schedule) {
    // 알림 권한 확인
    if (!('Notification' in window)) {
      console.log('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    
    // 알림 권한 요청
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    // 현재는 구현하지 않음 (향후 확장)
    console.log('알림 설정:', schedule.notification);
  }
  
  /**
   * 설정 모달 초기화
   */
  function initSettingsModal() {
    const settings = TimeCircleStorage.getSettings();
    const categories = TimeCircleStorage.getCategories();
    
    // 설정 폼에 값 설정
    document.getElementById('time-interval').value = settings.timeInterval || '15';
    document.getElementById('show-empty-time').checked = settings.showEmptyTime !== false;
    document.getElementById('dark-mode').checked = settings.darkMode || false;
    
    // 카테고리 관리자 초기화
    const categoryManager = document.getElementById('category-manager');
    categoryManager.innerHTML = '';
    
    // 카테고리 항목 추가
    categories.forEach(category => {
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      categoryItem.dataset.id = category.id;
      
      const categoryColor = document.createElement('div');
      categoryColor.className = 'category-color';
      categoryColor.style.backgroundColor = category.color;
      
      const categoryName = document.createElement('div');
      categoryName.className = 'category-name';
      categoryName.textContent = category.name;
      
      const categoryActions = document.createElement('div');
      categoryActions.className = 'category-actions';
      
      // 편집 버튼
      const editButton = document.createElement('button');
      editButton.className = 'action-btn edit';
      editButton.innerHTML = '<i class="fas fa-edit"></i>';
      editButton.addEventListener('click', () => editCategory(category));
      
      // 삭제 버튼
      const deleteButton = document.createElement('button');
      deleteButton.className = 'action-btn delete';
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.addEventListener('click', () => deleteCategory(category.id));
      
      categoryActions.appendChild(editButton);
      categoryActions.appendChild(deleteButton);
      
      categoryItem.appendChild(categoryColor);
      categoryItem.appendChild(categoryName);
      categoryItem.appendChild(categoryActions);
      
      categoryManager.appendChild(categoryItem);
    });
    
    // 모달 표시
    settingsModal.style.display = 'block';
    overlay.style.display = 'block';
  }
  
  /**
   * 카테고리 편집
   * @param {Object} category - 카테고리 객체
   */
  function editCategory(category) {
    // 현재는 간단한 프롬프트로 구현
    const newName = prompt('카테고리 이름을 입력하세요:', category.name);
    if (newName && newName.trim()) {
      const newColor = prompt('카테고리 색상 코드를 입력하세요 (예: #ff0000):', category.color);
      
      if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
        TimeCircleStorage.updateCategory(category.id, {
          name: newName.trim(),
          color: newColor
        });
        
        // 설정 모달 새로고침
        initSettingsModal();
      }
    }
  }
  
  /**
   * 카테고리 삭제
   * @param {string} categoryId - 카테고리 ID
   */
  function deleteCategory(categoryId) {
    // 기본 카테고리는 삭제 불가
    const defaultCategories = ['work', 'study', 'meal', 'exercise', 'rest', 'sleep', 'transport', 'other'];
    if (defaultCategories.includes(categoryId)) {
      alert('기본 카테고리는 삭제할 수 없습니다.');
      return;
    }
    
    if (confirm('이 카테고리를 삭제하시겠습니까? 해당 카테고리의 일정은 "기타" 카테고리로 변경됩니다.')) {
      // 해당 카테고리의 일정 처리
      const allSchedules = TimeCircleStorage.exportData().schedules;
      
      // 모든 날짜의 일정 순회
      Object.keys(allSchedules).forEach(date => {
        const dateSchedules = allSchedules[date];
        let hasChanged = false;
        
        // 해당 날짜의 일정 중 삭제할 카테고리의 일정 찾기
        dateSchedules.forEach(schedule => {
          if (schedule.category === categoryId) {
            schedule.category = 'other';
            hasChanged = true;
          }
        });
        
        // 변경된 일정이 있으면 저장
        if (hasChanged) {
          TimeCircleStorage.saveSchedules(date, dateSchedules);
        }
      });
      
      // 카테고리 삭제
      TimeCircleStorage.deleteCategory(categoryId);
      
      // 설정 모달 새로고침
      initSettingsModal();
    }
  }
  
  /**
   * 새 카테고리 추가
   */
  function addNewCategory() {
    const name = prompt('새 카테고리 이름을 입력하세요:');
    if (name && name.trim()) {
      const color = prompt('카테고리 색상 코드를 입력하세요 (예: #ff0000):', '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
      
      if (color && /^#[0-9A-F]{6}$/i.test(color)) {
        const id = name.trim().toLowerCase().replace(/\s+/g, '_');
        
        TimeCircleStorage.addCategory({
          id,
          name: name.trim(),
          color
        });
        
        // 설정 모달 새로고침
        initSettingsModal();
      }
    }
  }
  
  /**
   * 설정 저장
   */
  function saveSettings() {
    const timeInterval = parseInt(document.getElementById('time-interval').value);
    const showEmptyTime = document.getElementById('show-empty-time').checked;
    const darkMode = document.getElementById('dark-mode').checked;
    
    const settings = TimeCircleStorage.getSettings();
    
    // 설정 업데이트
    settings.timeInterval = timeInterval;
    settings.showEmptyTime = showEmptyTime;
    settings.darkMode = darkMode;
    
    TimeCircleStorage.saveSettings(settings);
    
    // 다크 모드 적용
    applyDarkMode(darkMode);
    
    // 모달 닫기
    closeModal(settingsModal);
  }
  
  /**
   * 다크 모드 적용
   * @param {boolean} isDarkMode - 다크 모드 활성화 여부
   */
  function applyDarkMode(isDarkMode) {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
  
  /**
   * 모달 닫기
   * @param {HTMLElement} modal - 닫을 모달 요소
   */
  function closeModal(modal) {
    if (modal) {
      modal.style.display = 'none';
    }
    
    // overlay가 존재하는지 확인 후 숨김 처리
    if (overlay) {
      overlay.style.display = 'none';
    } else {
      const overlayElement = document.getElementById('main-overlay');
      if (overlayElement) {
        overlayElement.style.display = 'none';
      }
    }
  }
  
  /**
   * 데이터 내보내기
   */
  function exportData() {
    const data = TimeCircleStorage.exportData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `timecircle_data_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  }
  
  /**
   * 데이터 가져오기
   */
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target.result);
          const success = TimeCircleStorage.importData(data);
          
          if (success) {
            alert('데이터를 성공적으로 가져왔습니다.');
            
            // 앱 새로고침
            TimeCircle.refresh();
            ScheduleList.refresh();
            
            // 설정 적용
            applyDarkMode(data.settings.darkMode);
            
            // 모달 닫기
            closeModal(settingsModal);
          } else {
            alert('데이터 형식이 올바르지 않습니다.');
          }
        } catch (error) {
          console.error('데이터 가져오기 오류:', error);
          alert('데이터를 가져오는 중 오류가 발생했습니다.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }
  
  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    // 날짜 네비게이션 버튼
    document.getElementById('prev-date').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-date').addEventListener('click', () => changeDate(1));
    
    // 설정 버튼
    document.getElementById('settings-btn').addEventListener('click', initSettingsModal);

    // 초기화 버튼(모든 데이터 삭제) - 모달 표시
    document.getElementById('reset-all-btn').addEventListener('click', function() {
      document.getElementById('reset-modal').style.display = 'flex';
    });
    // 모달 내 취소 버튼
    document.getElementById('cancel-reset-btn').addEventListener('click', function() {
      document.getElementById('reset-modal').style.display = 'none';
    });
    // 모달 내 초기화 버튼
    document.getElementById('confirm-reset-btn').addEventListener('click', function() {
      // 데이터 배열 초기화
      window.planData = [];
      window.recordData = [];
      
      // 로컬 스토리지 완전 삭제
      localStorage.clear();
      
      // 로컬 스토리지에 빈 배열 저장
      localStorage.setItem(PLAN_DATA_KEY, JSON.stringify([]));
      localStorage.setItem(RECORD_DATA_KEY, JSON.stringify([]));
      
      // 화면 새로고침
      location.reload();
    });
    // ESC 키로도 모달 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('reset-modal').style.display = 'none';
      }
    });
    
    // 새 일정 추가 버튼
    document.getElementById('add-schedule-btn').addEventListener('click', () => initScheduleModal(false));
    
    // 일정 모달 버튼
    document.getElementById('save-schedule').addEventListener('click', saveSchedule);
    document.getElementById('cancel-schedule').addEventListener('click', () => closeModal(scheduleModal));
    document.getElementById('delete-schedule').addEventListener('click', deleteScheduleFromModal);
    
    // 삭제 확인 모달 버튼
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteSchedule);
    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
      const deleteConfirmModal = document.getElementById('delete-confirm-modal');
      closeModal(deleteConfirmModal);
    });
    
    // 설정 모달 버튼
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('reset-settings').addEventListener('click', () => {
      if (confirm('모든 설정을 초기화하시겠습니까?')) {
        TimeCircleStorage.resetAllData();
        closeModal(settingsModal);
        location.reload();
      }
    });
    
    // 카테고리 추가 버튼
    document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
    
    // 데이터 관리 버튼
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', importData);
    
    // 모달 닫기 버튼
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        closeModal(button.closest('.modal'));
      });
    });
    
    // 탭 전환 기능 (day-circle, day-record, week-view)
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 활성화된 탭 버튼 변경
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 활성화된 탭 콘텐츠 변경
        const tabId = button.getAttribute('data-tab');
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`${tabId}-content`).classList.add('active');
        
        // 홈 탭 선택 시 홈 대시보드 렌더링
        if (tabId === 'home-tab') {
          if (window.refreshHomeTab) window.refreshHomeTab();
        }
        // 주간 뷰 선택 시 주간 캘린더 렌더링
        if (tabId === 'week-view') {
          renderWeekCalendar();
        }
        // 하루 기록 탭 선택 시 기록 데이터 렌더링
        if (tabId === 'day-record') {
          renderRecordCircle();
          renderRecordList();
          // bindRecordChartControls(); // 함수 미정의로 인한 오류 방지: 필요시 구현
        }
        // 하루 계획 탭 선택 시 계획 데이터 렌더링
        if (tabId === 'day-circle') {
          renderPlanCircle();
          renderPlanList();
        }
      });
    });
    // 하루 계획(planData)과 하루 기록(recordData)를 별도 관리할 수 있도록 구조화

    // --- 하루 계획(Plan) 렌더링 함수 ---
    function renderPlanCircle() {
      console.log('Rendering plan circle...');
      const el = document.getElementById('time-circle');
      if (!el) {
        console.error('time-circle element not found');
        return;
      }
      el.innerHTML = '';
      
      // 현재 날짜에 해당하는 계획 데이터만 필터링
      const filteredPlanData = planData.filter(item => item.date === currentDate);
      console.log('Filtered plan data:', filteredPlanData);
      
      try {
        // 실제 계획 원형 차트 렌더링
        TimeCircle.init('time-circle', filteredPlanData);
        console.log('Plan circle rendered successfully');
      } catch (error) {
        console.error('Error rendering plan circle:', error);
      }
    }
    function renderPlanList() {
      console.log('renderPlanList 함수 실행');
      const timetableContainer = document.getElementById('day-timetable');
      console.log('timetableContainer:', timetableContainer);
      if (!timetableContainer) return;
      timetableContainer.innerHTML = '';
      
      // 현재 날짜에 해당하는 계획 데이터만 필터링
      const filteredPlanData = planData.filter(item => item.date === currentDate);
      
      // 시간표 그리드 생성
      timetableContainer.className = 'day-timetable';
      
      // 시간 레이블 추가
      const timeHeader = document.createElement('div');
      timeHeader.className = 'time-header';
      timeHeader.textContent = '시간';
      timetableContainer.appendChild(timeHeader);
      
      // 요일 헤더 추가 (선택된 날짜만)
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
      const selectedDate = new Date(currentDate);
      const dayIndex = selectedDate.getDay();
      const formattedDate = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}`;
      dayHeader.textContent = `${dayOfWeek[dayIndex]} (${formattedDate})`;
      timetableContainer.appendChild(dayHeader);
      
      // 시간대 추가
      for (let hour = 0; hour < 24; hour++) {
        // 시간 레이블
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${hour}:00`;
        timetableContainer.appendChild(timeLabel);
        
        // 시간 슬롯 추가
        const cell = document.createElement('div');
        cell.className = 'time-slot';
        cell.dataset.hour = hour;
        timetableContainer.appendChild(cell);
      }
      
      // 일정이 없을 경우 메시지 표시
      if (filteredPlanData.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = '계획이 없습니다.';
        emptyMessage.style.gridColumn = '1 / span 2';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = '#aaa';
        emptyMessage.style.padding = '20px';
        timetableContainer.appendChild(emptyMessage);
        return;
      }
      
      // 필터링된 데이터를 시간표에 표시
      filteredPlanData.forEach((plan, index) => {
        // 시작 시간과 종료 시간 계산 (분 단위 포함)
        const startHour = Math.floor(plan.startTime / 60);
        const startMinute = plan.startTime % 60;
        const endHour = Math.floor(plan.endTime / 60);
        const endMinute = plan.endTime % 60;
        
        // 해당 시간대의 셀에 일정 표시
        for (let hour = startHour; hour <= endHour; hour++) {
          // 24시간을 넘어가면 무시
          if (hour >= 24) continue;
          
          // 해당 셀 찾기
          const cell = timetableContainer.querySelector(`.time-slot[data-hour="${hour}"]`);
          if (cell) {
            // 셀의 position을 relative로 설정하여 내부 요소를 절대 위치로 배치할 수 있게 함
            cell.style.position = 'relative';
            cell.style.overflow = 'hidden';
            
            // 분 단위를 고려한 셀 스타일 적용
            // 분 단위를 배경색 범위로 변환
            let topOffset = 0;
            let heightPercentage = 100;
            
            // 첫 시간대인 경우 시작 분에 따라 상단 여백 조정
            if (hour === startHour) {
              topOffset = (startMinute / 60) * 100;
              heightPercentage = 100 - topOffset;
            }
            
            // 마지막 시간대인 경우 종료 분에 따라 하단 여백 조정
            if (hour === endHour) {
              heightPercentage = (endMinute / 60) * 100;
            }
            
            // 첫 시간대이면서 마지막 시간대인 경우 (한 시간 내에 완료되는 일정)
            if (hour === startHour && hour === endHour) {
              topOffset = (startMinute / 60) * 100;
              heightPercentage = ((endMinute - startMinute) / 60) * 100;
            }
            
            // 셀 내부에 일정 표시를 위한 div 생성
            const eventDiv = document.createElement('div');
            eventDiv.className = 'schedule-block';
            eventDiv.style.position = 'absolute';
            eventDiv.style.top = `${topOffset}%`;
            eventDiv.style.height = `${heightPercentage}%`;
            eventDiv.style.left = '0';
            eventDiv.style.right = '0';
            eventDiv.style.width = '100%';
            // 카테고리 색상 적용 (투명도 조절)
            const categoryColor = TimeCircleUtils.getCategoryColor(plan.category);
            eventDiv.style.backgroundColor = categoryColor;
            eventDiv.style.opacity = '0.9';
            eventDiv.style.borderLeft = `4px solid ${categoryColor}`;
            
            // 일정 내용 추가 (첫 시간대에만 제목 표시)
            if (hour === startHour) {
              // 일정 블록의 높이에 따라 표시할 내용 결정
              let blockContent = '';
              
              // 항상 일정 제목은 표시
              blockContent += `<div class="schedule-title">${plan.title || ''}</div>`;
              
              // 높이가 충분하면 시간 정보도 표시 (30분 이상)
              if (heightPercentage > 30 || (hour === endHour && hour === startHour && endMinute - startMinute >= 30)) {
                blockContent += `<div class="schedule-time">${TimeCircleUtils.minutesToTimeString(plan.startTime)} ~ ${TimeCircleUtils.minutesToTimeString(plan.endTime)}</div>`;
                blockContent += `<div class="schedule-category">${TimeCircleUtils.getCategoryName(plan.category)}</div>`;
              }
              
              eventDiv.innerHTML = blockContent;
              
              // 일정 블록에 클릭 이벤트 추가
              eventDiv.style.cursor = 'pointer';
              eventDiv.addEventListener('click', () => {
                initScheduleModal(true, plan);
                currentScheduleId = index;
              });
            }
            
            cell.appendChild(eventDiv);
          }
        }
      });
    }

    // --- 하루 기록(Record) 렌더링 함수 ---
    function renderRecordCircle() {
      const el = document.getElementById('record-circle');
      if (!el) return;
      el.innerHTML = '';
      
      // 현재 날짜에 해당하는 기록 데이터만 필터링
      const filteredRecordData = recordData.filter(item => item.date === currentDate);
      
      // 기록 데이터로 원형 차트 렌더링
      TimeCircle.init('record-circle', filteredRecordData);
    }
    function renderRecordList() {
      console.log('renderRecordList 함수 실행');
      const timetableContainer = document.getElementById('record-timetable');
      console.log('record-timetableContainer:', timetableContainer);
      if (!timetableContainer) return;
      timetableContainer.innerHTML = '';
      
      // 현재 날짜에 해당하는 기록 데이터만 필터링
      const filteredRecordData = recordData.filter(item => item.date === currentDate);
      
      // 시간표 그리드 생성
      timetableContainer.className = 'day-timetable';
      
      // 시간 레이블 추가
      const timeHeader = document.createElement('div');
      timeHeader.className = 'time-header';
      timeHeader.textContent = '시간';
      timetableContainer.appendChild(timeHeader);
      
      // 요일 헤더 추가 (선택된 날짜만)
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
      const selectedDate = new Date(currentDate);
      const dayIndex = selectedDate.getDay();
      const formattedDate = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}`;
      dayHeader.textContent = `${dayOfWeek[dayIndex]} (${formattedDate})`;
      timetableContainer.appendChild(dayHeader);
      
      // 시간대 추가
      for (let hour = 0; hour < 24; hour++) {
        // 시간 레이블
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${hour}:00`;
        timetableContainer.appendChild(timeLabel);
        
        // 시간 슬롯 추가
        const cell = document.createElement('div');
        cell.className = 'time-slot';
        cell.dataset.hour = hour;
        timetableContainer.appendChild(cell);
      }
      
      // 일정이 없을 경우 메시지 표시
      if (filteredRecordData.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = '기록이 없습니다.';
        emptyMessage.style.gridColumn = '1 / span 2';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = '#aaa';
        emptyMessage.style.padding = '20px';
        timetableContainer.appendChild(emptyMessage);
        return;
      }
      
      // 필터링된 데이터를 시간표에 표시
      filteredRecordData.forEach((record, index) => {
        // 시작 시간과 종료 시간 계산 (분 단위 포함)
        const startHour = Math.floor(record.startTime / 60);
        const startMinute = record.startTime % 60;
        const endHour = Math.floor(record.endTime / 60);
        const endMinute = record.endTime % 60;
        
        // 해당 시간대의 셀에 일정 표시
        for (let hour = startHour; hour <= endHour; hour++) {
          // 24시간을 넘어가면 무시
          if (hour >= 24) continue;
          
          // 해당 셀 찾기
          const cell = timetableContainer.querySelector(`.time-slot[data-hour="${hour}"]`);
          if (cell) {
            // 셀의 position을 relative로 설정하여 내부 요소를 절대 위치로 배치할 수 있게 함
            cell.style.position = 'relative';
            cell.style.overflow = 'hidden';
            
            // 분 단위를 고려한 셀 스타일 적용
            // 분 단위를 배경색 범위로 변환
            let topOffset = 0;
            let heightPercentage = 100;
            
            // 첫 시간대인 경우 시작 분에 따라 상단 여백 조정
            if (hour === startHour) {
              topOffset = (startMinute / 60) * 100;
              heightPercentage = 100 - topOffset;
            }
            
            // 마지막 시간대인 경우 종료 분에 따라 하단 여백 조정
            if (hour === endHour) {
              heightPercentage = (endMinute / 60) * 100;
            }
            
            // 첫 시간대이면서 마지막 시간대인 경우 (한 시간 내에 완료되는 일정)
            if (hour === startHour && hour === endHour) {
              topOffset = (startMinute / 60) * 100;
              heightPercentage = ((endMinute - startMinute) / 60) * 100;
            }
            
            // 셀 내부에 일정 표시를 위한 div 생성
            const eventDiv = document.createElement('div');
            eventDiv.className = 'schedule-block';
            eventDiv.style.position = 'absolute';
            eventDiv.style.top = `${topOffset}%`;
            eventDiv.style.height = `${heightPercentage}%`;
            eventDiv.style.left = '0';
            eventDiv.style.right = '0';
            eventDiv.style.width = '100%';
            // 카테고리 색상 적용 (투명도 조절)
            const categoryColor = TimeCircleUtils.getCategoryColor(record.category);
            eventDiv.style.backgroundColor = categoryColor;
            eventDiv.style.opacity = '0.9';
            eventDiv.style.borderLeft = `4px solid ${categoryColor}`;
            
            // 일정 내용 추가 (첫 시간대에만 제목 표시)
            if (hour === startHour) {
              // 일정 블록의 높이에 따라 표시할 내용 결정
              let blockContent = '';
              
              // 항상 일정 제목은 표시
              blockContent += `<div class="schedule-title">${record.title || ''}</div>`;
              
              // 높이가 충분하면 시간 정보도 표시 (30분 이상)
              if (heightPercentage > 30 || (hour === endHour && hour === startHour && endMinute - startMinute >= 30)) {
                blockContent += `<div class="schedule-time">${TimeCircleUtils.minutesToTimeString(record.startTime)} ~ ${TimeCircleUtils.minutesToTimeString(record.endTime)}</div>`;
                blockContent += `<div class="schedule-category">${TimeCircleUtils.getCategoryName(record.category)}</div>`;
              }
              
              eventDiv.innerHTML = blockContent;
              
              // 일정 블록에 클릭 이벤트 추가
              eventDiv.style.cursor = 'pointer';
              eventDiv.addEventListener('click', () => {
                initScheduleModal(true, record);
                currentScheduleId = index;
              });
            }
            
            cell.appendChild(eventDiv);
          }
        }
      });
    }
    // 전역 노출(혹시 외부에서 직접 호출 필요시)
    window.renderPlanCircle = renderPlanCircle;
    window.renderPlanList = renderPlanList;
    window.renderRecordCircle = renderRecordCircle;
    window.renderRecordList = renderRecordList;

    // --- 하루 기록(Record) 차트 컨트롤 ---
    let recordZoom = 1.0;
    const recordZoomStep = 0.1;
    const recordMinZoom = 0.5;
    const recordMaxZoom = 1.5;
    
    function bindRecordChartControls() {
      // 중복 바인딩 방지
      const zoomInBtn = document.getElementById('zoom-in-record');
      const zoomOutBtn = document.getElementById('zoom-out-record');
      const resetBtn = document.getElementById('reset-view-record');
      if (!zoomInBtn || zoomInBtn.dataset.bound) return;
      zoomInBtn.dataset.bound = zoomOutBtn.dataset.bound = resetBtn.dataset.bound = 'true';
      zoomInBtn.addEventListener('click', () => {
        if (recordZoom < recordMaxZoom) {
          recordZoom += recordZoomStep;
          applyRecordZoom();
        }
      });
      zoomOutBtn.addEventListener('click', () => {
        if (recordZoom > recordMinZoom) {
          recordZoom -= recordZoomStep;
          applyRecordZoom();
        }
      });
      resetBtn.addEventListener('click', () => {
        recordZoom = 1.0;
        applyRecordZoom();
      });
    }
    function applyRecordZoom() {
      const recordCircleElement = document.getElementById('record-circle');
      if (!recordCircleElement) return;
      recordCircleElement.style.transform = `scale(${recordZoom})`;
      recordCircleElement.style.transformOrigin = 'center';
      const diff = date.getDate() - day;
      
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const newDate = new Date(date);
        newDate.setDate(diff + i);
        weekDates.push(newDate);
      }
      
      return weekDates;
    }
    
    // 차트 컨트롤 버튼
    // 확대/축소 관련 변수
    let currentZoom = 1.0;
    const zoomStep = 0.1;
    const minZoom = 0.5;
    const maxZoom = 1.5;
    const timeCircleElement = document.getElementById('time-circle');
    
    // 확대 버튼 기능 구현
    document.getElementById('zoom-in').addEventListener('click', () => {
      if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        applyZoom();
      }
    });
    
    // 축소 버튼 기능 구현
    document.getElementById('zoom-out').addEventListener('click', () => {
      if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        applyZoom();
      }
    });
    
    // 초기화 버튼 기능 구현
    document.getElementById('reset-view').addEventListener('click', () => {
      currentZoom = 1.0;
      applyZoom();
    });
    
    // 확대/축소 적용 함수
    function applyZoom() {
      timeCircleElement.style.transform = `scale(${currentZoom})`;
      timeCircleElement.style.transformOrigin = 'center';
      
      // 확대/축소 상태에 따라 버튼 활성화/비활성화
      document.getElementById('zoom-in').disabled = (currentZoom >= maxZoom);
      document.getElementById('zoom-out').disabled = (currentZoom <= minZoom);
      document.getElementById('reset-view').disabled = (currentZoom === 1.0);
    }
    
    // 일정 생성 이벤트
    document.addEventListener('create-schedule', function(event) {
      const detail = event.detail;
      initScheduleModal(false, {
        startTime: detail.startTime,
        endTime: detail.endTime
      });
    });
    
    // 일정 편집 이벤트
    document.addEventListener('edit-schedule', function(event) {
      const detail = event.detail;
      initScheduleModal(true, detail.schedule);
    });
    
    // 카테고리 변경 이벤트 리스너 (색상 선택 제거로 사용하지 않음)
    document.getElementById('schedule-category').addEventListener('change', function() {
      // 카테고리 변경 시 추가 로직이 필요하면 여기에 추가
    });
    
    // 키보드 이벤트 (ESC로 모달 닫기)
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        if (scheduleModal.style.display === 'block') {
          closeModal(scheduleModal);
        } else if (settingsModal.style.display === 'block') {
          closeModal(settingsModal);
        }
      }
    });
  }
  
  // 활성 탭 반환 함수
  function getActiveTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    const tabId = activeBtn ? activeBtn.getAttribute('data-tab') : 'day-plan';
    
    console.log('현재 활성화된 탭 버튼:', activeBtn);
    console.log('탭 ID:', tabId);
    
    // 탭 ID와 콘텐츠 ID 매핑
    const tabMapping = {
      'day-plan': 'plan',
      'day-record': 'record',
      'week-view': 'week',
      'home-tab': 'home'
    };
    
    // 탭 ID에 따라 단순화된 탭 이름 반환
    if (tabId.includes('plan') || tabId.includes('circle')) {
      return 'plan';
    } else if (tabId.includes('record')) {
      return 'record';
    } else if (tabId.includes('week')) {
      return 'week';
    } else if (tabId.includes('home')) {
      return 'home';
    }
    
    // 기본값으로 plan 반환
    return 'plan';
  }
  // 공개 API
  return {
    /**
     * 앱 초기화
     */
    init: function() {
      // 현재 날짜 설정
      currentDate = TimeCircleUtils.getCurrentDateString();
      
      // DOM 요소 참조
      scheduleModal = document.getElementById('schedule-modal');
      settingsModal = document.getElementById('settings-modal');
      overlay = document.getElementById('main-overlay');
      
      // 현재 날짜 표시 업데이트
      updateCurrentDateDisplay();
      
      // 이벤트 리스너 설정
      setupEventListeners();
      
      // 설정 적용
      const settings = TimeCircleStorage.getSettings();
      applyDarkMode(settings.darkMode);
    }
  };
})();

// 페이지 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
  TimeCircleApp.init();
  
  // 삭제 확인 모달 버튼에 이벤트 리스너 직접 추가
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', function() {
      console.log('삭제 확인 버튼 클릭');
      confirmDeleteSchedule();
    });
  }
  
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', function() {
      const deleteConfirmModal = document.getElementById('delete-confirm-modal');
      if (deleteConfirmModal) {
        deleteConfirmModal.style.display = 'none';
      }
      const overlayElement = document.getElementById('main-overlay');
      if (overlayElement) {
        overlayElement.style.display = 'none';
      }
    });
  }
  
  // 페이지 최초 로딩 시에도 각 탭 렌더링 보장
  setTimeout(() => {
    // 홈 탭
    if (window.refreshHomeTab) window.refreshHomeTab();
    
    // 홈 탭을 기본으로 활성화
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 탭 콘텐츠 활성화
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById('home-tab-content').classList.add('active');
    
    // 하루 계획 탭
    if (document.getElementById('time-circle')) renderPlanCircle();
    if (document.getElementById('schedule-list-body-list')) renderPlanList();
    
    // 하루 기록 탭
    if (document.getElementById('record-circle')) renderRecordCircle();
    if (document.getElementById('record-list-body-list')) renderRecordList();
    
    // 주간 뷰 탭
    renderWeekCalendar();
  }, 10);
});
