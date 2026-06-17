# 저장소 지침

## 프로젝트 구조와 모듈 구성

이 저장소는 Node.js/TypeScript CLI 스캐폴드입니다. 구현 코드는 `src/` 아래에 두고, 테스트는 `tests/` 아래 또는 소스 옆의 `*.test.*` 파일로 둡니다. 정적 자산은 런타임에 따라 `assets/` 또는 `public/`에 둡니다. 최상위 파일은 프로젝트 메타데이터, 문서, 설정, 잠금 파일로 제한합니다.

## 빌드, 테스트, 개발 명령

저장소 루트에서 다음 명령을 사용합니다.

- `npm install`: Node.js 도구 체인을 설치합니다.
- `npm run build`: CLI를 `dist/cli.js`로 번들링합니다.
- `npm run typecheck`: 엄격한 설정으로 TypeScript 검사를 실행합니다.
- `npm test`: Vitest 테스트 스위트를 실행합니다.
- `npm run lint`: Biome 린트 검사를 실행합니다.
- `npm run format:check`: Biome 포맷을 확인합니다.
- `node dist/cli.js --help`: 빌드된 CLI 표면을 확인합니다.
- `node dist/cli.js doctor`: 로컬 런타임 진단을 확인합니다.

## 코딩 스타일과 이름 규칙

파일과 디렉터리 이름은 간결하고 설명적으로 작성합니다. 문서와 자산 파일명은 `design-notes.md` 또는 `button-icons.svg`처럼 소문자 케밥 케이스를 선호합니다. TypeScript 코드는 엄격한 `tsconfig.json` 설정과 Biome 포맷/린트 규칙을 따릅니다. Markdown 파일은 ATX 제목, 짧은 문단, 명령이나 코드 조각을 보여줄 때 언어 태그가 있는 fenced code block을 사용합니다.

## 테스트 지침

Vitest가 설정되어 있습니다. 테스트 이름은 `cli-skeleton.test.ts` 또는 `source-graph-contract.test.ts`처럼 검증하는 동작이 분명하게 드러나게 작성합니다. 테스트는 `npm test`로 실행 가능하게 유지하고, 새 테스트 그룹이 워크플로에서 중요해지면 문서에 더 좁은 명령을 추가합니다.

## 커밋과 Pull Request 지침

현재 히스토리는 `Initial commit`만 포함하므로 자세한 규칙은 아직 확립되지 않았습니다. `Add popover positioning docs` 또는 `Create base UI module`처럼 짧고 명령형인 커밋 메시지를 사용합니다. Pull Request에는 간단한 요약, 검증 절차, 관련 이슈, UI에 보이는 변경의 스크린샷이나 녹화를 포함합니다.

## 에이전트 전용 지침

편집하기 전에 저장소 상태를 확인하고 관련 없는 로컬 변경을 덮어쓰지 않습니다. 프로젝트 구조, 도구, 워크플로가 바뀌면 이 가이드를 최신 상태로 유지합니다.
