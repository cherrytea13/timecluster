/**
 * TimeCircle - Circular Chart Visualization
 * D3.js 기반 원형 차트 시각화 컴포넌트
 */

const TimeCircle = (function() {
  // 비공개 변수
  let svg, chartContainer, timeArcs, timeLabels, currentTimeIndicator;
  let width, height, radius, innerRadius;
  let currentDate, schedules, settings;
  let dragStartAngle, dragEndAngle, dragOverlay, dragTimeTooltip;
  let isMouseDown = false;
  
  // 비공개 메서드
  
  /**
   * SVG 요소 초기화
   */
  function initSVG(containerId = 'time-circle') {
    // 컨테이너 크기 가져오기
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    
    // 레이블을 위한 여백 추가 (각 방향으로 40px)
    const padding = 40;
    
    // 실제 차트 크기 계산 (여백 고려)
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // 반지름 계산 (여백을 고려한 크기의 절반)
    radius = Math.min(chartWidth, chartHeight) / 2;
    innerRadius = radius * 0.3;
    
    // 기존 SVG 제거
    d3.select(`#${containerId} svg`).remove();
    
    // 새 SVG 생성 - 레이블이 잘리지 않도록 크기 확대
    const svgWidth = width + 250; // 양쪽에 125px 여백 추가
    const svgHeight = height + 250; // 양쪽에 125px 여백 추가
    
    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .style('display', 'block') // 블록 레벨 요소로 설정
      .style('margin', 'auto') // 자동 마진으로 중앙 정렬
      .append('g')
      .attr('transform', `translate(${svgWidth / 2}, ${svgHeight / 2})`);
    
    // 차트 컨테이너 그룹
    chartContainer = svg.append('g')
      .attr('class', 'chart-container');
      
    // 주간/야간 배경 추가
    // 야간 배경 (18시-6시, 상단 반원)
    chartContainer.append('path')
      .attr('class', 'night-background')
      .attr('d', d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .startAngle(-Math.PI / 2)  // -90도 (12시 방향)
        .endAngle(Math.PI / 2)    // 90도 (6시 방향)
      )
      .style('fill', 'var(--night-background-color)');
      
    // 주간 배경 (6시-18시, 하단 반원)
    chartContainer.append('path')
      .attr('class', 'day-background')
      .attr('d', d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .startAngle(Math.PI / 2)   // 90도 (6시 방향)
        .endAngle(Math.PI * 3/2)  // 270도 (18시 방향)
      )
      .style('fill', 'var(--day-background-color)');
    

    
    // 시간 눈금 그룹
    const timeTicksGroup = svg.append('g')
      .attr('class', 'time-ticks');
    
    // 시간 눈금 그리기 (1시간 간격)
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour / 24) * 360;
      const radians = angle * (Math.PI / 180);
      
      // 시간 눈금선 길이 조정 - 더 짧게 수정
      // 주요 시간(0, 6, 12, 18)은 조금 더 긴 눈금으로 표시
      const isMainHour = hour % 6 === 0;
      const tickLengthRatio = isMainHour ? 0.15 : 0.08; // 주요 시간은 15%, 일반 시간은 8%만 표시
      
      // 바깥쪽에서 안쪽으로 짧게 표시
      const x1 = Math.sin(radians) * (radius - (radius - innerRadius) * tickLengthRatio);
      const y1 = -Math.cos(radians) * (radius - (radius - innerRadius) * tickLengthRatio);
      const x2 = Math.sin(radians) * radius;
      const y2 = -Math.cos(radians) * radius;
      
      // 시간 눈금선 (주요 시간은 더 굵게)
      const hourTick = timeTicksGroup.append('line')
        .attr('class', isMainHour ? 'main-hour-tick' : 'hour-tick')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2);
        
      // 주요 시간 눈금선 색상 설정
      if (isMainHour) {
        let tickColor;
        if (hour === 0 || hour === 12) tickColor = '#333333';
        else if (hour === 6) tickColor = '#fc8916';
        else if (hour === 18) tickColor = '#001989';
        else tickColor = 'var(--primary-color)';
        
        hourTick.style('stroke', tickColor);
      }
      
      // 시간 레이블 - 기본 숫자만 표시
      // 원과 가까우면서 겹치지 않는 거리로 조정
      const labelRadius = radius * 1.08;
      const labelX = Math.sin(radians) * labelRadius;
      const labelY = -Math.cos(radians) * labelRadius;
      
      // 시간 텍스트 추가
      const hourLabel = timeTicksGroup.append('text')
        .attr('class', isMainHour ? 'main-hour-label' : 'hour-label')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text(hour);
      
      // 주요 시간 스타일 추가
      if (isMainHour) {
        let hourColor;
        if (hour === 0 || hour === 12) hourColor = '#333333';
        else if (hour === 6) hourColor = '#fc8916';
        else if (hour === 18) hourColor = '#001989';
        else hourColor = 'var(--primary-color)';
        
        hourLabel
          .style('font-weight', 'bold')
          .style('fill', hourColor);
      }
    }
    
    // 30분 간격 눈금 그리기 (더 간결하게)
    for (let hour = 0; hour < 24; hour++) {
      const minute = 30;
      const totalMinutes = hour * 60 + minute;
      const angle = (totalMinutes / (24 * 60)) * 360;
      const radians = angle * (Math.PI / 180);
      
      // 30분 눈금선도 짧게 수정
      const tickLengthRatio = 0.05; // 30분 눈금은 더 짧게 (5%)
      const x1 = Math.sin(radians) * (radius - (radius - innerRadius) * tickLengthRatio);
      const y1 = -Math.cos(radians) * (radius - (radius - innerRadius) * tickLengthRatio);
      const x2 = Math.sin(radians) * radius;
      const y2 = -Math.cos(radians) * radius;
      
      timeTicksGroup.append('line')
        .attr('class', 'half-hour-tick')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2);
    }
    
    // 현재 시간 표시기
    currentTimeIndicator = svg.append('line')
      .attr('class', 'current-time-indicator')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -radius)
      .style('stroke', 'var(--accent-color)')
      .style('stroke-width', '2px');
    
    // 드래그 오버레이 및 툴팁 초기화
    dragOverlay = d3.select('body').append('div')
      .attr('class', 'drag-overlay')
      .style('display', 'none');
    
    dragTimeTooltip = d3.select('body').append('div')
      .attr('class', 'drag-time-tooltip')
      .style('display', 'none');
  }
  
  /**
   * 일정 데이터로 원형 차트 업데이트
   */
  function updateChart(containerId = 'time-circle') {
    if (!svg || !schedules) return;
    
    // 기존 일정 및 빈 시간대 아크만 제거 (주야간 배경은 유지)
    chartContainer.selectAll('.time-arc').remove();
    chartContainer.selectAll('.empty-time').remove();
    chartContainer.selectAll('.time-label').remove();
    
    // 빈 시간대 표시 여부
    const showEmptyTime = settings?.showEmptyTime ?? true;
    
    // 시간 간격 (분)
    const timeInterval = settings?.timeInterval ?? 15;
    
    // 일정이 있는 시간대 추적
    const occupiedTimes = new Set();
    
    // 일정 아크 생성
    timeArcs = chartContainer.selectAll('.time-arc')
      .data(schedules)
      .enter()
      .append('path')
      .attr('class', 'time-arc')
      .attr('d', d => {
        const startAngle = TimeCircleUtils.dayMinutesToAngle(d.startTime) * (Math.PI / 180);
        const endAngle = TimeCircleUtils.dayMinutesToAngle(d.endTime) * (Math.PI / 180);
        
        // 시작 시간부터 종료 시간까지의 모든 간격을 점유 표시
        for (let time = d.startTime; time < d.endTime; time += timeInterval) {
          occupiedTimes.add(time);
        }
        
        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(radius)
          .startAngle(startAngle)
          .endAngle(endAngle);
        
        return arc();
      })
      .style('fill', d => TimeCircleUtils.getCategoryColor(d.category))
      .on('mouseover', showTooltip)
      .on('mousemove', moveTooltip)
      .on('mouseout', hideTooltip)
      .on('click', editSchedule);
    
    // 빈 시간대 표시 (설정에 따라)
    if (showEmptyTime) {
      const emptyTimeSlots = [];
      
      // 하루의 모든 시간대 순회 (timeInterval 간격으로)
      for (let time = 0; time < 24 * 60; time += timeInterval) {
        if (!occupiedTimes.has(time)) {
          // 연속된 빈 시간대 찾기
          let endTime = time + timeInterval;
          while (endTime < 24 * 60 && !occupiedTimes.has(endTime)) {
            endTime += timeInterval;
          }
          
          emptyTimeSlots.push({
            startTime: time,
            endTime: endTime
          });
          
          // 다음 검사 시간대로 이동
          time = endTime - timeInterval;
        }
      }
      
      // 빈 시간대 아크 생성
      chartContainer.selectAll('.empty-time')
        .data(emptyTimeSlots)
        .enter()
        .append('path')
        .attr('class', 'empty-time')
        .attr('d', d => {
          const startAngle = TimeCircleUtils.dayMinutesToAngle(d.startTime) * (Math.PI / 180);
          const endAngle = TimeCircleUtils.dayMinutesToAngle(d.endTime) * (Math.PI / 180);
          
          const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius)
            .startAngle(startAngle)
            .endAngle(endAngle);
          
          return arc();
        })
        .style('fill', 'transparent') // 빈 시간대는 투명하게 처리
        .style('stroke', 'var(--border-color)')
        .style('stroke-width', '0.5px')
        .on('click', createScheduleFromEmptySlot);
    }
    
    // 현재 시간 표시기 업데이트
    updateCurrentTimeIndicator();
  }
  
  /**
   * 현재 시간 표시기 업데이트
   */
  function updateCurrentTimeIndicator(containerId = 'time-circle') {
    const currentMinutes = TimeCircleUtils.getCurrentTimeInMinutes();
    const angle = TimeCircleUtils.dayMinutesToAngle(currentMinutes);
    // 각도를 라디안으로 변환 (0도는 상단에서 시작)
    const radians = angle * (Math.PI / 180);
    
    // 원의 중심에서 해당 각도의 점까지 좌표 계산
    const x = Math.sin(radians) * radius;
    const y = -Math.cos(radians) * radius;
    
    // 현재 시간 표시기 업데이트
    if (currentTimeIndicator) {
      currentTimeIndicator
        .attr('x2', x)
        .attr('y2', y);
    }
  }
  
  /**
   * 일정 툴팁 표시
   * @param {Event} event - 마우스 이벤트
   * @param {Object} d - 일정 데이터
   */
  function showTooltip(event, d) {
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY + 10}px`);
    
    tooltip.append('div')
      .attr('class', 'tooltip-title')
      .text(d.title);
    
    tooltip.append('div')
      .attr('class', 'tooltip-time')
      .text(TimeCircleUtils.formatTimeRange(d.startTime, d.endTime));
    
    const categoryDiv = tooltip.append('div')
      .attr('class', 'tooltip-category');
    
    categoryDiv.append('span')
      .attr('class', 'category-indicator')
      .style('background-color', d.color || TimeCircleUtils.getCategoryColor(d.category));
    
    categoryDiv.append('span')
      .text(TimeCircleUtils.getCategoryName(d.category));
  }
  
  /**
   * 툴팁 이동
   * @param {Event} event - 마우스 이벤트
   */
  function moveTooltip(event) {
    d3.select('.tooltip')
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY + 10}px`);
  }
  
  /**
   * 툴팁 숨기기
   */
  function hideTooltip() {
    d3.select('.tooltip').remove();
  }
  
  /**
   * 일정 편집 모달 열기
   * @param {Event} event - 클릭 이벤트
   * @param {Object} d - 일정 데이터
   */
  function editSchedule(event, d) {
    // 이벤트 발생 (일정 편집 요청)
    const editEvent = new CustomEvent('edit-schedule', { detail: { schedule: d, date: currentDate } });
    document.dispatchEvent(editEvent);
  }
  
  /**
   * 빈 시간대에서 새 일정 생성
   * @param {Event} event - 클릭 이벤트
   * @param {Object} d - 빈 시간대 데이터
   */
  function createScheduleFromEmptySlot(event, d) {
    // 이벤트 발생 (새 일정 생성 요청)
    const createEvent = new CustomEvent('create-schedule', { 
      detail: { 
        startTime: d.startTime, 
        endTime: d.endTime,
        date: currentDate 
      } 
    });
    document.dispatchEvent(createEvent);
  }
  
  /**
   * 드래그 시작 처리
   * @param {Event} event - 마우스/터치 이벤트
   */
  function handleDragStart(event) {
    if (isMouseDown) return;
    
    isMouseDown = true;
    
    const chartElement = document.getElementById(containerId);
    dragStartAngle = TimeCircleUtils.getAngleFromEvent(event, chartElement);
    dragEndAngle = dragStartAngle;
    
    // 드래그 오버레이 표시
    updateDragOverlay();
    
    // 드래그 시간 툴팁 표시
    updateDragTimeTooltip(event);
    
    dragOverlay.style('display', 'block');
    dragTimeTooltip.style('display', 'block');
  }
  
  /**
   * 드래그 중 처리
   * @param {Event} event - 마우스/터치 이벤트
   */
  function handleDragMove(event) {
    if (!isMouseDown) return;
    
    const chartElement = document.getElementById(containerId);
    dragEndAngle = TimeCircleUtils.getAngleFromEvent(event, chartElement);
    
    // 드래그 오버레이 업데이트
    updateDragOverlay();
    
    // 드래그 시간 툴팁 업데이트
    updateDragTimeTooltip(event);
  }
  
  /**
   * 드래그 종료 처리
   * @param {Event} event - 마우스/터치 이벤트
   */
  function handleDragEnd(event) {
    if (!isMouseDown) return;
    
    isMouseDown = false;
    
    // 드래그 오버레이 및 툴팁 숨기기
    dragOverlay.style('display', 'none');
    dragTimeTooltip.style('display', 'none');
    
    // 시간 간격 (분)
    const timeInterval = settings?.timeInterval ?? 15;
    
    // 시작 및 종료 시간 계산
    let startMinutes = TimeCircleUtils.angleToDayMinutes(dragStartAngle);
    let endMinutes = TimeCircleUtils.angleToDayMinutes(dragEndAngle);
    
    // 시간 간격에 맞게 반올림
    startMinutes = TimeCircleUtils.roundToNearestInterval(startMinutes, timeInterval);
    endMinutes = TimeCircleUtils.roundToNearestInterval(endMinutes, timeInterval);
    
    // 최소 시간 간격 보장
    if (endMinutes === startMinutes) {
      endMinutes = (startMinutes + timeInterval) % (24 * 60);
    }
    
    // 이벤트 발생 (새 일정 생성 요청)
    const createEvent = new CustomEvent('create-schedule', { 
      detail: { 
        startTime: startMinutes, 
        endTime: endMinutes,
        date: currentDate 
      } 
    });
    document.dispatchEvent(createEvent);
  }
  
  /**
   * 드래그 오버레이 업데이트
   */
  function updateDragOverlay() {
    const chartElement = document.getElementById(containerId);
    const rect = chartElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 시작 및 종료 각도 계산
    const startRadians = (dragStartAngle - 90) * (Math.PI / 180);
    const endRadians = (dragEndAngle - 90) * (Math.PI / 180);
    
    // 원형 섹터 SVG 경로 계산
    const r = Math.min(rect.width, rect.height) / 2;
    const innerR = r * 0.3;
    
    const x1 = centerX + Math.cos(startRadians) * innerR;
    const y1 = centerY + Math.sin(startRadians) * innerR;
    const x2 = centerX + Math.cos(startRadians) * r;
    const y2 = centerY + Math.sin(startRadians) * r;
    const x3 = centerX + Math.cos(endRadians) * r;
    const y3 = centerY + Math.sin(endRadians) * r;
    const x4 = centerX + Math.cos(endRadians) * innerR;
    const y4 = centerY + Math.sin(endRadians) * innerR;
    
    // 원형 섹터 위치 및 크기 설정
    dragOverlay
      .style('left', `${rect.left}px`)
      .style('top', `${rect.top}px`)
      .style('width', `${rect.width}px`)
      .style('height', `${rect.height}px`);
  }
  
  /**
   * 드래그 시간 툴팁 업데이트
   * @param {Event} event - 마우스/터치 이벤트
   */
  function updateDragTimeTooltip(event) {
    // 시간 간격 (분)
    const timeInterval = settings?.timeInterval ?? 15;
    
    // 시작 및 종료 시간 계산
    let startMinutes = TimeCircleUtils.angleToDayMinutes(dragStartAngle);
    let endMinutes = TimeCircleUtils.angleToDayMinutes(dragEndAngle);
    
    // 시간 간격에 맞게 반올림
    startMinutes = TimeCircleUtils.roundToNearestInterval(startMinutes, timeInterval);
    endMinutes = TimeCircleUtils.roundToNearestInterval(endMinutes, timeInterval);
    
    // 최소 시간 간격 보장
    if (endMinutes === startMinutes) {
      endMinutes = (startMinutes + timeInterval) % (24 * 60);
    }
    
    // 시간 범위 텍스트 생성
    const timeRangeText = TimeCircleUtils.formatTimeRange(startMinutes, endMinutes);
    
    // 툴팁 위치 및 내용 설정
    let clientX, clientY;
    if (event.type.startsWith('touch')) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    dragTimeTooltip
      .style('left', `${clientX + 15}px`)
      .style('top', `${clientY + 15}px`)
      .text(timeRangeText);
  }
  
  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners(containerId = 'time-circle') {
    const chartElement = document.getElementById(containerId);
    if (!chartElement) return;
    
    // 마우스 이벤트
    chartElement.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    // 터치 이벤트
    chartElement.addEventListener('touchstart', handleDragStart);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
    
    // 창 크기 변경 시 차트 재조정
    window.addEventListener('resize', debounce(function() {
      initSVG();
      updateChart();
    }, 250));
    
    // 일정 데이터 변경 이벤트
    document.addEventListener('schedules-updated', function(event) {
      if (event.detail.date === currentDate) {
        schedules = event.detail.schedules;
        updateChart();
      }
    });
    
    // 설정 변경 이벤트
    document.addEventListener('settings-updated', function(event) {
      settings = event.detail.settings;
      updateChart();
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
     * 차트 초기화
     * @param {string|HTMLElement} containerOrDate - 컨테이너 id 또는 날짜(기존 호환)
     * @param {Array} customSchedules - (선택) 직접 전달할 일정 데이터
     */
    init: function(containerOrDate, customSchedules) {
      let containerId = 'time-circle';
      let date = null;
      if (typeof containerOrDate === 'string' && document.getElementById(containerOrDate)) {
        containerId = containerOrDate;
      } else if (typeof containerOrDate === 'string') {
        date = containerOrDate;
      } else if (containerOrDate instanceof Date) {
        date = containerOrDate.toISOString().split('T')[0];
      }
      currentDate = date || TimeCircleUtils.getCurrentDateString();
      schedules = customSchedules || TimeCircleStorage.getSchedules(currentDate);
      settings = TimeCircleStorage.getSettings();
      
      initSVG(containerId);
      updateChart(containerId);
      setupEventListeners(containerId);
      
      // 현재 시간 표시기 1분마다 업데이트
      setInterval(function() { updateCurrentTimeIndicator(containerId); }, 60000);
    },
    
    /**
     * 날짜 변경
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     */
    changeDate: function(date, customSchedules, containerId = 'time-circle') {
      currentDate = date;
      schedules = customSchedules || TimeCircleStorage.getSchedules(currentDate);
      updateChart(containerId);
    },
    
    /**
     * 차트 새로고침
     */
    refresh: function(customSchedules) {
      schedules = customSchedules || TimeCircleStorage.getSchedules(currentDate);
      updateChart();
    }
  };
})();

// 페이지 로드 시 차트 초기화
document.addEventListener('DOMContentLoaded', function() {
  TimeCircle.init();
});
