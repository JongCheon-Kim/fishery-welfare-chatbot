/*
 * 경상남도 어촌복지 원스톱 AI 도우미 v2.0 alpha1
 * 검증 정책 DB + 연구제안 포트폴리오
 *
 * 원칙
 * 1) ACTIVE_VERIFIED: 업로드된 공식 2026 시행계획에서 대상/내용을 확인한 사업만 자격판정에 사용
 * 2) RESEARCH_PROPOSAL: 연구보고서의 신규 정책사업. 현행 지원사업처럼 판정하지 않음
 * 3) 확인되지 않은 금액·자부담·신청기간은 임의 기입하지 않음
 */

window.V2_POLICY_DB = [
  {
    id: 'NH-2026-WF-HEALTH-01',
    status: 'ACTIVE_VERIFIED',
    name: '여성 농어업인 특수건강검진사업 추진 - 여성어업인 특화건강검진',
    shortName: '남해군 여성어업인 특화건강검진',
    category: '여성어업인',
    tag: 'WOMEN',
    welfareDomains: ['HEALTH'],
    regions: ['남해군'],
    target: ['남해군 실제 거주 여성어업인', '만 51세 이상', '어업경영체 등록', '검진 통보 대상자'],
    benefit: '여성어업인의 어업활동 관련 질환 예방과 건강복지 증진을 위한 특수건강검진 비용 지원(근골격계 등, 2년 주기).',
    cost: '공식 시행계획에서 사업비 지원을 확인함. 개인별 본인부담 여부·세부금액은 해당연도 지침 확인 필요.',
    documents: ['신분·거주 확인자료', '어업경영체 등록 확인자료', '검진 대상 통보 여부 확인'],
    agency: '남해군 수산자원과 수산진흥팀',
    contact: '055-860-8984',
    sourceLabel: '남해군 제5기 지역사회보장계획 2026년 연차별 시행계획, 세부사업 Ⅰ-2-5',
    sourceNote: '선정기준: 군에 주소지를 두고 실제 거주하는 만 51세 이상, 어업경영체 등록 여성어업인 중 검진 통보 받은 자. 대상규모 여성어업인 50명.',
    verifiedOn: '2026-08-10',
    rules: {
      all: [
        { field: 'region', op: 'in', value: ['남해군'], code: 'REGION_REQUIRED', label: '남해군 거주' },
        { field: 'gender', op: 'eq', value: 'FEMALE', code: 'GENDER_FEMALE_REQUIRED', label: '여성' },
        { field: 'age', op: 'gte', value: 51, code: 'AGE_MIN_51', label: '만 51세 이상' },
        { field: 'fisherStatus', op: 'eq', value: 'REGISTERED', code: 'FISHER_REGISTRATION_REQUIRED', label: '어업경영체 등록' }
      ],
      manualConfirmations: [
        { code: 'HEALTH_CHECK_NOTICE', label: '해당연도 검진 대상 통보 여부 확인' }
      ]
    }
  },
  {
    id: 'NH-2026-MED-DOCTOR-01',
    status: 'ACTIVE_VERIFIED',
    name: '군민 주치의 제도 운영',
    shortName: '남해군 군민 주치의·원격협진',
    category: '고령자',
    tag: 'SENIOR',
    welfareDomains: ['HEALTH', 'MOBILITY'],
    regions: ['남해군'],
    target: ['취약계층', '65세 이상 노인', '핵심마을 주민', '원격협진 가능 대상자'],
    benefit: '공공보건의료기관·방문건강관리와 연계한 건강관리·교육, 의료취약지 등록대상자 원격협진 및 일차 진료·의료상담.',
    cost: '이용자 개인부담 세부사항은 시행기관 확인 필요.',
    documents: ['대상자 등록 및 건강상태 확인자료(기관 확인)'],
    agency: '남해군 보건행정과 보건행정팀',
    contact: '055-860-8706',
    sourceLabel: '남해군 제5기 지역사회보장계획 2026년 연차별 시행계획, 세부사업 Ⅰ-2-6',
    sourceNote: '선정기준에는 취약계층, 65세 이상 노인, 핵심마을(15개마을)과 의료진의 원격협진 가능 판단이 포함됨.',
    verifiedOn: '2026-08-10',
    rules: {
      all: [
        { field: 'region', op: 'in', value: ['남해군'], code: 'REGION_REQUIRED', label: '남해군 거주' }
      ],
      any: [
        { field: 'age', op: 'gte', value: 65, code: 'AGE_65_OR_MORE', label: '만 65세 이상' },
        { field: 'isVulnerable', op: 'eq', value: true, code: 'VULNERABLE_GROUP', label: '취약계층' },
        { field: 'isCoreVillage', op: 'eq', value: true, code: 'CORE_VILLAGE', label: '핵심마을 주민' }
      ],
      manualConfirmations: [
        { code: 'REMOTE_MEDICAL_SUITABILITY', label: '의료진의 원격협진 가능 여부 판단' }
      ]
    }
  },

  /* 연구보고서의 15개 신규 정책사업 포트폴리오: 현행 자격판정 대상이 아니라 공백 보완 후보 */
  {
    id: 'RP-CORE-01', status: 'RESEARCH_PROPOSAL', name: '어복 순회진료·마음·재활케어', shortName: '어복 순회진료·마음·재활케어',
    category: '고령자', tag: 'SENIOR', welfareDomains: ['HEALTH', 'MOBILITY'], regions: ['경상남도 연안 7개 시군'],
    target: ['도서·외곽 고령·여성어업인'], benefit: '의료·마음건강·재활을 방문·순회 방식으로 연결하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SPATIAL', 'SUPPLY'], proposalTier: '핵심 1', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-CORE-02', status: 'RESEARCH_PROPOSAL', name: '든든 쉼드림 대체인력·돌봄백업', shortName: '든든 쉼드림 대체인력·돌봄백업',
    category: '일반어업인', tag: 'ALL', welfareDomains: ['CARE', 'INCOME_JOB'], regions: ['경상남도 연안 7개 시군'],
    target: ['질병·사고·출산·돌봄 어가'], benefit: '조업 대체인력과 돌봄 백업을 결합하는 노동·돌봄 통합형 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SUPPLY', 'INSTITUTIONAL'], proposalTier: '핵심 2', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-CORE-03', status: 'RESEARCH_PROPOSAL', name: '도서·외곽 연속이동 지원', shortName: '도서·외곽 연속이동 지원',
    category: '고령자', tag: 'SENIOR', welfareDomains: ['MOBILITY', 'HEALTH'], regions: ['경상남도 연안 7개 시군'],
    target: ['고령자·장애인·거동불편자'], benefit: '해상교통과 육상교통, 의료기관 이동을 끊김 없이 연계하는 교통연계형 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SPATIAL'], proposalTier: '핵심 3', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-CORE-04', status: 'RESEARCH_PROPOSAL', name: '여성·무급가족종사자 복지 파트너', shortName: '여성·무급가족종사자 복지 파트너',
    category: '여성어업인', tag: 'WOMEN', welfareDomains: ['ADMIN_INFO', 'INCOME_JOB'], regions: ['경상남도 연안 7개 시군'],
    target: ['여성·가족·미등록 종사자'], benefit: '제도상 지위 확인, 정책정보, 신청지원과 권리 안내를 묶는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INSTITUTIONAL', 'INFORMATION', 'ADMIN'], proposalTier: '핵심 4', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-CORE-05', status: 'RESEARCH_PROPOSAL', name: '어촌 주거안전·집수리 지원', shortName: '어촌 주거안전·집수리 지원',
    category: '취약가구', tag: 'ALL', welfareDomains: ['HOUSING_SAFETY'], regions: ['경상남도 연안 7개 시군'],
    target: ['독거·고령·장애가구'], benefit: '노후주택의 안전위험을 점검하고 집수리를 연계하는 주거·안전형 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SPATIAL', 'SUPPLY'], proposalTier: '핵심 5', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-CORE-06', status: 'RESEARCH_PROPOSAL', name: '어촌 식사·영양 밀착지원', shortName: '어촌 식사·영양 밀착지원',
    category: '고령자', tag: 'SENIOR', welfareDomains: ['FOOD_NUTRITION', 'CARE'], regions: ['경상남도 연안 7개 시군'],
    target: ['독거·고령부부·퇴원자'], benefit: '식사·영양 지원과 안부확인을 결합하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SUPPLY', 'RELATIONAL'], proposalTier: '핵심 6', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-01', status: 'RESEARCH_PROPOSAL', name: '비회원·미등록 안전망 지원', shortName: '비회원·미등록 안전망 지원',
    category: '일반어업인', tag: 'ALL', welfareDomains: ['ADMIN_INFO', 'INCOME_JOB'], regions: ['경상남도 연안 7개 시군'],
    target: ['비회원·비공식 노동자'], benefit: '어촌계 비회원·미등록·비공식 수산노동자를 사회보장과 공공지원으로 연결하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INSTITUTIONAL', 'INFORMATION', 'RELATIONAL'], proposalTier: '보완 1', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-02', status: 'RESEARCH_PROPOSAL', name: '고령어업인 은퇴·전환 지원', shortName: '고령어업인 은퇴·전환 지원',
    category: '고령자', tag: 'SENIOR', welfareDomains: ['INCOME_JOB'], regions: ['경상남도 연안 7개 시군'],
    target: ['고령·은퇴희망 어업인'], benefit: '은퇴·부분전환·승계·생활전환을 상담하고 관련 제도를 연결하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INSTITUTIONAL'], proposalTier: '보완 2', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-03', status: 'RESEARCH_PROPOSAL', name: '어촌 상생멘토링', shortName: '어촌 상생멘토링',
    category: '귀어·이주민', tag: 'ALL', welfareDomains: ['ADMIN_INFO', 'RELATION'], regions: ['경상남도 연안 7개 시군'],
    target: ['귀어인·이주민'], benefit: '지역정보·관계형성·정착지원과 갈등조정을 연결하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INFORMATION', 'RELATIONAL'], proposalTier: '보완 3', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-04', status: 'RESEARCH_PROPOSAL', name: '퇴원 후 재가복귀 지원', shortName: '퇴원 후 재가복귀 지원',
    category: '취약가구', tag: 'ALL', welfareDomains: ['HEALTH', 'CARE', 'FOOD_NUTRITION'], regions: ['경상남도 연안 7개 시군'],
    target: ['퇴원자·일시 기능저하자'], benefit: '퇴원 직후 의료·돌봄·식사·주거를 연계하는 사건대응형 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['SUPPLY'], proposalTier: '보완 4', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-05', status: 'RESEARCH_PROPOSAL', name: '찾아가는 복지행정 지원', shortName: '찾아가는 복지행정 지원',
    category: '고령자', tag: 'SENIOR', welfareDomains: ['ADMIN_INFO'], regions: ['경상남도 연안 7개 시군'],
    target: ['고령·디지털 취약자'], benefit: '현장 방문을 통해 정보안내·서류확인·신청을 지원하는 현장행정형 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INFORMATION', 'ADMIN'], proposalTier: '보완 5', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-SUP-06', status: 'RESEARCH_PROPOSAL', name: '다문화·계절노동 통합지원', shortName: '다문화·계절노동 통합지원',
    category: '외국인·다문화', tag: 'ALL', welfareDomains: ['ADMIN_INFO', 'HEALTH', 'RELATION'], regions: ['경상남도 연안 7개 시군'],
    target: ['다문화어가·외국인노동자'], benefit: '언어·건강·생활·권리 정보를 통합 제공하는 연구 제안사업.', cost: '연구 제안사업(행정 설계 필요)', documents: [],
    gapFocus: ['INFORMATION', 'RELATIONAL', 'INSTITUTIONAL'], proposalTier: '보완 6', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-LONG-01', status: 'RESEARCH_PROPOSAL', name: '어촌복지 제도기반 구축', shortName: '어촌복지 제도기반 구축',
    category: '제도기반', tag: 'ALL', welfareDomains: ['ADMIN_INFO'], regions: ['경상남도'],
    target: ['어촌 취약주민 전반'], benefit: '조례·계획·최소서비스 기준 등 제도기반을 구축하는 중장기 연구 제안과제.', cost: '중장기 제도화 과제', documents: [],
    gapFocus: ['INSTITUTIONAL'], proposalTier: '장기 1', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-LONG-02', status: 'RESEARCH_PROPOSAL', name: '행정자료 연계 위기발굴', shortName: '행정자료 연계 위기발굴',
    category: '제도기반', tag: 'ALL', welfareDomains: ['ADMIN_INFO', 'CARE'], regions: ['경상남도'],
    target: ['고립·재해·미발굴 가구'], benefit: '해양수산·복지·보건 행정자료를 연계하여 위기가구를 조기에 발견하는 중장기 연구 제안과제.', cost: '중장기 제도화 과제', documents: [],
    gapFocus: ['INFORMATION', 'RELATIONAL', 'SUPPLY'], proposalTier: '장기 2', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  },
  {
    id: 'RP-LONG-03', status: 'RESEARCH_PROPOSAL', name: '도서응급의료 광역협력체계', shortName: '도서응급의료 광역협력체계',
    category: '응급·이동', tag: 'ALL', welfareDomains: ['HEALTH', 'MOBILITY'], regions: ['경상남도 연안 도서지역'],
    target: ['도서주민·해상사고자'], benefit: '도서·연안 응급의료와 특수이송을 광역 협력체계로 연계하는 중장기 연구 제안과제.', cost: '중장기 제도화 과제', documents: [],
    gapFocus: ['SPATIAL', 'SUPPLY'], proposalTier: '장기 3', sourceLabel: '경상남도 어촌주민 복지 증진 정책사업 발굴 연구 제2차 통합보고서, 표 5-2'
  }
];

