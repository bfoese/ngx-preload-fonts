// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

export class FileUtil {
  /**
   * Regex for file types that contain characters and digits. Suitable to match
   * font types. But the matching type may be something other than a common font
   * type. The regex would just match the file type part.
   */
  private static regexFontType = /(\.[\w\d]*)$/;

  /**
   * Pattern for Angular file fingerprints, which is a combination of lowercase characters and numbers.
   */
  private static regexFileTypeWithOptionalFingerprint = /((\.[a-z0-9]*)?(\.[\w\d]*){1})$/;

  /**
   * Converts a path to Unix format which can be handled on all platforms.
   *
   * @param {string} path - Unix or Windows path, with or without trailing
   * slash/backslash, e.g. `foo/bar/baz`, `foo/bar/baz/`, `foo\\bar\\baz`,
   * `foo\\bar\\baz\\`
   * @returns These
   * `foo/bar/baz`, `foo/bar/baz/`, `foo\\bar\\baz`, `foo\\bar\\baz\\` path
   * definitions will all return the same result, which is `foo/bar/baz`.
   */
  public static normalizePath(path: string | undefined): string | undefined {
    return path ? path.replace(/\\/g, '/').replace(/\/$/, '') : path;
  }

  /**
   * Extracts the file type of the given input and checks whether this type is a
   * known font type.
   * @param font - Font name including file type
   * @returns If a known font type was detected, this type will be returned
   * without leading dot (i.e. 'woff', 'woff2'...), otherwise undefined.
   */
  public static getFontType(font: string): string | undefined {
    const fileTypeMatch = font.match(FileUtil.regexFontType);
    const fileType = fileTypeMatch && fileTypeMatch.length > 0 ? fileTypeMatch[0].toLowerCase() : undefined;

    if (fileType && ['.ttf', '.woff', '.woff2', '.eot', '.otf'].includes(fileType)) {
      return fileType.substr(1); // without leading dot
    }
    return undefined;
  }

  /**
   * Checks whether the given directory contains the given index file name.
   * @param dir - path to a directory
   * @param indexFile - Name of the index file, e.g. `index.html`
   * @returns true if the directory contains the given index filename.
   * Otherwise, or if directory and/or index file name are undefined, false will
   * be returned.
   */
  public static containsIndexFile(dir: string, indexFile: string): boolean {
    return dir && indexFile && fs.existsSync(`${dir}/${indexFile}`);
  }

  public static getAppBuildDirs(root: string, indexFile: string): string[] {
    const appBuildDirs = [];
    if (FileUtil.containsIndexFile(root, indexFile)) {
      appBuildDirs.push(root);
    } else {
      const children = fs.readdirSync(root);
      if (children) {
        for (const child of children) {
          if (FileUtil.containsIndexFile(`${root}/${child}`, indexFile)) {
            appBuildDirs.push(`${root}/${child}`);
          }
        }
      }
    }
    return appBuildDirs;
  }

  /**
   * Extracts the name of a file without fingerprint and file type. Fingerprint is expected to be a combination of numbers and lowercase
   * @param file - File including fingerprint and/or file type.
   * @returns
   */
  public static getFileName(file: string): string | undefined {
    const match = file.match(FileUtil.regexFileTypeWithOptionalFingerprint);
    return match && match.length > 0 ? file.substr(0, file.indexOf(match[0])) : undefined;
  }

  /**
   *
   * @param root - base directory from where the search starts
   * @param indexFile - file name including fingerprint
   * @returns Array of paths containing base files to be optimized
   */
  public static findRecursivePrerenderedDirs(root: string, indexFile: string): string[] {
    const appPrerenderedDirs = [];

    const dirs = fs.readdirSync(root).filter((item) => fs.statSync(`${root}/${item}`).isDirectory());
    if (dirs) {
      for (const dir of dirs) {
        if (FileUtil.containsIndexFile(`${root}/${dir}`, indexFile)) {
          appPrerenderedDirs.push(`${root}/${dir}`);
        }
        const subDirs = FileUtil.findRecursivePrerenderedDirs(`${root}/${dir}`, indexFile);
        if (subDirs) {
          appPrerenderedDirs.push(...subDirs);
        }
      }
    }

    return appPrerenderedDirs;
  }

  public static filterFonts(
    files: string[],
    include: string[] | undefined,
    exclude: string[] | undefined
  ): Map<string, string> {
    const fonts = new Map();
    if (!files) {
      return fonts;
    }
    for (const file of files) {
      const fontType = FileUtil.getFontType(file);
      if (!fontType) {
        continue; // this is no font file
      }
      const filename = FileUtil.getFileName(file)?.toLowerCase();
      if (exclude && exclude.some((exclude) => filename === exclude.toLowerCase())) {
        continue;
      }

      if (!include || include.some((include) => filename === include.toLowerCase())) {
        fonts.set(file, fontType);
      }
    }
    return fonts;
  }
}
