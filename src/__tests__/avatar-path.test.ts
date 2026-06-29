import './dom-setup';
import { describe, test, expect } from 'bun:test';
import { absolutePathToFileUrl } from '../view';

describe('absolutePathToFileUrl', () => {
  test('converts a Windows absolute path to a file:// URL', () => {
    expect(absolutePathToFileUrl('C:\\Users\\x\\a b.png')).toBe('file:///C:/Users/x/a%20b.png');
  });

  test('percent-encodes non-ASCII filenames (e.g. CJK)', () => {
    const url = absolutePathToFileUrl('C:\\Users\\zhuyifan\\Pictures\\微信图片_562.png');
    expect(url).not.toBeNull();
    expect(url!.startsWith('file:///C:/Users/zhuyifan/Pictures/')).toBe(true);
    expect(/微信图片/.test(url!)).toBe(false);
    expect(url!.endsWith('_562.png')).toBe(true);
    expect(decodeURI(url!)).toBe('file:///C:/Users/zhuyifan/Pictures/微信图片_562.png');
  });

  test('converts a POSIX absolute path', () => {
    expect(absolutePathToFileUrl('/Users/x/photo.png')).toBe('file:///Users/x/photo.png');
  });

  test('returns null for URLs, vault-relative paths and bare file names', () => {
    expect(absolutePathToFileUrl('https://example.com/a.png')).toBeNull();
    expect(absolutePathToFileUrl('images/avatar.png')).toBeNull();
    expect(absolutePathToFileUrl('avatar.png')).toBeNull();
  });
});
