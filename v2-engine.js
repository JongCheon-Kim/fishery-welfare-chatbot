/*
 * v2 판정엔진 alpha1
 * - 실제 확인된 정책만 자격판정
 * - 연구제안은 현행 지원사업과 분리하여 '정책보완 후보'로만 제시
 * - 상담 결과를 익명 구조화 로그로 localStorage에 저장하여 행정분석 시연
 */
(function () {
  'use strict';

  const ENGINE_VERSION = '2.0-alpha1';
  const LOG_KEY = 'gn_welfare_v2_diagnosis_logs';
  const MAX_LOGS = 1000;

  const STATUS = {
    ELIGIBLE: { label: '기초 자격 충족', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
    CONDITIONAL: { label: '조건부 적합·행정확인 필요', cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: '🟡' },
    NEED_MORE_INFO: { label: '추가정보 필요', cls: 'bg-sky-100 text-sky-800 border-sky-200', icon: '🔎' },
    INELIGIBLE: { label: '현재 기준 부적합', cls: 'bg-rose-100 text-rose-800 border-rose-200', icon: '⛔' }
  };

  const FIELD_LABELS = {
    region: '거주지역', gender: '성별', age: '연령', fisherStatus: '어업경영체 등록상태',
    isVulnerable: '취약계층 여부', isCoreVillage: '핵심마을 여부'
  };

  const FAILURE_LABELS = {
    REGION_REQUIRED: '해당 사업의 지역요건을 충족하지 않음',
    GENDER_FEMALE_REQUIRED: '여성 대상 사업임',
    AGE_MIN_51: '만 51세 이상 요건을 충족하지 않음',
    FISHER_REGISTRATION_REQUIRED: '어업경영체 등록요건을 충족하지 않음',
    AGE_65_OR_MORE: '만 65세 이상 요건',
    VULNERABLE_GROUP: '취약계층 요건',
    CORE_VILLAGE: '핵심마을 요건'
  };

  function getPoliciesByStatus(status) {
    return (window.V2_POLICY_DB || []).filter(p => p.status === status);
  }

  function getFormProfile() {
    const gender = getValue('diagGender', '');
    const age = parseInt(getValue('diagAge', '0'), 10) || 0;
    const region = getValue('diagRegion', '');
    const fisherStatus = getValue('diagFisherStatus', getChecked('diagIsFisher') ? 'REGISTERED' : 'UNREGISTERED');

    return {
      gender,
      age,
      region,
      fisherStatus,
      isIsland: getChecked('diagIsIsland'),
      isPregnant: getChecked('diagIsPregnant'),
      isDisabled: getChecked('diagIsDisabled'),
      isVulnerable: getChecked('diagIsVulnerable'),
      isCoreVillage: getChecked('diagIsCoreVillage'),
      needs: getCheckedValues('input[name="diagNeed"]'),
      barriers: getCheckedValues('input[name="diagBarrier"]')
    };
  }

  function getValue(id, fallback) {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  }

  function getChecked(id) {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector + ':checked')).map(el => el.value);
  }

  function compare(profile, rule) {
    const actual = profile[rule.field];
    if (actual === undefined || actual === null || actual === '') {
      return { state: 'UNKNOWN', rule };
    }
    switch (rule.op) {
      case 'eq': return { state: actual === rule.value ? 'PASS' : 'FAIL', rule, actual };
      case 'gte': return { state: Number(actual) >= Number(rule.value) ? 'PASS' : 'FAIL', rule, actual };
      case 'lte': return { state: Number(actual) <= Number(rule.value) ? 'PASS' : 'FAIL', rule, actual };
      case 'in': return { state: rule.value.includes(actual) ? 'PASS' : 'FAIL', rule, actual };
      case 'truthy': return { state: !!actual ? 'PASS' : 'FAIL', rule, actual };
      default: return { state: 'UNKNOWN', rule, actual };
    }
  }

  function evaluatePolicy(policy, profile) {
    if (policy.status !== 'ACTIVE_VERIFIED') {
      return { policy, status: 'NOT_APPLICABLE', pass: [], fail: [], unknown: [], manual: [] };
    }

    const rules = policy.rules || {};
    const allResults = (rules.all || []).map(r => compare(profile, r));
    const anyResults = (rules.any || []).map(r => compare(profile, r));
    const fail = allResults.filter(r => r.state === 'FAIL');
    const unknown = allResults.filter(r => r.state === 'UNKNOWN');
    const pass = allResults.filter(r => r.state === 'PASS');

    let anyState = 'NOT_USED';
    let anyPass = [];
    let anyFail = [];
    let anyUnknown = [];
    if (anyResults.length) {
      anyPass = anyResults.filter(r => r.state === 'PASS');
      anyFail = anyResults.filter(r => r.state === 'FAIL');
      anyUnknown = anyResults.filter(r => r.state === 'UNKNOWN');
      if (anyPass.length) anyState = 'PASS';
      else if (anyUnknown.length) anyState = 'UNKNOWN';
      else anyState = 'FAIL';
    }

    const manual = rules.manualConfirmations || [];
    let status = 'ELIGIBLE';
    if (fail.length || anyState === 'FAIL') status = 'INELIGIBLE';
    else if (unknown.length || anyState === 'UNKNOWN') status = 'NEED_MORE_INFO';
    else if (manual.length) status = 'CONDITIONAL';

    return {
      policy,
      status,
      pass: pass.concat(anyPass),
      fail: fail.concat(anyState === 'FAIL' ? anyFail : []),
      unknown: unknown.concat(anyState === 'UNKNOWN' ? anyUnknown : []),
      manual
    };
  }

  function deriveGapTypes(profile, evaluations) {
    const gaps = new Set();

    // 이용자가 직접 호소한 장벽
    profile.barriers.forEach(code => gaps.add(code));

    // 미등록/비공식 노동은 연구상 제도·정보·관계 공백 위험이 큰 집단으로 별도 신호
    if (profile.fisherStatus === 'UNREGISTERED' || profile.fisherStatus === 'UNPAID_FAMILY') {
      gaps.add('INSTITUTIONAL');
    }

    return Array.from(gaps);
  }

  function matchResearchProposals(profile, gapTypes) {
    if (!gapTypes.length) return [];
    const proposals = getPoliciesByStatus('RESEARCH_PROPOSAL');
    return proposals
      .map(p => {
        let score = 0;
        (p.welfareDomains || []).forEach(d => { if (profile.needs.includes(d)) score += 3; });
        (p.gapFocus || []).forEach(g => { if (gapTypes.includes(g)) score += 2; });
        if (profile.isIsland && (p.welfareDomains || []).includes('MOBILITY')) score += 2;
        if (profile.gender === 'FEMALE' && p.tag === 'WOMEN') score += 1;
        if (profile.age >= 65 && p.tag === 'SENIOR') score += 1;
        if ((profile.fisherStatus === 'UNREGISTERED' || profile.fisherStatus === 'UNPAID_FAMILY') &&
            ['RP-CORE-04', 'RP-SUP-01', 'RP-SUP-05'].includes(p.id)) score += 3;
        return { p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.p);
  }

  function profileSummary(profile) {
    const gender = profile.gender === 'FEMALE' ? '여성' : '남성';
    const fisherMap = {
      REGISTERED: '어업경영체 등록', UNPAID_FAMILY: '무급가족종사', UNREGISTERED: '미등록 종사', UNKNOWN: '등록상태 미확인'
    };
    const flags = [fisherMap[profile.fisherStatus] || '등록상태 미확인'];
    if (profile.isIsland) flags.push('도서·낙도');
    if (profile.isPregnant) flags.push('임신·출산');
    if (profile.isDisabled) flags.push('장애·관절질환');
    if (profile.isVulnerable) flags.push('취약계층');
    return `${profile.region} / 만 ${profile.age}세 / ${gender} / ${flags.join(' · ')}`;
  }

  function outcomeCard(ev) {
    const s = STATUS[ev.status];
    const pass = ev.pass.map(x => x.rule.label).join(', ');
    const fail = ev.fail.map(x => FAILURE_LABELS[x.rule.code] || x.rule.label).join(', ');
    const unknown = ev.unknown.map(x => x.rule.label).join(', ');
    const manual = ev.status === 'INELIGIBLE' ? '' : ev.manual.map(x => x.label).join(', ');

    let details = '';
    if (pass) details += `<div class="text-emerald-800"><strong>충족:</strong> ${escapeV2(pass)}</div>`;
    if (fail) details += `<div class="text-rose-700"><strong>미충족:</strong> ${escapeV2(fail)}</div>`;
    if (unknown) details += `<div class="text-sky-700"><strong>추가입력:</strong> ${escapeV2(unknown)}</div>`;
    if (manual) details += `<div class="text-amber-800"><strong>행정확인:</strong> ${escapeV2(manual)}</div>`;

    return `
      <div class="mt-2 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="font-black text-slate-900 text-[13px]">${escapeV2(ev.policy.shortName || ev.policy.name)}</div>
          <span class="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border ${s.cls}">${s.icon} ${s.label}</span>
        </div>
        <div class="mt-1 text-[11px] text-slate-700">${escapeV2(ev.policy.benefit)}</div>
        <div class="mt-1.5 text-[10px] space-y-0.5">${details}</div>
        <div class="mt-1.5 p-1.5 bg-slate-50 rounded-lg text-[9px] text-slate-500">
          <strong>근거:</strong> ${escapeV2(ev.policy.sourceLabel)}<br>
          <strong>확인일:</strong> ${escapeV2(ev.policy.verifiedOn || '미기재')}
        </div>
      </div>`;
  }

  function proposalCard(p) {
    return `
      <div class="mt-1.5 p-2 rounded-xl border border-violet-200 bg-violet-50">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-violet-900 text-[11px]">💡 ${escapeV2(p.shortName || p.name)}</strong>
          <span class="text-[9px] bg-violet-200 text-violet-900 px-1.5 py-0.5 rounded-full">${escapeV2(p.proposalTier || '연구제안')}</span>
        </div>
        <div class="text-[10px] text-violet-800 mt-1">${escapeV2(p.benefit)}</div>
        <div class="text-[9px] text-violet-700 mt-1">※ 현행 지원사업이 아니라 연구보고서의 정책보완 후보입니다.</div>
      </div>`;
  }

  function renderDiagnosis(profile, evaluations, gaps, proposals) {
    const activeRelevant = evaluations.filter(ev => {
      if (!profile.needs.length) return true;
      return ev.policy.welfareDomains.some(d => profile.needs.includes(d));
    });
    const priority = activeRelevant.length ? activeRelevant : evaluations;
    const counts = priority.reduce((acc, ev) => { acc[ev.status] = (acc[ev.status] || 0) + 1; return acc; }, {});

    const needText = profile.needs.length
      ? profile.needs.map(n => window.V2_NEED_LABELS[n] || n).join(', ')
      : '선택하지 않음';

    const gapHtml = gaps.length
      ? gaps.map(g => `<span class="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">${escapeV2((window.V2_GAP_DEFINITIONS[g] || {}).short || g)}</span>`).join('')
      : '<span class="text-emerald-700 font-bold">현재 입력기준에서 별도 장벽 신호가 선택되지 않았습니다.</span>';

    const resultCards = priority.map(outcomeCard).join('');
    const proposalHtml = proposals.length
      ? `<div class="mt-3 pt-2 border-t"><div class="font-black text-violet-900 text-[12px]">🔧 미충족 수요에 대한 정책보완 후보</div>${proposals.map(proposalCard).join('')}</div>`
      : '';

    const text = `
      <div class="mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
        <div class="font-black text-slate-900">🎯 v2 실제조건 기반 맞춤판정</div>
        <div class="text-[11px] text-slate-700 mt-1">${escapeV2(profileSummary(profile))}</div>
        <div class="text-[10px] text-slate-600 mt-1"><strong>현재 필요:</strong> ${escapeV2(needText)}</div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 text-center mb-2">
        <div class="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100"><div class="font-black text-emerald-800">${counts.ELIGIBLE || 0}</div><div class="text-[9px]">기초충족</div></div>
        <div class="bg-amber-50 rounded-lg p-1.5 border border-amber-100"><div class="font-black text-amber-800">${counts.CONDITIONAL || 0}</div><div class="text-[9px]">조건부</div></div>
        <div class="bg-rose-50 rounded-lg p-1.5 border border-rose-100"><div class="font-black text-rose-800">${counts.INELIGIBLE || 0}</div><div class="text-[9px]">부적합</div></div>
      </div>
      <div class="mb-2"><div class="font-bold text-[11px] text-slate-700 mb-1">사각지대 신호</div>${gapHtml}</div>
      <div class="text-[10px] text-slate-500 mb-1">현재 v2 alpha1의 검증 DB 범위는 <strong>남해군 2026 공식사업 2건</strong>입니다. 공식자료에서 세부 자격을 확인한 정책만 실제 판정하며, 다른 시군의 미수록 사업을 '없음'으로 단정하지 않습니다.</div>
      ${resultCards || '<div class="p-2 bg-slate-50 rounded-xl text-slate-600">현재 검증 DB에서 판정 가능한 현행사업이 없습니다.</div>'}
      ${proposalHtml}
    `;

    renderBotMessage(text, [], []);
  }

  function saveDiagnosisLog(profile, evaluations, gaps, proposals) {
    const logs = readLogs();
    const failCodes = [];
    evaluations.forEach(ev => ev.fail.forEach(x => failCodes.push(x.rule.code)));

    logs.unshift({
      id: 'D-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      region: profile.region,
      ageBand: ageBand(profile.age),
      gender: profile.gender,
      fisherStatus: profile.fisherStatus,
      isIsland: profile.isIsland,
      needs: profile.needs,
      barriers: profile.barriers,
      outcomeCounts: evaluations.reduce((acc, ev) => { acc[ev.status] = (acc[ev.status] || 0) + 1; return acc; }, {}),
      evaluatedPolicyIds: evaluations.map(ev => ev.policy.id),
      failReasonCodes: Array.from(new Set(failCodes)),
      gapTypes: gaps,
      proposalIds: proposals.map(p => p.id)
    });
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  }

  function readLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function ageBand(age) {
    if (age < 20) return '0-19';
    if (age < 40) return '20-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    if (age < 65) return '60-64';
    if (age < 75) return '65-74';
    if (age < 85) return '75-84';
    return '85+';
  }

  function countBy(logs, getter) {
    const out = {};
    logs.forEach(log => {
      const vals = getter(log);
      (Array.isArray(vals) ? vals : [vals]).filter(Boolean).forEach(v => { out[v] = (out[v] || 0) + 1; });
    });
    return out;
  }

  function topRows(obj, labelFn, limit = 8) {
    const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (!rows.length) return '<div class="text-xs text-slate-400">아직 축적된 데이터가 없습니다.</div>';
    return rows.map(([k, v]) => `<div class="flex justify-between py-1 border-b border-slate-100"><span>${escapeV2(labelFn(k))}</span><strong>${v}건</strong></div>`).join('');
  }

  window.openAdminDashboard = function () {
    const modal = document.getElementById('adminAnalyticsModal');
    if (!modal) return;
    renderAdminDashboard();
    modal.classList.remove('hidden');
  };

  window.closeAdminDashboard = function () {
    const modal = document.getElementById('adminAnalyticsModal');
    if (modal) modal.classList.add('hidden');
  };

  function renderAdminDashboard() {
    const logs = readLogs();
    const regionCounts = countBy(logs, x => x.region);
    const gapCounts = countBy(logs, x => x.gapTypes || []);
    const needCounts = countBy(logs, x => x.needs || []);
    const failCounts = countBy(logs, x => x.failReasonCodes || []);

    const totalEl = document.getElementById('adminTotalCases');
    if (totalEl) totalEl.textContent = logs.length.toLocaleString('ko-KR');

    const regionEl = document.getElementById('adminRegionStats');
    if (regionEl) regionEl.innerHTML = topRows(regionCounts, x => x);
    const gapEl = document.getElementById('adminGapStats');
    if (gapEl) gapEl.innerHTML = topRows(gapCounts, x => (window.V2_GAP_DEFINITIONS[x] || {}).label || x);
    const needEl = document.getElementById('adminNeedStats');
    if (needEl) needEl.innerHTML = topRows(needCounts, x => window.V2_NEED_LABELS[x] || x);
    const failEl = document.getElementById('adminFailStats');
    if (failEl) failEl.innerHTML = topRows(failCounts, x => FAILURE_LABELS[x] || x);

    const recentEl = document.getElementById('adminRecentCases');
    if (recentEl) {
      recentEl.innerHTML = logs.slice(0, 10).map(log => `
        <div class="p-2 border rounded-xl bg-slate-50 text-[10px]">
          <div class="font-bold text-slate-800">${escapeV2(log.region)} · ${escapeV2(log.ageBand)} · ${log.gender === 'FEMALE' ? '여성' : '남성'}</div>
          <div class="text-slate-600 mt-0.5">수요: ${escapeV2((log.needs || []).map(n => window.V2_NEED_LABELS[n] || n).join(', ') || '미선택')}</div>
          <div class="text-rose-700 mt-0.5">사각지대: ${escapeV2((log.gapTypes || []).map(g => (window.V2_GAP_DEFINITIONS[g] || {}).short || g).join(', ') || '없음')}</div>
        </div>`).join('') || '<div class="text-xs text-slate-400">아직 축적된 판정기록이 없습니다.</div>';
    }
  }

  window.exportV2DiagnosisCsv = function () {
    const logs = readLogs();
    if (!logs.length) { alert('내보낼 판정기록이 없습니다.'); return; }
    const headers = ['id','timestamp','engineVersion','region','ageBand','gender','fisherStatus','isIsland','needs','barriers','gapTypes','failReasonCodes','proposalIds'];
    const lines = [headers.join(',')].concat(logs.map(log => headers.map(h => csvCell(Array.isArray(log[h]) ? log[h].join('|') : log[h])).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gyeongnam_fishing_welfare_v2_diagnosis_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  function csvCell(v) {
    const s = v === undefined || v === null ? '' : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  window.clearV2DiagnosisLogs = function () {
    if (!confirm('이 기기에 저장된 v2 시연용 판정기록을 모두 삭제하시겠습니까?')) return;
    localStorage.removeItem(LOG_KEY);
    renderAdminDashboard();
  };

  // 기존 v1 진단함수를 실제조건 기반 v2 엔진으로 교체
  window.executeDiagnosis = function (e) {
    e.preventDefault();
    closeDiagnosisModal();

    const profile = getFormProfile();
    renderUserMessage(`[v2 맞춤판정] ${profileSummary(profile)}`);

    const active = getPoliciesByStatus('ACTIVE_VERIFIED');
    const evaluations = active.map(p => evaluatePolicy(p, profile));
    const gaps = deriveGapTypes(profile, evaluations);
    const proposals = matchResearchProposals(profile, gaps);

    renderDiagnosis(profile, evaluations, gaps, proposals);
    saveDiagnosisLog(profile, evaluations, gaps, proposals);
  };

  // v2 정책 DB를 사용하는 정책목록
  window.openPolicyModal = function (category = 'ALL') {
    const modal = document.getElementById('policyModal');
    if (modal) modal.classList.remove('hidden');
    window.switchPolicyCategory(category);
  };

  window.switchPolicyCategory = function (cat) {
    window.currentV2PolicyCategory = cat;
    ['ALL','WOMEN','PREGNANT','SENIOR','DISABLED','PROPOSAL'].forEach(c => {
      const btn = document.getElementById('polCat' + c);
      if (!btn) return;
      btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg ' + (c === cat ? 'bg-ocean-600 text-white shadow' : 'bg-slate-100 text-slate-600');
    });
    window.renderPolicyList();
  };

  window.renderPolicyList = function () {
    const kwEl = document.getElementById('policySearchInput');
    const kw = (kwEl ? kwEl.value : '').trim().toLowerCase();
    const listEl = document.getElementById('policyModalList');
    if (!listEl) return;
    const cat = window.currentV2PolicyCategory || 'ALL';

    const filtered = (window.V2_POLICY_DB || []).filter(p => {
      const targetText = (p.target || []).join(' ');
      const catMatch = cat === 'ALL' ||
        (cat === 'PROPOSAL' && p.status === 'RESEARCH_PROPOSAL') ||
        p.tag === cat ||
        (cat === 'PREGNANT' && /임신|출산|산후/.test(targetText)) ||
        (cat === 'DISABLED' && /장애|거동불편/.test(targetText));
      const hay = [p.name, p.shortName, p.category, p.benefit, ...(p.target || []), ...(p.regions || []), ...(p.welfareDomains || []).map(d => window.V2_NEED_LABELS[d] || d)].join(' ').toLowerCase();
      return catMatch && (!kw || hay.includes(kw));
    });

    listEl.innerHTML = filtered.map(p => {
      const active = p.status === 'ACTIVE_VERIFIED';
      const badge = active
        ? '<span class="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">현행·공식확인</span>'
        : '<span class="text-[9px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded font-bold">연구 제안</span>';
      return `
        <div class="p-2.5 bg-white border ${active ? 'border-emerald-200' : 'border-violet-200'} rounded-xl shadow-sm text-xs">
          <div class="font-black text-slate-900 text-sm flex items-start justify-between gap-2"><span>${escapeV2(p.shortName || p.name)}</span>${badge}</div>
          <div class="mt-1 text-slate-600"><strong>대상:</strong> ${escapeV2((p.target || []).join(', '))}</div>
          <div class="mt-1 text-slate-700"><strong>${active ? '지원내용' : '제안내용'}:</strong> ${escapeV2(p.benefit)}</div>
          <div class="mt-1 text-[9px] text-slate-500"><strong>근거:</strong> ${escapeV2(p.sourceLabel || '자료 미기재')}</div>
          ${active ? `<div class="mt-2 text-right"><button onclick="selectPolicyForDiagnosis('${p.id}')" class="px-2.5 py-1 bg-ocean-600 text-white rounded-lg text-[11px] font-bold">✨ 실제조건 진단</button></div>` : ''}
        </div>`;
    }).join('') || '<div class="p-4 text-center text-slate-400 text-xs">해당 조건의 정책이 없습니다.</div>';
  };

  // 자유검색도 v2 정책DB를 사용. '일' 한 글자만으로 구인구직으로 오인하던 v1 조건 제거.
  window.processLocalRuleEngine = function (query) {
    const q = query.trim().toLowerCase();
    const jobTerms = ['일자리','일손','구인','구직','채용','취업','작업자','대체인력'];
    const isJobQuery = jobTerms.some(t => q.includes(t));

    const policies = (window.V2_POLICY_DB || []).filter(p => {
      const hay = [p.name, p.shortName, p.category, p.benefit, ...(p.target || []), ...(p.regions || [])].join(' ').toLowerCase();
      return q && hay.includes(q) || (q && q.split(/\s+/).some(token => token.length >= 2 && hay.includes(token)));
    });

    let matched = policies;
    if (!matched.length) {
      const termMap = [
        { terms: ['여성','검진','근골격'], filter: p => p.tag === 'WOMEN' },
        { terms: ['고령','노인','주치의','원격진료'], filter: p => p.tag === 'SENIOR' },
        { terms: ['이동','교통','섬','도서'], filter: p => (p.welfareDomains || []).includes('MOBILITY') },
        { terms: ['서류','신청','행정','정보'], filter: p => (p.welfareDomains || []).includes('ADMIN_INFO') },
        { terms: ['돌봄','간병'], filter: p => (p.welfareDomains || []).includes('CARE') }
      ];
      termMap.forEach(m => { if (m.terms.some(t => q.includes(t))) matched.push(...(window.V2_POLICY_DB || []).filter(m.filter)); });
      matched = Array.from(new Map(matched.map(p => [p.id, p])).values());
    }

    const jobs = isJobQuery && typeof GYEONGNAM_JOBS !== 'undefined' ? GYEONGNAM_JOBS : [];
    const adapters = matched.slice(0, 6).map(p => ({
      ...p,
      name: `${p.status === 'RESEARCH_PROPOSAL' ? '[연구 제안] ' : '[현행 공식확인] '}${p.shortName || p.name}`,
      benefit: p.benefit,
      isBenchmark: false,
      cost: p.cost || (p.status === 'RESEARCH_PROPOSAL' ? '연구 제안사업' : '세부 지침 확인')
    }));

    let text = matched.length
      ? `**'${escapeV2(query)}'**와 관련된 v2 정책 DB 결과입니다. 현행 공식확인 사업과 연구 제안사업을 구분하여 표시합니다.`
      : `**'${escapeV2(query)}'**와 직접 일치하는 검증 정책을 현재 v2 DB에서 찾지 못했습니다. [맞춤진단]에서 생활수요와 장벽을 입력하면 정책공백까지 분석합니다.`;

    return { text, policies: adapters, jobs };
  };

  window.selectPolicyForDiagnosis = function () {
    closePolicyModal();
    startEligibilityDiagnosis();
  };

  function escapeV2(v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function installVersionLabels() {
    const subtitle = document.querySelector('header p');
    if (subtitle && !subtitle.textContent.includes('v2.0')) subtitle.textContent = subtitle.textContent.replace(/v3\.5/i, 'v2.0 판정엔진 alpha1');
    const h = document.querySelector('#diagnosisModal h3 span');
    if (h) h.textContent = '원스톱 어촌복지 자격 진단 v2';
  }

  document.addEventListener('DOMContentLoaded', function () {
    installVersionLabels();
    // v2 정책목록을 최초 렌더링할 수 있도록 기본값 설정
    window.currentV2PolicyCategory = 'ALL';
  });
})();
