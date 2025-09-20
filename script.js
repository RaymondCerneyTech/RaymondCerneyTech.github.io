const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const STORAGE_KEY = 'rc-disable-scenes';
const STEP_SEQUENCE = ['plan', 'code', 'deploy'];
const RESUME_DELAY_MS = 1400;

const state = {
  prefersReducedMotion: motionQuery.matches,
  activeStep: 'plan',
  manualLockUntil: 0,
  resumeTimer: null,
  backgroundDisabled: false
};

const dom = {
  heroTitle: null,
  steps: [],
  buttons: [],
  panels: [],
  backgroundToggle: null,
  yearPlaceholder: null,
  spotlight: null
};

const selectors = {
  heroTitle: '[data-animate-words]',
  reveal: '[data-reveal]',
  steps: '.build-strip__step',
  button: '.build-strip__stepButton',
  panel: '[data-step-panel]',
  backgroundToggle: '[data-background-toggle]',
  year: '[data-year]'
};

let revealObserver;
let scrollTicking = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const syncDom = () => {
  dom.heroTitle = document.querySelector(selectors.heroTitle);
  dom.steps = Array.from(document.querySelectorAll(selectors.steps));
  dom.buttons = dom.steps.map((step) => step.querySelector(selectors.button)).filter(Boolean);
  dom.panels = Array.from(document.querySelectorAll(selectors.panel));
  dom.backgroundToggle = document.querySelector(selectors.backgroundToggle);
  dom.yearPlaceholder = document.querySelector(selectors.year);
  dom.spotlight = document.getElementById('step-spotlight');
};

const populateYear = () => {
  if (dom.yearPlaceholder) {
    dom.yearPlaceholder.textContent = new Date().getFullYear();
  }
};

const setBodyStepClass = (stepId) => {
  STEP_SEQUENCE.forEach((step) => document.body.classList.remove('step-' + step));
  document.body.classList.add('step-' + stepId);
};

const updateStepUI = (stepId) => {
  dom.steps.forEach((step) => {
    const isActive = step.dataset.step === stepId;
    step.classList.toggle('is-active', isActive);
    const button = step.querySelector(selectors.button);
    if (button) {
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    }
  });

  dom.panels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.stepPanel === stepId);
  });

  setBodyStepClass(stepId);
};

const setActiveStep = (stepId, { force = false, source = 'auto' } = {}) => {
  if (!stepId || (!force && stepId === state.activeStep)) {
    return;
  }

  state.activeStep = stepId;
  updateStepUI(stepId);

  if (source === 'manual') {
    state.manualLockUntil = performance.now() + RESUME_DELAY_MS;
    window.clearTimeout(state.resumeTimer);
    state.resumeTimer = window.setTimeout(() => {
      state.manualLockUntil = 0;
      updateStepFromScroll({ force: true });
    }, RESUME_DELAY_MS);
  }
};

const handleHeroWords = (preferReduced) => {
  const title = dom.heroTitle;
  if (!title) {
    return;
  }

  const original = title.dataset.originalText || title.textContent.trim().replace(/\s+/g, ' ');
  title.dataset.originalText = original;

  if (preferReduced) {
    title.classList.remove('hero__title--animated', 'hero__title--visible');
    title.dataset.wordsInitialized = 'false';
    title.textContent = original;
    title.classList.add('hero__title--simple');
    requestAnimationFrame(() => title.classList.add('is-visible'));
    return;
  }

  if (title.dataset.wordsInitialized === 'true') {
    title.classList.add('hero__title--visible');
    return;
  }

  title.textContent = '';
  original.split(' ').forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'hero__word';
    span.textContent = word;
    span.style.setProperty('--word-index', index.toString());
    title.appendChild(span);
    if (index < original.length - 1) {
      title.appendChild(document.createTextNode(' '));
    }
  });

  title.dataset.wordsInitialized = 'true';
  title.classList.add('hero__title--animated');
  requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('hero__title--visible')));
};

const handleRevealAnimations = (preferReduced) => {
  const elements = document.querySelectorAll(selectors.reveal);
  if (!elements.length) {
    return;
  }

  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  if (preferReduced) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.25,
    rootMargin: '0px 0px -10%'
  });

  elements.forEach((element) => revealObserver.observe(element));
};

