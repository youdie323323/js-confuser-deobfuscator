# Js-confuser deobfuscator

## Instruction

1. Download and unzip this project
2. Open a terminal in the unzipped directory, then paste and enter:

```bash
npm install
```

And then put the code to deobfuscate at `input/obfuscated.js`

And then run `Sources/index.ts` with:
```bash
npx tsx Sources/index.ts
```

You will see output like:

<details>

<summary>Terminal</summary>

```
CFF dispatch switch and loop found, eliminating deadcode...
Simplified destructuring assignment to multiple assignments
Simplified destructuring assignment to multiple assignments
Constant holder: mqFC1h
Constant holder internal property: psUqyio
Constant holder with context property: UghOTyo
Reached flow: -201
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> -116
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> -58
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> -2
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> -21
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> 55
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 51
Evaluted expression "d39YMJ - 118" -> -48
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> NaN
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> 30
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> -2
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -268
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> -201
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> NaN
Reached flow: -15
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> -110
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> -52
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 4
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> -15
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> 235
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 231
Evaluted expression "d39YMJ - 118" -> -42
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> 210
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 4
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -262
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> -195
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: 198
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> false
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 194
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> 173
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: 140
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> false
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 136
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> 115
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Branch detected in CFF
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> 10
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 6
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> -15
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> false
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 18
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> -3
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: 10
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> 10
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 6
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> -15
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: 22
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> 140
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 198
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 254
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 235
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> false
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 18
Evaluted expression "d39YMJ - 118" -> 208
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> -3
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 254
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -12
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 55
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: 18
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> true
Evaluted expression "d39YMJ - 186" -> 136
Evaluted expression "242" -> 242
Evaluted expression "d39YMJ - 128" -> 194
Evaluted expression "-198" -> -198
Evaluted expression "235" -> 235
Evaluted expression "d39YMJ != 156 && d39YMJ != 268 && d39YMJ - 72" -> 250
Evaluted expression "-85" -> -85
Evaluted expression "196" -> 196
Evaluted expression "143" -> 143
Evaluted expression "d39YMJ - 91" -> 231
Evaluted expression "179" -> 179
Evaluted expression "rQkYZMn != -304 && rQkYZMn != -186 && rQkYZMn != -128 && rQkYZMn - -326" -> false
Evaluted expression "rQkYZMn != -555 && rQkYZMn - -322" -> 18
Evaluted expression "d39YMJ - 118" -> 204
Evaluted expression "mqFC1h.psUqyio.BoefGN + -317" -> -182
Evaluted expression "-71" -> -71
Evaluted expression "-128" -> -128
Evaluted expression "rQkYZMn - -301" -> -3
Evaluted expression "d39YMJ != 268 && d39YMJ != 97 && d39YMJ - 72" -> 250
Evaluted expression "-189" -> -189
Evaluted expression "96" -> 96
Evaluted expression "72" -> 72
Evaluted expression "d39YMJ != 301 && d39YMJ != 156 && d39YMJ - 338" -> -16
Evaluted expression "-209" -> -209
Evaluted expression "32" -> 32
Evaluted expression "d39YMJ - 271" -> 51
Evaluted expression "-129" -> -129
Evaluted expression "mqFC1h.psUqyio.W8j7WPj + 248" -> 22
Reached flow: -233
Evaluted expression "rQkYZMn + d39YMJ !== -233" -> false
CFF Loop condition met (false) at sum -233. Exiting flow
Successfully deobfuscated, writing result to output/deobfuscated.js
```

</details>

Open `output/deobfuscated.js`, and you will have the deobfuscated code.

## Limitation

1. This script doesn't handle variables correctly. We will fix this later, but for now, you must handle this manually
2. This script doesn't handle: "CFF in CFF", we will fix this later
