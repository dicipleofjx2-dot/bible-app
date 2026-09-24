import { Redirect } from 'expo-router';

/** 모르는 주소로 들어오면 홈으로 — 앱을 다른 경로 아래에 얹어 열 때도 첫 화면이 뜬다. */
export default function NotFound() {
  return <Redirect href="/" />;
}
