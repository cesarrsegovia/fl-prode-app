/** JWT de juguete para tests. `exp` en segundos epoch; omitir = sin exp. */
export function fakeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(exp === undefined ? {} : { exp })).toString('base64url');
  return `${header}.${payload}.sig`;
}
