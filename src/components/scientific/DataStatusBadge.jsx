import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { DataState } from '../../engine/contracts/intelligenceContract.js';

export default function DataStatusBadge({ dataState = DataState.OBSERVED, unit = '°C', source = 'INCOIS' }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
      <span className="text-slate-400">SRC: {source}</span>
      <span className={`datastate-badge datastate-${dataState}`}>{dataState}</span>
      <span className="text-slate-400">[{unit}]</span>
    </div>
  );
}
