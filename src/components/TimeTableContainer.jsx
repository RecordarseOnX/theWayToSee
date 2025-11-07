// src/components/TimeTableContainer.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimeTableContainer.css'; // <-- 添加这一行

// 常量可以保留在这个文件中，因为它们与时间表强相关
const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const PRESET_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', ' #e91e63', '#795548'];

// 计算当前周和下周的日期（以周一为一周开始）
function getWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 周日=0, 周一=1, ...
  const mondayOffset = day === 0 ? -6 : 1 - day; // 找到本周一
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const formatDate = (date) => {
    const d = date.getDate();
    return d < 10 ? `0${d}` : `${d}`;
  };

  const thisWeek = [];
  const nextWeek = [];

  for (let i = 0; i < 7; i++) {
    const d1 = new Date(monday);
    d1.setDate(monday.getDate() + i);
    const d2 = new Date(monday);
    d2.setDate(monday.getDate() + 7 + i);
    thisWeek.push(formatDate(d1));
    nextWeek.push(formatDate(d2));
  }

  return [thisWeek, nextWeek]; // [本周日期数组, 下周日期数组]
}


// 接收 savedEvents 和 setSavedEvents 作为 props
function TimeTableContainer({ savedEvents, setSavedEvents }) {
  // --- 所有与交互相关的 state 和 ref 都留在这里 ---
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

  // --- 所有 Hooks 和处理函数都从 App.jsx 迁移至此 ---
  useEffect(() => {
    // 这个 effect 现在依赖于从 props 传来的 savedEvents
    localStorage.setItem('tableMarks_events_v2', JSON.stringify(savedEvents));
    setTimeout(() => renderOverlays(eventToDeleteId), 0);
  }, [savedEvents, eventToDeleteId]);

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
      if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
      if (e.target.closest('td') || e.target.closest('#confirmBtn') || e.target.closest('#formBox') || e.target.closest('#deleteBtn')) return;
      clearActiveAndDeleteMode();
    };
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
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

  const handleCellMouseDown = useCallback((e) => {
    const td = e.currentTarget;
    e.preventDefault();
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
    e.stopPropagation();
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

  const handleSaveEvent = useCallback((text, color) => {
    if (!text) return;
    const selected = Array.from(document.querySelectorAll('td.active'));
    if (!selected.length) return;
    const eventId = 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    const newCells = selected.map(td => ({
      tableId: td.closest('.table-wrap').dataset.tableId,
      day: DAYS[td.cellIndex - 1],
      hour: HOURS[td.parentNode.rowIndex - 1],
    }));
    setSavedEvents(prev => ({ ...prev, [eventId]: { text, color, cells: newCells } }));
    selected.forEach(td => td.classList.remove('active'));
    setFormVisible(false);
    setConfirmBtn({ visible: false, x: 0, y: 0 });
  }, [setSavedEvents]); // 注意这里的依赖变成了 props 传来的 setSavedEvents

  const handleDeleteEvent = useCallback(() => {
    if (!eventToDeleteId) return;
    setSavedEvents(prev => {
        const newEvents = { ...prev };
        delete newEvents[eventToDeleteId];
        return newEvents;
    });
    clearActiveAndDeleteMode();
  }, [eventToDeleteId, clearActiveAndDeleteMode, setSavedEvents]); // 注意依赖

  const renderOverlays = useCallback((deletionId) => {
    if (!containerRef.current) return;
    const newOverlays = [];
    containerRef.current.querySelectorAll('.table-wrap').forEach(wrap => {
        const table = wrap.querySelector('table');
        if (!table.tBodies[0]) return;
        const rows = Array.from(table.tBodies[0].rows);
        const groups = [];
        for (let col = 0; col < 7; col++) {
            let curEventId = null, cells = [];
            for (let r = 0; r < rows.length; r++) {
                const td = rows[r].cells[col + 1];
                
                // ✅ 第 1 处修复：在这里添加安全检查
                const eventId = savedEvents && Object.keys(savedEvents).find(id => 
                    savedEvents[id]?.cells.some(c => 
                        c.tableId === wrap.dataset.tableId && c.hour == td.dataset.hour && c.day === DAYS[td.dataset.col]
                    )
                );

                if (eventId) {
                    if (curEventId === eventId) { cells.push(td); } 
                    else {
                        if (cells.length) groups.push({ eventId: curEventId, cells: [...cells] });
                        curEventId = eventId; cells = [td];
                    }
                } else {
                    if (cells.length) groups.push({ eventId: curEventId, cells: [...cells] });
                    curEventId = null; cells = [];
                }
            }
            if (cells.length) groups.push({ eventId: curEventId, cells: [...cells] });
        }
        const wrapRect = wrap.getBoundingClientRect();
        groups.forEach(g => {
            const eventData = savedEvents?.[g.eventId]; // 使用可选链以防万一
            if (!eventData) return;
            const first = g.cells[0];
            const last = g.cells[g.cells.length - 1];
            const r1 = first.getBoundingClientRect();
            const r2 = last.getBoundingClientRect();
            newOverlays.push({
                key: `${wrap.dataset.tableId}-${g.eventId}-${g.cells[0].dataset.col}`,
                left: r1.left - wrapRect.left, top: r1.top - wrapRect.top,
                width: r1.width, height: r2.bottom - r1.top,
                text: eventData.text, color: eventData.color,
                isToDelete: g.eventId === deletionId, parentId: wrap.dataset.tableId,
            });
        });
    });
    setOverlays(newOverlays);
  }, [savedEvents]);

  return (
    <>
      <div id="container" ref={containerRef}>
        <TimeTable 
            tableId="A"
            savedEvents={savedEvents}
            eventToDeleteId={eventToDeleteId}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            overlays={overlays.filter(o => o.parentId === 'A')}
        />
        <TimeTable 
            tableId="B"
            savedEvents={savedEvents}
            eventToDeleteId={eventToDeleteId}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
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

// --- Sub-components can remain in the same file as they are tightly coupled ---

function TimeTable({ tableId, savedEvents, eventToDeleteId, onCellMouseDown, onCellMouseEnter, overlays }) {
  const [thisWeek, nextWeek] = getWeekDates();
  const weekDates = tableId === 'A' ? thisWeek : nextWeek;

  return (
    <div className="table-wrap" data-table-id={tableId}>
      <table>
        <thead>
          <tr>
            <th></th>
            {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
              <th key={day}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span>{day}</span>
                  <span style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
                    {weekDates[i]}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour}>
              <th>{String(hour).padStart(2, '0')}:00</th>
              {DAYS.map((day, colIdx) => {
                  
                  // ✅ 第 2 处修复：在这里添加同样的安全检查
                  const eventId = savedEvents && Object.keys(savedEvents).find(id => 
                    savedEvents[id]?.cells.some(c => c.tableId === tableId && c.hour === hour && c.day === day)
                  );

                  return (
                    <td
                      key={day}
                      data-col={colIdx}
                      data-hour={hour}
                      data-event-id={eventId || ''}
                      className={eventId ? 'marked' : ''}
                      onMouseDown={onCellMouseDown}
                      onMouseEnter={onCellMouseEnter}
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
              backgroundColor: o.isToDelete ? null : o.color 
          }}
        >
          {o.text}
        </div>
      ))}
    </div>
  );
}

function EventForm({ onSave }) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSave = () => { onSave(text.trim(), selectedColor); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') { handleSave(); } };
  return (
    <div id="formBox" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
      <input ref={inputRef} id="eventText" placeholder="输入事件内容..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} />
      <div className="form-footer">
        <div id="colorPalette">
          {PRESET_COLORS.map(color => (
            <div key={color} className={`color-option ${selectedColor === color ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={() => setSelectedColor(color)} />
          ))}
        </div>
        <button id="saveBtn" onClick={handleSave}></button>
      </div>
    </div>
  );
}

export default TimeTableContainer;