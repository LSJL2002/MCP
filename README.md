# MCP: 요구사항 기반 레시피 생성기

사용자가 입력한 재료로 한국 요리 레시피를 추천해 주는 간단한 서버입니다.

---

## 목차

- [주요 기능](#주요-기능)
- [준비 사항](#준비-사항)
- [설치 방법](#설치-방법)
- [설정 방법](#설정-방법)
- [실행 방법](#실행-방법)
- [폴더 구조](#폴더-구조)
- [툴(메서드) 설명](#툴설명)
- [라이선스](#라이선스)

---

## 주요 기능

- **언어 설정**: 한국어(`ko`) 또는 영어(`en`)로 응답을 바꿀 수 있어요.
- **재료 등록**: 세션에 사용할 재료 목록을 저장해요.
- **레시피 추천**: 저장된 재료로 한국 요리 레시피 3개를 추천해 줘요. (이름, 재료, 시간, 난이도, 조리 순서 포함)

---

## 준비 사항

- Node.js v18 이상
- npm 설치
- Cohere API 키

---

## 설치 방법

1. 저장소 복제:
   ```bash
   git clone https://github.com/LSJL2002/MCP.git
   cd MCP
   ```
2. 의존 패키지 설치:
   ```bash
   npm install
   ```

---

## 설정 방법

1. 프로젝트 루트에 `.env` 파일 생성:
   ```text
   COHERE_API_KEY=여기에_내_API_키_입력
   ```
2. `index.js`에 환경 변수 불러오기 코드 추가:
   ```js
   import dotenv from 'dotenv';
   dotenv.config();

   const apiKey = process.env.COHERE_API_KEY;
   ```

---

## 실행 방법

```bash
node index.js
```

- **언어 설정** 예시:
  ```json
  { "tool": "set_language", "lang": "ko" }
  ```
- **재료 등록** 예시:
  ```json
  { "tool": "input_ingredients", "ingredients": ["양파", "계란", "대파"] }
  ```
- **레시피 추천** 예시:
  ```json
  { "tool": "recipe_rec" }
  ```

---

## 폴더 구조

```
MCP/
├── data/                # 세션별 재료 저장 폴더
├── index.js             # 서버 메인 파일
├── package.json         # 프로젝트 정보
├── package-lock.json    # 패키지 버전 잠금 파일
└── README.md            # 문서 파일
```

---

## 툴(메서드) 설명

### set_language
- **설명**: 응답 언어를 설정해요.
- **파라미터**: `lang` (`"ko"` 또는 `"en"`)
- **결과**: 설정 완료 안내 문구

### input_ingredients
- **설명**: 재료 목록을 저장해요.
- **파라미터**: `ingredients` (문자열 배열)
- **결과**: 저장 완료 안내 문구

### recipe_rec
- **설명**: 저장된 재료로 레시피 3개를 추천해요.
- **파라미터**: 없음
- **결과**: JSON 형식 레시피 목록

---

## 라이선스

ISC 라이선스를 따릅니다.