const attachStepInteractions = () => {
  dom.buttons.forEach((button, index) => {
    const parentStep = dom.steps[index];
    if (!parentStep) {
      return;
    }
    const stepId = parentStep.dataset.step;

    button.addEventListener('click', () => setActiveStep(stepId, { source: 'manual' }));

    button.addEventListener('keydown', (event) => {
      const { key } = event;
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) {
        return;
      }
      event.preventDefault();
      let nextIndex = index;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        nextIndex = Math.min(dom.buttons.length - 1, index + 1);
      }
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nextIndex = Math.max(0, index - 1);
      }
      if (key === 'Home') {
        nextIndex = 0;
      }
      if (key === 'End') {
        nextIndex = dom.buttons.length - 1;
      }
      dom.buttons[nextIndex]?.focus();
      const nextStep = dom.steps[nextIndex]?.dataset.step;
      if (nextStep) {
        setActiveStep(nextStep, { source: 'manual' });
      }
    });
  });
};

const applyBackgroundPreference = (disabled) => {
  state.backgroundDisabled = disabled;
  document.body.classList.toggle('background-off', disabled);
  if (dom.backgroundToggle) {
    dom.backgroundToggle.setAttribute('aria-pressed', disabled ? 'true' : 'false');
    dom.backgroundToggle.textContent = disabled ? 'Enable animated background' : 'Skip animated background';
  }
};

const readStoredPreference = () => {
  try {
    return window.localStorage?.getItem(STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

const persistPreference = (disabled) => {
  try {
    window.localStorage?.setItem(STORAGE_KEY, disabled ? 'true' : 'false');
  } catch (error) {
    // ignore persistence errors
  }
};

const setupBackgroundToggle = () => {
  if (!dom.backgroundToggle) {
    return;
  }
  applyBackgroundPreference(readStoredPreference());
  dom.backgroundToggle.addEventListener('click', (event) => {
    event.preventDefault();
    const nextState = !state.backgroundDisabled;
    applyBackgroundPreference(nextState);
    persistPreference(nextState);
    setActiveStep(state.activeStep, { force: true });
  });
};

const determineStepFromScroll = () => {
  if (!dom.spotlight) {
    return state.activeStep;
  }

  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const start = dom.spotlight.offsetTop - viewportHeight * SCROLL_ANCHOR_START;
  const end = dom.spotlight.offsetTop + dom.spotlight.offsetHeight - viewportHeight * SCROLL_ANCHOR_END;
  const span = Math.max(end - start, 1);
  const ratio = clamp((scrollY - start) / span, 0, 1);

  if (ratio >= 0.66) {
    return 'deploy';
  }
  if (ratio >= 0.33) {
    return 'code';
  }
  return 'plan';
};

const updateStepFromScroll = ({ force = false } = {}) => {
  if (!force && performance.now() < state.manualLockUntil) {
    return;
  }
  const target = determineStepFromScroll();
  setActiveStep(target);
};

const handleScroll = () => {
  if (scrollTicking) {
    return;
  }
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    scrollTicking = false;
    updateStepFromScroll();
  });
};

const handleResize = () => {
  updateStepFromScroll({ force: true });
};

const initialiseSteps = () => {
  const preset = dom.steps.find((step) => step.classList.contains('is-active'));
  const fallback = dom.steps[0];
  const resolved = preset?.dataset.step || fallback?.dataset.step || 'plan';
  state.activeStep = resolved;
  setActiveStep(resolved, { force: true });
};

const init = () => {
  syncDom();
  populateYear();
  handleHeroWords(state.prefersReducedMotion);
  handleRevealAnimations(state.prefersReducedMotion);
  initialiseSteps();
  attachStepInteractions();
  setupBackgroundToggle();
  updateStepFromScroll({ force: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

window.addEventListener('load', () => {
  updateStepFromScroll({ force: true });
});

const handleMotionChange = (event) => {
  state.prefersReducedMotion = event.matches;
  state.manualLockUntil = 0;
  window.clearTimeout(state.resumeTimer);
  state.resumeTimer = null;
  handleHeroWords(state.prefersReducedMotion);
  handleRevealAnimations(state.prefersReducedMotion);
  updateStepFromScroll({ force: true });
};

if (typeof motionQuery.addEventListener === 'function') {
  motionQuery.addEventListener('change', handleMotionChange);
} else if (typeof motionQuery.addListener === 'function') {
  motionQuery.addListener(handleMotionChange);
}


