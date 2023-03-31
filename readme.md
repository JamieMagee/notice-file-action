# Notice File Action

![Stability: Experimental](https://img.shields.io/badge/stability-experimental-orange.svg?style=for-the-badge)
[![License](https://img.shields.io/github/license/JamieMagee/notice-action?style=for-the-badge)](https://github.com/JamieMagee/notice-action/blob/main/LICENSE)

Automatically generate a `NOTICE` file for your repository using [GitHub's dependency graph][1] and [ClearlyDefined][2].

## Why use this action?

TL;DR It's an easy way to comply with license terms.

Most open source software licenses require the license to be included in any derivative works.
For example, [the MIT license][3]:

> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

Or the [Apache License 2.0][4]:

> You must give any other recipients of the Work or Derivative Works a copy of this License

`NOTICE` files are an industry-standard way of providing the licenses downstream, and complying with the license terms.
But creating `NOTICE` files can be difficult.
This action automates the whole process for you.

## Examples

### Basic

```yml
name: Generate NOTICE file
uses: JamieMagee/notice-action@main
```

### Advanced

```yml
name: Generate NOTICE file
uses: JamieMagee/notice-action@main
with:
  format: html
```

## Inputs

### `format`

The output format to use.
Can be:
- `html`
- `json`
- `markdown`
- `text`

## License

All packages in this repository are licensed under [the MIT license][5].

[1]: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph
[2]: https://clearlydefined.io/
[3]: https://choosealicense.com/licenses/mit/
[4]: https://choosealicense.com/licenses/apache-2.0/
[5]: https://github.com/JamieMagee/notice-action/blob/main/license