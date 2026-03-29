(function () {
  // ── Intro Animation ───────────────────────────────────────────────────────
  const introOverlay = document.getElementById("intro-overlay");
  const body = document.body;
  body.classList.add("is-loading");

  const exitIntro = () => {
    if (introOverlay) {
      introOverlay.classList.add("is-exiting");
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      setTimeout(() => {
        if (introOverlay.parentNode) introOverlay.parentNode.removeChild(introOverlay);
      }, 1500);
    }
  };
  window.addEventListener("load", () => setTimeout(exitIntro, 1200));

  // ── Hero background video ─────────────────────────────────────────────────
  const heroVid = document.querySelector(".hero__video-media");
  if (heroVid) {
    heroVid.setAttribute("muted", "");
    const play = () => { const p = heroVid.play(); if (p && typeof p.catch === "function") p.catch(() => {}); };
    play();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) play(); });
    const hero = document.querySelector(".hero");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting ? play() : heroVid.pause()),
        { threshold: 0.05 }
      ).observe(hero);
    }
  }

  // ── Header past-hero state ────────────────────────────────────────────────
  const header = document.getElementById("site-header");
  const hero   = document.querySelector(".hero");
  if (header && hero) {
    const setPast = () => header.classList.toggle("is-past-hero", window.scrollY > hero.offsetHeight - 48);
    setPast();
    window.addEventListener("scroll", setPast, { passive: true });
  }

  // ── Members Edits 3D Carousel ─────────────────────────────────────────────
  const editCards = Array.from(document.querySelectorAll(".edit-card"));
  const grid      = document.querySelector(".edits-grid");
  let activeIndex = 0;
  editCards.forEach((card) => {
    card._fadeTimer = null;

    // Preload: load metadata + seek to first frame so it's never a black screen
    const vid = card.querySelector(".edit-card__video");
    if (vid) {
      vid.preload = "auto";
      vid.muted   = true;
      // When enough data is loaded, paint first frame then pause
      vid.addEventListener("loadeddata", () => {
        if (vid.paused) vid.currentTime = 0;
      }, { once: true });
      vid.load();
    }
  });

  // Per-card volume fade
  const fadeVolume = (card, targetVol) => {
    const vid = card.querySelector(".edit-card__video");
    if (!vid) return;
    clearInterval(card._fadeTimer);
    const startVol = vid.volume;
    const diff     = targetVol - startVol;
    const steps    = 20;
    const stepTime = 350 / steps;
    let   step     = 0;
    card._fadeTimer = setInterval(() => {
      step++;
      vid.volume = Math.max(0, Math.min(1, startVol + (diff * step) / steps));
      if (step >= steps) { clearInterval(card._fadeTimer); card._fadeTimer = null; }
    }, stepTime);
  };

  // Stop card — pause video, silence audio, show last frame
  const stopCard = (card) => {
    clearInterval(card._fadeTimer);
    card._fadeTimer = null;
    const vid = card.querySelector(".edit-card__video");
    if (vid) { vid.pause(); vid.volume = 0; vid.muted = true; }
  };

  // Play card — always start muted (guaranteed to work), then try to unmute
  const playCard = (card) => {
    const vid = card.querySelector(".edit-card__video");
    if (!vid) return;
    clearInterval(card._fadeTimer);

    const doPlay = () => {
      vid.muted  = true;  // start muted — always allowed by browser
      vid.volume = 0;
      vid.play().then(() => {
        // Video is running — now try to enable audio
        vid.muted = false;
        if (!vid.muted) {
          // Browser allowed it — fade volume in
          fadeVolume(card, 0.65);
        }
        // If vid.muted is still true, video plays silently
        // (audio will work after the user's first click anywhere)
      }).catch(() => {});
    };

    if (vid.readyState >= 3) {
      doPlay();
    } else {
      vid.addEventListener("canplay", doPlay, { once: true });
    }
  };

  // Set card CSS positions ONLY — no playback
  const positionCards = (newIndex) => {
    activeIndex = newIndex;
    const leftIdx  = (activeIndex - 1 + editCards.length) % editCards.length;
    const rightIdx = (activeIndex + 1) % editCards.length;
    editCards.forEach((card, i) => {
      card.style.transform = "";
      card.classList.remove("is-active", "is-left", "is-right");
      if      (i === activeIndex) card.classList.add("is-active");
      else if (i === leftIdx)     card.classList.add("is-left");
      else if (i === rightIdx)    card.classList.add("is-right");
    });
  };

  // Navigate: stop all, reposition, don't auto-play (user must hover again)
  const updateCarousel = (newIndex) => {
    editCards.forEach((c) => stopCard(c));
    positionCards(newIndex);
  };

  // Set positions on load — no video starts until user hovers
  positionCards(0);

  // ── Desktop hover — per card ──────────────────────────────────────────────
  const isTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (!isTouch()) {
    editCards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        if (!card.classList.contains("is-active")) return;
        playCard(card);
      });

      card.addEventListener("mouseleave", () => {
        if (!card.classList.contains("is-active")) return;
        stopCard(card);
        card.style.transform = "translateX(0) scale(1.1)";
      });

      card.addEventListener("mousemove", (e) => {
        if (!card.classList.contains("is-active")) return;
        const rect    = card.getBoundingClientRect();
        const rotateX = ((e.clientY - rect.top)  - rect.height / 2) / 20;
        const rotateY = (rect.width / 2 - (e.clientX - rect.left)) / 20;
        card.style.transform = `translateX(0) scale(1.1) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    });
  }

  // ── Click / tap handler ───────────────────────────────────────────────────
  editCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (card.classList.contains("is-left")) {
        updateCarousel((activeIndex - 1 + editCards.length) % editCards.length);
        // Cursor is already on the new active card — play it immediately
        playCard(editCards[activeIndex]);
      } else if (card.classList.contains("is-right")) {
        updateCarousel((activeIndex + 1) % editCards.length);
        // Cursor is already on the new active card — play it immediately
        playCard(editCards[activeIndex]);
      } else if (card.classList.contains("is-active") && isTouch()) {
        // Mobile: tap to toggle play/pause
        const vid = card.querySelector(".edit-card__video");
        if (!vid) return;
        if (vid.paused) playCard(card);
        else stopCard(card);
      }
    });
  });

  // ── Swipe handler (Mobile) ────────────────────────────────────────────────
  if (grid && isTouch()) {
    let touchStartX = 0;
    let touchEndX = 0;

    grid.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    grid.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      
      if (Math.abs(diff) > 50) { // Threshold for swipe
        if (diff < 0) {
          // Swipe left -> Next card (right)
          updateCarousel((activeIndex + 1) % editCards.length);
          playCard(editCards[activeIndex]);
        } else {
          // Swipe right -> Previous card (left)
          updateCarousel((activeIndex - 1 + editCards.length) % editCards.length);
          playCard(editCards[activeIndex]);
        }
      }
    }, {passive: true});
  }
})();
