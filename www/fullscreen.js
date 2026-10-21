(() => {
  const stage = document.getElementById('rackStage');
  const button = document.getElementById('fullscreenToggle');
  let expanded = false;
  let previousFocus;
  let background = [];
  const nativeElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  function setExpanded(on) {
    if (expanded === on) return;
    expanded = on;
    stage.classList.toggle('expanded', on);
    document.body.classList.toggle('rack-fullscreen', on);
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Exit full screen rack view' : 'Enter full screen rack view');
    button.title = on ? 'Exit full screen' : 'Full screen';
    button.innerHTML = on ? '✕ <span>Exit full screen</span>' : '⛶ <span>Full screen</span>';
    if (on) {
      previousFocus = document.activeElement;
      // Keep only the expanded space interactive, including the mobile fallback.
      for (let node = stage; node.parentElement; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node) {
            background.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        }
      }
      button.focus({preventScroll:true});
    } else {
      for (const [node, inert] of background) node.inert = inert;
      background = [];
      previousFocus?.focus({preventScroll:true});
    }
    window.dispatchEvent(new Event('resize'));
  }

  async function exit() {
    if (nativeElement() === stage) {
      try {
        const close = document.exitFullscreen || document.webkitExitFullscreen;
        await close.call(document);
      } catch (_) { /* Keep an exit control available if the browser refuses. */ }
      if (nativeElement() === stage) return;
    }
    setExpanded(false);
  }

  button.addEventListener('click', async () => {
    if (expanded) { await exit(); return; }
    setExpanded(true);
    const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (request) {
      try { await request.call(stage); }
      catch (_) { /* Fixed-position full viewport works on unsupported phones/embeds. */ }
    }
  });
  function syncNative() { setExpanded(nativeElement() === stage); }
  document.addEventListener('fullscreenchange', syncNative);
  document.addEventListener('webkitfullscreenchange', syncNative);
  document.addEventListener('keydown', event => {
    if (!expanded) return;
    if (event.key === 'Escape') { event.preventDefault(); exit(); }
    if (event.key === 'Tab') {
      const controls = [...stage.querySelectorAll('button, [tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.disabled);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  });
})();
