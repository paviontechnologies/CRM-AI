'use client';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const rows = [
  { name: 'Apollo Wellness', meta: 'Delhi · Healthcare', score: 95, tag: 'Closed won' },
  { name: 'Innovate Tech', meta: 'Bangalore · SaaS', score: 93, tag: 'Proposal' },
  { name: 'MediCare Hospital', meta: 'Mumbai · Healthcare', score: 91, tag: 'Contacted' },
  { name: 'FastMove Logistics', meta: 'Chennai · Logistics', score: 88, tag: 'Meeting' },
  { name: 'CityHealth Clinic', meta: 'Mumbai · Healthcare', score: 85, tag: 'Qualified' },
];

/**
 * The hero's product specimen.
 *
 * The score bars fill on mount rather than rendering at their final width —
 * it shows the thing the product actually does (ranking a list) in the two
 * seconds someone spends on the fold.
 */
export function HeroQueue() {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border border-line bg-surface/80 backdrop-blur-xl overflow-hidden shadow-[var(--shadow-elevated)]"
      >
        <div className="px-4 h-11 flex items-center justify-between border-b border-line">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium text-ink">Today&rsquo;s queue</span>
          </div>
          <span className="text-xs text-faint tabular-nums">15 leads</span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <motion.li
              key={r.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
              className="px-4 py-3 flex items-center gap-3 group hover:bg-subtle/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                <p className="text-xs text-faint truncate">{r.meta}</p>
              </div>

              <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded border border-line text-muted">
                {r.tag}
              </span>

              <div className="w-14 h-1 rounded-full bg-subtle overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${r.score}%` }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-sm font-semibold text-ink tabular-nums w-7 text-right">{r.score}</span>
            </motion.li>
          ))}
        </ul>

        <div className="px-4 h-11 flex items-center justify-between border-t border-line bg-subtle/40">
          <span className="text-xs text-muted">Scored 4 minutes ago</span>
          <span className="text-xs font-medium text-accent inline-flex items-center gap-1">
            Open pipeline <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
