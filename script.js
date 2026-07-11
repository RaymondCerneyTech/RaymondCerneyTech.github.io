const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('portfolio-theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
  root.dataset.theme = 'dark';
}

themeButton?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = nextTheme;
  localStorage.setItem('portfolio-theme', nextTheme);
});

document.querySelector('#current-year')?.replaceChildren(String(new Date().getFullYear()));

const formations = {
  qa: {
    label: 'Quality assurance',
    title: 'Detect the difference that changes the result.',
    copy: 'Compare expected and actual behavior, isolate the discrepancy, and record evidence clearly enough for another person to act on it.'
  },
  software: {
    label: 'Software engineering',
    title: 'Trace a change through the system.',
    copy: 'Understand the issue, identify dependencies, make a bounded change, and validate that the surrounding behavior still works.'
  },
  production: {
    label: 'Production and assembly',
    title: 'Turn parts into a checked result.',
    copy: 'Follow the procedure, assemble accurately, inspect the output, and correct visible problems before the result moves forward.'
  },
  operations: {
    label: 'Operations and routing',
    title: 'Move the right work through the right route.',
    copy: 'Identify the request, use the available process, adapt to changing priorities, and complete the handoff without losing accuracy.'
  }
};

const formationButtons = document.querySelectorAll('[data-formation]');
const formationOutput = document.querySelector('#formation-output');
const outputLabel = document.querySelector('#formation-output-label');
const outputTitle = document.querySelector('#formation-output-title');
const outputCopy = document.querySelector('#formation-output-copy');

formationButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.formation;
    const formation = formations[key];
    if (!formation) return;

    formationButtons.forEach((candidate) => {
      const isActive = candidate === button;
      candidate.classList.toggle('is-active', isActive);
      candidate.setAttribute('aria-pressed', String(isActive));
    });

    outputLabel.textContent = formation.label;
    outputTitle.textContent = formation.title;
    outputCopy.textContent = formation.copy;

    formationOutput?.classList.remove('is-changing');
    if (formationOutput) {
      void formationOutput.offsetWidth;
      formationOutput.classList.add('is-changing');
    }
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal');

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}
