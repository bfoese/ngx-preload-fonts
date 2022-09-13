import { FileUtil } from './file.util';
import mock from 'mock-fs';
describe('FileUtil', () => {
  describe('normalizePath', () => {
    it('should convert Unix to Unix format', async () => {
      expect(FileUtil.normalizePath('foo/bar/baz')).toEqual('foo/bar/baz');
      expect(FileUtil.normalizePath('foo/bar/baz/')).toEqual('foo/bar/baz');
    });

    it('should convert Windows to Unix format', async () => {
      expect(FileUtil.normalizePath('foo\\bar\\baz')).toEqual('foo/bar/baz');
      expect(FileUtil.normalizePath('foo\\bar\\baz\\')).toEqual('foo/bar/baz');
    });

    it('should handle null/undefined/empty gracefully', async () => {
      expect(FileUtil.normalizePath(null)).toEqual(null);
      expect(FileUtil.normalizePath(undefined)).toEqual(undefined);
      expect(FileUtil.normalizePath('')).toEqual('');
      expect(FileUtil.normalizePath('foo')).toEqual('foo');
    });
  });

  describe('getFontType', () => {
    const fontName = 'raleway-ext-latin-200';
    const fingerprint = '89as8sd987as87fa887adfa8fa8s7';

    const fontTypes: string[] = ['woff', 'woff2', 'ttf', 'eot', 'otf'];
    const nonFontTypes: string[] = ['html', 'css', 'js', 'png', 'jpg'];

    it('should extract the type for a fingerprinted and non-fingerprinted font', async () => {
      for (const expectedFontType of fontTypes) {
        expect(FileUtil.getFontType(`${fontName}.${expectedFontType}`)).toEqual(expectedFontType);
        expect(FileUtil.getFontType(`${fontName}.${fingerprint}.${expectedFontType}`)).toEqual(expectedFontType);
      }
    });

    it('should return undefined if no matching font type found', async () => {
      expect(FileUtil.getFontType(`${fontName}`)).toEqual(undefined);
      expect(FileUtil.getFontType(`${fontName}.${fingerprint}`)).toEqual(undefined);

      for (const nonFontType of nonFontTypes) {
        expect(FileUtil.getFontType(`${fontName}.${nonFontType}`)).toEqual(undefined);
        expect(FileUtil.getFontType(`${fontName}.${fingerprint}.${nonFontType}`)).toEqual(undefined);
      }
    });
  });

  describe('getFontFileName', () => {
    const fileName = 'raleway-ext-latin-200';
    const fingerprint = '89as8sd987as87fa887adfa8fa8s7';

    const fileTypes: string[] = ['woff', 'woff2', 'ttf', 'eot', 'otf', 'html', 'css', 'js', 'png', 'jpg'];

    it('should extract the file name for a fingerprinted and non-fingerprinted file', async () => {
      for (const fileType of fileTypes) {
        expect(FileUtil.getFileName(`${fileName}.${fileType}`)).toEqual(fileName);
        expect(FileUtil.getFileName(`${fileName}.${fingerprint}.${fileType}`)).toEqual(fileName);
      }
    });
    it('should return undefined', async () => {
      expect(FileUtil.getFileName(`${fileName}`)).toEqual(undefined);
      expect(FileUtil.getFileName(`${fileName}.${fingerprint}`)).toEqual(fileName);
    });
  });

  describe('filterFonts', () => {
    const fingerprintedFont = 'raleway-ext-latin-200.89as8sd987as87fa887adfa8fa8s7';
    const nonFingerprintedFont = 'raleway-ext-latin-800';

    const fontTypes = ['woff', 'woff2', 'ttf', 'eot', 'otf'];
    const files = [''];

    for (const fontType of fontTypes) {
      files.push(`${fingerprintedFont}.${fontType}`);
      files.push(`${nonFingerprintedFont}.${fontType}`);
    }

    for (const fileType of ['html', 'css', 'js', 'png', 'jpg']) {
      files.push(`foo.${fileType}`);
      files.push(`bar.78sfd7sfda890sadf0s.${fileType}`);
    }

    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    shuffleArray(files);

    it('should include all fonts if no whitelist and blacklist is given', async () => {
      const filteredFontsMap = FileUtil.filterFonts(files, undefined, undefined);
      expect(filteredFontsMap.size).toBe(fontTypes.length * 2);

      // check if number of fingerprinted fonts is correct
      const fingerprintedFonts = Array.from(filteredFontsMap.keys()).filter((font) =>
        font.startsWith(fingerprintedFont)
      );
      expect(fingerprintedFonts.length).toBe(fontTypes.length);

      // check if number of non-fingerprinted fonts is correct
      const nonFingerprintedFonts = Array.from(filteredFontsMap.keys()).filter((font) =>
        font.startsWith(nonFingerprintedFont)
      );
      expect(nonFingerprintedFonts.length).toBe(fontTypes.length);

      // check if mapped file type is correct
      for (const key of Array.from(filteredFontsMap.keys())) {
        expect(key.endsWith(filteredFontsMap.get(key))).toBe(true);
      }
    });

    it('should include only whitelisted fonts', async () => {
      const whitelistedFont = 'raleway-ext-latin-200';
      const filteredFontsMap = FileUtil.filterFonts(files, [whitelistedFont], undefined);

      expect(filteredFontsMap.size).toBe(fontTypes.length);
      // check if all filtered fonts have the whitelisted name
      expect(Array.from(filteredFontsMap.keys()).every((font) => font.startsWith(whitelistedFont))).toBe(true);
    });

    it('should not include fonts which are both whitelisted and blacklisted', async () => {
      expect(FileUtil.filterFonts(files, ['raleway-ext-latin-200'], ['raleway-ext-latin-200']).size).toBe(0);
      const filteredFontsMap = FileUtil.filterFonts(
        files,
        ['raleway-ext-latin-200', 'raleway-ext-latin-800'],
        ['raleway-ext-latin-200']
      );
      expect(filteredFontsMap.size).toBe(fontTypes.length); // one font is included with all types
      expect(Array.from(filteredFontsMap.keys()).every((font) => font.startsWith('raleway-ext-latin-800'))).toBe(true);
    });

    it('should not include blacklisted fonts', async () => {
      expect(FileUtil.filterFonts(files, undefined, ['raleway-ext-latin-800', 'raleway-ext-latin-200']).size).toBe(0);
      const filteredFontsMap = FileUtil.filterFonts(files, undefined, ['raleway-ext-latin-200']);
      expect(filteredFontsMap.size).toBe(fontTypes.length); // one font is included with all types
      expect(Array.from(filteredFontsMap.keys()).every((font) => font.startsWith('raleway-ext-latin-800'))).toBe(true);
    });

    it('should handle undefined and empty gracefully', async () => {
      const allFontsCount = fontTypes.length * 2;
      expect(FileUtil.filterFonts(files, undefined, undefined).size).toBe(allFontsCount);
      expect(FileUtil.filterFonts(files, [], undefined).size).toBe(0);
      expect(FileUtil.filterFonts(files, undefined, []).size).toBe(allFontsCount);
      expect(FileUtil.filterFonts(files, [], []).size).toBe(0);
      expect(FileUtil.filterFonts(files, [''], ['']).size).toBe(0);
      expect(FileUtil.filterFonts(files, ['foo'], ['bar']).size).toBe(0);
      expect(FileUtil.filterFonts(files, undefined, []).size).toBe(allFontsCount);
      expect(FileUtil.filterFonts(files, undefined, ['']).size).toBe(allFontsCount);
      expect(FileUtil.filterFonts(files, undefined, ['bar']).size).toBe(allFontsCount);
    });
  });

  describe('findRecursivePrerenderedDirs', () => {
    beforeEach(function () {
      mock({
        base: {
          'index.html': 'main html content (should not be returned)',
          'random-empty-dir': {},
          news: {
            'news-slug1': {
              'index.html': 'extra prerender file',
              foo: 'random content',
            },
            'news-slug2': {
              'index.html': 'extra prerender file',
            },
            'index.html': 'extra prerendered folder',
          },
        },
      });
    });

    it('should extract the index.html within the root app folder', async () => {
      const prerenderedDirectories = FileUtil.findRecursivePrerenderedDirs('base', 'index.html');

      expect(prerenderedDirectories.length).toBe(3);
      expect(prerenderedDirectories).not.toContain('base');
      expect(prerenderedDirectories).toContain('base/news');
      expect(prerenderedDirectories).toContain('base/news/news-slug1');
      expect(prerenderedDirectories).toContain('base/news/news-slug2');
    });

    afterEach(mock.restore);
  });
});
