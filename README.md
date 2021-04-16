# ngx-preload-fonts

| Statements                  | Branches                | Functions                 | Lines                |
| --------------------------- | ----------------------- | ------------------------- | -------------------- |
| ![Statements](https://img.shields.io/badge/Coverage-70.27%25-red.svg) | ![Branches](https://img.shields.io/badge/Coverage-71.43%25-red.svg) | ![Functions](https://img.shields.io/badge/Coverage-75%25-red.svg) | ![Lines](https://img.shields.io/badge/Coverage-68.57%25-red.svg)    |

Angular post-build tool to inject font preload links into index file of your app. Works for any font handled by the Angular build system -
fingerprinted or not.

## What problem does this library solve?

One of the Google Lighthouse suggestions for increasing the performance of your
app will likely be to preload your fonts by adding a simple tag for each of your
fonts in your `index.html`:


````html
<link rel="preload" as="font" href="helvetica.831fa2178a6e738.woff2" type="font/woff2" crossorigin="anonymous">
````

Seems like an easy task, until you realize, that Angular fingerprints your fonts
with a unique hash at build time. This hash will be included in the font name
and it will change every time you change the content of the file (e.g. when
updating the character set). Angular will automatically update references in
stylesheets to use the generated fingerprinted font names, but it will not
update the links in your `index.html`.

This library provides a command line tool that will pick up all fonts from the
root of your build output directory and inserts preload links for them into the
index file of the build. The tool also gives control to omit the preload links
for a subset of the fonts.

The generated links will have the form of:

### Limitations of this tool

This tool is laid out to automatically find fonts which are handled by Angular
build system. Specifically, this will include fonts which are referenced by
**relative paths** in **your stylesheets or stylesheets you imported from
libraries**.

Angular will copy these fonts to the root of the build output directory, next to
the index file. Therefore ngx-preload-fonts will crawl this root directory only.

If you use absolutely referenced fonts somewhere, they are not managed by
Angular and you will most likely have some `angular.json` `assets` configuration
that copies these fonts somewhere into the build output directory.
ngx-preload-fonts will only find them, unless they are located in the root next
to the index file. It does not crawl the subdirectories. If you would like to
see this feature, give me a feature request. But I assume that when you use
absolute paths, the URLs are being static anyway (as Angular would not
fingerprint them) and the preload links could be declared manually.

ngx-preload-fonts is compatible with multi-builds, meaning if Angular builds
multiple versions for your app at once (e.g. one build per i18n language), you
provide the root directory of these builds as command argument and
ngx-preload-fonts will find multiple build roots and updates their index files
with preload links for the fonts which reside in this specific build root.

### Background on Angular CSS resource handling and fingerprinting

You can skip this section, if you just want to get your job done :)

The official Angular docs contain only one sentence
concerning the fingerprinting and the CSS resource handling during the Angular
build:

> "Resources in CSS, such as images and fonts, are automatically written and fingerprinted at the root of the output folder."

