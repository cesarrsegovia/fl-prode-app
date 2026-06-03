import { describe, expect, it } from 'vitest';
import { toSession } from './session-core';

describe('toSession', () => {
  it('mapea la respuesta del login a AuthSession', () => {
    const data = {
      accessToken: 'tok',
      user: { id: 'u1', email: 'a@b.com', username: 'neo', isAdmin: true },
    };
    expect(toSession(data)).toEqual({
      accessToken: 'tok',
      user: {
        id: 'u1',
        username: 'neo',
        isAdmin: true,
        email: 'a@b.com',
        name: 'neo',
        image: null,
      },
    });
  });

  it('usa el id como username cuando el provider no manda username', () => {
    const data = { accessToken: 'tok', user: { id: 'u2', isAdmin: false } };
    const s = toSession(data);
    expect(s.user.username).toBe('u2');
    expect(s.user.isAdmin).toBe(false);
    expect(s.user.email).toBeNull();
  });
});
