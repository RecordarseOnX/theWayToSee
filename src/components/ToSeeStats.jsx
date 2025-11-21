import React, { useState, useEffect, useRef, forwardRef } from "react";
import "./ToSeeStats.css";
import { supabase } from "../supabaseClient";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { zhCN } from "date-fns/locale/zh-CN";
registerLocale("zh-CN", zhCN);

import {
  Plane, TrainFront, TramFront,
  Clock, Wallet, PlusCircle,
  Loader2, Check, X,
  CalendarDays, Lock
} from "lucide-react";

// --- 辅助组件：自定义 DatePicker 触发器 ---
// 这确保了点击整个左侧区域都能打开日历，且无需处理层级遮挡问题
const DateTrigger = forwardRef(({ value, onClick, className }, ref) => (
  <div className={className} onClick={onClick} ref={ref}>
    <CalendarDays size={14} className="input-icon-left" />
    <span className="date-text-display">{value}</span>
  </div>
));

// --- 子组件：日期+自动纠错时间输入 ---
const DateTimeInput = ({ value, onChange }) => {
  const date = value instanceof Date && !isNaN(value) ? value : new Date();

  // 本地状态：解决 "输入2立马变成02" 的BUG
  // 只有当 date 改变且用户不在输入时，才同步 prop 到 state
  const [hStr, setHStr] = useState(String(date.getHours()).padStart(2, '0'));
  const [mStr, setMStr] = useState(String(date.getMinutes()).padStart(2, '0'));

  // 当外部 date 变化时（比如选了日期），同步时间显示
  // 但为了防止打字时跳变，这里我们加一个简单的判断：如果数值一样就不覆盖字符串
  useEffect(() => {
    const propH = date.getHours();
    const propM = date.getMinutes();
    if (parseInt(hStr) !== propH) setHStr(String(propH).padStart(2, '0'));
    if (parseInt(mStr) !== propM) setMStr(String(propM).padStart(2, '0'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]); 

  const updateTime = (newH, newM) => {
    const newDate = new Date(date);
    newDate.setHours(newH);
    newDate.setMinutes(newM);
    onChange(newDate);
  };

  const handleHourChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setHStr(val); // 允许显示 "2"，不立即补零
    if (val === '') return;
    
    let num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num > 23) { num = 23; setHStr('23'); } // 立即纠错
      updateTime(num, date.getMinutes());
    }
  };

  const handleMinuteChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setMStr(val);
    if (val === '') return;

    let num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num > 59) { num = 59; setMStr('59'); }
      updateTime(date.getHours(), num);
    }
  };

  // 失去焦点时，强制补零格式化
  const handleBlur = (type) => () => {
    if (type === 'hour') {
      let num = parseInt(hStr || '0', 10);
      setHStr(String(num).padStart(2, '0'));
      updateTime(num, date.getMinutes());
    } else {
      let num = parseInt(mStr || '0', 10);
      setMStr(String(num).padStart(2, '0'));
      updateTime(date.getHours(), num);
    }
  };

  return (
    <div className="custom-datetime-wrapper">
      {/* 左侧：日期选择 (使用 customInput 完美解决点击区域问题) */}
      <div className="date-part-wrapper">
        <DatePicker
          selected={date}
          onChange={(d) => {
            const newDate = new Date(d);
            newDate.setHours(date.getHours());
            newDate.setMinutes(date.getMinutes());
            onChange(newDate);
          }}
          dateFormat="yyyy/MM/dd"
          locale="zh-CN"
          // 关键优化：使用 customInput 让整个 div 成为触发器
          customInput={<DateTrigger className="date-trigger-box" />}
          popperPlacement="bottom-start"
          portalId="root-datepicker"
          autoComplete="off"
        />
      </div>

      <div className="divider"></div>

      {/* 右侧：时分输入 */}
      <div className="time-part">
        <Clock size={14} className="input-icon-left" />
        <input
          type="text"
          className="time-input"
          value={hStr}
          onChange={handleHourChange}
          onBlur={handleBlur('hour')}
          maxLength={2}
          onFocus={(e) => e.target.select()}
          inputMode="numeric" 
        />
        <span className="time-colon">:</span>
        <input
          type="text"
          className="time-input"
          value={mStr}
          onChange={handleMinuteChange}
          onBlur={handleBlur('minute')}
          maxLength={2}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
        />
      </div>
    </div>
  );
};

