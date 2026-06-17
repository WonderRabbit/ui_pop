# Wireframe Source Autogen History

## 2026-06-18

`ui-pop`의 첫 번째 Node/TypeScript CLI MVP를 만들었다. 목표는 legacy frontend
source file에서 화면의 as-is 구조를 추출하고, 이후 수정 가능한 설계 산출물로
이어갈 수 있는 최소 동작 경로를 확보하는 것이다.

## 구현 범위

- `analyze-source`: React/Next.js TSX 화면 entry를 분석해 `manifest.json`,
  `ui-ir.json`, `source-graph.json`, `source-evidence.json`을 생성한다.
- `draft`: `ui-ir.json`을 기반으로 `ui.md` UI 정의서 초안을 생성한다.
- `render-wireframe`: `ui-ir.json`을 기반으로 수정 가능한 `wireframe.html`을
  생성한다.
- `validate-runtime`: Playwright로 실제 runtime 화면을 열고 source 기반 UI
  fact를 검증해 `runtime-evidence.json`을 생성한다.
- `fixture:runtime`: `/orders`, `/missing-label`, `/mismatch` fixture route를
  제공해 happy path와 mismatch path를 반복 검증한다.
- `smoke`: build, source analysis, markdown draft, wireframe render, runtime
  validation을 하나의 end-to-end 흐름으로 실행한다.

## 검증 기록

최종 ULW 루프는 15개 목표와 45개 success criterion을 모두 통과했다.

- `npm run check`: typecheck, Vitest 11 files / 30 tests, Biome lint,
  format check, build 통과.
- `npm run smoke`: source-to-wireframe-to-runtime validation 흐름 통과.
- `npm audit --json`: total vulnerabilities 0.
- Playwright Chromium으로 생성된 `wireframe.html`을 열어 화면 제목, 조회조건,
  버튼, 결과 컬럼, 상태 영역을 검증하고 스크린샷을 남겼다.

## 현재 한계

현재 MVP는 React/Next.js `.tsx` source-first static extraction과 local
Playwright runtime validation만 지원한다.

아직 제공하지 않는 기능:

- PPTX 또는 editable slide deck export.
- Figma export/import.
- AI-assisted extraction.
- Vue, Svelte, Angular source extraction.
- production website crawling.

## 다음 방향

다음 단계는 browser capture와 editable deck export다.

- 실제 route의 layout, screenshot, visible text를 더 풍부하게 캡처한다.
- source fact, runtime evidence, screenshot을 병합해 UI 정의서를 보강한다.
- 검증된 evidence에서 editable document 또는 deck artifact로 export한다.
