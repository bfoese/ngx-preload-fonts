#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
import chalk from 'chalk';
import { program } from 'commander';
import * as figlet from 'figlet';
import * as fs from 'fs';
import { FileUtil } from './file.util';

const log = console.log;
const handleError = (message) => {
  log(chalk.red(message));
  process.exit(1);
};

console.log(figlet.textSync('ngx-preload-fonts', { horizontalLayout: 'full' }), '\n\n');

const injectionMarker = '<!-- inject:preload-fonts --><!-- endinject -->';
const regexInjectionMarker = /(<!-- inject:preload-fonts -->)([\s\S]*?)(<!-- endinject -->)/gm;

program
  .version('1.0.0')
  .option(
    '-d, --dist <dist>',
    'Path to build output directory. Should be identical with `outputPath` property from `angular.json`'
  )
  .option(
    '-f, --file [file]',
    `Your index file name. If not provided, this will default to ${chalk.yellow.bold(
      'index.html'
    )}. Should be identical with 'index' property from 'angular.json'. Make sure, that this file contains the injection marker, which will be replaced with the generated preload links: ${chalk.yellow.bold(
      injectionMarker
    )}`
  )
  // [include...] is supposed to be converted to an array when provided with space separated value list. Does not work for me, therefore I use comma separated string and create the array myself
  .option(
    '-i, --include [include]',
    'Optional comma separated list of font names to include for the preload link generation. Other font names will be ignored. Provide the names without file extension, e.g. "helvetica" instead of "helvetica.woff2"'
  )
  .option(
    '-e, --exclude [exclude]',
    'Optional comma separated list of font names to exclude from the preload link generation. Provide the names without file extension, e.g. "helvetica" instead of "helvetica.woff2"'
  )
  .option(
    '--deployUrl [deployUrl]',
    'Optional path prefix for your deployment allowing to preload in builds using a deploy url'
  )
  .parse(process.argv);

// console.log('Options: ', program.opts());
// console.log('Remaining arguments: ', program.args);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

if (!program.dist) {
  handleError('Please specify the build output directory of your application');
  program.outputHelp();
}

program.dist = FileUtil.normalizePath(program.dist);
program.file = program.file ?? 'index.html';
program.deployUrl = program.deployUrl ?? '';

const appBuildDirs = FileUtil.getAppBuildDirs(program.dist, program.file);

if (!appBuildDirs || appBuildDirs.length === 0) {
  handleError(
    `Could not find ${chalk.underline(program.file)} in ${chalk.underline(
      program.dist
    )} or on of its subdirectories. Did you defined the right build output path and is your build finished?`
  );
}

for (const appBuildDir of appBuildDirs) {
  const files = fs.readdirSync(appBuildDir);
  const fonts = FileUtil.filterFonts(
    files,
    program.include ? program.include.split(',') : undefined,
    program.exclude ? program.exclude.split(',') : undefined
  );

  if (fonts && fonts.size > 0) {
    const preloadFontLinks = Array.from(fonts.keys())
      .map(
        (font) => `<link rel="preload" as="font" href="${FileUtil.normalizePath(program.deployUrl + font)}" type="font/${fonts.get(font)}" crossorigin="anonymous">`
      )
      .join('\n');
    const indexFilePath = `${appBuildDir}/${program.file}`;

    const indexFileContent = fs.readFileSync(indexFilePath, 'utf8');
    const match = indexFileContent.match(regexInjectionMarker);

    if (!match || match.length === 0) {
      log(
        chalk.red(
          `Inserted ${chalk.yellow.underline.bold('0')} preload font links into ${chalk.yellow.underline(
            indexFilePath
          )}: Could not detect the injection marker ${chalk.yellow(
            injectionMarker
          )}. Did you forget to include the marker or was is already replaced by a previous run?`
        )
      );
    } else {
      fs.writeFileSync(indexFilePath, indexFileContent.replace(regexInjectionMarker, preloadFontLinks));

      log(
        chalk.green(
          `Inserted ${chalk.yellow.underline.bold(fonts.size)} preload font links into ${chalk.yellow.underline(
            indexFilePath
          )}`
        )
      );
    }
  }
}