// --- 主组件 ---
export default function ToSeeStats({ onSummaryChange }) {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [records, setRecords] = useState([]);
  const modalRef = useRef(null);
  const passwordModalRef = useRef(null);
  const [outboundMode, setOutboundMode] = useState("plane");
  const [returnMode, setReturnMode] = useState(null);
  
  const [form, setForm] = useState({
    flightNumber: "", departDateTime: new Date(), arriveDateTime: new Date(),
    fee: "", taxiFee: "", returnFlight: "", returnDepart: new Date(),
    returnArrive: new Date(), returnFee: "", returnTaxi: "",
  });
  
  const [submitState, setSubmitState] = useState('idle');
  const CORRECT_PASSWORD = '252799';

  const modeDetails = {
    plane: { icon: <Plane size={16} />, text: "飞机" },
    train: { icon: <TrainFront size={16} />, text: "火车" },
    highspeed: { icon: <TramFront size={16} />, text: "高铁" },
  };

  useEffect(() => {
    const fetchRecords = async () => {
      const { data, error } = await supabase.from("trips").select("*").order("start_datetime", { ascending: false });
      if (error) console.error("Error fetching trips:", error); else setRecords(data);
    };
    fetchRecords();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideModal = modalRef.current && modalRef.current.contains(e.target);
      const isClickInsideDatePicker = e.target.closest('.react-datepicker-popper');
      if (open && !isClickInsideModal && !isClickInsideDatePicker) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handlePasswordClickOutside = (e) => {
      if (showPasswordModal && passwordModalRef.current && !passwordModalRef.current.contains(e.target)) {
        setShowPasswordModal(false);
        setPassword('');
        setSubmitState('idle');
      }
    };
    if (showPasswordModal) document.addEventListener("mousedown", handlePasswordClickOutside);
    return () => document.removeEventListener("mousedown", handlePasswordClickOutside);
  }, [showPasswordModal]);

  useEffect(() => {
    const summaryByMode = { plane: { cost: 0, minutes: 0 }, train: { cost: 0, minutes: 0 }, highspeed: { cost: 0, minutes: 0 }, taxi: 0 };
    let totalMin = 0;
    records.forEach((r) => {
      if (summaryByMode[r.mode]) {
        const duration = Math.round((new Date(r.end_datetime) - new Date(r.start_datetime)) / 60000);
        summaryByMode[r.mode].cost += r.cost;
        summaryByMode[r.mode].minutes += duration;
        totalMin += duration;
      }
      summaryByMode.taxi += r.taxi_cost || 0;
    });
    const totalCost = summaryByMode.plane.cost + summaryByMode.train.cost + summaryByMode.highspeed.cost + summaryByMode.taxi;
    if (onSummaryChange) onSummaryChange({ plane: summaryByMode.plane, train: summaryByMode.train, highspeed: summaryByMode.highspeed, taxi: summaryByMode.taxi, totalCost, totalMin });
  }, [records, onSummaryChange]);

  const calcSummary = () => {
    const dep = form.departDateTime;
    const arr = form.arriveDateTime;
    const hasReturnInfo = form.returnDepart && form.returnArrive && returnMode && form.returnFee;
    const rdep = hasReturnInfo ? form.returnDepart : dep;
    const rarr = hasReturnInfo ? form.returnArrive : dep;
    const diff = Math.max(0, arr - dep);
    const rdiff = hasReturnInfo ? Math.max(0, rarr - rdep) : 0;
    const totalMin = Math.round((diff + rdiff) / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const totalCost = (+form.fee || 0) + (+form.taxiFee || 0) + (hasReturnInfo ? +form.returnFee : 0) + (hasReturnInfo ? +form.returnTaxi : 0);
    return { timeText: `${h}小时${m}分`, costText: `${totalCost}` };
  };

  const performInsert = async () => {
    try {
      const groupId = crypto.randomUUID();
      const recordsToInsert = [];
      const outboundRecord = { group_id: groupId, trip_type: "outbound", mode: outboundMode, start_datetime: form.departDateTime.toISOString(), end_datetime: form.arriveDateTime.toISOString(), cost: +form.fee, taxi_cost: +form.taxiFee || null, flight_number: form.flightNumber || null };
      recordsToInsert.push(outboundRecord);
      const hasReturnTrip = form.returnDepart && form.returnArrive && returnMode && form.returnFee;
      if (hasReturnTrip) {
        const returnRecord = { group_id: groupId, trip_type: "return", mode: returnMode, start_datetime: form.returnDepart.toISOString(), end_datetime: form.returnArrive.toISOString(), cost: +form.returnFee, taxi_cost: +form.returnTaxi || null, flight_number: form.returnFlight || null };
        recordsToInsert.push(returnRecord);
      }
      const { data, error } = await supabase.from("trips").insert(recordsToInsert).select();
      if (error) throw error;
      setRecords(prevRecords => [...data, ...prevRecords]);
      setSubmitState('success');
      setTimeout(() => { 
        setOpen(false); 
        setShowPasswordModal(false); 
        setSubmitState('idle'); 
        setPassword('');
      }, 1500);
    } catch (error) {
      console.error("Error adding trip records:", error);
      setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 2000);
    }
  };

  const handleAdd = () => {
    if (submitState !== 'idle') return;
    if (!form.departDateTime || !form.arriveDateTime || !outboundMode || !form.fee) {
      setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 2000);
      return;
    }
    setSubmitState('waiting');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (password.length !== 6 || !/^\d{6}$/.test(password)) { setPassword(''); return; }
    if (password === CORRECT_PASSWORD) { setSubmitState('submitting'); performInsert(); } 
    else { setPassword(''); setSubmitState('error'); setTimeout(() => setSubmitState('waiting'), 2000); }
  };

  const handlePasswordKeyDown = (e) => { if (e.key === 'Enter') handlePasswordSubmit(); };
  const { timeText, costText } = calcSummary();

  const renderSubmitButtonContent = () => {
    switch (submitState) {
      case 'waiting': return <><PlusCircle size={18} /> <span>输入PIN确认</span></>;
      case 'submitting': return <Loader2 size={18} className="spinner" />;
      case 'success': return <Check size={18} />;
      case 'error': return <X size={18} />;
      default: return <><PlusCircle size={18} /> <span>保存行程</span></>;
    }
  };

  return (
    <>
      <button className="toSeeBtn" onClick={() => setOpen(true)}>ToSee</button>
      {open && (
        <div className="toSeeOverlay">
          <div className="toSeeModal" ref={modalRef}>
            <div className="mode-buttons">{Object.keys(modeDetails).map((m) => (<button key={m} onClick={() => setOutboundMode(m)} className={outboundMode === m ? "active" : ""}>{modeDetails[m].icon} <span>{modeDetails[m].text}</span></button>))}</div>
            <input type="text" placeholder="去程班次号（可不填）" value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}/>
            
            {/* 去程日期组：移除了中间的箭头，CSS Grid 布局实现并排 */}
            <div className="datetime-picker-group">
              <DateTimeInput 
                value={form.departDateTime} 
                onChange={(date) => setForm({ ...form, departDateTime: date })} 
              />
              <DateTimeInput 
                value={form.arriveDateTime} 
                onChange={(date) => setForm({ ...form, arriveDateTime: date })} 
              />
            </div>

            <div className="fee-group">
              <input type="number" placeholder="去程费用" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              <input type="number" placeholder="打车费（可不填）" value={form.taxiFee} onChange={(e) => setForm({ ...form, taxiFee: e.target.value })} />
            </div>

            <div className="mode-buttons">{Object.keys(modeDetails).map((m) => (<button key={m} onClick={() => setReturnMode(current => (current === m ? null : m))} className={returnMode === m ? "active" : ""}>{modeDetails[m].icon} <span>{modeDetails[m].text}</span></button>))}</div>
            <input type="text" placeholder="返程班次号（可不填）" value={form.returnFlight} onChange={(e) => setForm({ ...form, returnFlight: e.target.value })} />
            
            {/* 返程日期组 */}
            <div className="datetime-picker-group">
              <DateTimeInput 
                value={form.returnDepart} 
                onChange={(date) => setForm({ ...form, returnDepart: date })} 
              />
              <DateTimeInput 
                value={form.returnArrive} 
                onChange={(date) => setForm({ ...form, returnArrive: date })} 
              />
            </div>

            <div className="fee-group">
              <input type="number" placeholder="返程费用（可不填）" value={form.returnFee} onChange={(e) => setForm({ ...form, returnFee: e.target.value })} />
              <input type="number" placeholder="打车费（可不填）" value={form.returnTaxi} onChange={(e) => setForm({ ...form, returnTaxi: e.target.value })} />
            </div>
            
            <div id="summary">
              <div className="summary-item"><Clock size={14} /><span>总耗时：{timeText}</span></div>
              <div className="summary-item"><Wallet size={14} /><span>总花费：￥{costText}</span></div>
            </div>
            <button id="addBtn" className={`state-${submitState}`} onClick={handleAdd} disabled={submitState !== 'idle'}>
              {renderSubmitButtonContent()}
            </button>
          </div>
        </div>
      )}
      {showPasswordModal && (
        <div className="passwordOverlay">
          <div className="passwordModal" ref={passwordModalRef}>
            <div className="passwordHeader">
              <Lock size={20} className="passwordIcon" />
            </div>
            <input type="password" placeholder="PIN" value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0,6))} onKeyDown={handlePasswordKeyDown} className="passwordInput" autoFocus maxLength={6} />
            <button className="passwordConfirmBtn" onClick={handlePasswordSubmit} disabled={password.length !== 6}>确认</button>
          </div>
        </div>
      )}
    </>
  );
}