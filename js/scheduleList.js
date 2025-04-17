/**
 * TimeCircle - Schedule List Component
 * 일정 목록 관리 및 표시 컴포넌트
 */

const ScheduleList = (function() {
  // 비공개 변수
  let currentDate, schedules, categories, settings;
  let listBody, searchInput, categoryFilter;
  
  /**
   * 일정 목록 렌더링
   */
  function renderScheduleList() {
    if (!listBody) return;
    
    // 기존 목록 비우기
    listBody.innerHTML = '';
    
    if (!schedules || schedules.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.textContent = '등록된 일정이 없습니다.';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.padding = '20px 0';
      emptyRow.appendChild(emptyCell);
      listBody.appendChild(emptyRow);
      return;
    }
    
    // 검색어 가져오기
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    // 카테고리 필터 가져오기
    const categoryValue = categoryFilter ? categoryFilter.value : 'all';
    
    // 일정 정렬 (시작 시간 기준)
    const sortedSchedules = [...schedules].sort((a, b) => a.startTime - b.startTime);
    
    // 필터링된 일정 목록
    const filteredSchedules = sortedSchedules.filter(schedule => {
      // 검색어 필터링
      const matchesSearch = !searchTerm || 
        schedule.title.toLowerCase().includes(searchTerm) ||
        (schedule.memo && schedule.memo.toLowerCase().includes(searchTerm));
      
      // 카테고리 필터링
      const matchesCategory = categoryValue === 'all' || schedule.category === categoryValue;
      
      return matchesSearch && matchesCategory;
    });
    
    // 빈 시간대 계산 (설정에 따라)
    const showEmptyTime = settings?.showEmptyTime ?? true;
    const timeSlots = [];
    
    if (showEmptyTime && filteredSchedules.length > 0) {
      // 시간 간격 (분)
      const timeInterval = settings?.timeInterval ?? 15;
      
      // 일정이 있는 시간대 추적
      const occupiedTimes = new Set();
      
      // 모든 일정의 시간대 표시
      filteredSchedules.forEach(schedule => {
        for (let time = schedule.startTime; time < schedule.endTime; time += timeInterval) {
          occupiedTimes.add(time);
        }
      });
      
      // 하루의 모든 시간대 순회 (timeInterval 간격으로)
      for (let time = 0; time < 24 * 60; time += timeInterval) {
        if (occupiedTimes.has(time)) {
          // 해당 시간대의 일정 찾기
          const schedule = filteredSchedules.find(s => 
            s.startTime <= time && time < s.endTime
          );
          
          if (schedule) {
            // 이미 추가된 일정인지 확인
            if (!timeSlots.some(slot => slot.id === schedule.id)) {
              timeSlots.push(schedule);
            }
          }
        } else {
          // 연속된 빈 시간대 찾기
          let endTime = time + timeInterval;
          while (endTime < 24 * 60 && !occupiedTimes.has(endTime)) {
            endTime += timeInterval;
          }
          
          timeSlots.push({
            id: `empty-${time}`,
            title: '비어 있음',
            startTime: time,
            endTime: endTime,
            isEmpty: true
          });
          
          // 다음 검사 시간대로 이동
          time = endTime - timeInterval;
        }
      }
    } else {
      // 빈 시간대 없이 일정만 표시
      timeSlots.push(...filteredSchedules);
    }
    
    // 시간 순으로 정렬
    timeSlots.sort((a, b) => a.startTime - b.startTime);
    
    // 목록에 일정 추가
    timeSlots.forEach(slot => {
      const row = document.createElement('tr');
      
      if (slot.isEmpty) {
        row.classList.add('empty-slot');
      }
      
      // 시간 열
      const timeCell = document.createElement('td');
      timeCell.textContent = TimeCircleUtils.formatTimeRange(slot.startTime, slot.endTime);
      row.appendChild(timeCell);
      
      // 일정명 열
      const titleCell = document.createElement('td');
      
      if (!slot.isEmpty) {
        const categoryIndicator = document.createElement('span');
        categoryIndicator.className = 'category-indicator';
        categoryIndicator.style.backgroundColor = slot.color || TimeCircleUtils.getCategoryColor(slot.category);
        titleCell.appendChild(categoryIndicator);
      }
      
      const titleText = document.createTextNode(slot.title);
      titleCell.appendChild(titleText);
      row.appendChild(titleCell);
      
      // 카테고리 열
      const categoryCell = document.createElement('td');
      if (!slot.isEmpty) {
        const category = categories.find(c => c.id === slot.category);
        categoryCell.textContent = category ? category.name : slot.category;
      } else {
        categoryCell.textContent = '-';
      }
      row.appendChild(categoryCell);
      
      // 액션 열
      const actionCell = document.createElement('td');
      
      if (!slot.isEmpty) {
        // 편집 버튼
        const editButton = document.createElement('button');
        editButton.className = 'action-btn edit';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = '일정 편집';
        editButton.addEventListener('click', () => editSchedule(slot));
        actionCell.appendChild(editButton);
        
        // 삭제 버튼
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn delete';
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.title = '일정 삭제';
        deleteButton.addEventListener('click', () => deleteSchedule(slot));
        actionCell.appendChild(deleteButton);
      } else {
        // 빈 시간대에 일정 추가 버튼
        const addButton = document.createElement('button');
        addButton.className = 'action-btn add';
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.title = '이 시간에 일정 추가';
        addButton.addEventListener('click', () => addScheduleToEmptySlot(slot));
        actionCell.appendChild(addButton);
      }
      
      row.appendChild(actionCell);
      listBody.appendChild(row);
    });
  }
  
  /**
   * 일정 편집 모달 열기
   * @param {Object} schedule - 일정 객체
   */
  function editSchedule(schedule) {
    // 이벤트 발생 (일정 편집 요청)
    const editEvent = new CustomEvent('edit-schedule', { detail: { schedule, date: currentDate } });
    document.dispatchEvent(editEvent);
  }
  
  /**
   * 일정 삭제
   * @param {Object} schedule - 일정 객체
   */
  function deleteSchedule(schedule) {
    if (confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) {
      TimeCircleStorage.deleteSchedule(currentDate, schedule.id);
      schedules = TimeCircleStorage.getSchedules(currentDate);
      renderScheduleList();
    }
  }
  
  /**
   * 빈 시간대에 일정 추가
   * @param {Object} emptySlot - 빈 시간대 객체
   */
  function addScheduleToEmptySlot(emptySlot) {
    // 이벤트 발생 (새 일정 생성 요청)
    const createEvent = new CustomEvent('create-schedule', { 
      detail: { 
        startTime: emptySlot.startTime, 
        endTime: emptySlot.endTime,
        date: currentDate 
      } 
    });
    document.dispatchEvent(createEvent);
  }
  
  /**
   * 카테고리 필터 옵션 업데이트
   */
  function updateCategoryFilter() {
    if (!categoryFilter) return;
    
    // 기존 옵션 제거
    while (categoryFilter.options.length > 1) {
      categoryFilter.remove(1);
    }
    
    // 카테고리 옵션 추가
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });
  }
  
  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    // 검색 입력 이벤트
    if (searchInput) {
      searchInput.addEventListener('input', debounce(renderScheduleList, 300));
    }
    
    // 검색 버튼 클릭 이벤트
    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
      searchButton.addEventListener('click', renderScheduleList);
    }
    
    // 카테고리 필터 변경 이벤트
    if (categoryFilter) {
      categoryFilter.addEventListener('change', renderScheduleList);
    }
    
    // 일정 데이터 변경 이벤트
    document.addEventListener('schedules-updated', function(event) {
      if (event.detail.date === currentDate) {
        schedules = event.detail.schedules;
        renderScheduleList();
      }
    });
    
    // 카테고리 데이터 변경 이벤트
    document.addEventListener('categories-updated', function(event) {
      categories = event.detail.categories;
      updateCategoryFilter();
      renderScheduleList();
    });
    
    // 설정 변경 이벤트
    document.addEventListener('settings-updated', function(event) {
      settings = event.detail.settings;
      renderScheduleList();
    });
  }
  
  /**
   * 디바운스 함수 (연속 호출 제한)
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간 (ms)
   * @returns {Function} - 디바운스된 함수
   */
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }
  
  // 공개 API
  return {
    /**
     * 일정 목록 초기화
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     */
    init: function(date) {
      currentDate = date || TimeCircleUtils.getCurrentDateString();
      schedules = TimeCircleStorage.getSchedules(currentDate);
      categories = TimeCircleStorage.getCategories();
      settings = TimeCircleStorage.getSettings();
      
      // DOM 요소 참조
      listBody = document.getElementById('schedule-list-body');
      searchInput = document.getElementById('schedule-search');
      categoryFilter = document.getElementById('category-filter');
      
      updateCategoryFilter();
      renderScheduleList();
      setupEventListeners();
    },
    
    /**
     * 날짜 변경
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     */
    changeDate: function(date) {
      currentDate = date;
      schedules = TimeCircleStorage.getSchedules(currentDate);
      renderScheduleList();
    },
    
    /**
     * 목록 새로고침
     */
    refresh: function() {
      schedules = TimeCircleStorage.getSchedules(currentDate);
      renderScheduleList();
    }
  };
})();

// 페이지 로드 시 일정 목록 초기화
document.addEventListener('DOMContentLoaded', function() {
  ScheduleList.init();
});
