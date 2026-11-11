"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const INK = "#2A2A2A";
const SKIN = "#F2BE9B";
const SKIN_SHADE = "#DFA27E";

/**
 * Ilustrasi tangan memegang HP yang men-scan jajanan.
 * step 0 = memindai, 1 = jadi stiker + harga, 2 = masuk kalender.
 */
export function ScanIllustration({ step = 0, className = "" }: { step?: number; className?: string }) {
  const reduce = useReducedMotion();
  const float = (d: number, delay = 0) =>
    reduce ? undefined : { duration: d, repeat: Infinity, ease: "easeInOut" as const, delay };

  return (
    <svg viewBox="0 0 320 320" className={className} role="img" aria-label="Tangan memegang HP yang sedang memindai jajanan">
      {/* latar blob */}
      <motion.path
        d="M160 28c62 0 128 34 128 116s-48 148-132 148S28 236 28 156 98 28 160 28Z"
        fill="var(--c-soft)"
        animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
        style={{ transformOrigin: "160px 160px" }}
        transition={float(6)}
      />

      {/* jajanan di sekitar */}
      <motion.g animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, -6, 0] }} transition={float(3.4)} style={{ transformOrigin: "52px 92px" }}>
        <Donut x={52} y={92} />
      </motion.g>
      <motion.g animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, 5, 0] }} transition={float(4, 0.4)} style={{ transformOrigin: "268px 78px" }}>
        <Boba x={268} y={78} />
      </motion.g>
      <motion.g animate={reduce ? undefined : { y: [0, -7, 0] }} transition={float(3.8, 0.8)}>
        <Onigiri x={270} y={208} />
      </motion.g>
      <motion.g animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, 10, 0] }} transition={float(4.4, 1.2)} style={{ transformOrigin: "48px 214px" }}>
        <Cookie x={48} y={214} />
      </motion.g>

      {/* lengan + tangan belakang (jari menggenggam sisi kanan) */}
      <path d="M40 330 L96 236 L140 262 L104 330Z" fill="var(--c-accent)" />
      <path d="M40 330 L96 236 L106 242 L52 330Z" fill="#000" opacity="0.08" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={204} y={150 + i * 24} width={30} height={18} rx={9} fill={SKIN} stroke={SKIN_SHADE} strokeWidth={1.5} />
      ))}

      {/* HP */}
      <g transform="rotate(-8 160 150)">
        <rect x={104} y={40} width={112} height={212} rx={22} fill={INK} />
        <rect x={111} y={50} width={98} height={192} rx={16} fill="#FFFFFF" />
        <rect x={146} y={55} width={28} height={7} rx={3.5} fill={INK} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.g key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* jajanan di dalam viewfinder */}
              <g transform="translate(160 140)">
                <Snack />
              </g>
              {/* sudut viewfinder */}
              <g stroke="var(--c-primary)" strokeWidth={4} strokeLinecap="round" fill="none">
                <path d="M122 92 v-12 h12" />
                <path d="M198 92 v-12 h-12" />
                <path d="M122 196 v12 h12" />
                <path d="M198 196 v12 h-12" />
              </g>
              {/* garis scan */}
              <motion.rect
                x={120}
                width={80}
                height={3}
                rx={1.5}
                fill="var(--c-accent)"
                initial={{ y: 84 }}
                animate={reduce ? { y: 140 } : { y: [84, 200, 84] }}
                transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 0 6px var(--c-accent))" }}
              />
              <rect x={136} y={216} width={48} height={14} rx={7} fill="var(--c-soft)" />
              <text x={160} y={226} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
                Memindai…
              </text>
            </motion.g>
          )}

          {step === 1 && (
            <motion.g key="sticker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <rect x={111} y={50} width={98} height={192} rx={16} fill="var(--c-soft)" opacity={0.5} />
              <motion.g
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 12 }}
                style={{ transformOrigin: "160px 120px" }}
              >
                <g transform="translate(160 120)" style={{ filter: "drop-shadow(0 0 0 white) drop-shadow(2px 0 0 white) drop-shadow(-2px 0 0 white) drop-shadow(0 2px 0 white) drop-shadow(0 -2px 0 white) drop-shadow(0 4px 4px rgb(0 0 0 / .2))" }}>
                  <Snack />
                </g>
              </motion.g>
              <motion.g initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                <rect x={122} y={182} width={76} height={20} rx={10} fill={INK} />
                <text x={160} y={196} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
                  Rp 13.900
                </text>
                <rect x={130} y={208} width={60} height={12} rx={6} fill="var(--c-primary)" />
                <text x={160} y={217} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK}>
                  Snack · 38 g
                </text>
              </motion.g>
            </motion.g>
          )}

          {step === 2 && (
            <motion.g key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <text x={122} y={84} fontSize={11} fontWeight={800} fill={INK}>
                November
              </text>
              {Array.from({ length: 20 }).map((_, i) => {
                const cx = 126 + (i % 5) * 17;
                const cy = 104 + Math.floor(i / 5) * 22;
                const has = [2, 6, 9, 13, 17].includes(i);
                return (
                  <g key={i}>
                    <rect x={cx - 7} y={cy - 8} width={14} height={18} rx={4} fill={has ? "var(--c-soft)" : "#F4F4F4"} />
                    {has && (
                      <motion.circle
                        cx={cx}
                        cy={cy + 2}
                        r={4.5}
                        fill={i % 2 ? "var(--c-accent)" : "var(--c-primary)"}
                        stroke="#fff"
                        strokeWidth={1.5}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.1 + i * 0.03 }}
                      />
                    )}
                  </g>
                );
              })}
              <rect x={120} y={200} width={80} height={26} rx={10} fill={INK} />
              <text x={128} y={211} fontSize={6} fill="#fff" opacity={0.7}>
                Total bulan ini
              </text>
              <text x={128} y={221} fontSize={9} fontWeight={800} fill="#fff">
                Rp 95.900
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* ibu jari & telapak di depan HP */}
      <path d="M92 250 C 84 214, 100 196, 122 204 C 140 210, 150 236, 140 262 L 104 276 Z" fill={SKIN} stroke={SKIN_SHADE} strokeWidth={1.5} />
      <path d="M110 214 C 118 196, 138 186, 146 194 C 152 200, 144 210, 132 218 Z" fill={SKIN} stroke={SKIN_SHADE} strokeWidth={1.5} />

      {/* kilau sukses saat stiker jadi */}
      {step === 1 && !reduce && (
        <g>
          {[
            [222, 92],
            [96, 108],
            [230, 132],
          ].map(([x, y], i) => (
            <motion.path
              key={i}
              d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z`}
              fill="var(--c-primary)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.6 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Kotak camilan stik (generik). Digambar di sekitar titik 0,0. */
function Snack() {
  return (
    <g>
      <rect x={-24} y={-34} width={48} height={68} rx={6} fill="#E85D4F" />
      <rect x={-24} y={-34} width={48} height={14} rx={6} fill="#C9443A" />
      <text x={0} y={-23} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff">
        STIKO
      </text>
      {[-10, -2, 6].map((x, i) => (
        <rect key={i} x={x} y={-14} width={4} height={36} rx={2} transform={`rotate(${12 - i * 4} ${x} 0)`} fill="#F3D7A6" />
      ))}
      <circle cx={-12} cy={18} r={7} fill="#F6C343" />
      <circle cx={12} cy={-4} r={5} fill="#F9E27D" />
    </g>
  );
}

function Donut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={22} fill="#E6B07A" />
      <path d="M-20 -4 C -18 -20, 18 -22, 21 -2 C 18 6, 12 2, 8 8 C 2 4, -4 10, -10 4 C -14 8, -20 6, -20 -4Z" fill="var(--c-accent)" />
      <circle r={7} fill="var(--c-bg)" />
      {[
        [-12, -8, 20],
        [8, -12, -30],
        [12, 0, 60],
        [-4, -15, 0],
      ].map(([sx, sy, r], i) => (
        <rect key={i} x={sx} y={sy} width={5} height={2} rx={1} fill={i % 2 ? "#fff" : INK} transform={`rotate(${r} ${sx} ${sy})`} />
      ))}
    </g>
  );
}

function Boba({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-2} y={-36} width={5} height={22} rx={2} fill={INK} transform="rotate(12 0 -20)" />
      <path d="M-18 -16 H18 L13 26 Q0 30 -13 26 Z" fill="#E9D3B6" />
      <rect x={-20} y={-20} width={40} height={6} rx={3} fill="#fff" stroke={INK} strokeWidth={1.5} />
      {[
        [-7, 18],
        [0, 21],
        [7, 18],
        [-3, 13],
        [5, 12],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3} fill="#3B2A22" />
      ))}
    </g>
  );
}

function Onigiri({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -24 C 8 -24, 26 8, 22 16 C 18 22, -18 22, -22 16 C -26 8, -8 -24, 0 -24Z" fill="#fff" stroke="#E5E5E5" strokeWidth={1.5} />
      <rect x={-10} y={4} width={20} height={16} rx={2} fill={INK} />
      <circle cx={-4} cy={-6} r={1.6} fill={INK} />
      <circle cx={4} cy={-6} r={1.6} fill={INK} />
      <ellipse cx={-9} cy={-1} rx={3} ry={1.8} fill="var(--c-accent)" opacity={0.7} />
      <ellipse cx={9} cy={-1} rx={3} ry={1.8} fill="var(--c-accent)" opacity={0.7} />
    </g>
  );
}

function Cookie({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={18} fill="#D9A066" />
      {[
        [-7, -6],
        [5, -9],
        [8, 5],
        [-4, 7],
        [0, -1],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} fill="#4A2E1F" />
      ))}
    </g>
  );
}
