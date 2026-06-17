# ui_pop

`ui-pop`은 레거시 프런트엔드 화면에서 소스 우선 UI 와이어프레임과 디자인 명세 산출물을 생성하는 Node.js CLI입니다.

## 명령

```bash
npm install
npm run build
node dist/cli.js --help
node dist/cli.js doctor
node dist/cli.js analyze-source --help
```

Wave 0 CLI 표면은 의도적으로 작게 유지합니다. 소스 추출, UI IR 생성, 와이어프레임 렌더링, 런타임 검증은 이후 구현 웨이브에서 추가됩니다.

## 개발

```bash
npm run build
npm run typecheck
npm test
npm run lint
npm run format:check
```

이 CLI는 Node.js 22 이상을 대상으로 하며 PowerShell, bash, zsh에서 실행되도록 설계되었습니다.
