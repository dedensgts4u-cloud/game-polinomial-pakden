/**
 * ============================================================================
 * POLINOMLAB SMA - ENGINE MATEMATIKA & LOGIKA INTERAKTIF
 * Materi: Polinomial, Teorema Sisa, Teorema Faktor, Horner & Porogapit
 * ============================================================================
 */

// --- Audio Effects System (Web Audio API Synthesizer) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playError() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

const sfx = new SoundEffects();

// --- Core Polynomial Math Engine ---
class PolynomialMath {
  /**
   * Parse input string into array of coefficients [a_n, a_{n-1}, ..., a_0]
   * Example: "2x^3 - 4x + 7" -> { degree: 3, coeffs: [2, 0, -4, 7] }
   */
  static parse(polyStr) {
    if (!polyStr || typeof polyStr !== 'string') {
      throw new Error('Input polinomial kosong.');
    }

    let clean = polyStr.toLowerCase().replace(/\s+/g, '');
    if (!clean) throw new Error('Input polinomial tidak valid.');

    // Replace unicode minus or subtraction signs
    clean = clean.replace(/−/g, '-');

    // Split into terms while preserving signs
    // Matches terms like: +2x^3, -4.5x, +x^2, -x, +7, etc.
    const termRegex = /([+-]?[^-+]+)/g;
    const terms = clean.match(termRegex);

    if (!terms) throw new Error('Format persamaan tidak dikenali.');

    const degreeMap = {};
    let maxDegree = 0;

    for (let term of terms) {
      term = term.trim();
      if (!term) continue;

      let coeff = 1;
      let exp = 0;

      if (term.includes('x')) {
        const parts = term.split('x');
        let coeffStr = parts[0];
        let expStr = parts[1];

        // Process coefficient
        if (coeffStr === '' || coeffStr === '+') coeff = 1;
        else if (coeffStr === '-') coeff = -1;
        else if (coeffStr.includes('/')) {
          const [num, den] = coeffStr.split('/');
          coeff = parseFloat(num) / parseFloat(den);
        } else {
          coeff = parseFloat(coeffStr);
        }

        // Process exponent
        if (expStr === undefined || expStr === '') {
          exp = 1;
        } else if (expStr.startsWith('^')) {
          exp = parseInt(expStr.substring(1), 10);
        } else {
          throw new Error(`Format pangkat tidak valid pada bagian: ${term}`);
        }
      } else {
        // Constant term
        if (term.includes('/')) {
          const [num, den] = term.split('/');
          coeff = parseFloat(num) / parseFloat(den);
        } else {
          coeff = parseFloat(term);
        }
        exp = 0;
      }

      if (isNaN(coeff) || isNaN(exp) || exp < 0) {
        throw new Error(`Suku "${term}" tidak valid.`);
      }

      degreeMap[exp] = (degreeMap[exp] || 0) + coeff;
      if (exp > maxDegree) maxDegree = exp;
    }

    // Convert degreeMap into standard dense array [a_n, a_{n-1}, ..., a_0]
    const coeffs = [];
    for (let d = maxDegree; d >= 0; d--) {
      coeffs.push(degreeMap[d] || 0);
    }

    // Trim leading zeros if any
    while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-12) {
      coeffs.shift();
      maxDegree--;
    }

