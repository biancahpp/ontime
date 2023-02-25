import { parseTemplate } from './integrationUtils.js';

describe('integrationUtils', () => {
  it('correctly parses a given string', () => {
    const mockState = { test: 'this' };
    const testString = 'That should replace {{test}}';
    const expected = `That should replace ${mockState.test}`;

    const result = parseTemplate(testString, mockState);
    expect(result).toStrictEqual(expected);
  });

  it('parses string with multiple variables', () => {
    const mockState = { test1: 'that', test2: 'this' };
    const testString = '{{test1}} should replace {{test2}}';
    const expected = `${mockState.test1} should replace ${mockState.test2}`;

    const result = parseTemplate(testString, mockState);
    expect(result).toStrictEqual(expected);
  });

  it('correctly parses a string without templates', () => {
    const testString = 'That should replace {test}';

    const result = parseTemplate(testString, {});
    expect(result).toStrictEqual(testString);
  });

  it('handles scenarios with missing variables', () => {
    // by failing to provide a value, we give visibility to
    // potential issues in the given string
    const mockState = { test1: 'that', test2: 'this' };
    const testString = '{{test1}} should replace {{test2}}, but not {{test3}}';
    const expected = `${mockState.test1} should replace ${mockState.test2}, but not {{test3}}`;

    const result = parseTemplate(testString, mockState);
    expect(result).toStrictEqual(expected);
  });

  it('doesnt yet handle nested variables', () => {
    const mockState = {
      timer: {
        time: '10',
      },
      enabled: 'is',
    };
    const testString = 'Timer {{enabled}} enabled with {{timer.time}}ms interval';
    const expected = 'Timer is enabled with {{timer.time}}ms interval';

    const result = parseTemplate(testString, mockState);
    expect(result).toStrictEqual(expected);
  });
});