# Third-party data and licenses

Souzi's application code is Apache-2.0 licensed. See `LICENSE`.

## CC-CEDICT

Chinese–English dictionary data, not bundled with Souzi. The user downloads the
official export from MDBG and imports it locally.

- Source: <https://www.mdbg.net/chinese/dictionary?page=cc-cedict>
- License: CC BY-SA 4.0, <https://creativecommons.org/licenses/by-sa/4.0/>
- Attribution: CC-CEDICT by MDBG and contributors

Because Souzi does not distribute the data, it does not publish a derived
CC-CEDICT database. If you fork Souzi and choose to bundle or host the data,
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

## Tatoeba example sentences

- Source: <https://tatoeba.org>
- Used for: optional example-sentence pack
- License: CC BY 2.0 FR, <https://creativecommons.org/licenses/by/2.0/fr/>
- Attribution: Tatoeba contributors

## Princeton WordNet 3.1

- Source: <https://wordnet.princeton.edu>
- Used for: optional related-words pack
- License: WordNet License
- Attribution: Princeton University

### WordNet 3.1 license

WordNet 3.1 Copyright 2011 by Princeton University. All rights reserved.

Permission to use, copy, modify and distribute this software and database and
its documentation for any purpose and without fee or royalty is hereby granted,
provided that you agree to comply with the following copyright notice and
statements, including the disclaimer, and that the same appear on ALL copies of
the software, database and documentation, including modifications that you make
for internal use or for distribution.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES NO
REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT
LIMITATION, PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF
MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE
LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY
PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in advertising or
publicity pertaining to distribution of the software and/or database. Title to
copyright in this software, database and any associated documentation shall at
all times remain with Princeton University and LICENSEE agrees to preserve same.

## OpenCC

- Source: <https://github.com/BYVoid/OpenCC>
- Used for: traditional-to-simplified conversion when building the example-sentence pack
- License: Apache-2.0

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

The sample entries in `src/lib/starter.ts` were written for Souzi and are
released under the same Apache-2.0 license as the application code.
