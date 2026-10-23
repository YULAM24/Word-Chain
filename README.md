# 끝말 사전 · Windows

TypeScript + Electron으로 만든 작은 끝말잇기 보조도구입니다. 기본 360×440 창과 항상 위 고정을 지원합니다. 임의 단어를 넣지 않고 **표준국어대사전 공식 Open API**만 조회합니다.

## EXE 다운로드

[Windows x64 EXE 다운로드](https://github.com/YULAM24/Word-Chain/releases/latest/download/Word-Chain-Windows-x64.exe) · [릴리스 목록](https://github.com/YULAM24/Word-Chain/releases)

릴리스 게시 후 이용할 수 있습니다. 설치 없이 실행하는 portable 버전이며 Node.js 설치가 필요 없습니다. 사전 검색에는 본인 인증키가 필요합니다. 코드 서명이 없어 Windows 보안 경고가 표시될 수 있습니다.

## 소스로 Windows에서 실행

Node.js 22 이상을 설치하고 프로젝트 폴더에서 PowerShell로 실행하세요.

```powershell
npm ci
npm start
```

독립 실행 파일 만들기:

```powershell
npm run dist:win
```

`release` 폴더에 Windows x64 portable EXE가 생성됩니다. 코드 서명은 포함하지 않습니다. 배포 빌드는 Windows에서 수행하는 것을 권장합니다.

## 인증키

[국립국어원 표준국어대사전 Open API 안내](https://stdict.korean.go.kr/openapi/openApiInfo.do)에서 이용 신청 후 인증키를 발급받아 앱의 **설정**에 입력하세요. 키는 실행 중 메모리에만 보관하며 파일에 저장하지 않습니다. 재실행하면 다시 입력해야 합니다. 인증키를 소스나 Git에 넣지 마세요. HTTPS 인터넷 연결이 필요합니다.

## 기능

- 시작 글자 입력 → Enter 또는 검색. 기본은 명사·두 글자 이상 한글 단어입니다.
- **후보 넘기기**: 이번 검색에서 현재 후보를 건너뜁니다. 100건씩 추가 조회하며 API 시작 위치 1,000까지 탐색합니다. 전체 사전 다운로드가 아닙니다.
- **사용·복사**: 클립보드에 복사하고 이번 게임의 사용 단어에서 제외합니다. 마지막 글자로 다음 검색을 시작합니다. 게임에 직접 붙여넣으세요.
- **턴 넘기기**: 검색을 비우고 다음 턴을 기다립니다. 게임의 패스 버튼을 대신 누르지 않습니다.
- **새 게임**: 사용 단어 기록 초기화. **사전 원문**: 등재된 뜻 확인.
- **항상 위**: 기본 켜짐. 창 크기 조절 가능. 독점 전체 화면 게임에서는 창 고정이 보이지 않을 수 있으므로 창 모드/테두리 없는 창 모드를 사용하세요.

표제어의 붙임표·꺾쇠·동음이의어 번호는 입력용으로 제거합니다. 두음법칙 변환, 상대방 단어 자동 감지, 게임별 금지어 판정은 지원하지 않습니다. 두음법칙 적용 시 바뀐 글자로 직접 검색하세요. 사전 등재어라도 게임 규칙에 따라 거부될 수 있습니다.

## 개발·검증

```sh
npm run build
npm test
```

TypeScript 컴파일과 합성 API 응답을 이용한 필터·오류·요청 테스트입니다. 실제 인증키를 통한 검색, Windows 화면 표시와 EXE 실행은 별도 확인이 필요합니다. GUI에는 데스크톱 환경이 필요합니다.

## 프로그램 소개 페이지 · API 신청용

`docs/index.html`은 API 사용 목적, 프로그램 기능, 인증키 처리 방식을 설명하는 정적 소개 페이지입니다.

GitHub 저장소에서 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택하고, **Actions → Publish introduction page → Run workflow**로 게시합니다. `main` 브랜치의 소개 페이지 변경 시에도 자동 게시됩니다.

기본 예상 주소는 `https://YULAM24.github.io/Word-Chain/`입니다. 실제 배포 성공과 페이지 접속을 확인한 뒤 인증키 신청의 사용 URL에 입력하세요. 소개 페이지 URL의 접수 가능 여부와 인증키 발급은 국립국어원 정책에 따릅니다.

## 릴리스 자동화

`v0.1.0` 형식의 버전 태그를 푸시하면 GitHub Actions의 **Build Windows release**가 Windows에서 의존성 설치, 테스트, EXE 빌드를 수행한 후 GitHub Release에 EXE와 SHA-256 체크섬을 게시합니다. 버전 태그와 package.json 버전이 일치해야 합니다. 빌드 실패 시 릴리스는 게시하지 않습니다.
