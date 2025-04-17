// Home Tab Logic
// 홈 탭에 하루 계획과 하루 기록의 원 차트 표시

document.addEventListener('DOMContentLoaded', function() {
  const homeTab = document.getElementById('home-tab-content');
  if (!homeTab) return;

  // 홈 탭 내용 초기화
  initializeHomeTab();
});

/**
 * 홈 탭 초기화 함수
 */
function initializeHomeTab() {
  // 홈 탭 내용 구성
  const homeTab = document.getElementById('home-tab-content');
  if (!homeTab) return;
  
  // 홈 탭 구조 생성
  homeTab.innerHTML = `
    <div class="home-container">
      <h2 class="home-title">시간 계획 비교</h2>
      
      <div class="home-charts-row">
        <!-- 하루 계획 차트 -->
        <div class="home-chart-container" style="background:transparent; text-align:center;">
          <h3 style="position:relative; left:-20px;">오늘의 계획</h3>
          <div id="home-plan-circle" style="width:340px; height:340px; margin:0 auto; background:transparent; position:relative; left:-200px; top:-100px;"></div>
        </div>
        
        <!-- 하루 기록 차트 -->
        <div class="home-chart-container" style="background:transparent; text-align:center;">
          <h3 style="position:relative; left:25px;">오늘의 기록</h3>
          <div id="home-record-circle" style="width:340px; height:340px; margin:0 auto; background:transparent; position:relative; left:-140px; top:-100px;"></div>
        </div>
      </div>
      
      <!-- 시간표 차트 영역 -->
      <div class="home-timetables-row">
        <!-- 하루 계획 시간표 -->
        <div class="schedule-list full-width">
          <h3>오늘의 시간표</h3>
          <div class="list-controls">
            <div class="search-container">
              <input type="text" id="home-schedule-search-list" placeholder="일정 검색...">
              <button id="home-search-btn-list"><i class="fas fa-search"></i></button>
            </div>
            <div class="filter-container">
              <select id="home-category-filter-list">
                <option value="all">모든 카테고리</option>
              </select>
            </div>
          </div>
          <div id="home-day-timetable" class="day-timetable"></div>
        </div>
        
        <!-- 하루 기록 시간표 -->
        <div class="schedule-list full-width">
          <h3>오늘의 기록 시간표</h3>
          <div class="list-controls">
            <div class="search-container">
              <input type="text" id="home-schedule-search-record" placeholder="기록 검색...">
              <button id="home-search-btn-record"><i class="fas fa-search"></i></button>
            </div>
            <div class="filter-container">
              <select id="home-category-filter-record">
                <option value="all">모든 카테고리</option>
              </select>
            </div>
          </div>
          <div id="home-record-timetable" class="day-timetable"></div>
        </div>
      </div>
    </div>
  `;
  
  // 원 차트 렌더링
  renderHomeCharts();
  
  // 요약 정보 업데이트
  updateSummaryInfo();
  
  // 주간 계획표 관련 코드 삭제됨
}

/**
 * 홈 탭의 원 차트 렌더링 함수
 */
function renderHomeCharts() {
  // 하루 계획 차트 렌더링
  if (document.getElementById('home-plan-circle')) {
    // TimeCircle 라이브러리를 사용하여 계획 차트 렌더링
    TimeCircle.init('home-plan-circle', window.planData);
  }
  
  // 하루 기록 차트 렌더링
  if (document.getElementById('home-record-circle')) {
    // TimeCircle 라이브러리를 사용하여 기록 차트 렌더링
    TimeCircle.init('home-record-circle', window.recordData);
  }
  
  // 홈 탭의 시간표 렌더링
  renderHomeTimetables();
}

/**
 * 홈 탭 새로고침 함수 - 외부에서 호출 가능
 */
function refreshHomeTab() {
  renderHomeCharts();
  updateSummaryInfo();
  renderHomeTimetables();
}

/**
 * 홈 탭의 시간표 렌더링 함수
 */
function renderHomeTimetables() {
  // 홈 탭의 하루 계획 시간표 렌더링
  const homeDayTimetable = document.getElementById('home-day-timetable');
  if (homeDayTimetable) {
    // 현재 날짜 가져오기
    const currentDate = window.TimeCircleApp && window.TimeCircleApp.getCurrentDate ? 
      window.TimeCircleApp.getCurrentDate() : 
      new Date().toISOString().split('T')[0];
    
    // 시간표 렌더링
    renderDayTimetable(homeDayTimetable, currentDate, window.planData);
  }
  
  // 홈 탭의 하루 기록 시간표 렌더링
  const homeRecordTimetable = document.getElementById('home-record-timetable');
  if (homeRecordTimetable) {
    // 현재 날짜 가져오기
    const currentDate = window.TimeCircleApp && window.TimeCircleApp.getCurrentDate ? 
      window.TimeCircleApp.getCurrentDate() : 
      new Date().toISOString().split('T')[0];
    
    // 시간표 렌더링
    renderDayTimetable(homeRecordTimetable, currentDate, window.recordData);
  }
}

