/* ============================================================
   Calum Pryce — portfolio interactions
   ============================================================ */
"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- hero headline mask reveal on load ---------- */
window.addEventListener("load", () => document.body.classList.add("loaded"));

/* ---------- scroll progress + nav background ---------- */
const progress = document.getElementById("progress");
const nav = document.getElementById("nav");

window.addEventListener("scroll", () => {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  progress.style.width = (scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0) + "%";
  nav.classList.toggle("scrolled", doc.scrollTop > 10);
}, { passive: true });

/* ---------- mobile menu ---------- */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");

burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
});
navLinks.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  })
);

/* ---------- scroll-spy: highlight current section in the nav ---------- */
const linkMap = {};
navLinks.querySelectorAll("a[href^='#']").forEach(a => {
  linkMap[a.getAttribute("href").slice(1)] = a;
});

const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    Object.values(linkMap).forEach(a => a.classList.remove("active"));
    const link = linkMap[e.target.id];
    if (link) link.classList.add("active");
  });
}, { rootMargin: "-40% 0px -55% 0px" });

document.querySelectorAll("section[id]").forEach(s => spy.observe(s));

/* ---------- reveal-on-scroll ---------- */
const revealer = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => revealer.observe(el));

/* ---------- count-up stats ---------- */
function countUp(el) {
  const target = +el.dataset.count;
  const prefix = el.dataset.prefix || "";
  const dur = 1400;
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = prefix + Math.round(target * eased).toLocaleString("en-GB");
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

const statObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      countUp(e.target);
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.6 });

document.querySelectorAll(".stat-n").forEach(el => {
  if (reducedMotion) {
    el.textContent = (el.dataset.prefix || "") + (+el.dataset.count).toLocaleString("en-GB");
  } else {
    statObs.observe(el);
  }
});

/* ---------- skill dot scales (n of 5 lit, staggered) ---------- */
document.querySelectorAll(".dots").forEach(d => {
  const level = +d.dataset.level;
  for (let i = 0; i < 5; i++) {
    const b = document.createElement("b");
    if (i < level) b.dataset.on = "";
    d.appendChild(b);
  }
});

const dotObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll("b[data-on]").forEach((b, i) =>
      setTimeout(() => b.classList.add("on"), i * 90)
    );
    obs.unobserve(e.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll(".dots").forEach(d => dotObs.observe(d));

/* ---------- 3D tilt on project cards (desktop, fine pointer only) ---------- */
if (!reducedMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".tilt").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  /* ---------- magnetic buttons: drift gently toward the cursor ---------- */
  document.querySelectorAll(".magnetic").forEach(el => {
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
}

/* ============================================================
   Molecule network canvas — drifting nodes joined by faint
   bonds when close; gently repelled by the cursor.
   ============================================================ */
(function molecules() {
  const canvas = document.getElementById("molecules");
  if (!canvas || reducedMotion) return;

  const ctx = canvas.getContext("2d");
  let w, h, nodes, raf;
  const mouse = { x: -9999, y: -9999 };
  const LINK_DIST = 130;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn();
  }

  function spawn() {
    const count = Math.min(90, Math.floor((w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.4 + Math.random() * 2.2,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      // gentle cursor repulsion
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 120 * 120 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        n.vx += (dx / d) * 0.04;
        n.vy += (dy / d) * 0.04;
      }
      // damping keeps speeds calm after repulsion
      n.vx *= 0.992;
      n.vy *= 0.992;

      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }

    // bonds
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(29, 138, 95, ${0.14 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // atoms
    for (const n of nodes) {
      ctx.fillStyle = "rgba(29, 138, 95, 0.35)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(step);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }, { passive: true });
  window.addEventListener("mouseout", () => { mouse.x = -9999; mouse.y = -9999; });

  // pause when the hero is off-screen to save battery
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (!raf) raf = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(canvas);

  resize();
})();
