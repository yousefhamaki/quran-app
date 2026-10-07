import { MessageDto } from '../../../src/dtos/common/message.dto';

describe('MessageDto', () => {
  it('wraps the message', () => {
    expect(new MessageDto('done')).toEqual({ message: 'done' });
  });
});
