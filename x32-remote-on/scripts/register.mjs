// node 로 src 의 .ts 를 바로 돌리기 위한 해석기: 확장자 없는 import 에 .ts 를 붙여 준다.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) { if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx); throw e; }
}`));
