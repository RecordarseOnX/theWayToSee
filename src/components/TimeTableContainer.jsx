import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimeTableContainer.css';
import { supabase } from '../supabaseClient';

// --- 常量 ---
const MINT_BASE = '#f0fff4'; 
const PRESET_GRADIENTS = [
  `linear-gradient(135deg, ${MINT_BASE} 0%, #a7f3d0 50%, ${MINT_BASE} 100%)`,
  `linear-gradient(135deg, ${MINT_BASE} 0%, #bae6fd 50%, ${MINT_BASE} 100%)`,
  `linear-gradient(135deg, ${MINT_BASE} 0%, #ddd6fe 50%, ${MINT_BASE} 100%)`,
  `linear-gradient(135deg, ${MINT_BASE} 0%, #fbcfe8 50%, ${MINT_BASE} 100%)`,
  `linear-gradient(135deg, ${MINT_BASE} 0%, #fde68a 50%, ${MINT_BASE} 100%)`,
  `linear-gradient(135deg, ${MINT_BASE} 0%, #e2e8f0 50%, ${MINT_BASE} 100%)`,
];

const DAYS_LABEL = ['一', '二', '三', '四', '五', '六', '日'];
const DAYS_KEY = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); 

function getWeekDates() {
  const now = new Date();
  const day = now.getDay(); 
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const thisWeek = [];
  const nextWeek = [];
  for (let i = 0; i < 7; i++) {
    const d1 = new Date(monday);
    d1.setDate(monday.getDate() + i);
    thisWeek.push(formatDate(d1));
    const d2 = new Date(monday);
    d2.setDate(monday.getDate() + 7 + i);
    nextWeek.push(formatDate(d2));
  }
  return [thisWeek, nextWeek];
}

