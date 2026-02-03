import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, CheckCircle2 } from 'lucide-react';

const MODERN_INPUT = "w-full px-5 py-4 rounded-xl border border-gray-200 outline-none font-bold text-sm bg-white";
const MODERN_LABEL = "text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block";

export const SearchableSelect: React.FC<any> = ({ options = [], value = '', onChange = () => {}, placeholder = '', label, className }) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open]);

  const filtered = useMemo(() => {
    let results = options.filter((o: string) => o.toLowerCase().includes((term || '').toLowerCase()));
    // Always include the current value at the top if it exists and isn't already in results
    if (value && !results.includes(value)) {
      results = [value, ...results];
    }
    return results;
  }, [options, term, value]);

  return (
    <div className="relative" ref={ref}>
      {label && <label className={MODERN_LABEL}>{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={open ? term : value}
          placeholder={value || placeholder}
          onFocus={() => { setOpen(true); setTerm(''); }}
          onChange={(e) => setTerm(e.target.value)}
          className={`${className || MODERN_INPUT} pr-10`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {open ? <Search size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div 
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
          className="z-[9999] mt-2 bg-white border rounded-2xl shadow max-h-60 overflow-y-auto"
        >
          {filtered.length ? filtered.map((opt: string, i: number) => (
            <div key={i} className={`px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${opt === value ? 'text-purple-600 font-bold' : 'text-gray-700'}`} onClick={() => { onChange(opt); setOpen(false); }}>
              <span>{opt}</span>
              {opt === value && <CheckCircle2 size={14} />}
            </div>
          )) : <div className="px-5 py-4 text-xs text-gray-400 text-center">Type to search...</div>}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;