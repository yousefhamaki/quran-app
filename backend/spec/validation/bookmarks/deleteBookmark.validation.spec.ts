import { deleteBookmarkParamsSchema } from '../../../src/validation/bookmarks/deleteBookmark.validation';

describe('deleteBookmarkParamsSchema', () => {
  it('accepts a 24-char hex id', () => {
    expect(deleteBookmarkParamsSchema.validate({ id: '65f000000000000000000001' }).error).toBeUndefined();
  });

  it.each([
    ['too short', { id: 'abc' }],
    ['not hex', { id: 'zzzzzzzzzzzzzzzzzzzzzzzz' }],
    ['missing', {}]
  ])('rejects an id that is %s', (_label, payload) => {
    expect(deleteBookmarkParamsSchema.validate(payload).error).toBeDefined();
  });
});