    return {
      degree: coeffs.length - 1,
      coeffs: coeffs
    };
  }

  /**
   * Parse linear divisor like "x - 2", "2x + 5", "x + 3", "3x - 1"
   * Returns { a: number, b: number, k: number (which is -b/a) }
   */
  static parseLinearDivisor(str) {
    const clean = str.toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
    
    // Check if user just typed a single number (root evaluation point)
    if (!clean.includes('x')) {
      let val = 0;
      if (clean.includes('/')) {
        const [n, d] = clean.split('/');
        val = parseFloat(n) / parseFloat(d);
      } else {
        val = parseFloat(clean);
      }
      if (isNaN(val)) throw new Error('Format nilai x tidak valid.');
      return { a: 1, b: -val, k: val, isDirectRoot: true };
    }

    // Standard ax + b
    const parsed = this.parse(clean);
    if (parsed.degree !== 1) {
      throw new Error('Pembagi harus berupa fungsi linier (derajat 1), contoh: x - 2 atau 2x + 1.');
    }

    const a = parsed.coeffs[0];
    const b = parsed.coeffs[1];
    const k = -b / a;

    return { a, b, k, isDirectRoot: false };
  }

  /**
   * Format coefficient array to clean algebraic string / LaTeX
   */
  static toAlgebraicString(coeffs, format = 'html') {
    if (!coeffs || coeffs.length === 0) return '0';
    const deg = coeffs.length - 1;
    let result = '';

    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const curDeg = deg - i;
      if (Math.abs(c) < 1e-9 && coeffs.length > 1) continue;

      const sign = c < 0 ? ' - ' : ' + ';
      const absC = Math.abs(c);
      const formattedC = Number.isInteger(absC) ? absC : Number(absC.toFixed(3));

      let term = '';
      if (curDeg === 0) {
        term = `${formattedC}`;
      } else if (curDeg === 1) {
        term = formattedC === 1 ? 'x' : `${formattedC}x`;
      } else {
        const expStr = format === 'latex' ? `x^{${curDeg}}` : `x<sup>${curDeg}</sup>`;
        term = formattedC === 1 ? expStr : `${formattedC}${expStr}`;
      }

      if (result === '') {
        result = (c < 0 ? '-' : '') + term;
      } else {
        result += sign + term;
      }
    }

    return result || '0';
  }

  /**
   * Evaluate polynomial f(k)
   */
  static evaluate(coeffs, k) {
    let res = 0;
    for (let i = 0; i < coeffs.length; i++) {
      res = res * k + coeffs[i];
    }
    return Math.abs(res) < 1e-10 ? 0 : res;
  }

  /**
   * Synthetic division (Horner Scheme)
   * Divides polynomial by (x - k)
   */
  static syntheticDivision(coeffs, k) {
    const n = coeffs.length;
    const topRow = [...coeffs];
    const multRow = [0];
    const sumRow = [coeffs[0]];

    for (let i = 1; i < n; i++) {
      const mult = sumRow[i - 1] * k;
      multRow.push(mult);
      const sum = topRow[i] + mult;
      sumRow.push(sum);
    }

    const quotientCoeffs = sumRow.slice(0, -1);
    const remainder = sumRow[sumRow.length - 1];

    return {
      k,
      topRow,
      multRow,
      sumRow,
      quotientCoeffs,
      remainder: Math.abs(remainder) < 1e-10 ? 0 : remainder
    };
  }

  /**
   * General Polynomial Long Division (Porogapit)
   * Divides f(x) by g(x)
   */
  static longDivision(dividendCoeffs, divisorCoeffs) {
    let rem = [...dividendCoeffs];
    const div = [...divisorCoeffs];
    const degDiv = div.length - 1;
    const quotient = [];
    const steps = [];

    while (rem.length >= div.length) {
      const leadRem = rem[0];
      const leadDiv = div[0];
      const qCoeff = leadRem / leadDiv;
      const qDeg = (rem.length - 1) - degDiv;
      
      quotient.push(qCoeff);

      // Multiply divisor by qCoeff * x^qDeg
      const multTerm = div.map(c => c * qCoeff);
      steps.push({
        currentRem: [...rem],
        subtractTerm: multTerm,
        termDeg: qDeg,
        qCoeff: qCoeff
      });

      // Subtract
      const newRem = [];
      for (let i = 1; i < multTerm.length; i++) {
        newRem.push(rem[i] - multTerm[i]);
      }
      for (let i = multTerm.length; i < rem.length; i++) {
        newRem.push(rem[i]);
      }

      rem = newRem;
      // Drop leading zeros
      while (rem.length > 0 && Math.abs(rem[0]) < 1e-10) {
        rem.shift();
      }
    }

    return {
      quotient: quotient.length > 0 ? quotient : [0],
      remainder: rem.length > 0 ? rem : [0],
      steps: steps
    };
  }

  /**
   * Helper: Find all integer factors of a number
   */
  static getFactors(num) {
    const absN = Math.round(Math.abs(num));
    if (absN === 0) return [1];
    const factors = [];
    for (let i = 1; i <= absN; i++) {
      if (absN % i === 0) factors.push(i);
    }
    return factors;
  }

  /**
   * Find rational roots of a polynomial using Rational Root Theorem & Factor Theorem
   */
  static findRationalRoots(coeffs) {
    const deg = coeffs.length - 1;
    if (deg <= 0) return [];

    const an = coeffs[0];
    const a0 = coeffs[coeffs.length - 1];

    if (Math.abs(a0) < 1e-10) {
      // 0 is a root
      return [{ root: 0, factorStr: 'x', isExact: true }];
    }

    const pFactors = this.getFactors(a0);
    const qFactors = this.getFactors(an);
    const candidates = new Set();

    for (let p of pFactors) {
      for (let q of qFactors) {
        candidates.add(p / q);
        candidates.add(-p / q);
      }
    }

    const roots = [];
    for (let k of Array.from(candidates).sort((a, b) => a - b)) {
      if (Math.abs(this.evaluate(coeffs, k)) < 1e-8) {
        const factorStr = k === 0 ? 'x' : (k > 0 ? `(x - ${k})` : `(x + ${Math.abs(k)})`);
        roots.push({ root: k, factorStr, isExact: true });
      }
    }

    return roots;
  }
}

// --- Application UI Controller ---
class PolinomLabApp {
  constructor() {
    this.currentTheme = localStorage.getItem('polinom_theme') || 'light';
    this.currentTab = 'calculator';
    this.quizState = {
      score: 0,
      streak: 0,
      totalAnswered: 0,
      currentQuestion: null
    };

    this.initElements();
    this.initEventListeners();
    this.applyTheme(this.currentTheme);
    this.calculate(); // Run initial calculation with default preset
  }

