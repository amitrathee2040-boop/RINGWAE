import { motion } from "framer-motion";
import { LeagueInfo } from "../contexts/PlayerContext";

interface Props {
  league: LeagueInfo;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

const SIZE_MAP = {
  sm: { badge: "w-6 h-6 text-xs", label: "text-[10px]" },
  md: { badge: "w-8 h-8 text-sm", label: "text-xs" },
  lg: { badge: "w-12 h-12 text-xl", label: "text-sm font-semibold" },
};

export default function RankBadge({ league, size = "md", showLabel = false, animated = false }: Props) {
  const cls = SIZE_MAP[size];
  const badge = (
    <div
      className={`${cls.badge} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{
        background: league.gradient,
        boxShadow: animated ? `0 0 12px ${league.color}60` : `0 0 6px ${league.color}30`,
      }}
    >
      <span>{league.icon}</span>
    </div>
  );

  if (!showLabel) {
    return animated ? (
      <motion.div
        animate={{ boxShadow: [`0 0 8px ${league.color}40`, `0 0 20px ${league.color}70`, `0 0 8px ${league.color}40`] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`${cls.badge} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{ background: league.gradient }}
      >
        <span>{league.icon}</span>
      </motion.div>
    ) : badge;
  }

  return (
    <div className="flex items-center gap-1.5">
      {badge}
      <span className={cls.label} style={{ color: league.color }}>
        {league.leagueLabel}
      </span>
    </div>
  );
}
