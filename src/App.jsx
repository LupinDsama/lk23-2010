import React, { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const petals = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 37 + 9) % 100}%`,
  delay: `${(i % 7) * -1.8}s`,
  duration: `${12 + (i % 8) * 2}s`,
  size: 8 + (i % 5) * 3,
  rotate: `${(i * 41) % 180}deg`,
}));

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    music: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/></>,
    replay: <><path d="M3 11a9 9 0 0 1 15.4-6.4L21 7"/><path d="M21 2v5h-5"/><path d="M21 13a9 9 0 0 1-15.4 6.4L3 17"/><path d="M3 22v-5h5"/></>,
    skip: <><path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></>,
  };
  return <svg {...common}>{paths[name] || paths.heart}</svg>;
}

function useSoftMusic() {
  const audioRef = useRef(null);
  const nodesRef = useRef([]);
  const [enabled, setEnabled] = useState(false);

  const stop = useCallback(() => {
    nodesRef.current.forEach((node) => {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    });
    nodesRef.current = [];
    if (audioRef.current) {
      try { audioRef.current.close(); } catch {}
      audioRef.current = null;
    }
    setEnabled(false);
  }, []);

  const start = useCallback(() => {
    if (audioRef.current) { stop(); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.035;
      master.connect(ctx.destination);
      const notes = [261.63, 329.63, 392, 493.88, 392, 329.63];
      notes.forEach((frequency, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(master);
        const t = ctx.currentTime + i * 0.72;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.18);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.65);
        nodesRef.current.push(osc, gain);
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch {}
          nodesRef.current = nodesRef.current.filter((node) => node !== osc && node !== gain);
        };
        osc.start(t);
        osc.stop(t + 0.7);
      });
      // A soft, repeating arpeggio is scheduled only after a user gesture.
      const loop = () => {
        if (!audioRef.current) return;
        const current = audioRef.current;
        const base = current.currentTime + 0.15;
        [261.63, 329.63, 392, 493.88].forEach((f, i) => {
          const o = current.createOscillator();
          const g = current.createGain();
          o.type = "sine";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, base + i * 0.65);
          g.gain.linearRampToValueAtTime(0.16, base + i * 0.65 + 0.12);
          g.gain.exponentialRampToValueAtTime(0.0001, base + i * 0.65 + 0.6);
          o.connect(g); g.connect(master);
          nodesRef.current.push(o, g);
          o.onended = () => {
            try { o.disconnect(); g.disconnect(); } catch {}
            nodesRef.current = nodesRef.current.filter((node) => node !== o && node !== g);
          };
          o.start(base + i * 0.65); o.stop(base + i * 0.65 + 0.65);
        });
        audioRef.current.loopTimer = window.setTimeout(loop, 3000);
      };
      // Keep it intentionally subtle; the browser owns audio timing.
      audioRef.current.loopTimer = window.setTimeout(loop, 4_000);
      setEnabled(true);
    } catch {
      setEnabled(false);
    }
  }, [stop]);

  useEffect(() => () => {
    if (audioRef.current?.loopTimer) window.clearTimeout(audioRef.current.loopTimer);
    nodesRef.current.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    if (audioRef.current) { try { audioRef.current.close(); } catch {} }
  }, []);

  return { enabled, toggle: start, stop };
}

export default function App() {
  const rootRef = useRef(null);
  const timelineRef = useRef(null);
  const [scene, setScene] = useState("intro");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const { enabled: musicOn, toggle: toggleMusic, stop: stopMusic } = useSoftMusic();
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const ctx = gsap.context(() => {
      gsap.set(".scene", { autoAlpha: 0, display: "none" });
      gsap.set(".intro-scene", { autoAlpha: 1, display: "grid" });
      // Keep the opening content visible on first load; it is animated only after the user starts.
      gsap.set(".ambient-orb", { scale: 1, autoAlpha: 1 });
      gsap.set(".letter-card", { y: 32, rotate: -2, autoAlpha: 0 });
      gsap.set(".final-title, .final-copy, .signature, .final-flower", { y: 22, autoAlpha: 0 });
    }, rootRef);
    return () => {
      timelineRef.current?.kill();
      ctx.revert();
    };
  }, []);

  const finish = useCallback(() => {
    timelineRef.current?.kill();
    gsap.killTweensOf(".scene");
    gsap.set(".scene", { autoAlpha: 0, display: "none" });
    gsap.set(".final-scene", { display: "grid", autoAlpha: 1 });
    gsap.set([".final-title", ".final-copy", ".signature", ".final-flower"], { y: 0, autoAlpha: 1 });
    setScene("final");
    setIsPlaying(false);
    setShowControls(true);
  }, []);

  const playExperience = useCallback(() => {
    timelineRef.current?.kill();
    setScene("intro");
    setIsPlaying(true);
    setShowControls(true);
    const tl = gsap.timeline({ onComplete: () => setIsPlaying(false) });
    timelineRef.current = tl;
    const quick = reducedMotion.current;
    const duration = quick ? 0.18 : 0.75;
    tl.set(".scene", { autoAlpha: 0, display: "none" })
      .set(".intro-scene", { display: "grid", autoAlpha: 1 })
      .fromTo([".intro-kicker", ".intro-title", ".intro-copy", ".start-button"], { y: quick ? 0 : 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration, stagger: quick ? 0 : 0.16, ease: "power3.out" })
      .to(".ambient-orb", { scale: 1, autoAlpha: 1, duration: quick ? 0.1 : 1.2, ease: "power2.out" }, "-=0.45")
      .to(".intro-scene", { autoAlpha: 0, duration: quick ? 0.1 : 0.6, delay: quick ? 0 : 0.4 })
      .set(".intro-scene", { display: "none" })
      .set(".bloom-scene", { display: "grid", autoAlpha: 1 })
      .fromTo(".bloom-title", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration, ease: "power3.out" })
      .fromTo(".bloom-rose", { scale: 0.72, rotate: -12, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: quick ? 0.2 : 1.3, ease: "back.out(1.5)" }, "-=0.25")
      .fromTo(".bloom-caption", { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration }, "-=0.4")
      .to(".bloom-scene", { autoAlpha: 0, duration: quick ? 0.1 : 0.65, delay: quick ? 0 : 0.55 })
      .set(".bloom-scene", { display: "none" })
      .set(".letter-scene", { display: "grid", autoAlpha: 1 })
      .fromTo(".letter-card", { y: 36, rotate: -3, autoAlpha: 0 }, { y: 0, rotate: 0, autoAlpha: 1, duration: quick ? 0.2 : 0.9, ease: "power3.out" })
      .fromTo(".letter-stamp", { scale: 0, rotate: -25 }, { scale: 1, rotate: 0, duration: quick ? 0.15 : 0.55, ease: "back.out(2)" }, "-=0.35")
      .fromTo(".letter-line", { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration, stagger: quick ? 0 : 0.35, ease: "power2.out" }, "-=0.2")
      .to(".letter-scene", { autoAlpha: 0, duration: quick ? 0.1 : 0.65, delay: quick ? 0 : 0.7 })
      .set(".letter-scene", { display: "none" })
      .set(".final-scene", { display: "grid", autoAlpha: 1 })
      .fromTo(".final-flower", { y: 20, scale: 0.9, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: quick ? 0.2 : 0.85, ease: "back.out(1.5)" })
      .fromTo(".final-title", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: quick ? 0.2 : 0.85, ease: "power3.out" }, "-=0.35")
      .fromTo(".final-copy", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration, ease: "power2.out" }, "-=0.25")
      .fromTo(".signature", { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration }, "-=0.15")
      .to(".final-sparkle", { scale: 1.15, rotate: 12, repeat: quick ? 0 : 3, yoyo: true, duration: quick ? 0.1 : 0.65, ease: "sine.inOut" }, "-=0.4")
      .call(() => { setScene("final"); setIsPlaying(false); });
  }, []);

  const skip = () => finish();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isPlaying) skip();
      if (e.key.toLowerCase() === "r" && !isPlaying) playExperience();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, playExperience]);

  const currentLabel = scene === "final" ? "Lời chúc dành cho cậu" : "Một điều dễ thương đang đến";

  return (
    <main className="app-shell" ref={rootRef}>
      <div className="paper-grain" aria-hidden="true" />
      <div className="ambient-orb orb-one" aria-hidden="true" />
      <div className="ambient-orb orb-two" aria-hidden="true" />
      <div className="petal-layer" aria-hidden="true">
        {petals.map((p) => <span key={p.id} className="petal" style={{ "--left": p.left, "--delay": p.delay, "--duration": p.duration, "--size": `${p.size}px`, "--rotate": p.rotate }} />)}
      </div>

      <header className="topbar">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); playExperience(); }} aria-label="Phát lại trải nghiệm">
          <span className="brand-mark"><Icon name="heart" size={16} /></span>
          <span>một chút dịu dàng</span>
        </a>
        <div className="topbar-right">
          <span className="day-pill"><span className="tiny-dot" /> 20 tháng 10</span>
          <button className="icon-button" onClick={toggleMusic} aria-label={musicOn ? "Tắt âm thanh" : "Bật âm thanh"} title={musicOn ? "Tắt âm thanh" : "Bật âm thanh"}>
            <Icon name={musicOn ? "music" : "mute"} size={17} />
            <span className="sound-label">{musicOn ? "Âm thanh bật" : "Âm thanh tắt"}</span>
          </button>
        </div>
      </header>

      <div className="scene-stage" aria-live="polite">
        <section className="scene intro-scene" aria-label="Mở đầu">
          <div className="scene-index">A LITTLE SURPRISE <span>✳</span> 01 / 04</div>
          <div className="intro-content">
            <div className="eyebrow intro-kicker"><span className="eyebrow-line" /> DÀNH CHO MỘT NGƯỜI ĐẶC BIỆT <span className="eyebrow-line" /></div>
            <h1 className="intro-title">Có một điều<br /><em>muốn gửi cậu.</em></h1>
            <p className="intro-copy">Một chút hoa, một chút nắng,<br />và một lời chúc được gói ghém thật xinh.</p>
            <button className="primary-button start-button" onClick={playExperience}>
              <span>Mở món quà nhỏ</span><span className="button-heart"><Icon name="heart" size={16} /></span>
            </button>
            <div className="intro-note"><Icon name="sparkles" size={15} /> Hãy bật âm thanh nếu cậu muốn nghe một giai điệu nho nhỏ.</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-disc" />
            <div className="orbit orbit-a" /><div className="orbit orbit-b" />
            <div className="floating-heart heart-a">♡</div><div className="floating-heart heart-b">♥</div>
            <div className="flower flower-large"><i /><i /><i /><i /><i /><i /><b /></div>
            <div className="flower flower-small"><i /><i /><i /><i /><i /><b /></div>
            <div className="art-caption caption-left">for you, softly</div>
            <div className="art-caption caption-right">♡ 20.10</div>
          </div>
          <div className="scroll-cue"><span /> một điều dễ thương sắp bắt đầu</div>
        </section>

        <section className="scene bloom-scene" aria-label="Hoa nở">
          <div className="scene-index">A LITTLE SURPRISE <span>✳</span> 02 / 04</div>
          <div className="bloom-content">
            <p className="eyebrow">GỬI CẬU MỘT ĐIỀU NHỎ XÍU</p>
            <h2 className="bloom-title">Mong ngày của cậu<br /><em>luôn nở hoa.</em></h2>
            <div className="bloom-rose" aria-hidden="true">
              <div className="rose-halo" />
              <div className="rose-stem" />
              <div className="rose-leaf leaf-left" /><div className="rose-leaf leaf-right" />
              <div className="rose-petal rp1" /><div className="rose-petal rp2" /><div className="rose-petal rp3" /><div className="rose-petal rp4" /><div className="rose-petal rp5" /><div className="rose-petal rp6" /><div className="rose-petal rp7" />
              <div className="rose-center" />
            </div>
            <p className="bloom-caption">Dù hôm nay có bận rộn đến đâu,<br />mong cậu vẫn tìm thấy một điều khiến mình mỉm cười.</p>
          </div>
          <span className="corner-doodle doodle-one">✳</span><span className="corner-doodle doodle-two">♡</span>
        </section>

        <section className="scene letter-scene" aria-label="Lá thư">
          <div className="scene-index">A LITTLE SURPRISE <span>✳</span> 03 / 04</div>
          <div className="letter-wrap">
            <div className="letter-card">
              <div className="letter-topline"><span>GỬI NGƯỜI DỄ THƯƠNG</span><span>20 — 10</span></div>
              <div className="letter-stamp"><Icon name="heart" size={25} /></div>
              <div className="letter-decoration">✳</div>
              <p className="letter-salutation letter-line">Cậu à,</p>
              <p className="letter-line">Chúc cậu luôn có thật nhiều niềm vui,</p>
              <p className="letter-line">đủ tự tin để làm điều mình thích,</p>
              <p className="letter-line">đủ bình yên để thương lấy bản thân,</p>
              <p className="letter-line">và đủ may mắn để gặp những điều dịu dàng.</p>
              <p className="letter-line letter-emphasis">Mong những ngày bình thường của cậu<br />cũng lấp lánh theo cách riêng. ♡</p>
              <div className="letter-footer letter-line"><span>một lời chúc nho nhỏ</span><span className="letter-flower">❀</span></div>
            </div>
            <p className="letter-outside">Không cần một ngày thật hoàn hảo —<br />chỉ mong cậu luôn thấy mình xứng đáng được yêu thương.</p>
          </div>
        </section>

        <section className="scene final-scene" aria-label="Lời chúc cuối cùng">
          <div className="final-decoration final-flower" aria-hidden="true">
            <div className="final-flower-head">✿</div><div className="final-flower-stem" /><div className="final-flower-leaf" />
          </div>
          <div className="final-card">
            <p className="eyebrow final-eyebrow"><span className="eyebrow-line" /> MỘT LỜI CHÚC DÀNH CHO CẬU <span className="eyebrow-line" /></p>
            <div className="final-sparkle" aria-hidden="true">✧</div>
            <h2 className="final-title">Chúc mừng<br /><em>20 tháng 10</em></h2>
            <div className="final-divider"><span>♡</span></div>
            <p className="final-copy">Chúc cậu luôn xinh tươi theo cách của riêng mình,<br className="desktop-break" /> luôn được trân trọng, được lắng nghe và được yêu thương.<br />Mong mọi điều tốt lành sẽ nhẹ nhàng tìm đến cậu —<br className="desktop-break" /> hôm nay, ngày mai và cả những ngày sau nữa.</p>
            <p className="signature">Gửi cậu, bằng tất cả sự chân thành <span>♡</span></p>
            <div className="final-bottom-note">YOU DESERVE ALL THE LOVELY THINGS IN THE WORLD</div>
          </div>
          <div className="final-petal final-petal-a" aria-hidden="true">✿</div><div className="final-petal final-petal-b" aria-hidden="true">✧</div>
          <button className="replay-button" onClick={playExperience}><Icon name="replay" size={15} /> Xem lại từ đầu</button>
        </section>
      </div>

      <footer className="bottom-bar">
        <span>MADE WITH <span className="footer-heart">♥</span> AND A LITTLE COURAGE</span>
        <span className="footer-status"><span className="status-dot" /> {currentLabel}</span>
      </footer>

      {showControls && isPlaying && (
        <div className="playback-controls">
          <span className="playing-label"><span className="pulse-dot" /> ĐANG CHẠY HIỆU ỨNG</span>
          <button className="skip-button" onClick={skip}>Bỏ qua <Icon name="skip" size={14} /></button>
        </div>
      )}
      {showControls && !isPlaying && scene === "intro" && (
        <button className="replay-floating" onClick={playExperience}><Icon name="replay" size={15} /> Phát lại</button>
      )}
    </main>
  );
}