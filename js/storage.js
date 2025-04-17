/**
 * TimeCircle - Storage Module
 * 일정 데이터 저장 및 관리를 위한 모듈
 */

const TimeCircleStorage = (function() {
  // 상수 정의
  const SCHEDULES_KEY = 'timecircle_schedules';
  const CATEGORIES_KEY = 'timecircle_categories';
  const SETTINGS_KEY = 'timecircle_settings';
  
  // 기본 카테고리 정의
  const DEFAULT_CATEGORIES = [
    { id: 'work', name: '숙제', color: '#8e8e8e' },
    { id: 'study', name: '학습', color: '#8e8e8e' },
    { id: 'meal', name: '식사', color: '#faab23' },
    { id: 'exercise', name: '운동', color: '#C8D7C4' },
    { id: 'rest', name: '휴식', color: '#B7B6D6' },
    { id: 'sleep', name: '수면', color: '#7774b6' },
    { id: 'transport', name: '교통', color: '#54a0ff' },
    { id: 'other', name: '기타', color: '#c8d6e5' }
  ];
  
  // 기본 설정 정의
  const DEFAULT_SETTINGS = {
    timeInterval: 15,
    showEmptyTime: true,
    darkMode: false,
    notificationsEnabled: false
  };
  
  /**
   * 로컬 스토리지에서 데이터 가져오기
   * @param {string} key - 스토리지 키
   * @param {*} defaultValue - 데이터가 없을 경우 반환할 기본값
   * @returns {*} - 저장된 데이터 또는 기본값
   */
  function getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error parsing data from storage for key ${key}:`, error);
        return defaultValue;
      }
    }
    return defaultValue;
  }
  
  /**
   * 로컬 스토리지에 데이터 저장
   * @param {string} key - 스토리지 키
   * @param {*} data - 저장할 데이터
   */
  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving data to storage for key ${key}:`, error);
    }
  }
  
  /**
   * IndexedDB 초기화 (대용량 데이터 저장용)
   * @returns {Promise} - 초기화 완료 Promise
   */
  function initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimeCircleDB', 1);
      
      request.onerror = event => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = event => {
        const db = event.target.result;
        resolve(db);
      };
      
      request.onupgradeneeded = event => {
        const db = event.target.result;
        
        // 일정 저장소 생성
        if (!db.objectStoreNames.contains('schedules')) {
          const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
          scheduleStore.createIndex('date', 'date', { unique: false });
        }
        
        // 카테고리 저장소 생성
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
      };
    });
  }
  
  // 공개 API
  return {
    /**
     * 스토리지 초기화
     */
    init: function() {
      // 카테고리가 없으면 기본 카테고리 저장
      const categories = this.getCategories();
      if (categories.length === 0) {
        this.saveCategories(DEFAULT_CATEGORIES);
      }
      
      // 설정이 없으면 기본 설정 저장
      const settings = this.getSettings();
      if (Object.keys(settings).length === 0) {
        this.saveSettings(DEFAULT_SETTINGS);
      }
      
      // IndexedDB 초기화
      initIndexedDB().catch(error => {
        console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
      });
    },
    
    /**
     * 특정 날짜의 모든 일정 가져오기
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     * @returns {Array} - 일정 객체 배열
     */
    getSchedules: function(date) {
      const allSchedules = getFromStorage(SCHEDULES_KEY, {});
      return allSchedules[date] || [];
    },
    
    /**
     * 특정 날짜의 일정 저장
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     * @param {Array} schedules - 일정 객체 배열
     */
    saveSchedules: function(date, schedules) {
      const allSchedules = getFromStorage(SCHEDULES_KEY, {});
      allSchedules[date] = schedules;
      saveToStorage(SCHEDULES_KEY, allSchedules);
      
      // 이벤트 발생 (일정 변경 알림)
      const event = new CustomEvent('schedules-updated', { detail: { date, schedules } });
      document.dispatchEvent(event);
    },
    
    /**
     * 새 일정 추가
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     * @param {Object} schedule - 일정 객체
     * @returns {string} - 생성된 일정의 ID
     */
    addSchedule: function(date, schedule) {
      const schedules = this.getSchedules(date);
      
      // ID가 없으면 생성
      if (!schedule.id) {
        schedule.id = TimeCircleUtils.generateUUID();
      }
      
      schedules.push(schedule);
      this.saveSchedules(date, schedules);
      
      return schedule.id;
    },
    
    /**
     * 일정 업데이트
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     * @param {string} scheduleId - 업데이트할 일정 ID
     * @param {Object} updatedSchedule - 업데이트된 일정 데이터
     * @returns {boolean} - 성공 여부
     */
    updateSchedule: function(date, scheduleId, updatedSchedule) {
      const schedules = this.getSchedules(date);
      const index = schedules.findIndex(s => s.id === scheduleId);
      
      if (index !== -1) {
        schedules[index] = { ...schedules[index], ...updatedSchedule };
        this.saveSchedules(date, schedules);
        return true;
      }
      
      return false;
    },
    
    /**
     * 일정 삭제
     * @param {string} date - YYYY-MM-DD 형식의 날짜
     * @param {string} scheduleId - 삭제할 일정 ID
     * @returns {boolean} - 성공 여부
     */
    deleteSchedule: function(date, scheduleId) {
      const schedules = this.getSchedules(date);
      const filteredSchedules = schedules.filter(s => s.id !== scheduleId);
      
      if (filteredSchedules.length !== schedules.length) {
        this.saveSchedules(date, filteredSchedules);
        return true;
      }
      
      return false;
    },
    
    /**
     * 모든 카테고리 가져오기
     * @returns {Array} - 카테고리 객체 배열
     */
    getCategories: function() {
      return getFromStorage(CATEGORIES_KEY, []);
    },
    
    /**
     * 카테고리 저장
     * @param {Array} categories - 카테고리 객체 배열
     */
    saveCategories: function(categories) {
      saveToStorage(CATEGORIES_KEY, categories);
      
      // 이벤트 발생 (카테고리 변경 알림)
      const event = new CustomEvent('categories-updated', { detail: { categories } });
      document.dispatchEvent(event);
    },
    
    /**
     * 새 카테고리 추가
     * @param {Object} category - 카테고리 객체
     * @returns {string} - 생성된 카테고리의 ID
     */
    addCategory: function(category) {
      const categories = this.getCategories();
      
      // ID가 없으면 생성
      if (!category.id) {
        category.id = category.name.toLowerCase().replace(/\s+/g, '_');
      }
      
      categories.push(category);
      this.saveCategories(categories);
      
      return category.id;
    },
    
    /**
     * 카테고리 업데이트
     * @param {string} categoryId - 업데이트할 카테고리 ID
     * @param {Object} updatedCategory - 업데이트된 카테고리 데이터
     * @returns {boolean} - 성공 여부
     */
    updateCategory: function(categoryId, updatedCategory) {
      const categories = this.getCategories();
      const index = categories.findIndex(c => c.id === categoryId);
      
      if (index !== -1) {
        categories[index] = { ...categories[index], ...updatedCategory };
        this.saveCategories(categories);
        return true;
      }
      
      return false;
    },
    
    /**
     * 카테고리 삭제
     * @param {string} categoryId - 삭제할 카테고리 ID
     * @returns {boolean} - 성공 여부
     */
    deleteCategory: function(categoryId) {
      const categories = this.getCategories();
      const filteredCategories = categories.filter(c => c.id !== categoryId);
      
      if (filteredCategories.length !== categories.length) {
        this.saveCategories(filteredCategories);
        return true;
      }
      
      return false;
    },
    
    /**
     * 앱 설정 가져오기
     * @returns {Object} - 설정 객체
     */
    getSettings: function() {
      return getFromStorage(SETTINGS_KEY, {});
    },
    
    /**
     * 앱 설정 저장
     * @param {Object} settings - 설정 객체
     */
    saveSettings: function(settings) {
      saveToStorage(SETTINGS_KEY, settings);
      
      // 이벤트 발생 (설정 변경 알림)
      const event = new CustomEvent('settings-updated', { detail: { settings } });
      document.dispatchEvent(event);
    },
    
    /**
     * 특정 설정 업데이트
     * @param {string} key - 설정 키
     * @param {*} value - 설정 값
     */
    updateSetting: function(key, value) {
      const settings = this.getSettings();
      settings[key] = value;
      this.saveSettings(settings);
    },
    
    /**
     * 모든 데이터 내보내기
     * @returns {Object} - 모든 앱 데이터
     */
    exportData: function() {
      return {
        schedules: getFromStorage(SCHEDULES_KEY, {}),
        categories: this.getCategories(),
        settings: this.getSettings(),
        version: '1.0'
      };
    },
    
    /**
     * 데이터 가져오기
     * @param {Object} data - 가져올 데이터
     * @returns {boolean} - 성공 여부
     */
    importData: function(data) {
      try {
        if (data.version && data.schedules && data.categories && data.settings) {
          saveToStorage(SCHEDULES_KEY, data.schedules);
          this.saveCategories(data.categories);
          this.saveSettings(data.settings);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error importing data:', error);
        return false;
      }
    },
    
    /**
     * 모든 데이터 초기화
     */
    resetAllData: function() {
      localStorage.removeItem(SCHEDULES_KEY);
      this.saveCategories(DEFAULT_CATEGORIES);
      this.saveSettings(DEFAULT_SETTINGS);
      
      // 이벤트 발생 (데이터 초기화 알림)
      const event = new CustomEvent('data-reset');
      document.dispatchEvent(event);
    }
  };
})();

// 페이지 로드 시 스토리지 초기화
document.addEventListener('DOMContentLoaded', function() {
  TimeCircleStorage.init();
});
