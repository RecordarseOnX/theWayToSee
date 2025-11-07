import React, { useState, useEffect, useRef } from "react";
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
  CalendarDays
} from "lucide-react";

export default function ToSeeStats({ onSummaryChange }) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const modalRef = useRef(null);
  const [outboundMode, setOutboundMode] = useState("plane");
  const [returnMode, setReturnMode] = useState(null);
  const [form, setForm] = useState({
    flightNumber: "", departDateTime: new Date(), arriveDateTime: new Date(),
    fee: "", taxiFee: "", returnFlight: "", returnDepart: new Date(),
    returnArrive: new Date(), returnFee: "", returnTaxi: "",
  });
  const [submitState, setSubmitState] = useState('idle');

  const modeDetails = {
    plane: { icon: <Plane size={16} />, text: "飞机" },
    train: { icon: <TrainFront size={16} />, text: "火车" },
    highspeed: { icon: <TramFront size={16} />, text: "高铁" },
  };

  const handleDateTimeChange = (field) => (date) => {
    const oldDate = form[field] || new Date(); // Fallback to current date if null
    const newDate = new Date(date);
    const oldDateOnly = new Date(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    const newDateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    if (oldDateOnly.getTime() === newDateOnly.getTime()) {
      // 时间变化
      setForm({ ...form, [field]: newDate });
    } else {
      // 日期变化，保留时间
      const preserved = new Date(newDate);
      preserved.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds(), oldDate.getMilliseconds());
      setForm({ ...form, [field]: preserved });
    }
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

  const handleAdd = async () => {
    if (submitState !== 'idle') return;
    if (!form.departDateTime || !form.arriveDateTime || !outboundMode || !form.fee) {
      setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 2000);
      return;
    }
    setSubmitState('submitting');
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
      setSubmitState('success');
      setRecords([...data, ...records]);
      setTimeout(() => { setOpen(false); setSubmitState('idle'); }, 1500);
    } catch (error) {
      console.error("Error adding trip records:", error);
      setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 2000);
    }
  };
  
  const { timeText, costText } = calcSummary();

  const renderSubmitButtonContent = () => {
    switch (submitState) {
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
            <div className="datetime-picker-group">
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={form.departDateTime}
                  onChange={handleDateTimeChange('departDateTime')}
                  showTimeInput
                  timeInputLabel="时间:"
                  locale="zh-CN"
                  dateFormat="yyyy/MM/dd HH:mm"
                  className="custom-datepicker-input"
                  portalId="root-datepicker"
                />
                <CalendarDays size={16} className="datepicker-icon" />
              </div>
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={form.arriveDateTime}
                  onChange={handleDateTimeChange('arriveDateTime')}
                  showTimeInput
                  timeInputLabel="时间:"
                  locale="zh-CN"
                  dateFormat="yyyy/MM/dd HH:mm"
                  className="custom-datepicker-input"
                  portalId="root-datepicker"
                />
                <CalendarDays size={16} className="datepicker-icon" />
              </div>
            </div>
            <div className="fee-group">
              <input type="number" placeholder="去程费用" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              <input type="number" placeholder="打车费（可不填）" value={form.taxiFee} onChange={(e) => setForm({ ...form, taxiFee: e.target.value })} />
            </div>
            <div className="mode-buttons">{Object.keys(modeDetails).map((m) => (<button key={m} onClick={() => setReturnMode(current => (current === m ? null : m))} className={returnMode === m ? "active" : ""}>{modeDetails[m].icon} <span>{modeDetails[m].text}</span></button>))}</div>
            <input type="text" placeholder="返程班次号（可不填）" value={form.returnFlight} onChange={(e) => setForm({ ...form, returnFlight: e.target.value })} />
            <div className="datetime-picker-group">
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={form.returnDepart}
                  onChange={handleDateTimeChange('returnDepart')}
                  showTimeInput
                  timeInputLabel="时间:"
                  locale="zh-CN"
                  dateFormat="yyyy/MM/dd HH:mm"
                  className="custom-datepicker-input"
                  portalId="root-datepicker"
                />
                <CalendarDays size={16} className="datepicker-icon" />
              </div>
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={form.returnArrive}
                  onChange={handleDateTimeChange('returnArrive')}
                  showTimeInput
                  timeInputLabel="时间:"
                  locale="zh-CN"
                  dateFormat="yyyy/MM/dd HH:mm"
                  className="custom-datepicker-input"
                  portalId="root-datepicker"
                />
                <CalendarDays size={16} className="datepicker-icon" />
              </div>
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
    </>
  );
}