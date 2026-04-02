import { motion } from "framer-motion";

const shimmer = "animate-pulse bg-muted rounded-xl";
const SkeletonLine = ({ w = "100%", h = "h-3" }: { w?: string; h?: string }) => (
  <div className={`${shimmer} ${h} rounded-full`} style={{ width: w }} />
);

export const KPICardsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
        className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`${shimmer} w-10 h-10 rounded-xl`} />
          <SkeletonLine w="60px" h="h-5" />
        </div>
        <SkeletonLine w="70%" h="h-3" />
        <SkeletonLine w="50%" h="h-8" />
        <SkeletonLine w="80%" h="h-2" />
        <SkeletonLine w="40%" h="h-3" />
      </motion.div>
    ))}
  </div>
);

export const LabourHealthSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border p-6 space-y-4">
    <div className="flex items-center justify-center gap-2">
      <div className={`${shimmer} w-4 h-4 rounded-full`} />
      <SkeletonLine w="200px" h="h-4" />
    </div>
    <div className="flex justify-center">
      <div className={`${shimmer} w-56 h-28 rounded-t-full`} />
    </div>
    <div className="flex justify-center"><SkeletonLine w="120px" h="h-5" /></div>
    <div className="flex justify-center"><SkeletonLine w="180px" h="h-3" /></div>
    <div className="grid grid-cols-3 gap-2 mt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/40 border border-border p-2.5 space-y-2">
          <div className={`${shimmer} w-4 h-4 rounded-full mx-auto`} />
          <SkeletonLine h="h-2" />
          <SkeletonLine w="60%" h="h-4" />
          <SkeletonLine h="h-1" />
        </div>
      ))}
    </div>
  </motion.div>
);

export const DataInsightSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
        className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`${shimmer} w-8 h-8 rounded-lg`} />
          <SkeletonLine w="100px" h="h-3" />
        </div>
        <SkeletonLine h="h-3" />
        <SkeletonLine w="80%" h="h-3" />
        <SkeletonLine w="60%" h="h-3" />
      </motion.div>
    ))}
  </div>
);

export const TrendChartsSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonLine w="200px" h="h-5" />
        <SkeletonLine w="140px" h="h-3" />
      </div>
      <div className={`${shimmer} w-28 h-9 rounded-xl`} />
    </div>
    <div className="flex border-b border-border px-5 gap-6 py-3">
      {[...Array(5)].map((_, i) => <SkeletonLine key={i} w="80px" h="h-4" />)}
    </div>
    <div className="p-5">
      <div className="h-[320px] rounded-xl bg-muted/30 border border-border relative overflow-hidden">
        <svg className="w-full h-full opacity-10" viewBox="0 0 400 300" preserveAspectRatio="none">
          <polyline points="0,200 60,160 120,180 180,100 240,140 300,80 360,120 400,90"
            fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
      </div>
    </div>
  </motion.div>
);

export const ForecastSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonLine w="220px" h="h-5" />
        <div className={`${shimmer} w-36 h-7 rounded-full`} />
      </div>
      <SkeletonLine w="70%" h="h-3" />
      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
        <SkeletonLine h="h-3" />
        <SkeletonLine w="80%" h="h-3" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <SkeletonLine w="100px" h="h-3" />
              <SkeletonLine w="70px" h="h-6" />
            </div>
            <SkeletonLine w="70px" h="h-5" />
          </div>
          <div className="h-[180px] rounded-xl bg-muted/30 border border-border relative overflow-hidden">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

export const SectorChartSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border space-y-2">
      <SkeletonLine w="220px" h="h-5" />
      <SkeletonLine w="280px" h="h-3" />
    </div>
    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {[["75%"], ["45%"], ["20%"]].map(([w], i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonLine w="80px" h="h-3" />
            <div className="flex-1 h-7 bg-muted/30 rounded-lg overflow-hidden">
              <div className="h-full bg-muted rounded-lg animate-pulse" style={{ width: w }} />
            </div>
          </div>
        ))}
      </div>
      <div className="h-[200px] rounded-xl bg-muted/30 border border-border relative overflow-hidden">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
      </div>
    </div>
  </motion.div>
);

