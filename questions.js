// 문항 정의 - apps-script/Code.gs 의 AREAS / ISSUES 와 동일하게 유지하세요.
window.SURVEY_QUESTIONS = {
  areas: [
    { name: '업무 연관성', desc: '현장 상담에서 바로 활용할 수 있는 내용이었나요?' },
    { name: '강사 전달력', desc: '강사의 설명이 이해하기 쉬웠나요?' },
    { name: '교육 방식', desc: '강의식·실습·롤플레이 등 진행 방식이 적절했나요?' },
    { name: '교육 시간·일정', desc: '교육 시간대, 분량, 횟수가 적절했나요?' },
    { name: '교육 자료', desc: '교육 자료가 충분하고 이해하기 쉬웠나요?' }
  ],
  scale: [
    { value: 5, label: '매우만족' },
    { value: 4, label: '만족' },
    { value: 3, label: '보통' },
    { value: 2, label: '불만족' },
    { value: 1, label: '매우불만족' }
  ],
  issues: [
    '실무와 맞지 않는 내용',
    '이미 아는 내용의 반복',
    '교육 시간이 너무 길거나 잦음',
    '일방적인 강의식 진행',
    '업무(콜) 공백에 대한 부담',
    '교육 자료가 부족하거나 이해하기 어려움',
    '기타'
  ],
  issueNone: '특별히 없음',
  texts: {
    issueDetail: '2. 아쉬웠던 점의 구체적인 상황',
    improve: '3. 개선 사항',
    wish: '4. 향후 희망하는 교육'
  }
};