  initElements() {
    // Inputs
    this.inputFx = document.getElementById('inputFx');
    this.inputGx = document.getElementById('inputGx');
    this.btnCalculate = document.getElementById('btnCalculate');
    this.presetChips = document.querySelectorAll('.preset-chip');

    // Output containers
    this.outputSection = document.getElementById('outputSection');
    this.factorBadge = document.getElementById('factorBadge');
    this.summaryLatex = document.getElementById('summaryLatex');
    this.remainderVal = document.getElementById('remainderVal');
    this.quotientVal = document.getElementById('quotientVal');
    this.factorTheoremNote = document.getElementById('factorTheoremNote');

    // Methods
    this.hornerContainer = document.getElementById('hornerContainer');
    this.substitutionContainer = document.getElementById('substitutionContainer');
    this.porogapitContainer = document.getElementById('porogapitContainer');
    this.rootsListContainer = document.getElementById('rootsListContainer');

    // Graph
    this.canvas = document.getElementById('polynomialCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Tabs & Navigation
    this.navBtns = document.querySelectorAll('.nav-tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.methodBtns = document.querySelectorAll('.method-btn');
    this.methodContents = document.querySelectorAll('.method-content');

    // Theme & Audio toggles
    this.themeToggle = document.getElementById('themeToggle');
    this.soundToggle = document.getElementById('soundToggle');

    // Quiz elements
    this.quizQuestionBox = document.getElementById('quizQuestionBox');
    this.quizOptions = document.getElementById('quizOptions');
    this.quizFeedback = document.getElementById('quizFeedback');
    this.quizNextBtn = document.getElementById('quizNextBtn');
    this.quizScoreDisplay = document.getElementById('quizScore');
    this.quizStreakDisplay = document.getElementById('quizStreak');

    // Worksheet elements
    this.btnGenerateLKS = document.getElementById('btnGenerateLKS');
    this.lksContainer = document.getElementById('lksContainer');
  }

  initEventListeners() {
    // Calculate button
    if (this.btnCalculate) {
      this.btnCalculate.addEventListener('click', () => {
        sfx.playPop();
        this.calculate();
      });
    }

    // Input Enter key triggers calculation
    [this.inputFx, this.inputGx].forEach(input => {
      if (input) {
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') this.calculate();
        });
      }
    });

    // Preset chips
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        sfx.playPop();
        const fx = chip.dataset.fx;
        const gx = chip.dataset.gx;
        if (fx && this.inputFx) this.inputFx.value = fx;
        if (gx && this.inputGx) this.inputGx.value = gx;
        this.calculate();
      });
    });

    // Main navigation tabs
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.switchTab(target);
      });
    });

    // Method sub-tabs (Horner / Teorema Sisa / Porogapit)
    this.methodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.method;
        this.switchMethod(target);
      });
    });

    // Theme toggle
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
      });
    }

    // Sound toggle
    if (this.soundToggle) {
      this.soundToggle.addEventListener('click', () => {
        sfx.muted = !sfx.muted;
        this.soundToggle.innerHTML = sfx.muted 
          ? '<i class="fa-solid fa-volume-xmark"></i>' 
          : '<i class="fa-solid fa-volume-high"></i>';
        this.showToast(sfx.muted ? 'Suara dimatikan' : 'Suara diaktifkan');
      });
    }

    // Quiz next button
    if (this.quizNextBtn) {
      this.quizNextBtn.addEventListener('click', () => {
        this.generateNewQuizQuestion();
      });
    }

    // LKS generator button
    if (this.btnGenerateLKS) {
      this.btnGenerateLKS.addEventListener('click', () => {
        this.generateLKS();
      });
    }

    // Window resize handler for graph canvas
    window.addEventListener('resize', () => {
      if (this.currentTab === 'calculator' && this.lastParsedPoly) {
        this.drawGraph(this.lastParsedPoly.coeffs, this.lastDivisorK);
      }
    });
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('polinom_theme', theme);
    if (this.themeToggle) {
      this.themeToggle.innerHTML = theme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
    }
    // Redraw graph canvas if exists
    if (this.lastParsedPoly) {
      this.drawGraph(this.lastParsedPoly.coeffs, this.lastDivisorK);
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    if (tabId === 'quiz' && !this.quizState.currentQuestion) {
      this.generateNewQuizQuestion();
    }
    if (tabId === 'worksheet' && !this.lksGenerated) {
      this.generateLKS();
    }
    if (tabId === 'calculator' && this.lastParsedPoly) {
      setTimeout(() => this.drawGraph(this.lastParsedPoly.coeffs, this.lastDivisorK), 50);
    }
  }

  switchMethod(methodId) {
    this.methodBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === methodId);
    });
    this.methodContents.forEach(content => {
      content.classList.toggle('active', content.id === `method-${methodId}`);
    });
  }

  showToast(msg) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  /**
   * Main calculation handler
   */
  calculate() {
    try {
      const fxStr = this.inputFx ? this.inputFx.value : 'x^3 - 2x^2 - 5x + 6';
      const gxStr = this.inputGx ? this.inputGx.value : 'x - 3';

      const polyF = PolynomialMath.parse(fxStr);
      const linearDiv = PolynomialMath.parseLinearDivisor(gxStr);

      this.lastParsedPoly = polyF;
      this.lastDivisorK = linearDiv.k;

      // 1. Run Horner Synthetic Division
      const hornerResult = PolynomialMath.syntheticDivision(polyF.coeffs, linearDiv.k);

      // Adjust quotient if divisor is ax + b where a != 1
      let finalQuotientCoeffs = [...hornerResult.quotientCoeffs];
      if (linearDiv.a !== 1) {
        finalQuotientCoeffs = finalQuotientCoeffs.map(c => c / linearDiv.a);
      }

      const remainder = hornerResult.remainder;
      const isFactor = Math.abs(remainder) < 1e-9;

      // 2. Render Results
      this.renderSummary(polyF, linearDiv, finalQuotientCoeffs, remainder, isFactor);
      this.renderHorner(hornerResult, linearDiv);
      this.renderSubstitution(polyF, linearDiv, remainder);
      this.renderPorogapit(polyF, linearDiv, finalQuotientCoeffs, remainder);
      this.renderRationalRoots(polyF);
      this.drawGraph(polyF.coeffs, linearDiv.k);

      // Audio feedback
      if (isFactor) {
        sfx.playSuccess();
      }

      // Render KaTeX formulas if available
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]
        });
      }
    } catch (err) {
      sfx.playError();
      this.showToast(`Kesalahan: ${err.message}`);
      console.error(err);
    }
  }

  renderSummary(polyF, linearDiv, quotientCoeffs, remainder, isFactor) {
    if (!this.factorBadge) return;

    // Factor Badge
    if (isFactor) {
      this.factorBadge.className = 'factor-badge is-factor';
      this.factorBadge.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${linearDiv.isDirectRoot ? `x = ${linearDiv.k} ADALAH AKAR` : 'MERUPAKAN FAKTOR DARI f(x)'}`;
    } else {
      this.factorBadge.className = 'factor-badge not-factor';
      this.factorBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${linearDiv.isDirectRoot ? `x = ${linearDiv.k} BUKAN AKAR` : 'BUKAN FAKTOR DARI f(x)'}`;
    }

    // Remainder & Quotient values
    const formattedRem = Number.isInteger(remainder) ? remainder : remainder.toFixed(3);
    const quotientStr = PolynomialMath.toAlgebraicString(quotientCoeffs, 'html');
    const divisorStr = linearDiv.isDirectRoot ? `(x - ${linearDiv.k})` : (this.inputGx ? this.inputGx.value : 'g(x)');
    const fStr = PolynomialMath.toAlgebraicString(polyF.coeffs, 'html');

    if (this.remainderVal) this.remainderVal.innerHTML = `<strong>Sisa S = ${formattedRem}</strong>`;
    if (this.quotientVal) this.quotientVal.innerHTML = `<strong>Hasil Bagi H(x) = ${quotientStr}</strong>`;

    if (this.summaryLatex) {
      this.summaryLatex.innerHTML = `
        <div style="font-size:1.1rem; line-height:2;">
          <strong>Bentuk Identitas Polinomial:</strong><br>
          <span style="color:var(--primary); font-family:var(--font-mono); font-size:1.15rem;">
            f(x) = (${divisorStr}) · (${quotientStr}) + (${formattedRem})
          </span>
        </div>
      `;
    }

    if (this.factorTheoremNote) {
      if (isFactor) {
        this.factorTheoremNote.innerHTML = `
          <div style="color:var(--success-dark); font-size:0.9rem;">
            💡 <strong>Berdasarkan Teorema Faktor:</strong> Karena sisa pembagian <strong>S = 0</strong>, maka <strong>${divisorStr}</strong> habis membagi $f(x)$ dan merupakan salah satu faktor linier dari $f(x)$.
          </div>
        `;
      } else {
        this.factorTheoremNote.innerHTML = `
          <div style="color:var(--text-muted); font-size:0.9rem;">
            💡 <strong>Berdasarkan Teorema Sisa:</strong> Sisa pembagian $f(x)$ oleh <strong>${divisorStr}</strong> adalah <strong>S = ${formattedRem} ≠ 0</strong>, sehingga bukan merupakan faktor pengali bulat.
          </div>
        `;
      }
    }
  }

  renderHorner(res, linearDiv) {
    if (!this.hornerContainer) return;

    const { k, topRow, multRow, sumRow, remainder } = res;
    const isZero = Math.abs(remainder) < 1e-9;
    const colCount = topRow.length;

    let html = `
      <p style="margin-bottom:0.75rem; font-size:0.9rem; color:var(--text-muted);">
        Nilai pembagi / pembuat nol: <strong style="color:var(--accent); font-size:1.1rem;">x = ${Number.isInteger(k) ? k : k.toFixed(2)}</strong> 
        ${linearDiv.a !== 1 ? `<em>(berasal dari ${linearDiv.a}x + (${linearDiv.b}) = 0)</em>` : ''}
      </p>
      <div class="horner-wrapper">
        <table class="horner-table">
          <!-- Baris 1: Koefisien f(x) -->
          <tr>
            <td rowspan="2" class="horner-root-cell">
              x = ${Number.isInteger(k) ? k : k.toFixed(2)}
            </td>
            <td class="horner-plus-sign"></td>
    `;

    topRow.forEach(c => {
      html += `<td><strong>${c}</strong></td>`;
    });

    html += `
          </tr>
          <!-- Baris 2: Operasi Perkalian Horner -->
          <tr class="horner-border-bottom">
            <td class="horner-plus-sign">+</td>
    `;

    multRow.forEach((m, idx) => {
      if (idx === 0) {
        html += `<td style="color:var(--text-light);">&bull;</td>`;
      } else {
        html += `<td class="horner-mult-row">+(${Number.isInteger(m) ? m : m.toFixed(2)})</td>`;
      }
    });

    html += `
          </tr>
          <!-- Baris 3: Hasil Penjumlahan (Koefisien Hasil Bagi & Sisa) -->
          <tr class="horner-result-row">
            <td></td>
            <td></td>
    `;

    sumRow.forEach((s, idx) => {
      const isLast = idx === sumRow.length - 1;
      const formatted = Number.isInteger(s) ? s : s.toFixed(2);
      if (isLast) {
        html += `
          <td class="horner-remainder-cell ${isZero ? 'zero-rem' : ''}">
            <strong>${formatted}</strong>
            <span class="horner-badge-label">SISA (S)</span>
          </td>
        `;
      } else {
        html += `
          <td>
            ${formatted}
            <span class="horner-badge-label" style="color:var(--primary-light);">x<sup>${sumRow.length - 2 - idx}</sup></span>
          </td>
        `;
      }
    });

    html += `
          </tr>
        </table>
      </div>
    `;

    if (linearDiv.a !== 1) {
      html += `
        <div style="margin-top:1rem; padding:0.75rem; background:var(--primary-subtle); border-radius:var(--radius-sm); font-size:0.875rem;">
          ⚠️ <strong>Catatan Khusus Pembagi (${linearDiv.a}x + ${linearDiv.b}):</strong><br>
          Karena koefisien utama $a = ${linearDiv.a}$, maka koefisien hasil bagi pada baris bawah harus dibagi dengan $a = ${linearDiv.a}$.<br>
          Sehingga: $H(x) = \\frac{1}{${linearDiv.a}} (${PolynomialMath.toAlgebraicString(res.quotientCoeffs, 'html')}) = ${PolynomialMath.toAlgebraicString(res.quotientCoeffs.map(c => c / linearDiv.a), 'html')}$.
        </div>
      `;
    }

    this.hornerContainer.innerHTML = html;
  }

  renderSubstitution(polyF, linearDiv, remainder) {
    if (!this.substitutionContainer) return;

    const k = linearDiv.k;
    const formattedK = Number.isInteger(k) ? k : k.toFixed(2);
    const deg = polyF.coeffs.length - 1;

    let subStepsHtml = '';
    let evalStepHtml = '';

    polyF.coeffs.forEach((c, idx) => {
      const p = deg - idx;
      const sign = idx > 0 && c >= 0 ? ' + ' : (idx > 0 ? ' - ' : (c < 0 ? '-' : ''));
      const absC = Math.abs(c);

      if (p === 0) {
        subStepsHtml += `${sign}${absC}`;
        evalStepHtml += `${sign}${absC}`;
      } else if (p === 1) {
        subStepsHtml += `${sign}${absC === 1 ? '' : absC}(${formattedK})`;
        evalStepHtml += `${sign}${absC * k}`;
      } else {
        subStepsHtml += `${sign}${absC === 1 ? '' : absC}(${formattedK})^${p}`;
        const val = absC * Math.pow(k, p);
        evalStepHtml += `${sign}${Number.isInteger(val) ? val : val.toFixed(2)}`;
      }
    });

    const formattedRem = Number.isInteger(remainder) ? remainder : remainder.toFixed(3);

    this.substitutionContainer.innerHTML = `
      <div style="background:var(--bg-main); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color); line-height:2;">
        <p><strong>1. Teorema Sisa Menyatakan:</strong></p>
        <p style="color:var(--primary); font-weight:700; margin-left:1rem;">
          Jika suku banyak $f(x)$ dibagi oleh $(x - k)$, maka sisanya adalah $S = f(k)$.
        </p>
        <p style="margin-top:0.75rem;"><strong>2. Substitusikan nilai $x = ${formattedK}$:</strong></p>
        <div style="font-family:var(--font-mono); background:var(--bg-card); padding:0.75rem 1rem; border-radius:var(--radius-sm); margin:0.5rem 0;">
          $f(${formattedK}) = ${subStepsHtml}$<br>
          $f(${formattedK}) = ${evalStepHtml}$<br>
          <strong style="color:var(--primary-dark); font-size:1.1rem;">$S = f(${formattedK}) = ${formattedRem}$</strong>
        </div>
        <p style="margin-top:0.75rem;">
          ${Math.abs(remainder) < 1e-9 
            ? `✅ Karena $f(${formattedK}) = 0$, terbukti bahwa <strong>$(x - ${formattedK})$ adalah faktor</strong> dari $f(x)$.` 
            : `ℹ️ Karena $f(${formattedK}) = ${formattedRem} \\neq 0$, terbukti sisa pembagiannya adalah <strong>${formattedRem}</strong>.`}
        </p>
      </div>
    `;
  }

  renderPorogapit(polyF, linearDiv, quotientCoeffs, remainder) {
    if (!this.porogapitContainer) return;

    const divStr = PolynomialMath.toAlgebraicString(linearDiv.isDirectRoot ? [1, -linearDiv.k] : [linearDiv.a, linearDiv.b], 'html');
    const fStr = PolynomialMath.toAlgebraicString(polyF.coeffs, 'html');
    const qStr = PolynomialMath.toAlgebraicString(quotientCoeffs, 'html');
    const remStr = Number.isInteger(remainder) ? remainder : remainder.toFixed(2);

    this.porogapitContainer.innerHTML = `
      <div class="long-division-container">
        <div><strong>Hasil Bagi:</strong> <span class="ld-quotient">${qStr}</span></div>
        <div class="ld-dividend-wrapper">
          <span class="ld-divisor">${divStr}</span>
          <span class="ld-dividend">/ ${fStr}</span>
        </div>
        <div style="margin-top:1rem; color:var(--text-muted); font-size:0.875rem;">
          <p>Langkah eliminasi suku demi suku dengan pembagi $g(x)$:</p>
          <p style="margin-top:0.5rem;">
            1. Kalikan suku pertama hasil bagi dengan $g(x)$ lalu kurangkan ke dividen.<br>
            2. Turunkan suku berikutnya hingga derajat sisa lebih kecil dari derajat $g(x)$.<br>
            3. Diperoleh <strong>Sisa Akhir S = ${remStr}</strong>.
          </p>
        </div>
      </div>
    `;
  }

  renderRationalRoots(polyF) {
    if (!this.rootsListContainer) return;

    const roots = PolynomialMath.findRationalRoots(polyF.coeffs);
    if (roots.length === 0) {
      this.rootsListContainer.innerHTML = `
        <p style="color:var(--text-muted); font-size:0.875rem;">
          Tidak ditemukan akar rasional bulat sederhana. Akar-akar polinomial mungkin berupa bilangan irasional atau imajiner.
        </p>
      `;
      return;
    }

    let html = `
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem;">
    `;

    roots.forEach(r => {
      html += `
        <span class="preset-chip" style="background:var(--success-subtle); color:var(--success-dark); border-color:var(--success);">
          <i class="fa-solid fa-check"></i> x = ${r.root} &rarr; Faktor: ${r.factorStr}
        </span>
      `;
    });

    html += `
      </div>
      <p style="margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted);">
        ✨ Semua faktor linier di atas menghasilkan sisa $S = f(k) = 0$ berdasarkan <strong>Teorema Faktor</strong>.
      </p>
    `;

    this.rootsListContainer.innerHTML = html;
  }

  drawGraph(coeffs, evalK) {
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Coordinate Range
    let xMin = -6;
    let xMax = 6;
    if (evalK !== undefined && (evalK < xMin + 1 || evalK > xMax - 1)) {
      xMin = Math.floor(evalK - 3);
      xMax = Math.ceil(evalK + 3);
    }

    let yMin = -15;
    let yMax = 15;

    // Sample y-values to auto-scale y-range gracefully
    const samples = [];
    for (let x = xMin; x <= xMax; x += 0.2) {
      const y = PolynomialMath.evaluate(coeffs, x);
      if (!isNaN(y) && isFinite(y)) samples.push(y);
    }

    if (samples.length > 0) {
      const sMin = Math.min(...samples);
      const sMax = Math.max(...samples);
      yMin = Math.max(Math.min(sMin - 2, -5), -50);
      yMax = Math.min(Math.max(sMax + 2, 5), 50);
    }

    const toScreenX = (x) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;

    const isDark = this.currentTheme === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e2e8f0';
    const axisColor = isDark ? '#6b7280' : '#94a3b8';
    const curveColor = isDark ? '#818cf8' : '#4f46e5';

    // Draw Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 * window.devicePixelRatio;

    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(x), 0);
      ctx.lineTo(toScreenX(x), height);
      ctx.stroke();
    }

    for (let y = Math.ceil(yMin / 5) * 5; y <= Math.floor(yMax / 5) * 5; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(y));
      ctx.lineTo(width, toScreenY(y));
      ctx.stroke();
    }

    // Draw Axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2 * window.devicePixelRatio;

    // X-Axis
    const originY = toScreenY(0);
    if (originY >= 0 && originY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();
    }

    // Y-Axis
    const originX = toScreenX(0);
    if (originX >= 0 && originX <= width) {
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();
    }

    // Plot Polynomial Curve f(x)
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3 * window.devicePixelRatio;
    ctx.beginPath();

    let started = false;
    const step = (xMax - xMin) / (width / 2);
    for (let x = xMin; x <= xMax; x += step) {
      const y = PolynomialMath.evaluate(coeffs, x);
      const sx = toScreenX(x);
      const sy = toScreenY(y);

      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // Mark point (k, f(k))
    if (evalK !== undefined) {
      const remVal = PolynomialMath.evaluate(coeffs, evalK);
      const px = toScreenX(evalK);
      const py = toScreenY(remVal);

      // Point circle
      ctx.fillStyle = Math.abs(remVal) < 1e-9 ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, 7 * window.devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.stroke();

      // Label
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.font = `bold ${12 * window.devicePixelRatio}px var(--font-sans)`;
      ctx.fillText(`(k=${evalK}, S=${Number.isInteger(remVal) ? remVal : remVal.toFixed(2)})`, px + 10, py - 10);
    }
  }

  // --- Quiz & Exercise System ---
  generateNewQuizQuestion() {
    this.quizFeedback.className = 'quiz-feedback';
    this.quizFeedback.innerHTML = '';
    this.quizNextBtn.style.display = 'none';

    // Randomized Question Types
    const qType = Math.floor(Math.random() * 3);
    let questionData = null;

    if (qType === 0) {
      // Type 1: Teorema Sisa f(x) dibagi (x - k)
      const k = Math.floor(Math.random() * 5) - 2; // -2 to 2
      const a = Math.floor(Math.random() * 3) + 1;
      const b = Math.floor(Math.random() * 7) - 3;
      const c = Math.floor(Math.random() * 9) - 4;
      const d = Math.floor(Math.random() * 11) - 5;
      const coeffs = [a, b, c, d];
      const correctS = PolynomialMath.evaluate(coeffs, k);
      const fStr = PolynomialMath.toAlgebraicString(coeffs, 'html');
      const divStr = k >= 0 ? `(x - ${k})` : `(x + ${Math.abs(k)})`;

      const options = [correctS];
      while (options.length < 4) {
        const fake = correctS + (Math.floor(Math.random() * 9) - 4) * (Math.random() > 0.5 ? 1 : 2);
        if (!options.includes(fake)) options.push(fake);
      }
      this.shuffleArray(options);

      questionData = {
        title: 'Hitung Sisa Pembagian (Teorema Sisa)',
        text: `Tentukan sisa pembagian polinomial $f(x) = ${fStr}$ jika dibagi oleh $g(x) = ${divStr}$ !`,
        options: options.map(opt => ({ text: `Sisa S = ${opt}`, isCorrect: opt === correctS })),
        explanation: `Gunakan Teorema Sisa: $S = f(${k})$. Substitusikan $x = ${k}$ ke $f(x)$: Diperoleh sisa $S = ${correctS}$.`
      };
    } else if (qType === 1) {
      // Type 2: Teorema Faktor (Apakah g(x) merupakan faktor?)
      // Generate a polynomial that definitely has (x - k) as a factor
      const k = Math.floor(Math.random() * 4) - 2; // -2 to 1
      const isActualFactor = Math.random() > 0.4;
      let coeffs = [1, -k - 1, k - 6, 6 * k]; // root at k
      if (!isActualFactor) {
        coeffs[coeffs.length - 1] += 5; // break the factor
      }
      const fStr = PolynomialMath.toAlgebraicString(coeffs, 'html');
      const divStr = k >= 0 ? `(x - ${k})` : `(x + ${Math.abs(k)})`;
      const sisa = PolynomialMath.evaluate(coeffs, k);

      questionData = {
        title: 'Uji Teorema Faktor',
        text: `Apakah $g(x) = ${divStr}$ merupakan faktor dari polinomial $f(x) = ${fStr}$?`,
        options: [
          { text: `Ya, merupakan faktor (karena sisa f(${k}) = 0)`, isCorrect: isActualFactor },
          { text: `Bukan faktor (karena sisa f(${k}) ≠ 0)`, isCorrect: !isActualFactor }
        ],
        explanation: `Hitung nilai $f(${k}) = ${sisa}$. Berdasarkan Teorema Faktor, $(x - k)$ adalah faktor jika dan hanya jika $f(k) = 0$. Karena $f(${k}) = ${sisa}$, maka kesimpulannya adalah: ${isActualFactor ? 'Merupakan Faktor' : 'Bukan Faktor'}.`
      };
    } else {
      // Type 3: Mencari nilai koefisien tak tentu p
      const k = 2;
      const p = Math.floor(Math.random() * 5) + 1;
      const rem = 3 * p + 4; // f(2) = 2^3 + p(2)^2 - 4(2) + 2 = 8 + 4p - 8 + 2 = 4p + 2
      // Let f(x) = x^3 + px^2 - 4x + 2
      const targetP = p;
      const targetRem = 4 * p + 2;

      const options = [targetP];
      while (options.length < 4) {
        const fake = targetP + Math.floor(Math.random() * 7) - 3;
        if (fake !== targetP && !options.includes(fake)) options.push(fake);
      }
      this.shuffleArray(options);

      questionData = {
        title: 'Aplikasi Teorema Sisa: Mencari Koefisien $p$',
        text: `Diketahui suku banyak $f(x) = x^3 + p x^2 - 4x + 2$. Jika $f(x)$ dibagi oleh $(x - 2)$ bersisa $S = ${targetRem}$, berapakah nilai $p$?`,
        options: options.map(opt => ({ text: `p = ${opt}`, isCorrect: opt === targetP })),
        explanation: `Berdasarkan Teorema Sisa: $f(2) = S \\Rightarrow (2)^3 + p(2)^2 - 4(2) + 2 = ${targetRem} \\Rightarrow 8 + 4p - 8 + 2 = ${targetRem} \\Rightarrow 4p + 2 = ${targetRem} \\Rightarrow 4p = ${targetRem - 2} \\Rightarrow p = ${targetP}$.`
      };
    }

    this.quizState.currentQuestion = questionData;
    this.renderQuizQuestion(questionData);
  }

  renderQuizQuestion(q) {
    if (!this.quizQuestionBox || !this.quizOptions) return;

    this.quizQuestionBox.innerHTML = `
      <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:0.4rem;">
        ${q.title}
      </div>
      <div style="font-size:1.1rem; font-weight:600; line-height:1.6;">
        ${q.text}
      </div>
    `;

    this.quizOptions.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `
        <span style="width:28px; height:28px; border-radius:50%; background:var(--primary-subtle); color:var(--primary); display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">
          ${String.fromCharCode(65 + idx)}
        </span>
        <span>${opt.text}</span>
      `;
      btn.addEventListener('click', () => this.handleQuizAnswer(opt, btn));
      this.quizOptions.appendChild(btn);
    });

    if (window.renderMathInElement) {
      window.renderMathInElement(this.quizQuestionBox, {
        delimiters: [{ left: '$', right: '$', display: false }]
      });
    }
  }

  handleQuizAnswer(chosenOpt, selectedBtn) {
    const allBtns = this.quizOptions.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(btn => btn.disabled = true);

    const isCorrect = chosenOpt.isCorrect;
    this.quizState.totalAnswered++;

    if (isCorrect) {
      sfx.playSuccess();
      selectedBtn.classList.add('correct');
      this.quizState.score += 10;
      this.quizState.streak++;
      this.quizFeedback.className = 'quiz-feedback show correct';
      this.quizFeedback.innerHTML = `
        <strong>🎉 Hebat! Jawaban Anda Benar!</strong>
        <p style="margin-top:0.5rem; font-size:0.9rem;">${this.quizState.currentQuestion.explanation}</p>
      `;
    } else {
      sfx.playError();
      selectedBtn.classList.add('incorrect');
      this.quizState.streak = 0;
      this.quizFeedback.className = 'quiz-feedback show incorrect';
      this.quizFeedback.innerHTML = `
        <strong>❌ Jawaban Kurang Tepat.</strong>
        <p style="margin-top:0.5rem; font-size:0.9rem;">${this.quizState.currentQuestion.explanation}</p>
      `;
    }

    if (this.quizScoreDisplay) this.quizScoreDisplay.textContent = this.quizState.score;
    if (this.quizStreakDisplay) this.quizStreakDisplay.textContent = this.quizState.streak;
    if (this.quizNextBtn) this.quizNextBtn.style.display = 'inline-flex';

    if (window.renderMathInElement) {
      window.renderMathInElement(this.quizFeedback, {
        delimiters: [{ left: '$', right: '$', display: false }]
      });
    }
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // --- LKS (Lembar Kerja Siswa) Generator ---
  generateLKS() {
    if (!this.lksContainer) return;
    this.lksGenerated = true;

    const questions = [
      {
        fx: 'x^3 - 4x^2 + 2x + 7',
        gx: 'x - 3',
        k: 3,
        instruksi: 'Tentukan sisa pembagian dengan metode Teorema Sisa f(3) dan Skema Horner.'
      },
      {
        fx: '2x^3 - 5x^2 - 4x + 12',
        gx: 'x - 2',
        k: 2,
        instruksi: 'Ujilah apakah (x - 2) merupakan faktor dari f(x) menggunakan Teorema Faktor.'
      },
      {
        fx: '3x^3 + 7x^2 - 4x - 8',
        gx: '3x + 1',
        k: -1/3,
        instruksi: 'Tentukan hasil bagi H(x) dan sisa S untuk pembagi bentuk (ax + b).'
      },
      {
        fx: 'x^4 - 5x^2 + 4',
        gx: 'x + 1',
        k: -1,
        instruksi: 'Tentukan apakah x = -1 adalah akar polinomial dan carilah faktor-faktor linier lainnya.'
      }
    ];

    let html = `
      <div style="background:#fff; color:#000; padding:2rem; border-radius:var(--radius-md); border:1px solid #ddd; margin-bottom:1.5rem;">
        <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:1rem; margin-bottom:1.5rem;">
          <h2 style="font-size:1.3rem; margin-bottom:0.25rem;">LEMBAR KERJA PESERTA DIDIK (LKPD) MATEMATIKA SMA</h2>
          <h3 style="font-size:1.1rem; font-weight:600; color:#444;">Materi: Teorema Sisa & Teorema Faktor Polinomial</h3>
          <div style="display:flex; justify-content:space-between; margin-top:1rem; font-size:0.9rem; text-align:left;">
            <div><strong>Nama Siswa:</strong> ______________________</div>
            <div><strong>Kelas:</strong> XI / XII ______</div>
            <div><strong>Tanggal:</strong> ______________</div>
          </div>
        </div>
    `;

    questions.forEach((q, idx) => {
      html += `
        <div style="margin-bottom:1.75rem; page-break-inside:avoid;">
          <div style="font-weight:700; font-size:1rem; margin-bottom:0.4rem;">
            Soal ${idx + 1}. Diketahui $f(x) = ${q.fx}$ dan pembagi $g(x) = ${q.gx}$.
          </div>
          <div style="font-size:0.9rem; color:#444; margin-bottom:0.75rem;">
            <em>Instruksi: ${q.instruksi}</em>
          </div>
          <!-- Workspace Box -->
          <div style="border:1px dashed #999; height:120px; border-radius:6px; padding:0.5rem; color:#aaa; font-size:0.8rem;">
            Ruang pengerjaan siswa (Metode Horner / Substitusi):
          </div>
        </div>
      `;
    });

    html += `
      </div>
      <div style="text-align:center;" class="no-print">
        <button class="btn btn-primary" onclick="window.print()">
          <i class="fa-solid fa-print"></i> Cetak / Simpan PDF Lembar Kerja
        </button>
      </div>
    `;

    this.lksContainer.innerHTML = html;

    if (window.renderMathInElement) {
      window.renderMathInElement(this.lksContainer, {
        delimiters: [{ left: '$', right: '$', display: false }]
      });
    }
  }
}

// Global initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PolinomLabApp();
});