export default function TimeTableContainer() {
  const [savedEvents, setSavedEvents] = useState({});
  const [eventToDeleteId, setEventToDeleteId] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [confirmBtn, setConfirmBtn] = useState({ visible: false, x: 0, y: 0 });
  const [deleteBtn, setDeleteBtn] = useState({ visible: false, x: 0, y: 0 });
  const [isFormVisible, setFormVisible] = useState(false);
  
  const containerRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const toggleModeRef = useRef(null);
  const lastActiveCellRef = useRef(null);
  const hadDragSelectionRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('timetable_events').select('*');
      if (!error) {
        const eventsObject = data.reduce((acc, event) => {
          acc[event.id] = { text: event.event_text, color: event.color, cells: event.cells };
          return acc;
        }, {});
        setSavedEvents(eventsObject);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (hadDragSelectionRef.current) {
        suppressNextClickRef.current = true;
        setTimeout(() => (suppressNextClickRef.current = false), 0);
      }
      isMouseDownRef.current = false;
      toggleModeRef.current = null;
      hadDragSelectionRef.current = false;
    };

    const handleDocumentClick = (e) => {
      if (suppressNextClickRef.current) return;
      if (e.target.closest('td, #confirmBtn, #formBox, #deleteBtn')) return;
      clearActiveAndDeleteMode();
    };

    // 支持 TouchEnd 全局清理
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    const debouncedRender = setTimeout(() => renderOverlays(eventToDeleteId), 50);
    window.addEventListener('resize', () => renderOverlays(eventToDeleteId));
    return () => {
      window.removeEventListener('resize', () => renderOverlays(eventToDeleteId));
      clearTimeout(debouncedRender);
    };
  }, [savedEvents, eventToDeleteId]);

  const clearActiveAndDeleteMode = useCallback(() => {
    document.querySelectorAll('td.active').forEach(td => td.classList.remove('active'));
    setEventToDeleteId(null);
    setConfirmBtn({ visible: false, x: 0, y: 0 });
    setDeleteBtn({ visible: false, x: 0, y: 0 });
    setFormVisible(false);
  }, []);

  const updateConfirmButton = useCallback(() => {
    const selected = document.querySelectorAll('td.active');
    const lastCell = lastActiveCellRef.current;
    if (!selected.length || !lastCell) {
      setConfirmBtn({ visible: false, x: 0, y: 0 });
      return;
    }
    const rect = lastCell.getBoundingClientRect();
    setConfirmBtn({
      visible: true,
      x: rect.right + 8,
      y: rect.top + window.scrollY + (rect.height - 32) / 2,
    });
  }, []);

  // --- PC端 鼠标事件 ---
  const handleCellMouseDown = useCallback((e) => {
    const td = e.currentTarget;
    // 只有左键点击才触发选中 (避免右键菜单干扰)
    if (e.button !== 0) return;

    const eventId = td.dataset.eventId;
    if (eventId) {
      setEventToDeleteId(eventId);
      setConfirmBtn({ visible: false, x: 0, y: 0 });
      const rect = td.getBoundingClientRect();
      setDeleteBtn({ visible: true, x: rect.right + 8, y: rect.top + window.scrollY + (rect.height - 32) / 2 });
      return;
    }
    isMouseDownRef.current = true;
    toggleModeRef.current = !td.classList.contains('active');
    td.classList.toggle('active', toggleModeRef.current);
    lastActiveCellRef.current = td;
    hadDragSelectionRef.current = false;
    updateConfirmButton();
  }, [updateConfirmButton]);

  const handleCellMouseEnter = useCallback((e) => {
    if (isMouseDownRef.current) {
      hadDragSelectionRef.current = true;
      e.currentTarget.classList.toggle('active', toggleModeRef.current);
      lastActiveCellRef.current = e.currentTarget;
      updateConfirmButton();
    }
  }, [updateConfirmButton]);

  // --- 移动端 触摸事件 (新增逻辑) ---
  const handleTouchStart = useCallback((e) => {
    // 阻止默认事件可能导致无法点击，这里主要依靠 CSS 的 touch-action: none
    const td = e.currentTarget;
    const eventId = td.dataset.eventId;
    
    if (eventId) {
        // 如果点击的是已有事件，走删除逻辑
        setEventToDeleteId(eventId);
        setConfirmBtn({ visible: false, x: 0, y: 0 });
        const rect = td.getBoundingClientRect();
        setDeleteBtn({ visible: true, x: rect.right + 8, y: rect.top + window.scrollY + (rect.height - 32) / 2 });
        return;
    }

    // 开始选中逻辑
    isMouseDownRef.current = true; // 复用 MouseDown 状态
    toggleModeRef.current = !td.classList.contains('active');
    td.classList.toggle('active', toggleModeRef.current);
    lastActiveCellRef.current = td;
    hadDragSelectionRef.current = false;
    updateConfirmButton();
  }, [updateConfirmButton]);

  const handleTouchMove = useCallback((e) => {
    // 阻止浏览器默认滚动行为 (前提是 CSS 加了 touch-action: none)
    // 注意：如果想保留页面滚动，这里逻辑会变复杂，通常表格拖拽选区是互斥的
    if (e.cancelable) e.preventDefault();

    if (isMouseDownRef.current) {
        const touch = e.touches[0];
        // 核心：根据坐标找到当前手指下的元素
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // 确保目标是 td，且是我们表格里的 td
        if (target && target.tagName === 'TD' && target !== lastActiveCellRef.current && containerRef.current.contains(target)) {
            hadDragSelectionRef.current = true;
            target.classList.toggle('active', toggleModeRef.current);
            lastActiveCellRef.current = target;
            updateConfirmButton();
        }
    }
  }, [updateConfirmButton]);

  // --- 数据操作 ---
  const handleSaveEvent = useCallback(async (text, color) => {
    if (!text) return;
    const selected = Array.from(document.querySelectorAll('td.active'));
    if (!selected.length) return;
    const newCells = selected.map(td => ({
      date: td.dataset.date,
      hour: parseInt(td.dataset.hour, 10),
    }));
    const newEventData = { event_text: text, color, cells: newCells };
    const { data, error } = await supabase.from('timetable_events').insert(newEventData).select();
    if (!error && data.length > 0) {
      const newEvent = data[0];
      setSavedEvents(prev => ({
        ...prev,
        [newEvent.id]: { text: newEvent.event_text, color: newEvent.color, cells: newEvent.cells }
      }));
      clearActiveAndDeleteMode();
    } else {
      alert('保存失败');
    }
  }, [clearActiveAndDeleteMode]);

  const handleDeleteEvent = useCallback(async () => {
    if (!eventToDeleteId) return;
    const { error } = await supabase.from('timetable_events').delete().match({ id: eventToDeleteId });
    if (!error) {
      setSavedEvents(prev => {
        const next = { ...prev };
        delete next[eventToDeleteId];
        return next;
      });
      clearActiveAndDeleteMode();
    }
  }, [eventToDeleteId, clearActiveAndDeleteMode]);

  const renderOverlays = useCallback((deletionId) => {
    if (!containerRef.current || !savedEvents) return;
    const newOverlays = [];
    const pushOverlay = (eventId, cells, wrap) => {
      const eventData = savedEvents[eventId];
      if (!eventData) return;
      const first = cells[0];
      const last = cells[cells.length - 1];
      const r1 = first.getBoundingClientRect();
      const r2 = last.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      newOverlays.push({
        key: `${eventId}-${first.dataset.date}-${first.dataset.hour}`,
        left: r1.left - wrapRect.left,
        top: r1.top - wrapRect.top,
        width: r1.width,
        height: r2.bottom - r1.top,
        text: eventData.text,
        color: eventData.color, 
        isToDelete: eventId === deletionId,
        parentId: wrap.dataset.tableId,
      });
    };
    containerRef.current.querySelectorAll('.table-wrap').forEach(wrap => {
        const table = wrap.querySelector('table');
        if (!table?.tBodies[0]) return;
        const rows = Array.from(table.tBodies[0].rows);
        for (let col = 0; col < 7; col++) {
            let curEventId = null, cells = [];
            for (let r = 0; r < rows.length; r++) {
                const td = rows[r].cells[col + 1];
                const cellDate = td.dataset.date;
                const cellHour = parseInt(td.dataset.hour, 10);
                const eventId = Object.keys(savedEvents).find(id => 
                    savedEvents[id].cells.some(c => c.date === cellDate && c.hour === cellHour)
                );
                if (eventId) {
                    if (curEventId === eventId) { cells.push(td); } 
                    else {
                        if (cells.length) pushOverlay(curEventId, cells, wrap);
                        curEventId = eventId; cells = [td];
                    }
                } else {
                    if (cells.length) pushOverlay(curEventId, cells, wrap);
                    curEventId = null; cells = [];
                }
            }
            if (cells.length) pushOverlay(curEventId, cells, wrap);
        }
    });
    setOverlays(newOverlays);
  }, [savedEvents]);

  return (
    <>
      <div id="container" ref={containerRef}>
        <TimeTable 
            tableId="A"
            weekData={getWeekDates()[0]}
            savedEvents={savedEvents}
            handlers={{ 
                onMouseDown: handleCellMouseDown, 
                onMouseEnter: handleCellMouseEnter,
                // ✅ 传递新增的 Touch 事件
                onTouchStart: handleTouchStart,
                onTouchMove: handleTouchMove
            }}
            overlays={overlays.filter(o => o.parentId === 'A')}
        />
        <TimeTable 
            tableId="B"
            weekData={getWeekDates()[1]}
            savedEvents={savedEvents}
            handlers={{ 
                onMouseDown: handleCellMouseDown, 
                onMouseEnter: handleCellMouseEnter,
                // ✅ 传递新增的 Touch 事件
                onTouchStart: handleTouchStart,
                onTouchMove: handleTouchMove
            }}
            overlays={overlays.filter(o => o.parentId === 'B')}
        />
      </div>
      
      {confirmBtn.visible && <button id="confirmBtn" style={{ left: confirmBtn.x, top: confirmBtn.y }} onClick={() => setFormVisible(true)} />}
      {deleteBtn.visible && <button id="deleteBtn" style={{ left: deleteBtn.x, top: deleteBtn.y }} onClick={handleDeleteEvent} />}
      {isFormVisible && (
        <>
          <div id="modalOverlay" onClick={clearActiveAndDeleteMode}></div>
          <EventForm onSave={handleSaveEvent} />
        </>
      )}
    </>
  );
}

