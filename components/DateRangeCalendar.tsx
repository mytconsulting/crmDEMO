'use client'

import { useState } from 'react'
import { Icon, I } from '@/components/crm-icons'

interface Props {
  /** Fecha inicio en formato local 'YYYY-MM-DD' (o '' si sin seleccionar) */
  start: string
  /** Fecha fin en formato local 'YYYY-MM-DD' (o '' si sin seleccionar) */
  end: string
  onChange: (start: string, end: string) => void
  onClose?: () => void
}

const DOW = ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do']

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const dayNum = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate()
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

function MonthGrid({
  month, selStart, selEnd, hover, onPick, onHover, className,
}: {
  month: Date
  selStart: Date | null
  selEnd: Date | null
  hover: Date | null
  onPick: (d: Date) => void
  onHover: (d: Date | null) => void
  className?: string
}) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDow = (new Date(year, m, 1).getDay() + 6) % 7 // lunes = 0
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const todayN = dayNum(new Date())

  // Fin efectivo para pintar el rango (durante la selección, usa el hover)
  const effEnd = selEnd ?? (selStart && hover ? hover : null)
  const lo = selStart && effEnd ? Math.min(dayNum(selStart), dayNum(effEnd)) : null
  const hi = selStart && effEnd ? Math.max(dayNum(selStart), dayNum(effEnd)) : null

  const cells: React.ReactNode[] = []
  for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} className="dp__day dp__day--empty" />)
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, m, day)
    const n = dayNum(d)
    const isStart = selStart && n === dayNum(selStart)
    const isEnd = effEnd && n === dayNum(effEnd)
    const inRange = lo !== null && hi !== null && n >= lo && n <= hi
    const cls = [
      'dp__day',
      inRange && !isStart && !isEnd ? 'dp__day--in' : '',
      isStart ? 'dp__day--start' : '',
      isEnd ? 'dp__day--end' : '',
      n === todayN ? 'dp__day--today' : '',
    ].filter(Boolean).join(' ')
    cells.push(
      <button
        key={day}
        type="button"
        className={cls}
        onClick={() => onPick(d)}
        onMouseEnter={() => onHover(d)}
      >{day}</button>
    )
  }

  return (
    <div className={className} onMouseLeave={() => onHover(null)}>
      <div className="dp__dows">{DOW.map(w => <div key={w} className="dp__dow">{w}</div>)}</div>
      <div className="dp__grid">{cells}</div>
    </div>
  )
}

export default function DateRangeCalendar({ start, end, onChange, onClose }: Props) {
  const [view, setView] = useState<Date>(() => (start ? addMonths(parseISO(start), 0) : addMonths(new Date(), 0)))
  const [hover, setHover] = useState<Date | null>(null)

  const selStart = start ? parseISO(start) : null
  const selEnd = end ? parseISO(end) : null

  const pick = (d: Date) => {
    // Sin inicio, o rango ya completo -> empezar de nuevo
    if (!selStart || (selStart && selEnd)) {
      onChange(iso(d), '')
      return
    }
    if (dayNum(d) >= dayNum(selStart)) onChange(iso(selStart), iso(d))
    else onChange(iso(d), '') // clic anterior al inicio -> reinicia
  }

  const rangeText = selStart
    ? `${selStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}${selEnd ? ` — ${selEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' — …'}`
    : 'Selecciona la fecha de inicio'

  const title = (d: Date, cls?: string) => (
    <span className={cls}>{d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
  )

  return (
    <div className="dp">
      <div className="dp__bar">
        <button type="button" className="dp__navbtn" onClick={() => setView(addMonths(view, -1))} aria-label="Mes anterior">
          <Icon d={I.chevronLeft} size={16} />
        </button>
        <div className="dp__titles">
          {title(view)}
          {title(addMonths(view, 1), 'dp__title2')}
        </div>
        <button type="button" className="dp__navbtn" onClick={() => setView(addMonths(view, 1))} aria-label="Mes siguiente">
          <Icon d={I.chevronRight} size={16} />
        </button>
      </div>

      <div className="dp__months">
        <MonthGrid month={view} selStart={selStart} selEnd={selEnd} hover={hover} onPick={pick} onHover={setHover} />
        <MonthGrid month={addMonths(view, 1)} selStart={selStart} selEnd={selEnd} hover={hover} onPick={pick} onHover={setHover} className="dp__grid2" />
      </div>

      <div className="dp__foot">
        <span className="dp__range">{rangeText}</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {(start || end) && (
            <button type="button" className="dp__clear" onClick={() => onChange('', '')}>Limpiar</button>
          )}
          {onClose && (
            <button type="button" className="dp__done" onClick={onClose} disabled={!selStart || !selEnd}>Listo</button>
          )}
        </div>
      </div>
    </div>
  )
}