window.V2_GAP_DEFINITIONS = {
  INSTITUTIONAL: { label: '제도적 사각지대', short: '제도', description: '복지수요가 있지만 법령·사업지침·등록요건·소득/재산기준·정책대상 정의 등에 의해 수혜대상으로 인정되지 않는 상태.' },
  INFORMATION: { label: '정보 사각지대', short: '정보', description: '이용 가능한 정책이 있지만 사업 존재·지원내용·신청기간·자격요건·담당기관을 알지 못해 이용하지 못하는 상태.' },
  ADMIN: { label: '신청·행정 사각지대', short: '신청·행정', description: '정책을 알고 자격 가능성이 있어도 서류·인증·방문·처리절차 때문에 신청 또는 서비스 연계가 실패하는 상태.' },
  SPATIAL: { label: '공간·이동 사각지대', short: '공간·이동', description: '거리·해상교통·기상·대중교통·신체적 이동능력 때문에 실제 서비스를 이용하지 못하는 상태.' },
  SUPPLY: { label: '서비스 공급 사각지대', short: '서비스 공급', description: '선정·신청 후에도 실제 제공기관·인력이 없거나 서비스가 충분히 지속되지 않는 상태.' },
  RELATIONAL: { label: '관계·사회적 사각지대', short: '관계·사회', description: '마을관계·조직소속·갈등·낙인·개인정보 우려·사회적 고립 때문에 서비스에 접근하지 못하는 상태.' }
};

window.V2_NEED_LABELS = {
  HEALTH: '의료·건강',
  CARE: '돌봄',
  MOBILITY: '이동·교통',
  HOUSING_SAFETY: '주거·안전',
  INCOME_JOB: '소득·일자리',
  ADMIN_INFO: '행정·정보',
  FOOD_NUTRITION: '식사·영양',
  RELATION: '관계·고립'
};
