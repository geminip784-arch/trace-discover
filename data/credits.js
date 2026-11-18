// data/credits.js — what the app uses that others made, and the credit each
// asks for (Slice 5M part 3). The children page's credits screen
// (src/setup.js) shows these; README.md and assets/twemoji/CREDITS.md say the same.

export const TWEMOJI_CREDIT = 'Emoji pictures from Twemoji, © 2014–2021 Twitter, Inc. and other contributors, '
  + '© 2022–present Jason Sofonia & Justine De Caires. Licensed under CC BY 4.0 '
  + '(https://creativecommons.org/licenses/by/4.0/). Copied from @discordapp/twemoji 17.0.3. '
  + 'Changes: placed on our picture frames, with a ground shadow and a gentle animation; '
  + 'the Shadow game shows them as grey silhouettes.';

export const CREDITS = [
  { name: 'Twemoji', text: TWEMOJI_CREDIT },
  { name: '$P Point-Cloud Recognizer', text: 'The copy-it round recognizes a whole letter with the $P Point-Cloud Recognizer by Radu-Daniel Vatavu, Lisa Anthony and Jacob O. Wobbrock (ICMI 2012), used under its New BSD License.' },
  { name: 'Fredoka', text: 'The letters and numbers are drawn in the Fredoka font, under the SIL Open Font License 1.1 (assets/fonts/OFL.txt).' },
];
