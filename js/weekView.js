/**
 * TimeCircle - Week View
 * 주간 일정 보기 구현
 */

document.addEventListener('DOMContentLoaded', function() {
  const weekView = document.getElementById('week-view-content');
  if (!weekView) return;

  // 초기 렌더링
  renderWeekCalendar();
});

/**
 * 주간 캘린더 렌더링 함수
 */
function renderWeekCalendar() {
  const weekCalendar = document.getElementById('week-calendar');
  if (!weekCalendar) return;
  
  // 기존 내용 삭제
  weekCalendar.innerHTML = '';
  
  // 주간 계획표 제목 추가 (기존 제목이 있으면 제거)
  const existingTitles = weekCalendar.parentNode.querySelectorAll('.week-title');
  existingTitles.forEach(title => title.remove());
  
  const weekTitle = document.createElement('h2');
  weekTitle.className = 'week-title';
  weekTitle.textContent = '이번 주 일정';
  weekCalendar.parentNode.insertBefore(weekTitle, weekCalendar);
  
  // 현재 날짜 가져오기
  const today = new Date();
  const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
  
  // 현재 주의 날짜 가져오기
  const currentWeekDates = getWeekDates(currentDate);
  
  // 헤더 추가 (시간 레이블 + 요일)
  const timeHeader = document.createElement('div');
  timeHeader.className = 'week-header';
  timeHeader.textContent = '시간';
  weekCalendar.appendChild(timeHeader);
  
  // 요일 헤더 추가
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  currentWeekDates.forEach((date, index) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'week-header';
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    dayHeader.textContent = `${days[index]} (${formattedDate})`;
    weekCalendar.appendChild(dayHeader);
  });
  
  // 시간대 추가
  for (let hour = 0; hour < 24; hour++) {
    // 시간 레이블
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = `${hour}:00`;
    weekCalendar.appendChild(timeLabel);
    
    // 각 요일별 셀 추가
    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('div');
      cell.className = 'time-slot';
      cell.dataset.hour = hour;
      cell.dataset.day = day;
      weekCalendar.appendChild(cell);
    }
  }
  
  // planData를 이용하여 주간 캘린더에 일정 표시
  if (window.planData && window.planData.length > 0) {
    // 각 날짜를 YYYY-MM-DD 형식으로 변환
    const weekDateStrings = currentWeekDates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    
    // planData에서 이번 주 데이터만 필터링
    const weekPlans = window.planData.filter(plan => {
      return weekDateStrings.includes(plan.date);
    });
    
    // 필터링된 데이터를 주간 캘린더에 표시
    weekPlans.forEach(plan => {
      // 해당 날짜가 주간 캘린더의 몇 번째 날인지 확인
      const dayIndex = weekDateStrings.indexOf(plan.date);
      if (dayIndex === -1) return; // 해당 주에 없는 날짜면 무시
      
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
        const cell = weekCalendar.querySelector(`.time-slot[data-hour="${hour}"][data-day="${dayIndex}"]`);
        if (cell) {
          // 분 단위를 고려한 셀 스타일 적용
          const cellHeight = cell.offsetHeight;
          const cellWidth = cell.offsetWidth;
          
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
          eventDiv.className = 'week-event';
          eventDiv.style.position = 'absolute';
          eventDiv.style.top = `${topOffset}%`;
          eventDiv.style.height = `${heightPercentage}%`;
          eventDiv.style.left = '0';
          eventDiv.style.right = '0';
          eventDiv.style.backgroundColor = plan.color || TimeCircleUtils.getCategoryColor(plan.category);
          eventDiv.style.opacity = '0.8';
          eventDiv.style.cursor = 'pointer';
          eventDiv.title = `${plan.title} (${TimeCircleUtils.minutesToTimeString(plan.startTime)}-${TimeCircleUtils.minutesToTimeString(plan.endTime)})`;
          
          // 셀의 position을 relative로 설정하여 내부 요소를 절대 위치로 배치할 수 있게 함
          cell.style.position = 'relative';
          cell.style.overflow = 'hidden';
          
          // 일정 제목 표시 (첫 시간대에만)
          if (hour === startHour) {
            const titleSpan = document.createElement('span');
            titleSpan.className = 'week-event-title';
            titleSpan.textContent = plan.title;
            titleSpan.style.position = 'absolute';
            titleSpan.style.padding = '2px';
            titleSpan.style.overflow = 'hidden';
            titleSpan.style.textOverflow = 'ellipsis';
            titleSpan.style.whiteSpace = 'nowrap';
            titleSpan.style.width = '100%';
            titleSpan.style.textAlign = 'center';
            titleSpan.style.left = '0';
            titleSpan.style.right = '0';
            eventDiv.appendChild(titleSpan);
          }
          
          // 클릭 이벤트 추가
          eventDiv.addEventListener('click', () => {
            alert(`${plan.title}\n시간: ${TimeCircleUtils.minutesToTimeString(plan.startTime)}-${TimeCircleUtils.minutesToTimeString(plan.endTime)}\n카테고리: ${plan.category || '미분류'}\n${plan.memo ? `메모: ${plan.memo}` : ''}`);
          });
          
          cell.appendChild(eventDiv);
        }
      }
    });
  }
}

/**
 * 특정 날짜의 한 주간 날짜 배열 가져오기
 * @param {string} dateString - YYYY-MM-DD 형식의 날짜
 * @returns {Date[]} 한 주간의 날짜 배열
 */
function getWeekDates(dateString) {
  const date = new Date(dateString);
  const day = date.getDay(); // 0(일요일) ~ 6(토요일)
  const diff = date.getDate() - day;
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(date);
    newDate.setDate(diff + i);
    weekDates.push(newDate);
  }
  
  return weekDates;
}

// 주간 뷰에 필요한 CSS 스타일 추가
function addWeekViewStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .week-event-title {
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: white;
      text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.7);
      pointer-events: none;
    }
  `;
  document.head.appendChild(styleElement);
}

// 스타일 추가
addWeekViewStyles();
