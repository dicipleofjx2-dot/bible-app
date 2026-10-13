import { ARCADE_SITE } from '@/lib/arcade';

/** 3D 목장 판(public/ranch.html)의 주소. 동물 목록은 #s= 뒤에 JSON 으로 싣는다. */
export function ranchUrl(items: [string, string, string][], embed = false): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ARCADE_SITE;
  return `${origin}/ranch.html${embed ? '?embed=1' : ''}#s=${encodeURIComponent(JSON.stringify(items))}`;
}
