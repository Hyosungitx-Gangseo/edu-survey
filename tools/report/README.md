# 보고서 PNG 생성 도구

관리자 페이지에는 포함되지 않습니다. 관리자 페이지에서 받은 CSV를 Claude에게 올리면, 이 도구로 같은 양식의 보고서 이미지를 만듭니다.

## 양식 (확정)
- **센터장 보고용**: 1페이지 요약 + 2페이지부터 주관식 응답 전문(원문 그대로, 문항별로 순서를 따로 섞음, 양이 많으면 여러 장)
  - 1페이지: 전체 만족도 / '만족' 이상 비율 / 가장 많이 꼽은 아쉬운 점 / 지난 회차 대비, 영역별 만족도(평균·불만족 이하·지난 회차 대비), 아쉬웠던 점 TOP 3, 상담사 주요 의견, 시사점 및 향후 조치
- **교육 담당자 피드백용**: 1페이지만 (주관식 원문 없음)
  - 전체 만족도 / 가장 낮은 영역 / 가장 높은 영역, 영역별 응답 분포, 아쉬웠던 점 전체, KEEP / CHANGE / TRY
- 상단에 보고서 종류 표시 박스 없음. 16:9 (1920×1080) PNG.
- 마감 전 CSV면 "중간 집계", 마감 후면 "최종 집계"로 표시.

## 요약 문구 (summary.json)
```json
{ "opinions": "", "insight": "", "actions": "", "keep": "", "change": "", "try": "" }
```
한 줄에 한 항목. `**굵게**`, `제목 — 내용`(제목 굵게), `지금 → 바뀔 모습`(뒤쪽 굵게). 비운 칸은 보고서에서 빠집니다.

## 실행
```bash
npm install html2canvas@1.4.1 --prefix /tmp/h2c   # cdnjs 접근이 막힌 환경이면
node tools/report/make-report.js --csv 응답.csv --title "2026.10.27 저점톡 교육 만족도 설문" \
  --start 2026-10-27 --end 2026-10-28 --summary summary.json --out out \
  --html2canvas /tmp/h2c/node_modules/html2canvas/dist/html2canvas.min.js
```
지난 회차와 비교하려면 `--prev 지난회차.csv --prev-title "..." --prev-start YYYY-MM-DD`를 추가합니다.

> 설문 응답(CSV)과 요약 문구는 이 저장소(공개)에 올리지 마세요.