export const UnderemploymentSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border space-y-2">
      <SkeletonLine w="280px" h="h-5" />
      <SkeletonLine w="320px" h="h-3" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-border">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/40 p-3 space-y-1.5">
          <SkeletonLine w="70%" h="h-2" />
          <SkeletonLine w="50%" h="h-5" />
        </div>
      ))}
    </div>
    <div className="flex border-b border-border px-5 gap-6 py-3">
      {["By Gender", "By Age", "Over Time"].map(t => <SkeletonLine key={t} w="70px" h="h-4" />)}
    </div>
    <div className="p-5">
      <div className="h-[280px] rounded-xl bg-muted/30 border border-border relative overflow-hidden">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
      </div>
    </div>
  </motion.div>
);

export const StateMapSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border flex items-start justify-between">
      <div className="space-y-2">
        <SkeletonLine w="220px" h="h-5" />
        <SkeletonLine w="160px" h="h-3" />
      </div>
      <div className={`${shimmer} w-48 h-9 rounded-full`} />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
          <div className={`${shimmer} w-9 h-9 rounded-lg`} />
          <div className="space-y-1.5 flex-1">
            <SkeletonLine w="60%" h="h-2" />
            <SkeletonLine w="40%" h="h-5" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-5 pb-5">
      <div className="lg:col-span-2 rounded-2xl bg-muted/20 border border-border p-5">
        <div className="h-[280px] rounded-xl bg-muted/30 relative overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 400 220" className="w-3/4 h-auto opacity-10">
            <polygon points="80,20 120,10 160,30 180,80 200,120 190,160 160,180 130,170 100,150 80,120 60,80 70,50"
              fill="hsl(var(--primary))" />
            <polygon points="240,60 290,40 340,50 370,80 360,120 320,140 280,130 250,110 235,85"
              fill="hsl(var(--primary))" />
          </svg>
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
        </div>
      </div>
      <div className="rounded-2xl bg-muted/20 border border-border p-5 space-y-3">
        <SkeletonLine w="120px" h="h-4" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between">
                <SkeletonLine w="100px" h="h-3" />
                <SkeletonLine w="30px" h="h-3" />
              </div>
              <SkeletonLine h="h-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

export const RegionalJobsSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-5">
    <div className="space-y-2">
      <SkeletonLine w="280px" h="h-5" />
      <SkeletonLine w="340px" h="h-3" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          {[...Array(3)].map((_, j) => (
            <div key={j} className="flex items-center justify-between">
              <SkeletonLine w="120px" h="h-3" />
              <SkeletonLine w="60px" h="h-3" />
            </div>
          ))}
        </div>
      ))}
    </div>
    <div className="h-[380px] rounded-xl bg-muted/30 border border-border relative overflow-hidden">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
          <SkeletonLine w="70%" h="h-3" />
          <SkeletonLine w="80%" h="h-3" />
          <SkeletonLine h="h-1.5" />
        </div>
      ))}
    </div>
  </motion.div>
);

export const WagesSkeleton = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
    <div className="p-5 border-b border-border space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonLine w="180px" h="h-5" />
          <SkeletonLine w="240px" h="h-3" />
        </div>
        <div className={`${shimmer} w-8 h-8 rounded-lg`} />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/40 p-3 space-y-1.5">
            <SkeletonLine w="60%" h="h-2" />
            <SkeletonLine w="70%" h="h-5" />
          </div>
        ))}
      </div>
    </div>
    <div className="p-5 space-y-3">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonLine w="130px" h="h-3" />
          <div className="flex-1 h-5 bg-muted/30 rounded-lg overflow-hidden">
            <div className="h-full bg-muted rounded-lg animate-pulse" style={{ width: `${80 - i * 8}%` }} />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);