const TimeTable = React.memo(({ tableId, weekData, savedEvents, handlers, overlays }) => {
  return (
    <div className="table-wrap" data-table-id={tableId}>
      <table>
        <thead>
          <tr>
            <th>{tableId === 'A' ? 'See' : 'You'}</th>
            {DAYS_LABEL.map((dayLabel, i) => (
              <th key={i}>
                <div className="th-content">
                  <span className="th-day">{dayLabel}</span>
                  <span className="th-date">{weekData[i].split('-')[2]}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour}>
              <th>{String(hour).padStart(2, '0')}:00</th>
              {DAYS_KEY.map((_, colIdx) => {
                  const currentDate = weekData[colIdx];
                  const eventId = savedEvents && Object.keys(savedEvents).find(id => 
                    savedEvents[id]?.cells.some(c => c.date === currentDate && c.hour === hour)
                  );
                  return (
                    <td
                      key={colIdx}
                      data-col={colIdx}
                      data-hour={hour}
                      data-date={currentDate}
                      data-event-id={eventId || ''}
                      className={eventId ? 'marked' : ''}
                      // ✅ 绑定所有事件
                      onMouseDown={handlers.onMouseDown}
                      onMouseEnter={handlers.onMouseEnter}
                      onTouchStart={handlers.onTouchStart}
                      onTouchMove={handlers.onTouchMove}
                    />
                  );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {overlays.map(o => (
        <div
          key={o.key}
          className={`overlay-block ${o.isToDelete ? 'overlay-delete' : ''}`}
          style={{ 
              left: o.left, top: o.top, width: o.width, height: o.height, 
              background: o.isToDelete ? null : o.color 
          }}
        >
          {o.text}
        </div>
      ))}
    </div>
  );
});

function EventForm({ onSave }) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_GRADIENTS[0]);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSave = () => { onSave(text.trim(), selectedColor); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') { handleSave(); } };
  return (
    <div id="formBox">
      <input 
        ref={inputRef} 
        placeholder="输入事项..." 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        onKeyDown={handleKeyDown}
        autoComplete="off" 
      />
      <div className="form-footer">
        <div id="colorPalette">
          {PRESET_GRADIENTS.map((gradient, idx) => (
            <div 
              key={idx} 
              className={`color-option ${selectedColor === gradient ? 'selected' : ''}`} 
              style={{ background: gradient }} 
              onClick={() => setSelectedColor(gradient)} 
            />
          ))}
        </div>
        <button id="saveBtn" onClick={handleSave}></button>
      </div>
    </div>
  );
}