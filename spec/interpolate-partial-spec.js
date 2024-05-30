describe('interpolation: partial patterns', () => {
  describe('in default context', () => {
    it('should coerce non-string values', () => {
      expect('9').toMatch(Regex.make`${Regex.partial(9)}`);
    });

    it('should be quantified as an atomic unit', () => {
      expect('_abc_abc').toMatch(Regex.make`^${Regex.partial`.abc`}+$`);
    });

    it('should sandbox top-level alternation', () => {
      expect('abd').toMatch(Regex.make`^a${Regex.partial`b|c`}d$`);
    });

    it('should not allow unescaped ) that is not part of a self-contained group', () => {
      expect(() => Regex.make`(${Regex.partial`)`}`).toThrow();
    });

    it('should not let preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `\${'w'}` since the raw \ escapes the $
      expect(() => Regex.make({raw: ['\\', '']}, Regex.partial`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => Regex.make`\x${Regex.partial`00`}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(Regex.make`\0${Regex.partial`0`}`);
      expect('\u{0}0').toMatch(Regex.make`${Regex.partial`\0`}0`);
    });
  });

  describe('in character class context', () => {
    const doublePunctuatorChars = [
      '&',
      '!',
      '#',
      '$',
      '%',
      '*',
      '+',
      ',',
      '.',
      ':',
      ';',
      '<',
      '=',
      '>',
      '?',
      '@',
      '^',
      '`',
      '~',
    ];

    it('should coerce non-string values', () => {
      expect('5').toMatch(Regex.make`[1-${Regex.partial(9)}]`);
    });

    it('should allow at range boundary for lone double-punctuator character', () => {
      doublePunctuatorChars.forEach(char => {
        expect(char).toMatch(Regex.make`[\0-${Regex.partial(char)}]`);
        expect(char).toMatch(Regex.make`[${Regex.partial(char)}-\u{10FFFF}]`);
      });
    });

    it('should allow at range boundary for unescaped strings that do not contain union', () => {
      const values = [
        // pattern, string
        ['a', 'a'],
        ['\\b', '\b'],
        ['\\t', '\t'],
        ['\\0', '\0'],
        ['\\cA', '\x01'],
        ['\\x01', '\x01'],
        ['\\u0001', '\u0001'],
        ['\\u{10000}', '\u{10000}'],
        ['\\u{00000000001}', '\u{00000000001}'],
        ['\\{', '{'],
        ['^', '^'],
        ['\\^', '^'],
        ['\\-', '-'],
        ['\\]', ']'],
        ['\\\\', '\\'],
      ];
      values.forEach(v => {
        expect(v[1]).toMatch(Regex.make`[\0-${Regex.partial(v[0])}]`);
        expect(v[1]).toMatch(Regex.make`[${Regex.partial(v[0])}-\u{10FFFF}]`);
      });
    });

    it('should throw at range boundary for unescaped strings that contain union', () => {
      const values = [
        'ab',
        '\\t\\t',
        '~~',
        '[a]',
        '[ab]',
        '\\q{a}',
        '\\q{a|bc}',
        '\\p{RGI_Emoji}',
      ];
      values.forEach(v => {
        expect(() => Regex.make`[\0-${Regex.partial(v)}]`).toThrow();
        expect(() => Regex.make`[${Regex.partial(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should throw at range boundary for unescaped strings that are invalid in range', () => {
      const values = [
        '\\p{L}',
        '\\d',
        '}',
      ];
      values.forEach(v => {
        expect(() => Regex.make`[\0-${Regex.partial(v)}]`).toThrow();
        expect(() => Regex.make`[${Regex.partial(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should not let leading ^ change the character class type', () => {
      expect('^').toMatch(Regex.make`[${Regex.partial`^`}a]`);
      expect('b').not.toMatch(Regex.make`[${Regex.partial`^`}a]`);
      expect('_').toMatch(Regex.make`[${Regex.partial`^`}-a]`);
      expect(() => Regex.make`[${Regex.partial`^^`}]`).toThrow();
    });

    it('should not let unescaped ] that is not part of a self-contained nested class end a class', () => {
      expect(() => Regex.make`[${Regex.partial`]`}`).toThrow();
      expect(() => Regex.make`[a${Regex.partial`]`}b]`).toThrow();
      expect(']').toMatch(Regex.make`[${Regex.partial(String.raw`\]`)}]`);
      expect(() => Regex.make`[a${Regex.partial(String.raw`\\]`)}b]`).toThrow();
      expect(']').toMatch(Regex.make`[${Regex.partial(String.raw`\\\]`)}]`);
    });

    it('should not let trailing unescaped \\ change the character after the interpolation', () => {
      expect(() => Regex.make`[${Regex.partial('\\')}w]`).toThrow();
      expect('\\').toMatch(Regex.make`[${Regex.partial('\\\\')}w]`);
      expect(() => Regex.make`[${Regex.partial('\\\\\\')}w]`).toThrow();
    });

    it('should not let preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `[\${'w'}]` since the raw \ escapes the $
      expect(() => Regex.make({raw: ['[\\', ']']}, Regex.partial`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => Regex.make`[\x${Regex.partial`00`}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(Regex.make`[\0${Regex.partial`0`}]{2}`);
      expect('\u{0}0').toMatch(Regex.make`[${Regex.partial`\0`}0]{2}`);
    });

    it('should throw with unescaped double punctuators', () => {
      const values = doublePunctuatorChars.map(v => v.repeat(2));
      values.push('_^^');
      values.forEach(v => {
        expect(() => Regex.make`[${Regex.partial(v)}]`).toThrow();
      });
    });

    it('should not throw if a lone double-punctuator character is bordered by itself', () => {
      expect('&').toMatch(Regex.make`[&${Regex.partial`&`}&]`);
      expect('!').toMatch(Regex.make`[!${Regex.partial`!`}!]`);
      expect('#').toMatch(Regex.make`[#${Regex.partial`#`}#]`);
      expect('$').toMatch(Regex.make`[$${Regex.partial`$`}$]`);
      expect('%').toMatch(Regex.make`[%${Regex.partial`%`}%]`);
      expect('*').toMatch(Regex.make`[*${Regex.partial`*`}*]`);
      expect('+').toMatch(Regex.make`[+${Regex.partial`+`}+]`);
      expect(',').toMatch(Regex.make`[,${Regex.partial`,`},]`);
      expect('.').toMatch(Regex.make`[.${Regex.partial`.`}.]`);
      expect(':').toMatch(Regex.make`[:${Regex.partial`:`}:]`);
      expect(';').toMatch(Regex.make`[;${Regex.partial`;`};]`);
      expect('<').toMatch(Regex.make`[<${Regex.partial`<`}<]`);
      expect('=').toMatch(Regex.make`[=${Regex.partial`=`}=]`);
      expect('>').toMatch(Regex.make`[>${Regex.partial`>`}>]`);
      expect('?').toMatch(Regex.make`[?${Regex.partial`?`}?]`);
      expect('@').toMatch(Regex.make`[@${Regex.partial`@`}@]`);
      expect('^').not.toMatch(Regex.make`[^${Regex.partial`^`}^]`);
      expect('^').toMatch(Regex.make`[_^${Regex.partial`^`}^]`);
      expect('`').toMatch(Regex.make`[\`${Regex.partial`\``}\`]`);
      expect('~').toMatch(Regex.make`[~${Regex.partial`~`}~]`);
    });

    it('should not throw if a lone double-punctuator character in an implicit union is bordered by itself', () => {
      expect('&').toMatch(Regex.make`[${Regex.partial`a&`}&]`);
      expect('!').toMatch(Regex.make`[${Regex.partial`a!`}!]`);
      expect('#').toMatch(Regex.make`[${Regex.partial`a#`}#]`);
      expect('$').toMatch(Regex.make`[${Regex.partial`a$`}$]`);
      expect('%').toMatch(Regex.make`[${Regex.partial`a%`}%]`);
      expect('*').toMatch(Regex.make`[${Regex.partial`a*`}*]`);
      expect('+').toMatch(Regex.make`[${Regex.partial`a+`}+]`);
      expect(',').toMatch(Regex.make`[${Regex.partial`a,`},]`);
      expect('.').toMatch(Regex.make`[${Regex.partial`a.`}.]`);
      expect(':').toMatch(Regex.make`[${Regex.partial`a:`}:]`);
      expect(';').toMatch(Regex.make`[${Regex.partial`a;`};]`);
      expect('<').toMatch(Regex.make`[${Regex.partial`a<`}<]`);
      expect('=').toMatch(Regex.make`[${Regex.partial`a=`}=]`);
      expect('>').toMatch(Regex.make`[${Regex.partial`a>`}>]`);
      expect('?').toMatch(Regex.make`[${Regex.partial`a?`}?]`);
      expect('@').toMatch(Regex.make`[${Regex.partial`a@`}@]`);
      expect('^').toMatch(Regex.make`[${Regex.partial`a^`}^]`);
      expect('`').toMatch(Regex.make`[${Regex.partial`a\``}\`]`);
      expect('~').toMatch(Regex.make`[${Regex.partial`a~`}~]`);
    });
  });
});