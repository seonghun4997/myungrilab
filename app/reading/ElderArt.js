// 월하노인 — 홍서당의 얼굴 (벡터 일러스트)
// 달 광배 아래 붉은 실을 쥔 노인. size로 크기 조절.
export default function ElderArt({ size = 180 }) {
  return (
    <svg viewBox="0 0 400 440" width={size} height={size * 1.1} aria-label="월하노인" role="img" style={{ display: "block", margin: "0 auto" }}>

  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffd479" stopOpacity=".9"/>
      <stop offset="55%" stopColor="#ffd479" stopOpacity=".85"/>
      <stop offset="70%" stopColor="#ffd479" stopOpacity=".25"/>
      <stop offset="100%" stopColor="#ffd479" stopOpacity="0"/>
    </radialGradient>
    <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4a3a99"/>
      <stop offset="100%" stopColor="#2a2064"/>
    </linearGradient>
    <linearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#554397"/>
      <stop offset="100%" stopColor="#332772"/>
    </linearGradient>
  </defs>

  {/* 달 후광 */}
  <circle cx="200" cy="150" r="150" fill="url(#halo)"/>
  <circle cx="200" cy="150" r="105" fill="#ffd479"/>
  {/* 별 */}
  <circle cx="52" cy="60" r="2.4" fill="#cfc4ff"/>
  <circle cx="352" cy="86" r="2" fill="#cfc4ff" opacity=".85"/>
  <circle cx="330" cy="30" r="1.6" fill="#cfc4ff" opacity=".7"/>
  <circle cx="70" cy="140" r="1.7" fill="#cfc4ff" opacity=".7"/>
  <circle cx="345" cy="180" r="1.8" fill="#cfc4ff" opacity=".6"/>

  {/* 도포 (몸) */}
  <path d="M96 440 C98 340 118 292 150 272 L250 272 C282 292 302 340 304 440 Z" fill="url(#robe)"/>
  {/* 깃 (금 테두리 V) */}
  <path d="M158 272 L200 336 L242 272 L226 272 L200 312 L174 272 Z" fill="#ffd479"/>
  <path d="M166 272 L200 322 L234 272 L224 272 L200 306 L176 272 Z" fill="#2a2064"/>
  {/* 소매 (팔짱 낀 넓은 소매) */}
  <path d="M150 272 C110 286 96 318 100 352 C104 380 132 392 168 384 L200 356 L172 300 Z" fill="url(#sleeve)"/>
  <path d="M250 272 C290 286 304 318 300 352 C296 380 268 392 232 384 L200 356 L228 300 Z" fill="url(#sleeve)"/>
  {/* 소매 끝동 */}
  <path d="M160 384 C176 380 192 368 200 356 L206 368 C196 382 178 392 164 394 Z" fill="#efe9ff"/>
  <path d="M240 384 C224 380 208 368 200 356 L194 368 C204 382 222 392 236 394 Z" fill="#efe9ff"/>
  {/* 맞잡은 손 */}
  <ellipse cx="200" cy="362" rx="24" ry="15" fill="#f3d9b5"/>
  <path d="M182 358 q8 -8 18 -4 q10 -4 18 4" fill="none" stroke="#d9b184" strokeWidth="2.5" strokeLinecap="round"/>

  {/* 붉은 실 (손에서 흘러내림) */}
  <path d="M212 372 C258 392 300 380 316 402 C328 418 312 434 296 428 C282 423 286 408 300 410"
        fill="none" stroke="#ff5a7a" strokeWidth="4" strokeLinecap="round"/>
  <circle cx="300" cy="410" r="4.5" fill="#ff5a7a"/>

  {/* 상투 */}
  <ellipse cx="200" cy="132" rx="16" ry="14" fill="#f7f4ff"/>
  <rect x="184" y="140" width="32" height="8" rx="4" fill="#ffd479"/>
  {/* 얼굴 */}
  <path d="M148 196 C148 158 170 140 200 140 C230 140 252 158 252 196 C252 224 240 244 200 244 C160 244 148 224 148 196 Z" fill="#f3d9b5"/>
  {/* 귀 */}
  <ellipse cx="147" cy="200" rx="9" ry="13" fill="#f3d9b5"/>
  <ellipse cx="253" cy="200" rx="9" ry="13" fill="#f3d9b5"/>
  {/* 옆머리 */}
  <path d="M148 178 C140 200 140 226 152 244 C144 230 142 202 150 182 Z" fill="#f7f4ff"/>
  <path d="M252 178 C260 200 260 226 248 244 C256 230 258 202 250 182 Z" fill="#f7f4ff"/>
  {/* 긴 흰 눈썹 */}
  <path d="M156 192 C166 182 184 180 192 186 C184 190 168 192 156 196 Z" fill="#f7f4ff"/>
  <path d="M244 192 C234 182 216 180 208 186 C216 190 232 192 244 196 Z" fill="#f7f4ff"/>
  {/* 인자한 감은 눈 */}
  <path d="M164 204 q12 8 26 0" fill="none" stroke="#5b4632" strokeWidth="3.4" strokeLinecap="round"/>
  <path d="M210 204 q12 8 26 0" fill="none" stroke="#5b4632" strokeWidth="3.4" strokeLinecap="round"/>
  {/* 코 */}
  <path d="M200 208 q-4 12 2 18" fill="none" stroke="#d9b184" strokeWidth="2.6" strokeLinecap="round"/>
  {/* 볼 홍조 */}
  <ellipse cx="166" cy="220" rx="8" ry="4.5" fill="#e8a98c" opacity=".45"/>
  <ellipse cx="234" cy="220" rx="8" ry="4.5" fill="#e8a98c" opacity=".45"/>

  {/* 콧수염 */}
  <path d="M178 234 C188 228 212 228 222 234 C214 240 186 240 178 234 Z" fill="#f7f4ff"/>
  {/* 미소 */}
  <path d="M190 240 q10 7 20 0" fill="none" stroke="#b0765a" strokeWidth="2.6" strokeLinecap="round"/>
  {/* 긴 흰 수염 (겹) */}
  <path d="M160 236 C154 292 168 330 200 342 C232 330 246 292 240 236 C226 252 174 252 160 236 Z" fill="#f7f4ff"/>
  <path d="M176 246 C174 288 184 316 200 326 C216 316 226 288 224 246 C214 256 186 256 176 246 Z" fill="#e7e0fa"/>
  <path d="M192 252 C192 288 195 308 200 318 C205 308 208 288 208 252 Z" fill="#f7f4ff"/>

    </svg>
  );
}
