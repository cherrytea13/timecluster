/**
 * TimeCircle - Utility Functions
 * 일정 관리 앱을 위한 유틸리티 함수들
 */

const TimeCircleUtils = {
  /**
   * 시간 문자열을 분 단위로 변환 (예: "13:45" -> 825)
   * @param {string} timeString - HH:MM 형식의 시간 문자열
   * @returns {number} - 분 단위의 시간 값
   */
  timeStringToMinutes: function(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * 분 단위 시간을 HH:MM 형식의 문자열로 변환
   * @param {number} minutes - 분 단위의 시간 값
   * @returns {string} - HH:MM 형식의 시간 문자열
   */
  minutesToTimeString: function(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * 분 단위 시간을 사람이 읽기 쉬운 형식으로 변환
   * @param {number} minutes - 분 단위의 시간 값
   * @returns {string} - "오전/오후 H시 M분" 형식의 문자열
   */
  minutesToReadableTime: function(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;
    
    return `${period} ${displayHours}시 ${mins > 0 ? `${mins}분` : ''}`;
  },

  /**
   * 시간 간격을 사람이 읽기 쉬운 형식으로 변환
   * @param {number} startMinutes - 시작 시간 (분 단위)
   * @param {number} endMinutes - 종료 시간 (분 단위)
   * @returns {string} - "HH:MM - HH:MM (X시간 Y분)" 형식의 문자열
   */
  formatTimeRange: function(startMinutes, endMinutes) {
    const startTime = this.minutesToTimeString(startMinutes);
    const endTime = this.minutesToTimeString(endMinutes);
    
    let duration = endMinutes - startMinutes;
    if (duration < 0) duration += 24 * 60; // 자정을 넘어가는 경우
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    let durationText = '';
    if (hours > 0) durationText += `${hours}시간 `;
    if (minutes > 0) durationText += `${minutes}분`;
    
    return `${startTime} - ${endTime} (${durationText.trim()})`;
  },

  /**
   * 각도를 분 단위 시간으로 변환 (원형 차트용)
   * @param {number} angle - 각도 (0-360)
   * @returns {number} - 분 단위 시간 (0-1439)
   */
  angleToDayMinutes: function(angle) {
    // 0도는 12시 위치, 시계 방향으로 증가
    const normalizedAngle = (angle + 270) % 360;
    return Math.floor(normalizedAngle / 360 * 24 * 60);
  },

  /**
   * 분 단위 시간을 각도로 변환 (원형 차트용)
   * @param {number} minutes - 분 단위 시간 (0-1439)
   * @returns {number} - 각도 (0-360)
   */
  dayMinutesToAngle: function(minutes) {
    // 0시는 12시 위치(상단, 0도), 시계 방향으로 증가
    // 6시는 90도, 12시는 180도, 18시는 270도
    // 24시간(1440분)을 360도로 변환
    // 0시가 상단(0도)에 오도록 조정
    return (minutes / (24 * 60)) * 360;
  },

  /**
   * 카테고리 ID를 한글 이름으로 변환
   * @param {string} categoryId - 카테고리 ID
   * @returns {string} - 한글 카테고리 이름
   */
  getCategoryName: function(categoryId) {
    if (!categoryId) return '기타';
    
    // 기본 카테고리 매핑
    const categoryMap = {
      'work': '숙제',
      'study': '학습',
      'meal': '식사',
      'exercise': '운동',
      'rest': '휴식',
      'sleep': '수면',
      'transport': '교통',
      'other': '기타'
    };
    
    // 저장된 카테고리 정보 가져오기
    let categories = [];
    try {
      const storedCategories = localStorage.getItem('timecircle_categories');
      if (storedCategories) {
        categories = JSON.parse(storedCategories);
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    }
    
    // 저장된 카테고리에서 일치하는 ID 찾기
    const foundCategory = categories.find(cat => cat.id === categoryId);
    if (foundCategory) {
      return foundCategory.name;
    }
    
    // 기본 매핑에서 찾기
    return categoryMap[categoryId] || categoryId;
  },
  
  /**
   * 마우스/터치 이벤트에서 원형 차트 내의 각도 계산
   * @param {Event} event - 마우스/터치 이벤트
   * @param {HTMLElement} chartElement - 차트 요소
   * @returns {number} - 각도 (0-360)
   */
  getAngleFromEvent: function(event, chartElement) {
    const rect = chartElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if (event.type.startsWith('touch')) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    // 아크탄젠트를 사용하여 각도 계산 (라디안)
    let angle = Math.atan2(deltaY, deltaX);
    
    // 라디안을 도(degree)로 변환하고 0-360 범위로 정규화
    angle = (angle * 180 / Math.PI + 360) % 360;
    
    return angle;
  },

  /**
   * 현재 시간을 분 단위로 반환
   * @returns {number} - 현재 시간 (분 단위)
   */
  getCurrentTimeInMinutes: function() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  },

  /**
   * 현재 날짜를 YYYY-MM-DD 형식으로 반환
   * @returns {string} - YYYY-MM-DD 형식의 날짜 문자열
   */
  getCurrentDateString: function() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  },

  /**
   * 날짜를 한국어 형식으로 포맷팅
   * @param {Date} date - 날짜 객체
   * @returns {string} - "YYYY년 M월 D일 (요일)" 형식의 문자열
   */
  formatDateKorean: function(date) {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  },

  /**
   * 카테고리에 해당하는 색상 코드 반환
   * @param {string} category - 카테고리 이름
   * @returns {string} - 색상 코드 (CSS 변수 또는 기본값)
   */
  getCategoryColor: function(category) {
    const categoryColors = {
      'work': 'var(--work-color)',
      'study': 'var(--study-color)',
      'meal': 'var(--meal-color)',
      'exercise': 'var(--exercise-color)',
      'rest': 'var(--rest-color)',
      'sleep': 'var(--sleep-color)',
      'transport': 'var(--transport-color)',
      'other': 'var(--other-color)'
    };
    
    return categoryColors[category] || 'var(--other-color)';
  },

  /**
   * 두 시간 간격이 겹치는지 확인
   * @param {number} start1 - 첫 번째 간격의 시작 시간 (분 단위)
   * @param {number} end1 - 첫 번째 간격의 종료 시간 (분 단위)
   * @param {number} start2 - 두 번째 간격의 시작 시간 (분 단위)
   * @param {number} end2 - 두 번째 간격의 종료 시간 (분 단위)
   * @returns {boolean} - 겹치면 true, 아니면 false
   */
  isTimeOverlap: function(start1, end1, start2, end2) {
    // 자정을 넘어가는 경우 처리
    if (end1 < start1) end1 += 24 * 60;
    if (end2 < start2) end2 += 24 * 60;
    
    return (start1 < end2 && start2 < end1);
  },

  /**
   * UUID 생성 (일정 ID용)
   * @returns {string} - 고유 식별자
   */
  generateUUID: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * 시간을 가장 가까운 간격으로 반올림
   * @param {number} minutes - 분 단위 시간
   * @param {number} interval - 반올림할 간격 (분 단위)
   * @returns {number} - 반올림된 시간 (분 단위)
   */
  roundToNearestInterval: function(minutes, interval) {
    return Math.round(minutes / interval) * interval;
  }
};

// 전역 스코프에 노출
window.TimeCircleUtils = TimeCircleUtils;