/**
 * 시간표 렌더링 함수
 */
function renderDayTimetable(container, date, data) {
  // 시간표 초기화
  container.innerHTML = '';
  
  // 날짜 포맷팅
  const dateObj = new Date(date);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = dayNames[dateObj.getDay()];
  const formattedDate = `${dayOfWeek} (${(dateObj.getMonth() + 1)}/${dateObj.getDate()})`;
  
  // 시간 헤더 추가
  const timeHeader = document.createElement('div');
  timeHeader.className = 'time-header';
  timeHeader.textContent = '시간';
  container.appendChild(timeHeader);
  
  // 날짜 헤더 추가
  const dayHeader = document.createElement('div');
  dayHeader.className = 'day-header';
  dayHeader.textContent = formattedDate;
  container.appendChild(dayHeader);
  
  // 24시간 슬롯 추가
  for (let hour = 0; hour < 24; hour++) {
    // 시간 레이블
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = `${hour}:00`;
    container.appendChild(timeLabel);
    
    // 시간 슬롯
    const timeSlot = document.createElement('div');
    timeSlot.className = 'time-slot';
    timeSlot.setAttribute('data-hour', hour);
    container.appendChild(timeSlot);
  }
  
  // 해당 날짜의 일정 필터링
  const filteredData = data.filter(item => item.date === date);
  
  // 일정 추가
  filteredData.forEach((schedule, index) => {
    const startHour = Math.floor(schedule.startTime / 60);
    const startMinute = schedule.startTime % 60;
    const endHour = Math.floor(schedule.endTime / 60);
    const endMinute = schedule.endTime % 60;
    
    // 각 시간대에 일정 추가
    for (let hour = startHour; hour <= endHour; hour++) {
      if (hour < 0 || hour >= 24) continue; // 24시간 범위 제한
      
      const timeSlot = container.querySelector(`.time-slot[data-hour="${hour}"]`);
      if (!timeSlot) continue;
      
      let topOffset = 0;
      let heightPercentage = 100;
      
      // 첫 시간대인 경우 (시작 분에 따라 위치 조정)
      if (hour === startHour) {
        topOffset = (startMinute / 60) * 100;
        heightPercentage = 100 - topOffset;
      }
      
      // 마지막 시간대인 경우 (종료 분에 따라 높이 조정)
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
      const categoryColor = TimeCircleUtils.getCategoryColor(schedule.category);
      eventDiv.style.backgroundColor = categoryColor;
      eventDiv.style.opacity = '0.9';
      eventDiv.style.borderLeft = `4px solid ${categoryColor}`;
      
      // 일정 내용 추가 (첫 시간대에만 제목 표시)
      if (hour === startHour) {
        // 일정 블록의 높이에 따라 표시할 내용 결정
        let blockContent = '';
        
        // 항상 일정 제목은 표시
        blockContent += `<div class="schedule-title">${schedule.title || ''}</div>`;
        
        // 높이가 충분하면 시간 정보도 표시 (30분 이상)
        if (heightPercentage > 30 || (hour === endHour && hour === startHour && endMinute - startMinute >= 30)) {
          blockContent += `<div class="schedule-time">${TimeCircleUtils.minutesToTimeString(schedule.startTime)} ~ ${TimeCircleUtils.minutesToTimeString(schedule.endTime)}</div>`;
          blockContent += `<div class="schedule-category">${TimeCircleUtils.getCategoryName(schedule.category)}</div>`;
        }
        
        eventDiv.innerHTML = blockContent;
        
        // 일정 블록에 클릭 이벤트 추가
        eventDiv.style.cursor = 'pointer';
        eventDiv.addEventListener('click', () => {
          // 홈 탭에서는 해당 탭으로 이동하도록 처리
          const tabId = data === window.planData ? 'day-plan' : 'day-record';
          const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
          if (tabBtn) {
            tabBtn.click();
            // 일정 모달 열기
            setTimeout(() => {
              if (window.TimeCircleApp && window.TimeCircleApp.initScheduleModal) {
                window.TimeCircleApp.initScheduleModal(true, schedule, index);
              }
            }, 300);
          }
        });
      }
      
      timeSlot.appendChild(eventDiv);
    }
  });
}