This sentence is not very precise, as it does not conceal the auxiliary
conditions, which must be fulfilled for these resources to be picked up and
handled by Angular. This causes confusion that is reflected in multiple GitHub
issue discussions (as seen
[here](https://github.com/angular/angular-cli/issues/6599),
[here](https://github.com/angular/angular-cli/issues/14587) and
[here](https://github.com/angular/angular-cli/issues/17747)) which provide
valuable insight that is missing in the docs. Here is what I've learned from
these discussions and from playing with different `angular.json` settings.

#### Turning Fingerprinting on/off
Fingerprinting can be turned on/off easily via the property `outputHashing: non|all|bundles|media` in `angular.json`. The disadvantage is the granularity of the property. When choosing `bundles`, only your JS bundles are being fingerprinted. Fonts, images and other media is not. The property does not provide a way to turn off fingerprinting exclusively for fonts. Since fingerprinting serves a valuable purpose for carefree caching, you should ponder thoroughly if turning it off might not kick your ass in the long run.

By the way, the property `outputHashing` used to work for `ng serve` as well, but since Angular 11 it only enabled for production builds and a warning shows up if the option is active for `ng serve` configuration. [This seems to be fixed soon](https://github.com/angular/angular-cli/issues/19861), so that hashing can be activated again locally. Until then, to debug the effects of the `outputHashing` property and the differences of relative and absolute paths in stylesheets, you need to build your project and inspect the generated build artefact.

#### Consequences of relative resource paths
When fingerprinting is turned on, Angular build system automatically fingerprints resources (fonts, images, …) which are referenced via a **relative path** in a stylesheet (stylesheet of the project or a stylesheet imported from a library). More precisely: when Angular sees a relative path for a resource in a stylesheet, Angular will pick up and handle this resource during the build. Angular will automatically take care of copying that resource into the build output directory. It does not matter where the resource is located (project, workspace library or node_modules package). Some developers prefer to locate fonts and media resources near the components which use them, so they might be spread across multiple directories of the application. If they are referenced relatively, Angular will pick them up, no matter where they are.

Besides the fingerprinting and the auto-copying, Angular build system is able to process the resource for optimization purposes. In a Github Issue discussion dating back to 2018, a supposedly Angular employee indicated, that at that point, there was no processing other than fingerprinting being performed. But this might change in the future or might have already changed by now.

#### Consequences of absolute resource paths
Absolute paths for resources in stylesheets will have the consequence that Angular ignores these resources during the build completely. Therefore they will not be fingerprinted, even when fingerprinting is activated via `outputHashing` property and they will also not being copied automatically into the build output directory.
You need to manually configure that the resources are being copied into the build output directory, which can be easily accomplished in `angular.json` via the `assets` property in the build architect section. Here you can define paths or glob patterns of resources to be copied into the build artifact:

````json
"assets": [
    "projects/my-app/src/favicon.ico",
    "projects/my-app/src/assets",
    "projects/my-app/src/manifests",
    {
    "glob": "**/*",
    "input": "./node_modules/@my-company/my-font-lib/dist/assets",
    "output": "./../assets"
    }
],
````
But this manual configuration can become quite complex, when your fonts are
cluttered across different directories. It enforces to keep the fonts together
in a small number of directories, which means locating them near the components or
modules which use them, is not a good choice when using absolute resource paths.

#### Custom base href
From what I've experienced, Angular manages relative paths and a custom base href without problems. However, the custom base href which is defined at runtime, makes it harder to define absolute paths. Also I ran into a problem when I tried to access resources with the local dev server that were located outside of the base href environment. For example, in a typical Angular i18n application your base href will be the locale. Angular will generate one build per locale. It might be tempting to share some resources like fonts or images across these builds and have them located in a shared assets directory next to the build directories for the locales:

````bash

/dist
|_/my-app
  |_/de
    |_/assets
    |_main.js
    |_index.html
  |_/en
    |_/assets
    |_main.js
    |_index.html
  |_/assets
    |_helvetica.woff2
````

The absolute path to reference the font from the shared assets directory did not
include the base href and in local development mode with `ng serve`, Angular was
not able to serve this file. It probalby would have worked in production where
NGINX is used to serve the files, but it is not really an option to use a
solution which does not work in development mode.

#### Summary and Best Practice

Use relative paths in your stylesheets to reference fonts and media resources, like these:
````css
@font-face {
  font-family: 'Raleway';
  src: url('~/assets/fonts/raleway/raleway-v19-latin-ext_latin-200.woff2') format('woff2'),
       url('~/assets/fonts/raleway/raleway-v19-latin-ext_latin-200.woff') format('woff'),
       url('~/assets/fonts/raleway/raleway-v19-latin-ext_latin-200.ttf') format('truetype'),
}
````
It will allow Angular build system to pick up and manage these resources during build, which gives you these benefits:

* Automatic fingerprinting for carefree caching (if enabled via `outputHashing`
  property in `angular.json`)
* Resources will automatically end up in the build output directory without
  manual configuration and regardless whether they are located in a random
  application subdirectory, an imported workspace library or an imported library
  within node_modules
* Automatic file optimization (not sure what Angular has implemented at this point)
* Good integration with custom base href

Use ngx-preload-fonts to tackle the only problem with fingerprinted fonts: preloading them :)


## How to use

Install the tool as a dev dependency:

````bash
npm install --save-dev @bfoese/ngx-preload-fonts
````

Add a script in `package.json` that calls the tool in the postbuild step - option #1 should work, if not, you can use option #2:

````bash
# Option 1: via registered command
"postbuild": "preloadfonts --dist dist/my-app -f index.html -i arial,helvetica -e comic-sans",

# Option 2: via path
"preload:fonts": "ts-node -r tsconfig-paths/register ./node_modules/@bfoese/ngx-preload-fonts",
"postbuild": "npm run preload:fonts -- --dist dist/my-app -f index.html -i arial,helvetica -e comic-sans"
````


| CLI Options  | Shortcut | Optional | Purpose                                                                                                                              |
| ------------ |----------| :-------:|--------------------------------------------------------------------------------------------------------------------------------------|
| --dist       | -d       | no       | Path to your build output directory. Should be identical with `outputPath` property from `angular.json`                              |
| --file       | -f       | yes      | Name of your index file if it is something else than `index.html`. Should be identical with `index` property from `angular.json`     |
| --include    | -i       | yes      | Optional list of font names (without file type and fingerprint). If provided, all other fonts will be ignored for the link creation. |
| --exclude    | -e       | yes      | Optional list of font names (without file type and fingerprint). If provided, these fonts will be ignored for the link creation.     |
| --help       | -h       | yes      | Print out all available options for the CLI tool


The only other thing you need to do, is to insert a static injection marker into
your index file, which will tell the tool where you
want the preload links to be generated. This is the marker, the tool is looking
for:

````html
<!-- inject:preload-fonts --><!-- endinject -->
````

The marker should be included in the `<head>` section and must be located somewhere
**after** the `<base href>` tag:

````html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>My fancy app</title>
    <base href="/"/>

    <!-- inject:preload-fonts --><!-- endinject -->
  </head>
  <body></body>
</html>
````

To test the setup, you can run:

````bash
npm run build
````
When the postbuild step is finished, you should find a summary in the console
log with the number of preload links being created. Afterwards you can check the
content of the index file(s) in your build output directory.

### Multi-builds

The tool can also be used in multi-build setups where Angular builds multiple
versions of your app at once. For example when using Angular i18n, you can have
one build for each locale.

In `angular.json` you defined:

````json
"architect": {
  "build": {
    "options": {
      "outputPath": "dist/my-app",
      "index": "projects/my-app/src/index.html",
    }
  }
}
````

Then the build output directory structure will probably look like this:

````bash
/dist
|_/my-app
  |_/de
    |_arial.a9879asf89s7d.woff2
    |_index.html
  |_/en
    |_arial.a9879asf89s7d.woff2
    |_index.html
````

If your goal is to generate prebuild links in both `index.html` files, you
should run the postbuild tool with the build output root dir path:

```` bash
preloadfonts --dist dist/my-app -f index.html
````

If your goal is to generate the prebuild links only for the app version with
locale `en`, then you should run the postbuild tool with the path of that app
version:

```` bash
preloadfonts --dist dist/my-app/en -f index.html
````
