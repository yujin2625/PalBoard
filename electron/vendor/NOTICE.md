# Vendored third-party components

These files power the local Palworld save-file import (Electron main process).

## uesave WASM (`uesave/uesave_wasm*`)
Prebuilt WebAssembly build of a Palworld-aware fork of **uesave-rs**, taken from
[iebb/PalworldSaveEditor](https://github.com/iebb/PalworldSaveEditor) (MIT).
Decompresses/parses the outer GVAS save. It leaves `CharacterSaveParameterMap`
as raw bytes, which `gvas-pals.mjs` (our own code) decodes into pal records.

## ooz WASM (`ooz.wasm`, `ooz-node.mjs`)
Oodle (Kraken) decompressor for newer `PlM`-format saves. `ooz.wasm` is from the
same project; `ooz-node.mjs` is our Node port of that project's browser loader.

Both are MIT-licensed. See the upstream repository for full license text.

The passive code→name table (`src/data/passive-codes.json`) is derived from
[KrisCris/Palworld-Pal-Editor](https://github.com/KrisCris/Palworld-Pal-Editor)
via `scripts/build-passive-codes.mjs`.
