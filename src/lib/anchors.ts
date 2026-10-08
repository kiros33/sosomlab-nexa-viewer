/**
 * 문서 내 앵커(#id) 요소 찾기.
 *
 * 렌더러가 문서 HTML을 GitHub 스키마로 거르면서 원문 HTML·각주의 id/name에 `user-content-`
 * 접두어를 붙인다(DOM clobbering 방지). 링크의 `#x`는 그대로이므로 접두어 붙은 id와
 * `name` 속성까지 차례로 찾는다.
 */
const PREFIX = "user-content-";

export function findAnchor(hash: string): HTMLElement | null {
  const ids = [hash, PREFIX + hash];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  for (const id of ids) {
    const el = document.getElementsByName(id)[0];
    if (el instanceof HTMLElement) return el;
  }
  return null;
}
