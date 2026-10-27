# Third-party data and licenses

Ciqiao's application code is Apache-2.0 licensed. See `LICENSE`.

## CC-CEDICT

Chinese–English dictionary data, not bundled with Ciqiao. The user downloads the
official export from MDBG and imports it locally.

- Source: <https://www.mdbg.net/chinese/dictionary?page=cc-cedict>
- License: CC BY-SA 4.0, <https://creativecommons.org/licenses/by-sa/4.0/>
- Attribution: CC-CEDICT by MDBG and contributors

Because Ciqiao does not distribute the data, it does not publish a derived
CC-CEDICT database. If you fork Ciqiao and choose to bundle or host the data,
you must comply with CC BY-SA 4.0, including attribution and share-alike.

## ECDICT

- Source: <https://github.com/skywind3000/ECDICT>
- Used for: bundled English→Chinese core (`public/data/ecdict-core.json.gz`)
- License: MIT

Copyright (c) 2025 Linwei

## HSK 3.0 word list

- Source: <https://github.com/ivankra/hsk30>
- Used for: HSK level tags (`src/data/hsk30.json`)
- License: MIT

Copyright (c) 2023 Ivan Krasilnikov  
Copyright (c) 2021 Shawky  
Copyright (c) 2021 Pleco Inc.

## jieba word frequency data

- Source: <https://github.com/fxsjy/jieba>
- Used for: word frequency ranks (`src/data/frequency.json`)
- License: MIT

Copyright (c) 2013 Sun Junyi

## MIT License (third-party data)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Starter set

The sample entries in `src/lib/starter.ts` were written for Ciqiao and are
released under the same Apache-2.0 license as the application code.
