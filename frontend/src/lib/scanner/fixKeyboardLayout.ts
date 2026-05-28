/**
 * USB-сканеры эмулируют клавиатуру: символы приходят в раскладке Windows.
 * При активной русской (ЙЦУКЕН) латинские коды превращаются в кириллицу/другие знаки.
 * Восстанавливаем строку так, как если бы ввод шёл в US QWERTY.
 */
const RU_LAYOUT_CHARS =
  'ёйцукенгшщзхъфывапролджэячсмитьбю.ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,';
const EN_LAYOUT_CHARS =
  '`qwertyuiop[]asdfghjkl;\'zxcvbnm,./~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?';

const RU_SHIFT_SYMBOL_TO_EN: Readonly<Record<string, string>> = {
  '"': '@',
  '№': '#',
  ';': '$',
  ':': '^',
  '?': '&',
};

export function fixScannerKeyboardLayout(input: string): string {
  if (!input) return input;

  let changed = false;
  const chars = [...input];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const ruIndex = RU_LAYOUT_CHARS.indexOf(ch);
    if (ruIndex >= 0) {
      chars[i] = EN_LAYOUT_CHARS[ruIndex] ?? ch;
      changed = true;
      continue;
    }
    const mapped = RU_SHIFT_SYMBOL_TO_EN[ch];
    if (mapped !== undefined) {
      chars[i] = mapped;
      changed = true;
    }
  }

  return changed ? chars.join('') : input;
}
